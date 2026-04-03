<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import {
		normalizeMermaidControls,
		StreamdownContext,
		type StreamdownProps
	} from './context.svelte.js';
	import { getThemeName } from './plugins.js';
	import { createCn, mergeTheme, prefixThemeClasses, shadcnTheme } from './theme.js';
	import { parseBlocks } from './marked/index.js';
	import { parseIncompleteMarkdown as repairIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { preprocessCustomTags } from './security/preprocess-custom-tags.js';
	import { preprocessLiteralTagContent } from './security/preprocess-literal-tag-content.js';
	import { carets, hasIncompleteCodeFence, hasTable } from './streaming.js';
	import { mergeTranslations } from './translations.js';
	import { useDarkMode } from '$lib/utils/darkMode.svelte.js';

	const animationNameMap = {
		blurIn: 'blur',
		fadeIn: 'fade',
		slideUp: 'slideUp'
	} as const;
	type LocalAnimationConfig = NonNullable<StreamdownProps['animation']>;
	type AnimationTimingFunction = NonNullable<LocalAnimationConfig['timingFunction']>;
	const supportedTimingFunctions = new Set<AnimationTimingFunction>([
		'ease',
		'ease-in',
		'ease-out',
		'ease-in-out',
		'linear'
	]);

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
				tokenize: 'word' as const
			};
		}

		const animationName =
			animationNameMap[animated.animation as keyof typeof animationNameMap] ?? 'fade';
		const timingFunction = supportedTimingFunctions.has(animated.easing as AnimationTimingFunction)
			? (animated.easing as AnimationTimingFunction)
			: 'ease';

		return {
			enabled: true,
			animateOnMount: true,
			type: animationName,
			duration: animated.duration ?? 150,
			timingFunction,
			tokenize: animated.sep ?? 'word'
		} as const;
	};

	let {
		content = '',
		class: className,
		className: futureClassName,
		shikiTheme,
		shikiLanguages,
		shikiThemes,
		plugins,
		parseIncompleteMarkdown = true,
		parseMarkdownIntoBlocksFn,
		mode = 'streaming',
		dir,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		linkSafety = { enabled: true },
		allowedTags,
		literalTagContent,
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
		controls,
		isAnimating = false,
		animated,
		caret,
		onAnimationStart,
		onAnimationEnd,
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
				duration: animation.duration || 500,
				timingFunction: animation.timingFunction || 'ease-in',
				tokenize: animation.tokenize || 'word'
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

	const shikiThemedTheme = $derived(
		shikiThemes
			? Object.keys(shikiThemes)[0] || 'github-light'
			: darkMode.current
				? 'github-dark'
				: 'github-light'
	);

	const mermaidThemedTheme = $derived(
		mermaidConfig?.theme ? mermaidConfig.theme : darkMode.current ? 'dark' : 'default'
	);

	const allowedTagNames = $derived(allowedTags ? Object.keys(allowedTags) : []);

	const preprocessedContent = $derived.by(() => {
		let result = content;

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
		get literalTagContent() {
			return literalTagContent;
		},
		get prefix() {
			return prefix;
		},
		get lineNumbers() {
			return lineNumbers;
		},
		get shikiTheme() {
			if (shikiTheme) {
				return shikiTheme;
			}

			if (plugins?.code) {
				const [lightTheme, darkTheme] = plugins.code.getThemes();
				return darkMode.current ? getThemeName(darkTheme) : getThemeName(lightTheme);
			}

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
				...mermaidConfig
			};
		},
		get katexConfig() {
			return katexConfig;
		},
		get plugins() {
			return plugins;
		},
		get renderHtml() {
			return renderHtml;
		},
		get translations() {
			return mergeTranslations(translations);
		},
		get shikiLanguages() {
			return shikiLanguages;
		},
		get shikiThemes() {
			if (!plugins?.code) {
				return shikiThemes;
			}

			const [lightTheme, darkTheme] = plugins.code.getThemes();
			const pluginThemes = [lightTheme, darkTheme].filter(
				(theme): theme is Exclude<typeof theme, string> => typeof theme !== 'string'
			);

			if (pluginThemes.length === 0) {
				return shikiThemes;
			}

			return {
				...(shikiThemes ?? {}),
				...Object.fromEntries(pluginThemes.map((theme) => [theme.name ?? 'custom-theme', theme]))
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
			const codeControls = controls?.code ?? true;
			const tableControls = controls?.table ?? true;
			return {
				code: codeControls,
				mermaid: normalizeMermaidControls(controls?.mermaid),
				table: tableControls
			};
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

	const splitBlocks = $derived(
		parseMarkdownIntoBlocksFn ??
			((markdown: string) => parseBlocks(markdown, streamdown.extensions))
	);
	const rawBlocks = $derived(
		resolvedStatic ? [preprocessedContent] : splitBlocks(preprocessedContent)
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
	const blocks = $derived.by(() => {
		if (resolvedStatic) {
			return [preprocessedContent];
		}

		return rawBlocks.map((block, index) => {
			if (!parseIncompleteMarkdown || blockIsIncomplete[index]) {
				return block;
			}

			return repairIncompleteMarkdown(block);
		});
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
</script>

<div bind:this={element} class={rootClassName} style={rootStyle}>
	{#if resolvedStatic}
		<Block static={resolvedStatic} block={preprocessedContent} parseIncompleteMarkdown={false} />
	{:else}
		{#if shouldShowCaret && !shouldHideCaret && blocks.length === 0}
			<span aria-hidden="true" data-streamdown-caret-placeholder></span>
		{/if}
		{#each blocks as block, index (`${id}-block-${index}`)}
			<Block
				static={resolvedStatic}
				{block}
				parseIncompleteMarkdown={false}
				isIncomplete={blockIsIncomplete[index]}
			/>
		{/each}
	{/if}
	{#if shouldShowCaret && !shouldHideCaret && !content.trim()}
		<span aria-hidden="true" data-streamdown-caret-placeholder></span>
	{/if}
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
