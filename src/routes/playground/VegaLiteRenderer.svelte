<script lang="ts">
	import type { CustomRendererProps } from '$lib/plugins.js';

	type VegaDatum = Record<string, string | number | null>;
	type VegaEncodingField = {
		field?: string;
		title?: string;
	};
	type VegaSpec = {
		data?: {
			values?: VegaDatum[];
		};
		description?: string;
		encoding?: {
			x?: VegaEncodingField;
			y?: VegaEncodingField;
		};
	};

	const COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

	let { code, language, isIncomplete }: CustomRendererProps = $props();

	function parseSpec(source: string): VegaSpec | null {
		try {
			return JSON.parse(source) as VegaSpec;
		} catch {
			return null;
		}
	}

	const spec = $derived(parseSpec(code));
	const values = $derived(spec?.data?.values ?? []);
	const xField = $derived(spec?.encoding?.x?.field ?? 'x');
	const yField = $derived(spec?.encoding?.y?.field ?? 'y');
	const yTitle = $derived(spec?.encoding?.y?.title ?? yField);
	const maxValue = $derived(
		Math.max(
			1,
			...values.map((datum) => {
				const raw = datum[yField];
				return typeof raw === 'number' ? raw : Number(raw ?? 0);
			})
		)
	);
</script>

<div class="my-4 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
	<div class="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2">
		<span class="font-medium text-xs uppercase tracking-[0.18em] text-muted-foreground">{language}</span>
		<span class="text-xs text-muted-foreground">Custom Renderer</span>
	</div>

	{#if isIncomplete}
		<div class="flex h-56 items-center justify-center bg-background px-4">
			<span class="text-sm text-muted-foreground">Loading chart...</span>
		</div>
	{:else if !spec}
		<div class="flex h-56 items-center justify-center bg-background px-4">
			<span class="text-sm text-destructive">Invalid Vega-Lite spec</span>
		</div>
	{:else}
		<div class="space-y-4 bg-white p-5 text-slate-950">
			<div class="space-y-1">
				<p class="font-medium text-sm">{spec.description ?? 'Vega-Lite preview'}</p>
				<p class="text-xs text-slate-500">{yTitle}</p>
			</div>

			<div class="flex h-52 items-end gap-3 rounded-lg bg-slate-50 p-4">
				{#each values as datum, index}
					{@const rawValue = datum[yField]}
					{@const value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0)}
					{@const label = String(datum[xField] ?? '')}
					<div class="flex min-w-0 flex-1 flex-col items-center gap-2">
						<div class="flex h-40 w-full items-end">
							<div
								class="w-full rounded-t-md transition-[height] duration-200"
								style={`height: ${(value / maxValue) * 100}%; background:${COLORS[index % COLORS.length]};`}
								aria-label={`${label}: ${value}`}
							></div>
						</div>
						<div class="text-center">
							<p class="font-medium text-[11px]">{label}</p>
							<p class="text-[10px] text-slate-500">{value}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
