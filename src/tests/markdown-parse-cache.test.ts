import { describe, expect, test, vi } from 'vitest';
import {
	createMarkdownParseCache,
	type MarkdownParseOperations
} from '../lib/markdown-parse-cache.js';
import type { FootnoteState, StreamdownToken } from '../lib/marked/index.js';

const createEmptyFootnoteState = (): FootnoteState => ({
	refs: new Map(),
	footnotes: new Map()
});

const createTextToken = (raw: string): StreamdownToken =>
	({
		type: 'text',
		raw,
		text: raw
	}) as StreamdownToken;

const createOperations = (): MarkdownParseOperations => ({
	lexWithFootnotes: vi.fn((markdown: string) => ({
		tokens: [createTextToken(`wf:${markdown}`)],
		footnotes: createEmptyFootnoteState()
	})),
	lexWithoutFootnotes: vi.fn((markdown: string) => [createTextToken(`wo:${markdown}`)]),
	parseBlocksWithFootnotes: vi.fn((markdown: string) => ({
		blocks: [`wf:${markdown}`],
		footnotes: createEmptyFootnoteState()
	})),
	parseBlocksWithoutFootnotes: vi.fn((markdown: string) => [`wo:${markdown}`])
});

describe('markdown parse cache', () => {
	test('reuses cached block lexing for unchanged streaming blocks', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);
		const extensions = [{ name: 'test-extension' }] as any[];

		const first = cache.parseBlock({
			markdown: 'stable block',
			extensions,
			resolveFootnotes: true
		});
		const second = cache.parseBlock({
			markdown: 'stable block',
			extensions,
			resolveFootnotes: true
		});

		expect(first).toBe(second);
		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(1);

		cache.parseBlock({
			markdown: 'stable block',
			extensions,
			resolveFootnotes: false
		});
		expect(operations.lexWithoutFootnotes).toHaveBeenCalledTimes(1);
	});

	test('does not retain transient streaming-tail block parses', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);

		cache.parseBlock({
			markdown: 'tail 1',
			resolveFootnotes: true,
			cacheScope: 'transient'
		});
		cache.parseBlock({
			markdown: 'tail 2',
			resolveFootnotes: true,
			cacheScope: 'transient'
		});
		cache.parseBlock({
			markdown: 'tail 1',
			resolveFootnotes: true,
			cacheScope: 'transient'
		});

		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(3);
	});

	test('reuses only the latest document split per custom splitter identity', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);
		const splitA = vi.fn((markdown: string) => [markdown, 'tail-a']);
		const splitB = vi.fn((markdown: string) => [markdown, 'tail-b']);

		const first = cache.parseDocument({
			markdown: 'doc',
			resolveFootnotes: true,
			splitBlocksFn: splitA
		});
		const second = cache.parseDocument({
			markdown: 'doc',
			resolveFootnotes: true,
			splitBlocksFn: splitA
		});

		expect(first).toBe(second);
		expect(splitA).toHaveBeenCalledTimes(1);
		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(1);

		cache.parseDocument({
			markdown: 'doc',
			resolveFootnotes: true,
			splitBlocksFn: splitB
		});
		expect(splitB).toHaveBeenCalledTimes(1);
		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(1);
	});

	test('reuses only the latest streaming document footnote parse when split blocks are transient', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);
		const splitBlocks = vi.fn((markdown: string) => [markdown]);

		const first = cache.parseDocument({
			markdown: 'doc 1',
			resolveFootnotes: true,
			splitBlocksFn: splitBlocks,
			blockCacheScope: 'transient'
		});
		const second = cache.parseDocument({
			markdown: 'doc 1',
			resolveFootnotes: true,
			splitBlocksFn: splitBlocks,
			blockCacheScope: 'transient'
		});

		expect(first).toBe(second);
		expect(splitBlocks).toHaveBeenCalledTimes(1);
		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(1);

		cache.parseDocument({
			markdown: 'doc 2',
			resolveFootnotes: true,
			splitBlocksFn: splitBlocks,
			blockCacheScope: 'transient'
		});
		cache.parseDocument({
			markdown: 'doc 1',
			resolveFootnotes: true,
			splitBlocksFn: splitBlocks,
			blockCacheScope: 'transient'
		});

		expect(splitBlocks).toHaveBeenCalledTimes(3);
		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(3);
	});

	test('reuses default block splitting results without extra full-document lexing', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);
		const extensions = [{ name: 'split-extension' }] as any[];

		const first = cache.parseDocument({
			markdown: 'paragraph',
			extensions,
			resolveFootnotes: true
		});
		const second = cache.parseDocument({
			markdown: 'paragraph',
			extensions,
			resolveFootnotes: true
		});

		expect(first).toBe(second);
		expect(first.blocks).toEqual(['wf:paragraph']);
		expect(operations.parseBlocksWithFootnotes).toHaveBeenCalledTimes(1);
		expect(operations.lexWithFootnotes).not.toHaveBeenCalled();
	});

	test('scopes cached block parses to the extension array identity', () => {
		const operations = createOperations();
		const cache = createMarkdownParseCache(operations);

		cache.parseBlock({
			markdown: 'same markdown',
			extensions: [{ name: 'alpha' }] as any[],
			resolveFootnotes: true
		});
		cache.parseBlock({
			markdown: 'same markdown',
			extensions: [{ name: 'alpha' }] as any[],
			resolveFootnotes: true
		});

		expect(operations.lexWithFootnotes).toHaveBeenCalledTimes(2);
	});
});
