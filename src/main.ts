import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, buildVariableValues, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { NecClient, NecTransportError, type NecClientOptions } from './nec/client.js'
import * as cmd from './nec/commands.js'
import {
	blankState,
	decodeBasicInfo,
	decodeEco,
	decodeErrorStatus,
	decodeFilter,
	decodeInfoString,
	decodeLamp,
	decodeMac,
	decodeModelName,
	decodeSerial,
	type ProjectorState,
} from './nec/decode.js'
import type { NecResponse } from './nec/protocol.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	/** Current decoded projector state — read by actions and feedbacks. */
	state: ProjectorState = blankState()

	private client?: NecClient
	private pollTimer?: ReturnType<typeof setTimeout>
	private refreshTimer?: ReturnType<typeof setTimeout>
	private pollInFlight = false
	private staticFetched = false
	private destroyed = false
	/** Remembers which candidate code worked for each logical input on this projector. */
	private inputWinners = new Map<string, number>()

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.restart()
	}

	async destroy(): Promise<void> {
		this.destroyed = true
		this.stopTimers()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.restart()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}
	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}
	updatePresets(): void {
		UpdatePresets(this)
	}
	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	// --------------------------------------------------------------- lifecycle

	private clientOptions(): NecClientOptions {
		return {
			host: this.config.host,
			port: this.config.port,
			username: this.config.username ?? '',
			password: this.config.password ?? '',
			timeoutMs: 4000,
			log: (level, message) => this.log(level, message),
		}
	}

	/** (Re)create the client and (re)start polling after init / config change. */
	private restart(): void {
		this.stopTimers()
		this.state = blankState()
		this.staticFetched = false
		this.inputWinners.clear()

		if (!this.config.host) {
			this.updateStatus(InstanceStatus.BadConfig, 'Set the projector IP address')
			this.publish()
			return
		}

		this.client = new NecClient(this.clientOptions())
		this.updateStatus(InstanceStatus.Connecting)
		void this.pollLoop()
	}

	private stopTimers(): void {
		if (this.pollTimer) clearTimeout(this.pollTimer)
		if (this.refreshTimer) clearTimeout(this.refreshTimer)
		this.pollTimer = undefined
		this.refreshTimer = undefined
	}

	private async pollLoop(): Promise<void> {
		if (this.destroyed || !this.client) return
		await this.poll()
		if (!this.destroyed && this.config.polling) {
			this.pollTimer = setTimeout(() => void this.pollLoop(), Math.max(1, this.config.pollInterval) * 1000)
		}
	}

	// --------------------------------------------------------------- polling

	private async poll(): Promise<void> {
		if (this.pollInFlight || !this.client) return
		this.pollInFlight = true
		try {
			if (!this.staticFetched) await this.fetchStatic()
			await this.apply(cmd.reqBasicInfo(), decodeBasicInfo)
			await this.apply(cmd.reqLampInfo(0x00, 0x04), decodeLamp)
			await this.apply(cmd.reqLampInfo(0x00, 0x01), decodeLamp)
			await this.apply(cmd.reqFilterInfo(), decodeFilter)
			await this.apply(cmd.reqErrorStatus(), decodeErrorStatus)
			await this.apply(cmd.reqEcoMode(), decodeEco)
			if (this.state.powered) {
				await this.applyInfoString(0x03)
				await this.applyInfoString(0x04)
			}
			this.markReachable()
			this.publish()
		} catch (e) {
			this.handleTransportError(e, 'Polling')
		} finally {
			this.pollInFlight = false
		}
	}

	/** Fetch values that do not change at runtime (model / serial / MAC). */
	private async fetchStatic(): Promise<void> {
		await this.apply(cmd.reqModelName(), decodeModelName)
		await this.apply(cmd.reqSerialNumber(), decodeSerial)
		await this.apply(cmd.reqMac(), decodeMac)
		this.staticFetched = true
	}

	/**
	 * Send a request and merge its decoded result into state. A NACK (command not
	 * supported on this model) is skipped silently; a transport error is rethrown so
	 * the poll cycle aborts and the connection is marked offline.
	 */
	private async apply(bytes: number[], decoder: (res: NecResponse) => Partial<ProjectorState>): Promise<void> {
		const res = await this.client!.send(bytes)
		if (res.ok) Object.assign(this.state, decoder(res))
	}

	private async applyInfoString(type: number): Promise<void> {
		const res = await this.client!.send(cmd.reqInfoString(type))
		if (!res.ok) return
		const { value } = decodeInfoString(res)
		if (type === 0x03) this.state.syncH = value
		else if (type === 0x04) this.state.syncV = value
	}

	// --------------------------------------------------------------- commands

	/** Send a control command; refresh state shortly after. Used by all actions. */
	async sendCommand(bytes: number[], label: string): Promise<void> {
		if (!this.client) return
		try {
			const res = await this.client.send(bytes)
			if (!res.ok) {
				if (res.err1 === 0x02 && res.err2 === 0x0d) {
					this.log('debug', `${label}: ignored — projector power is off`)
				} else {
					this.log('warn', `${label} failed: ${res.errorText ?? 'NACK'}`)
				}
			}
			this.markReachable()
			this.scheduleRefresh()
		} catch (e) {
			this.handleTransportError(e, label)
		}
	}

	/**
	 * Switch input by logical name (e.g. "hdmi1"), trying the candidate hex codes and
	 * remembering which one the projector accepts so later switches go straight to it.
	 * This adapts to per-model code differences (e.g. HDMI 1Ah vs A1h) automatically.
	 */
	async selectInput(logical: string, codes: number[]): Promise<void> {
		if (!this.client || codes.length === 0) return
		const useCache = logical !== 'custom'
		const cached = useCache ? this.inputWinners.get(logical) : undefined
		const order = cached !== undefined ? [cached, ...codes.filter((c) => c !== cached)] : codes
		try {
			for (const code of order) {
				const res = await this.client.send(cmd.inputSwitch(code))
				if (res.ok) {
					if (useCache) this.inputWinners.set(logical, code)
					this.markReachable()
					this.scheduleRefresh()
					return
				}
				// Only try the next candidate if this code was rejected as invalid.
				if (res.err1 !== 0x01) {
					if (res.err1 === 0x02 && res.err2 === 0x0d) this.log('debug', 'Input: projector power is off')
					else this.log('warn', `Input select failed: ${res.errorText ?? 'NACK'}`)
					this.markReachable()
					this.scheduleRefresh()
					return
				}
			}
			this.log('warn', `Input select: projector did not accept any known code for "${logical}"`)
			this.markReachable()
		} catch (e) {
			this.handleTransportError(e, 'Input select')
		}
	}

	/** Optimistically merge a state change so buttons feel responsive before the poll. */
	applyOptimistic(partial: Partial<ProjectorState>): void {
		Object.assign(this.state, partial)
		this.publish()
	}

	/** Schedule a single quick poll after a control command. */
	private scheduleRefresh(): void {
		if (this.refreshTimer) clearTimeout(this.refreshTimer)
		this.refreshTimer = setTimeout(() => void this.poll(), 700)
	}

	// --------------------------------------------------------------- helpers

	private markReachable(): void {
		if (!this.state.reachable) this.state.reachable = true
		this.updateStatus(InstanceStatus.Ok)
	}

	private handleTransportError(e: unknown, label: string): void {
		const msg = e instanceof NecTransportError ? e.message : e instanceof Error ? e.message : String(e)
		this.state.reachable = false
		this.updateStatus(InstanceStatus.ConnectionFailure, msg)
		this.log('debug', `${label}: ${msg}`)
		this.publish()
	}

	/** Push the current state out to variables and feedbacks. */
	private publish(): void {
		this.setVariableValues(buildVariableValues(this.state))
		this.checkFeedbacks(
			'connected',
			'power_on',
			'power_warming',
			'power_cooling',
			'input_active',
			'picture_mute',
			'sound_mute',
			'onscreen_mute',
			'freeze',
			'shutter_closed',
			'has_error',
		)
	}
}
