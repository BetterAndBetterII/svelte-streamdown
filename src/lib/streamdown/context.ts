import { StreamdownContext } from '../context.svelte.js';

type Getter<T> = () => T;

export type StreamdownRuntimeContextArgs<Source extends Record<string, any>> = {
	element: Getter<HTMLElement | undefined>;
	content: Getter<string>;
	parseIncompleteMarkdown: Getter<boolean>;
	parseMarkdownIntoBlocksFn: Getter<((markdown: string) => string[]) | undefined>;
	mode: Getter<'static' | 'streaming'>;
	dir: Getter<'auto' | 'ltr' | 'rtl' | undefined>;
	defaultOrigin: Getter<string | undefined>;
	allowedLinkPrefixes: Getter<string[]>;
	allowedImagePrefixes: Getter<string[]>;
	linkSafety: Getter<unknown>;
	allowedTags: Getter<Record<string, string[]> | undefined>;
	allowedElements: Getter<readonly string[] | undefined>;
	allowElement: Getter<unknown>;
	disallowedElements: Getter<readonly string[] | undefined>;
	literalTagContent: Getter<string[] | undefined>;
	normalizeHtmlIndentation: Getter<boolean>;
	skipHtml: Getter<boolean | undefined>;
	unwrapDisallowed: Getter<boolean | undefined>;
	urlTransform: Getter<unknown>;
	prefix: Getter<string | undefined>;
	lineNumbers: Getter<boolean>;
	shikiTheme: Getter<string>;
	snippets: Getter<Record<string, unknown>>;
	theme: Getter<unknown>;
	baseTheme: Getter<'tailwind' | 'shadcn' | undefined>;
	mermaidConfig: Getter<Record<string, unknown>>;
	mermaid: Getter<unknown>;
	katexConfig: Getter<unknown>;
	plugins: Getter<unknown>;
	renderHtml: Getter<any>;
	translations: Getter<unknown>;
	shikiLanguages: Getter<unknown>;
	shikiThemes: Getter<Record<string, unknown>>;
	sources: Getter<Record<string, Source> | undefined>;
	inlineCitationsMode: Getter<'list' | 'carousel'>;
	animation: Getter<unknown>;
	isAnimating: Getter<boolean>;
	animated: Getter<unknown>;
	caret: Getter<unknown>;
	onAnimationStart: Getter<(() => void) | undefined>;
	onAnimationEnd: Getter<(() => void) | undefined>;
	controls: Getter<unknown>;
	codeControls: Getter<unknown>;
	children: Getter<unknown>;
	extensions: Getter<unknown>;
	icons: Getter<unknown>;
	mdxComponents: Getter<unknown>;
	components: Getter<unknown>;
};

export const createStreamdownRuntimeContext = <Source extends Record<string, any>>(
	args: StreamdownRuntimeContextArgs<Source>
) =>
	new StreamdownContext<Source>({
		get element() {
			return args.element();
		},
		get content() {
			return args.content();
		},
		get parseIncompleteMarkdown() {
			return args.parseIncompleteMarkdown();
		},
		get parseMarkdownIntoBlocksFn() {
			return args.parseMarkdownIntoBlocksFn();
		},
		get mode() {
			return args.mode();
		},
		get dir() {
			return args.dir();
		},
		get defaultOrigin() {
			return args.defaultOrigin();
		},
		get allowedLinkPrefixes() {
			return args.allowedLinkPrefixes();
		},
		get allowedImagePrefixes() {
			return args.allowedImagePrefixes();
		},
		get linkSafety() {
			return args.linkSafety();
		},
		get allowedTags() {
			return args.allowedTags();
		},
		get allowedElements() {
			return args.allowedElements();
		},
		get allowElement() {
			return args.allowElement();
		},
		get disallowedElements() {
			return args.disallowedElements();
		},
		get literalTagContent() {
			return args.literalTagContent();
		},
		get normalizeHtmlIndentation() {
			return args.normalizeHtmlIndentation();
		},
		get skipHtml() {
			return args.skipHtml();
		},
		get unwrapDisallowed() {
			return args.unwrapDisallowed();
		},
		get urlTransform() {
			return args.urlTransform();
		},
		get prefix() {
			return args.prefix();
		},
		get lineNumbers() {
			return args.lineNumbers();
		},
		get shikiTheme() {
			return args.shikiTheme();
		},
		get snippets() {
			return args.snippets();
		},
		get theme() {
			return args.theme();
		},
		get baseTheme() {
			return args.baseTheme();
		},
		get mermaidConfig() {
			return args.mermaidConfig();
		},
		get mermaid() {
			return args.mermaid();
		},
		get katexConfig() {
			return args.katexConfig();
		},
		get plugins() {
			return args.plugins();
		},
		get renderHtml() {
			return args.renderHtml();
		},
		get translations() {
			return args.translations();
		},
		get shikiLanguages() {
			return args.shikiLanguages();
		},
		get shikiThemes() {
			return args.shikiThemes();
		},
		get sources() {
			return args.sources();
		},
		get inlineCitationsMode() {
			return args.inlineCitationsMode();
		},
		get animation() {
			return args.animation();
		},
		get isAnimating() {
			return args.isAnimating();
		},
		get animated() {
			return args.animated();
		},
		get caret() {
			return args.caret();
		},
		get onAnimationStart() {
			return args.onAnimationStart();
		},
		get onAnimationEnd() {
			return args.onAnimationEnd();
		},
		get controls() {
			return args.controls();
		},
		get codeControls() {
			return args.codeControls();
		},
		get children() {
			return args.children();
		},
		get extensions() {
			return args.extensions();
		},
		get icons() {
			return args.icons();
		},
		get mdxComponents() {
			return args.mdxComponents();
		},
		get components() {
			return args.components();
		}
	} as any);
