import { createCompilerHost, createProgram, ParsedCommandLine, Program } from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const moduleDeclare = /^declare module ".+?" {(.+?)^}/smg;
const importStatements = /^\s*import .+$/mg;
const multipleEmptyLines = /\n\s*\n\s*\n/g;

export async function doCompile(command: ParsedCommandLine) {
	const host = createCompilerHost(command.options, true);

	const program: Program = createProgram(command.fileNames, command.options, host);
	await program.emit();

	const outFile = command.options.outFile + '.d.ts';
	if (!existsSync(outFile)) {
		console.error('Must have a file at %s. But NOT !!!', outFile);
		throw new Error('F*ck! Typescript API has changed.');
	}

	const dts = readFileSync(outFile, 'utf8');

	const ms = matchAll(moduleDeclare, dts);
	ms.pop();
	const dtsNew = ms.map((m) => {
			return m[1];
		})
		.join('')
		.replace(/^    /mg, '')
		.replace(importStatements, '')
		.replace(multipleEmptyLines, '\n\n');

	// writeFileSync(outFile + '.d.ts', dts, 'utf8');
	writeFileSync(outFile, dtsNew, 'utf8');
}

export function matchAll(re: RegExp, s: string) {
	const ret: RegExpExecArray[] = [];
	while (true) {
		const m = re.exec(s);
		if (m) {
			ret.push(m);
		} else {
			return ret;
		}
	}
}