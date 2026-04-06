import { Pluggable } from 'unified';

interface CjkPlugin {
    name: 'cjk';
    /**
     * @deprecated Use remarkPluginsBefore and remarkPluginsAfter instead.
     */
    remarkPlugins: Pluggable[];
    remarkPluginsAfter: Pluggable[];
    remarkPluginsBefore: Pluggable[];
    type: 'cjk';
}
declare function createCjkPlugin(): CjkPlugin;
declare const cjk: CjkPlugin;

export { type CjkPlugin, cjk, createCjkPlugin };
