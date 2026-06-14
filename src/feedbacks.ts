import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { INPUT_NAME_CHOICES, isCooling, isWarming } from './nec/constants.js'

export type FeedbacksSchema = {
	connected: { type: 'boolean'; options: Record<string, never> }
	power_on: { type: 'boolean'; options: Record<string, never> }
	power_warming: { type: 'boolean'; options: Record<string, never> }
	power_cooling: { type: 'boolean'; options: Record<string, never> }
	input_active: { type: 'boolean'; options: { input: string } }
	picture_mute: { type: 'boolean'; options: Record<string, never> }
	sound_mute: { type: 'boolean'; options: Record<string, never> }
	onscreen_mute: { type: 'boolean'; options: Record<string, never> }
	freeze: { type: 'boolean'; options: Record<string, never> }
	shutter_closed: { type: 'boolean'; options: Record<string, never> }
	has_error: { type: 'boolean'; options: Record<string, never> }
}

const white = combineRgb(255, 255, 255)
const black = combineRgb(0, 0, 0)
const green = combineRgb(0, 153, 0)
const red = combineRgb(204, 0, 0)
const amber = combineRgb(204, 102, 0)
const orange = combineRgb(255, 140, 0)
const blue = combineRgb(0, 114, 206)

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		power_on: {
			name: 'Power is on',
			type: 'boolean',
			defaultStyle: { bgcolor: green, color: white },
			options: [],
			callback: () => self.state.powered,
		},
		power_warming: {
			name: 'Power is warming up',
			type: 'boolean',
			defaultStyle: { bgcolor: orange, color: black },
			options: [],
			callback: () => isWarming(self.state.operationStatusCode),
		},
		power_cooling: {
			name: 'Power is cooling down',
			type: 'boolean',
			defaultStyle: { bgcolor: blue, color: white },
			options: [],
			callback: () => isCooling(self.state.operationStatusCode),
		},
		connected: {
			name: 'Connected to projector',
			type: 'boolean',
			defaultStyle: { bgcolor: green, color: white },
			options: [],
			callback: () => self.state.reachable,
		},
		input_active: {
			name: 'Active input is…',
			type: 'boolean',
			defaultStyle: { bgcolor: green, color: white },
			options: [
				{
					type: 'dropdown',
					id: 'input',
					label: 'Input',
					default: 'HDMI',
					choices: INPUT_NAME_CHOICES,
				},
			],
			callback: (fb) => self.state.inputName === fb.options.input,
		},
		picture_mute: {
			name: 'Picture is muted',
			type: 'boolean',
			defaultStyle: { bgcolor: red, color: white },
			options: [],
			callback: () => self.state.pictureMute,
		},
		sound_mute: {
			name: 'Sound is muted',
			type: 'boolean',
			defaultStyle: { bgcolor: red, color: white },
			options: [],
			callback: () => self.state.soundMute,
		},
		onscreen_mute: {
			name: 'On-screen menu is hidden',
			type: 'boolean',
			defaultStyle: { bgcolor: amber, color: white },
			options: [],
			callback: () => self.state.onscreenMute,
		},
		freeze: {
			name: 'Image is frozen',
			type: 'boolean',
			defaultStyle: { bgcolor: amber, color: black },
			options: [],
			callback: () => self.state.freeze,
		},
		shutter_closed: {
			name: 'Shutter is closed (screen blank)',
			type: 'boolean',
			defaultStyle: { bgcolor: red, color: white },
			options: [],
			callback: () => self.state.shutter,
		},
		has_error: {
			name: 'Projector has an error / warning',
			type: 'boolean',
			defaultStyle: { bgcolor: red, color: white },
			options: [],
			callback: () => self.state.hasError,
		},
	})
}
