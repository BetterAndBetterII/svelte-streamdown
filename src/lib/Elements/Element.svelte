<script lang="ts">
	import type { Snippet } from 'svelte';
	import Link from './Link.svelte';
	import Image from './Image.svelte';
	import Alert from './Alert.svelte';
	import type { StreamdownToken } from '$lib/marked/index.js';
	import Slot from './Slot.svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import { renderHtmlToken } from '$lib/security/html.js';
	import FootnoteRef from './FootnoteRef.svelte';
	import Citation from './Citation.svelte';
	import Table from './Table.svelte';
	// Import fallback components
	import Code from './Code.svelte';
	import Mermaid from './Mermaid.svelte';
	import Math from './Math.svelte';
	import { CodeFallback, MermaidFallback, MathFallback } from './fallbacks/index.js';
	import {
		extractCodeFenceLanguage,
		extractCodeFenceMeta,
		findCustomRenderer
	} from '$lib/plugins.js';
	let { token, children }: { token: StreamdownToken; children: Snippet } = $props();
	const streamdown = useStreamdown();
	const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

	// Use provided components or fallback to lightweight versions
	const CodeComponent = $derived(
		streamdown.components?.code ?? (streamdown.plugins?.code ? Code : CodeFallback)
	);
	const MermaidComponent = $derived(
		streamdown.components?.mermaid ?? (streamdown.plugins?.mermaid ? Mermaid : MermaidFallback)
	);
	const MathComponent = $derived(
		streamdown.components?.math ?? (streamdown.plugins?.math ? Math : MathFallback)
	);
	const customRenderer = $derived(
		token.type === 'code'
			? findCustomRenderer(streamdown.plugins?.renderers, extractCodeFenceLanguage(token))
			: null
	);
	const headingThemeKey = $derived(
		token.type === 'heading' ? (headingTags[token.depth - 1] ?? 'h1') : 'h1'
	);
	const HeadingComponent = $derived(
		token.type === 'heading' ? streamdown.components?.[headingThemeKey] : undefined
	);
	const ParagraphComponent = $derived(
		token.type === 'paragraph' ? streamdown.components?.p : undefined
	);
	const InlineCodeComponent = $derived(
		token.type === 'codespan' ? streamdown.components?.inlineCode : undefined
	);

	// Only apply animation on block level elements. Leaves text elements to be animated by their text children.
	const style = $derived(streamdown.isMounted ? streamdown.animationBlockStyle : '');
	const id = $props.id();
</script>

