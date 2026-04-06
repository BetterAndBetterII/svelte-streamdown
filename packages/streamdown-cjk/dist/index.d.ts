import { Pluggable } from 'unified';

/**
 * Plugin for CJK text handling
 */
interface CjkPlugin {
    name: "cjk";
    /**
     * @deprecated Use remarkPluginsBefore and remarkPluginsAfter instead
     * All remark plugins (for backwards compatibility)
     */
    remarkPlugins: Pluggable[];
    /**
     * Remark plugins that must run AFTER remarkGfm
     * (e.g., autolink boundary splitting, strikethrough enhancements)
     */
    remarkPluginsAfter: Pluggable[];
    /**
     * Remark plugins that must run BEFORE remarkGfm
     * (e.g., remark-cjk-friendly which modifies emphasis handling)
     */
    remarkPluginsBefore: Pluggable[];
    type: "cjk";
}
/**
 * Create a CJK plugin
 */
declare function createCjkPlugin(): CjkPlugin;
/**
 * Pre-configured CJK plugin with default settings
 */
declare const cjk: CjkPlugin;

export { type CjkPlugin, cjk, createCjkPlugin };
