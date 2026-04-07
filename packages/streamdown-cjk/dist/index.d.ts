import { Pluggable } from 'unified';

interface CjkPlugin {
    name: 'cjk';
    remarkPlugins: Pluggable[];
    remarkPluginsAfter: Pluggable[];
    remarkPluginsBefore: Pluggable[];
    type: 'cjk';
}
declare function createCjkPlugin(): CjkPlugin;
declare const cjk: CjkPlugin;

export { type CjkPlugin, cjk, createCjkPlugin };
