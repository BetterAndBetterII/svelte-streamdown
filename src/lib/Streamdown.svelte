<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import remend from 'remend';
	import { useDarkMode } from '$lib/utils/darkMode.svelte.js';
	import Block from './Block.svelte';
	import {
		normalizeMermaidControls,
		StreamdownContext,
		type ResolvedAnimationConfig,
		type BlockProps,
		type MermaidOptions,
		type StreamdownProps
	} from './context.svelte.js';
	import { IconContext } from './icon-context.js';
	import { PluginContext } from './plugin-context.js';
	import { getThemeName, type ThemeInput } from './plugins.js';
	import { createCn, mergeTheme, prefixThemeClasses, shadcnTheme } from './theme.js';
	import {
		lexWithoutFootnotes,
		lexWithFootnotes,
		parseBlocksWithoutFootnotes,
		parseBlocksWithFootnotes,
		type FootnoteState,
		type StreamdownToken
	} from './marked/index.js';
	import { filterMarkdownTokens } from './markdown.js';
	import type { Footnote, FootnoteRef } from './marked/marked-footnotes.js';
	import Footnotes from './Elements/Footnotes.svelte';
	import { normalizeHtmlIndentation } from './security/html.js';
	import { preprocessCustomTags } from './security/preprocess-custom-tags.js';
	import { preprocessLiteralTagContent } from './security/preprocess-literal-tag-content.js';
	import { carets, hasIncompleteCodeFence, hasTable } from './streaming.js';
	import { mergeTranslations } from './translations.js';
	import { detectTextDirection } from './utils/detectDirection.js';

	const animationNameMap = {
		blurIn: 'blur',
		fadeIn: 'fade',
		slideUp: 'slideUp'
	} as const;
	type LocalAnimationConfig = ResolvedAnimationConfig;
	const defaultLinkSafetyConfig = {
		enabled: true
	} as const;
	const defaultShikiTheme: [ThemeInput, ThemeInput] = ['github-light', 'github-dark'];
	const footnoteDefinitionPattern = /\[\^[\w-]{1,200}\]:/;

	const resolveShikiThemePair = (
		theme: StreamdownProps<Source>['shikiTheme'] | undefined
	): [ThemeInput, ThemeInput] => {
		if (Array.isArray(theme)) {
			return [theme[0] ?? defaultShikiTheme[0], theme[1] ?? theme[0] ?? defaultShikiTheme[1]];
		}

		if (theme) {
			return [theme, theme];
		}

		return defaultShikiTheme;
	};

	const collectThemeRegistrations = (
		themes: [ThemeInput, ThemeInput]
	): Record<string, import('shiki').ThemeRegistration> =>
		Object.fromEntries(
			themes
				.filter((theme): theme is Exclude<ThemeInput, string> => typeof theme !== 'string')
				.map((theme) => [getThemeName(theme), theme])
		);

	const resolveCompatAnimation = (
		animated: StreamdownProps<Source>['animated'],
		isAnimating: boolean,
		mode: 'static' | 'streaming'
	): LocalAnimationConfig => {
		if (!animated || !isAnimating || mode === 'static') {
			return {
				enabled: false
			};
		}

		if (animated === true) {
			return {
				enabled: true,
				animateOnMount: true,
				type: 'fade' as const,
				duration: 150,
				timingFunction: 'ease' as const,
				tokenize: 'word' as const,
				stagger: 40
			};
		}

		const animationName =
			(typeof animated.animation === 'string' && animated.animation.length > 0
				? (animationNameMap[animated.animation as keyof typeof animationNameMap] ??
					animated.animation)
				: undefined) ?? 'fade';
		const timingFunction =
			typeof animated.easing === 'string' && animated.easing.trim().length > 0
				? animated.easing
				: 'ease';

		return {
			enabled: true,
			animateOnMount: true,
			type: animationName,
			duration: animated.duration ?? 150,
			timingFunction,
			tokenize: animated.sep ?? 'word',
			stagger: animated.stagger ?? 40
		} as const;
	};

	const resolveControls = (controls: StreamdownProps<Source>['controls']) => {
		if (controls === false) {
			return {
				controls: {
					code: false,
					mermaid: normalizeMermaidControls(false),
					table: false
				},
				codeControls: {
					copy: false,
					download: false
				}
			};
		}

		const codeControls =
			controls === true || controls === undefined ? true : (controls.code ?? true);
		const tableControls =
			controls === true || controls === undefined ? true : (controls.table ?? true);
		const mermaidControls =
			controls === true || controls === undefined ? undefined : controls.mermaid;

		return {
			controls: {
				code: codeControls !== false,
				mermaid: normalizeMermaidControls(mermaidControls),
				table: tableControls
			},
			codeControls:
				codeControls === false
					? {
							copy: false,
							download: false
						}
					: codeControls === true
						? {
								copy: true,
								download: true
							}
						: {
								copy: codeControls.copy ?? true,
								download: codeControls.download ?? true
							}
		};
	};

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
	const prefixedCn = $derived.by(() => createCn(prefix));
	const resolvedClassName = $derived(
		[className, futureClassName].filter((value): value is string => Boolean(value)).join(' ')
	);
	const shouldShowCaret = $derived(resolvedMode !== 'static' && Boolean(caret) && isAnimating);
	const resolvedControls = $derived(resolveControls(controls));
	const resolvedShikiThemePair = $derived.by(() => {
		if (plugins?.code) {
			return plugins.code.getThemes();
		}

		return resolveShikiThemePair(shikiTheme);
	});
	const resolvedAnimation = $derived.by(() => {
		if (animation) {
			if (!animation.enabled) {
				return {
					enabled: false
				};
			}

			return {
				enabled: true,
				animateOnMount: animation.animateOnMount ?? false,
				type: animation.type || 'blur',
				duration: animation.duration ?? 500,
				timingFunction: animation.timingFunction || 'ease-in',
				tokenize: animation.tokenize || 'word',
				stagger: animation.stagger ?? 0
			};
		}

		return resolveCompatAnimation(animated, isAnimating, resolvedMode);
	});
	const resolvedTheme = $derived.by(() => {
		const mergedTheme = shouldMergeTheme
			? mergeTheme(theme, baseTheme)
			: theme || (baseTheme === 'shadcn' ? shadcnTheme : theme);

		return prefixThemeClasses(prefix, mergedTheme);
	});

	const shikiThemedTheme = $derived(getThemeName(resolvedShikiThemePair[darkMode.current ? 1 : 0]));

	const mermaidThemedTheme = $derived(
		mermaidConfig?.theme ? mermaidConfig.theme : darkMode.current ? 'dark' : 'default'
	);
	const resolvedMermaid = $derived<MermaidOptions | undefined>(mermaid);

	const allowedTagNames = $derived(allowedTags ? Object.keys(allowedTags) : []);

	const preprocessedContent = $derived.by(() => {
		let result = shouldNormalizeHtmlIndentation ? normalizeHtmlIndentation(content) : content;

		if (literalTagContent && literalTagContent.length > 0) {
			result = preprocessLiteralTagContent(result, literalTagContent);
		}

		if (allowedTagNames.length > 0) {
			result = preprocessCustomTags(result, allowedTagNames);
		}

		return result;
	});

	streamdown = new StreamdownContext({
		get element() {
			return element;
		},
		get content() {
			return content;
		},
		get parseIncompleteMarkdown() {
			return parseIncompleteMarkdown;
		},
		get parseMarkdownIntoBlocksFn() {
			return parseMarkdownIntoBlocksFn;
		},
		get mode() {
			return resolvedMode;
		},
		get dir() {
			return dir;
		},
		get defaultOrigin() {
			return defaultOrigin;
		},
		get allowedLinkPrefixes() {
			return allowedLinkPrefixes;
		},
		get allowedImagePrefixes() {
			return allowedImagePrefixes;
		},
		get linkSafety() {
			return linkSafety;
		},
		get allowedTags() {
			return allowedTags;
		},
		get allowedElements() {
			return allowedElements;
		},
		get allowElement() {
			return allowElement;
		},
		get disallowedElements() {
			return disallowedElements;
		},
		get literalTagContent() {
			return literalTagContent;
		},
		get normalizeHtmlIndentation() {
			return shouldNormalizeHtmlIndentation;
		},
		get skipHtml() {
			return skipHtml;
		},
		get unwrapDisallowed() {
			return unwrapDisallowed;
		},
		get urlTransform() {
			return urlTransform;
		},
		get prefix() {
			return prefix;
		},
		get lineNumbers() {
			return lineNumbers;
		},
		get shikiTheme() {
			return shikiThemedTheme;
		},
		get snippets() {
			return snippets;
		},
		get theme() {
			return resolvedTheme;
		},
		get baseTheme() {
			return baseTheme;
		},
		get mermaidConfig() {
			return {
				theme: mermaidThemedTheme,
				...(resolvedMermaid?.config ?? {}),
				...mermaidConfig
			};
		},
		get mermaid() {
			return resolvedMermaid;
		},
		get katexConfig() {
			return katexConfig;
		},
		get plugins() {
			return plugins;
		},
		get renderHtml() {
			return renderHtml ?? true;
		},
		get translations() {
			return mergeTranslations(translations);
		},
		get shikiLanguages() {
			return shikiLanguages;
		},
		get shikiThemes() {
			return {
				...(shikiThemes ?? {}),
				...collectThemeRegistrations(resolvedShikiThemePair)
			};
		},
		get sources() {
			return sources;
		},
		get inlineCitationsMode() {
			return inlineCitationsMode;
		},
		get animation() {
			return resolvedAnimation;
		},
		get isAnimating() {
			return isAnimating;
		},
		get animated() {
			return animated;
		},
		get caret() {
			return caret;
		},
		get onAnimationStart() {
			return onAnimationStart;
		},
		get onAnimationEnd() {
			return onAnimationEnd;
		},
		get controls() {
			return resolvedControls.controls;
		},
		get codeControls() {
			return resolvedControls.codeControls;
		},
		get children() {
			return children;
		},
		get extensions() {
			return extensions;
		},
		get icons() {
			return icons;
		},
		get mdxComponents() {
			return mdxComponents;
		},
		get components() {
			return components;
		}
	});
	PluginContext.provide(() => plugins ?? null);
	IconContext.provide(() => icons);

	const id = $props.id();
	let previousIsAnimating = $state<boolean | undefined>(undefined);

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

	type ParsedBlock = {
		raw: string;
		tokens: StreamdownToken[];
		footnotes: FootnoteState;
		isIncomplete: boolean;
	};

	const preserveStreamingFootnoteLiterals = (tokens: StreamdownToken[]): StreamdownToken[] =>
		tokens.map((token) => {
			if (
				resolvedMode === 'streaming' &&
				isAnimating &&
				token.type === 'footnoteRef' &&
				token.content.lines.join('\n').trim().length === 0
			) {
				return {
					type: 'text',
					raw: token.raw,
					text: token.raw
				} as StreamdownToken;
			}

			if ('tokens' in token && Array.isArray(token.tokens)) {
				return {
					...token,
					tokens: preserveStreamingFootnoteLiterals(token.tokens as StreamdownToken[])
				} as StreamdownToken;
			}

			return token;
		});

	const shouldResolveFootnotes = (markdown: string): boolean =>
		!(
			resolvedMode === 'streaming' &&
			parseIncompleteMarkdown &&
			!footnoteDefinitionPattern.test(markdown)
		);

	const parseMarkdownWithOptionalFootnotes = (markdown: string) => {
		if (shouldResolveFootnotes(markdown)) {
			return lexWithFootnotes(markdown, streamdown.extensions);
		}

		return {
			tokens: lexWithoutFootnotes(markdown, streamdown.extensions),
			footnotes: {
				refs: new Map<string, FootnoteRef>(),
				footnotes: new Map<string, Footnote>()
			}
		};
	};

	const splitBlocks = $derived(
		parseMarkdownIntoBlocksFn ??
			((markdown: string) =>
				shouldResolveFootnotes(markdown)
					? parseBlocksWithFootnotes(markdown, streamdown.extensions).blocks
					: parseBlocksWithoutFootnotes(markdown, streamdown.extensions))
	);
	const normalizedContent = $derived.by(() => {
		if (!(resolvedMode === 'streaming' && parseIncompleteMarkdown)) {
			return preprocessedContent;
		}

		return remend(preprocessedContent, remendOptions);
	});
	const rawBlocks = $derived(
		resolvedStatic ? [normalizedContent] : splitBlocks(normalizedContent)
	);
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
			footnotes: parseMarkdownWithOptionalFootnotes(normalizedContent).footnotes
		};
	});

	const parsedBlocks = $derived.by(() => {
		return rawBlocks.map((raw, index) => {
			const isIncomplete = blockIsIncomplete[index] ?? false;
			const markdown = raw;
			const parsed = parseMarkdownWithOptionalFootnotes(markdown);

			return {
				raw,
				tokens: preserveStreamingFootnoteLiterals(parsed.tokens),
				footnotes: parsed.footnotes,
				isIncomplete
			};
		}) satisfies ParsedBlock[];
	});

	const footnoteState = $derived.by(() => {
		const refs = new Map<string, FootnoteRef>(parsedDocument.footnotes.refs);
		const footnotes = new Map<string, Footnote>(parsedDocument.footnotes.footnotes);

		for (const parsedBlock of parsedBlocks) {
			for (const [label, ref] of parsedBlock.footnotes.refs) {
				refs.set(label, ref);
			}

			for (const [label, entry] of parsedBlock.footnotes.footnotes) {
				footnotes.set(label, entry);
			}
		}

		return {
			refs,
			footnotes
		} satisfies FootnoteState;
	});

	const footnoteEntries = $derived.by(() => {
		return Array.from(footnoteState.footnotes.values()).map((entry) => {
			const content = entry.lines.join('\n').trim();
			return {
				...entry,
				lines: [...entry.lines],
				tokens:
					content.length === 0
						? []
						: filterMarkdownTokens(parseMarkdownWithOptionalFootnotes(content).tokens, {
								allowedElements: streamdown.allowedElements,
								allowElement: streamdown.allowElement,
								disallowedElements: streamdown.disallowedElements,
								skipHtml: streamdown.skipHtml,
								unwrapDisallowed: streamdown.unwrapDisallowed
							})
			};
		}) satisfies Footnote[];
	});

	$effect(() => {
		streamdown.footnotes.refs = new Map(footnoteState.refs);
		streamdown.footnotes.footnotes = new Map(footnoteState.footnotes);
	});
	const shouldHideCaret = $derived(
		!shouldShowCaret || rawBlocks.length === 0
			? false
			: (() => {
					const lastBlock = rawBlocks.at(-1) as string;
					return hasIncompleteCodeFence(lastBlock) || hasTable(lastBlock);
				})()
	);
	const rootStyle = $derived(
		shouldShowCaret && !shouldHideCaret ? `--streamdown-caret: "${carets[caret!]}";` : undefined
	);
	const rootClassName = $derived(
		prefixedCn(
			'whitespace-normal',
			resolvedClassName,
			shouldShowCaret &&
				!shouldHideCaret &&
				'[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]'
		)
	);
	const resolveBlockDirection = (block: string): BlockProps['dir'] => {
		if (!dir) {
			return undefined;
		}

		if (dir === 'auto') {
			return detectTextDirection(block);
		}

		return dir;
	};
</script>

<div bind:this={element} class={rootClassName} style={rootStyle}>{#if shouldShowCaret && !shouldHideCaret && parsedBlocks.length === 0}<span></span>{/if}{#each parsedBlocks as parsedBlock, index (`${id}-block-${index}`)}{#if BlockComponent}{#snippet blockChildren()}<Block
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
	dir={resolveBlockDirection(parsedBlock.raw)}
	children={blockChildren}
/>{:else}<Block
	static={resolvedStatic}
	block={parsedBlock.raw}
	tokens={parsedBlock.tokens}
	parseIncompleteMarkdown={false}
	isIncomplete={parsedBlock.isIncomplete}
/>{/if}{/each}<Footnotes entries={footnoteEntries} /></div>

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
