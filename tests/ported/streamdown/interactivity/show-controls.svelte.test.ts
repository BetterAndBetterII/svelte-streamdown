import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const tableMarkdown = [
	'| Column 1 | Column 2 |',
	'| -------- | -------- |',
	'| Data 1 | Data 2 |'
].join('\n');
const codeMarkdown = ['```javascript', "console.log('Hello World');", '```'].join('\n');

describeInBrowser('ported streamdown controls prop', () => {
	testInBrowser('shows controls by default and when controls is true', async () => {
		const implicit = render(Streamdown, {
			content: tableMarkdown
		});
		const explicit = render(Streamdown, {
			content: tableMarkdown,
			controls: true
		});

		await Promise.all([
			vi.waitFor(() => {
				expect(
					implicit.container.querySelector('[data-streamdown="table-wrapper"] button')
				).toBeTruthy();
			}),
			vi.waitFor(() => {
				expect(
					explicit.container.querySelector('[data-streamdown="table-wrapper"] button')
				).toBeTruthy();
			})
		]);
	});

	testInBrowser('hides code and table controls when controls is false', async () => {
		const screen = render(Streamdown, {
			content: [tableMarkdown, '', codeMarkdown].join('\n'),
			controls: false
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-streamdown="table-wrapper"]')).toBeTruthy();
			expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
		});

		expect(screen.container.querySelector('[data-streamdown="table-wrapper"] button')).toBeFalsy();
		expect(screen.container.querySelector('[data-streamdown="code-block-actions"]')).toBeFalsy();
	});

	testInBrowser('supports mixed object controls for table and code surfaces', async () => {
		const mixed = render(Streamdown, {
			content: [tableMarkdown, '', codeMarkdown].join('\n'),
			controls: {
				table: false,
				code: true
			}
		});

		await vi.waitFor(() => {
			expect(mixed.container.querySelector('[data-streamdown="code-block-actions"]')).toBeTruthy();
		});

		expect(mixed.container.querySelector('[data-streamdown="table-wrapper"] button')).toBeFalsy();

		const codeDisabled = render(Streamdown, {
			content: [tableMarkdown, '', codeMarkdown].join('\n'),
			controls: {
				table: true,
				code: false
			}
		});

		await vi.waitFor(() => {
			expect(
				codeDisabled.container.querySelector('[data-streamdown="table-wrapper"] button')
			).toBeTruthy();
		});

		expect(
			codeDisabled.container.querySelector('[data-streamdown="code-block-actions"]')
		).toBeFalsy();
	});
});
