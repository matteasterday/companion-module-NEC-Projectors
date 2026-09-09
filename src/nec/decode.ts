/**
 * High-level decoders that turn a parsed NecResponse into typed state fragments.
 * Each decoder returns a Partial<ProjectorState> so updates merge cleanly.
 *
 * Data-part offsets account for the leading sub-command "echo" byte that some replies
 * include (e.g. 305-3 echoes 02h, 097-8 echoes 07h) before the documented DATA01.
 */

import type { NecResponse } from './protocol.js'
import { asciiz, s32le, u32le, bytesToHex } from './protocol.js'
import {
	decodeContent,
	decodeErrors,
	decodeInputName,
	decodeOperationStatus,
	ecoLabel,
	isPoweredOn,
} from './constants.js'

/** Everything the module tracks and exposes as variables/feedbacks. */
export interface ProjectorState {
	reachable: boolean
	powered: boolean
	operationStatus: string
	operationStatusCode: number
	content: string
	inputName: string
	inputType1: number
	inputType2: number
	pictureMute: boolean
	soundMute: boolean
	onscreenMute: boolean
	freeze: boolean
	/** Optimistically tracked (no reliable readback on most models). */
	shutter: boolean
	lampRemainingPct: number | null
	lampHours: number | null
	filterHours: number | null
	errors: string[]
	hasError: boolean
	ecoMode: string
	ecoModeCode: number | null
	modelName: string
	serial: string
	mac: string
	lampMoving: boolean
	syncH: string
	syncV: string
	/** Until this time (ms) the projector will refuse a power off because it only just reached Power On. 0 when not locked. */
	powerOffLockedUntil: number
}

/** A fresh, "unknown" state. */
export function blankState(): ProjectorState {
	return {
		reachable: false,
		powered: false,
		operationStatus: 'Unknown',
		operationStatusCode: -1,
		powerOffLockedUntil: 0,
		content: '',
		inputName: '',
		inputType1: 0,
		inputType2: 0,
		pictureMute: false,
		soundMute: false,
		onscreenMute: false,
		freeze: false,
		shutter: false,
		lampRemainingPct: null,
		lampHours: null,
		filterHours: null,
		errors: [],
		hasError: false,
		ecoMode: '',
		ecoModeCode: null,
		modelName: '',
		serial: '',
		mac: '',
		lampMoving: false,
		syncH: '',
		syncV: '',
	}
}

/** 305-3 BASIC INFORMATION — data = [02h echo, DATA01..DATA15]. */
export function decodeBasicInfo(res: NecResponse): Partial<ProjectorState> {
	const d = res.data
	const op = d[1] ?? 0
	const type1 = d[3] ?? 0
	const type2 = d[4] ?? 0
	return {
		operationStatusCode: op,
		operationStatus: decodeOperationStatus(op),
		powered: isPoweredOn(op),
		content: decodeContent(d[2] ?? 0),
		inputType1: type1,
		inputType2: type2,
		inputName: decodeInputName(type1, type2),
		pictureMute: (d[6] ?? 0) === 0x01,
		soundMute: (d[7] ?? 0) === 0x01,
		onscreenMute: (d[8] ?? 0) === 0x01,
		freeze: (d[9] ?? 0) === 0x01,
	}
}

/** 078-2 RUNNING STATUS — data = [DATA01..DATA16]; DATA06 (index 5) = operation status. */
export function decodeRunningStatus(res: NecResponse): Partial<ProjectorState> {
	const op = res.data[5] ?? 0
	return {
		operationStatusCode: op,
		operationStatus: decodeOperationStatus(op),
		powered: isPoweredOn(op) || (res.data[2] ?? 0) === 0x01,
	}
}

/** 078-3 INPUT STATUS — data = [DATA01..DATA16]; type1/type2 at index 2/3. */
export function decodeInputStatus(res: NecResponse): Partial<ProjectorState> {
	const type1 = res.data[2] ?? 0
	const type2 = res.data[3] ?? 0
	return { inputType1: type1, inputType2: type2, inputName: decodeInputName(type1, type2) }
}

/** 078-4 MUTE STATUS — data = [pic, snd, onscreen, forced, display, ...]. */
export function decodeMuteStatus(res: NecResponse): Partial<ProjectorState> {
	const d = res.data
	return {
		pictureMute: (d[0] ?? 0) === 0x01,
		soundMute: (d[1] ?? 0) === 0x01,
		onscreenMute: (d[2] ?? 0) === 0x01,
	}
}

/** 037-4 LAMP INFO — data = [target, content, v0..v3]; content 04h = remaining %. */
export function decodeLamp(res: NecResponse): Partial<ProjectorState> {
	const content = res.data[1] ?? 0
	if (content === 0x04) {
		return { lampRemainingPct: s32le(res.data, 2) }
	}
	// usage time in seconds -> hours
	return { lampHours: Math.floor(u32le(res.data, 2) / 3600) }
}

/** 037-3 FILTER USAGE — data = [sec0..sec3, alarm0..alarm3]; seconds -> hours. */
export function decodeFilter(res: NecResponse): Partial<ProjectorState> {
	return { filterHours: Math.floor(u32le(res.data, 0) / 3600) }
}

/** 009 ERROR STATUS — data = [DATA01..DATA12] bitfields. */
export function decodeErrorStatus(res: NecResponse): Partial<ProjectorState> {
	const errors = decodeErrors(res.data)
	return { errors, hasError: errors.length > 0 }
}

/** 097-8 ECO MODE — data = [07h echo, value]. */
export function decodeEco(res: NecResponse): Partial<ProjectorState> {
	const code = res.data[1] ?? 0
	return { ecoModeCode: code, ecoMode: ecoLabel(code) }
}

/** 078-5 MODEL NAME — data = 32-byte NUL-terminated ASCII. */
export function decodeModelName(res: NecResponse): Partial<ProjectorState> {
	return { modelName: asciiz(res.data, 0, 32) }
}

/** 305-2 SERIAL NUMBER — data = [01h, 06h, 16-byte ASCII]. */
export function decodeSerial(res: NecResponse): Partial<ProjectorState> {
	return { serial: asciiz(res.data, 2, 16) }
}

/** 097-155 MAC ADDRESS — data = [9Ah, 00h, 6 MAC bytes] in display order. */
export function decodeMac(res: NecResponse): Partial<ProjectorState> {
	const mac = res.data
		.slice(2, 8)
		.map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
		.join(':')
	return { mac }
}

/** 053-7 LENS INFO — data = [00h, status bitfield]; any set bit = actuator moving. */
export function decodeLensInfo(res: NecResponse): Partial<ProjectorState> {
	const status = res.data[1] ?? 0
	return { lampMoving: (status & 0x1f) !== 0 }
}

/** 084 INFORMATION STRING — data = [type, 01h, len, ...NUL-terminated strings]. */
export function decodeInfoString(res: NecResponse): { type: number; value: string } {
	const type = res.data[0] ?? 0
	// strings begin at index 3 (after type, fixed 01h, length byte); take the value string.
	const segments: string[] = []
	let i = 3
	while (i < res.data.length && segments.length < 2) {
		const s = asciiz(res.data, i, res.data.length - i)
		segments.push(s)
		i += s.length + 1
	}
	const value = segments.filter(Boolean).slice(-1)[0] ?? ''
	return { type, value }
}

/** Helper for logging an unexpected reply. */
export function describeResponse(res: NecResponse): string {
	return res.ok ? `ACK ${bytesToHex(res.data)}` : `NACK ${res.errorText ?? ''}`
}
