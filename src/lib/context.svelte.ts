import type { Component, Snippet, SvelteComponent } from 'svelte';
import type { DeepPartialTheme, Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import { getContext, onMount, setContext } from 'svelte';
import type { LanguageInfo } from './utils/bundledLanguages.js';
import type { ThemeRegistration } from 'shiki';
import type { StreamdownTranslations } from './translations.js';
import type { AllowedTags } from './security/types.js';

export type { AllowedTags } from './security/types.js';

export interface AnimateOptions {
	animation?: 'fadeIn' | 'blurIn' | 'slideUp' | (string & {});
	duration?: number;
	easing?: string;
	sep?: 'word' | 'char';
	stagger?: number;
}

export interface LinkSafetyModalProps {
	href: string;
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
}

export interface LinkSafetyConfig {
	enabled?: boolean;
	onLinkCheck?: (href: string) => boolean | Promise<boolean>;
	renderModal?: (props: LinkSafetyModalProps) => unknown;
}

export interface StreamdownContext
	extends Omit<
		StreamdownProps,
		keyof Snippets | 'class' | 'theme' | 'shikiTheme' | 'inlineCitationsMode' | 'translations'
	> {
	snippets: Snippets;
	shikiTheme: string;
	theme: Theme;
	translations: StreamdownTranslations;
	controls: {
		code: boolean;
		mermaid: boolean;
		table: TableControlsConfig;
	};
	inlineCitationsMode: 'list' | 'carousel';
	animation: {
		enabled: boolean;
	} & StreamdownProps['animation'];
}
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
				? `animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
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
				? `animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
animation-iteration-count: 1;
animation-fill-mode: forwards;`
				: undefined;
	}

	constructor(
		props: Omit<StreamdownProps, keyof Snippets | 'class'> & { snippets: Snippets<Source> }
	) {
		bind(this, props);
		setContext('streamdown', this);
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
export const useStreamdown = () => {
	const context = getContext<StreamdownContext>('streamdown');
	if (!context) {
		throw new Error('Streamdown context not found');
	}
	return context;
};

export type TableControlsConfig =
	| boolean
	| {
			copy?: boolean;
			download?: boolean;
			fullscreen?: boolean;
	  };

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
type TableComponentProps = ComponentOverrideProps<TableToken>;
type InlineCodeComponentProps = ComponentOverrideProps<Tokens.Codespan>;

export type StreamdownComponents = {
	h1?: Component<HeadingComponentProps, any, any>;
	h2?: Component<HeadingComponentProps, any, any>;
	h3?: Component<HeadingComponentProps, any, any>;
	h4?: Component<HeadingComponentProps, any, any>;
	h5?: Component<HeadingComponentProps, any, any>;
	h6?: Component<HeadingComponentProps, any, any>;
	p?: Component<ParagraphComponentProps, any, any>;
	a?: Component<LinkComponentProps, any, any>;
	img?: Component<ImageComponentProps, any, any>;
	table?: Component<TableComponentProps, any, any>;
	inlineCode?: Component<InlineCodeComponentProps, any, any>;
	code?: Component<{ token: Tokens.Code; id: string }, any, any>;
	mermaid?: Component<{ token: Tokens.Code; id: string }, any, any>;
	math?: Component<{ token: MathToken; id: string }, any, any>;
};

export type StreamdownProps<Source extends Record<string, any> = Record<string, any>> = {
	mode?: 'static' | 'streaming';
	dir?: 'auto' | 'ltr' | 'rtl';
	streamdown?: StreamdownContext;
	static?: boolean;
	sources?: {
		[key: string]: Source;
	};
	// Default mode is carousel
	inlineCitationsMode?: 'list' | 'carousel';
	element?: HTMLElement;
	content: string;
	class?: string;
	parseIncompleteMarkdown?: boolean;
	// Security props
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];
	linkSafety?: LinkSafetyConfig;
	allowedTags?: AllowedTags;
	literalTagContent?: string[];
	prefix?: string;
	lineNumbers?: boolean;

	// Theme
	theme?: DeepPartialTheme;
	baseTheme?: 'tailwind' | 'shadcn';
	mergeTheme?: boolean;
	shikiTheme?: string;
	shikiLanguages?: LanguageInfo[];
	shikiThemes?: Record<string, ThemeRegistration>;
	mermaidConfig?: MermaidConfig;
	katexConfig?: KatexOptions | ((inline: boolean) => KatexOptions);
	translations?: Partial<StreamdownTranslations>;
	controls?: {
		code?: boolean;
		mermaid?: boolean;
		table?: TableControlsConfig;
	};
	renderHtml?: boolean | ((token: Tokens.HTML | Tokens.Tag) => string);
	isAnimating?: boolean;
	animated?: boolean | AnimateOptions;
	caret?: 'block' | 'circle';
	onAnimationStart?: () => void;
	onAnimationEnd?: () => void;

	animation?: {
		animateOnMount?: boolean;
		enabled?: boolean;
		type?: 'fade' | 'blur' | 'slideUp' | 'slideDown';
		duration?: number;
		timingFunction?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
		tokenize?: 'word' | 'char';
	};
	icons?: {
		copy?: Snippet;
		download?: Snippet;
		fullscreen?: Snippet;
		zoomIn?: Snippet;
		zoomOut?: Snippet;
		fitView?: Snippet;
		note?: Snippet;
		tip?: Snippet;
		warning?: Snippet;
		caution?: Snippet;
		important?: Snippet;
		chevronLeft?: Snippet;
		chevronRight?: Snippet;
		check?: Snippet;
	};
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
	components?: StreamdownComponents;
} & Partial<Snippets<Source>>;
