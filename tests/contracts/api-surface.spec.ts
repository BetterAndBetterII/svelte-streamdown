import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

type ExportKind = 'type' | 'value';

type ExportEntry = {
	name: string;
	kind: ExportKind;
};

type PropEntry = {
	name: string;
	optional: boolean;
	type: string;
	defaultValue: string | null;
};

type PluginPackageEntry = {
	packageName: string;
	defaultEntry: string | null;
	createEntry: string | null;
};

type ReferenceSnapshot = {
	schemaVersion: 1;
	referenceCommit: string;
	packageSubpaths: string[];
	rootExports: ExportEntry[];
	streamdownProps: PropEntry[];
	pluginPackages: PluginPackageEntry[];
	pluginConfigKeys: string[];
};

type LocalSnapshot = {
	schemaVersion: 1;
	packageSubpaths: string[];
	rootExports: ExportEntry[];
	streamdownProps: PropEntry[];
	pluginPackages: PluginPackageEntry[];
	pluginConfigKeys: string[];
};

type ExportDiff = {
	name: string;
	reference: ExportKind;
	local: ExportKind;
};

type PropTypeDiff = {
	name: string;
	reference: string;
	local: string;
};

type PropDefaultDiff = {
	name: string;
	reference: string | null;
	local: string | null;
};

type PropOptionalDiff = {
	name: string;
	reference: boolean;
	local: boolean;
};

type ApiSurfaceDiffs = {
	packageSubpaths: {
		missingFromLocal: string[];
		extraInLocal: string[];
	};
	rootExports: {
		missingFromLocal: string[];
		extraInLocal: string[];
		kindMismatches: ExportDiff[];
	};
	streamdownProps: {
		missingFromLocal: string[];
		extraInLocal: string[];
		typeMismatches: PropTypeDiff[];
		defaultMismatches: PropDefaultDiff[];
		optionalMismatches: PropOptionalDiff[];
	};
	pluginPackages: {
		missingFromLocal: PluginPackageEntry[];
	};
	pluginConfig: {
		missingFromLocal: string[];
	};
};

const FROZEN_REFERENCE_COMMIT = '5f6475139a87dee8af08fcf7b01475292bc064d2';

