import { afterEach, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

const originalImageCompleteDescriptor = Object.getOwnPropertyDescriptor(
	HTMLImageElement.prototype,
	'complete'
);
const originalImageNaturalWidthDescriptor = Object.getOwnPropertyDescriptor(
	HTMLImageElement.prototype,
	'naturalWidth'
);

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
		if (originalImageCompleteDescriptor) {
			Object.defineProperty(HTMLImageElement.prototype, 'complete', originalImageCompleteDescriptor);
		} else {
			delete (HTMLImageElement.prototype as { complete?: boolean }).complete;
		}

		if (originalImageNaturalWidthDescriptor) {
			Object.defineProperty(
				HTMLImageElement.prototype,
				'naturalWidth',
				originalImageNaturalWidthDescriptor
			);
		} else {
			delete (HTMLImageElement.prototype as { naturalWidth?: number }).naturalWidth;
		}
	};
}

describeInBrowser('ported streamdown aggregate coverage final closeout', () => {
	testInBrowser(
		'keeps direct and formatted footnote content while filtering empty definitions',
		() => {
			const screen = render(Streamdown, {
				content: [
					'Direct text footnote[^1] and formatted footnote[^2].',
					'',
					'[^1]: Actual footnote content',
					'[^2]: **Bold text**',
					'[^3]:'
				].join('\n')
			});

			const section = screen.container.querySelector('section[data-footnotes]');
			expect(section).toBeTruthy();
			expect(section?.textContent).toContain('Actual footnote content');
			expect(section?.querySelector('strong')?.textContent).toBe('Bold text');
			expect(section?.querySelectorAll('li')).toHaveLength(2);
			expect(
				section?.querySelector('a[data-footnote-backref][href="#footnote-ref-1"]')
			).toBeTruthy();
		}
	);

	testInBrowser(
		'renders fenced code blocks and treats already-complete images as hydrated on mount',
		async () => {
			mockImageElementState({ complete: true, naturalWidth: 320 });

			const screen = render(Streamdown, {
				content: [
					'```ts',
					'const aggregateCloseout = true;',
					'```',
					'',
					'![Cached image](https://example.com/cached.png)'
				].join('\n'),
				static: true
			});

			await vi.waitFor(() => {
				expect(screen.container.querySelector('[data-streamdown="code-block"]')).toBeTruthy();
				expect(
					screen.container.querySelector('[data-streamdown="code-block-body"]')?.textContent
				).toContain('const aggregateCloseout = true;');
				expect(screen.container.querySelector('button[title="Download image"]')).toBeTruthy();
			});
		}
	);
});
