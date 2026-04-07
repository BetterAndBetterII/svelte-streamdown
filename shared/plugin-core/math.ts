import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import type { MathPlugin, MathPluginOptions } from './contracts.js';

export type { MathPlugin, MathPluginOptions } from './contracts.js';

export function createMathPlugin(options: MathPluginOptions = {}): MathPlugin {
	return {
		name: 'katex',
		type: 'math',
		remarkPlugin: [remarkMath, { singleDollarTextMath: options.singleDollarTextMath ?? false }],
		rehypePlugin: [rehypeKatex, { errorColor: options.errorColor ?? 'var(--color-muted-foreground)' }],
		getStyles() {
			return 'katex/dist/katex.min.css';
		}
	};
}

export const math = createMathPlugin();