const approvedApiSurfaceDiffs: ApiSurfaceDiffs = sortApiSurfaceDiffs({
	packageSubpaths: {
		// api-07, drift-02
		missingFromLocal: ['./styles.css'],
		extraInLocal: [
			'./code',
			'./detect-direction',
			'./icon-context',
			'./math',
			'./mermaid',
			'./plugin-context',
			'./plugins',
			'./remend',
			'./url-policy',
			'./utils'
		]
	},
	rootExports: {
		// api-02, api-03, api-04, api-05, api-06
		missingFromLocal: [
			'Block',
			'BundledLanguage',
			'BundledTheme',
			'CodeBlock',
			'CodeBlockContainer',
			'CodeBlockCopyButton',
			'CodeBlockDownloadButton',
			'CodeBlockHeader',
			'CodeBlockSkeleton',
			'createAnimatePlugin',
			'defaultRehypePlugins',
			'defaultRemarkPlugins',
			'escapeMarkdownTableCell',
			'ExtraProps',
			'parseMarkdownIntoBlocks',
			'TableCopyDropdown',
			'TableCopyDropdownProps',
			'TableDownloadButton',
			'TableDownloadButtonProps',
			'TableDownloadDropdown',
			'TableDownloadDropdownProps',
			'ThemeRegistrationAny'
		],
		// drift-01
		extraInLocal: [
			'cn',
			'defaultIcons',
			'Extension',
			'HighlightResult',
			'HighlightToken',
			'IconComponent',
			'IconContext',
			'IconProvider',
			'IncompleteMarkdownParser',
			'isPathRelativeUrl',
			'LanguageInfo',
			'lex',
			'LinkMode',
			'mergeTheme',
			'mergeTranslations',
			'MermaidControls',
			'MermaidInstance',
			'NormalizedMermaidControls',
			'parseBlocks',
			'parseIncompleteMarkdown',
			'parseUrl',
				'Plugin',
				'PluginContext',
				'PluginProvider',
				'RemendHandler',
				'RemendOptions',
				'ResolvedAnimationConfig',
				'save',
				'shadcnTheme',
				'Snippets',
				'STREAMDOWN_CONTEXT_KEY',
				'StreamdownComponents',
				'StreamdownControlsConfig',
			'StreamdownToken',
			'theme',
			'Theme',
			'TableControlsConfig',
			'transformUrl',
			'TransformUrlOptions',
			'UrlPolicyKind',
			'useStreamdown',
			'useCjkPlugin',
			'useCodePlugin',
			'useCustomRenderer',
			'useIcons',
			'useMathPlugin',
			'useMermaidPlugin',
			'usePlugins',
			'bundledLanguagesInfo',
			'cjk',
			'code',
			'CodeControlsConfig',
			'createCjkPlugin',
			'createCodePlugin',
			'createLanguageSet',
			'createMathPlugin',
			'createMermaidPlugin',
			'findCustomRenderer',
			'getThemeName',
			'hasIncompleteCodeFence',
			'hasTable',
			'math',
			'mermaid'
		],
		kindMismatches: []
	},
	streamdownProps: {
		// prop-04, prop-09,
		// prop-17, prop-18, prop-20, api-01
		missingFromLocal: [
			'rehypePlugins',
			'remarkPlugins',
			'remarkRehypeOptions'
		],
		// api-01, prop-19, prop-22, prop-24
		extraInLocal: [
			'alert',
			'allowedImagePrefixes',
			'allowedLinkPrefixes',
			'animation',
			'baseTheme',
			'blockquote',
			'br',
			'class',
			'code',
			'codespan',
			'content',
			'defaultOrigin',
			'del',
			'description',
			'descriptionDetail',
			'descriptionList',
			'descriptionTerm',
			'element',
			'em',
			'extensions',
			'footnotePopover',
			'footnoteRef',
			'heading',
			'hr',
			'image',
			'inlineCitation',
			'inlineCitationContent',
			'inlineCitationPopover',
			'inlineCitationPreview',
			'inlineCitationsMode',
			'katexConfig',
			'li',
			'link',
			'math',
			'mdx',
			'mdxComponents',
			'mergeTheme',
			'mermaidConfig',
			'ol',
			'paragraph',
			'renderHtml',
			'shikiLanguages',
			'shikiThemes',
			'sources',
			'static',
			'streamdown',
			'strong',
			'sub',
			'sup',
			'table',
			'tbody',
			'td',
			'tfoot',
			'th',
			'thead',
			'theme',
			'tr',
			'ul'
		],
		// prop-05, prop-08, prop-19, prop-21, prop-22, prop-24
		typeMismatches: [
			{
				name: 'BlockComponent',
				reference: 'ComponentType<BlockProps>',
				local: 'Component<BlockProps,any,any>'
			},
			{
				name: 'caret',
				reference: 'keyof typeof carets',
				local: '"block"|"circle"'
			},
				{
					name: 'children',
					reference: 'string',
					local: 'Snippet<[{streamdown:StreamdownContext<Source>;token:GenericToken;children:Snippet;}]>'
				},
			{
				name: 'controls',
				reference: 'ControlsConfig',
				local: 'StreamdownControlsConfig'
			},
			{
				name: 'onAnimationEnd',
				reference: '()=>void',
				local: '(()=>void)'
			},
			{
				name: 'onAnimationStart',
				reference: '()=>void',
				local: '(()=>void)'
			},
			{
				name: 'parseMarkdownIntoBlocksFn',
				reference: '(markdown:string)=>string[]',
				local: '((markdown:string)=>string[])'
			},
			{
				name: 'shikiTheme',
				reference: '[ThemeInput,ThemeInput]',
				local: 'ThemeInput|[ThemeInput,ThemeInput]'
			}
		],
		// prop-05, prop-08, prop-21
		defaultMismatches: [
			{
				name: 'BlockComponent',
				reference: 'Block',
				local: null
			},
			{
				name: 'mode',
				reference: '"streaming"',
				local: "'streaming'"
			},
			{
				name: 'parseMarkdownIntoBlocksFn',
				reference: 'parseMarkdownIntoBlocks',
				local: null
			},
			{
				name: 'shikiTheme',
				reference: 'defaultShikiTheme',
				local: null
			}
		],
		optionalMismatches: []
	},
	pluginPackages: {
		missingFromLocal: []
	},
	pluginConfig: {
		// plugin-01
		missingFromLocal: []
	}
});

function readJsonFixture(fileName: string): unknown {
	const fixtureUrl = new URL(`../../fixtures/parity/${fileName}`, import.meta.url);
	return JSON.parse(readFileSync(fixtureUrl, 'utf8'));
}

function parseObject(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error(`Expected ${path} to be an object`);
	}

	return value as Record<string, unknown>;
}

