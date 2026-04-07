<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import { useDarkMode } from '$lib/utils/darkMode.svelte.js';
	import Block from './Block.svelte';
	import { type MermaidOptions, type StreamdownProps } from './context.svelte.js';
	import { IconContext } from './icon-context.js';
	import { PluginContext } from './plugin-context.js';
	import { getThemeName } from './plugins.js';
	import {
		createMarkdownParseCache,
		type MarkdownBlockCacheScope,
		type MarkdownBlockParseResult
	} from './markdown-parse-cache.js';
	import Footnotes from './Elements/Footnotes.svelte';
	import { parseBlocks } from './marked/index.js';
	import { hasIncompleteCodeFence } from './streaming.js';
	import { mergeTranslations } from './translations.js';
	import {
		buildFootnoteEntries,
		buildParsedBlocks,
		mergeFootnoteState,
		preprocessStreamdownContent,
		resolveBlockDirection,
		resolveCaretPresentation,
		shouldResolveFootnotes
	} from './streamdown/pipeline.js';
	import {
		collectThemeRegistrations,
		defaultLinkSafetyConfig,
		resolveAnimationConfig,
		resolveControls,
		resolveShikiThemePair,
		resolveThemeClassMap
	} from './streamdown/config.js';
	import { createStreamdownRuntimeContext } from './streamdown/context.js';
	import { repairStreamdownRenderedMarkdown } from './streamdown/incomplete-markdown.js';

	let {
		content = '',
		class: className,
		className: futureClassName,
		shikiTheme,
		shikiLanguages,
		shikiThemes,
		mermaid,
		plugins,
		remend: remendOptions,
		parseIncompleteMarkdown = true,
		parseMarkdownIntoBlocksFn,
		mode = 'streaming',
		dir,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		linkSafety = defaultLinkSafetyConfig,
		allowedTags,
		allowedElements,
		allowElement,
		disallowedElements,
		literalTagContent,
		normalizeHtmlIndentation: shouldNormalizeHtmlIndentation = false,
		skipHtml,
		unwrapDisallowed,
		urlTransform,
		prefix,
		lineNumbers = true,
		theme,
		mermaidConfig = {},
		katexConfig,
		translations,
		baseTheme,
		mergeTheme: shouldMergeTheme = true,
		streamdown = $bindable(),
		renderHtml,
		controls = true,
		isAnimating = false,
		animated,
		caret,
		onAnimationStart,
		onAnimationEnd,
		BlockComponent,
		animation,
		element = $bindable(),
		icons,
		children,
		extensions,
		sources,
		inlineCitationsMode = 'carousel',
		mdxComponents,
		components,
		static: isStatic,
		...snippets
	}: StreamdownProps<Source> = $props();

	const darkMode = useDarkMode();
	const resolvedMode = $derived(isStatic === undefined ? mode : isStatic ? 'static' : 'streaming');
	const resolvedStatic = $derived(resolvedMode === 'static');
	const shouldShowCaret = $derived(resolvedMode !== 'static' && Boolean(caret) && isAnimating);
	const resolvedControls = $derived(resolveControls(controls));
	const resolvedShikiThemePair = $derived.by(() => {
		if (plugins?.code) {
			return plugins.code.getThemes();
		}

		return resolveShikiThemePair(shikiTheme);
	});
	const resolvedAnimation = $derived.by(() => {
		return resolveAnimationConfig({
			animation,
			animated,
			isAnimating,
			mode: resolvedMode
		});
	});
	const resolvedTheme = $derived.by(() =>
		resolveThemeClassMap({
			theme,
			baseTheme,
			shouldMergeTheme,
			prefix
		})
	);

	const shikiThemedTheme = $derived(getThemeName(resolvedShikiThemePair[darkMode.current ? 1 : 0]));

	const mermaidThemedTheme = $derived(
		mermaidConfig?.theme ? mermaidConfig.theme : darkMode.current ? 'dark' : 'default'
	);
	const resolvedMermaid = $derived<MermaidOptions | undefined>(mermaid);

	const allowedTagNames = $derived(allowedTags ? Object.keys(allowedTags) : []);

	const preprocessedContent = $derived.by(() =>
		preprocessStreamdownContent({
			content,
			shouldNormalizeHtmlIndentation,
			literalTagContent,
			allowedTagNames
		})
	);

	streamdown = createStreamdownRuntimeContext<Source>({
		parse: {
			content: () => content,
			remend: () => remendOptions,
			parseIncompleteMarkdown: () => parseIncompleteMarkdown,
			parseMarkdownIntoBlocksFn: () => parseMarkdownIntoBlocksFn ?? parseBlocks,
			mode: () => resolvedMode,
			dir: () => dir,
			sources: () => sources,
			inlineCitationsMode: () => inlineCitationsMode,
			extensions: () => extensions
		},
		security: {
			defaultOrigin: () => defaultOrigin,
			allowedLinkPrefixes: () => allowedLinkPrefixes,
			allowedImagePrefixes: () => allowedImagePrefixes,
			linkSafety: () => linkSafety,
			allowedTags: () => allowedTags,
			allowedElements: () => allowedElements,
			allowElement: () => allowElement,
			disallowedElements: () => disallowedElements,
			literalTagContent: () => literalTagContent,
			normalizeHtmlIndentation: () => shouldNormalizeHtmlIndentation,
			skipHtml: () => skipHtml,
			unwrapDisallowed: () => unwrapDisallowed,
			urlTransform: () => urlTransform,
			renderHtml: () => renderHtml ?? true
		},
		render: {
			BlockComponent: () => BlockComponent,
			prefix: () => prefix,
			lineNumbers: () => lineNumbers,
			shikiTheme: () => shikiThemedTheme,
			snippets: () => snippets,
			theme: () => resolvedTheme,
			baseTheme: () => baseTheme,
			mermaidConfig: () => ({
				theme: mermaidThemedTheme,
				...(resolvedMermaid?.config ?? {}),
				...mermaidConfig
			}),
			mermaid: () => resolvedMermaid,
			katexConfig: () => katexConfig,
			plugins: () => plugins,
			translations: () => mergeTranslations(translations),
			shikiLanguages: () => shikiLanguages,
			shikiThemes: () => ({
				...(shikiThemes ?? {}),
				...collectThemeRegistrations(resolvedShikiThemePair)
			}),
			children: () => children,
			mdxComponents: () => mdxComponents,
			components: () => components
		},
		uiConfig: {
			element: () => element,
			animation: () => resolvedAnimation,
			isAnimating: () => isAnimating,
			animated: () => animated,
			caret: () => caret,
			onAnimationStart: () => onAnimationStart,
			onAnimationEnd: () => onAnimationEnd,
			controls: () => resolvedControls.controls,
			codeControls: () => resolvedControls.codeControls,
			icons: () => icons
		}
	});
	PluginContext.provide(() => plugins ?? null);
	IconContext.provide(() => icons);

	const id = $props.id();
	let previousIsAnimating = $state<boolean | undefined>(undefined);
	const markdownParseCache = createMarkdownParseCache();

	$effect(() => {
		if (resolvedMode === 'static') {
			previousIsAnimating = isAnimating;
			return;
		}

		if (previousIsAnimating === undefined) {
			if (isAnimating) {
				onAnimationStart?.();
			}
		} else if (!previousIsAnimating && isAnimating) {
			onAnimationStart?.();
		} else if (previousIsAnimating && !isAnimating) {
			onAnimationEnd?.();
		}

		previousIsAnimating = isAnimating;
	});

	const parseMarkdownWithOptionalFootnotes = (
		markdown: string,
		cacheScope: MarkdownBlockCacheScope = 'stable'
	): MarkdownBlockParseResult =>
		markdownParseCache.parseBlock({
			markdown,
			extensions: streamdown.extensions,
			resolveFootnotes: shouldResolveFootnotes({
				markdown,
				mode: resolvedMode,
				parseIncompleteMarkdown
			}),
			cacheScope
		});
	const normalizedContent = $derived.by(() => {
		return preprocessedContent;
	});
	const renderContent = $derived.by(() =>
		resolvedMode === 'streaming' && parseIncompleteMarkdown
			? repairStreamdownRenderedMarkdown(normalizedContent, remendOptions)
			: normalizedContent
	);
	const parsedMarkdownDocument = $derived.by(() => {
		if (resolvedStatic) {
			const staticBlock = parseMarkdownWithOptionalFootnotes(renderContent);
			return {
				blocks: [renderContent],
				footnotes: staticBlock.footnotes,
				staticBlock
			};
		}

		return {
			...markdownParseCache.parseDocument({
				markdown: renderContent,
				extensions: streamdown.extensions,
				resolveFootnotes: shouldResolveFootnotes({
					markdown: normalizedContent,
					mode: resolvedMode,
					parseIncompleteMarkdown
				}),
				splitBlocksFn: parseMarkdownIntoBlocksFn ?? parseBlocks,
				blockCacheScope: 'transient'
			}),
			staticBlock: null
		};
	});
	const rawBlocks = $derived(parsedMarkdownDocument.blocks);
	const blockIsIncomplete = $derived(
		rawBlocks.map(
			(block, index) =>
				resolvedMode === 'streaming' &&
				isAnimating &&
				index === rawBlocks.length - 1 &&
				hasIncompleteCodeFence(block)
		)
	);
	const parsedDocument = $derived.by(() => {
		return {
			footnotes: parsedMarkdownDocument.footnotes
		};
	});

	const parsedBlocks = $derived.by(() =>
		buildParsedBlocks({
			resolvedStatic,
			normalizedContent: renderContent,
			parsedMarkdownDocument,
			rawBlocks,
			blockIsIncomplete,
			mode: resolvedMode,
			isAnimating,
			parseMarkdownWithFootnotes: parseMarkdownWithOptionalFootnotes
		})
	);

	const footnoteState = $derived.by(() =>
		mergeFootnoteState({
			documentFootnotes: parsedDocument.footnotes,
			parsedBlocks
		})
	);

	const footnoteEntries = $derived.by(() =>
		buildFootnoteEntries({
			footnoteState,
			parseMarkdownWithFootnotes: (markdown) => parseMarkdownWithOptionalFootnotes(markdown),
			filtering: {
				allowedElements: streamdown.allowedElements,
				allowElement: streamdown.allowElement,
				disallowedElements: streamdown.disallowedElements,
				skipHtml: streamdown.skipHtml,
				unwrapDisallowed: streamdown.unwrapDisallowed
			}
		})
	);

	$effect(() => {
		streamdown.footnotes.refs = new Map(footnoteState.refs);
		streamdown.footnotes.footnotes = new Map(footnoteState.footnotes);
	});
	const caretPresentation = $derived.by(() =>
		resolveCaretPresentation({
			caret,
			className,
			futureClassName,
			prefix,
			rawBlocks,
			shouldShowCaret
		})
	);
	const shouldHideCaret = $derived(caretPresentation.shouldHideCaret);
	const rootStyle = $derived(caretPresentation.rootStyle);
	const rootClassName = $derived(caretPresentation.rootClassName);