{#if token.type === 'heading'}
	<Slot
		props={{
			children,
			token,
			class: streamdown.theme[headingThemeKey].base,
			style
		}}
		render={streamdown.snippets.heading}
		component={HeadingComponent}
	>
		{#if token.depth === 1}
			<h1 data-streamdown-heading-1={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h1>
		{:else if token.depth === 2}
			<h2 data-streamdown-heading-2={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h2>
		{:else if token.depth === 3}
			<h3 data-streamdown-heading-3={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h3>
		{:else if token.depth === 4}
			<h4 data-streamdown-heading-4={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h4>
		{:else if token.depth === 5}
			<h5 data-streamdown-heading-5={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h5>
		{:else if token.depth === 6}
			<h6 data-streamdown-heading-6={id} {style} class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h6>
		{/if}
	</Slot>
{:else if token.type === 'paragraph'}
	<Slot
		props={{ children, token, class: streamdown.theme.paragraph.base, style }}
		render={streamdown.snippets.paragraph}
		component={ParagraphComponent}
	>
		<p data-streamdown-paragraph={id} {style} class={streamdown.theme.paragraph.base}>
			{@render children()}
		</p>
	</Slot>
{:else if token.type === 'blockquote'}
	<Slot props={{ children, token }} render={streamdown.snippets.blockquote}>
		<blockquote data-streamdown-blockquote={id} {style} class={streamdown.theme.blockquote.base}>
			{@render children()}
		</blockquote>
	</Slot>
{:else if token.type === 'code' && customRenderer}
	{@const Renderer = customRenderer.component}
	<Renderer
		code={token.text}
		isIncomplete={false}
		language={extractCodeFenceLanguage(token)}
		meta={extractCodeFenceMeta(token)}
	/>
{:else if token.type === 'code' && extractCodeFenceLanguage(token) === 'mermaid'}
	<Slot props={{ children, token }} render={streamdown.snippets.code}>
		<MermaidComponent {id} {token} />
	</Slot>
{:else if token.type === 'code'}
	<Slot props={{ children, token }} render={streamdown.snippets.code}>
		<CodeComponent {id} {token} />
	</Slot>
{:else if token.type === 'codespan'}
	<Slot
		props={{ children, token, class: streamdown.theme.codespan.base }}
		render={streamdown.snippets.codespan}
		component={InlineCodeComponent}
	>
		<code data-streamdown-codespan={id} class={streamdown.theme.codespan.base}>
			{@render children()}
		</code>
	</Slot>
{:else if token.type === 'list'}
	{#if token.ordered}
		<Slot props={{ children, token }} render={streamdown.snippets.ol}>
			<ol
				data-streamdown-ol={id}
				style:list-style-type={token.listType}
				class={streamdown.theme.ol.base}
			>
				{@render children()}
			</ol>
		</Slot>
	{:else}
		<Slot props={{ children, token }} render={streamdown.snippets.ul}>
			<ul data-streamdown-ul={id} class={streamdown.theme.ul.base}>
				{@render children()}
			</ul>
		</Slot>
	{/if}
{:else if token.type === 'list_item'}
	<Slot props={{ children, token }} render={streamdown.snippets.li}>
		<li
			data-streamdown-li={id}
			{style}
			style:list-style-type={token.task ? 'none' : undefined}
			{...token.value && !token.task ? { value: token.value } : {}}
			class={streamdown.theme.li.base}
		>
			{#if token.task}
				<input
					disabled
					type="checkbox"
					checked={token.checked}
					class={streamdown.theme.li.checkbox}
				/>
			{/if}
			{@render children()}
		</li>
	</Slot>
{:else if token.type === 'table'}
	<Slot props={{ token, children }} render={streamdown.snippets.table}>
		<div {style}>
			<Table {id} {token}>
				{@render children()}
			</Table>
		</div>
	</Slot>
{:else if token.type === 'thead'}
	<Slot props={{ token, children }} render={streamdown.snippets.thead}>
		<thead data-streamdown-thead={id} {style} class={streamdown.theme.thead.base}>
			{@render children?.()}
		</thead>
	</Slot>
{:else if token.type === 'tbody'}
	<Slot props={{ token, children }} render={streamdown.snippets.tbody}>
		<tbody data-streamdown-tbody={id} {style} class={streamdown.theme.tbody.base}>
			{@render children?.()}
		</tbody>
	</Slot>
{:else if token.type === 'tfoot'}
	<Slot props={{ token, children }} render={streamdown.snippets.tfoot}>
		<tfoot data-streamdown-tfoot={id} {style} class={streamdown.theme.tfoot.base}>
			{@render children?.()}
		</tfoot>
	</Slot>
{:else if token.type === 'tr'}
	<Slot props={{ token, children }} render={streamdown.snippets.tr}>
		<tr data-streamdown-tr={id} {style} class={streamdown.theme.tr.base}>
			{@render children?.()}
		</tr>
	</Slot>
{:else if token.type === 'td'}
	{#if token.rowspan > 0}
		<Slot props={{ children, token }} render={streamdown.snippets.td}>
			<td
				{style}
				data-streamdown-td={id}
				class={streamdown.theme.td.base}
				{...token.colspan > 1 ? { colspan: token.colspan } : {}}
				{...token.rowspan > 1 ? { rowspan: token.rowspan } : {}}
				{...token.align && ['left', 'center', 'right', 'justify', 'char'].includes(token.align)
					? { align: token.align as 'left' | 'center' | 'right' | 'justify' | 'char' }
					: { align: 'left' }}
			>
				{@render children?.()}
			</td>
		</Slot>
	{/if}
{:else if token.type === 'th'}
	{#if token.rowspan > 0}
		<Slot props={{ children, token }} render={streamdown.snippets.th}>
			<th
				{style}
				data-streamdown-th={id}
				class={streamdown.theme.th.base}
				{...token.colspan > 1 ? { colspan: token.colspan } : {}}
				{...token.rowspan > 1 ? { rowspan: token.rowspan } : {}}
				{...token.align && ['left', 'center', 'right', 'justify', 'char'].includes(token.align)
					? { align: token.align as 'left' | 'center' | 'right' | 'justify' | 'char' }
					: { align: 'left' }}
			>
				{@render children?.()}
			</th>
		</Slot>
	{/if}
{:else if token.type === 'image'}
	<Image {id} {token} {children} />
{:else if token.type === 'link'}
	<Link {id} {token} {children} />
{:else if token.type === 'sub'}
	<Slot props={{ children, token }} render={streamdown.snippets.sub}>
		<sub data-streamdown-sub={id} class={streamdown.theme.sub.base}>
			{@render children()}
		</sub>
	</Slot>
{:else if token.type === 'sup'}
	<Slot props={{ children, token }} render={streamdown.snippets.sup}>
		<sup data-streamdown-sup={id} class={streamdown.theme.sup.base}>
			{@render children()}
		</sup>
	</Slot>
{:else if token.type === 'strong'}
	<Slot props={{ children, token }} render={streamdown.snippets.strong}>
		<strong data-streamdown-strong={id} class={streamdown.theme.strong.base}>
			{@render children()}
		</strong>
	</Slot>
{:else if token.type === 'em'}
	<Slot props={{ children, token }} render={streamdown.snippets.em}>
		<em data-streamdown-em={id} class={streamdown.theme.em.base}>
			{@render children()}
		</em>
	</Slot>
{:else if token.type === 'del'}
	<Slot props={{ children, token }} render={streamdown.snippets.del}>
		<del data-streamdown-del={id} class={streamdown.theme.del.base}>
			{@render children()}
		</del>
	</Slot>
{:else if token.type === 'hr'}
	<Slot props={{ children, token }} render={streamdown.snippets.hr}>
		<hr data-streamdown-hr={id} {style} class={streamdown.theme.hr.base} />
	</Slot>
{:else if token.type === 'br'}
	<br data-streamdown-br={id} />
{:else if token.type === 'math'}
	<Slot
		props={{
			children,
			token
		}}
		render={streamdown.snippets.math}
	>
		<MathComponent {id} {token} />
	</Slot>
{:else if token.type === 'alert'}
	<Alert {id} {token} {children} />
{:else if token.type === 'footnoteRef'}
	<Slot props={{ token }} render={streamdown.snippets.footnoteRef}>
		<FootnoteRef {token} />
	</Slot>
{:else if token.type === 'inline-citations'}
	<Slot props={{ token }} render={streamdown.snippets.inlineCitation}>
		<Citation {token} />
	</Slot>
{:else if token.type === 'footnote'}
	<!-- Footnotes render as a trailing section in Streamdown.svelte. -->
{:else if token.type === 'descriptionList'}
	<Slot props={{ children, token }} render={streamdown.snippets.descriptionList}>
		<dl
			data-streamdown-description-list={id}
			style={streamdown.animationBlockStyle}
			class={streamdown.theme.descriptionList.base}
		>
			{@render children()}
		</dl>
	</Slot>
{:else if token.type === 'description'}
	<Slot props={{ children, token }} render={streamdown.snippets.description}>
		{@render children()}
	</Slot>
{:else if token.type === 'descriptionTerm'}
	<Slot props={{ children, token }} render={streamdown.snippets.descriptionTerm}>
		<dt data-streamdown-description-term={id} {style} class={streamdown.theme.descriptionTerm.base}>
			{@render children()}
		</dt>
	</Slot>
{:else if token.type === 'descriptionDetail'}
	<Slot props={{ children, token }} render={streamdown.snippets.descriptionDetail}>
		<dd
			data-streamdown-description-detail={id}
			{style}
			class={streamdown.theme.descriptionDetail.base}
		>
			{@render children()}
		</dd>
	</Slot>
{:else if token.type === 'def'}
	<!-- TODO This does not seems to be tokenized for now -->
{:else if token.type === 'escape'}
	<!-- TODO This does not seems to be tokenized for now -->
{:else if token.type === 'space'}
	<!-- TODO This does not seems to be tokenized for now -->
{:else if token.type === 'text'}
	{@render children()}
{:else if token.type === 'html'}
	{@const content = renderHtmlToken(token, {
		allowedImagePrefixes: streamdown.allowedImagePrefixes,
		allowedLinkPrefixes: streamdown.allowedLinkPrefixes,
		allowedTags: streamdown.allowedTags,
		defaultOrigin: streamdown.defaultOrigin,
		renderHtml: streamdown.renderHtml
	})}
	{@html content}
{:else if token.type === 'mdx'}
	{@const Component = streamdown.mdxComponents?.[token.tagName]}
	{#if Component}
		<Component {token} {children} props={token.attributes} />
	{:else}
		<Slot props={{ token, children, props: token.attributes }} render={streamdown.snippets.mdx}>
			{@render children()}
		</Slot>
	{/if}
{:else}
	<!-- For tokens we don't handle specifically, it may certainely be a custom extension to to the children props to handle -->
	{@render streamdown.children?.({ token, children, streamdown })}
{/if}
