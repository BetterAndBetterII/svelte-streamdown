<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { useTheme } from 'svelte-themes';
	import { REPO_URL } from './metadata.js';
	import { siteNavItems } from './navigation.js';

	type Props = {
		fullWidth?: boolean;
	};

	let { fullWidth = false }: Props = $props();

	const theme = useTheme();
	let currentHash = $state('');

	const containerClass = $derived(
		fullWidth
			? 'mx-auto flex h-[4.35rem] w-full items-center gap-4 px-4 md:px-6 xl:px-8'
			: 'mx-auto flex h-[4.35rem] w-full items-center gap-4 px-4 md:px-6 xl:px-8'
	);

	function syncHash() {
		if (typeof window === 'undefined') {
			return;
		}

		currentHash = window.location.hash;
	}

	function isActive(href: string) {
		return siteNavItems.find((item) => item.href === href)?.match(page.url.pathname, currentHash) ?? false;
	}

	function toggleTheme() {
		theme.theme = theme.resolvedTheme === 'dark' ? 'light' : 'dark';
	}

	onMount(() => {
		syncHash();
		window.addEventListener('hashchange', syncHash);

		return () => {
			window.removeEventListener('hashchange', syncHash);
		};
	});
</script>

<header class="sticky top-0 z-30 w-full border-b border-border bg-sidebar/90 backdrop-blur">
	<div class={containerClass}>
		<a
			class="font-brand-sans flex shrink-0 items-center gap-3 text-[1.05rem] font-semibold tracking-[-0.035em] text-foreground md:text-[1.25rem]"
			href="/"
		>
			<img alt="Streamdown-Svelte" class="size-7 md:size-8" src="/favicon.svg" />
			<span>Streamdown-Svelte</span>
		</a>

		<nav class="min-w-0 flex-1 overflow-x-auto">
			<div class="flex min-w-max items-center gap-1.5 rounded-xl p-1">
				{#each siteNavItems as item}
					<a
						class={`font-brand-sans rounded-lg px-4 py-2 text-[0.95rem] font-medium tracking-[-0.02em] transition-colors md:text-[1rem] ${
							isActive(item.href)
								? 'bg-background text-foreground shadow-sm'
								: 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
						}`}
						href={item.href}
					>
						{item.label}
					</a>
				{/each}
			</div>
		</nav>

		<div class="flex shrink-0 items-center gap-2">
			<a
				class="font-brand-sans hidden rounded-lg px-4 py-2 text-[0.95rem] font-medium tracking-[-0.02em] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground sm:inline-flex"
				href={REPO_URL}
				target="_blank"
				rel="noreferrer"
			>
				GitHub
			</a>
			<button
				class="font-brand-sans rounded-lg border border-border px-4 py-2 text-[0.95rem] font-medium tracking-[-0.02em] transition-colors hover:bg-background/70 md:text-[1rem]"
				type="button"
				onclick={toggleTheme}
			>
				{theme.resolvedTheme === 'dark' ? 'Light' : 'Dark'}
			</button>
		</div>
	</div>
</header>
