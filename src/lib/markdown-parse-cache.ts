import {
	lexWithFootnotes,
	lexWithoutFootnotes,
	parseBlocksWithFootnotes,
	parseBlocksWithoutFootnotes,
	type Extension,
	type FootnoteState,
	type StreamdownToken
} from './marked/index.js';

export type MarkdownBlockParseResult = {
	tokens: StreamdownToken[];
	footnotes: FootnoteState;
};

export type MarkdownBlockCacheScope = 'stable' | 'transient';

export type MarkdownDocumentParseResult = {
	blocks: string[];
	footnotes: FootnoteState;
};

export type MarkdownParseOperations = {
	lexWithFootnotes: typeof lexWithFootnotes;
	lexWithoutFootnotes: typeof lexWithoutFootnotes;
	parseBlocksWithFootnotes: typeof parseBlocksWithFootnotes;
	parseBlocksWithoutFootnotes: typeof parseBlocksWithoutFootnotes;
};

type MarkdownBlockParseRequest = {
	markdown: string;
	extensions?: Extension[];
	resolveFootnotes: boolean;
	cacheScope?: MarkdownBlockCacheScope;
};

type MarkdownDocumentParseRequest = MarkdownBlockParseRequest & {
	splitBlocksFn?: ((markdown: string) => string[]) | null;
	blockCacheScope?: MarkdownBlockCacheScope;
};

type CachedDocumentParse = {
	markdown: string;
	resolveFootnotes: boolean;
	splitBlocksFn: ((markdown: string) => string[]) | null;
	result: MarkdownDocumentParseResult;
};

const defaultMarkdownParseOperations: MarkdownParseOperations = {
	lexWithFootnotes,
	lexWithoutFootnotes,
	parseBlocksWithFootnotes,
	parseBlocksWithoutFootnotes
};

const createEmptyFootnoteState = (): FootnoteState => ({
	refs: new Map(),
	footnotes: new Map()
});

class ScopedMarkdownParseCache {
	private readonly blockParsesWithFootnotes = new Map<string, MarkdownBlockParseResult>();
	private readonly blockParsesWithoutFootnotes = new Map<string, MarkdownBlockParseResult>();
	private lastDocumentParse: CachedDocumentParse | null = null;

	constructor(
		private readonly operations: MarkdownParseOperations,
		private readonly extensions: Extension[]
	) {}

	private computeBlockParse(markdown: string, resolveFootnotes: boolean): MarkdownBlockParseResult {
		return resolveFootnotes
			? this.operations.lexWithFootnotes(markdown, this.extensions)
			: {
					tokens: this.operations.lexWithoutFootnotes(markdown, this.extensions),
					footnotes: createEmptyFootnoteState()
				};
	}

	parseBlock({
		markdown,
		resolveFootnotes,
		cacheScope = 'stable'
	}: MarkdownBlockParseRequest): MarkdownBlockParseResult {
		if (cacheScope === 'transient') {
			return this.computeBlockParse(markdown, resolveFootnotes);
		}

		const cache = resolveFootnotes
			? this.blockParsesWithFootnotes
			: this.blockParsesWithoutFootnotes;
		const cached = cache.get(markdown);
		if (cached) {
			return cached;
		}

		const result = this.computeBlockParse(markdown, resolveFootnotes);
		cache.set(markdown, result);
		return result;
	}

	parseDocument({
		markdown,
		resolveFootnotes,
		splitBlocksFn = null,
		blockCacheScope = 'stable'
	}: MarkdownDocumentParseRequest): MarkdownDocumentParseResult {
		if (
			this.lastDocumentParse?.markdown === markdown &&
			this.lastDocumentParse.resolveFootnotes === resolveFootnotes &&
			this.lastDocumentParse.splitBlocksFn === splitBlocksFn
		) {
			return this.lastDocumentParse.result;
		}

		let result: MarkdownDocumentParseResult;
		if (splitBlocksFn) {
			result = {
				blocks: splitBlocksFn(markdown),
				footnotes: resolveFootnotes
					? this.parseBlock({
							markdown,
							resolveFootnotes,
							cacheScope: blockCacheScope
						}).footnotes
					: createEmptyFootnoteState()
			};
		} else if (resolveFootnotes) {
			result = this.operations.parseBlocksWithFootnotes(markdown, this.extensions);
		} else {
			result = {
				blocks: this.operations.parseBlocksWithoutFootnotes(markdown, this.extensions),
				footnotes: createEmptyFootnoteState()
			};
		}

		this.lastDocumentParse = {
			markdown,
			resolveFootnotes,
			splitBlocksFn,
			result
		};
		return result;
	}
}

class MarkdownParseCache {
	private readonly cachesByExtensions = new WeakMap<Extension[], ScopedMarkdownParseCache>();
	private readonly cacheWithoutExtensions: ScopedMarkdownParseCache;

	constructor(private readonly operations: MarkdownParseOperations) {
		this.cacheWithoutExtensions = new ScopedMarkdownParseCache(operations, []);
	}

	parseBlock(request: MarkdownBlockParseRequest): MarkdownBlockParseResult {
		return this.getScopedCache(request.extensions).parseBlock(request);
	}

	parseDocument(request: MarkdownDocumentParseRequest): MarkdownDocumentParseResult {
		return this.getScopedCache(request.extensions).parseDocument(request);
	}

	private getScopedCache(extensions: Extension[] = []): ScopedMarkdownParseCache {
		if (extensions.length === 0) {
			return this.cacheWithoutExtensions;
		}

		const cached = this.cachesByExtensions.get(extensions);
		if (cached) {
			return cached;
		}

		const scopedCache = new ScopedMarkdownParseCache(this.operations, extensions);
		this.cachesByExtensions.set(extensions, scopedCache);
		return scopedCache;
	}
}

export const createMarkdownParseCache = (
	operations: MarkdownParseOperations = defaultMarkdownParseOperations
) => new MarkdownParseCache(operations);
