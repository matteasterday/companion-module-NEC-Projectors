import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig } from './config.js'

const addPowerOffLockout: CompanionStaticUpgradeScript<ModuleConfig> = (_context, props) => {
	const result = { updatedConfig: null as ModuleConfig | null, updatedActions: [], updatedFeedbacks: [] }
	if (props.config && typeof (props.config as Partial<ModuleConfig>).powerOffLockout !== 'number') {
		result.updatedConfig = { ...props.config, powerOffLockout: 90 }
	}
	return result
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig>[] = [
	addPowerOffLockout,
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	// function (context, props) {
	// 	return {
	// 		updatedConfig: null,
	// 		updatedActions: [],
	// 		updatedFeedbacks: [],
	// 	}
	// },
]
