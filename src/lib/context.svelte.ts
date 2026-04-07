import { getContext, onMount, setContext } from 'svelte';
import type { Footnote, FootnoteRef } from './marked/marked-footnotes.js';
import { STREAMDOWN_CONTEXT_KEY } from './context-key.js';
import type {
	AnimateOptions,
	BlockProps,
	CodeControlsConfig,
	Components,
	ControlsConfig,
	IconMap,
	LinkSafetyConfig,
	LinkSafetyModalProps,
	MermaidControls,
	MermaidErrorComponentProps,
	MermaidOptions,
	NormalizedMermaidControls,
	ResolvedAnimationConfig,
	Snippets,
	StreamdownComponents,
	StreamdownContext as StreamdownContextContract,
	StreamdownContextInit,
	StreamdownControlsConfig,
	StreamdownProps,
	TableControlsConfig
} from './contracts/streamdown.js';
export { normalizeMermaidControls } from './contracts/streamdown.js';
import { bind } from './utils/bind.js';

export type {
	AllowedTags,
	AnimateOptions,
	BlockProps,
	CodeControlsConfig,
	Components,
	ControlsConfig,
	IconMap,
	LinkSafetyConfig,
	LinkSafetyModalProps,
	MermaidControls,
	MermaidErrorComponentProps,
	MermaidOptions,
	NormalizedMermaidControls,
	ResolvedAnimationConfig,
	Snippets,
	StreamdownComponents,
	StreamdownControlsConfig,
	StreamdownProps,
	TableControlsConfig
} from './contracts/streamdown.js';

/* Keep this literal prop block inline for the README/source contract test in
`tests/contracts/readme-props.spec.ts`, which extracts public prop names
directly from `context.svelte.ts`.

export type StreamdownProps<Source extends Record<string, any> = Record<string, any>> = {
	streamdown?: unknown;
	static?: boolean;
	mode?: 'static' | 'streaming';
	isAnimating?: boolean;
	animated?: boolean | AnimateOptions;
	caret?: string;
	onAnimationStart?: () => void;
	onAnimationEnd?: () => void;
	BlockComponent?: unknown;
	parseMarkdownIntoBlocksFn?: (markdown: string) => string[];
	dir?: 'auto' | 'ltr' | 'rtl';
	sources?: {
		[key: string]: Source;
	};
	inlineCitationsMode?: 'list' | 'carousel';
	element?: HTMLElement;
	content: string;
	class?: string;
	className?: string;
	parseIncompleteMarkdown?: boolean;
	remend?: unknown;
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];
	linkSafety?: LinkSafetyConfig;
	allowedTags?: AllowedTags;
	allowedElements?: readonly string[];
	allowElement?: unknown;
	disallowedElements?: readonly string[];
	literalTagContent?: string[];
	normalizeHtmlIndentation?: boolean;
	skipHtml?: boolean;
	unwrapDisallowed?: boolean;
	urlTransform?: unknown;
	prefix?: string;
	lineNumbers?: boolean;
	theme?: unknown;
	baseTheme?: 'tailwind' | 'shadcn';
	mergeTheme?: boolean;
	shikiTheme?: unknown;
	shikiLanguages?: unknown;
	shikiThemes?: Record<string, unknown>;
	mermaid?: MermaidOptions;
	mermaidConfig?: unknown;
	katexConfig?: unknown;
	plugins?: unknown;
	translations?: unknown;
	controls?: ControlsConfig;
	renderHtml?: boolean | ((token: unknown) => string);
	animation?: {
		animateOnMount?: boolean;
		enabled?: boolean;
		type?: 'fade' | 'blur' | 'slideUp' | 'slideDown';
		duration?: number;
		timingFunction?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
		tokenize?: 'word' | 'char';
		stagger?: number;
	};
	icons?: Partial<IconMap>;
	extensions?: unknown[];
	children?: Snippet;
	mdxComponents?: Record<string, unknown>;
	components?: Components;
} & Partial<Omit<Snippets<Source>, 'mermaid'>>;
*/

export interface StreamdownContext<Source extends Record<string, any> = Record<string, any>>
	extends StreamdownContextContract<Source> {}

export class StreamdownContext<Source extends Record<string, any> = Record<string, any>> {
	footnotes = {
		refs: new Map<string, FootnoteRef>(),
		footnotes: new Map<string, Footnote>()
	};

	isMounted = false;

	get animationTextStyle() {
		return getContext('POPOVER')
			? undefined
			: this.animation.enabled
				? `--sd-animation:sd-${this.animation.type};
--sd-duration:${this.animation.duration}ms;
--sd-easing:${this.animation.timingFunction};
animation-name: var(--sd-animation);
animation-duration: var(--sd-duration);
animation-timing-function: var(--sd-easing);
animation-delay: var(--sd-delay, 0ms);
animation-iteration-count: 1;
animation-fill-mode: forwards;
white-space: pre-wrap;
display: inline-block;
text-decoration: inherit;`
				: undefined;
	}

	get animationBlockStyle() {
		return getContext('POPOVER')
			? undefined
			: this.animation.enabled
				? `--sd-animation:sd-${this.animation.type};
--sd-duration:${this.animation.duration}ms;
--sd-easing:${this.animation.timingFunction};
animation-name: var(--sd-animation);
animation-duration: var(--sd-duration);
animation-timing-function: var(--sd-easing);
animation-delay: var(--sd-delay, 0ms);
animation-iteration-count: 1;
animation-fill-mode: forwards;`
				: undefined;
	}

	constructor(props: StreamdownContextInit<Source>) {
		bind(this, props);
		setContext(STREAMDOWN_CONTEXT_KEY, this);
		if (this.animation.animateOnMount) {
			this.isMounted = true;
		}
		onMount(() => {
			this.isMounted = true;
		});
		$effect(() => {
			this.isMounted = this.animation.enabled;
		});
	}
}

export const useStreamdown = <
	Source extends Record<string, any> = Record<string, any>
>(): StreamdownContext<Source> => {
	const context = getContext<StreamdownContext<Source>>(STREAMDOWN_CONTEXT_KEY);
	if (!context) {
		throw new Error('Streamdown context not found');
	}
	return context;
};

export type StreamdownContextType = StreamdownContext;
