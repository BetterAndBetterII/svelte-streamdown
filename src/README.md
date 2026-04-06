# Svelte Streamdown

Svelte port of [Vercel Streamdown](https://streamdown.ai/) for rendering AI-generated markdown with streaming-friendly parsing, hardened HTML handling, extensible plugins, and Svelte-native customization hooks.

## Installation

```bash
pnpm add svelte-streamdown
```

## Quick Start

```svelte
<script lang="ts">
	import { Streamdown } from 'svelte-streamdown';

	let content = `# Hello

Streamdown renders **markdown**, tables, alerts, footnotes, citations, and more.`;
</script>

<Streamdown {content} />
```

## What Ships Today

- Streaming and static rendering modes
- Incomplete-markdown repair for streaming content
- Hardened link, image, and raw HTML handling
- Built-in code block rendering with syntax highlighting, copy, and download controls
- Tables, alerts, footnotes, description lists, sub/sup text, and inline citations
- MDX-style component tags and custom marked extensions
- Snippet- and component-based rendering overrides
- Theme, icon, translation, and control customization

## Rich Rendering Plugins

Code blocks work out of the box. Math, Mermaid, custom code-fence renderers, and CJK autolink fixes are enabled through the `plugins` prop.

```svelte
<script lang="ts">
	import {
		Streamdown,
		createCodePlugin,
		createMathPlugin,
		createMermaidPlugin
	} from 'svelte-streamdown';

	let content = `
\`\`\`ts
console.log('highlighted');
\`\`\`

$$E = mc^2$$

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`;

	const plugins = {
		code: createCodePlugin(),
		math: createMathPlugin(),
		mermaid: createMermaidPlugin()
	};
</script>

<Streamdown {content} {plugins} />
```

Without `plugins.math`, math falls back to plain text. Without `plugins.mermaid`, Mermaid fences fall back to code-style output.

## Security and HTML

Raw HTML is processed through Streamdown's security layer. You can allow specific tags, keep literal content for specific tags, restrict link and image destinations, or disable HTML rendering for HTML-like blocks entirely.

```svelte
<script lang="ts">
	import { Streamdown } from 'svelte-streamdown';

	let content = `
[Docs](https://example.com/docs)
![Logo](https://cdn.example.com/logo.png)
<Callout>safe custom tag</Callout>
`;
</script>

<Streamdown
	{content}
	allowedLinkPrefixes={['https://example.com']}
	allowedImagePrefixes={['https://cdn.example.com']}
	allowedTags={{
		callout: ['class']
	}}
	literalTagContent={['script', 'style']}
/>
```

Use `allowedElements`, `disallowedElements`, or `allowElement` to filter parsed markdown nodes before render. Set `unwrapDisallowed` to keep a filtered node's children in place, `skipHtml` to drop raw HTML tokens entirely, and `urlTransform` to rewrite or remove rendered `href` / `src` values.

## Custom Rendering

### Snippets

Use snippets when you want to replace the markup for a markdown token while keeping Streamdown's parsing and traversal.

```svelte
<script lang="ts">
	import { Streamdown } from 'svelte-streamdown';

	let content = `## Custom heading`;
</script>

<Streamdown {content}>
	{#snippet heading({ token, children })}
		<svelte:element this={`h${token.depth}`} class="font-serif text-balance text-emerald-700">
			{@render children()}
		</svelte:element>
	{/snippet}
</Streamdown>
```

Shipped snippet keys include `heading`, `paragraph`, `blockquote`, `code`, `codespan`, `ul`, `ol`, `li`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th`, `image`, `link`, `strong`, `em`, `del`, `hr`, `br`, `math`, `alert`, `mermaid`, `footnoteRef`, `footnotePopover`, `sup`, `sub`, `descriptionList`, `description`, `descriptionTerm`, `descriptionDetail`, `inlineCitation`, `inlineCitationPreview`, `inlineCitationContent`, `inlineCitationPopover`, and `mdx`.

### Components

Use `components` when you want to replace selected built-in Svelte components directly.

```svelte
<script lang="ts">
	import { Streamdown } from 'svelte-streamdown';
	import InlineCode from './InlineCode.svelte';

	let content = 'Use `pnpm test` to run the suite.';
</script>

<Streamdown
	{content}
	components={{
		inlineCode: InlineCode
	}}
/>
```

`components` supports heading tags (`h1` through `h6`), `p`, `a`, `img`, `table`, `inlineCode`, `code`, `mermaid`, `mermaidError`, and `math`.

### MDX Components

Uppercase tags in markdown can be rendered with `mdxComponents`:

```svelte
<script lang="ts">
	import { Streamdown } from 'svelte-streamdown';
	import Card from './Card.svelte';

	let content = `
<Card title="Hello">
This content is still parsed as **markdown**.
</Card>
`;
</script>

<Streamdown {content} mdxComponents={{ Card }} />
```

### Custom Extensions

Streamdown exposes marked extension hooks through the `extensions` prop and renders unmatched custom tokens through the `children` snippet.

```svelte
<script lang="ts">
	import { Streamdown, type Extension } from 'svelte-streamdown';

	const callout: Extension = {
		name: 'callout',
		level: 'block',
		tokenizer(this, src) {
			const match = src.match(/^:::callout\n([\s\S]*?)\n:::/);
			if (!match) {
				return undefined;
			}

			return {
				type: 'callout',
				raw: match[0],
				tokens: this.lexer.blockTokens(match[1] ?? '')
			};
		}
	};

	let content = `:::callout
Important content
:::`;
</script>

<Streamdown {content} extensions={[callout]}>
	{#snippet children({ token, children })}
		{#if token.type === 'callout'}
			<aside class="rounded-lg border px-4 py-3">
				{@render children()}
			</aside>
		{/if}
	{/snippet}
</Streamdown>
```

## Props

The public `StreamdownProps` type is exported from the package.

| Prop                        | Type                                                                                                                                               | Notes                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `content`                   | `string`                                                                                                                                           | Markdown source to render.                                                      |
| `mode`                      | `'static' \| 'streaming'`                                                                                                                          | Selects streaming repair behavior.                                              |
| `static`                    | `boolean`                                                                                                                                          | Compatibility alias for forcing static mode.                                    |
| `parseIncompleteMarkdown`   | `boolean`                                                                                                                                          | Enables or disables incomplete-markdown repair.                                 |
| `parseMarkdownIntoBlocksFn` | `(markdown: string) => string[]`                                                                                                                   | Custom block splitter.                                                          |
| `dir`                       | `'auto' \| 'ltr' \| 'rtl'`                                                                                                                         | Controls text direction.                                                        |
| `class`                     | `string`                                                                                                                                           | Root wrapper class.                                                             |
| `className`                 | `string`                                                                                                                                           | Alias that is merged with `class`.                                              |
| `defaultOrigin`             | `string`                                                                                                                                           | Base origin for relative URLs.                                                  |
| `allowedLinkPrefixes`       | `string[]`                                                                                                                                         | Link allowlist.                                                                 |
| `allowedImagePrefixes`      | `string[]`                                                                                                                                         | Image allowlist.                                                                |
| `linkSafety`                | `LinkSafetyConfig`                                                                                                                                 | Link confirmation hooks and modal renderer.                                     |
| `allowedTags`               | `AllowedTags`                                                                                                                                      | Raw HTML tag allowlist.                                                         |
| `allowedElements`           | `string[]`                                                                                                                                         | Markdown element allowlist, using normalized tag names such as `p` or `h2`.     |
| `allowElement`              | `AllowElement`                                                                                                                                     | Callback for per-element markdown filtering decisions.                          |
| `disallowedElements`        | `string[]`                                                                                                                                         | Markdown element denylist, using normalized tag names such as `strong` or `li`. |
| `literalTagContent`         | `string[]`                                                                                                                                         | Tags whose inner content should be treated literally.                           |
| `normalizeHtmlIndentation`  | `boolean`                                                                                                                                          | Normalizes indentation before HTML handling.                                    |
| `renderHtml`                | `boolean \| ((token: Tokens.HTML \| Tokens.Tag) => string)`                                                                                        | Controls raw HTML rendering.                                                    |
| `skipHtml`                  | `boolean`                                                                                                                                          | Drops raw HTML tokens before render.                                            |
| `unwrapDisallowed`          | `boolean`                                                                                                                                          | Keeps a filtered markdown node's children instead of dropping the full subtree. |
| `urlTransform`              | `UrlTransform`                                                                                                                                     | Rewrites or removes rendered URL attributes before link/image hardening.        |
| `sources`                   | `Record<string, any>`                                                                                                                              | Citation source data.                                                           |
| `inlineCitationsMode`       | `'list' \| 'carousel'`                                                                                                                             | Citation popover layout.                                                        |
| `plugins`                   | `PluginConfig`                                                                                                                                     | Enables math, Mermaid, CJK, custom renderers, or a custom highlighter contract. |
| `extensions`                | `Extension[]`                                                                                                                                      | Custom marked tokenizers.                                                       |
| `components`                | `StreamdownComponents`                                                                                                                             | Component overrides for selected rendered elements.                             |
| `mdxComponents`             | `Record<string, Component>`                                                                                                                        | Component map for uppercase MDX-style tags.                                     |
| `children`                  | `Snippet`                                                                                                                                          | Fallback renderer for unmatched custom tokens.                                  |
| `theme`                     | `DeepPartialTheme`                                                                                                                                 | Theme overrides.                                                                |
| `baseTheme`                 | `'tailwind' \| 'shadcn'`                                                                                                                           | Built-in theme base.                                                            |
| `mergeTheme`                | `boolean`                                                                                                                                          | Merge custom theme with the selected base theme.                                |
| `prefix`                    | `string`                                                                                                                                           | Prefixes generated utility classes.                                             |
| `lineNumbers`               | `boolean`                                                                                                                                          | Enables line numbers for fenced code blocks when the fence allows them.         |
| `shikiTheme`                | `string`                                                                                                                                           | Active Shiki theme name.                                                        |
| `shikiLanguages`            | `LanguageInfo[]`                                                                                                                                   | Extra languages for the built-in highlighter.                                   |
| `shikiThemes`               | `Record<string, ThemeRegistration>`                                                                                                                | Extra Shiki theme registrations.                                                |
| `mermaidConfig`             | `MermaidConfig`                                                                                                                                    | Mermaid configuration passed to the renderer.                                   |
| `katexConfig`               | `KatexOptions \| ((inline: boolean) => KatexOptions)`                                                                                              | KaTeX configuration.                                                            |
| `translations`              | `Partial<StreamdownTranslations>`                                                                                                                  | UI label overrides.                                                             |
| `controls`                  | `{ code?, mermaid?, table? }`                                                                                                                      | Enables or disables built-in action controls.                                   |
| `animation`                 | `{ enabled?, animateOnMount?, type?, duration?, timingFunction?, tokenize? }`                                                                      | Streaming animation configuration.                                              |
| `animated`                  | `boolean \| AnimateOptions`                                                                                                                        | Compatibility animation API.                                                    |
| `isAnimating`               | `boolean`                                                                                                                                          | Tells Streamdown whether content is actively streaming.                         |
| `caret`                     | `keyof typeof carets`                                                                                                                              | Caret glyph shown while streaming.                                              |
| `onAnimationStart`          | `() => void`                                                                                                                                       | Called when `isAnimating` flips on.                                             |
| `onAnimationEnd`            | `() => void`                                                                                                                                       | Called when `isAnimating` flips off.                                            |
| `streamdown`                | `StreamdownContext`                                                                                                                                | Bindable instance of the active context.                                        |
| `element`                   | `HTMLElement`                                                                                                                                      | Bindable root element reference.                                                |
| `icons`                     | `{ copy?, download?, fullscreen?, zoomIn?, zoomOut?, fitView?, note?, tip?, warning?, caution?, important?, chevronLeft?, chevronRight?, check? }` | Snippet overrides for built-in icons.                                           |

## Public Exports

Root exports include:

- `Streamdown`
- `useStreamdown`
- `normalizeHtmlIndentation`
- `theme`, `shadcnTheme`, `mergeTheme`
- `lex`, `parseBlocks`, `parseIncompleteMarkdown`, `IncompleteMarkdownParser`
- `createCodePlugin`, `createMathPlugin`, `createMermaidPlugin`, `createCjkPlugin`
- `defaultTranslations`, `mergeTranslations`
- `bundledLanguagesInfo`, `createLanguageSet`
- `extractTableDataFromElement`, `tableDataToCSV`, `tableDataToMarkdown`, `tableDataToTSV`

Subpath exports:

- `svelte-streamdown/code`
- `svelte-streamdown/math`
- `svelte-streamdown/mermaid`

## Development

```bash
pnpm install
pnpm build:packages
pnpm check
pnpm test
```

## Workspace Baseline

The repository now keeps a pnpm workspace baseline for publishable packages:

- repo root: `svelte-streamdown`
- `packages/remend`: streaming markdown repair utilities prepared for standalone packing

Shared package conventions live in:

- `pnpm-workspace.yaml`
- `config/tsconfig.package.json`
- `config/tsup-package.mjs`
- `scripts/lib/publishable-packages.mjs`

Validation entrypoints for the workspace split:

- `pnpm verify:pack`
- `pnpm verify:exports`
- `pnpm verify:workspace-smoke`

See `docs/workspace-baseline.md` for the repo layout, local linking workflow, and packaging rules.

See [CONTRIBUTING.md](https://github.com/BetterAndBetterII/svelte-streamdown/blob/master/CONTRIBUTING.md) for the regression intake workflow, parity fixture naming convention, and bug-fix PR expectations.

## License

MIT
