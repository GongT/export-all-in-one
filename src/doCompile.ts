import {
	createCompilerHost,
	createProgram,
	forEachChild,
	ImportClause,
	ImportEqualsDeclaration,
	isImportDeclaration,
	isImportEqualsDeclaration,
	isModuleBlock,
	isModuleDeclaration,
	isNamespaceImport,
	isStringLiteral,
	ModuleBlock,
	Node,
	Program,
	SourceFile,
	SyntaxKind,
} from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { idToString, nameToString } from './util';
import { getOptions } from './configFile';

const moduleDeclare = /^declare module "(\S+?)" {(.+?)^}/smg;
const emptyModuleDeclare = /^declare module "(\S+?)" {\s+}/smg;
// const internalExport = /^\/\*\*.*?@internal.*?\*\/$[\r\n]+^(?:export (?:const|let|var|type) .+?;$|export (?:enum|interface|class) .+?^}$)/smg;
const importStatements = /^\s*import .+$/mg;
const multipleEmptyLines = /\n\s*\n\s*\n/g;

export async function doCompile() {
	const command = getOptions();
	const host = createCompilerHost(command.options, true);
	
	console.log('compile file %s ...', command.fileNames);
	const program: Program = createProgram(command.fileNames, command.options, host);
	await program.emit();
	
	const outFile = command.options.outFile + '.d.ts';
	if (!existsSync(outFile)) {
		console.error('Must have a file at %s. But NOT !!!', outFile);
		throw new Error('F*ck! Typescript API has changed.');
	}
	const imports = await doCompileAfter(outFile);
	
	const dts = readFileSync(outFile, 'utf8')
		.replace(emptyModuleDeclare, (m0, name) => {
			return `// module is empty: ${name}`;
		});
	const ms = matchAll(moduleDeclare, dts);
	
	ms.pop(); // "_index" itself
	
	const dtsNew = ms
		.map(([m0, name, content]: string[]) => {
			return content.trim().split(/\n/g).map((line) => {
				if (line.trim().startsWith('import ')) {
					return line;
				} else {
					return `/*${name.trim()}*/ ${line}`;
				}
			}).join('\n');
		})
		.join('\n\n')
		.replace(importStatements, '')
		// .replace(internalExport, '')
		.replace(multipleEmptyLines, '\n\n');
	
	writeFileSync(outFile, imports.join('\n') + '\n\n' + dtsNew, 'utf8');
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

enum ImportType {
	Named, // import A from B & import * as A from B
	Default, // import A from B
	Equal, // import A = B
}

type ImportDataItem = {name: string, alias?: string, type: ImportType};
type ImportData = Map<string, ImportDataItem[]>

function visitModule(file: SourceFile, node: Node, importData: ImportData, ignoreModules: string[]) {
	function addImport(name: string, alias: string, from: string, type: ImportType) {
		from = from.trim();
		// console.log(from, '|', from.slice(1, from.length - 1));
		if (ignoreModules.includes(from.slice(1, from.length - 1))) {
			return;
		}
		if (!importData.has(from)) {
			importData.set(from, []);
		}
		importData.get(from).push({ name, type });
	}
	
	if (isImportEqualsDeclaration(node)) {
		// console.log('found import =');
		const ied = node as ImportEqualsDeclaration;
		addImport(
			idToString(ied.name),
			null,
			ied.moduleReference.getFullText(file),
			ImportType.Equal,
		);
	} else if (isImportDeclaration(node) && node.importClause) {
		// console.log('found import from');
		const ic: ImportClause = node.importClause;
		if (ic.name) {
			addImport(
				idToString(ic.name),
				null,
				node.moduleSpecifier.getFullText(file),
				ImportType.Default,
			);
		} else if (ic.namedBindings) {
			if (isNamespaceImport(ic.namedBindings)) {
				addImport(
					idToString(ic.name),
					'*',
					node.moduleSpecifier.getFullText(file),
					ImportType.Named,
				);
			} else {
				for (const item of ic.namedBindings.elements) {
					addImport(
						idToString(item.name),
						item.propertyName? idToString(item.propertyName) : null,
						node.moduleSpecifier.getFullText(file),
						ImportType.Named,
					);
				}
			}
		} else {
			console.log(SyntaxKind[node.kind]);
		}
	} else {
		// console.log('passthru: ', SyntaxKind[node.kind]);
		return node.getFullText(file);
	}
	return '';
}

export async function doCompileAfter(outFile: string) {
	const program: Program = createProgram([outFile], { noEmit: true });
	const importData: ImportData = new Map();
	
	for (const file of program.getSourceFiles()) { // files must has only one item
		if (file.fileName !== outFile) {
			continue;
		}
		console.log('compile file: %s ...', outFile);
		const myModules: string[] = [];
		forEachChild(file, (node: Node) => {
			if (isModuleDeclaration(node)) {
				myModules.push(nameToString(node.name).trim());
			}
		});
		// console.log('myModules=', myModules);
		forEachChild(file, (node: Node) => {
			if (isModuleDeclaration(node) && isModuleBlock(node.body)) {
				if (isStringLiteral(node.name) && node.name.text === '_export_all_in_once_index') {
					return;
				}
				
				const body = node.body as ModuleBlock;
				for (const state of body.statements) {
					visitModule(file, state, importData, myModules);
				}
			}
		});
	}
	return doImport(importData);
}

function doImport(map: ImportData): string[] {
	let importSection: string[] = [];
	const moduleNames = new Map<string, {
		module: string, symbol: string, type: ImportType,
		firstLocal: string,
		localNames: string[]
	}>();
	map.forEach((items: ImportDataItem[], module: string) => {
		items.forEach(({ name, alias, type }: ImportDataItem) => {
			const from = whereItComesFrom(name, alias, type, module);
			if (moduleNames.has(from)) {
				const { localNames, firstLocal } = moduleNames.get(from);
				if (firstLocal !== name && !localNames.includes(name)) {
					localNames.push(name);
				}
			} else {
				moduleNames.set(from, {
					module, type, symbol: alias,
					firstLocal          : name,
					localNames          : [],
				});
			}
		});
	});
	moduleNames.forEach(({ firstLocal, module, type, symbol, localNames }) => {
		const s = getLine(getName(firstLocal, symbol), module, type);
		importSection.push(s);
		localNames.forEach((alias) => {
			importSection.push(`type ${alias} = ${firstLocal}`);
		});
	});
	return importSection;
	
	function getName(name: string, exported: string) {
		if (exported) {
			return exported + ' as ' + name;
		} else {
			return name;
		}
	}
	
	function getLine(im: string, module: string, type: ImportType) {
		if (type === ImportType.Default) {
			return `import ${im} from ${module}`;
		} else if (type === ImportType.Named) {
			return `import { ${im} } from ${module}`;
		} else {
			return `import ${im} = ${module}`;
		}
	}
}

function whereItComesFrom(name: string, alias: string, type: ImportType, module: string) {
	if (!alias) {
		if (type === ImportType.Default) {
			alias = 'default';
		} else if (type === ImportType.Equal) {
			alias = '*';
		} else {
			alias = name;
		}
	}
	return `${module} -> ${alias}`;
}