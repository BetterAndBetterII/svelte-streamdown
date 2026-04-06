import { getContext, setContext, type Snippet } from 'svelte';
import type { IconMap } from './context.svelte.js';

export type { IconMap } from './context.svelte.js';
export {
	checkIcon,
	chevronLeft,
	chevronRight,
	copyIcon,
	downloadIcon,
	fitViewIcon,
	fullscreenIcon,
	resolveIcon,
	type IconSnippet,
	type ResolvedIconName,
	zoomInIcon,
	zoomOutIcon
} from './Elements/icons.js';
import {
	checkIcon,
	chevronLeft,
	chevronRight,
	copyIcon,
	downloadIcon,
	fitViewIcon,
	fullscreenIcon,
	resolveIcon,
	zoomInIcon,
	zoomOutIcon
} from './Elements/icons.js';

const ICON_CONTEXT_KEY = Symbol('streamdown.icons');

type IconContextGetter = {
	getValue: () => IconMap;
};

const defaultIcons = {
	CheckIcon: checkIcon,
	CopyIcon: copyIcon,
	DownloadIcon: downloadIcon,
	Maximize2Icon: fullscreenIcon,
	RotateCcwIcon: fitViewIcon,
	ZoomInIcon: zoomInIcon,
	ZoomOutIcon: zoomOutIcon,
	check: checkIcon,
	copy: copyIcon,
	download: downloadIcon,
	fullscreen: fullscreenIcon,
	zoomIn: zoomInIcon,
	zoomOut: zoomOutIcon,
	fitView: fitViewIcon,
	chevronLeft,
	chevronRight
} satisfies IconMap;

const mergeIcons = (icons: Partial<IconMap> | undefined): IconMap => ({
	...defaultIcons,
	...(icons ?? {})
});

const defaultIconGetter: IconContextGetter = {
	getValue: () => defaultIcons
};

export { defaultIcons };
export type IconComponent = Snippet<[]>;

export const IconContext = {
	key: ICON_CONTEXT_KEY,
	provide(getValue: () => Partial<IconMap> | undefined): IconContextGetter {
		const value = {
			getValue: () => mergeIcons(getValue())
		};
		setContext(ICON_CONTEXT_KEY, value);
		return value;
	},
	set(icons: Partial<IconMap> | undefined): IconContextGetter {
		return this.provide(() => icons);
	},
	get(): IconMap {
		return (getContext<IconContextGetter>(ICON_CONTEXT_KEY) ?? defaultIconGetter).getValue();
	}
};

export function useIcons(): IconMap {
	return IconContext.get();
}

export function resolveProvidedIcon(name: Parameters<typeof resolveIcon>[1], fallback: Snippet<[]>) {
	return resolveIcon(useIcons(), name, fallback);
}
