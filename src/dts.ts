import { basename, dirname, resolve } from 'path';
import { CompilerOptions } from 'typescript';
import { CONFIG_FILE, PROJECT_ROOT } from './argParse';
import { relativePosix } from './paths';
import { readJsonSync, writeJsonSyncIfChange } from './writeFile';

export function writeDtsJson(options: CompilerOptions) {
	const parentConfigFile = readJsonSync<any>(CONFIG_FILE);
	const { ___tabs, ___lastNewLine } = parentConfigFile;
	
	if (!parentConfigFile.exclude || !parentConfigFile.exclude.includes('_export_all_in_once_index.ts')) {
		console.error(`\x1B[38;5;9mtsconfig.json do not exclude '_export_all_in_once_index.ts' file, this may not work.\x1B[0m`);
	}
	
	const base = basename(CONFIG_FILE);
	let dtsConfigName = '';
	if (/\.json$/i.test(base)) {
		dtsConfigName = base.replace(/\.json$/, '.d.json');
	} else {
		dtsConfigName = base + '.d.json';
	}
	const dtsConfig = resolve(CONFIG_FILE, '..', '_' + dtsConfigName);
	writeJsonSyncIfChange(dtsConfig, {
		___tabs, ___lastNewLine,
		extends        : './' + base,
		compilerOptions: {
			removeComments     : false,
			declaration        : true,
			module             : 'amd',
			noEmit             : false,
			emitDeclarationOnly: true,
			noEmitOnError      : false,
			outFile            : getOutputFilePath(dirname(CONFIG_FILE), options),
			allowUnusedLabels  : true,
			noUnusedLocals     : false,
			strict             : false,
			alwaysStrict       : false,
		},
		exclude        : [],
		include        : [],
		files          : [
			'./_export_all_in_once_index.ts',
		],
	});
	
	return relativePosix(PROJECT_ROOT, dtsConfig);
}

export function getOutputFilePath(relativeTo: string, options: CompilerOptions) {
	const { outDir, outFile, baseUrl } = options;
	
	const targetDir = outDir || dirname(outFile + '') || baseUrl;
	console.log(relativeTo, resolve(targetDir, '_export_all_in_once_index'));
	return relativePosix(relativeTo, resolve(targetDir, '_export_all_in_once_index'));
}
