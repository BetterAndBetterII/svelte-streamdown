<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { Tokens } from 'marked';

	let { token, id }: { token: Tokens.Code; id: string } = $props();

	const streamdown = useStreamdown();
</script>

<div
	data-probe="code-context"
	data-code-id={id}
	data-language={token.lang ?? ''}
	data-copy-enabled={streamdown.codeControls.copy ? 'true' : 'false'}
	data-download-enabled={streamdown.codeControls.download ? 'true' : 'false'}
	data-line-numbers={streamdown.lineNumbers ? 'true' : 'false'}
	data-theme={streamdown.shikiTheme}
	data-translation-download={streamdown.translations.downloadFile}
></div>
