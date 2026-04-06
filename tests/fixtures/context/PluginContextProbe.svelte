<script lang="ts">
	import {
		useCjkPlugin,
		useCodePlugin,
		useCustomRenderer,
		useMathPlugin,
		useMermaidPlugin,
		usePlugins
	} from '../../../src/lib/index.js';

	let { language = 'vega' }: { language?: string } = $props();

	const plugins = usePlugins();
	const codePlugin = useCodePlugin();
	const mermaidPlugin = useMermaidPlugin();
	const mathPlugin = useMathPlugin();
	const cjkPlugin = useCjkPlugin();
	const renderer = $derived(language ? useCustomRenderer(language) : null);
</script>

<div
	data-cjk={cjkPlugin?.name ?? 'null'}
	data-code={codePlugin?.name ?? 'null'}
	data-math={mathPlugin?.name ?? 'null'}
	data-mermaid={mermaidPlugin?.name ?? 'null'}
	data-plugins={plugins ? 'present' : 'null'}
	data-renderer={renderer ? 'present' : 'null'}
></div>
