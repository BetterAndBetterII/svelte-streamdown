import { defineConfig } from 'tsup';

export function createTsupPackageConfig(options = {}) {
	const {
		entry = ['src/index.ts'],
		clean = true,
		dts = true,
		format = ['esm'],
		outDir = 'dist',
		sourcemap = true,
		target = 'es2022'
	} = options;

	return defineConfig({
		clean,
		dts,
		entry,
		format,
		outDir,
		sourcemap,
		target,
		treeshake: true
	});
}
