<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { onDestroy, onMount } from 'svelte';
	import Streamdown from '$lib/Streamdown.svelte';
	import { code, type PluginConfig } from '$lib/plugins.js';
	import { demoMarkdown } from './content.js';

	const speed = 100;
	const tokens = demoMarkdown.split(' ').map((token) => `${token} `);

	let content = $state('');
	let isAnimating = $state(false);
	let host = $state<HTMLDivElement | null>(null);
	let timer: ReturnType<typeof setInterval> | null = null;
	let plugins = $state<PluginConfig>({ code });

	const loadInteractivePlugins = async (): Promise<PluginConfig | null> => {
		if (!BROWSER) {
			return null;
		}

		const [{ cjk }, { math, mermaid }] = await Promise.all([
			import('$lib/plugins/cjk-shared.js'),
			import('$lib/plugins.js')
		]);

		return { code, cjk, math, mermaid };
	};

	function stopDemo() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		isAnimating = false;
	}

	function startDemo() {
		stopDemo();
		content = '';
		isAnimating = true;

		let current = '';
		let index = 0;

		timer = setInterval(() => {
			if (index >= tokens.length) {
				stopDemo();
				return;
			}

			current += tokens[index] ?? '';
			content = current;
			index += 1;
		}, speed);
	}

	onMount(() => {
		void loadInteractivePlugins().then((loadedPlugins) => {
			if (loadedPlugins) {
				plugins = loadedPlugins;
			}
		});

		if (!host) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries[0]?.isIntersecting) {
					return;
				}

				startDemo();
				observer.disconnect();
			},
			{ rootMargin: '-100px' }
		);

		observer.observe(host);

		return () => {
			observer.disconnect();
			stopDemo();
		};
	});

	onDestroy(() => {
		stopDemo();
	});
</script>

<div class="mx-auto w-full max-w-4xl">
	<div class="overflow-hidden rounded-sm border bg-background shadow-sm">
		<div
			class="flex items-center justify-between border-b bg-sidebar px-4 py-2 text-sm text-muted-foreground"
		>
			<span>Live demo</span>
			<button
				class="rounded-md px-2 py-1 font-medium text-foreground transition-colors hover:bg-accent"
				type="button"
				onclick={startDemo}
			>
				Replay
			</button>
		</div>
		<div class="h-[600px] overflow-y-auto">
			<div class="mx-auto w-full max-w-prose p-6 sm:p-12" bind:this={host}>
				<Streamdown
					content={content}
					animated
					caret="block"
					isAnimating={isAnimating}
					{plugins}
				/>
			</div>
		</div>
	</div>
</div>
