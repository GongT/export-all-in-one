#!/usr/bin/env node

import * as execa from 'execa';
import { mkdirpSync } from 'fs-extra';
import { resolve } from 'path';
import { API_CONFIG_FILE, EXPORT_TEMP_PATH, PROJECT_ROOT } from './argParse';
import { getOptions } from './configFile';
import { doGenerate } from './doGenerate';

if (process.argv.includes('-v')) {
	const configParseResult = getOptions();
	console.error(configParseResult.options);
}

function run(command: string, args: string[]) {
	console.log('Running %s %s', command, args.join(' '));
	const p = execa(command, args, { cwd: PROJECT_ROOT });
	p.stdout.pipe(process.stdout);
	p.stderr.pipe(process.stderr);
	return p;
}

doGenerate().then(() => {
	return run('tsc', ['-p', EXPORT_TEMP_PATH]);
}).then(async () => {
	await mkdirpSync(resolve(PROJECT_ROOT, 'doc'));
	return run('api-extractor', ['run', '-c', API_CONFIG_FILE, '--local', '--verbose']);
}).then(() => {
	console.log('\x1B[K\x1B[38;5;10mOK\x1B[0m');
	process.exit(0);
}, (err) => {
	console.error('\x1B[K');
	console.error(err.stack);
	process.exit(1);
});