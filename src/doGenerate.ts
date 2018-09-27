import { writeDtsJson } from 'dts';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { relativeToRoot, tokenWalk } from 'tokenWalk';
import { projectPackage, rewritePackage } from 'package';
import { CONFIG_FILE, CONFIG_FILE_REL } from 'argParse';
import { dirname, resolve } from 'path';
import { processString } from 'typescript-formatter';
import { createCompilerHost, createProgram, forEachChild, Node, ParsedCommandLine, Program, SourceFile } from 'typescript';
import { filterIgnoreFiles, isFileIgnored } from 'filterIgnoreFiles';

export function doGenerate(command: ParsedCommandLine) {
	const host = createCompilerHost(command.options, true);

	const program: Program = createProgram(filterIgnoreFiles(command), command.options, host);

	const targetIndexFile = resolve(CONFIG_FILE, '..', '_index.ts');

	const checker = program.getTypeChecker();

	const sources: string[] = [];
	let file: SourceFile;

	for (file of program.getSourceFiles()) {
		if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) {
			// console.log(file.fileName, file.isDeclarationFile, program.isSourceFileFromExternalLibrary(file));
			continue;
		}

		sources.push(`//// - ${relativeToRoot(file.fileName)}`);

		if (isFileIgnored(file.fileName)) {
			sources.push(`// ignore by default`);
			sources.push(``);
			continue;
		}

		console.log('\x1B[38;5;14mParsing file: %s...\x1B[0m', file.fileName);
		forEachChild(file, (node: Node) => {
			tokenWalk(sources, node, checker);
		});
		sources.push(``);
	}

	const packageJson = projectPackage();
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	const dtsConfigOptionsFile = writeDtsJson(command.options);

	packageJson.scripts['build:exports'] = `export-all-in-one "${CONFIG_FILE_REL}" && export-all-in-one -c "${dtsConfigOptionsFile}"`;
	rewritePackage(packageJson);

	const newFileData = sources.filter((item, index, self) => {
		return self.indexOf(item) === self.lastIndexOf(item);
	}).map((node) => {
		return node;
	}).join('\n');

	process.chdir(dirname(CONFIG_FILE));
	if (existsSync(targetIndexFile)) {
		unlinkSync(targetIndexFile);
	}

	processString(targetIndexFile, newFileData, {
		verify      : true,
		replace     : true,
		tsconfig    : true,
		tsconfigFile: CONFIG_FILE,
		tslint      : true,
		tslintFile  : null,
		editorconfig: true,
		vscode      : true,
		vscodeFile  : null,
		tsfmt       : true,
		tsfmtFile   : null,
	}).then((result) => {
		console.error(result.message);
		if (result.error) {
			process.exit(1);
		}
		writeFileSync(targetIndexFile, result.dest + `\n/*\n${JSON.stringify(result.settings, null, 4)}\n*/`, 'utf8');
		process.exit(0);
	}, (e) => {
		throw e;
	});
}