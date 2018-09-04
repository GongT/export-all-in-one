import typescript from 'rollup-plugin-typescript2';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const OPWD = process.cwd();

process.chdir(resolve(__dirname, '..'));

const pkg = require(resolve('package.json'));
const tsconfig = resolve('src/tsconfig.json');

const external = [
	pkg.name,
	...Object.keys(pkg.dependencies || {}),
	...Object.keys(pkg.devDependencies || {}),
];

const watch = {
	chokidar: true,
	include: 'src/**',
};

const plugins = [
	nodeResolve(),
	typescript({tsconfig}),
	commonjs(),
];

const mainFile = pkg.main || resolve('dist/main.js');

const banner = readFileSync(resolve('build/loader.js'), 'utf8');

const commonOutput = {
	banner: '#!/usr/bin/env node',
	intro: banner,
	sourcemap: true,
	name: pkg.name.replace(/^@/, '').replace(/\//g, '__'),
};

const config = [
	{
		input: resolve('src/index.ts'),
		plugins,
		external,
		watch,
		output: [
			{file: mainFile, format: 'cjs', ...commonOutput},
		],
	},
];

process.chdir(OPWD);
export default config;
