import { CONFIG_FILE } from 'argParse';
import { dirname, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

export interface IMyPackageJson {
	[key: string]: any;

	scripts: {[key: string]: string};

	___tabs: string;
	___lastNewLine: string;
}

let pathCache: string;

function projectPackagePath() {
	if (pathCache) {
		return pathCache;
	}
	let dir = CONFIG_FILE;
	while (dir !== '/') {
		dir = dirname(dir);
		const pack = resolve(dir, 'package.json');
		if (existsSync(pack)) {
			pathCache = pack;
			return pack;
		}
	}
	throw new Error('Cannot find a package.json at any level up from tsconfig.json.');
}

export function projectPackage(): IMyPackageJson {
	const jsonString = readFileSync(projectPackagePath(), 'utf8');

	const findSpace = /^\s+/m.exec(jsonString);
	const ___tabs = findSpace? findSpace[0] : '  ';
	const ___lastNewLine = jsonString.slice(jsonString.lastIndexOf('}') + 1);

	return {
		...JSON.parse(jsonString),
		___tabs,
		___lastNewLine,
	};
}

export function rewritePackage(data: IMyPackageJson) {
	const { ___tabs, ___lastNewLine, ...pack } = data;
	const packageData = JSON.stringify(pack, null, 1).replace(/^\s+/mg, (m0: string) => {
		return new Array(m0.length).fill(___tabs).join('');
	}) + ___lastNewLine;

	if (readFileSync(projectPackagePath(), 'utf8') === packageData) {
		return;
	}

	writeFileSync(projectPackagePath(), packageData, 'utf8');
}