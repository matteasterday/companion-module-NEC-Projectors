import type ModuleInstance from './main.js'
import * as cmd from './nec/commands.js'
import {
	ASPECT_CHOICES,
	AUDIO_SOURCES,
	CUSTOM,
	ECO_CHOICES,
	INPUT_CHOICES,
	INPUT_CODES,
	LENS_DRIVE,
	LENS_MEM_OPS,
	LENS_PROFILES,
	LENS_TARGETS,
	PICTURE_ITEMS,
	REMOTE_KEYS,
} from './nec/constants.js'

type OnOffToggle = 'on' | 'off' | 'toggle'

export type ActionsSchema = {
	power: { options: { mode: OnOffToggle } }
	input_select: { options: { input: string; custom: string } }
	picture_mute: { options: { mode: OnOffToggle } }
	sound_mute: { options: { mode: OnOffToggle } }
	onscreen_mute: { options: { mode: OnOffToggle } }
	freeze: { options: { mode: OnOffToggle } }
	shutter: { options: { mode: 'open' | 'close' | 'toggle' } }
	picture_adjust: { options: { item: number; adjustType: 'relative' | 'absolute'; value: number } }
	volume_adjust: { options: { adjustType: 'relative' | 'absolute'; value: number } }
	aspect: { options: { aspect: number | string; custom: string } }
	eco_mode: { options: { eco: number | string; custom: string } }
	remote_key: { options: { key: number } }
	lens_control: { options: { target: number; drive: number } }
	lens_control2: { options: { target: number; adjustType: 'relative' | 'absolute'; value: number } }
	lens_memory: { options: { op: number } }
	ref_lens_memory: { options: { op: number } }
	lens_profile: { options: { profile: number } }
	audio_select: { options: { input: string; inputCustom: string; source: number | string; sourceCustom: string } }
	edge_blending: { options: { mode: 'on' | 'off' } }
	pip_pbp: { options: { target: number; value: number } }
	lan_name: { options: { name: string } }
	send_raw: { options: { hex: string } }
}

const ON_OFF_TOGGLE = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
	{ id: 'toggle', label: 'Toggle' },
]

const ADJUST_TYPE = [
	{ id: 'relative', label: 'Adjust by (+ / −)' },
	{ id: 'absolute', label: 'Set to (exact value)' },
]

/** Parse a hex string like "1A", "0x1a" or "26" into a byte. */
function parseHexByte(s: string): number {
	const v = parseInt(String(s).trim().replace(/^0x/i, ''), 16)
	return Number.isNaN(v) ? 0 : v & 0xff
}

/** Resolve a dropdown value that may be the CUSTOM sentinel into a numeric code. */
function resolveCode(value: number | string, custom: string): number {
	return typeof value === 'number' ? value : parseHexByte(custom)
}

