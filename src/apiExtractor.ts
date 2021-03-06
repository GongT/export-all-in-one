import { API_CONFIG_FILE, PROJECT_ROOT } from './argParse';
import { writeJsonSyncIfChange } from './writeFile';

const apiExtractorJson = {
	$schema: 'https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json',
	projectFolder: '.',
	mainEntryPointFilePath: '<projectFolder>/declare-output/_export_all_in_once_index.d.ts',
	compiler: {
		tsconfigFilePath: '<projectFolder>/tsconfig.json',
		// "overrideTsconfig": {}
		// "skipLibCheck": true,
	},
	apiReport: {
		enabled: true,
		// "reportFileName": "<unscopedPackageName>.api.md",
		reportFolder: PROJECT_ROOT + '/doc/',
		// "reportTempFolder": "<projectFolder>/temp/"
	},
	docModel: {
		enabled: true,
		// "apiJsonFilePath": "<projectFolder>/temp/<unscopedPackageName>.api.json"
	},
	dtsRollup: {
		enabled: true,
		// "untrimmedFilePath": "<projectFolder>/dist/<unscopedPackageName>.d.ts",
		// "betaTrimmedFilePath": "<projectFolder>/dist/<unscopedPackageName>-beta.d.ts",
		publicTrimmedFilePath: PROJECT_ROOT + '/doc/package-public.d.ts',
		omitTrimmingComments: false,
	},
	tsdocMetadata: {
		enabled: true,
		tsdocMetadataFilePath: PROJECT_ROOT + '/doc/tsdoc-metadata.json',
	},
	messages: {
		compilerMessageReporting: {
			default: {
				logLevel: 'warning',
				addToApiReportFile: true,
			},
		},
		extractorMessageReporting: {
			default: {
				logLevel: 'warning',
				addToApiReportFile: true,
			},
		},
		tsdocMessageReporting: {
			default: {
				logLevel: 'warning',
				addToApiReportFile: true,
			},
		},
	},
};

export function rewriteApiExtractorConfig() {
	writeJsonSyncIfChange(API_CONFIG_FILE, {
		...apiExtractorJson,
		___tabs: '\t',
		___lastNewLine: '\n',
	});
}
