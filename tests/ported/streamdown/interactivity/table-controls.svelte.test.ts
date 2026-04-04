import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { saveMock } = vi.hoisted(() => ({
	saveMock: vi.fn()
}));

vi.mock('$lib/utils/save.js', () => ({
	save: saveMock
}));

const tableMarkdown = ['| Name | Value |', '| ---- | ----- |', '| Foo | Bar |'].join('\n');

describeInBrowser('ported streamdown table controls', () => {
	testInBrowser('opens copy and download menus with the local formats and payloads', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});

		saveMock.mockReset();

		const screen = render(Streamdown, {
			content: tableMarkdown
		});

		(screen.container.querySelector('button[title="Download table"]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download table as CSV"]')).toBeTruthy();
			expect(
				screen.container.querySelector('button[title="Download table as Markdown"]')
			).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="Download table as HTML"]')).toBeFalsy();

		(
			screen.container.querySelector(
				'button[title="Download table as Markdown"]'
			) as HTMLButtonElement
		).click();
		expect(saveMock).toHaveBeenCalledWith(
			'table.md',
			expect.stringContaining('| Name | Value |'),
			'text/markdown'
		);

		(screen.container.querySelector('button[title="Copy table"]') as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Copy table as Markdown"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Copy table as CSV"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Copy table as TSV"]')).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="Copy table as HTML"]')).toBeFalsy();

		(
			screen.container.querySelector('button[title="Copy table as CSV"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('Name,Value\nFoo,Bar');
		});
	});

	testInBrowser(
		'toggles table fullscreen with escape, backdrop close, and body scroll locking',
		async () => {
			saveMock.mockReset();
			const screen = render(Streamdown, {
				content: tableMarkdown
			});

			const fullscreenButton = screen.container.querySelector(
				'button[title="View fullscreen"]'
			) as HTMLButtonElement;
			expect(fullscreenButton).toBeTruthy();
			expect(fullscreenButton).not.toHaveAttribute('disabled');

			fullscreenButton.click();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeTruthy();
				expect(document.body.style.overflow).toBe('hidden');
			});

			expect(
				screen.container.querySelector(
					'[data-streamdown="table-fullscreen"] button[title="Copy table"]'
				)
			).toBeTruthy();
			expect(
				screen.container.querySelector(
					'[data-streamdown="table-fullscreen"] button[title="Download table"]'
				)
			).toBeTruthy();

			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeFalsy();
				expect(document.body.style.overflow).toBe('');
			});

			fullscreenButton.click();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeTruthy();
			});

			(
				screen.container.querySelector('[data-streamdown="table-fullscreen"]') as HTMLDivElement
			).dispatchEvent(new MouseEvent('click', { bubbles: true }));

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeFalsy();
			});
		}
	);

	testInBrowser('disables fullscreen when the stream is animating', async () => {
		const screen = render(Streamdown, {
			content: tableMarkdown,
			isAnimating: true
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="View fullscreen"]')).toHaveAttribute(
			'disabled'
		);
	});
});
