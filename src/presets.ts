import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetFeedback,
	type CompanionPresetSection,
} from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ModuleSchema } from './main.js'

const white = combineRgb(255, 255, 255)
const black = combineRgb(0, 0, 0)
const dark = combineRgb(0, 0, 0)
const green = combineRgb(0, 153, 0)
const red = combineRgb(204, 0, 0)
const orange = combineRgb(255, 140, 0)
const blue = combineRgb(0, 114, 206)
const grey = combineRgb(40, 40, 40)

export function UpdatePresets(self: ModuleInstance): void {
	const v = (name: string): string => `$(${self.label}:${name})`
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}

	// Feedbacks that colour a button by power state: green=on, orange=warming, blue=cooling.
	const onWarm: CompanionPresetFeedback<ModuleSchema['feedbacks']>[] = [
		{ feedbackId: 'power_on', options: {}, style: { bgcolor: green, color: white } },
		{ feedbackId: 'power_warming', options: {}, style: { bgcolor: orange, color: black } },
	]
	const offCool: CompanionPresetFeedback<ModuleSchema['feedbacks']>[] = [
		{ feedbackId: 'power_on', options: {}, isInverted: true, style: { bgcolor: red, color: white } },
		{ feedbackId: 'power_cooling', options: {}, style: { bgcolor: blue, color: white } },
	]

	// ---- Power ----
	presets['power_on'] = {
		type: 'simple',
		name: 'Power On',
		style: { text: 'POWER\\nON', size: '18', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'power', options: { mode: 'on' } }], up: [] }],
		feedbacks: onWarm,
	}
	presets['power_off'] = {
		type: 'simple',
		name: 'Power Off',
		style: { text: 'POWER\\nOFF', size: '18', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'power', options: { mode: 'off' } }], up: [] }],
		feedbacks: offCool,
	}
	presets['power_toggle'] = {
		type: 'simple',
		name: 'Power (toggle — colour shows state)',
		style: { text: `POWER\\n${v('model')}`, size: '18', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'power', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [...onWarm, ...offCool],
	}

	// ---- Inputs ----
	const inputPreset = (id: string, name: string, logical: string, matchName: string, text: string): void => {
		presets[id] = {
			type: 'simple',
			name: `Input: ${name}`,
			style: { text, size: '18', color: white, bgcolor: dark, show_topbar: false },
			steps: [{ down: [{ actionId: 'input_select', options: { input: logical, custom: '' } }], up: [] }],
			feedbacks: [
				{ feedbackId: 'input_active', options: { input: matchName }, style: { bgcolor: green, color: white } },
			],
		}
	}
	inputPreset('input_vga1', 'Computer 1 (VGA)', 'computer1', 'VGA Comp 1', 'VGA\\nCOMP 1')
	inputPreset('input_vga2', 'Computer 2 (VGA)', 'computer2', 'VGA Comp 2', 'VGA\\nCOMP 2')
	inputPreset('input_video', 'Video', 'video', 'Video', 'VIDEO')
	inputPreset('input_hdmi', 'HDMI', 'hdmi1', 'HDMI', 'HDMI')
	inputPreset('input_displayport', 'DisplayPort', 'displayport', 'DisplayPort', 'Display\\nPort')

	// ---- Mute / Freeze ----
	const togglePreset = (
		id: string,
		label: string,
		actionId: 'picture_mute' | 'sound_mute' | 'onscreen_mute' | 'freeze',
		feedbackId: 'picture_mute' | 'sound_mute' | 'onscreen_mute' | 'freeze',
		color: number,
	): void => {
		presets[id] = {
			type: 'simple',
			name: label,
			style: { text: label.replace(/ /g, '\\n'), size: '18', color: white, bgcolor: dark, show_topbar: false },
			steps: [{ down: [{ actionId, options: { mode: 'toggle' } }], up: [] }],
			feedbacks: [{ feedbackId, options: {}, style: { bgcolor: color, color: white } }],
		}
	}
	togglePreset('picture_mute', 'Picture Mute', 'picture_mute', 'picture_mute', red)
	togglePreset('sound_mute', 'Sound Mute', 'sound_mute', 'sound_mute', red)
	togglePreset('onscreen_mute', 'Hide Menu', 'onscreen_mute', 'onscreen_mute', orange)
	togglePreset('freeze', 'Freeze', 'freeze', 'freeze', orange)

	presets['shutter'] = {
		type: 'simple',
		name: 'Shutter (blank screen)',
		style: { text: 'SHUTTER', size: '18', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'shutter', options: { mode: 'toggle' } }], up: [] }],
		feedbacks: [{ feedbackId: 'shutter_closed', options: {}, style: { bgcolor: red, color: white } }],
	}

	// ---- Volume ----
	presets['volume_up'] = {
		type: 'simple',
		name: 'Volume +',
		style: { text: 'VOL\\n+', size: '24', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'volume_adjust', options: { adjustType: 'relative', value: 1 } }], up: [] }],
		feedbacks: [],
	}
	presets['volume_down'] = {
		type: 'simple',
		name: 'Volume −',
		style: { text: 'VOL\\n−', size: '24', color: white, bgcolor: dark, show_topbar: false },
		steps: [{ down: [{ actionId: 'volume_adjust', options: { adjustType: 'relative', value: -1 } }], up: [] }],
		feedbacks: [],
	}

	// ---- Status displays (one per useful variable) ----
	const statusPreset = (
		id: string,
		name: string,
		text: string,
		feedbacks: CompanionPresetFeedback<ModuleSchema['feedbacks']>[] = [],
	): void => {
		presets[id] = {
			type: 'simple',
			name: `Status: ${name}`,
			style: { text, size: '14', color: white, bgcolor: grey, show_topbar: false },
			steps: [],
			feedbacks,
		}
	}
	statusPreset('status_link', 'Connection', `LINK\\n${v('connection')}`, [
		{ feedbackId: 'connected', options: {}, style: { bgcolor: green, color: white } },
	])
	statusPreset('status_model', 'Model', `MODEL\\n${v('model')}`)
	statusPreset('status_power', 'Power state', `POWER\\n${v('operation_status')}`, [...onWarm, ...offCool])
	statusPreset('status_input', 'Active input', `INPUT\\n${v('input')}`)
	statusPreset('status_signal', 'Signal', `SIGNAL\\n${v('content')}`)
	statusPreset('status_lamp_life', 'Lamp life remaining', `LAMP LIFE\\n${v('lamp_remaining')} left`)
	statusPreset('status_lamp_hours', 'Lamp hours used', `LAMP USED\\n${v('lamp_hours')} hrs`)
	statusPreset('status_filter', 'Filter hours used', `FILTER\\n${v('filter_hours')} hrs`)
	statusPreset('status_eco', 'Eco mode', `ECO MODE\\n${v('eco_mode')}`)
	statusPreset('status_errors', 'Errors', `ERRORS\\n${v('error_count')}`, [
		{ feedbackId: 'has_error', options: {}, style: { bgcolor: red, color: white } },
	])
	statusPreset('status_sync', 'Sync frequency', `SYNC\\nH ${v('sync_h')}\\nV ${v('sync_v')}`)

	const structure: CompanionPresetSection[] = [
		{
			id: 'power',
			name: 'Power',
			definitions: [
				{ id: 'power_grp', name: 'Power', type: 'simple', presets: ['power_on', 'power_off', 'power_toggle'] },
			],
		},
		{
			id: 'inputs',
			name: 'Inputs',
			definitions: [
				{
					id: 'inputs_grp',
					name: 'Inputs',
					type: 'simple',
					presets: ['input_vga1', 'input_vga2', 'input_video', 'input_hdmi', 'input_displayport'],
				},
			],
		},
		{
			id: 'mutes',
			name: 'Mute / Freeze',
			definitions: [
				{
					id: 'mutes_grp',
					name: 'Mute / Freeze',
					type: 'simple',
					presets: ['picture_mute', 'sound_mute', 'onscreen_mute', 'freeze', 'shutter'],
				},
			],
		},
		{
			id: 'volume',
			name: 'Volume',
			definitions: [{ id: 'volume_grp', name: 'Volume', type: 'simple', presets: ['volume_up', 'volume_down'] }],
		},
		{
			id: 'status',
			name: 'Status',
			definitions: [
				{
					id: 'status_grp',
					name: 'Status',
					type: 'simple',
					presets: [
						'status_link',
						'status_model',
						'status_power',
						'status_input',
						'status_signal',
						'status_lamp_life',
						'status_lamp_hours',
						'status_filter',
						'status_eco',
						'status_errors',
						'status_sync',
					],
				},
			],
		},
	]

	self.setPresetDefinitions(structure, presets)
}
