/**
 * HTTP transport for the NEC `IsapiExtPj.dll` control CGI, including the optional
 * password (logon) handshake.
 *
 * Logon flow (reverse-engineered from the projector's own LogonInput.js and the
 * NEC authentication-flow specification):
 *   1. GET ?A=Cookie                  -> establishes a session cookie
 *   2. GET ?A=Rand                    -> returns a random nonce
 *   3. token = md5(nonce + password)  -> 32-char lower-case hex
 *   4. GET ?A=Logon%<token><username> -> authenticated; session held via the cookie
 * The logon state can be queried with `?L` (0 = no password set, 1 = needs logon,
 * 2 = logged on).
 */

import { createHash } from 'node:crypto'
import { encodeCommand, parseByteArray, parseResponse, type NecResponse } from './protocol.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface NecClientOptions {
	host: string
	port: number
	username: string
	password: string
	timeoutMs: number
	log: (level: LogLevel, message: string) => void
}

/** Thrown when an HTTP request fails or times out (i.e. the projector is unreachable). */
export class NecTransportError extends Error {}

/** How long to leave the projector alone after it answers 503 (its web server is overloaded). */
const BUSY_BACKOFF_MS = 20000
/** Minimum gap between consecutive requests; the embedded server copes badly with back-to-back hits. */
const MIN_GAP_MS = 60

export class NecClient {
	private cookies = new Map<string, string>()
	private authed = false
	private cacheBuster = 0
	/** All traffic to the projector goes through this chain, one request at a time. */
	private chain: Promise<unknown> = Promise.resolve()
	private lastRequestAt = 0
	private busyUntil = 0

	/** Run `fn` after every previously queued request has finished. */
	private async queue<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.chain.then(fn, fn)
		this.chain = run.catch(() => undefined)
		return run
	}

	/** Milliseconds until the projector may be contacted again, or 0. */
	busyFor(): number {
		return Math.max(0, this.busyUntil - Date.now())
	}

	constructor(private opts: NecClientOptions) {}

	update(opts: NecClientOptions): void {
		this.opts = opts
		this.cookies.clear()
		this.authed = false
	}

	private get base(): string {
		return `http://${this.opts.host}:${this.opts.port}/IsapiExtPj.dll`
	}

	private get needsAuth(): boolean {
		return this.opts.password.length > 0
	}

	/** Perform a raw GET against the CGI and return the body text. */
	private async http(query: string): Promise<string> {
		const busy = this.busyFor()
		if (busy > 0) {
			throw new NecTransportError(
				`Projector's web server is overloaded (HTTP 503); leaving it alone for ${Math.ceil(busy / 1000)}s`,
			)
		}
		const gap = MIN_GAP_MS - (Date.now() - this.lastRequestAt)
		if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap))
		this.lastRequestAt = Date.now()
		const url = `${this.base}?${query}`
		let res: Response
		try {
			res = await fetch(url, {
				method: 'GET',
				headers: this.cookies.size > 0 ? { Cookie: this.cookieHeader() } : {},
				signal: AbortSignal.timeout(this.opts.timeoutMs),
			})
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e)
			const timedOut = (e instanceof Error && e.name === 'TimeoutError') || /abort|timeout/i.test(msg)
			throw new NecTransportError(
				timedOut
					? 'Projector is not answering on the network. If it is in standby, set its Standby Mode to Network Standby so it can be woken over LAN.'
					: msg,
			)
		}
		this.storeCookies(res)
		if (res.status === 503 || res.status === 502) {
			this.busyUntil = Date.now() + BUSY_BACKOFF_MS
			this.authed = false
			throw new NecTransportError(
				`Projector's web server is overloaded (HTTP ${res.status}); leaving it alone for ${BUSY_BACKOFF_MS / 1000}s`,
			)
		}
		if (!res.ok) throw new NecTransportError(`HTTP ${res.status}`)
		return await res.text()
	}

	private cookieHeader(): string {
		return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
	}

	private storeCookies(res: Response): void {
		// getSetCookie() is preferred (handles multiple cookies); fall back to get().
		const headers = res.headers as Headers & { getSetCookie?: () => string[] }
		const raw = headers.getSetCookie?.() ?? (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : [])
		for (const line of raw) {
			const pair = line.split(';', 1)[0]
			const eq = pair.indexOf('=')
			if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
		}
	}

	/** Query the logon state: 0 = no password, 1 = needs logon, 2 = logged on, -1 = unknown. */
	async logonState(): Promise<number> {
		const bytes = parseByteArray(await this.http('L'))
		return bytes.length > 0 ? bytes[0] : -1
	}

	/** Perform the password handshake. No-op when no password is configured. */
	async logon(): Promise<void> {
		return this.queue(async () => this.logonUnqueued())
	}

	private async logonUnqueued(): Promise<void> {
		if (!this.needsAuth) {
			this.authed = true
			return
		}
		await this.http(`A=Cookie${++this.cacheBuster}`)
		const nonce = this.parseRand(await this.http(`A=Rand${++this.cacheBuster}`))
		if (!nonce) {
			this.opts.log('warn', 'Logon: projector did not return a random nonce')
		}
		const token = createHash('md5')
			.update(nonce + this.opts.password)
			.digest('hex')
		await this.http(`A=Logon%${token}${this.opts.username}`)
		const state = await this.logonState()
		this.authed = state === 2 || state === 0
		if (!this.authed) {
			throw new NecTransportError('Logon failed — check the HTTP user name and password')
		}
		this.opts.log('debug', 'Logon successful')
	}

	/** Extract the random nonce returned by ?A=Rand from the HTML response. */
	private parseRand(html: string): string {
		const patterns = [
			/Rand['"\s]*[=:]\s*['"]?([0-9A-Fa-f]{4,32})/, // Rand = "...."
			/value\s*=\s*['"]([0-9A-Fa-f]{4,32})['"]/, // <input ... value="....">
			/\b([0-9A-Fa-f]{16,32})\b/, // a bare long hex token
		]
		for (const p of patterns) {
			const m = html.match(p)
			if (m) return m[1]
		}
		return ''
	}

	/** Send a command (bytes without length/checksum) and return the parsed response. */
	async send(commandBytes: number[]): Promise<NecResponse> {
		return this.queue(async () => {
			if (this.needsAuth && !this.authed) await this.logonUnqueued()
			let res = await this.sendOnce(commandBytes)
			// Retry once if the session expired (err 02 0F = no authority).
			if (this.needsAuth && !res.ok && res.err1 === 0x02 && res.err2 === 0x0f) {
				this.authed = false
				await this.logonUnqueued()
				res = await this.sendOnce(commandBytes)
			}
			return res
		})
	}

	private async sendOnce(commandBytes: number[]): Promise<NecResponse> {
		const text = await this.http(`D=${encodeCommand(commandBytes)}`)
		const res = parseResponse(text)
		if (!res) throw new NecTransportError('Unparseable response from projector')
		return res
	}

	/** Force re-authentication on the next command (e.g. after a config change). */
	reset(): void {
		this.cookies.clear()
		this.authed = false
	}
}
