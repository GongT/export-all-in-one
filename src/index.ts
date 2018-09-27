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

if (process.argv.includes('-c')) {
	doCompile(configParseResult).then(() => {
		process.exit(0);
	}, (err) => {
		console.error(err.stack);
		process.exit(1);
	});
} else {
	doGenerate(configParseResult);
}
