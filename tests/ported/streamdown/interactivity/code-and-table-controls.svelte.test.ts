import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Code from '../../../../src/lib/Elements/Code.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const { saveMock } = vi.hoisted(() => ({
	saveMock: vi.fn()
}));

vi.mock('$lib/utils/save.js', () => ({
	save: saveMock
}));

describeInBrowser('ported streamdown code and table controls', () => {
	testInBrowser('copies and downloads code blocks through the local control surface', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});

		saveMock.mockReset();

		const screen = render(Streamdown, {
			content: ['```javascript', 'console.log("hello");', '```'].join('\n'),
			components: {
				code: Code
			}
		});

		const copyButton = screen.container.querySelector('button[title="Copy Code"]');
		const downloadButton = screen.container.querySelector('button[title="Download file"]');
		expect(copyButton).toBeTruthy();
		expect(downloadButton).toBeTruthy();

		(copyButton as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('console.log("hello");');
		});

		(downloadButton as HTMLButtonElement).click();
		expect(saveMock).toHaveBeenCalledWith('file.js', 'console.log("hello");', 'text/plain');
	});

	testInBrowser(
		'supports granular code controls and disables code actions while streaming',
		async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText },
				configurable: true
			});

			saveMock.mockReset();

			const hiddenDownload = render(Streamdown, {
				content: ['```javascript', 'console.log("hello");', '```'].join('\n'),
				controls: {
					code: {
						download: false
					}
				}
			});

			expect(hiddenDownload.container.querySelector('button[title="Copy Code"]')).toBeTruthy();
			expect(hiddenDownload.container.querySelector('button[title="Download file"]')).toBeFalsy();

			const streaming = render(Streamdown, {
				content: ['```javascript', 'console.log("hello");'].join('\n'),
				isAnimating: true
			});

			const copyButton = streaming.container.querySelector('button[title="Copy Code"]');
			const downloadButton = streaming.container.querySelector('button[title="Download file"]');
			expect(copyButton).toHaveAttribute('disabled');
			expect(downloadButton).toHaveAttribute('disabled');

			(copyButton as HTMLButtonElement).click();
			(downloadButton as HTMLButtonElement).click();

			expect(writeText).not.toHaveBeenCalled();
			expect(saveMock).not.toHaveBeenCalled();
			expect(streaming.container.querySelector('[data-streamdown="code-block"]')).toHaveAttribute(
				'data-incomplete',
				'true'
			);
		}
	);

	testInBrowser('opens table menus and exports markdown and csv payloads', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});

		saveMock.mockReset();

		const screen = render(Streamdown, {
			content: ['| Name | Value |', '| ---- | ----- |', '| Foo | Bar |'].join('\n')
		});

		const downloadToggle = screen.container.querySelector('button[title="Download table"]');
		const copyToggle = screen.container.querySelector('button[title="Copy table"]');
		expect(downloadToggle).toBeTruthy();
		expect(copyToggle).toBeTruthy();

		(downloadToggle as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(
				screen.container.querySelector('button[title="Download table as Markdown"]')
			).toBeTruthy();
		});

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

		(copyToggle as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Copy table as CSV"]')).toBeTruthy();
		});

		(
			screen.container.querySelector('button[title="Copy table as CSV"]') as HTMLButtonElement
		).click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('Name,Value\nFoo,Bar');
		});
	});

	testInBrowser(
		'aligns table wrapper, fullscreen, and menu formats with the reference surface',
		async () => {
			const writeText = vi.fn().mockResolvedValue(undefined);
			Object.defineProperty(navigator, 'clipboard', {
				value: { writeText },
				configurable: true
			});

			saveMock.mockReset();

			const screen = render(Streamdown, {
				content: ['| Name | Value |', '| ---- | ----- |', '| Foo | Bar |'].join('\n')
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-wrapper"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeTruthy();
			});

			expect(screen.container.querySelector('[data-streamdown="table"]')).toBeTruthy();

			(
				screen.container.querySelector('button[title="Download table"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(
					screen.container.querySelector('button[title="Download table as CSV"]')
				).toBeTruthy();
				expect(
					screen.container.querySelector('button[title="Download table as Markdown"]')
				).toBeTruthy();
			});

			expect(screen.container.querySelector('button[title="Download table as HTML"]')).toBeFalsy();

			(screen.container.querySelector('button[title="Copy table"]') as HTMLButtonElement).click();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('button[title="Copy table as CSV"]')).toBeTruthy();
				expect(
					screen.container.querySelector('button[title="Copy table as Markdown"]')
				).toBeTruthy();
				expect(screen.container.querySelector('button[title="Copy table as TSV"]')).toBeTruthy();
			});

			expect(screen.container.querySelector('button[title="Copy table as HTML"]')).toBeFalsy();

			(
				screen.container.querySelector('button[title="Copy table as TSV"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(writeText).toHaveBeenCalledWith('Name\tValue\nFoo\tBar');
			});

			(
				screen.container.querySelector('button[title="View fullscreen"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeTruthy();
				expect(screen.container.querySelector('button[title="Exit fullscreen"]')).toBeTruthy();
			});

			(
				screen.container.querySelector('button[title="Exit fullscreen"]') as HTMLButtonElement
			).click();

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="table-fullscreen"]')).toBeFalsy();
			});
		}
	);

	testInBrowser('supports per-control table configuration', async () => {
		const screen = render(Streamdown, {
			content: ['| Name | Value |', '| ---- | ----- |', '| Foo | Bar |'].join('\n'),
			controls: {
				table: {
					copy: false,
					download: true,
					fullscreen: false
				}
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Download table"]')).toBeTruthy();
		});

		expect(screen.container.querySelector('button[title="Copy table"]')).toBeFalsy();
		expect(screen.container.querySelector('button[title="View fullscreen"]')).toBeFalsy();
	});
});
