/**
 * NEC projector parameter tables and dropdown choices.
 *
 * Friendly, plain-language labels are used everywhere the user sees them; the raw hex
 * codes (which differ between projector families) are kept out of the UI. Inputs are
 * chosen by a "logical" name (e.g. HDMI 1) and the module resolves the correct hex code
 * for the connected projector at run time, falling back to alternates the projector
 * accepts. A "Custom (advanced)" option is always available for anything unusual.
 *
 * Sourced from the NEC Projector Control Command Reference Manual + Appendixes and
 * verified against a live NP-PA550W.
 */

export interface Choice {
	id: number | string
	label: string
}

/** Sentinel id for the "Custom (advanced)" choice, backed by a hex text field. */
export const CUSTOM = 'custom'

// --------------------------------------------------------------------------- inputs

/** A logical input the user can pick, with the candidate hex codes used across models. */
export interface LogicalInput {
	/** Stable id used as the dropdown value. */
	id: string
	/** Friendly label shown to the user. */
	label: string
	/** Name this input decodes to from the projector (for feedback matching). */
	name: string
	/** Candidate terminal codes, most common first. The module tries them in order. */
	codes: number[]
}

export const INPUT_LOGICAL: LogicalInput[] = [
	{ id: 'computer1', label: 'Computer 1 (VGA)', name: 'VGA Comp 1', codes: [0x01] },
	{ id: 'computer2', label: 'Computer 2 (VGA)', name: 'VGA Comp 2', codes: [0x02] },
	{ id: 'computer3', label: 'Computer 3 (VGA)', name: 'VGA Comp 3', codes: [0x03] },
	{ id: 'video', label: 'Video', name: 'Video', codes: [0x06] },
	{ id: 'svideo', label: 'S-Video', name: 'S-Video', codes: [0x0b] },
	{ id: 'component', label: 'Component', name: 'Component', codes: [0x10] },
	{ id: 'hdmi1', label: 'HDMI 1', name: 'HDMI', codes: [0x1a, 0xa1] },
	{ id: 'hdmi2', label: 'HDMI 2', name: 'HDMI', codes: [0xa2] },
	{ id: 'displayport', label: 'DisplayPort', name: 'DisplayPort', codes: [0x1b, 0xa6, 0xa7] },
	{ id: 'viewer', label: 'Viewer / USB', name: 'Viewer', codes: [0x1f] },
	{ id: 'network', label: 'Network (LAN)', name: 'Network', codes: [0x20] },
	{ id: 'hdbaset', label: 'HDBaseT', name: 'HDBaseT', codes: [0xbf] },
	{ id: 'sdi1', label: 'SDI 1', name: 'SDI', codes: [0xc4] },
	{ id: 'sdi2', label: 'SDI 2', name: 'SDI', codes: [0xc5] },
	{ id: 'sdi3', label: 'SDI 3', name: 'SDI', codes: [0xc6] },
	{ id: 'sdi4', label: 'SDI 4', name: 'SDI', codes: [0xc7] },
]

/** Input dropdown choices for actions (logical ids + Custom). */
export const INPUT_CHOICES: Choice[] = [
	...INPUT_LOGICAL.map((i): Choice => ({ id: i.id, label: i.label })),
	{ id: CUSTOM, label: 'Custom — enter a code (advanced)' },
]

/** Map of logical input id -> candidate terminal codes. */
export const INPUT_CODES: Record<string, number[]> = Object.fromEntries(INPUT_LOGICAL.map((i) => [i.id, i.codes]))

/** Input names for feedbacks, matched against the decoded active input. */
export const INPUT_NAME_CHOICES: Choice[] = [
	{ id: 'VGA Comp 1', label: 'Computer 1 (VGA)' },
	{ id: 'VGA Comp 2', label: 'Computer 2 (VGA)' },
	{ id: 'VGA Comp 3', label: 'Computer 3 (VGA)' },
	{ id: 'Video', label: 'Video' },
	{ id: 'S-Video', label: 'S-Video' },
	{ id: 'Component', label: 'Component' },
	{ id: 'HDMI', label: 'HDMI' },
	{ id: 'DisplayPort', label: 'DisplayPort' },
	{ id: 'DVI-D', label: 'DVI-D' },
	{ id: 'Viewer', label: 'Viewer' },
	{ id: 'Network', label: 'Network (LAN)' },
	{ id: 'HDBaseT', label: 'HDBaseT' },
	{ id: 'SDI', label: 'SDI' },
]

/**
 * Decode the (signal type 1, signal type 2) pair from a status reply into an input name.
 * type2 is the primary terminal discriminator; type1 distinguishes Computer 1/2/3.
 */
