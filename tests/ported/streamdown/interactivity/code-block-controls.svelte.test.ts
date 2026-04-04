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

describeInBrowser('ported streamdown code block controls', () => {
	testInBrowser('copies and downloads code blocks with the resolved file extension', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true
		});

		saveMock.mockReset();

		const screen = render(Streamdown, {
			content: ['```javascript', "console.log('hello');", '```'].join('\n')
		});

		const copyButton = screen.container.querySelector('button[title="Copy Code"]');
		const downloadButton = screen.container.querySelector('button[title="Download file"]');
		expect(copyButton).toBeTruthy();
		expect(downloadButton).toBeTruthy();

		(copyButton as HTMLButtonElement).click();

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith("console.log('hello');");
		});

		(downloadButton as HTMLButtonElement).click();
		expect(saveMock).toHaveBeenCalledWith('file.js', "console.log('hello');", 'text/plain');
	});

	testInBrowser(
		'falls back to .txt for unknown code languages and disables actions while animating',
		() => {
			saveMock.mockReset();

			const unknownLanguage = render(Streamdown, {
				content: ['```unknownlang', 'plain text body', '```'].join('\n')
			});

			(
				unknownLanguage.container.querySelector(
					'button[title="Download file"]'
				) as HTMLButtonElement
			).click();

			expect(saveMock).toHaveBeenCalledWith('file.txt', 'plain text body', 'text/plain');

			const streaming = render(Streamdown, {
				content: ['```javascript', 'const x = 1;'].join('\n'),
				isAnimating: true
			});

			const copyButton = streaming.container.querySelector('button[title="Copy Code"]');
			const downloadButton = streaming.container.querySelector('button[title="Download file"]');
			expect(copyButton).toHaveAttribute('disabled');
			expect(downloadButton).toHaveAttribute('disabled');
			expect(streaming.container.querySelector('[data-streamdown="code-block"]')).toHaveAttribute(
				'data-incomplete',
				'true'
			);
		}
	);
});
