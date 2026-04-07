<script lang="ts">
	import Streamdown from '../../../../../src/lib/Streamdown.svelte';
	import Mermaid from '../../../../../src/lib/Elements/Mermaid.svelte';

	let panZoomEnabled = $state(true);

	const content = ['```mermaid', 'graph TD; A-->B', '```'].join('\n');
</script>

<button data-toggle-panzoom type="button" onclick={() => (panZoomEnabled = !panZoomEnabled)}>
	Toggle panzoom
</button>

<Streamdown
	{content}
	components={{ mermaid: Mermaid }}
	controls={{
		mermaid: {
			panZoom: panZoomEnabled
		}
	}}
/>