function resolveOnOff(mode: OnOffToggle, current: boolean): boolean {
	return mode === 'toggle' ? !current : mode === 'on'
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		power: {
			name: 'Power On / Off',
			options: [{ type: 'dropdown', id: 'mode', label: 'Action', default: 'on', choices: ON_OFF_TOGGLE }],
			callback: async (e) => {
				const on = resolveOnOff(e.options.mode, self.state.powered)
				self.applyOptimistic({ powered: on })
				await self.sendCommand(on ? cmd.powerOn() : cmd.powerOff(), `Power ${on ? 'On' : 'Off'}`)
			},
		},
		input_select: {
			name: 'Select Input',
			options: [
				{
					type: 'dropdown',
					id: 'input',
					label: 'Input',
					default: 'hdmi1',
					choices: INPUT_CHOICES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'custom',
					label: 'Custom input code (hex, e.g. 1A)',
					default: '',
					isVisibleExpression: `$(options:input) == '${CUSTOM}'`,
				},
			],
			callback: async (e) => {
				if (e.options.input === CUSTOM) {
					await self.selectInput(CUSTOM, [parseHexByte(e.options.custom)])
				} else {
					await self.selectInput(e.options.input, INPUT_CODES[e.options.input] ?? [])
				}
			},
		},
		picture_mute: {
			name: 'Mute Picture (blank the image)',
			options: [{ type: 'dropdown', id: 'mode', label: 'Action', default: 'toggle', choices: ON_OFF_TOGGLE }],
			callback: async (e) => {
				const on = resolveOnOff(e.options.mode, self.state.pictureMute)
				self.applyOptimistic({ pictureMute: on })
				await self.sendCommand(cmd.pictureMute(on), `Picture mute ${on ? 'On' : 'Off'}`)
			},
		},
		sound_mute: {
			name: 'Mute Sound',
			options: [{ type: 'dropdown', id: 'mode', label: 'Action', default: 'toggle', choices: ON_OFF_TOGGLE }],
			callback: async (e) => {
				const on = resolveOnOff(e.options.mode, self.state.soundMute)
				self.applyOptimistic({ soundMute: on })
				await self.sendCommand(cmd.soundMute(on), `Sound mute ${on ? 'On' : 'Off'}`)
			},
		},
		onscreen_mute: {
			name: 'Hide On-Screen Menu / Display',
			options: [{ type: 'dropdown', id: 'mode', label: 'Action', default: 'toggle', choices: ON_OFF_TOGGLE }],
			callback: async (e) => {
				const on = resolveOnOff(e.options.mode, self.state.onscreenMute)
				self.applyOptimistic({ onscreenMute: on })
				await self.sendCommand(cmd.onscreenMute(on), `On-screen mute ${on ? 'On' : 'Off'}`)
			},
		},
		freeze: {
			name: 'Freeze Image',
			options: [{ type: 'dropdown', id: 'mode', label: 'Action', default: 'toggle', choices: ON_OFF_TOGGLE }],
			callback: async (e) => {
				const on = resolveOnOff(e.options.mode, self.state.freeze)
				self.applyOptimistic({ freeze: on })
				await self.sendCommand(cmd.freeze(on), `Freeze ${on ? 'On' : 'Off'}`)
			},
		},
		shutter: {
			name: 'Shutter (blank the screen)',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Action',
					default: 'toggle',
					choices: [
						{ id: 'close', label: 'Close (screen blank)' },
						{ id: 'open', label: 'Open (show image)' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (e) => {
				const close = e.options.mode === 'toggle' ? !self.state.shutter : e.options.mode === 'close'
				self.applyOptimistic({ shutter: close })
				await self.sendCommand(cmd.shutter(close), `Shutter ${close ? 'Close' : 'Open'}`)
			},
		},
		picture_adjust: {
			name: 'Adjust Picture (brightness, contrast…)',
			options: [
				{ type: 'dropdown', id: 'item', label: 'Setting', default: 0x00, choices: PICTURE_ITEMS },
				{ type: 'dropdown', id: 'adjustType', label: 'How', default: 'relative', choices: ADJUST_TYPE },
				{ type: 'number', id: 'value', label: 'Amount', default: 1, min: -32768, max: 32767 },
			],
			callback: async (e) => {
				await self.sendCommand(
					cmd.pictureAdjust(e.options.item, e.options.value, e.options.adjustType === 'relative'),
					'Picture adjust',
				)
			},
		},
		volume_adjust: {
			name: 'Adjust Volume',
			options: [
				{ type: 'dropdown', id: 'adjustType', label: 'How', default: 'relative', choices: ADJUST_TYPE },
				{ type: 'number', id: 'value', label: 'Amount', default: 1, min: -32768, max: 32767 },
			],
			callback: async (e) => {
				await self.sendCommand(cmd.volumeAdjust(e.options.value, e.options.adjustType === 'relative'), 'Volume adjust')
			},
		},
		aspect: {
			name: 'Set Aspect Ratio',
			options: [
				{
					type: 'dropdown',
					id: 'aspect',
					label: 'Aspect ratio',
					default: 0x00,
					choices: ASPECT_CHOICES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'custom',
					label: 'Custom aspect code (hex)',
					default: '',
					isVisibleExpression: `$(options:aspect) == '${CUSTOM}'`,
				},
			],
			callback: async (e) => {
				await self.sendCommand(cmd.aspectAdjust(resolveCode(e.options.aspect, e.options.custom)), 'Aspect')
			},
		},
		eco_mode: {
			name: 'Set Eco / Lamp Mode',
			options: [
				{
					type: 'dropdown',
					id: 'eco',
					label: 'Mode',
					default: 0x00,
					choices: ECO_CHOICES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'custom',
					label: 'Custom eco code (hex)',
					default: '',
					isVisibleExpression: `$(options:eco) == '${CUSTOM}'`,
				},
			],
			callback: async (e) => {
				await self.sendCommand(cmd.ecoModeSet(resolveCode(e.options.eco, e.options.custom)), 'Eco mode')
			},
		},
		remote_key: {
			name: 'Press a Remote Button',
			options: [{ type: 'dropdown', id: 'key', label: 'Button', default: 0x06, choices: REMOTE_KEYS }],
			callback: async (e) => {
				await self.sendCommand(cmd.remoteKey(e.options.key), 'Remote key')
			},
		},
		lens_control: {
			name: 'Lens — Zoom / Focus / Shift',
			options: [
				{ type: 'dropdown', id: 'target', label: 'Lens part', default: 0x00, choices: LENS_TARGETS },
				{ type: 'dropdown', id: 'drive', label: 'Move', default: 0x7f, choices: LENS_DRIVE },
			],
			callback: async (e) => {
				await self.sendCommand(cmd.lensControl(e.options.target, e.options.drive), 'Lens control')
			},
		},
		lens_control2: {
			name: 'Lens — Move to Position',
			options: [
				{
					type: 'dropdown',
					id: 'target',
					label: 'Lens part',
					default: 0x00,
					choices: [...LENS_TARGETS, { id: 0xff, label: 'Stop' }],
				},
				{ type: 'dropdown', id: 'adjustType', label: 'How', default: 'relative', choices: ADJUST_TYPE },
				{ type: 'number', id: 'value', label: 'Value', default: 0, min: -32768, max: 32767 },
			],
			callback: async (e) => {
				await self.sendCommand(
					cmd.lensControl2(e.options.target, e.options.value, e.options.adjustType === 'relative'),
					'Lens move',
				)
			},
		},
		lens_memory: {
			name: 'Lens Memory — Recall / Save / Reset',
			options: [{ type: 'dropdown', id: 'op', label: 'Action', default: 0x00, choices: LENS_MEM_OPS }],
			callback: async (e) => {
				await self.sendCommand(cmd.lensMemory(e.options.op), 'Lens memory')
			},
		},
		ref_lens_memory: {
			name: 'Reference Lens Memory — Recall / Save / Reset',
			options: [{ type: 'dropdown', id: 'op', label: 'Action', default: 0x00, choices: LENS_MEM_OPS }],
			callback: async (e) => {
				await self.sendCommand(cmd.refLensMemory(e.options.op), 'Reference lens memory')
			},
		},
		lens_profile: {
			name: 'Lens — Select Profile',
			options: [{ type: 'dropdown', id: 'profile', label: 'Profile', default: 0x00, choices: LENS_PROFILES }],
			callback: async (e) => {
				await self.sendCommand(cmd.lensProfileSet(e.options.profile), 'Lens profile')
			},
		},
		audio_select: {
			name: 'Select Audio Source',
			options: [
				{
					type: 'dropdown',
					id: 'input',
					label: 'For input',
					default: 'hdmi1',
					choices: INPUT_CHOICES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'inputCustom',
					label: 'Custom input code (hex)',
					default: '',
					isVisibleExpression: `$(options:input) == '${CUSTOM}'`,
				},
				{
					type: 'dropdown',
					id: 'source',
					label: 'Audio source',
					default: 0x00,
					choices: AUDIO_SOURCES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'sourceCustom',
					label: 'Custom audio source (hex)',
					default: '',
					isVisibleExpression: `$(options:source) == '${CUSTOM}'`,
				},
			],
			callback: async (e) => {
				const terminal =
					e.options.input === CUSTOM ? parseHexByte(e.options.inputCustom) : (INPUT_CODES[e.options.input]?.[0] ?? 0)
				await self.sendCommand(
					cmd.audioSelectSet(terminal, resolveCode(e.options.source, e.options.sourceCustom)),
					'Audio select',
				)
			},
		},
		edge_blending: {
			name: 'Edge Blending On / Off',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (e) => {
				await self.sendCommand(cmd.edgeBlendingSet(e.options.mode === 'on'), 'Edge blending')
			},
		},
		pip_pbp: {
			name: 'Picture-in-Picture / Side-by-Side',
			options: [
				{
					type: 'dropdown',
					id: 'target',
					label: 'Set',
					default: 0x00,
					choices: [
						{ id: 0x00, label: 'Mode (PIP vs side-by-side)' },
						{ id: 0x01, label: 'Position' },
						{ id: 0x02, label: 'Sub input 1' },
						{ id: 0x09, label: 'Sub input 2' },
						{ id: 0x0a, label: 'Sub input 3' },
					],
				},
				{ type: 'number', id: 'value', label: 'Value', default: 0, min: 0, max: 255 },
			],
			callback: async (e) => {
				await self.sendCommand(cmd.pipPbpSet(e.options.target, e.options.value), 'PIP/PBP')
			},
		},
		lan_name: {
			name: 'Set Projector Name',
			options: [{ type: 'textinput', id: 'name', label: 'Name (max 16 characters)', default: '' }],
			callback: async (e) => {
				await self.sendCommand(cmd.lanProjectorNameSet(e.options.name), 'Set projector name')
			},
		},
		send_raw: {
			name: 'Advanced — Send Raw Command',
			options: [
				{
					type: 'textinput',
					id: 'hex',
					label: 'Command bytes in hex (no length/checksum), e.g. "02 03 00 00 02 01 1A"',
					default: '',
				},
			],
			callback: async (e) => {
				const bytes = String(e.options.hex)
					.trim()
					.split(/[\s,]+/)
					.filter((s) => s.length > 0)
					.map(parseHexByte)
				if (bytes.length > 0) await self.sendCommand(bytes, 'Raw command')
			},
		},
	})
}
