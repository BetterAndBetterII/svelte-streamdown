import { IncompleteMarkdownParser, type Plugin } from 'remend';

const LOCAL_RECOVERY_PLUGIN_NAMES = [
	'strikethrough',
	'doubleUnderscoreItalic',
	'singleAsteriskItalic',
	'singleUnderscoreItalic',
	'inlineCode',
	'links'
] as const;

const createLocalIncompleteMarkdownParser = (): IncompleteMarkdownParser => {
	const plugins = IncompleteMarkdownParser.createDefaultPlugins();
	const localPluginNames = new Set<string>(LOCAL_RECOVERY_PLUGIN_NAMES);
	const localPlugins = new Map(
		plugins
			.filter((plugin) => localPluginNames.has(plugin.name))
			.map((plugin) => [plugin.name, plugin] as const)
	);
	const basePlugins = plugins.filter((plugin) => !localPluginNames.has(plugin.name));
	const boldPluginIndex = basePlugins.findIndex((plugin) => plugin.name === 'bold');

	if (boldPluginIndex === -1) {
		return new IncompleteMarkdownParser(plugins);
	}

	basePlugins.splice(
		boldPluginIndex + 1,
		0,
		...LOCAL_RECOVERY_PLUGIN_NAMES.map((pluginName) => localPlugins.get(pluginName)).filter(
			(plugin): plugin is Plugin => plugin != null
		)
	);

	return new IncompleteMarkdownParser(basePlugins);
};

const localIncompleteMarkdownParser = createLocalIncompleteMarkdownParser();

export { IncompleteMarkdownParser, type Plugin } from 'remend';

export const parseIncompleteMarkdown = (text: string): string =>
	localIncompleteMarkdownParser.parse(text);
