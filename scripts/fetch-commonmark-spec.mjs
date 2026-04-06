import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_VERSION = '0.31.2';
const RAW_BASE_URL = 'https://spec.commonmark.org';

const args = process.argv.slice(2);
const versionFlagIndex = args.findIndex((arg) => arg === '--version');
const version =
	versionFlagIndex >= 0 && args[versionFlagIndex + 1] ? args[versionFlagIndex + 1] : DEFAULT_VERSION;

const outputDirectory = resolve('references', 'commonmark', version);
const targets = [
	{
		filename: 'spec.txt',
		url: `${RAW_BASE_URL}/${version}/spec.txt`
	},
	{
		filename: 'spec.json',
		url: `${RAW_BASE_URL}/${version}/spec.json`
	}
];

await mkdir(outputDirectory, { recursive: true });

for (const target of targets) {
	const response = await fetch(target.url);
	if (!response.ok) {
		throw new Error(`Failed to download ${target.url}: ${response.status} ${response.statusText}`);
	}

	const body = await response.text();
	await writeFile(resolve(outputDirectory, target.filename), body, 'utf8');
	console.log(`Wrote ${target.filename} for CommonMark ${version}`);
}

const metadata = {
	fetchedAt: new Date().toISOString(),
	sourceBaseUrl: RAW_BASE_URL,
	version
};

await writeFile(resolve(outputDirectory, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(`Wrote metadata.json for CommonMark ${version}`);
