import { basename, resolve } from 'path';
import { PROJECT_ROOT } from './argParse';
import {
	ClassDeclaration,
	ExportAssignment,
	FunctionDeclaration,
	getJSDocTags,
	Identifier,
	InterfaceDeclaration,
	isClassDeclaration,
	isExportAssignment,
	isExportDeclaration,
	isFunctionDeclaration,
	isIdentifier,
	isInterfaceDeclaration,
	isModuleDeclaration,
	isStringLiteral,
	ModuleDeclaration,
	NamedExports,
	Node,
	StringLiteral,
	SyntaxKind,
	TypeChecker,
} from 'typescript';

function warn(node: Node, s: string, e?: Error) {
	if (e instanceof Error) {
		const path = e.stack.split(/\n/g, 2).join('\n\t');
		s += ': ' + path;
	}
	console.error('%s - %s\n\t\x1B[38;5;9m%s\x1B[0m', node.getSourceFile().fileName, node.getText(), s);
}

export function tokenWalk(ret: string[], node: Node, checker: TypeChecker) {
	const relative = relativeToRoot(node.getSourceFile().fileName);

	if (isExportDeclaration(node) && !isCommentIgnore(node)) {
		// export a from b;
		// export {a,b,c};
		if (node.moduleSpecifier) {
			if (isStringLiteral(node.moduleSpecifier)) {
				try {
					ret.push(`export ${normalizeExportClause(node)} from ${resolveRelate(node.moduleSpecifier)};`);
				} catch (e) {
					warn(node.moduleSpecifier, 'tokenWalk failed', e);
				}
			} else {
				warn(node.moduleSpecifier, 'import from invalid path');
			}
		} else {
			ret.push(`export ${normalizeExportClause(node)} from '${relative}';`);
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
	}
}

function isCommentIgnore(node: Node) {
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

function normalizeExportClause(node: Node & {exportClause?: NamedExports}) {
	if (!node.exportClause) {
		return '*';
	}
	const replaced: string[] = [];
	for (const item of node.exportClause.elements) {
		replaced.push(idToString(item.name));
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
	return abs.replace(PROJECT_ROOT, '').replace(/^\//g, '').replace(/\.ts$/, '');
}

function getName(name: Identifier, file: string, big: boolean | string) {
	if (name) {
		return idToString(name);
	} else {
		return varNameFromFile(file, big);
	}
}

function varNameFromFile(file: string, big: boolean | string) {
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