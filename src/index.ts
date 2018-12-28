import { doCompile } from './doCompile';
import { doGenerate } from './doGenerate';
import { getOptions } from './configFile';

if (process.argv.includes('-v')) {
	const configParseResult = getOptions();
	console.error(configParseResult.options);
}

let p: PromiseLike<void>;
if (process.argv.includes('-c')) {
	p = doCompile();
} else {
	p = doGenerate();
}

p.then(() => {
	console.log('\x1B[K\x1B[38;5;10mOK\x1B[0m');
	process.exit(0);
}, (err) => {
	console.error('\x1B[K');
	console.error(err.stack);
	process.exit(1);
});