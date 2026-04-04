<script lang="ts">
	import type { CustomRendererProps } from '../../../src/lib/plugins.js';

	let { meta }: CustomRendererProps = $props();
</script>

<div data-testid="meta-renderer" data-has-meta={meta !== undefined ? 'true' : 'false'}></div>