function parseString(value: unknown, path: string): string {
	if (typeof value !== 'string') {
		throw new Error(`Expected ${path} to be a string`);
	}

	return value;
}

function parseNullableString(value: unknown, path: string): string | null {
	if (value === null) {
		return null;
	}

	return parseString(value, path);
}

function parseBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') {
		throw new Error(`Expected ${path} to be a boolean`);
	}

	return value;
}

function parseArray<T>(
	value: unknown,
	path: string,
	parseEntry: (entry: unknown, entryPath: string) => T
): T[] {
	if (!Array.isArray(value)) {
		throw new Error(`Expected ${path} to be an array`);
	}

	return value.map((entry, index) => parseEntry(entry, `${path}[${index}]`));
}

function parseSchemaVersion(value: unknown, path: string): 1 {
	if (value !== 1) {
		throw new Error(`Expected ${path} to be 1`);
	}

	return 1;
}

function parseExportKind(value: unknown, path: string): ExportKind {
	if (value === 'type' || value === 'value') {
		return value;
	}

	throw new Error(`Expected ${path} to be "type" or "value"`);
}

function parseExportEntry(value: unknown, path: string): ExportEntry {
	const entry = parseObject(value, path);
	return {
		name: parseString(entry.name, `${path}.name`),
		kind: parseExportKind(entry.kind, `${path}.kind`)
	};
}

function parsePropEntry(value: unknown, path: string): PropEntry {
	const entry = parseObject(value, path);
	return {
		name: parseString(entry.name, `${path}.name`),
		optional: parseBoolean(entry.optional, `${path}.optional`),
		type: parseString(entry.type, `${path}.type`),
		defaultValue: parseNullableString(entry.default, `${path}.default`)
	};
}

function parsePackageSubpaths(value: unknown, path: string): string[] {
	return parseArray(value, path, (entry, entryPath) => {
		const parsedEntry = parseObject(entry, entryPath);
		return parseString(parsedEntry.subpath, `${entryPath}.subpath`);
	}).sort(compareStrings);
}

function parsePluginPackageEntry(value: unknown, path: string): PluginPackageEntry {
	const entry = parseObject(value, path);
	return {
		packageName: parseString(entry.packageName, `${path}.packageName`),
		defaultEntry: parseNullableString(entry.defaultEntry, `${path}.defaultEntry`),
		createEntry: parseNullableString(entry.createEntry, `${path}.createEntry`)
	};
}

function parsePluginConfigKeys(value: unknown, path: string): string[] {
	return parseArray(value, path, (entry, entryPath) => {
		const parsedEntry = parseObject(entry, entryPath);
		return parseString(parsedEntry.name, `${entryPath}.name`);
	}).sort(compareStrings);
}

function parseReferenceSnapshot(raw: unknown): ReferenceSnapshot {
	const root = parseObject(raw, 'referenceSnapshot');
	const reference = parseObject(root.reference, 'referenceSnapshot.reference');
	const referencePackage = parseObject(reference.package, 'referenceSnapshot.reference.package');
	const exports = parseObject(root.exports, 'referenceSnapshot.exports');

	return {
		schemaVersion: parseSchemaVersion(root.schemaVersion, 'referenceSnapshot.schemaVersion'),
		referenceCommit: parseString(reference.commit, 'referenceSnapshot.reference.commit'),
		packageSubpaths: parsePackageSubpaths(
			referencePackage.exports,
			'referenceSnapshot.reference.package.exports'
		),
		rootExports: parseArray(
			exports.streamdown,
			'referenceSnapshot.exports.streamdown',
			parseExportEntry
		).sort(compareExportEntries),
		streamdownProps: parseArray(
			root.streamdownProps,
			'referenceSnapshot.streamdownProps',
			parsePropEntry
		).sort(comparePropEntries),
		pluginPackages: parseArray(
			exports.plugins,
			'referenceSnapshot.exports.plugins',
			parsePluginPackageEntry
		).sort(comparePluginPackages),
		pluginConfigKeys: parsePluginConfigKeys(root.pluginConfig, 'referenceSnapshot.pluginConfig')
	};
}

