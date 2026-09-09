/**
 * Low-level wire protocol for the NEC / Sharp NEC projector HTTP control interface.
 *
 * NEC projectors expose their binary "Projector Control Command" protocol (the same
 * one used over RS-232C and TCP port 7142) through an HTTP CGI: `IsapiExtPj.dll`.
 *
 * A command is sent as a query parameter:
 *     http://<host>/IsapiExtPj.dll?D=<len><bytes...>
 * where every byte (the length prefix and each command byte) is percent-encoded as
 * %XX. The length prefix is the number of command bytes EXCLUDING the checksum — the
 * CGI computes and appends the 1-byte checksum itself.
 *
 * The response is returned as a JSON-ish array of decimal byte values, e.g.
 *     [32,191,1,16,16,2,4,0,1,6,255,0,0,0,0,0,0,0,0,0,0,12,]
 * (note the trailing comma — not strict JSON, so it is parsed tolerantly).
 *
 * Response framing:  [type, cmd, id1, id2, len, ...data(len)..., checksum]
 *   - type & 0x80 === 0  -> command acknowledged (success)
 *   - type & 0x80 !== 0  -> NACK; the 2 data bytes are <err1> <err2>
 *
 * Verified against a live NEC NP-PA550W and the official
 * "Projector Control Command Reference Manual" (rev 7.1) + Appendixes (rev 20.0).
 */

/** Number of leading bytes before the data part: type, cmd, id1, id2, len. */
export const HEADER_LEN = 5

/** A parsed projector response. */
export interface NecResponse {
	/** The full raw byte array as returned by the projector. */
	raw: number[]
	/** True when the command was acknowledged (high bit of the first byte is clear). */
	ok: boolean
	/** Response type byte (0x2x = ack, 0xAx = nack). */
	type: number
	/** Echoed command byte. */
	cmd: number
	/** Projector control ID echoed back. */
	id1: number
	/** Model code echoed back. */
	id2: number
	/** Declared length of the data part. */
	dataLen: number
	/** The data part (length === dataLen, may be shorter if the reply was truncated). */
	data: number[]
	/** Error status byte (only present on a NACK). */
	err1?: number
	/** Error detail byte (only present on a NACK). */
	err2?: number
	/** Human-readable description of the error (only present on a NACK). */
	errorText?: string
}

/** Compute the NEC checksum: low byte of the sum of all bytes. */
export function checksum(bytes: readonly number[]): number {
	return bytes.reduce((acc, b) => (acc + b) & 0xff, 0)
}

/** Percent-encode a single byte as `%XX` (upper-case hex). */
function pctByte(b: number): string {
	return '%' + (b & 0xff).toString(16).toUpperCase().padStart(2, '0')
}

/**
 * Encode command bytes (WITHOUT the trailing checksum) into the value for the `D=`
 * query parameter. A length prefix is prepended and the CGI appends the checksum.
 */
export function encodeCommand(commandBytes: readonly number[]): string {
	const all = [commandBytes.length, ...commandBytes]
	return all.map(pctByte).join('')
}

/**
 * Tolerantly parse the projector's `[1,2,3,]` byte-array reply into a number[].
 * Handles trailing commas, whitespace, and a non-JSON content-type.
 */
export function parseByteArray(text: string): number[] {
	const start = text.indexOf('[')
	const end = text.lastIndexOf(']')
	if (start === -1 || end === -1 || end < start) return []
	const inner = text.slice(start + 1, end)
	if (inner.trim() === '') return []
	return inner
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0)
		.map((s) => parseInt(s, 10) & 0xff)
}