export function decodeInputName(type1: number, type2: number): string {
	switch (type2) {
		case 0x01:
			return type1 >= 2 ? `VGA Comp ${type1}` : 'VGA Comp 1'
		case 0x02:
			return 'Video'
		case 0x03:
			return 'S-Video'
		case 0x04:
			return 'Component'
		case 0x06:
			return 'HDMI'
		case 0x07:
			return 'Viewer'
		case 0x20:
			return 'DVI-D'
		case 0x21:
			return 'HDMI'
		case 0x22:
			return 'DisplayPort'
		case 0x23:
			return 'Viewer'
		case 0x27:
			return 'Network'
		case 0x28:
			return 'HDBaseT'
		case 0xff:
			return 'No Input'
		default:
			return 'Input ' + type2
	}
}

// --------------------------------------------------------------------------- aspect

/** Aspect-ratio choices (codes differ by model — Custom covers the rest). */
export const ASPECT_CHOICES: Choice[] = [
	{ id: 0x00, label: 'Auto' },
	{ id: 0x02, label: '16:9' },
	{ id: 0x04, label: '4:3' },
	{ id: 0x06, label: '16:10' },
	{ id: 0x05, label: '15:9' },
	{ id: 0x0b, label: '5:4' },
	{ id: 0x01, label: 'Wide Zoom' },
	{ id: 0x07, label: 'Letterbox / Zoom' },
	{ id: 0x03, label: 'Native' },
	{ id: 0x10, label: 'Normal' },
	{ id: CUSTOM, label: 'Custom — enter a code (advanced)' },
]

// ----------------------------------------------------------------------------- eco

/** Eco / lamp / light mode choices (meaning varies by model). */
export const ECO_CHOICES: Choice[] = [
	{ id: 0x00, label: 'Off / Normal' },
	{ id: 0x01, label: 'Eco (On)' },
	{ id: 0x02, label: 'Eco 1' },
	{ id: 0x03, label: 'Eco 2' },
	{ id: 0x04, label: 'Long Life' },
	{ id: 0x05, label: 'Boost' },
	{ id: CUSTOM, label: 'Custom — enter a code (advanced)' },
]

/** Best-effort label for an eco-mode readback code. */
export function ecoLabel(code: number): string {
	switch (code) {
		case 0x00:
			return 'Off / Normal'
		case 0x01:
			return 'Eco'
		case 0x02:
			return 'Eco 1'
		case 0x03:
			return 'Eco 2'
		case 0x04:
			return 'Long Life'
		case 0x05:
			return 'Boost'
		default:
			return String(code)
	}
}

// ------------------------------------------------------------------- picture adjust

/** Picture items that can be adjusted. */
export const PICTURE_ITEMS: Choice[] = [
	{ id: 0x00, label: 'Brightness' },
	{ id: 0x01, label: 'Contrast' },
	{ id: 0x02, label: 'Color' },
	{ id: 0x03, label: 'Hue / Tint' },
	{ id: 0x04, label: 'Sharpness' },
]

// ------------------------------------------------------------------------ remote keys

/** Remote-control keys that can be emulated. */
export const REMOTE_KEYS: Choice[] = [
	{ id: 0x06, label: 'Menu' },
	{ id: 0x07, label: 'Up' },
	{ id: 0x08, label: 'Down' },
	{ id: 0x09, label: 'Right' },
	{ id: 0x0a, label: 'Left' },
	{ id: 0x0b, label: 'Enter / OK' },
	{ id: 0x0c, label: 'Exit / Back' },
	{ id: 0x05, label: 'Auto Adjust' },
	{ id: 0x0d, label: 'Help' },
	{ id: 0x0f, label: 'Magnify +' },
	{ id: 0x10, label: 'Magnify −' },
	{ id: 0x29, label: 'Picture' },
	{ id: 0xa3, label: 'Aspect' },
	{ id: 0xd7, label: 'Source' },
	{ id: 0x84, label: 'Volume +' },
	{ id: 0x85, label: 'Volume −' },
	{ id: 0x13, label: 'Mute' },
	{ id: 0x8a, label: 'Freeze' },
	{ id: 0xee, label: 'Eco / Lamp Mode' },
]

// ------------------------------------------------------------------------------ lens

/** Lens parts that can be driven. */
export const LENS_TARGETS: Choice[] = [
	{ id: 0x00, label: 'Zoom' },
	{ id: 0x01, label: 'Focus' },
	{ id: 0x02, label: 'Shift (left / right)' },
	{ id: 0x03, label: 'Shift (up / down)' },
	{ id: 0x06, label: 'Periphery Focus' },
]

/** Lens drive direction / duration. */
export const LENS_DRIVE: Choice[] = [
	{ id: 0x00, label: 'Stop' },
	{ id: 0x01, label: 'Forward — 1 second' },
	{ id: 0x02, label: 'Forward — 0.5 second' },
	{ id: 0x03, label: 'Forward — 0.25 second' },
	{ id: 0x7f, label: 'Forward — hold (send Stop to halt)' },
	{ id: 0x81, label: 'Back — hold (send Stop to halt)' },
	{ id: 0xfd, label: 'Back — 0.25 second' },
	{ id: 0xfe, label: 'Back — 0.5 second' },
	{ id: 0xff, label: 'Back — 1 second' },
]

