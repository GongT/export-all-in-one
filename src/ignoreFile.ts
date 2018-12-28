import { PROJECT_ROOT } from './argParse';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export function patchIgnore(type: string) {
	const ignore = resolve(PROJECT_ROOT, '.' + type);
	if (existsSync(ignore)) {
		console.log('\x1B[38;5;10madd to %s...\x1B[0m', type);
		const old = readFileSync(ignore, 'utf8');
		if (!/^\.export-all-in-one/m.test(old)) {
			writeFileSync(ignore, old.replace(/[\s\n]+$/, '') + '\n\n### @gongt/export-all-in-one\n.export-all-in-one\n\n');
		}
	}
}