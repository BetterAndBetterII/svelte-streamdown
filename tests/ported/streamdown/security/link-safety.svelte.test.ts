import { expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown security link safety', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	testInBrowser('renders a normal anchor when linkSafety is disabled', () => {
		const screen = render(Streamdown, {
			content: '[Link text](https://example.com)',
			linkSafety: {
				enabled: false
			}
		});

		const link = screen.container.querySelector('a[data-streamdown="link"]');
		expect(link).toBeTruthy();
		expect(link?.getAttribute('href')).toBe('https://example.com/');
		expect(screen.container.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
	});

	testInBrowser(
		'intercepts external links and shows the confirmation modal by default',
		async () => {
			const screen = render(Streamdown, {
				content: '[Link text](https://example.com)'
			});

			const link = screen.container.querySelector('button[data-streamdown="link"]');
			expect(link).toBeTruthy();

			link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

			await vi.waitFor(() => {
				const modal = document.querySelector('[data-streamdown="link-safety-modal"]');
				expect(modal).toBeTruthy();
				expect(modal?.textContent).toContain('https://example.com/');
			});
		}
	);

	testInBrowser('skips the modal when onLinkCheck allows the destination', async () => {
		const onLinkCheck = vi.fn().mockReturnValue(true);
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const screen = render(Streamdown, {
			content: '[Trusted](https://trusted.example/path)',
			linkSafety: {
				enabled: true,
				onLinkCheck
			}
		});

		screen.container
			.querySelector('button[data-streamdown="link"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(onLinkCheck).toHaveBeenCalledWith('https://trusted.example/path');
			expect(openSpy).toHaveBeenCalledWith('https://trusted.example/path', '_blank', 'noreferrer');
		});

		expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
	});

	testInBrowser('shows the modal when onLinkCheck rejects the destination', async () => {
		const onLinkCheck = vi.fn().mockReturnValue(false);
		const screen = render(Streamdown, {
			content: '[Untrusted](https://untrusted.example)',
			linkSafety: {
				enabled: true,
				onLinkCheck
			}
		});

		screen.container
			.querySelector('button[data-streamdown="link"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(onLinkCheck).toHaveBeenCalledWith('https://untrusted.example/');
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
		});
	});

	testInBrowser('opens the destination when the modal confirm button is clicked', async () => {
		const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
		const screen = render(Streamdown, {
			content: '[Link text](https://example.com)'
		});

		screen.container
			.querySelector('button[data-streamdown="link"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
		});

		Array.from(document.querySelectorAll('[data-streamdown="link-safety-modal"] button'))
			.find((button) => button.textContent?.includes('Open link'))
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(openSpy).toHaveBeenCalledWith('https://example.com/', '_blank', 'noreferrer');
		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeNull();
		});
	});

	testInBrowser('copies the destination URL from the modal', async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: {
				writeText
			},
			configurable: true
		});

		const screen = render(Streamdown, {
			content: '[Link text](https://example.com)'
		});

		screen.container
			.querySelector('button[data-streamdown="link"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(document.querySelector('[data-streamdown="link-safety-modal"]')).toBeTruthy();
		});

		Array.from(document.querySelectorAll('[data-streamdown="link-safety-modal"] button'))
			.find((button) => button.textContent?.includes('Copy link'))
			?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await vi.waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('https://example.com/');
		});
	});
});