/** Lens memory operations. */
export const LENS_MEM_OPS: Choice[] = [
	{ id: 0x00, label: 'Recall (move)' },
	{ id: 0x01, label: 'Save (store)' },
	{ id: 0x02, label: 'Reset' },
]

/** Reference lens-memory profile. */
export const LENS_PROFILES: Choice[] = [
	{ id: 0x00, label: 'Profile 1' },
	{ id: 0x01, label: 'Profile 2' },
]

// ---------------------------------------------------------------------- audio select

/** Audio source choices for the audio-select action. */
export const AUDIO_SOURCES: Choice[] = [
	{ id: 0x00, label: 'HDMI 1' },
	{ id: 0x01, label: 'HDMI 2' },
	{ id: 0x02, label: 'DisplayPort' },
	{ id: 0x03, label: 'HDBaseT / Network' },
	{ id: 0x04, label: 'USB-A' },
	{ id: 0x05, label: 'USB-B' },
	{ id: 0x09, label: 'HDBaseT' },
	{ id: CUSTOM, label: 'Custom — enter a code (advanced)' },
]

// ------------------------------------------------------------------- status decoding

/** Decode the operation-status byte into a readable label. */
export function decodeOperationStatus(code: number): string {
	switch (code) {
		case 0x00:
			return 'Standby (Sleep)'
		case 0x01:
		case 0x02:
		case 0x03:
			return 'Warming Up'
		case 0x04:
			return 'Power On'
		case 0x05:
			return 'Cooling Down'
		case 0x06:
			return 'Standby (Error)'
		case 0x0f:
			return 'Standby (Power Saving)'
		case 0x10:
			return 'Network Standby'
		default:
			return 'Unknown (' + code + ')'
	}
}

/** True when the projector is on or warming up (01h–03h warming, 04h on). */
export function isPoweredOn(operationStatus: number): boolean {
	return operationStatus >= 0x01 && operationStatus <= 0x04
}

/** True while the lamp is warming up. */
export function isWarming(operationStatus: number): boolean {
	return operationStatus >= 0x01 && operationStatus <= 0x03
}

/** True while the projector is cooling down after power-off. */
export function isCooling(operationStatus: number): boolean {
	return operationStatus === 0x05
}

/** Decode the "content displayed" byte into a readable label. */
export function decodeContent(code: number): string {
	switch (code) {
		case 0x00:
			return 'Video signal'
		case 0x01:
			return 'No signal'
		case 0x02:
			return 'Viewer'
		case 0x03:
			return 'Test pattern'
		case 0x04:
			return 'LAN'
		case 0x05:
			return 'Test pattern (user)'
		case 0x10:
			return 'Switching…'
		case 0xff:
			return 'N/A'
		default:
			return String(code)
	}
}

/** Decode the 12 error-status bytes into a list of active problems (empty = normal). */
export function decodeErrors(data: readonly number[]): string[] {
	const errors: string[] = []
	const bit = (idx: number, b: number) => ((data[idx] ?? 0) & (1 << b)) !== 0
	if (bit(0, 0)) errors.push('Cover error')
	if (bit(0, 1)) errors.push('Temperature error')
	if (bit(0, 3) || bit(0, 4)) errors.push('Fan error')
	if (bit(0, 5)) errors.push('Power error')
	if (bit(0, 6)) errors.push('Lamp off')
	if (bit(0, 7)) errors.push('Lamp at end of life (replace lamp)')
	if (bit(1, 0)) errors.push('Lamp usage time exceeded limit')
	if (bit(1, 1)) errors.push('Formatter error')
	if (bit(1, 2)) errors.push('Lamp 2 off')
	if (bit(2, 1)) errors.push('FPGA error')
	if (bit(2, 2)) errors.push('Temperature sensor error')
	if (bit(2, 3)) errors.push('Lamp not present')
	if (bit(2, 4)) errors.push('Lamp data error')
	if (bit(2, 5)) errors.push('Mirror cover error')
	if (bit(2, 7)) errors.push('Lamp 2 usage time exceeded limit')
	if (bit(3, 0)) errors.push('Lamp 2 not present')
	if (bit(3, 1)) errors.push('Lamp 2 data error')
	if (bit(3, 2)) errors.push('Temperature error (dust)')
	if (bit(3, 3)) errors.push('Foreign matter sensor error')
	if (bit(3, 5)) errors.push('Ballast communication error')
	if (bit(3, 6)) errors.push('Iris calibration error')
	if (bit(3, 7)) errors.push('Lens not installed properly')
	if (bit(8, 1)) errors.push('Interlock switch open')
	if (bit(8, 2)) errors.push('System error (slave CPU)')
	if (bit(8, 3)) errors.push('System error (formatter)')
	return errors
}
