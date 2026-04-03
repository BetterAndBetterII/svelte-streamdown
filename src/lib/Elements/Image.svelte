<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { isPathRelativeUrl, transformUrl } from '$lib/utils/url.js';
	import Slot from './Slot.svelte';
	import type { Tokens } from 'marked';
	import type { Snippet } from 'svelte';

	const streamdown = useStreamdown();

	const {
		children,
		token,
		id
	}: {
		children: Snippet;
		token: Tokens.Image;
		id: string;
	} = $props();

	const isRelativeUrl = $derived(isPathRelativeUrl(token.href));

	const transformedUrl = $derived(
		transformUrl(token.href, streamdown.allowedImagePrefixes ?? [], streamdown.defaultOrigin, {
			kind: 'image'
		})
	);

	let isLoaded = $state(false);
	let hasError = $state(false);

	function getImageSource(): string | null {
		if (token.href === 'streamdown:incomplete-image') {
			return null;
		}

		if (isRelativeUrl) {
			return token.href;
		}

		return transformedUrl ?? null;
	}

	function getExtensionFromBlob(blob: Blob): string {
		const type = blob.type.toLowerCase();
		if (type === 'image/svg+xml') return 'svg';
		if (type === 'image/jpeg') return 'jpg';
		if (type === 'image/gif') return 'gif';
		if (type === 'image/webp') return 'webp';
		return 'png';
	}

	function getFilename(source: string, blob: Blob): string {
		const cleanUrl = source.split('#')[0].split('?')[0];
		const lastSegment = cleanUrl.split('/').filter(Boolean).at(-1);
		if (lastSegment && /\.[a-z0-9]+$/i.test(lastSegment)) {
			return lastSegment;
		}

		const baseName = token.text?.trim() || 'image';
		return `${baseName}.${getExtensionFromBlob(blob)}`;
	}

	async function downloadImage(): Promise<void> {
		const source = getImageSource();
		if (!source) {
			return;
		}

		const response = await fetch(source);
		const blob = await response.blob();
		save(getFilename(source, blob), blob, blob.type || 'application/octet-stream');
	}
</script>

{#if token.href !== 'streamdown:incomplete-image'}
	{#if transformedUrl || isRelativeUrl}
		<Slot
			props={{
				src: isRelativeUrl ? token.href : transformedUrl,
				alt: token.text,
				children,
				token
			}}
			render={streamdown.snippets.image}
		>
			<span
				data-streamdown-image={id}
				style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
				class={streamdown.theme.image.base}
			>
				{#if hasError}
					<span data-streamdown-image-fallback={id}>
						{streamdown.translations.imageNotAvailable}
					</span>
				{:else}
					<img
						class={streamdown.theme.image.image}
						src={isRelativeUrl ? token.href : transformedUrl}
						alt={token.text}
						onload={() => {
							isLoaded = true;
							hasError = false;
						}}
						onerror={() => {
							hasError = true;
							isLoaded = false;
						}}
					/>
				{/if}
				{#if isLoaded && !hasError}
					<button
						class={streamdown.theme.components.button}
						type="button"
						title={streamdown.translations.downloadImage}
						aria-label={streamdown.translations.downloadImage}
						onclick={downloadImage}
					>
						{streamdown.translations.downloadImage}
					</button>
				{/if}
			</span>
		</Slot>
	{:else}
		<span
			data-streamdown-image-blocked={id}
			class="inline-block rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400"
			title={`Blocked URL: ${token.href}`}
		>
			[Image blocked: {token.text || 'No description'}]
		</span>
	{/if}
{/if}
