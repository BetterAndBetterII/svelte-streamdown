export const adhocParityFixtureId = '__adhoc_markdown__' as const;

export type ParityRenderProfile = 'commonmark' | 'default';

const DEFAULT_PROFILE: ParityRenderProfile = 'default';

function toBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): string | null {
	try {
		const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
		const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
		const binary = atob(`${normalized}${padding}`);
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		return new TextDecoder().decode(bytes);
	} catch {
		return null;
	}
}

export function encodeParityMarkdown(markdown: string): string {
	return toBase64Url(markdown);
}

export function decodeParityMarkdown(raw: string | null | undefined): string | null {
	if (typeof raw !== 'string' || raw.length === 0) {
		return null;
	}

	return fromBase64Url(raw);
}

export function parseParityRenderProfile(
	raw: string | null | undefined
): ParityRenderProfile {
	return raw === 'commonmark' ? 'commonmark' : DEFAULT_PROFILE;
}

export function buildParityRoute(params: {
	fixture?: string | null;
	markdown?: string | null;
	profile?: ParityRenderProfile;
}): string {
	const searchParams = new URLSearchParams();

	if (params.fixture) {
		searchParams.set('fixture', params.fixture);
	}

	if (params.markdown) {
		searchParams.set('markdown', encodeParityMarkdown(params.markdown));
	}

	const profile = params.profile ?? DEFAULT_PROFILE;
	if (profile !== DEFAULT_PROFILE) {
		searchParams.set('profile', profile);
	}

	const query = searchParams.toString();
	return query.length > 0 ? `/?${query}` : '/';
}
