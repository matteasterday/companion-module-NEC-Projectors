import type ModuleInstance from './main.js'
import { toHex } from './nec/protocol.js'
import type { ProjectorState } from './nec/decode.js'

export type VariablesSchema = {
	connection: string
	model: string
	serial: string
	mac: string
	power: string
	operation_status: string
	content: string
	input: string
	input_code: string
	picture_mute: string
	sound_mute: string
	onscreen_mute: string
	freeze: string
	shutter: string
	lamp_remaining: string
	lamp_hours: string
	filter_hours: string
	eco_mode: string
	error_count: string
	errors: string
	sync_h: string
	sync_v: string
	power_off_locked: string
	power_off_in: string
	last_error: string
	last_error_age: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		connection: { name: 'Connection state (Connected / Disconnected)' },
		model: { name: 'Model name' },
		serial: { name: 'Serial number' },
		mac: { name: 'MAC address' },
		power: { name: 'Power (On / Off)' },
		operation_status: { name: 'Operation status' },
		power_off_locked: { name: 'Power off currently refused because the lamp just came on (true / false)' },
		power_off_in: { name: 'Seconds until power off will be accepted (empty when not locked)' },
		last_error: { name: 'Last command the projector refused, or empty after a success' },
		last_error_age: { name: 'Seconds since the last refusal (empty when none)' },
		content: { name: 'Content displayed' },
		input: { name: 'Active input (name)' },
		input_code: { name: 'Active input (raw terminal code)' },
		picture_mute: { name: 'Picture mute (On / Off)' },
		sound_mute: { name: 'Sound mute (On / Off)' },
		onscreen_mute: { name: 'On-screen mute (On / Off)' },
		freeze: { name: 'Freeze (On / Off)' },
		shutter: { name: 'Shutter / lens mute (Open / Closed)' },
		lamp_remaining: { name: 'Lamp life remaining (%)' },
		lamp_hours: { name: 'Lamp hours used' },
		filter_hours: { name: 'Filter hours used' },
		eco_mode: { name: 'Eco / lamp mode' },
		error_count: { name: 'Active error count' },
		errors: { name: 'Active errors (list)' },
		sync_h: { name: 'Horizontal sync frequency' },
		sync_v: { name: 'Vertical sync frequency' },
	})
}

const onOff = (b: boolean): string => (b ? 'On' : 'Off')

/** Project the current state into the typed variable value map. */
export function buildVariableValues(state: ProjectorState): VariablesSchema {
	return {
		connection: state.reachable ? 'Connected' : 'Disconnected',
		model: state.modelName || '—',
		serial: state.serial || '—',
		mac: state.mac || '—',
		power: state.powered ? 'On' : 'Off',
		operation_status: state.operationStatus,
		power_off_locked: state.powerOffLockedUntil > Date.now() ? 'true' : 'false',
		power_off_in:
			state.powerOffLockedUntil > Date.now() ? String(Math.ceil((state.powerOffLockedUntil - Date.now()) / 1000)) : '',
		last_error: state.lastError,
		last_error_age: state.lastError ? String(Math.round((Date.now() - state.lastErrorAt) / 1000)) : '',
		content: state.content || '—',
		input: state.inputName || '—',
		input_code: state.inputType2 ? toHex(state.inputType2) : '—',
		picture_mute: onOff(state.pictureMute),
		sound_mute: onOff(state.soundMute),
		onscreen_mute: onOff(state.onscreenMute),
		freeze: onOff(state.freeze),
		shutter: state.shutter ? 'Closed' : 'Open',
		lamp_remaining: state.lampRemainingPct == null ? '—' : `${state.lampRemainingPct}%`,
		lamp_hours: state.lampHours == null ? '—' : String(state.lampHours),
		filter_hours: state.filterHours == null ? '—' : String(state.filterHours),
		eco_mode: state.ecoMode || '—',
		error_count: String(state.errors.length),
		errors: state.errors.length ? state.errors.join(', ') : 'None',
		sync_h: state.syncH || '—',
		sync_v: state.syncV || '—',
	}
}
