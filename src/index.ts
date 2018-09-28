import { CONFIG_FILE } from './argParse';
import { normalize } from 'path';
import { Diagnostic, formatDiagnostic, FormatDiagnosticsHost, getParsedCommandLineOfConfigFile, ParseConfigFileHost, ParsedCommandLine, sys, } from 'typescript';
import { doCompile } from 'doCompile';
import { doGenerate } from 'doGenerate';

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
if (process.argv.includes('-v')) {
	console.error(configParseResult.options);
}

let p: PromiseLike<void>;
if (process.argv.includes('-c')) {
	p = doCompile(configParseResult);
} else {
	p = doGenerate(configParseResult);
}

p.then(() => {
	console.log('\x1B[K\x1B[38;5;10mOK\x1B[0m');
	process.exit(0);
}, (err) => {
	console.error('\x1B[K');
	console.error(err.stack);
	process.exit(1);
});