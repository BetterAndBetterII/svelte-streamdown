import { parseParityFixtureId, resolveParityFixture, type ParityFixture } from './fixtures.js';
import {
	adhocParityFixtureId,
	buildParityRoute,
	decodeParityMarkdown,
	parseParityRenderProfile,
	type ParityRenderProfile
} from './query.js';

export type ParityMode = 'static' | 'streaming';
export type ParityCaret = 'block' | 'circle' | 'none';

export type ParityHarnessState = {
	fixtureId: string;
	fixtureLabel: string;
	markdown: string;
	profile: ParityRenderProfile;
	mode: ParityMode;
	isAnimating: boolean;
	caret: ParityCaret;
};

export type ParityHarnessUpdate = Partial<
	Pick<ParityHarnessState, 'markdown' | 'profile' | 'mode' | 'isAnimating' | 'caret'>
> & {
	fixtureId?: string | null;
};

export type ParityHarnessApi = {
	getState: () => ParityHarnessState;
	setState: (update: ParityHarnessUpdate) => Promise<void>;
};

const DEFAULT_MODE: ParityMode = 'static';
const DEFAULT_CARET: ParityCaret = 'block';
const ADHOC_LABEL = 'Ad hoc markdown';

export function createDefaultParityHarnessState(): ParityHarnessState {
	const fixture = resolveParityFixture(null);
	return createFixtureState(fixture);
}

export function resolveParityHarnessStateFromUrl(url: URL): ParityHarnessState {
	const profile = parseParityRenderProfile(url.searchParams.get('profile'));
	const fixtureId = parseParityFixtureId(url.searchParams.get('fixture'));
	const markdownOverride = decodeParityMarkdown(url.searchParams.get('markdown'));

	if (fixtureId) {
		const fixture = resolveParityFixture(fixtureId);
		return {
			...createFixtureState(fixture),
			markdown: markdownOverride ?? fixture.markdown,
			profile
		};
	}

	if (markdownOverride !== null) {
		return {
			fixtureId: adhocParityFixtureId,
			fixtureLabel: ADHOC_LABEL,
			markdown: markdownOverride,
			profile,
			mode: DEFAULT_MODE,
			isAnimating: false,
			caret: DEFAULT_CARET
		};
	}

	return {
		...createDefaultParityHarnessState(),
		profile
	};
}

export function applyParityHarnessUpdate(
	current: ParityHarnessState,
	update: ParityHarnessUpdate
): ParityHarnessState {
	let next = { ...current };

	if ('fixtureId' in update) {
		next = resolveStateForFixtureUpdate(next, update.fixtureId ?? null);
	}

	if ('markdown' in update && typeof update.markdown === 'string') {
		next.markdown = update.markdown;
	}

	if ('profile' in update && update.profile) {
		next.profile = update.profile;
	}

	if ('mode' in update && update.mode) {
		next.mode = update.mode;
	}

	if ('isAnimating' in update && typeof update.isAnimating === 'boolean') {
		next.isAnimating = update.isAnimating;
	}

	if ('caret' in update && update.caret) {
		next.caret = update.caret;
	}

	return next;
}

export function buildParityUrlFromState(state: ParityHarnessState): string {
	const fixture = resolveFixtureOrNull(state.fixtureId);
	const fixtureId = fixture ? fixture.id : null;
	const shouldPersistMarkdown =
		fixture === null ? state.markdown : state.markdown !== fixture.markdown ? state.markdown : null;

	return buildParityRoute({
		fixture: fixtureId,
		markdown: shouldPersistMarkdown,
		profile: state.profile
	});
}

function createFixtureState(fixture: ParityFixture): ParityHarnessState {
	return {
		fixtureId: fixture.id,
		fixtureLabel: fixture.label,
		markdown: fixture.markdown,
		profile: 'default',
		mode: DEFAULT_MODE,
		isAnimating: false,
		caret: DEFAULT_CARET
	};
}

function resolveStateForFixtureUpdate(
	current: ParityHarnessState,
	rawFixtureId: string | null
): ParityHarnessState {
	if (rawFixtureId === adhocParityFixtureId) {
		return {
			...current,
			fixtureId: adhocParityFixtureId,
			fixtureLabel: ADHOC_LABEL
		};
	}

	const fixtureId = parseParityFixtureId(rawFixtureId);
	if (!fixtureId) {
		return current;
	}

	const fixture = resolveParityFixture(fixtureId);
	return {
		...current,
		fixtureId: fixture.id,
		fixtureLabel: fixture.label,
		markdown: fixture.markdown
	};
}

function resolveFixtureOrNull(rawFixtureId: string): ParityFixture | null {
	const fixtureId = parseParityFixtureId(rawFixtureId);
	return fixtureId ? resolveParityFixture(fixtureId) : null;
}

declare global {
	interface Window {
		__STREAMDOWN_PARITY__?: ParityHarnessApi;
	}
}
