import { afterEach, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

let restoreImagePrototype: (() => void) | null = null;

afterEach(() => {
	restoreImagePrototype?.();
	restoreImagePrototype = null;
	vi.restoreAllMocks();
});

function mockImageElementState({
	complete,
	naturalWidth
}: {
	complete: boolean;
	naturalWidth: number;
}) {
	const completeDescriptor = Object.getOwnPropertyDescriptor(
		HTMLImageElement.prototype,
		'complete'
	);
	const naturalWidthDescriptor = Object.getOwnPropertyDescriptor(
		HTMLImageElement.prototype,
		'naturalWidth'
	);

	Object.defineProperty(HTMLImageElement.prototype, 'complete', {
		configurable: true,
		get() {
			return complete;
		}
	});

	Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
		configurable: true,
		get() {
			return naturalWidth;
		}
	});

	restoreImagePrototype = () => {
		if (completeDescriptor) {
			Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDescriptor);
		} else {
			delete (HTMLImageElement.prototype as { complete?: boolean }).complete;
		}

		if (naturalWidthDescriptor) {
			Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidthDescriptor);
		} else {
			delete (HTMLImageElement.prototype as { naturalWidth?: number }).naturalWidth;
		}
	};
}

describeInBrowser('ported streamdown coverage-final regressions', () => {
	testInBrowser(
		'keeps populated footnotes visible when definitions contain plain text or nested formatting',
		() => {
			const screen = render(Streamdown, {
				content: [
					'Plain footnote[^plain] and bold footnote[^bold].',
					'',
					'[^plain]: Actual footnote content',
					'[^bold]: **Bold text**'
				].join('\n')
			});

			const footnotesSection = screen.container.querySelector('section[data-footnotes]');
			expect(footnotesSection).toBeTruthy();
			expect(footnotesSection?.textContent).toContain('Actual footnote content');
			expect(footnotesSection?.textContent).toContain('Bold text');
			expect(footnotesSection?.querySelector('strong')).toBeTruthy();
		}
	);

	testInBrowser(
		'treats a cached image with naturalWidth=0 as a fallback state on mount',
		async () => {
			mockImageElementState({ complete: true, naturalWidth: 0 });

			const screen = render(Streamdown, {
				content: '![Broken image](https://example.com/broken-cached.png)'
			});

			await vi.waitFor(() => {
				expect(
					screen.container.querySelector('[data-streamdown-image-fallback]')?.textContent
				).toContain('Image not available');
			});
			expect(screen.container.querySelector('button[title="Download image"]')).toBeNull();
		}
	);
});
