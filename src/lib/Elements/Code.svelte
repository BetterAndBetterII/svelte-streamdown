<script lang="ts">
import { useStreamdown } from '$lib/context.svelte.js';
import { extractCodeFenceLanguage, getThemeName, type HighlightToken } from '$lib/plugins.js';
	import { STREAMDOWN_BLOCK_CONTEXT } from '$lib/incomplete-code.js';
import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { HighlighterManager, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import { parseCodeFenceInfo } from '$lib/utils/code-block.js';
	import { bundledLanguagesInfo } from '$lib/utils/bundledLanguages.js';
	import type { Tokens } from 'marked';
	import { getContext, untrack } from 'svelte';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';

	type RenderToken = HighlightToken;

	const {
		token,
		id,
		isIncomplete = false
	}: {
		token: Tokens.Code;
		id: string;
		isIncomplete?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	const block = getContext<{ isIncompleteCodeFence: boolean }>(STREAMDOWN_BLOCK_CONTEXT);
	const highlighter = HighlighterManager.create(
		bundledLanguagesInfo,
		streamdown.shikiThemes,
		streamdown.shikiLanguages
	);
	const codePlugin = $derived(streamdown.plugins?.code ?? null);
	const fence = $derived(parseCodeFenceInfo(token.lang));
	const language = $derived(
		extractCodeFenceLanguage(token) || fence.language || token.lang || 'text'
	);
	const pluginThemes = $derived(codePlugin?.getThemes() ?? null);
	const activeTheme = $derived(
		pluginThemes
			? typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
				? getThemeName(pluginThemes[1])
				: getThemeName(pluginThemes[0])
			: streamdown.shikiTheme
	);
	const showLineNumbers = $derived(streamdown.lineNumbers && fence.showLineNumbers);
	const incomplete = $derived(Boolean(isIncomplete || block?.isIncompleteCodeFence));
	const buttonDisabled = $derived(streamdown.isAnimating || incomplete);
	const showCodeActions = $derived(
		streamdown.controls.code && (streamdown.codeControls.copy || streamdown.codeControls.download)
	);
	const codeStyle = $derived(
		showLineNumbers && fence.startLine && fence.startLine > 1
			? `counter-reset: line ${fence.startLine - 1};`
			: undefined
	);
	let pluginTokens = $state<RenderToken[][] | null>(null);

	const copy = useCopy({
		get content() {
			return token.text;
		}
	});

	const downloadCode = () => {
		if (buttonDisabled) {
			return;
		}

		try {
			const extension =
				language && language in languageExtensionMap
					? languageExtensionMap[language as keyof typeof languageExtensionMap]
					: 'txt';
			const filename = `file.${extension}`;
			const mimeType = 'text/plain';
			save(filename, token.text, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};

	$effect(() => {
		const theme = activeTheme;
		const lang = language;
		if (codePlugin) {
			const result = codePlugin.highlight(
				{
					code: token.text,
					language: lang,
					themes: codePlugin.getThemes()
				},
				(asyncResult) => {
					pluginTokens = asyncResult.tokens;
				}
			);
			pluginTokens = result?.tokens ?? null;
			return;
		}

		untrack(() => {
			void highlighter.load(theme, lang);
		});
	});

	const renderedLines = $derived.by(() => {
		if (codePlugin) {
			return pluginTokens;
		}

		if (!highlighter.isReady(activeTheme, language)) {
			return null;
		}

		return highlighter.highlightCode(token.text, language, activeTheme);
	});
</script>

<div
	data-streamdown="code-block"
	data-language={language}
	data-streamdown-code={id}
	data-incomplete={incomplete ? 'true' : undefined}
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div data-streamdown="code-block-header" class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{language}</span>
		{#if showCodeActions}
			<div data-streamdown="code-block-actions" class={streamdown.theme.code.buttons}>
				{#if streamdown.codeControls.download}
					<button
						class={streamdown.theme.components.button}
						onclick={downloadCode}
						title={streamdown.translations.downloadFile}
						aria-label={streamdown.translations.downloadFile}
						disabled={buttonDisabled}
						type="button"
					>
						{@render (streamdown.icons?.download || downloadIcon)()}
					</button>
				{/if}

				{#if streamdown.codeControls.copy}
					<button
						class={streamdown.theme.components.button}
						onclick={() => {
							if (!buttonDisabled) {
								void copy.copy();
							}
						}}
						title={streamdown.translations.copyCode}
						aria-label={streamdown.translations.copyCode}
						disabled={buttonDisabled}
						type="button"
					>
						{#if copy.isCopied}
							{@render (streamdown.icons?.check || checkIcon)()}
						{:else}
							{@render (streamdown.icons?.copy || copyIcon)()}
						{/if}
					</button>
				{/if}
			</div>
		{/if}
	</div>
	<div
		data-streamdown="code-block-body"
		data-language={language}
		style="height: fit-content; width: 100%;"
		class={streamdown.theme.code.container}
	>
		{#if renderedLines}
			<pre class={streamdown.theme.code.pre}><code
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					style={codeStyle}
					class={showLineNumbers ? '[counter-increment:line_0] [counter-reset:line]' : undefined}
					>{@render Tokens(renderedLines)}</code
				></pre>
		{:else}
			<pre class={streamdown.theme.code.pre}><code
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					style={codeStyle}
					class={showLineNumbers ? '[counter-increment:line_0] [counter-reset:line]' : undefined}
					>{@render Skeleton(token.text.split('\n'))}</code
				></pre>
		{/if}
	</div>
</div>

{#snippet Tokens(lines: RenderToken[][])}
	{#each lines as tokens}
		<span
			class={`sd-code-line ${streamdown.theme.code.line} ${
				showLineNumbers
					? 'before:mr-4 before:inline-block before:w-6 before:text-right before:font-mono before:text-[13px] before:text-muted-foreground/50 before:content-[counter(line)] before:select-none before:[counter-increment:line]'
					: ''
			}`}
		>
			{#each tokens as token}
				<span
					style={streamdown.isMounted ? streamdown.animationTextStyle : ''}
					style:color={token.color}
					style:background-color={token.bgColor}
				>
					{token.content}
				</span>
			{/each}
		</span>
	{/each}
{/snippet}

{#snippet Skeleton(lines: string[])}
	{#each lines as line}
		<span
			class={`sd-code-line ${streamdown.theme.code.skeleton} ${
				showLineNumbers
					? 'before:mr-4 before:inline-block before:w-6 before:text-right before:font-mono before:text-[13px] before:text-muted-foreground/50 before:content-[counter(line)] before:select-none before:[counter-increment:line]'
					: ''
			}`}
		>
			{line.trim().length > 0 ? line : '\u200B'}
		</span>
	{/each}
{/snippet}
