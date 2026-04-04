import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';
import ComponentOverrideProbe from './fixtures/ComponentOverrideProbe.svelte';

const StreamdownWithFutureProps = Streamdown as unknown as typeof Streamdown & {
	new (...args: any[]): any;
};

describeInBrowser('ported streamdown root contract', () => {
	testInBrowser('renders the core markdown surface in static mode', () => {
		const screen = render(Streamdown, {
			content: [
				'# Heading 1',
				'',
				'Paragraph with [Link](https://example.com), `inline`, and **bold** text.',
				'',
				'- Item 1',
				'- Item 2',
				'',
				'1. First',
				'2. Second',
				'',
				'> Quote text',
				'',
				'---'
			].join('\n'),
			mode: 'static'
		});

		expect(screen.container.querySelector('h1')?.textContent).toBe('Heading 1');
		expect(screen.container.querySelector('p')?.textContent).toContain('Paragraph with');
		expect(screen.container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/');
		expect(screen.container.querySelector('[data-streamdown-codespan]')?.textContent).toBe(
			'inline'
		);
		expect(screen.container.querySelector('[data-streamdown-strong]')?.textContent).toBe('bold');
		expect(screen.container.querySelectorAll('ul li')).toHaveLength(2);
		expect(screen.container.querySelectorAll('ol li')).toHaveLength(2);
		expect(screen.container.querySelector('blockquote')?.textContent).toContain('Quote text');
		expect(screen.container.querySelector('hr')).toBeTruthy();
	});

	testInBrowser('merges component overrides with the default rendering surface', () => {
		const screen = render(StreamdownWithFutureProps, {
			content: '# Custom heading\n\n## Default heading\n\nParagraph text',
			mode: 'static',
			components: {
				h1: ComponentOverrideProbe,
				p: ComponentOverrideProbe
			}
		});

		expect(screen.container.querySelector('h1[data-override="h1"]')?.textContent).toContain(
			'Custom heading'
		);
		expect(screen.container.querySelector('h2[data-streamdown-heading-2]')?.textContent).toBe(
			'Default heading'
		);
		expect(screen.container.querySelector('p[data-override="p"]')?.textContent).toBe(
			'Paragraph text'
		);
	});

	testInBrowser('parses incomplete markdown by default and leaves it raw when disabled', () => {
		const parsed = render(Streamdown, {
			content: 'Text with **incomplete bold',
			mode: 'streaming'
		});
		const raw = render(Streamdown, {
			content: 'Text with **incomplete bold',
			mode: 'streaming',
			parseIncompleteMarkdown: false
		});

		expect(parsed.container.querySelector('strong')).toBeTruthy();
		expect(raw.container.querySelector('strong')).toBeNull();
		expect(raw.container.textContent).toContain('**incomplete bold');
	});

	testInBrowser('prefixes internal classes and preserves RTL direction helpers', () => {
		const prefixed = render(Streamdown, {
			content: '**bold text**',
			mode: 'static',
			prefix: 'tw'
		});
		const rtl = render(Streamdown, {
			content: 'مرحبا بالعالم\n\nHello world',
			mode: 'streaming',
			dir: 'auto'
		});

		expect(prefixed.container.firstElementChild?.className).toContain('tw:');
		expect(
			(prefixed.container.querySelector('[data-streamdown-strong]') as HTMLElement | null)
				?.className
		).toContain('tw:font-semibold');
		expect(
			[...rtl.container.querySelectorAll('[dir]')].map((element) => element.getAttribute('dir'))
		).toContain('rtl');
		expect(
			[...rtl.container.querySelectorAll('[dir]')].map((element) => element.getAttribute('dir'))
		).toContain('ltr');
	});

	testInBrowser(
		'fires animation lifecycle callbacks and animates streamed text from the root surface',
		async () => {
			const onAnimationStart = vi.fn();
			const onAnimationEnd = vi.fn();
			const screen = render(Streamdown, {
				content: 'Animated text',
				animated: true,
				isAnimating: false,
				onAnimationStart,
				onAnimationEnd
			});

			await screen.rerender({
				content: 'Animated text updated',
				animated: true,
				isAnimating: true,
				onAnimationStart,
				onAnimationEnd
			});

			await vi.waitFor(() => {
				expect(onAnimationStart).toHaveBeenCalledTimes(1);
				expect(
					screen.container.querySelectorAll('[data-streamdown-animate]').length
				).toBeGreaterThan(0);
			});

			await screen.rerender({
				content: 'Animated text updated',
				animated: true,
				isAnimating: false,
				onAnimationStart,
				onAnimationEnd
			});

			await vi.waitFor(() => {
				expect(onAnimationEnd).toHaveBeenCalledTimes(1);
			});
		}
	);

	testInBrowser('renders allowlisted custom tags from the root component surface', () => {
		const screen = render(Streamdown, {
			content: '<custom class="chip">Allowed content</custom>',
			static: true,
			allowedTags: {
				custom: ['class']
			}
		});

		const custom = screen.container.querySelector('custom');
		expect(custom).toBeTruthy();
		expect(custom?.textContent).toBe('Allowed content');
	});
});
