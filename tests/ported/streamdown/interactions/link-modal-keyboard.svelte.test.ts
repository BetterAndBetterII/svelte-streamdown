import { afterEach, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

async function openModal(url = 'https://example.com') {
	const screen = render(Streamdown, {
		content: `[Link text](${url})`
	});

	screen.container
		.querySelector('button[data-streamdown="link"]')
		?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

	await vi.waitFor(() => {
		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
	});

	return screen;
}

describeInBrowser('ported streamdown link safety modal keyboard interactions', () => {
	afterEach(() => {
		document.body.style.overflow = '';
		vi.restoreAllMocks();
	});

	testInBrowser('closes on Escape pressed on the backdrop', async () => {
		await openModal();

		document
			.querySelector('[data-streamdown="link-safety-modal"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
		});
	});

	testInBrowser('ignores non-Escape keys on the backdrop', async () => {
		await openModal();

		document
			.querySelector('[data-streamdown="link-safety-modal"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
	});

	testInBrowser('stops click propagation inside the modal content', async () => {
		await openModal();

		document
			.querySelector('[role="presentation"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
	});

	testInBrowser('stops Escape propagation inside the modal content', async () => {
		await openModal();

		document
			.querySelector('[role="presentation"]')
			?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
	});

	testInBrowser(
		'locks body scroll while the modal is open and restores it on unmount',
		async () => {
			const screen = await openModal();

			expect(document.body.style.overflow).toBe('hidden');

			screen.unmount();
			expect(document.body.style.overflow).toBe('');
		}
	);

	testInBrowser('closes via the document Escape listener', async () => {
		await openModal();

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
		});
	});

	testInBrowser('confirms the destination and closes the modal', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		await openModal();

		Array.from(document.querySelectorAll('[data-streamdown="link-safety-modal"] button'))
			.find((button) => button.textContent?.includes('Open link'))
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noreferrer');
		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
		});
	});

	testInBrowser('handles clipboard copy failures without closing the modal', async () => {
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText: vi.fn().mockRejectedValue(new Error('Copy failed'))
			},
			configurable: true
		});

		await openModal();

		Array.from(document.querySelectorAll('[data-streamdown="link-safety-modal"] button'))
			.find((button) => button.textContent?.includes('Copy link'))
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/');
		});

		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
	});

	testInBrowser('uses a scrollable URL container for long links', async () => {
		const longUrl = `https://example.com/${'a'.repeat(150)}`;
		await openModal(longUrl);

		const urlDisplay = document.querySelector('[data-streamdown="link-safety-modal"] .break-all');

		expect(urlDisplay).toBeTruthy();
		expect(urlDisplay?.className).toContain('break-all');
		expect(urlDisplay?.className).toContain('max-h-32');
		expect(urlDisplay?.className).toContain('overflow-y-auto');
	});
});