/** Combinations of (err1, err2) -> description, per the command reference manual. */
const ERROR_CODES: Record<string, string> = {
	'00,00': 'The command cannot be recognized',
	'00,01': 'The command is not supported by this model',
	'01,00': 'The specified value is invalid',
	'01,01': 'The specified input terminal is invalid',
	'01,02': 'The specified language is invalid',
	'02,00': 'Memory allocation error',
	'02,02': 'Memory in use',
	'02,03': 'The specified value cannot be set',
	'02,04': 'Forced onscreen mute is on',
	'02,06': 'Viewer error',
	'02,07': 'No signal',
	'02,08': 'A test pattern or filer is displayed',
	'02,09': 'No PC card is inserted',
	'02,0a': 'Memory operation error',
	'02,0c': 'An entry list is displayed',
	'02,0d': 'The command cannot be accepted because the power is off',
	'02,0e': 'The command execution failed',
	'02,0f': 'There is no authority necessary for the operation',
	'03,00': 'The specified gain number is incorrect',
	'03,01': 'The specified gain is invalid',
	'03,02': 'The projector cannot execute this in its current state (for power: it is still warming up or cooling down)',
}

/** Decode an (err1, err2) pair into a human-readable string. */
export function decodeError(err1: number, err2: number): string {
	const key = `${err1.toString(16).padStart(2, '0')},${err2.toString(16).padStart(2, '0')}`
	return ERROR_CODES[key] ?? `Unknown error (${toHex(err1)} ${toHex(err2)})`
}

/** Parse a raw reply string into a structured response, or null if not framed. */
export function parseResponse(text: string): NecResponse | null {
	const raw = parseByteArray(text)
	if (raw.length < HEADER_LEN) return null
	const [type, cmd, id1, id2, dataLen] = raw
	const data = raw.slice(HEADER_LEN, HEADER_LEN + dataLen)
	const ok = (type & 0x80) === 0
	const res: NecResponse = { raw, ok, type, cmd, id1, id2, dataLen, data }
	if (!ok) {
		res.err1 = data[0]
		res.err2 = data[1]
		res.errorText = decodeError(data[0] ?? 0, data[1] ?? 0)
	}
	return res
}

// ---- little-endian numeric helpers (NEC stores counters/values low byte first) ----

/** Unsigned 16-bit little-endian. */
export function u16le(d: readonly number[], o = 0): number {
	return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8)
}

/** Signed 16-bit little-endian. */
export function s16le(d: readonly number[], o = 0): number {
	const v = u16le(d, o)
	return v >= 0x8000 ? v - 0x10000 : v
}

/** Unsigned 32-bit little-endian. */
export function u32le(d: readonly number[], o = 0): number {
	return ((d[o] ?? 0) | ((d[o + 1] ?? 0) << 8) | ((d[o + 2] ?? 0) << 16) | ((d[o + 3] ?? 0) << 24)) >>> 0
}

/** Signed 32-bit little-endian (lamp "remaining life" can be negative). */
export function s32le(d: readonly number[], o = 0): number {
	return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8) | ((d[o + 2] ?? 0) << 16) | ((d[o + 3] ?? 0) << 24) | 0
}

/** Split a signed 16-bit value into [lowByte, highByte] (little-endian). */
export function toS16leBytes(value: number): [number, number] {
	const v = value & 0xffff
	return [v & 0xff, (v >> 8) & 0xff]
}

/** Read a NUL-terminated ASCII string from a byte array. */
export function asciiz(d: readonly number[], offset = 0, maxLen = d.length - offset): string {
	let out = ''
	for (let i = 0; i < maxLen; i++) {
		const c = d[offset + i]
		if (c === undefined || c === 0) break
		out += String.fromCharCode(c)
	}
	return out.trim()
}

/** Format a byte as a 2-digit upper-case hex string with a trailing `h`. */
export function toHex(b: number): string {
	return (b & 0xff).toString(16).toUpperCase().padStart(2, '0') + 'h'
}

/** Format a byte array as space-separated hex, for logging. */
export function bytesToHex(bytes: readonly number[]): string {
	return bytes.map((b) => (b & 0xff).toString(16).toUpperCase().padStart(2, '0')).join(' ')
}
