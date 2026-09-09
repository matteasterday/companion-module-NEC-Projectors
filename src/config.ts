import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	username: string
	password: string
	polling: boolean
	pollInterval: number
	powerOffLockout: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			label: 'NEC / Sharp NEC Projector',
			width: 12,
			value:
				'Controls NEC / Sharp NEC projectors over HTTP using the built-in <code>IsapiExtPj.dll</code> control interface. ' +
				'The default HTTP port is 80. If the projector has an HTTP control password configured, enter the user name and ' +
				'password below; otherwise leave them blank.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Projector IP address / hostname',
			width: 8,
			default: '',
			tooltip: 'e.g. 192.168.0.10',
		},
		{
			type: 'number',
			id: 'port',
			label: 'HTTP port',
			width: 4,
			default: 80,
			min: 1,
			max: 65535,
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'HTTP user name (only if password protected)',
			width: 6,
			default: '',
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'HTTP password (leave blank if none)',
			width: 6,
			default: '',
		},
		{
			type: 'checkbox',
			id: 'polling',
			label: 'Poll projector for status / feedback',
			width: 4,
			default: true,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (seconds)',
			width: 4,
			default: 5,
			min: 1,
			max: 600,
		},
		{
			type: 'number',
			id: 'powerOffLockout',
			label: 'Power off lockout after power on (seconds)',
			width: 4,
			default: 90,
			min: 0,
			max: 600,
			tooltip:
				'Projectors refuse a power off for a while after the lamp reaches Power On. During this window the module refuses the command instead of sending one the projector will drop, and publishes power_off_locked / power_off_in so buttons can show it. 0 disables.',
		},
	]
}
