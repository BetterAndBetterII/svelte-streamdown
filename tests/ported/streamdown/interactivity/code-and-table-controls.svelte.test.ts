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
			expect(screen.container.querySelector('button[title="Download table as Markdown"]')).toBeTruthy();
		});

		(screen.container.querySelector(
			'button[title="Download table as Markdown"]'
		) as HTMLButtonElement).click();
		expect(saveMock).toHaveBeenCalledWith(
			'table.md',
			expect.stringContaining('| Name | Value |'),
			'text/markdown'
		);

		(copyToggle as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Copy table as CSV"]')).toBeTruthy();
		});

		(screen.container.querySelector(
			'button[title="Copy table as CSV"]'
		) as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('Name,Value\nFoo,Bar');
		});
	});
});
