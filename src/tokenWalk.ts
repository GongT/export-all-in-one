import { basename, normalize, resolve } from 'path';
import {
	BindingName,
	ClassDeclaration,
	ExportAssignment,
	ExportDeclaration,
	FunctionDeclaration,
	getJSDocTags,
	Identifier,
	ImportDeclaration,
	InterfaceDeclaration,
	isArrayBindingPattern,
	isClassDeclaration,
	isExportAssignment,
	isExportDeclaration,
	isFunctionDeclaration,
	isIdentifier,
	isImportDeclaration,
	isInterfaceDeclaration,
	isModuleDeclaration,
	isNamedImports,
	isNamespaceImport,
	isObjectBindingPattern,
	isOmittedExpression,
	isStringLiteral,
	isVariableStatement,
	ModuleDeclaration,
	Node,
	StringLiteral,
	SyntaxKind,
	TypeChecker,
	VariableDeclaration,
	VariableStatement,
} from 'typescript';
import { SOURCE_ROOT } from './argParse';

function warn(node: Node, s: string, e?: Error) {
	if (e instanceof Error) {
		const path = e.stack.split(/\n/g, 2).join('\n\t');
		s += ': ' + path;
	}
	console.error('%s - %s\n\t\x1B[38;5;9m%s\x1B[0m', node.getSourceFile().fileName, node.getText(), s);
}

export function tokenWalk(ret: string[], node: Node, checker: TypeChecker) {
	const relative = './' + relativeToRoot(node.getSourceFile().fileName);
	
	if (isExportDeclaration(node) && !isCommentIgnore(node)) {
		// export a from b;
		// export {a,b,c};
		const ed = node as ExportDeclaration;
		if (ed.moduleSpecifier) {
			if (isStringLiteral(ed.moduleSpecifier)) {
				try {
					ret.push(`export ${normalizeExportClause(ed)} from ${resolveRelate(ed.moduleSpecifier)};`);
				} catch (e) {
					warn(ed.moduleSpecifier, 'tokenWalk failed', e);
				}
			} else {
				warn(ed.moduleSpecifier, 'import from invalid path');
			}
		} else {
			ret.push(`export ${normalizeExportClause(ed)} from '${relative}';`);
		}
	} else if (isModuleDeclaration(node) && isExported(node) && !isCommentIgnore(node)) {
		// export namespace|module
		const md = node as ModuleDeclaration;
		if (isStringLiteral(md.name)) {
			warn(md, 'only .d.ts can use this.');
		} else {
			ret.push(`export { ${idToString(md.name)} } from '${relative}';`);
		}
	} else if (isInterfaceDeclaration(node) && isExported(node) && !isCommentIgnore(node)) {
		// export interface
		const id = node as InterfaceDeclaration;
		const name = getName(id.name, relative, 'I');
		
		doExport(ret, id, name, relative);
	} else if (isClassDeclaration(node) && isExported(node) && !isCommentIgnore(node)) {
		// export class
		const cd = node as ClassDeclaration;
		const name = getName(cd.name, relative, true);
		
		doExport(ret, cd, name, relative);
	} else if (isFunctionDeclaration(node) && isExported(node) && !isCommentIgnore(node)) {
		// export function abc
		const fd = node as FunctionDeclaration;
		const name = getName(fd.name, relative, false);
		
		doExport(ret, fd, name, relative);
	} else if (isExportAssignment(node) && !isCommentIgnore(node)) {
		// export default Value
		const ea = node as ExportAssignment;
		const id: Identifier = isIdentifier(ea.expression)? ea.expression : null;
		
		const name = getName(id, relative, false);
		ret.push(`import ${name} from '${relative}'; export { ${name} };`);
	} else if (isVariableStatement(node) && isExported(node) && !isCommentIgnore(node)) {
		// export const/let/var Value
		const vs = node as VariableStatement;
		const names = vs.declarationList.declarations.map((node: VariableDeclaration) => {
			return findingBindingType(node.name);
		}).filter(e => !!e).join(', ');
		
		ret.push(`export {${names}} from '${relative}';`);
	} else if (isImportDeclaration(node)) {
		// no effect (generally
		const id = node as ImportDeclaration;
		const moduleName = id.moduleSpecifier as StringLiteral;
		ret.push(`import ${normalizeImportClause(id)} from '${moduleName.text}';`);
	} else {
		console.log(SyntaxKind[node.kind]);
	}
}

