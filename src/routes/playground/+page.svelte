<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	import { cjk, code, math, mermaid } from '$lib/index.js';
	import type { AnimateOptions } from '$lib/context.svelte.js';
	import type { CustomRenderer } from '$lib/plugins.js';
	import { onDestroy } from 'svelte';
	import { defaultMarkdown } from './default-markdown.js';
	import VegaLiteRenderer from './VegaLiteRenderer.svelte';

	const renderers: CustomRenderer[] = [{ language: ['vega-lite', 'vega'], component: VegaLiteRenderer }];
	const animationOptions = ['fadeIn', 'blurIn', 'slideUp'] as const;
	const easingOptions = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'] as const;
	const sepOptions = ['word', 'char'] as const;
	const caretOptions = ['block', 'circle', 'none'] as const;

	let markdown = $state(defaultMarkdown);
	let markdownOutput = $state(defaultMarkdown);
	let mode = $state<'static' | 'streaming'>('static');
	let isStreaming = $state(false);
	let animated = $state(false);
	let animation = $state<(typeof animationOptions)[number]>('fadeIn');
	let animationDuration = $state(150);
	let animationEasing = $state<(typeof easingOptions)[number]>('ease');
	let animationSep = $state<(typeof sepOptions)[number]>('word');
	let caret = $state<(typeof caretOptions)[number]>('block');
	let streamSpeed = $state(30);
	let showSettings = $state(false);

	let streamTimer: ReturnType<typeof setInterval> | null = null;
	let streamIndex = 0;

	const tokens = $derived(markdown.split(' ').map((token) => `${token} `));
	const animatedOptions = $derived.by((): false | AnimateOptions => {
		if (!animated) {
			return false;
		}

		return {
			animation,
			duration: animationDuration,
			easing: animationEasing,
			sep: animationSep
		};
	});

	function stopStreaming() {
		if (streamTimer) {
			clearInterval(streamTimer);
			streamTimer = null;
		}

		isStreaming = false;
	}

	function simulateStreaming() {
		stopStreaming();
		markdownOutput = '';
		mode = 'streaming';
		streamIndex = 0;
		isStreaming = true;

		let currentContent = '';
		streamTimer = setInterval(() => {
			if (streamIndex >= tokens.length) {
				stopStreaming();
				return;
			}

			currentContent += tokens[streamIndex] ?? '';
			streamIndex += 1;
			markdownOutput = currentContent;
		}, streamSpeed);
	}

	function clearMarkdown() {
		stopStreaming();
		markdown = '';
		markdownOutput = '';
	}

	function currentContent() {
		return isStreaming ? markdownOutput : markdown;
	}

	onDestroy(() => {
		stopStreaming();
	});
</script>

<svelte:head>
	<title>Streamdown Playground</title>
	<meta
		name="description"
		content="Try Streamdown in your browser. Edit markdown and see rendered output in real-time."
	/>
</svelte:head>

