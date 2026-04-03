import { expect, test } from 'vitest';
import { listFixturePaths, loadFixtureText } from './fixtures.js';

test('loads local and reference fixtures by exact path', async () => {
	expect(listFixturePaths('local')).toContain('ported/remend/streaming/input.md');
	expect(await loadFixtureText('ported/remend/streaming/input.md')).toContain('**bold statement**');
	expect(
		await loadFixtureText(
			'packages/streamdown/__tests__/__fixtures__/code-block-big-html.html',
			'reference'
		)
	).toContain('<!DOCTYPE html>');
});
