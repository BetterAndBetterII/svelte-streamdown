export const parseUrl = (url: unknown, defaultOrigin?: string): URL | null => {
	if (typeof url !== 'string') return null;

	try {
		// Try to parse as absolute URL first
		const urlObject = new URL(url);
		return urlObject;
	} catch (error) {
		// If that fails and we have a defaultOrigin, try with it
		if (defaultOrigin) {
			try {
				const urlObject = new URL(url, defaultOrigin);
				return urlObject;
			} catch (error) {
				return null;
			}
		}
		return null;
	}
};

export const isPathRelativeUrl = (url: unknown): boolean => {
	if (typeof url !== 'string') return false;
	return (
		(url.startsWith('/') && !url.startsWith('//')) ||
		url.startsWith('./') ||
		url.startsWith('../') ||
		url.startsWith('#') ||
		url.startsWith('?')
	);
};

export type UrlPolicyKind = 'image' | 'link';

export type TransformUrlOptions = {
	kind?: UrlPolicyKind;
};

const WILDCARD_PROTOCOLS = {
	link: new Set(['http:', 'https:', 'mailto:', 'tel:']),
	image: new Set(['http:', 'https:'])
} satisfies Record<UrlPolicyKind, Set<string>>;

function isAllowedByWildcard(url: URL, kind: UrlPolicyKind): boolean {
	if (WILDCARD_PROTOCOLS[kind].has(url.protocol)) {
		return true;
	}

	return kind === 'image' && url.protocol === 'data:' && /^data:image\//i.test(url.href);
}

export const transformUrl = (
	url: unknown,
	allowedPrefixes: string[],
	defaultOrigin?: string,
	{ kind = 'link' }: TransformUrlOptions = {}
): string | null => {
	if (!url) return null;
	if (typeof url !== 'string') return null;

	const inputWasRelative = isPathRelativeUrl(url);
	const parsedUrl = parseUrl(url, defaultOrigin);
	if (!parsedUrl) return null;

	if (
		allowedPrefixes.some((prefix) => {
			const parsedPrefix = parseUrl(prefix, defaultOrigin);
			if (!parsedPrefix) {
				return false;
			}
			if (parsedPrefix.origin !== parsedUrl.origin) {
				return false;
			}
			return parsedUrl.href.startsWith(parsedPrefix.href);
		})
	) {
		if (inputWasRelative) {
			return url;
		}
		return parsedUrl.href;
	}

	if (allowedPrefixes.includes('*')) {
		if (inputWasRelative) {
			return url;
		}

		if (!isAllowedByWildcard(parsedUrl, kind)) {
			return null;
		}

		return parsedUrl.href;
	}

	return null;
};
