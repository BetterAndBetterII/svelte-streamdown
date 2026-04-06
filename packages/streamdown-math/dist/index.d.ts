import { Pluggable } from 'unified';

/**
 * Plugin for math rendering (KaTeX)
 */
interface MathPlugin {
    /**
     * Get CSS styles path for math rendering
     */
    getStyles?: () => string;
    name: "katex";
    /**
     * Rehype plugin for rendering math
     */
    rehypePlugin: Pluggable;
    /**
     * Remark plugin for parsing math syntax
     */
    remarkPlugin: Pluggable;
    type: "math";
}
/**
 * Options for creating a math plugin
 */
interface MathPluginOptions {
    /**
     * KaTeX error color
     * @default "var(--color-muted-foreground)"
     */
    errorColor?: string;
    /**
     * Enable single dollar sign for inline math ($...$)
     * @default false
     */
    singleDollarTextMath?: boolean;
}
/**
 * Create a math plugin with optional configuration
 */
declare function createMathPlugin(options?: MathPluginOptions): MathPlugin;
/**
 * Pre-configured math plugin with default settings
 */
declare const math: MathPlugin;

export { type MathPlugin, type MathPluginOptions, createMathPlugin, math };
