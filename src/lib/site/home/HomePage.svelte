<script lang="ts">
	import { onDestroy } from 'svelte';
	import Streamdown from '$lib/Streamdown.svelte';
	import { code } from '$lib/plugins.js';
	import HomeDemo from './HomeDemo.svelte';
	import SiteHeader from '$lib/site/SiteHeader.svelte';
	import {
		benchmarkSummary,
		featureCards,
		heroDescription,
		heroTitle,
		installCommand,
		usageFilePath,
		usageCode,
		usageMarkdown
	} from './content.js';

	type CopyTarget = 'install' | 'usage';

	let copiedTarget = $state<CopyTarget | null>(null);
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	function resetTimer(timer: ReturnType<typeof setTimeout> | null) {
		if (timer) {
			clearTimeout(timer);
		}
	}

	async function copyText(text: string, target: CopyTarget) {
		await navigator.clipboard.writeText(text);
		copiedTarget = target;
		resetTimer(copyTimer);
		copyTimer = setTimeout(() => {
			copiedTarget = null;
		}, 2000);
	}

	onDestroy(() => {
		resetTimer(copyTimer);
	});
</script>

<svelte:head>
	<title>Streamdown-Svelte</title>
	<meta
		name="description"
		content="Streamdown-Svelte is a markdown renderer designed for streaming content from AI models. Highly interactive, customizable, and easy to use."
	/>
</svelte:head>