function parseLocalSnapshot(raw: unknown): LocalSnapshot {
	const root = parseObject(raw, 'localSnapshot');
	const local = parseObject(root.local, 'localSnapshot.local');
	const localPackage = parseObject(local.package, 'localSnapshot.local.package');
	const exports = parseObject(root.exports, 'localSnapshot.exports');

	return {
		schemaVersion: parseSchemaVersion(root.schemaVersion, 'localSnapshot.schemaVersion'),
		packageSubpaths: parsePackageSubpaths(
			localPackage.exports,
			'localSnapshot.local.package.exports'
		),
		rootExports: parseArray(
			exports.streamdown,
			'localSnapshot.exports.streamdown',
			parseExportEntry
		).sort(compareExportEntries),
		streamdownProps: parseArray(
			root.streamdownProps,
			'localSnapshot.streamdownProps',
			parsePropEntry
		).sort(comparePropEntries),
		pluginPackages: parseArray(
			exports.plugins,
			'localSnapshot.exports.plugins',
			parsePluginPackageEntry
		).sort(comparePluginPackages),
		pluginConfigKeys: parsePluginConfigKeys(root.pluginConfig, 'localSnapshot.pluginConfig')
	};
}

function compareStrings(left: string, right: string): number {
	return left.localeCompare(right);
}

function compareExportEntries(left: ExportEntry, right: ExportEntry): number {
	return compareStrings(left.name, right.name) || compareStrings(left.kind, right.kind);
}

function comparePropEntries(left: PropEntry, right: PropEntry): number {
	return compareStrings(left.name, right.name);
}

function comparePluginPackages(left: PluginPackageEntry, right: PluginPackageEntry): number {
	return compareStrings(left.packageName, right.packageName);
}

function comparePropTypeDiffs(left: PropTypeDiff, right: PropTypeDiff): number {
	return compareStrings(left.name, right.name);
}

function comparePropDefaultDiffs(left: PropDefaultDiff, right: PropDefaultDiff): number {
	return compareStrings(left.name, right.name);
}

function comparePropOptionalDiffs(left: PropOptionalDiff, right: PropOptionalDiff): number {
	return compareStrings(left.name, right.name);
}

function compareExportDiffs(left: ExportDiff, right: ExportDiff): number {
	return compareStrings(left.name, right.name);
}

function sortApiSurfaceDiffs(diffs: ApiSurfaceDiffs): ApiSurfaceDiffs {
	return {
		packageSubpaths: {
			missingFromLocal: [...diffs.packageSubpaths.missingFromLocal].sort(compareStrings),
			extraInLocal: [...diffs.packageSubpaths.extraInLocal].sort(compareStrings)
		},
		rootExports: {
			missingFromLocal: [...diffs.rootExports.missingFromLocal].sort(compareStrings),
			extraInLocal: [...diffs.rootExports.extraInLocal].sort(compareStrings),
			kindMismatches: [...diffs.rootExports.kindMismatches].sort(compareExportDiffs)
		},
		streamdownProps: {
			missingFromLocal: [...diffs.streamdownProps.missingFromLocal].sort(compareStrings),
			extraInLocal: [...diffs.streamdownProps.extraInLocal].sort(compareStrings),
			typeMismatches: [...diffs.streamdownProps.typeMismatches].sort(comparePropTypeDiffs),
			defaultMismatches: [...diffs.streamdownProps.defaultMismatches].sort(comparePropDefaultDiffs),
			optionalMismatches: [...diffs.streamdownProps.optionalMismatches].sort(
				comparePropOptionalDiffs
			)
		},
		pluginPackages: {
			missingFromLocal: [...diffs.pluginPackages.missingFromLocal].sort(comparePluginPackages)
		},
		pluginConfig: {
			missingFromLocal: [...diffs.pluginConfig.missingFromLocal].sort(compareStrings)
		}
	};
}

function listDifference(values: string[], excludedValues: Set<string>): string[] {
	return values.filter((value) => !excludedValues.has(value)).sort(compareStrings);
}

