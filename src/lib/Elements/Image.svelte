<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { applyMarkdownUrlTransform, createMarkdownElement } from '$lib/markdown.js';
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

	const imageSource = $derived.by(() => {
		if (token.href === 'streamdown:incomplete-image') {
			return null;
		}

		const transformedHref = applyMarkdownUrlTransform(
			token.href,
			'src',
			createMarkdownElement('img', {
				alt: token.text,
				src: token.href,
				title: token.title ?? undefined
			}),
			streamdown.urlTransform
		);

		if (typeof transformedHref !== 'string' || transformedHref.length === 0) {
			return null;
		}

		if (isPathRelativeUrl(transformedHref)) {
			return transformedHref;
		}

		return (
			transformUrl(
				transformedHref,
				streamdown.allowedImagePrefixes ?? [],
				streamdown.defaultOrigin,
				{
					kind: 'image'
				}
			) ?? null
		);
	});

	let isLoaded = $state(false);
	let hasError = $state(false);
	let imageElement = $state<HTMLImageElement | null>(null);

	function getImageSource(): string | null {
		return imageSource;
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

	function handleLoad(): void {
		isLoaded = true;
		hasError = false;
	}

	function handleError(): void {
		hasError = true;
		isLoaded = false;
	}

	$effect(() => {
		const source = getImageSource();
		if (!imageElement || !source) {
			return;
		}

		if (!imageElement.complete) {
			return;
		}

		if (imageElement.naturalWidth > 0) {
			handleLoad();
			return;
		}

		handleError();
	});
</script>

{#if token.href !== 'streamdown:incomplete-image'}
	{#if imageSource}
		<Slot
			props={{
				src: imageSource,
				alt: token.text,
				class: streamdown.theme.image.image,
				onload: handleLoad,
				onerror: handleError,
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
					<Slot
						props={{
							src: imageSource,
							alt: token.text,
							class: streamdown.theme.image.image,
							onload: handleLoad,
							onerror: handleError,
							children,
							token
						}}
						component={streamdown.components?.img}
					>
						<img
							bind:this={imageElement}
							class={streamdown.theme.image.image}
							src={imageSource}
							alt={token.text}
							onload={handleLoad}
							onerror={handleError}
						/>
					</Slot>
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
		<p>
			<span
				data-streamdown-image-blocked={id}
				class="inline-block rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400"
			>
				[Image blocked: {token.text || 'No description'}]
			</span>
		</p>
	{/if}
{/if}