<div class="flex h-[100dvh] flex-col overflow-hidden bg-background">
	<header class="relative flex shrink-0 items-center justify-between border-b border-border p-2">
		<h1 class="px-2 font-semibold text-lg tracking-tight">Streamdown Playground</h1>

		<div class="flex items-center gap-2">
			<select
				class="h-8 rounded-md border border-input bg-background px-3 text-sm"
				bind:value={mode}
				disabled={isStreaming}
			>
				<option value="static">Static</option>
				<option value="streaming">Streaming</option>
			</select>

			<button
				class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
				type="button"
				aria-label="Settings"
				aria-expanded={showSettings}
				onclick={() => {
					showSettings = !showSettings;
				}}
			>
				Settings
			</button>

			<button
				class={`inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium text-primary-foreground ${
					isStreaming ? 'bg-destructive hover:opacity-90' : 'bg-primary hover:opacity-90'
				}`}
				type="button"
				onclick={isStreaming ? stopStreaming : simulateStreaming}
			>
				{isStreaming ? 'Stop' : 'Simulate Stream'}
			</button>

			<button
				class="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
				type="button"
				onclick={clearMarkdown}
			>
				Clear
			</button>
		</div>

		{#if showSettings}
			<div
				class="absolute top-[calc(100%-0.25rem)] right-2 z-20 grid w-80 gap-4 rounded-xl border border-border bg-popover p-4 shadow-xl"
			>
				<div class="grid gap-3">
					<p class="font-medium text-sm">Rendering</p>

						<label class="flex items-center justify-between gap-3">
							<span class="text-sm text-muted-foreground">Animated</span>
							<input
								class="h-4 w-4 accent-foreground"
								type="checkbox"
								bind:checked={animated}
							/>
						</label>

					{#if animated}
						<label class="flex items-center justify-between gap-3">
							<span class="text-sm text-muted-foreground">Effect</span>
							<select
								class="h-8 rounded-md border border-input bg-background px-2 text-sm"
								bind:value={animation}
							>
								{#each animationOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</label>

						<label class="flex items-center justify-between gap-3">
							<span class="text-sm text-muted-foreground">Duration (ms)</span>
							<input
								class="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
								type="number"
								min="1"
								max="2000"
								bind:value={animationDuration}
							/>
						</label>

						<label class="flex items-center justify-between gap-3">
							<span class="text-sm text-muted-foreground">Easing</span>
							<select
								class="h-8 rounded-md border border-input bg-background px-2 text-sm"
								bind:value={animationEasing}
							>
								{#each easingOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</label>

						<label class="flex items-center justify-between gap-3">
							<span class="text-sm text-muted-foreground">Split by</span>
							<select
								class="h-8 rounded-md border border-input bg-background px-2 text-sm"
								bind:value={animationSep}
							>
								{#each sepOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</label>
					{/if}

					<label class="flex items-center justify-between gap-3">
						<span class="text-sm text-muted-foreground">Caret</span>
						<select class="h-8 rounded-md border border-input bg-background px-2 text-sm" bind:value={caret}>
							<option value="block">Block ▋</option>
							<option value="circle">Circle ●</option>
							<option value="none">None</option>
						</select>
					</label>
				</div>

				<div class="grid gap-3">
					<p class="font-medium text-sm">Streaming</p>
					<label class="flex items-center justify-between gap-3">
						<span class="text-sm text-muted-foreground">Speed (ms)</span>
						<input
							class="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm"
							type="number"
							min="1"
							max="500"
							bind:value={streamSpeed}
						/>
					</label>
				</div>
			</div>
		{/if}
	</header>

	<div class="flex min-h-0 flex-1 flex-col md:flex-row">
		<section class="flex min-h-0 flex-1 flex-col border-b border-border md:w-1/2 md:border-r md:border-b-0">
			<div class="flex shrink-0 items-center border-b border-border bg-muted/50 px-4 py-2">
				<span class="font-medium text-xs uppercase tracking-[0.18em] text-muted-foreground">
					Markdown Input
				</span>
			</div>

			<div class="min-h-0 flex-1 bg-background">
				<textarea
					class="h-full min-h-[42vh] w-full resize-none border-0 bg-background px-4 py-4 font-mono text-sm leading-relaxed outline-none"
					bind:value={markdown}
					spellcheck="false"
					placeholder="Type your markdown here..."
				></textarea>
			</div>
		</section>

		<section class="flex min-h-0 flex-1 flex-col md:w-1/2">
			<div class="flex shrink-0 items-center border-b border-border bg-muted/50 px-4 py-2">
				<span class="font-medium text-xs uppercase tracking-[0.18em] text-muted-foreground">
					Streamdown Output
				</span>
			</div>

			<div class="min-h-0 flex-1 overflow-auto bg-background px-4 py-5">
				<div class="mx-auto w-full max-w-4xl">
					<Streamdown
						content={currentContent()}
						mode={mode}
						isAnimating={isStreaming}
						animated={animatedOptions}
						caret={caret === 'none' ? undefined : caret}
						plugins={{ code, mermaid, math, cjk, renderers }}
					/>
				</div>
			</div>
		</section>
	</div>
</div>
