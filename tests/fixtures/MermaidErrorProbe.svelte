<script lang="ts">
	let {
		error,
		chart,
		retry
	}: {
		error: string;
		chart: string;
		retry: () => void;
	} = $props();
</script>

<div data-mermaid-error-probe>
	<p data-mermaid-error-text>{error}</p>
	<pre data-mermaid-error-chart>{chart}</pre>
	<button type="button" data-mermaid-error-retry onclick={retry}>Retry render</button>
</div>
