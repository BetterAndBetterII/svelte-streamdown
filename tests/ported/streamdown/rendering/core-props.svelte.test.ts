import { render } from 'vitest-browser-svelte';
import { expect } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown core props', () => {
	testInBrowser('streaming mode completes incomplete markdown by default', () => {
		const screen = render(Streamdown, {
			content: 'Text with **incomplete bold',
			mode: 'streaming'
		});

		expect(screen.container.querySelector('strong')).toBeTruthy();
	});

	testInBrowser('static mode leaves incomplete markdown unparsed', () => {
		const screen = render(Streamdown, {
			content: 'Text with **incomplete bold',
			mode: 'static'
		});

		expect(screen.container.querySelector('strong')).toBeNull();
		expect(screen.container.textContent).toContain('**incomplete bold');
	});

	testInBrowser('parseIncompleteMarkdown={false} disables the streaming completion pass', () => {
		const screen = render(Streamdown, {
			content: 'Text with **incomplete bold',
			mode: 'streaming',
			parseIncompleteMarkdown: false
		});

		expect(screen.container.querySelector('strong')).toBeNull();
	});

	testInBrowser('dir="auto" detects RTL text in static mode', () => {
		const screen = render(Streamdown, {
			content: 'مرحبا بالعالم',
			mode: 'static',
			dir: 'auto'
		});

		const wrapper = screen.container.querySelector('[dir]');
		expect(wrapper?.getAttribute('dir')).toBe('rtl');
	});

	testInBrowser('dir="auto" applies per-block direction in streaming mode', () => {
		const screen = render(Streamdown, {
			content: 'مرحبا بالعالم\n\nHello world',
			mode: 'streaming',
			dir: 'auto'
		});

		const wrappers = [...screen.container.querySelectorAll('[dir]')];
		expect(wrappers.map((element) => element.getAttribute('dir'))).toContain('rtl');
		expect(wrappers.map((element) => element.getAttribute('dir'))).toContain('ltr');
	});

	testInBrowser('prefix prefixes root and internal Tailwind utility classes', () => {
		const screen = render(Streamdown, {
			content: '**bold text**',
			mode: 'static',
			prefix: 'tw'
		});

		const root = screen.container.firstElementChild as HTMLElement | null;
		const strong = screen.container.querySelector('[data-streamdown-strong]') as HTMLElement | null;

		expect(root?.className).toContain('tw:');
		expect(strong?.className).toContain('tw:font-semibold');
	});

	testInBrowser('caret and isAnimating expose the active caret style', () => {
		const screen = render(Streamdown, {
			content: 'Hello world',
			caret: 'block',
			isAnimating: true
		});

		const root = screen.container.firstElementChild as HTMLElement | null;
		expect(root?.style.getPropertyValue('--streamdown-caret')).toContain('▋');
	});

	testInBrowser('caret renders an empty placeholder when content is empty', () => {
		const screen = render(Streamdown, {
			content: '',
			caret: 'block',
			isAnimating: true
		});

		const root = screen.container.firstElementChild;
		expect(root?.querySelector('[data-streamdown-caret-placeholder]')).toBeTruthy();
	});

	testInBrowser('animated + isAnimating uses the animation compatibility layer', () => {
		const screen = render(Streamdown, {
			content: 'Animate me',
			animated: true,
			isAnimating: true
		});

		expect(screen.container.querySelector('span[style*="animation-name"]')).toBeTruthy();
	});

	testInBrowser('animation callbacks track isAnimating transitions', async () => {
		const onAnimationStart: (() => void) & { calls?: number } = Object.assign(
			() => {
				onAnimationStart.calls = (onAnimationStart.calls ?? 0) + 1;
			},
			{ calls: 0 }
		);
		const onAnimationEnd: (() => void) & { calls?: number } = Object.assign(
			() => {
				onAnimationEnd.calls = (onAnimationEnd.calls ?? 0) + 1;
			},
			{ calls: 0 }
		);

		const screen = render(Streamdown, {
			content: 'Hello world',
			isAnimating: false,
			onAnimationStart,
			onAnimationEnd
		});

		expect(onAnimationStart.calls).toBe(0);
		expect(onAnimationEnd.calls).toBe(0);

		await screen.rerender({
			content: 'Hello world',
			isAnimating: true,
			onAnimationStart,
			onAnimationEnd
		});

		expect(onAnimationStart.calls).toBe(1);
		expect(onAnimationEnd.calls).toBe(0);

		await screen.rerender({
			content: 'Hello world',
			isAnimating: false,
			onAnimationStart,
			onAnimationEnd
		});

		expect(onAnimationEnd.calls).toBe(1);
	});

	testInBrowser('lineNumbers toggles the code line-number compatibility class', () => {
		const enabled = render(Streamdown, {
			content: '```js\nconst x = 1;\nconst y = 2;\n```',
			mode: 'static'
		});
		const disabled = render(Streamdown, {
			content: '```js\nconst x = 1;\nconst y = 2;\n```',
			mode: 'static',
			lineNumbers: false
		});

		expect(enabled.container.querySelector('pre code')?.classList.contains('sd-line-numbers')).toBe(
			true
		);
		expect(
			disabled.container.querySelector('pre code')?.classList.contains('sd-line-numbers')
		).toBe(false);
	});
});
