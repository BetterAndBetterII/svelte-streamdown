<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import { StreamdownContext, type StreamdownProps } from './context.svelte.js';
	import { mergeTheme, shadcnTheme } from './theme.js';
	import {
		lexWithFootnotes,
		parseBlocksWithFootnotes,
		type FootnoteState,
		type StreamdownToken
	} from './marked/index.js';
	import { preprocessCustomTags } from './security/preprocess-custom-tags.js';
	import { preprocessLiteralTagContent } from './security/preprocess-literal-tag-content.js';
	import { mergeTranslations } from './translations.js';
	import { parseIncompleteMarkdown as completeIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Footnotes from './Elements/Footnotes.svelte';
	import type { Footnote, FootnoteRef } from './marked/marked-footnotes.js';

	let {
		content = '',
		class: className,
		shikiTheme,
		shikiLanguages,
		shikiThemes,
		parseIncompleteMarkdown,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		allowedTags,
		literalTagContent,
		theme,
		mermaidConfig = {},
		katexConfig,
		translations,
		baseTheme,
		mergeTheme: shouldMergeTheme = true,
		streamdown = $bindable(),
		renderHtml,
		controls,
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
	import { useDarkMode } from '$lib/utils/darkMode.svelte.js';

	const darkMode = useDarkMode();

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
		get defaultOrigin() {
			return defaultOrigin;
		},
		get allowedLinkPrefixes() {
			return allowedLinkPrefixes;
		},
		get allowedImagePrefixes() {
			return allowedImagePrefixes;
		},
		get allowedTags() {
			return allowedTags;
		},
		get literalTagContent() {
			return literalTagContent;
		},
		get shikiTheme() {
			return shikiTheme || shikiThemedTheme;
		},
		get snippets() {
			return snippets;
		},
		get theme() {
			return shouldMergeTheme
				? mergeTheme(theme, baseTheme)
				: theme || (baseTheme === 'shadcn' ? shadcnTheme : theme);
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
			return shikiThemes;
		},
		get sources() {
			return sources;
		},
		get inlineCitationsMode() {
			return inlineCitationsMode;
		},
		get animation() {
			if (!animation?.enabled)
				return {
					enabled: false
				};
			return {
				enabled: true,
				animateOnMount: animation.animateOnMount ?? false,
				type: animation.type || 'blur',
				duration: animation.duration || 500,
				timingFunction: animation.timingFunction || 'ease-in',
				tokenize: animation.tokenize || 'word'
			};
		},
		get controls() {
			const codeControls = controls?.code ?? true;
			const mermaidControls = controls?.mermaid ?? true;
			const tableControls = controls?.table ?? true;
			return {
				code: codeControls,
				mermaid: mermaidControls,
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

	type ParsedBlock = {
		raw: string;
		tokens: StreamdownToken[];
		footnotes: FootnoteState;
	};

	const parsedDocument = $derived.by(() => {
		if (isStatic) {
			const parsed = lexWithFootnotes(preprocessedContent, streamdown.extensions);
			return {
				blocks: [preprocessedContent],
				footnotes: parsed.footnotes
			};
		}

		return parseBlocksWithFootnotes(preprocessedContent, streamdown.extensions);
	});

	const parsedBlocks = $derived.by(() => {
		const rawBlocks = parsedDocument.blocks;

		return rawBlocks.map((raw) => {
			const parsed = lexWithFootnotes(
				isStatic ? raw : completeIncompleteMarkdown(raw.trim()),
				streamdown.extensions
			);

			return {
				raw,
				tokens: parsed.tokens,
				footnotes: parsed.footnotes
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
				tokens: content.length === 0 ? [] : lexWithFootnotes(content, streamdown.extensions).tokens
			};
		}) satisfies Footnote[];
	});

	$effect(() => {
		streamdown.footnotes.refs = new Map(footnoteState.refs);
		streamdown.footnotes.footnotes = new Map(footnoteState.footnotes);
	});
</script>

<div bind:this={element} class={className}>
	{#each parsedBlocks as parsedBlock, index (`${id}-block-${index}`)}
		<Block static={isStatic} block={parsedBlock.raw} tokens={parsedBlock.tokens} />
	{/each}
	<Footnotes entries={footnoteEntries} />
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
	}
</style>
