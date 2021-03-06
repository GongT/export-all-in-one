///<reference types="node"/>

import { existsSync, lstatSync } from 'fs';
import { platform, tmpdir } from 'os';
import { dirname, resolve } from 'path';
import { relativePosix } from './paths';

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
	throw new Error('Cannot find tsconfig.json file: ' + project);
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

export const PROJECT_ROOT = resolve(itr);
export const CONFIG_FILE_REL = relativePosix(itr, CONFIG_FILE);

function getTemp() {
	if (process.env.RUSH_TEMP_FOLDER) {
		return process.env.RUSH_TEMP_FOLDER;
	} else {
		return tmpdir();
	}
}

export const EXPORT_TEMP_PATH = resolve(getTemp(), '.export-all-in-one');
export const DTS_CONFIG_FILE = resolve(EXPORT_TEMP_PATH, 'tsconfig.json');
export const API_CONFIG_FILE = resolve(EXPORT_TEMP_PATH, 'api-extractor.json');

export const IS_WINDOWS = platform() === 'win32';
