import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export type CnFunction = (...inputs: ClassValue[]) => string;
import type { Snippets } from './context.svelte.js';

export const prefixClasses = (prefix: string, classString: string): string => {
	if (!prefix || !classString) return classString;

	const prefixWithColon = `${prefix}:`;
	return classString
		.split(/\s+/)
		.filter(Boolean)
		.map((className) =>
			className.startsWith(prefixWithColon) ? className : `${prefix}:${className}`
		)
		.join(' ');
};

export const createCn = (prefix?: string): CnFunction => {
	if (!prefix) {
		return cn;
	}

	return (...inputs: ClassValue[]) => prefixClasses(prefix, twMerge(clsx(inputs)));
};

export const prefixThemeClasses = <T>(prefix: string | undefined, value: T): T => {
	if (!prefix) {
		return value;
	}

	if (typeof value === 'string') {
		return prefixClasses(prefix, value) as T;
	}

	if (Array.isArray(value)) {
		return value.map((entry) => prefixThemeClasses(prefix, entry)) as T;
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, prefixThemeClasses(prefix, entry)])
		) as T;
	}

	return value;
};

export const theme = {
	link: {
		base: 'text-primary font-medium underline wrap-anywhere hover:text-primary/80',
		blocked: 'text-muted-foreground'
	},
	h1: {
		base: 'mt-6 mb-2 text-3xl font-semibold text-foreground'
	},
	h2: {
		base: 'mt-6 mb-2 text-2xl font-semibold text-foreground'
	},
	h3: {
		base: 'mt-6 mb-2 text-xl font-semibold text-foreground'
	},
	h4: {
		base: 'mt-6 mb-2 text-lg font-semibold text-foreground'
	},
	h5: {
		base: 'mt-6 mb-2 text-base font-semibold text-foreground'
	},
	h6: {
		base: 'mt-6 mb-2 text-sm font-semibold text-foreground'
	},
	paragraph: {
		base: 'text-foreground'
	},
	ul: {
		base: 'ml-4 list-outside list-disc whitespace-normal text-foreground'
	},
	ol: {
		base: 'ml-4 list-outside whitespace-normal text-foreground'
	},
	li: {
		base: 'py-1 marker:hidden',
		checkbox: ' mr-2'
	},
	code: {
		base: 'my-4 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-sidebar',
		container: 'relative overflow-visible bg-background p-2 font-mono text-sm',
		header: 'flex h-8 items-center justify-between text-xs text-muted-foreground',
		actions: 'pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end',
		buttons:
			'pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-background/90 px-1.5 py-1 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur',
		language: 'ml-1 font-mono lowercase',
		skeleton:
			'block rounded-md bg-border/80 font-mono text-transparent scale-y-90 animate-pulse whitespace-nowrap',
		pre: 'overflow-x-auto bg-[var(--sdm-bg,inherit)] p-0 font-mono dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit))]',
		line: 'block'
	},
	codespan: {
		base: 'rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground'
	},
	image: {
		base: 'group relative my-4  mx-auto w-fit block',
		image: 'max-w-full rounded-lg'
	},
	blockquote: {
		base: 'my-4 border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground'
	},
	alert: {
		base: ' relative my-4 border-l-4 p-4',
		title: 'text-sm font-semibold flex items-center gap-2 mb-2 capitalize',
		icon: 'size-5',
		note: '[&>[data-alert-title]]:text-blue-600 border-blue-600 stroke-blue-600',
		tip: '[&>[data-alert-title]]:text-green-600 border-green-600 stroke-green-600',
		warning: '[&>[data-alert-title]]:text-yellow-600 border-yellow-600 stroke-yellow-600',
		caution: '[&>[data-alert-title]]:text-red-600 border-red-600 stroke-red-600',
		important: '[&>[data-alert-title]]:text-purple-600 border-purple-600 stroke-purple-600'
	},
	table: {
		base: '',
		wrapper: 'my-4 flex flex-col gap-2 rounded-xl border border-border bg-background p-2 shadow-sm',
		toolbar:
			'ml-auto flex w-fit items-center justify-end gap-1 rounded-md border border-border bg-muted/80 px-1.5 py-1',
		container: 'max-w-full overflow-x-auto rounded-md border border-border bg-background',
		table: 'w-full border-collapse min-w-full'
	},
	thead: {
		base: 'bg-muted/80'
	},
	tbody: {
		base: ''
	},
	tfoot: {
		base: 'border-t border-border bg-muted/50'
	},
	tr: {
		base: 'border-b border-border transition-colors hover:bg-muted/50'
	},
	td: {
		base: 'min-w-[200px] max-w-[400px] break-words px-4 py-3 text-sm text-foreground'
	},
	th: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
	},
	sup: {
		base: 'text-sm'
	},
	sub: {
		base: 'text-sm'
	},
	hr: {
		base: 'my-6 border-border'
	},
	strong: {
		base: 'font-semibold text-foreground'
	},
	mermaid: {
		base: 'group relative my-4 h-auto min-h-[500px] items-center overflow-hidden rounded-xl border border-border bg-background',
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 flex h-fit w-fit items-center gap-1'
	},
	math: {
		block: 'text-foreground',
		inline: 'text-foreground'
	},
	br: {
		base: ''
	},
	em: {
		base: 'italic'
	},
	del: {
		base: 'text-muted-foreground'
	},
	footnoteRef: {
		base: 'rounded-md bg-muted/80 px-1 py-0.5 text-muted-foreground'
	},
	descriptionList: {
		base: 'my-4 space-y-2'
	},
	descriptionTerm: {
		base: 'border-l-2 border-border pl-4 font-semibold text-foreground'
	},
	descriptionDetail: {
		base: 'ml-4 leading-relaxed text-muted-foreground'
	},
	inlineCitation: {
		preview:
			'text-sm text-muted-foreground bg-muted rounded-md px-2 py-0.5 cursor-pointer inline-flex border border-border hover:bg-muted/50 outline-none focus:ring-1 focus:ring-primary',

		carousel: {
			header: 'flex items-center justify-between',
			stepCounter: 'h-fit text-xs font-semibold text-muted-foreground tabular-nums',
			buttons: 'flex w-fit items-center justify-end gap-2',
			title: 'mb-2 line-clamp-2 font-semibold',
			url: 'flex items-center gap-2 text-sm text-muted-foreground',
			favicon: 'h-4 w-4 rounded'
		},
		list: {
			base: 'grid gap-2',
			item: 'grid gap-1 hover:bg-muted rounded-md p-2',
			title: 'line-clamp-1 font-semibold text-sm',
			url: 'flex items-center gap-2 text-xs text-muted-foreground',
			favicon: 'h-3 w-3 rounded'
		}
	},
	mdx: {},

	components: {
		button:
			'h-6 w-6 rounded p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
		popover:
			'fixed z-[1000] max-h-md min-w-[250px] max-w-md overflow-y-auto rounded-lg bg-background p-4 text-foreground shadow'
	}
} satisfies Record<
	| keyof Omit<
			Snippets,
			| 'description'
			| 'heading'
			| 'footnotePopover'
			| 'inlineCitationContent'
			| 'inlineCitationPreview'
			| 'inlineCitationPopover'
	  >
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'components',
	any
