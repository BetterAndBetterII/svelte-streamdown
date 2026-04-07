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

type WildcardAllowedUrlPrefix = {
	type: 'wildcard';
};

type ProtocolAllowedUrlPrefix = {
	type: 'protocol';
	protocol: string;
};

type AbsoluteAllowedUrlPrefix = {
	type: 'url';
	url: URL;
};

export type AllowedUrlPrefix =
	| WildcardAllowedUrlPrefix
	| ProtocolAllowedUrlPrefix
	| AbsoluteAllowedUrlPrefix;

const WILDCARD_PROTOCOLS = {
	link: new Set(['http:', 'https:', 'mailto:', 'tel:']),
	image: new Set(['http:', 'https:'])
} satisfies Record<UrlPolicyKind, Set<string>>;

const PROTOCOL_ONLY_PREFIX_PATTERN = /^(?<protocol>[A-Za-z][A-Za-z\d+.-]*:)(\/\/)?$/;

function isAllowedByWildcard(url: URL, kind: UrlPolicyKind): boolean {
	if (WILDCARD_PROTOCOLS[kind].has(url.protocol)) {
		return true;
	}

	return kind === 'image' && url.protocol === 'data:' && /^data:image\//i.test(url.href);
}

const parseAllowedUrlPrefix = (
	prefix: unknown,
	defaultOrigin?: string
): AllowedUrlPrefix | null => {
	if (prefix === '*') {
		return { type: 'wildcard' };
	}

	if (typeof prefix !== 'string') {
		return null;
	}

	const protocolOnlyMatch = prefix.match(PROTOCOL_ONLY_PREFIX_PATTERN);
	if (protocolOnlyMatch?.groups?.protocol) {
		return {
			type: 'protocol',
			protocol: protocolOnlyMatch.groups.protocol.toLowerCase()
		};
	}

	const parsedPrefix = parseUrl(prefix, defaultOrigin);
	if (!parsedPrefix) {
		return null;
	}

	return {
		type: 'url',
		url: parsedPrefix
	};
};

export const parseAllowedUrlPrefixes = (
	allowedPrefixes: readonly unknown[],
	defaultOrigin?: string
): AllowedUrlPrefix[] =>
	allowedPrefixes
		.map((prefix) => parseAllowedUrlPrefix(prefix, defaultOrigin))
		.filter((prefix): prefix is AllowedUrlPrefix => prefix !== null);

function isAllowedByPrefix(url: URL, prefix: AllowedUrlPrefix, kind: UrlPolicyKind): boolean {
	switch (prefix.type) {
		case 'wildcard':
			return isAllowedByWildcard(url, kind);
		case 'protocol':
			return url.protocol.toLowerCase() === prefix.protocol;
		case 'url':
			return prefix.url.origin === url.origin && url.href.startsWith(prefix.url.href);
	}
}

export const transformParsedUrl = (
	url: unknown,
	allowedPrefixes: readonly AllowedUrlPrefix[],
	defaultOrigin?: string,
	{ kind = 'link' }: TransformUrlOptions = {}
): string | null => {
	if (!url) return null;
	if (typeof url !== 'string') return null;

	const inputWasRelative = isPathRelativeUrl(url);
	const parsedUrl = parseUrl(url, defaultOrigin);
	if (!parsedUrl) return null;

	if (allowedPrefixes.some((prefix) => isAllowedByPrefix(parsedUrl, prefix, kind))) {
		if (inputWasRelative) {
			return url;
		}

		return parsedUrl.href;
	}

	return null;
};

export const transformUrl = (
	url: unknown,
	allowedPrefixes: string[],
	defaultOrigin?: string,
	{ kind = 'link' }: TransformUrlOptions = {}
): string | null =>
	transformParsedUrl(url, parseAllowedUrlPrefixes(allowedPrefixes, defaultOrigin), defaultOrigin, {
		kind
	});
