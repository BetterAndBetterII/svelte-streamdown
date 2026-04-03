<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import {
		extractCodeFenceLanguage,
		getThemeName,
		type HighlightToken
	} from '$lib/plugins.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { HighlighterManager, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import { bundledLanguagesInfo } from '$lib/utils/bundledLanguages.js';
	import type { Tokens } from 'marked';
	import { untrack } from 'svelte';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';

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
	const highlighter = HighlighterManager.create(
		bundledLanguagesInfo,
		streamdown.shikiThemes,
		streamdown.shikiLanguages
	);
	const codePlugin = $derived(streamdown.plugins?.code ?? null);
	const language = $derived(extractCodeFenceLanguage(token) || token.lang || 'text');
	const pluginThemes = $derived(codePlugin?.getThemes() ?? null);
	const activeTheme = $derived(
		pluginThemes
			? (typeof window !== 'undefined' &&
				window.matchMedia?.('(prefers-color-scheme: dark)').matches
					? getThemeName(pluginThemes[1])
					: getThemeName(pluginThemes[0]))
			: streamdown.shikiTheme
	);
	let pluginTokens = $state<HighlightToken[][] | null>(null);

	const copy = useCopy({
		get content() {
			return token.text;
		}
	});

	// Download button functionality

	const downloadCode = () => {
		try {
			const extension =
				token.lang && token.lang in languageExtensionMap
					? languageExtensionMap[token.lang as keyof typeof languageExtensionMap]
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

	const showLineNumbers = $derived(streamdown.lineNumbers !== false);
	const renderedLines = $derived.by(() => {
		if (codePlugin) {
			return pluginTokens;
		}

		if (!highlighter.isReady(activeTheme, token.lang)) {
			return null;
		}

		return highlighter.highlightCode(token.text, language, activeTheme);
	});
</script>

<div
	data-streamdown-code={id}
	data-incomplete={isIncomplete || undefined}
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{language}</span>
		{#if streamdown.controls.code}
			<div class={streamdown.theme.code.buttons}>
				<button
					class={streamdown.theme.components.button}
					onclick={downloadCode}
					title={streamdown.translations.downloadFile}
					aria-label={streamdown.translations.downloadFile}
					type="button"
				>
					{@render (streamdown.icons?.download || downloadIcon)()}
				</button>

				<button
					class={streamdown.theme.components.button}
					onclick={copy.copy}
					title={streamdown.translations.copyCode}
					aria-label={streamdown.translations.copyCode}
					type="button"
				>
					{#if copy.isCopied}
						{@render (streamdown.icons?.check || checkIcon)()}
					{:else}
						{@render (streamdown.icons?.copy || copyIcon)()}
					{/if}
				</button>
			</div>
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		{#if renderedLines}
			<pre class={streamdown.theme.code.pre}><code
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					>{@render Tokens(renderedLines)}</code
				></pre>
		{:else}
			<pre class={streamdown.theme.code.pre}><code
					class:sd-line-numbers={showLineNumbers}
					data-streamdown-line-numbers={showLineNumbers}
					>{@render Skeleton(token.text.split('\n'))}</code
				></pre>
		{/if}
	</div>
</div>

{#snippet Tokens(lines: HighlightToken[][])}
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
	{#each lines as line}
		<span class={`sd-code-line ${streamdown.theme.code.skeleton}`}>
			{line.trim().length > 0 ? line : '\u200B'}
		</span>
	{/each}
{/snippet}
