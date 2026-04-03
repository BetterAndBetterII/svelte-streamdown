<script lang="ts">
	import type { CustomRendererProps } from '../../../src/lib/plugins.js';

	let { code, isIncomplete, language, meta }: CustomRendererProps = $props();
</script>

<div
	data-testid="custom-renderer"
	data-code={code}
	data-incomplete={String(isIncomplete)}
	data-language={language}
	data-meta={meta ?? ''}
>
	Custom renderer: {language}
</div>
