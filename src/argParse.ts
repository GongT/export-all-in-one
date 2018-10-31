///<reference types="node"/>

import { dirname, relative, resolve } from 'path';
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
export const SOURCE_ROOT = resolve(configFilePath, '..');
export const CONFIG_FILE = configFilePath;

let itr = configFilePath;
while (itr !== '/') {
	itr = dirname(itr);
	if (itr === '/' || /^[a-zA-Z]:\/?$/.test(itr)) {
		throw new Error('Cannot find any package.json from tsconfig directory to root');
	}

	const pkgFile = resolve(itr, 'package.json');
	if (existsSync(pkgFile)) {
		break;
	}
}

export const PROJECT_ROOT = itr;
export const CONFIG_FILE_REL = relative(itr, CONFIG_FILE);

