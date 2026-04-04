export type FixtureSource = 'local' | 'reference';
type FixtureLoader = () => Promise<string>;

const localFixtureModules = import.meta.glob('../fixtures/**/*', {
	query: '?raw',
	import: 'default'
}) as Record<string, FixtureLoader>;

const referenceFixtureModules = import.meta.glob(
	'../../references/streamdown/packages/**/__tests__/__fixtures__/**/*',
	{
		query: '?raw',
		import: 'default'
	}
) as Record<string, FixtureLoader>;

function buildFixtureIndex(
	prefix: string,
	modules: Record<string, FixtureLoader>
): Map<string, FixtureLoader> {
	const index = new Map<string, FixtureLoader>();

	for (const [fullPath, loader] of Object.entries(modules)) {
		if (!fullPath.startsWith(prefix)) {
			throw new Error(`Fixture path ${fullPath} does not start with ${prefix}.`);
		}

		const relativePath = fullPath.slice(prefix.length);
		if (index.has(relativePath)) {
			throw new Error(`Duplicate fixture path registered: ${relativePath}`);
		}

		index.set(relativePath, loader);
	}

	return index;
}

const fixtureIndexes = {
	local: buildFixtureIndex('../fixtures/', localFixtureModules),
	reference: buildFixtureIndex('../../references/streamdown/', referenceFixtureModules)
} satisfies Record<FixtureSource, Map<string, FixtureLoader>>;

const fixtureCache = {
	local: new Map<string, string>(),
	reference: new Map<string, string>()
} satisfies Record<FixtureSource, Map<string, string>>;

export function listFixturePaths(source: FixtureSource = 'local'): string[] {
	return [...fixtureIndexes[source].keys()].sort();
}

export async function loadFixtureText(
	path: string,
	source: FixtureSource = 'local'
): Promise<string> {
	const cachedText = fixtureCache[source].get(path);
	if (typeof cachedText === 'string') {
		return cachedText;
	}

	const loader = fixtureIndexes[source].get(path);

	if (!loader) {
		throw new Error(
			`Missing ${source} fixture: ${path}. Available fixtures: ${listFixturePaths(source).join(', ')}`
		);
	}

	const text = await loader();
	fixtureCache[source].set(path, text);
	return text;
}

export async function loadFixturePair(
	inputPath: string,
	expectedPath: string,
	source: FixtureSource = 'local'
): Promise<{ input: string; expected: string }> {
	return {
		input: await loadFixtureText(inputPath, source),
		expected: await loadFixtureText(expectedPath, source)
	};
}