function collectApiSurfaceDiffs(
	reference: ReferenceSnapshot,
	local: LocalSnapshot
): ApiSurfaceDiffs {
	const referencePackageSubpaths = new Set(reference.packageSubpaths);
	const localPackageSubpaths = new Set(local.packageSubpaths);
	const referenceRootExports = new Map(reference.rootExports.map((entry) => [entry.name, entry]));
	const localRootExports = new Map(local.rootExports.map((entry) => [entry.name, entry]));
	const referenceProps = new Map(reference.streamdownProps.map((entry) => [entry.name, entry]));
	const localProps = new Map(local.streamdownProps.map((entry) => [entry.name, entry]));
	const localPluginPackages = new Map(local.pluginPackages.map((entry) => [entry.packageName, entry]));

	const rootExportKindMismatches: ExportDiff[] = [];
	for (const [name, referenceEntry] of referenceRootExports) {
		const localEntry = localRootExports.get(name);
		if (localEntry && localEntry.kind !== referenceEntry.kind) {
			rootExportKindMismatches.push({
				name,
				reference: referenceEntry.kind,
				local: localEntry.kind
			});
		}
	}

	const propTypeMismatches: PropTypeDiff[] = [];
	const propDefaultMismatches: PropDefaultDiff[] = [];
	const propOptionalMismatches: PropOptionalDiff[] = [];

	for (const [name, referenceProp] of referenceProps) {
		const localProp = localProps.get(name);
		if (!localProp) {
			continue;
		}

		if (localProp.type !== referenceProp.type) {
			propTypeMismatches.push({
				name,
				reference: referenceProp.type,
				local: localProp.type
			});
		}

		if (localProp.defaultValue !== referenceProp.defaultValue) {
			propDefaultMismatches.push({
				name,
				reference: referenceProp.defaultValue,
				local: localProp.defaultValue
			});
		}

		if (localProp.optional !== referenceProp.optional) {
			propOptionalMismatches.push({
				name,
				reference: referenceProp.optional,
				local: localProp.optional
			});
		}
	}

	return {
		packageSubpaths: {
			missingFromLocal: listDifference(reference.packageSubpaths, localPackageSubpaths),
			extraInLocal: listDifference(local.packageSubpaths, referencePackageSubpaths)
		},
		rootExports: {
			missingFromLocal: listDifference(
				[...referenceRootExports.keys()],
				new Set(localRootExports.keys())
			),
			extraInLocal: listDifference(
				[...localRootExports.keys()],
				new Set(referenceRootExports.keys())
			),
			kindMismatches: rootExportKindMismatches.sort(compareExportDiffs)
		},
		streamdownProps: {
			missingFromLocal: listDifference([...referenceProps.keys()], new Set(localProps.keys())),
			extraInLocal: listDifference([...localProps.keys()], new Set(referenceProps.keys())),
			typeMismatches: propTypeMismatches.sort(comparePropTypeDiffs),
			defaultMismatches: propDefaultMismatches.sort(comparePropDefaultDiffs),
			optionalMismatches: propOptionalMismatches.sort(comparePropOptionalDiffs)
		},
		pluginPackages: {
			missingFromLocal: reference.pluginPackages
				.filter((referenceEntry) => {
					const localEntry = localPluginPackages.get(referenceEntry.packageName);
					return (
						!localEntry ||
						localEntry.defaultEntry !== referenceEntry.defaultEntry ||
						localEntry.createEntry !== referenceEntry.createEntry
					);
				})
				.sort(comparePluginPackages)
		},
		pluginConfig: {
			missingFromLocal: listDifference(reference.pluginConfigKeys, new Set(local.pluginConfigKeys))
		}
	};
}

describe('API surface parity contract', () => {
	const referenceSnapshot = parseReferenceSnapshot(readJsonFixture('reference-api-surface.json'));
	const localSnapshot = parseLocalSnapshot(readJsonFixture('local-api-surface.json'));

	test('keeps the frozen reference fixture pinned to the documented upstream commit', () => {
		expect(referenceSnapshot.referenceCommit).toBe(FROZEN_REFERENCE_COMMIT);
	});

	test('keeps the root remend subpath aligned with the standalone remend package contract', async () => {
		const [standaloneRemend, rootRemend] = await Promise.all([
			import('remend'),
			import('../../src/lib/remend.js')
		]);

		expect(rootRemend.default).toBe(standaloneRemend.default);
		expect(rootRemend.parseIncompleteMarkdown).toBe(standaloneRemend.parseIncompleteMarkdown);
		expect(rootRemend.IncompleteMarkdownParser).toBe(standaloneRemend.IncompleteMarkdownParser);
		expect(rootRemend.isWithinCodeBlock).toBe(standaloneRemend.isWithinCodeBlock);
		expect(rootRemend.isWithinLinkOrImageUrl).toBe(standaloneRemend.isWithinLinkOrImageUrl);
		expect(rootRemend.isWithinMathBlock).toBe(standaloneRemend.isWithinMathBlock);
		expect(rootRemend.isWordChar).toBe(standaloneRemend.isWordChar);
	});

	test('only differs from the reference snapshot through the tracked allowlist', () => {
		expect(collectApiSurfaceDiffs(referenceSnapshot, localSnapshot)).toStrictEqual(
			approvedApiSurfaceDiffs
		);
	});
});
