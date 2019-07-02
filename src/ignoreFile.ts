import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { PROJECT_ROOT, TEMP_DIR_NAME } from './argParse';

export function patchIgnore(type: string) {
	const ignore = resolve(PROJECT_ROOT, '.' + type);
	if (existsSync(ignore)) {
		console.log('\x1B[38;5;10madd to %s...\x1B[0m', type);
		const old = readFileSync(ignore, 'utf8');
		if (!/^\.export-all-in-one/m.test(old)) {
			writeFileSync(ignore, old.replace(/[\s\n]+$/, '') + '\n\n### @gongt/export-all-in-one\n' + TEMP_DIR_NAME + '\n\n');
		}
	}
}