</script>

<div bind:this={element} class={rootClassName} style={rootStyle}>
	{#if shouldShowCaret && !shouldHideCaret && parsedBlocks.length === 0}<span
		></span>{/if}{#each parsedBlocks as parsedBlock, index (`${id}-block-${index}`)}{#if BlockComponent}{#snippet blockChildren()}<Block
					static={resolvedStatic}
					block={parsedBlock.raw}
					tokens={parsedBlock.tokens}
					parseIncompleteMarkdown={false}
					isIncomplete={parsedBlock.isIncomplete}
				/>{/snippet}<BlockComponent
				content={parsedBlock.raw}
				shouldParseIncompleteMarkdown={parseIncompleteMarkdown}
				{shouldNormalizeHtmlIndentation}
				{index}
				isIncomplete={parsedBlock.isIncomplete}
				dir={resolveBlockDirection({ block: parsedBlock.raw, dir })}
				children={blockChildren}
			/>{:else}<Block
				static={resolvedStatic}
				block={parsedBlock.raw}
				tokens={parsedBlock.tokens}
				parseIncompleteMarkdown={false}
				isIncomplete={parsedBlock.isIncomplete}
			/>{/if}{/each}<Footnotes entries={footnoteEntries} />
</div>

<style global>
	:global {
		@keyframes sd-fade {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		@keyframes sd-blur {
			from {
				opacity: 0;
				filter: blur(5px);
			}
			to {
				opacity: 1;
				filter: blur(0px);
			}
		}

		@keyframes sd-slideUp {
			from {
				transform: translateY(10%);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		@keyframes sd-slideDown {
			from {
				transform: translateY(-10%);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		.sd-line-numbers {
			counter-reset: sd-line;
		}

		.sd-line-numbers > .sd-code-line {
			position: relative;
			display: block;
			padding-left: 3rem;
		}

		.sd-line-numbers > .sd-code-line::before {
			content: counter(sd-line);
			counter-increment: sd-line;
			position: absolute;
			left: 0;
			width: 2rem;
			text-align: right;
			color: rgb(107 114 128);
			user-select: none;
		}
	}
</style>
