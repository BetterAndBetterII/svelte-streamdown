type VitestGlobal = typeof globalThis & {
	__vitest_browser__?: unknown;
	__vitest_worker__?: unknown;
};

function hasVitestGlobal(): boolean {
	const runtime = globalThis as VitestGlobal;
	return '__vitest_browser__' in runtime || '__vitest_worker__' in runtime;
}

function hasProcessTestEnv(): boolean {
	if (typeof process === 'undefined' || !process.env) {
		return false;
	}

	return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

export function isTestMode(): boolean {
	return hasVitestGlobal() || hasProcessTestEnv();
}
