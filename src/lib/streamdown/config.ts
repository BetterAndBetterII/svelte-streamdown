import {
	normalizeMermaidControls,
	type ResolvedAnimationConfig,
	type StreamdownProps
} from '../context.svelte.js';
import { getThemeName, type ThemeInput } from '../plugins.js';
import { createCn, mergeTheme, prefixThemeClasses, shadcnTheme } from '../theme.js';

const animationNameMap = {
	blurIn: 'blur',
	fadeIn: 'fade',
	slideUp: 'slideUp'
} as const;

export const defaultLinkSafetyConfig = {
	enabled: true
} as const;

export const defaultShikiTheme: [ThemeInput, ThemeInput] = ['github-light', 'github-dark'];

export const footnoteDefinitionPattern = /\[\^[\w-]{1,200}\]:/;

export const resolveShikiThemePair = <Source extends Record<string, any>>(
	theme: StreamdownProps<Source>['shikiTheme'] | undefined
): [ThemeInput, ThemeInput] => {
	if (Array.isArray(theme)) {
		return [theme[0] ?? defaultShikiTheme[0], theme[1] ?? theme[0] ?? defaultShikiTheme[1]];
	}

	if (theme) {
		return [theme, theme];
	}

	return defaultShikiTheme;
};

export const collectThemeRegistrations = (
	themes: [ThemeInput, ThemeInput]
): Record<string, import('shiki').ThemeRegistration> =>
	Object.fromEntries(
		themes
			.filter((theme): theme is Exclude<ThemeInput, string> => typeof theme !== 'string')
			.map((theme) => [getThemeName(theme), theme])
	);

export const resolveCompatAnimation = <Source extends Record<string, any>>(
	animated: StreamdownProps<Source>['animated'],
	isAnimating: boolean,
	mode: 'static' | 'streaming'
): ResolvedAnimationConfig => {
	if (!animated || !isAnimating || mode === 'static') {
		return {
			enabled: false
		};
	}

	if (animated === true) {
		return {
			enabled: true,
			animateOnMount: true,
			type: 'fade',
			duration: 150,
			timingFunction: 'ease',
			tokenize: 'word',
			stagger: 40
		};
	}

	const animationName =
		(typeof animated.animation === 'string' && animated.animation.length > 0
			? (animationNameMap[animated.animation as keyof typeof animationNameMap] ??
				animated.animation)
			: undefined) ?? 'fade';
	const timingFunction =
		typeof animated.easing === 'string' && animated.easing.trim().length > 0
			? animated.easing
			: 'ease';

	return {
		enabled: true,
		animateOnMount: true,
		type: animationName,
		duration: animated.duration ?? 150,
		timingFunction,
		tokenize: animated.sep ?? 'word',
		stagger: animated.stagger ?? 40
	};
};

export const resolveControls = <Source extends Record<string, any>>(
	controls: StreamdownProps<Source>['controls']
) => {
	if (controls === false) {
		return {
			controls: {
				code: false,
				mermaid: normalizeMermaidControls(false),
				table: false
			},
			codeControls: {
				copy: false,
				download: false
			}
		};
	}

	const codeControls = controls === true || controls === undefined ? true : (controls.code ?? true);
	const tableControls =
		controls === true || controls === undefined ? true : (controls.table ?? true);
	const mermaidControls =
		controls === true || controls === undefined ? undefined : controls.mermaid;

	return {
		controls: {
			code: codeControls !== false,
			mermaid: normalizeMermaidControls(mermaidControls),
			table: tableControls
		},
		codeControls:
			codeControls === false
				? {
						copy: false,
						download: false
					}
				: codeControls === true
					? {
							copy: true,
							download: true
						}
					: {
							copy: codeControls.copy ?? true,
							download: codeControls.download ?? true
						}
	};
};

export const resolveAnimationConfig = <Source extends Record<string, any>>({
	animation,
	animated,
	isAnimating,
	mode
}: {
	animation: StreamdownProps<Source>['animation'];
	animated: StreamdownProps<Source>['animated'];
	isAnimating: boolean;
	mode: 'static' | 'streaming';
}): ResolvedAnimationConfig => {
	if (animation) {
		if (!animation.enabled) {
			return {
				enabled: false
			};
		}

		return {
			enabled: true,
			animateOnMount: animation.animateOnMount ?? false,
			type: animation.type || 'blur',
			duration: animation.duration ?? 500,
			timingFunction: animation.timingFunction || 'ease-in',
			tokenize: animation.tokenize || 'word',
			stagger: animation.stagger ?? 0
		};
	}

	return resolveCompatAnimation(animated, isAnimating, mode);
};

export const resolveThemeClassMap = <Source extends Record<string, any>>({
	theme,
	baseTheme,
	shouldMergeTheme,
	prefix
}: {
	theme: StreamdownProps<Source>['theme'];
	baseTheme: StreamdownProps<Source>['baseTheme'];
	shouldMergeTheme: boolean;
	prefix: string | undefined;
}) => {
	const mergedTheme = shouldMergeTheme
		? mergeTheme(theme, baseTheme)
		: theme || (baseTheme === 'shadcn' ? shadcnTheme : theme);

	return prefixThemeClasses(prefix, mergedTheme);
};

export const resolveRootClassName = ({
	className,
	futureClassName,
	prefix,
	shouldShowCaret,
	shouldHideCaret
}: {
	className: string | undefined;
	futureClassName: string | undefined;
	prefix: string | undefined;
	shouldShowCaret: boolean;
	shouldHideCaret: boolean;
}) =>
	createCn(prefix)(
		'whitespace-normal',
		[className, futureClassName].filter((value): value is string => Boolean(value)).join(' '),
		shouldShowCaret &&
			!shouldHideCaret &&
			'[&>*:last-child]:after:inline [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-[var(--streamdown-caret)]'
	);
