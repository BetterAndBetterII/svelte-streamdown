import type { BundledLanguage } from 'shiki';
import { expect, vi } from 'vitest';
import { code, createCodePlugin } from '@streamdown/code';
import { describeInNode, testInNode } from '../../../helpers/index.js';

describeInNode('ported standalone @streamdown/code package', () => {
	testInNode('exposes the default plugin contract and highlights asynchronously', async () => {
		expect(code.name).toBe('shiki');
		expect(code.type).toBe('code-highlighter');
		expect(code.getThemes()).toStrictEqual(['github-light', 'github-dark']);
		expect(code.supportsLanguage('javascript')).toBe(true);
		expect(code.supportsLanguage('typescript')).toBe(true);
		expect(code.supportsLanguage('js' as BundledLanguage)).toBe(true);
		expect(code.supportsLanguage('not-a-real-language' as BundledLanguage)).toBe(false);
		expect(code.getSupportedLanguages()).toContain('javascript');

		const callback = vi.fn();
		const initial = code.highlight(
			{
				code: 'const x = 1;',
				language: 'javascript',
				themes: ['github-light', 'github-dark']
			},
			callback
		);

		expect(initial).toBeNull();
		await vi.waitFor(() => expect(callback).toHaveBeenCalled(), { timeout: 5000 });

		const plugin = createCodePlugin({ themes: ['nord', 'dracula'] });
		const callback1 = vi.fn();
		const callback2 = vi.fn();
		plugin.highlight(
			{ code: 'const multi = 1;', language: 'javascript', themes: ['nord', 'dracula'] },
			callback1
		);
		plugin.highlight(
			{ code: 'const multi = 1;', language: 'javascript', themes: ['nord', 'dracula'] },
			callback2
		);
		await vi.waitFor(() => {
			expect(callback1).toHaveBeenCalled();
			expect(callback2).toHaveBeenCalled();
		}, { timeout: 5000 });
	});
});
