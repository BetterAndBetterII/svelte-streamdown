import { expect } from 'vitest';
import { createMathPlugin, math } from '@streamdown/math';
import { describeInNode, testInNode } from '../../../helpers/index.js';

describeInNode('ported standalone @streamdown/math package', () => {
	testInNode('exposes the default plugin contract and option plumbing', () => {
		expect(math.name).toBe('katex');
		expect(math.type).toBe('math');
		expect(Array.isArray(math.remarkPlugin)).toBe(true);
		expect(Array.isArray(math.rehypePlugin)).toBe(true);
		expect(math.getStyles?.()).toBe('katex/dist/katex.min.css');

		const plugin = createMathPlugin({ singleDollarTextMath: true, errorColor: '#ff0000' });
		const [, remarkOptions] = plugin.remarkPlugin as [unknown, { singleDollarTextMath: boolean }];
		const [, rehypeOptions] = plugin.rehypePlugin as [unknown, { errorColor: string }];
		expect(remarkOptions.singleDollarTextMath).toBe(true);
		expect(rehypeOptions.errorColor).toBe('#ff0000');
	});
});
