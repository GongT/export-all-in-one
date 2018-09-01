///<reference types="node"/>

import { resolve } from 'path';
import { existsSync, lstatSync } from 'fs';

const item = process.argv[process.argv.length - 1] || '.';
const project = resolve(process.cwd(), item);
let configFilePath = '';

if (existsSync(project)) {
	if (existsSync(resolve(project, 'tsconfig.json'))) {
		configFilePath = resolve(project, 'tsconfig.json');
	} else if (lstatSync(project).isFile()) {
		configFilePath = project;
	}
}

if (!configFilePath) {
	throw new Error('Cannot find tsconfig.json file');
}

// modify this if some IDE supports other source root
export const PROJECT_ROOT = resolve(configFilePath, '..');
export const CONFIG_FILE = configFilePath;