import type { Component, Snippet, SvelteComponent } from 'svelte';
import type { DeepPartialTheme, Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import { getContext, onMount, setContext } from 'svelte';
import type { LanguageInfo } from './utils/bundledLanguages.js';
import type { ThemeRegistration } from 'shiki';
import type { StreamdownTranslations } from './translations.js';
import type { AllowedTags } from './security/types.js';
import { carets } from './streaming.js';
import type { PluginConfig, ThemeInput } from './plugins.js';
import type { AllowElement, UrlTransform } from './markdown.js';
import type { RemendOptions } from 'remend';
import { STREAMDOWN_CONTEXT_KEY } from './context-key.js';

export type { AllowedTags } from './security/types.js';

export interface AnimateOptions {
	animation?: 'fadeIn' | 'blurIn' | 'slideUp' | (string & {});
	duration?: number;
	easing?: string;
	sep?: 'word' | 'char';
	stagger?: number;
}

export interface LinkSafetyModalProps {
	url: string;
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export interface LinkSafetyConfig {
	enabled?: boolean;
	onLinkCheck?: (href: string) => boolean | Promise<boolean>;
	renderModal?: (props: LinkSafetyModalProps) => unknown;
}

export type BlockProps = {
	content: string;
	shouldParseIncompleteMarkdown: boolean;
	shouldNormalizeHtmlIndentation: boolean;
	index: number;
	isIncomplete: boolean;
	dir?: 'ltr' | 'rtl';
	children?: Snippet;
};

export interface ResolvedAnimationConfig {
	enabled: boolean;
	animateOnMount?: boolean;
	type?: string;
	duration?: number;
	timingFunction?: string;
	tokenize?: 'word' | 'char';
	stagger?: number;
}

export interface StreamdownContext
	extends Omit<
		StreamdownProps,
		| CompatSnippetKeys
		| 'animation'
		| 'class'
		| 'theme'
		| 'shikiTheme'
		| 'inlineCitationsMode'
		| 'translations'
	> {
	snippets: Snippets;
	shikiTheme: string;
	theme: Theme;
	translations: StreamdownTranslations;
	lineNumbers: boolean;
	isAnimating: boolean;
	controls: {
		code: boolean;
		mermaid: NormalizedMermaidControls;
		table: TableControlsConfig;
	};
	plugins?: PluginConfig;
	codeControls: {
		copy: boolean;
		download: boolean;
	};
	inlineCitationsMode: 'list' | 'carousel';
	mode: 'static' | 'streaming';
	animation: ResolvedAnimationConfig;
}

type StreamdownContextInit<Source extends Record<string, any> = Record<string, any>> = Omit<
	StreamdownProps<Source>,
	| CompatSnippetKeys<Source>
	| 'animation'
	| 'class'
	| 'theme'
	| 'shikiTheme'
	| 'inlineCitationsMode'
	| 'translations'
> & {
	snippets: Snippets<Source>;
	shikiTheme: string;
	theme: Theme | DeepPartialTheme | undefined;
	translations: StreamdownTranslations;
	lineNumbers: boolean;
	isAnimating: boolean;
	controls: {
		code: boolean;
		mermaid: NormalizedMermaidControls;
		table: TableControlsConfig;
	};
	codeControls: {
		copy: boolean;
		download: boolean;
	};
	inlineCitationsMode: 'list' | 'carousel';
	animation: ResolvedAnimationConfig;
};
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

export type TableControlsConfig =
	| boolean
	| {
			copy?: boolean;
			download?: boolean;
			fullscreen?: boolean;
	  };

export type CodeControlsConfig =
	| boolean
	| {
			copy?: boolean;
			download?: boolean;
	  };

export type StreamdownControlsConfig =
	| boolean
	| {
			code?: CodeControlsConfig;
			mermaid?: MermaidControls;
			table?: TableControlsConfig;
	  };

export type ControlsConfig = StreamdownControlsConfig;

import type {
	AlertToken,
	MathToken,
	SubSupToken,
	TableToken,
	THead,
	TBody,
	TFoot,
	THeadRow,
	TRow,
	TD,
	TH,
	Extension,
	GenericToken,
	CitationToken,
	MdxToken
} from './marked/index.js';
import type { Tokens } from 'marked';
import type { ListItemToken, ListToken } from './marked/marked-list.js';
import type { Footnote, FootnoteRef, FootnoteToken } from './marked/marked-footnotes.js';
import { bind } from './utils/bind.js';
import type {
	DescriptionDetailToken,
	DescriptionListToken,
	DescriptionTermToken,
	DescriptionToken
} from './marked/marked-dl.js';

type TokenSnippet = {
	heading: Tokens.Heading;
	paragraph: Tokens.Paragraph;
	blockquote: Tokens.Blockquote;
	code: Tokens.Code;
	codespan: Tokens.Codespan;
	ul: ListToken;
	ol: ListToken;
	li: ListItemToken;
	table: TableToken;
	thead: THead;
	tbody: TBody;
	tfoot: TFoot;
	tr: THeadRow | TRow;
	td: TD;
	th: TH;
	image: Tokens.Image;
	link: Tokens.Link;
	strong: Tokens.Strong;
	em: Tokens.Em;
	del: Tokens.Del;
	hr: Tokens.Hr;
	br: Tokens.Br;
	math: MathToken;
	alert: AlertToken;
	mermaid: Tokens.Code;
	footnoteRef: FootnoteRef;
	footnotePopover: FootnoteToken;
	sup: SubSupToken;
	sub: SubSupToken;
	descriptionList: DescriptionListToken;
	description: DescriptionToken;
	descriptionTerm: DescriptionTermToken;
	descriptionDetail: DescriptionDetailToken;
	inlineCitation: CitationToken;
	inlineCitationPopover: CitationToken;
	inlineCitationContent: CitationToken;
	inlineCitationPreview: CitationToken;
	mdx: MdxToken;
};

type PredefinedElements = keyof TokenSnippet;

export type Snippets<Source extends Record<string, any> = Record<string, any>> = {
	[K in PredefinedElements]?: Snippet<
		[
			{
				children: Snippet;
				token: TokenSnippet[K];
			} & (K extends 'inlineCitationContent'
				? {
						source: Source;
						key: string;
					}
				: K extends 'mdx'
					? {
							props: Record<string, number | string | boolean | null | undefined>;
						}
					: {})
		]
	>;
};

type CompatSnippetKeys<Source extends Record<string, any> = Record<string, any>> = keyof Omit<
	Snippets<Source>,
	'mermaid'
>;

type ComponentOverrideProps<Token> = {
	children?: Snippet;
	token: Token;
	class?: string;
	style?: string;
};

type HeadingComponentProps = ComponentOverrideProps<Tokens.Heading>;
type ParagraphComponentProps = ComponentOverrideProps<Tokens.Paragraph>;
type LinkComponentProps = ComponentOverrideProps<Tokens.Link> & {
	href?: string;
	target?: string;
	rel?: string;
	title?: string | null;
};
type ImageComponentProps = ComponentOverrideProps<Tokens.Image> & {
	src?: string | null;
	alt?: string;
	onload?: () => void;
	onerror?: () => void;
};
type BlockquoteComponentProps = ComponentOverrideProps<Tokens.Blockquote>;
type ListComponentProps = ComponentOverrideProps<ListToken>;
type ListItemComponentProps = ComponentOverrideProps<ListItemToken>;
type TableComponentProps = ComponentOverrideProps<TableToken>;
type TableHeadComponentProps = ComponentOverrideProps<THead>;
type TableBodyComponentProps = ComponentOverrideProps<TBody>;
type TableFootComponentProps = ComponentOverrideProps<TFoot>;
type TableRowComponentProps = ComponentOverrideProps<THeadRow | TRow>;
type TableCellComponentProps = ComponentOverrideProps<TD>;
type TableHeaderCellComponentProps = ComponentOverrideProps<TH>;
type InlineCodeComponentProps = ComponentOverrideProps<Tokens.Codespan>;
type StrongComponentProps = ComponentOverrideProps<Tokens.Strong>;
type EmphasisComponentProps = ComponentOverrideProps<Tokens.Em>;
type DeleteComponentProps = ComponentOverrideProps<Tokens.Del>;
type HrComponentProps = ComponentOverrideProps<Tokens.Hr>;
type BrComponentProps = ComponentOverrideProps<Tokens.Br>;
type SubSupComponentProps = ComponentOverrideProps<SubSupToken>;

export interface MermaidOptions {
	config?: MermaidConfig;
	errorComponent?: Component<MermaidErrorComponentProps, any, any>;
}

export interface IconMap {
	CheckIcon?: Snippet<[]>;
	CopyIcon?: Snippet<[]>;
	DownloadIcon?: Snippet<[]>;
	ExternalLinkIcon?: Snippet<[]>;
	Loader2Icon?: Snippet<[]>;
	Maximize2Icon?: Snippet<[]>;
	RotateCcwIcon?: Snippet<[]>;
	XIcon?: Snippet<[]>;
	ZoomInIcon?: Snippet<[]>;
	ZoomOutIcon?: Snippet<[]>;
	check?: Snippet<[]>;
	copy?: Snippet<[]>;
	download?: Snippet<[]>;
	fullscreen?: Snippet<[]>;
	zoomIn?: Snippet<[]>;
	zoomOut?: Snippet<[]>;
	fitView?: Snippet<[]>;
	note?: Snippet<[]>;
	tip?: Snippet<[]>;
	warning?: Snippet<[]>;
	caution?: Snippet<[]>;
	important?: Snippet<[]>;
	chevronLeft?: Snippet<[]>;
	chevronRight?: Snippet<[]>;
}

export type Components = {
	h1?: Component<HeadingComponentProps, any, any>;
	h2?: Component<HeadingComponentProps, any, any>;
	h3?: Component<HeadingComponentProps, any, any>;
	h4?: Component<HeadingComponentProps, any, any>;
	h5?: Component<HeadingComponentProps, any, any>;
	h6?: Component<HeadingComponentProps, any, any>;
	p?: Component<ParagraphComponentProps, any, any>;
	blockquote?: Component<BlockquoteComponentProps, any, any>;
	a?: Component<LinkComponentProps, any, any>;
	img?: Component<ImageComponentProps, any, any>;
	ul?: Component<ListComponentProps, any, any>;
	ol?: Component<ListComponentProps, any, any>;
	li?: Component<ListItemComponentProps, any, any>;
	table?: Component<TableComponentProps, any, any>;
	thead?: Component<TableHeadComponentProps, any, any>;
	tbody?: Component<TableBodyComponentProps, any, any>;
	tfoot?: Component<TableFootComponentProps, any, any>;
	tr?: Component<TableRowComponentProps, any, any>;
	td?: Component<TableCellComponentProps, any, any>;
	th?: Component<TableHeaderCellComponentProps, any, any>;
	inlineCode?: Component<InlineCodeComponentProps, any, any>;
	strong?: Component<StrongComponentProps, any, any>;
	em?: Component<EmphasisComponentProps, any, any>;
	del?: Component<DeleteComponentProps, any, any>;
	hr?: Component<HrComponentProps, any, any>;
	br?: Component<BrComponentProps, any, any>;
	sub?: Component<SubSupComponentProps, any, any>;
	sup?: Component<SubSupComponentProps, any, any>;
	code?: Component<{ token: Tokens.Code; id: string }, any, any>;
	mermaid?: Component<{ token: Tokens.Code; id: string }, any, any>;
	mermaidError?: Component<MermaidErrorComponentProps, any, any>;
	math?: Component<{ token: MathToken; id: string }, any, any>;
};

export type StreamdownComponents = Components;

export type StreamdownProps<Source extends Record<string, any> = Record<string, any>> = {
	streamdown?: StreamdownContext;
	static?: boolean;
	mode?: 'static' | 'streaming';
	isAnimating?: boolean;
	animated?: boolean | AnimateOptions;
	caret?: keyof typeof carets;
	onAnimationStart?: () => void;
	onAnimationEnd?: () => void;
	BlockComponent?: Component<BlockProps, any, any>;
	parseMarkdownIntoBlocksFn?: (markdown: string) => string[];
	dir?: 'auto' | 'ltr' | 'rtl';
	sources?: {
		[key: string]: Source;
	};
	// Default mode is carousel
	inlineCitationsMode?: 'list' | 'carousel';
	element?: HTMLElement;
	content: string;
	class?: string;
	className?: string;
	parseIncompleteMarkdown?: boolean;
	remend?: RemendOptions;
	// Security props
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];
	linkSafety?: LinkSafetyConfig;
	allowedTags?: AllowedTags;
	allowedElements?: readonly string[];
	allowElement?: AllowElement;
	disallowedElements?: readonly string[];
	literalTagContent?: string[];
	normalizeHtmlIndentation?: boolean;
	skipHtml?: boolean;
	unwrapDisallowed?: boolean;
	urlTransform?: UrlTransform;
	prefix?: string;
	lineNumbers?: boolean;

	// Theme
	theme?: DeepPartialTheme;
	baseTheme?: 'tailwind' | 'shadcn';
	mergeTheme?: boolean;
	shikiTheme?: ThemeInput | [ThemeInput, ThemeInput];
	shikiLanguages?: LanguageInfo[];
	shikiThemes?: Record<string, ThemeRegistration>;
	mermaid?: MermaidOptions;
	mermaidConfig?: MermaidConfig;
	katexConfig?: KatexOptions | ((inline: boolean) => KatexOptions);
	plugins?: PluginConfig;
	translations?: Partial<StreamdownTranslations>;
	controls?: ControlsConfig;
	renderHtml?: boolean | ((token: Tokens.HTML | Tokens.Tag) => string);
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
	extensions?: Extension[];
	children?: Snippet<[{ streamdown: StreamdownContext; token: GenericToken; children: Snippet }]>;
	mdxComponents?: Record<
		string,
		Component<
			{
				token: MdxToken;
				children: Snippet;
				props: any;
			},
			any,
			any
		>
	>;
	components?: Components;
} & Partial<Omit<Snippets<Source>, 'mermaid'>>;

export type MermaidControls =
	| boolean
	| {
			download?: boolean;
			fullscreen?: boolean;
			panZoom?: boolean;
			mouseWheelZoom?: boolean;
	  };

export type NormalizedMermaidControls = {
	enabled: boolean;
	download: boolean;
	fullscreen: boolean;
	panZoom: boolean;
	mouseWheelZoom: boolean;
};

export type MermaidErrorComponentProps = {
	chart: string;
	error: string;
	id: string;
	retry: () => void;
};

export const normalizeMermaidControls = (
	controls: MermaidControls | undefined
): NormalizedMermaidControls => {
	if (controls === false) {
		return {
			enabled: false,
			download: false,
			fullscreen: false,
			panZoom: false,
			mouseWheelZoom: false
		};
	}

	if (controls === true || controls === undefined) {
		return {
			enabled: true,
			download: true,
			fullscreen: true,
			panZoom: true,
			mouseWheelZoom: true
		};
	}

	const panZoom = controls.panZoom !== false;

	return {
		enabled: true,
		download: controls.download !== false,
		fullscreen: controls.fullscreen !== false,
		panZoom,
		mouseWheelZoom: panZoom && controls.mouseWheelZoom !== false
	};
};