<div class="min-h-dvh bg-sidebar pb-32 dark:bg-background">
	<SiteHeader />

	<div class="mx-auto w-full max-w-5xl">
		<section class="space-y-6 px-4 pt-16 pb-16 text-center sm:pt-24">
			<div class="mx-auto w-full max-w-4xl space-y-5">
				<h1
					class="text-center text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl"
				>
					{heroTitle}
				</h1>
				<p
					class="mx-auto max-w-xl text-lg leading-relaxed text-balance text-muted-foreground sm:text-xl"
				>
					{heroDescription}
				</p>
			</div>

			<div class="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:justify-center">
				<div
					class="inline-flex min-w-0 items-center overflow-hidden rounded-md border border-border bg-background text-left shadow-sm sm:flex-[0_1_24rem]"
				>
					<span class="border-r border-border px-3 py-3 font-mono text-sm text-muted-foreground"
						>$</span
					>
					<input
						class="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm outline-none sm:min-w-[12rem] md:min-w-[12rem]"
						readonly
						value={installCommand}
					/>
					<button
						class="border-l border-border px-3 py-3 text-sm font-medium transition-colors hover:bg-accent"
						type="button"
						onclick={() => copyText(installCommand, 'install')}
					>
						{copiedTarget === 'install' ? 'Copied' : 'Copy'}
					</button>
				</div>

				<a
					class="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
					href="/playground"
				>
					Open playground
				</a>
			</div>
		</section>

		<div class="grid divide-y border-y border-border bg-background sm:border-x">
			<section
				id="demo"
				class="grid items-center gap-10 overflow-hidden px-4 py-8 sm:px-12 sm:py-12"
			>
				<div class="mx-auto grid max-w-2xl gap-4 text-center">
					<h2 class="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-[40px]">
						A fully-loaded Markdown renderer
					</h2>
					<p class="text-lg text-balance text-muted-foreground">
						Built-in typography, streaming carets, animations, plugins, and more.
					</p>
				</div>

				<HomeDemo />
			</section>

			<section
				id="features"
				class="grid scroll-mt-24 gap-8 px-4 py-8 sm:grid-cols-2 sm:px-12 sm:py-12 md:grid-cols-3"
			>
				{#each featureCards as card}
					<div>
						<h3 class="mb-2 text-lg font-semibold tracking-tight">{card.title}</h3>
						<p
							class="text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:decoration-foreground/60"
						>
							{@html card.description}
						</p>
					</div>
				{/each}
			</section>

			<section
				id="plugins"
				class="grid scroll-mt-24 gap-12 p-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:p-0"
			>
				<div class="flex flex-col gap-2 text-balance sm:p-12">
					<h2 class="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
						Get started in seconds
					</h2>
					<p class="mt-2 text-lg text-balance text-muted-foreground">
						Install only what you need. Plugins are optional and tree-shakeable for minimal bundle
						size.
					</p>
				</div>

				<div class="sm:col-span-2 sm:p-12">
					<div
						class="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_20px_70px_-40px_rgba(15,23,42,0.45)]"
					>
						<div
							class="flex items-center gap-3 border-b border-border bg-sidebar/80 px-4 py-3 text-muted-foreground supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur"
						>
							<img alt="Svelte" class="size-5 shrink-0" src="/svelte-favicon.png" />
							<span
								class="min-w-0 flex-1 truncate font-mono text-sm tracking-tight text-foreground"
							>
								{usageFilePath}
							</span>
							<button
								class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
								type="button"
								onclick={() => copyText(usageCode, 'usage')}
							>
								{copiedTarget === 'usage' ? 'Copied' : 'Copy'}
							</button>
						</div>
						<div class="usage-preview bg-background">
							<Streamdown
								content={usageMarkdown}
								baseTheme="shadcn"
								plugins={{ code }}
								controls={{ code: false }}
							/>
						</div>
					</div>
				</div>
			</section>

			<section class="grid gap-8 px-4 py-8 sm:px-12 sm:py-12">
				<div class="grid gap-3 text-balance">
					<h2 class="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-[40px]">
						{benchmarkSummary.title}
					</h2>
					<p class="max-w-3xl text-lg text-balance text-muted-foreground">
						{benchmarkSummary.description}
					</p>
					<p class="text-sm text-muted-foreground">
						Snapshot from {benchmarkSummary.reportDate} on {benchmarkSummary.platform}.
					</p>
				</div>

				<div class="grid gap-4 md:grid-cols-3">
					{#each benchmarkSummary.highlights as item}
						<div class="rounded-2xl border border-border bg-background p-5 shadow-sm">
							<p class="text-sm font-medium text-muted-foreground">{item.label}</p>
							<p class="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
							<p class="mt-2 text-sm text-muted-foreground">{item.detail}</p>
						</div>
					{/each}
				</div>

				<div class="flex items-center justify-center rounded-2xl bg-sidebar/20 px-4 py-6">
					<img
						alt="Benchmark comparison by scenario"
						class="mx-auto block w-full max-w-6xl"
						src={benchmarkSummary.chart}
					/>
				</div>

				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{#each benchmarkSummary.suites as suite}
						<div class="rounded-xl border border-border bg-background p-4">
							<p class="text-sm font-medium text-muted-foreground">{suite.name}</p>
							<p class="mt-2 text-2xl font-semibold tracking-tight">{suite.delta}</p>
							<p class="mt-2 text-sm text-muted-foreground">{suite.record}</p>
						</div>
					{/each}
				</div>
			</section>

			<section
				class="flex flex-col gap-4 px-8 py-10 md:flex-row md:items-center md:justify-between"
			>
				<h2 class="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-[40px]">
					Upgrade your AI experiences
				</h2>
				<div class="flex flex-wrap gap-3">
					<a
						class="inline-flex items-center justify-center rounded-md bg-[#ff3e00] px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#e43700]"
						href="/playground"
					>
						Open playground
					</a>
					<a
						class="inline-flex items-center justify-center rounded-md border border-[#ff3e00]/30 bg-[#ff3e00]/8 px-4 py-3 text-sm font-medium text-[#ff3e00] transition-colors hover:bg-[#ff3e00]/14 dark:border-[#ff6b3d]/30 dark:bg-[#ff6b3d]/10 dark:text-[#ff8a66] dark:hover:bg-[#ff6b3d]/16"
						href="https://github.com/PacificStudio/streamdown-svelte"
						target="_blank"
						rel="noreferrer"
					>
						Browse the repo
					</a>
				</div>
			</section>
		</div>
	</div>
</div>

<style>
	.usage-preview :global(.streamdown) {
		max-width: none;
	}

	.usage-preview :global([data-streamdown='code-block']) {
		margin: 0;
		gap: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		padding: 0;
	}

	.usage-preview :global([data-streamdown='code-block-header']) {
		display: none;
	}

	.usage-preview :global([data-streamdown='code-block-body']) {
		border: 0;
		border-radius: 0;
		background: transparent;
		padding: 1.25rem;
	}

	.usage-preview :global(pre) {
		margin: 0;
		border-radius: 0;
		background: transparent;
	}
</style>
