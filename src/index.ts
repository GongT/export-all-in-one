import { CONFIG_FILE } from './argParse';
import { normalize, resolve } from 'path';
import { writeFileSync } from 'fs';
import {
	createCompilerHost,
	createProgram,
	Diagnostic,
	forEachChild,
	formatDiagnostic,
	FormatDiagnosticsHost,
	getParsedCommandLineOfConfigFile,
	Node,
	ParseConfigFileHost,
	ParsedCommandLine,
	Program,
	SourceFile,
	sys,
} from 'typescript';
import { relativeToRoot, tokenWalk } from './tokenWalk';

const ignored = /^_|\.test\.ts$/;

const myFormatDiagnosticsHost: FormatDiagnosticsHost = {
	getCurrentDirectory : sys.getCurrentDirectory,
	getCanonicalFileName: normalize,
	getNewLine(): string {
		return sys.newLine;
	},
};

const myParseConfigFileHost: ParseConfigFileHost = {
	onUnRecoverableConfigFileDiagnostic(diagnostic: Diagnostic) {
		console.error(formatDiagnostic(diagnostic, myFormatDiagnosticsHost));
	},
	useCaseSensitiveFileNames: false,
	readDirectory            : sys.readDirectory,
	fileExists               : sys.fileExists,
	readFile                 : sys.readFile,
	getCurrentDirectory      : sys.getCurrentDirectory,
};

const configParseResult: ParsedCommandLine = getParsedCommandLineOfConfigFile(CONFIG_FILE, {}, myParseConfigFileHost);

const targetIndexFile = resolve(CONFIG_FILE, '..', '_index.ts');
const files = configParseResult.fileNames.slice();
const id = files.indexOf(targetIndexFile);
files.splice(id, 1);

const host = createCompilerHost(configParseResult.options, true);
const program: Program = createProgram(files, configParseResult.options, host);
const checker = program.getTypeChecker();

const sources: string[] = [];
let file: SourceFile;

for (file of program.getSourceFiles()) {
	if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) {
		// console.log(file.fileName, file.isDeclarationFile, program.isSourceFileFromExternalLibrary(file));
		continue;
	}

	sources.push(`//// - ${relativeToRoot(file.fileName)}`);

	if (ignored.test(file.fileName)) {
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

const newFileData = sources.map((node) => {
	return node;
}).join('\n');
writeFileSync(targetIndexFile, newFileData);