function findingBindingType(node: BindingName): string[] {
	const ret: string[] = [];
	if (isObjectBindingPattern(node)) {
		for (const element of node.elements) {
			ret.push(...findingBindingType(element.name));
		}
	} else if (isArrayBindingPattern(node)) {
		for (const element of node.elements) {
			if (!isOmittedExpression(element)) {
				ret.push(...findingBindingType(element.name));
			}
		}
	} else if (isIdentifier(node)) {
		ret.push(idToString(node));
	}
	return ret;
}

export function isCommentIgnore(node: Node) {
	for (const item of getJSDocTags(node)) {
		if (item.tagName && idToString(item.tagName).toLowerCase() === 'internal') {
			return true;
		}
	}
	return false;
}

function doExport(ret: string[], node: Node, name: string, file: string) {
	if (isDefaultExport(node)) {
		ret.push(`import ${name} from '${file}'; export { ${name} };`);
	} else {
		ret.push(`export { ${name} } from '${file}';`);
	}
}

function normalizeExportClause(node: ExportDeclaration) {
	if (!node.exportClause) {
		return '*';
	}
	const replaced: string[] = [];
	for (const item of node.exportClause.elements) {
		replaced.push(idToString(item.name));
	}
	return '{ ' + replaced.join(', ') + ' }';
}

function normalizeImportClause(node: ImportDeclaration) {
	if (!node.importClause) {
		return '';
	}
	const replaced: string[] = [];
	const bindings = node.importClause.namedBindings;
	if (isNamespaceImport(bindings)) {
		replaced.push(idToString(bindings.name));
	} else if (isNamedImports(bindings)) {
		for (const item of bindings.elements) {
			if (item.propertyName) {
				replaced.push(idToString(item.name) + ' as ' + idToString(item.propertyName));
			} else {
				replaced.push(idToString(item.name));
			}
		}
	}
	return '{ ' + replaced.join(', ') + ' }';
}

export function idToString(id: Identifier) {
	return id.escapedText.toString();
}

function resolveRelate(fileLiteral: StringLiteral) {
	const str = (0 || eval)(fileLiteral.getText());
	if (str.startsWith('.')) {
		const abs = resolve(fileLiteral.getSourceFile().fileName, '..', str);
		return `'${relativeToRoot(abs)}'`;
	} else {
		return `'${str}'`;
	}
}

export function relativeToRoot(abs: string) {
	return normalize(abs).replace(SOURCE_ROOT, '').replace(/^[\/\\]/g, '').replace(/\.ts$/, '');
}

function getName(name: Identifier, file: string, big: boolean|string) {
	if (name) {
		return idToString(name);
	} else {
		return varNameFromFile(file, big);
	}
}

function varNameFromFile(file: string, big: boolean|string) {
	let name = basename(file);
	if (big) {
		name = name.replace(/^[a-z]/, e => e.toUpperCase());
		if (typeof big === 'string') {
			name = big + name;
		}
	} else {
		name = name.replace(/^[A-Z]/, e => e.toLowerCase());
	}
	
	name = name.replace(/[_-][a-z]/g, e => e[1].toUpperCase());
	
	return name;
}

function isExported(node: Node) {
	if (!node.modifiers) {
		return false; // no any modify
	}
	return node.modifiers.findIndex(e => e.kind === SyntaxKind.ExportKeyword) !== -1;
	
}

function isDefaultExport(node: Node) {
	if (!node.modifiers) {
		return false; // no any modify
	}
	return node.modifiers.findIndex(e => e.kind === SyntaxKind.DefaultKeyword) !== -1;
	
}