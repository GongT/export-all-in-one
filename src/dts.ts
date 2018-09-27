import { writeFileSync } from 'fs';
import { CONFIG_FILE, PROJECT_ROOT } from 'argParse';
import { basename, dirname, posix, relative, resolve } from 'path';
import { CompilerOptions } from 'typescript';

export function writeDtsJson(options: CompilerOptions) {
	const { outDir, outFile, baseUrl } = options;
	const targetDir = outDir || dirname(outFile + '') || baseUrl;

	const base = basename(CONFIG_FILE);
	let dtsConfigName = '';
	if (/\.json$/i.test(base)) {
		dtsConfigName = base.replace(/\.json$/, '.d.json');
	} else {
		dtsConfigName = base + '.d.json';
	}
	const dtsConfig = resolve(CONFIG_FILE, '..', dtsConfigName);
	writeFileSync(dtsConfig, JSON.stringify({
		extends        : './' + base,
		compilerOptions: {
			module             : 'amd',
			noEmit           : false,
			emitDeclarationOnly: true,
			noEmitOnError      : false,
			outFile            : relative(dirname(CONFIG_FILE), resolve(targetDir, '_index')),
		},
		exclude        : [],
		include        : [],
		files          : [
			'./_index.ts',
		],
	}, null, 4), 'utf8');

	return posix.relative(PROJECT_ROOT, dtsConfig);
}
