import { writeDtsJson } from 'dts';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { relativeToRoot, tokenWalk } from 'tokenWalk';
import { projectPackage, rewritePackage } from 'package';
import { CONFIG_FILE, CONFIG_FILE_REL } from 'argParse';
import { dirname, resolve } from 'path';
import { processString } from 'typescript-formatter';
import { createCompilerHost, createProgram, forEachChild, Node, ParsedCommandLine, Program, SourceFile } from 'typescript';
import { filterIgnoreFiles, isFileIgnored } from 'filterIgnoreFiles';

export async function doGenerate(command: ParsedCommandLine) {
	console.log('\x1B[38;5;10mcreating typescript program...\x1B[0m');
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
		const fnDebug = file.fileName.slice(0, process.stdout.columns - 8 || Infinity);
		process.stdout.write(`\x1B[K\x1B[2m - ${fnDebug}...\x1B[0m\x1B[K\r`);
		forEachChild(file, (node: Node) => {
			tokenWalk(sources, node, checker);
		});
		sources.push(``);
	}

	console.log('\x1B[K\x1B[38;5;10mtypescript program created!\x1B[0m');
	const packageJson = projectPackage();
	if (!packageJson.scripts) {
		packageJson.scripts = {};
	}

	console.log('\x1B[38;5;10mwrite tsconfig.d.json...\x1B[0m');
	const dtsConfigOptionsFile = writeDtsJson(command.options);

	packageJson.scripts['build:exports'] = `export-all-in-one "${CONFIG_FILE_REL}" && export-all-in-one -c "${dtsConfigOptionsFile}"`;
	console.log('\x1B[38;5;10mupdate package.json scripts...\x1B[0m');
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

	writeFileSync(targetIndexFile, newFileData, 'utf8');
	console.log('\x1B[38;5;10mformatting _index.ts...\x1B[0m');

	return processString(targetIndexFile, newFileData, {
		verify      : false,
		replace     : false,
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
		if (result.error) {
			writeFileSync(targetIndexFile, newFileData, 'utf8');
			console.error(`this most caused by compile error, you can test with
\x1B[38;5;14\tmtsc -w -p ${CONFIG_FILE}\x1B[0m`);
			throw new Error(result.message);
		}
		writeFileSync(targetIndexFile, result.dest + `\n/*\n${JSON.stringify(result.settings, null, 4)}\n*/`, 'utf8');
	});
}