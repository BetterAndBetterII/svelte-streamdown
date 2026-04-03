import {
	defaultParityFixtureId,
	parityFixtureIds,
	type ParityFixtureId
} from '../../fixtures/parity/fixture-registry.js';

const parityFixtureModules = import.meta.glob('../../fixtures/parity/markdown/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export type ParityFixture = {
	id: ParityFixtureId;
	label: string;
	markdown: string;
};

const parityFixtures = parityFixtureIds.map((id) => {
	const modulePath = `../../fixtures/parity/markdown/${id}`;
	const markdown = parityFixtureModules[modulePath];

	if (typeof markdown !== 'string') {
		throw new Error(`Missing parity fixture content for ${id}.`);
	}

	return {
		id,
		label: id.replace(/^\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' '),
		markdown
	} satisfies ParityFixture;
});

const parityFixtureMap = new Map(
	parityFixtures.map((fixture) => [fixture.id, fixture] satisfies [ParityFixtureId, ParityFixture])
);

export const listParityFixtures = (): readonly ParityFixture[] => parityFixtures;

export const parseParityFixtureId = (raw: string | null | undefined): ParityFixtureId | null => {
	if (typeof raw !== 'string') {
		return null;
	}

	return parityFixtureMap.has(raw as ParityFixtureId) ? (raw as ParityFixtureId) : null;
};

export const resolveParityFixture = (raw: string | null | undefined): ParityFixture => {
	const parsedId = parseParityFixtureId(raw) ?? defaultParityFixtureId;
	const fixture = parityFixtureMap.get(parsedId);

	if (!fixture) {
		throw new Error(`Unknown parity fixture ${parsedId}.`);
	}

	return fixture;
};
