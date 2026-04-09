import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown table normalization regressions', () => {
	testInBrowser(
		'renders overflow and partial-fit table content instead of swallowing it',
		async () => {
			const screen = render(Streamdown, {
				content: ['| A | B | C |', '|---|---|---|', '| left | wide |||', '| 1 | 2 | 3 | 4 |'].join(
					'\n'
				)
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table"]')).toBeTruthy();
			});

			const table = screen.container.querySelector('[data-streamdown="table"]') as HTMLTableElement;
			expect(table).toHaveAttribute('data-streamdown-table-layout', 'preserve-content');
			expect(table).toHaveAttribute(
				'data-streamdown-table-layout-issues',
				expect.stringContaining('partial-fit-preserved')
			);
			expect(table).toHaveAttribute(
				'data-streamdown-table-layout-issues',
				expect.stringContaining('overflow-preserved')
			);
			expect(table.textContent).toContain('wide');
			expect(table.textContent).toContain('4');
			expect(table.querySelectorAll('tbody tr')[0].querySelectorAll('td')[1]).toHaveAttribute(
				'colspan',
				'3'
			);
		}
	);

	testInBrowser('renders complex rowspan text without trimming away merged content', async () => {
		const screen = render(Streamdown, {
			content: ['| A | B | C |', '|---|---|---|', '| Group || Value |', '| Child^ || Tail |'].join(
				'\n'
			)
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('[data-streamdown="table"]')).toBeTruthy();
		});

		const table = screen.container.querySelector('[data-streamdown="table"]') as HTMLTableElement;
		const firstRowCells = table.querySelectorAll('tbody tr')[0].querySelectorAll('td');

		expect(table).toHaveAttribute('data-streamdown-table-layout', 'balanced');
		expect(firstRowCells[0].textContent).toContain('Group Child');
		expect(firstRowCells[0]).toHaveAttribute('colspan', '2');
		expect(firstRowCells[0]).toHaveAttribute('rowspan', '2');
		expect(table.textContent).toContain('Tail');
	});
});
