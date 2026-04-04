<script lang="ts">
	import type { CustomRendererProps } from '../../../src/lib/plugins.js';

	let { code, language }: CustomRendererProps = $props();
</script>

<div data-testid="d2-renderer" data-language={language} data-code={code}>
	D2 Diagram: {code}
</div>
