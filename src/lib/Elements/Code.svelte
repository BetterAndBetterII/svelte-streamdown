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
	import { checkIcon, copyIcon, downloadIcon, resolveIcon } from './icons.js';

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
	const displayLanguage = $derived(
		extractCodeFenceLanguage(token) || fence.language || token.lang || ''
	);
	const language = $derived(
		extractCodeFenceLanguage(token) || fence.language || token.lang || 'text'
	);
	const pluginThemes = $derived(codePlugin?.getThemes() ?? null);
	const activeThemeName = $derived(streamdown.shikiTheme);
	const pluginActiveTheme = $derived.by(() => {
		if (!pluginThemes) {
			return null;
		}

		return pluginThemes.find((theme) => getThemeName(theme) === activeThemeName) ?? activeThemeName;
	});
	const showLineNumbers = $derived(streamdown.lineNumbers && fence.showLineNumbers);
	const incomplete = $derived(Boolean(block ? block.isIncompleteCodeFence : isIncomplete));
	const buttonDisabled = $derived(streamdown.isAnimating || incomplete);
	const showCodeActions = $derived(
		streamdown.controls.code && (streamdown.codeControls.copy || streamdown.codeControls.download)
	);
	const codeStyle = $derived(
		showLineNumbers && fence.startLine && fence.startLine > 1
			? `counter-reset: sd-line ${fence.startLine - 1};`
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
		const theme = activeThemeName;
		const lang = language;
		if (codePlugin) {
			const result = codePlugin.highlight(
				{
					code: token.text,
					language: lang,
					themes: codePlugin.getThemes(),
					activeTheme: pluginActiveTheme ?? undefined
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
		if (token.text.length === 0) {
			return null;
		}

		if (codePlugin) {
			return pluginTokens;
		}

		if (!highlighter.isReady(activeThemeName, language)) {
			return null;
		}

		return highlighter.highlightCode(token.text, language, activeThemeName);
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
		<span class={streamdown.theme.code.language}>{displayLanguage}</span>
	</div>
	{#if showCodeActions}
		<div data-streamdown="code-block-actions-shell" class={streamdown.theme.code.actions}>
			<div data-streamdown="code-block-actions" class={streamdown.theme.code.buttons}>
				{#if streamdown.codeControls.download}
					<button
						class={streamdown.theme.components.button}
						onclick={downloadCode}
						title={streamdown.translations.downloadFile}
						disabled={buttonDisabled}
						type="button"
					>
						{@render resolveIcon(streamdown.icons, 'download', downloadIcon)()}
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
						disabled={buttonDisabled}
						type="button"
					>
						{#if copy.isCopied}
							{@render resolveIcon(streamdown.icons, 'check', checkIcon)()}
						{:else}
							{@render resolveIcon(streamdown.icons, 'copy', copyIcon)()}
						{/if}
					</button>
				{/if}
			</div>
		</div>
	{/if}
	<div
		data-streamdown="code-block-body"
		data-language={language}
		style="height: fit-content; width: 100%;"
		class={streamdown.theme.code.container}
	>
		{#if renderedLines}
			<pre class={streamdown.theme.code.pre}><code
					class="block"
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					style={codeStyle}>{@render Tokens(renderedLines)}</code
				></pre>
		{:else}
			<pre class={streamdown.theme.code.pre}><code
					class="block"
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					style={codeStyle}>{@render Skeleton(token.text.split('\n'))}</code
				></pre>
		{/if}
	</div>
</div>

{#snippet Tokens(lines: RenderToken[][])}
	{#each lines as tokens}
		<span class={`sd-code-line ${streamdown.theme.code.line}`}>
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
	{#if lines.length === 1 && lines[0]?.length === 0}
		{'\n'}
	{:else}
		{#each lines as line}
			<span class={`sd-code-line ${streamdown.theme.code.skeleton}`}>
				{line.length > 0 ? line : '\n'}
			</span>
		{/each}
	{/if}
{/snippet}