>;

export const shadcnTheme = {
	link: {
		base: 'text-primary wrap-anywhere  font-medium underline hover:text-primary/80',
		blocked: 'text-muted-foreground'
	},
	h1: {
		base: 'mt-6 mb-2 text-3xl font-semibold text-foreground'
	},
	h2: {
		base: 'mt-6 mb-2 text-2xl font-semibold text-foreground'
	},
	h3: {
		base: 'mt-6 mb-2 text-xl font-semibold text-foreground'
	},
	h4: {
		base: 'mt-6 mb-2 text-lg font-semibold text-foreground'
	},
	h5: {
		base: 'mt-6 mb-2 text-base font-semibold text-foreground'
	},
	h6: {
		base: 'mt-6 mb-2 text-sm font-semibold text-foreground'
	},
	paragraph: {
		base: 'text-foreground'
	},
	ul: {
		base: 'ml-4 list-outside list-disc whitespace-normal text-foreground'
	},
	ol: {
		base: 'ml-4 list-outside whitespace-normal text-foreground'
	},
	li: {
		base: 'py-1',
		checkbox: ' mr-2'
	},
	code: {
		base: 'my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2',
		container: 'overflow-x-auto rounded-md border border-border bg-background p-4 text-sm',
		header: 'flex h-8 items-center justify-between text-muted-foreground text-xs',
		actions: 'pointer-events-none sticky top-2 z-10 -mt-10 flex h-8 items-center justify-end',
		buttons:
			'pointer-events-auto flex shrink-0 items-center gap-2 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur',

		language: 'ml-1 font-mono lowercase',
		skeleton:
			'block rounded-md font-mono text-transparent bg-border/80 scale-y-90 w-fit animate-pulse whitespace-nowrap',
		pre: 'overflow-x-auto bg-[var(--sdm-bg,inherit)] p-0 font-mono dark:bg-[var(--shiki-dark-bg,var(--sdm-bg,inherit))]',
		line: 'block '
	},
	codespan: {
		base: 'bg-muted rounded px-1.5 py-0.5 font-mono text-foreground text-[0.9em]'
	},
	image: {
		base: 'group relative my-4 mx-auto w-fit block',
		image: 'max-w-full rounded-lg'
	},

	blockquote: {
		base: 'border-muted-foreground/30 text-muted-foreground my-4 border-l-4 pl-4 italic'
	},
	alert: {
		base: 'relative my-4 border-l-4 p-4 bg-card',
		title: 'text-sm font-semibold flex items-center gap-2 mb-2 capitalize',
		icon: 'size-5',
		note: '[&>[data-alert-title]]:text-blue-600 border-blue-600 stroke-blue-600',
		tip: '[&>[data-alert-title]]:text-green-600 border-green-600 stroke-green-600',
		warning: '[&>[data-alert-title]]:text-yellow-600 border-yellow-600 stroke-yellow-600',
		caution: '[&>[data-alert-title]]:text-destructive border-destructive stroke-destructive',
		important: '[&>[data-alert-title]]:text-purple-600 border-purple-600 stroke-purple-600'
	},
	table: {
		base: '',
		wrapper: 'my-4 flex flex-col gap-2 rounded-xl border border-border bg-sidebar p-2',
		toolbar:
			'ml-auto flex w-fit items-center justify-end gap-1 rounded-md border border-sidebar bg-sidebar/80 px-1.5 py-1 supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur',
		container: 'overflow-x-auto max-w-full rounded-md border border-border bg-background',
		table: 'w-full border-collapse min-w-full'
	},
	thead: {
		base: 'bg-muted/80'
	},
	tbody: {
		base: ''
	},
	tfoot: {
		base: 'bg-muted/50 border-t border-border'
	},
	tr: {
		base: 'border-border border-b hover:bg-muted/50 transition-colors'
	},
	td: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
	},
	th: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
	},
	sup: {
		base: 'text-sm'
	},
	sub: {
		base: 'text-sm'
	},
	hr: {
		base: 'border-border my-6'
	},
	strong: {
		base: 'font-semibold text-foreground'
	},
	mermaid: {
		base: 'group relative my-4 h-auto rounded-lg border border-border bg-card overflow-hidden items-center min-h-[500px]',
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 flex h-fit w-fit items-center gap-1'
	},
	math: {
		block: 'text-foreground',
		inline: 'text-foreground'
	},
	br: {
		base: ''
	},
	em: {
		base: 'italic'
	},
	del: {
		base: 'text-muted-foreground'
	},
	footnoteRef: {
		base: 'text-muted-foreground text-sm  rounded-full bg-muted cursor-pointer border border-border hover:bg-muted/50 tabular-nums min-w-5 min-h-5 outline-none focus:ring-1 focus:ring-primary'
	},
	descriptionList: {
		base: 'my-4 space-y-2'
	},
	descriptionTerm: {
		base: 'font-semibold text-foreground border-l-2 border-border pl-4'
	},
	descriptionDetail: {
		base: 'text-muted-foreground ml-4 leading-relaxed'
	},
	inlineCitation: {
		preview:
			'text-sm text-muted-foreground bg-muted rounded-md px-2 py-0.5 cursor-pointer inline-flex border border-border hover:bg-muted/50 outline-none focus:ring-1 focus:ring-primary',

		carousel: {
			header: 'flex items-center justify-between',
			stepCounter: 'h-fit text-xs font-semibold text-muted-foreground tabular-nums',
			buttons: 'flex w-fit items-center justify-end gap-2',
			title: 'mb-2 line-clamp-2 font-semibold',
			url: 'flex items-center gap-2 text-sm text-muted-foreground',
			favicon: 'h-4 w-4 rounded'
		},
		list: {
			base: 'grid gap-2',
			item: 'grid gap-1 hover:bg-muted rounded-md p-2',
			title: 'line-clamp-1 font-semibold text-sm',
			url: 'flex items-center gap-2 text-xs text-muted-foreground',
			favicon: 'h-3 w-3 rounded'
		}
	},
	mdx: {},
	components: {
		button:
			'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground rounded hover:bg-border flex items-center justify-center w-6 h-6',
		popover:
			'min-w-[250px] max-w-md fixed z-[1000] max-h-md overflow-y-auto rounded-lg bg-popover border border-border p-2 shadow'
	}
} satisfies Theme;

export type Theme = typeof theme;

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type DeepPartialTheme = DeepPartial<Theme>;

export const mergeTheme = (customTheme?: DeepPartialTheme, baseTheme?: 'tailwind' | 'shadcn') => {
	const base = baseTheme === 'shadcn' ? shadcnTheme : theme;
	if (!customTheme) return base;
	const mergedTheme = { ...base };
	for (const key in customTheme) {
		const origGroup = (mergedTheme as any)[key as keyof Theme] as
			| Record<string, ClassValue>
			| undefined;
		const customGroup = (customTheme as any)[key as keyof Theme] as
			| Record<string, ClassValue>
			| undefined;
		if (!origGroup || !customGroup) continue;
		const mergedGroup: Record<string, ClassValue> = { ...origGroup };
		for (const subKey of Object.keys(customGroup)) {
			const baseVal = origGroup[subKey as keyof typeof origGroup];
			const customVal = customGroup[subKey as keyof typeof customGroup];
			mergedGroup[subKey] = cn(baseVal as ClassValue, customVal as ClassValue);
		}
		(mergedTheme as any)[key] = mergedGroup;
	}
	return mergedTheme;
};
