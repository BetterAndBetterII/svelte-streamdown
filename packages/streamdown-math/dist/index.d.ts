import { Pluggable } from 'unified';

interface MathPlugin {
    getStyles?: () => string;
    name: 'katex';
    reason?: string;
    rehypePlugin: Pluggable;
    remarkPlugin: Pluggable;
    type: 'math';
}
interface MathPluginOptions {
    errorColor?: string;
    singleDollarTextMath?: boolean;
}

declare function createMathPlugin(options?: MathPluginOptions): MathPlugin;
declare const math: MathPlugin;

export { type MathPlugin, type MathPluginOptions, createMathPlugin, math };
