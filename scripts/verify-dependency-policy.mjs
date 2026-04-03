import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const policyPath = join(repoRoot, 'config', 'dependency-policy.json');
const severityRank = {
	info: 0,
	low: 1,
	moderate: 2,
	high: 3,
	critical: 4
};

function readJsonFile(path, label) {
	try {
		return JSON.parse(readFileSync(path, 'utf8'));
	} catch (error) {
		throw new Error(`${label} could not be parsed as JSON: ${error.message}`);
	}
}

function assertRecord(value, label) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}

	return value;
}

function assertString(value, label) {
	if (typeof value !== 'string' || value.trim() === '') {
		throw new Error(`${label} must be a non-empty string`);
	}

	return value.trim();
}

function assertStringArray(value, label) {
	if (!Array.isArray(value)) {
		throw new Error(`${label} must be an array`);
	}

	return value.map((entry, index) => assertString(entry, `${label}[${index}]`));
}

function parseApprovedAdvisory(rawAdvisory, label) {
	const advisory = assertRecord(rawAdvisory, label);

	return {
		id: assertString(advisory.id, `${label}.id`),
		module: assertString(advisory.module, `${label}.module`),
		reason: assertString(advisory.reason, `${label}.reason`),
		reviewBy: assertString(advisory.reviewBy, `${label}.reviewBy`)
	};
}

function parseAuditScope(rawScope, scopeName) {
	const scope = assertRecord(rawScope, `audit.scopes.${scopeName}`);
	const threshold = assertString(scope.threshold, `audit.scopes.${scopeName}.threshold`);

	if (!(threshold in severityRank)) {
		throw new Error(
			`audit.scopes.${scopeName}.threshold must be one of ${Object.keys(severityRank).join(', ')}`
		);
	}

	const approvedAdvisories = Array.isArray(scope.approvedAdvisories)
		? scope.approvedAdvisories.map((entry, index) =>
				parseApprovedAdvisory(entry, `audit.scopes.${scopeName}.approvedAdvisories[${index}]`)
			)
		: [];

	return {
		threshold,
		approvedAdvisories: new Map(approvedAdvisories.map((entry) => [entry.id, entry]))
	};
}

function parseApprovedPackage(rawPackage, label) {
	const approvedPackage = assertRecord(rawPackage, label);

	return {
		name: assertString(approvedPackage.name, `${label}.name`),
		license: assertString(approvedPackage.license, `${label}.license`),
		reason: assertString(approvedPackage.reason, `${label}.reason`),
		evidence: assertString(approvedPackage.evidence, `${label}.evidence`),
		reviewBy: assertString(approvedPackage.reviewBy, `${label}.reviewBy`)
	};
}

function parseLicenseScope(rawScope, scopeName) {
	const scope = assertRecord(rawScope, `licenses.scopes.${scopeName}`);
	const allowedLicenses = new Set(
		assertStringArray(scope.allowedLicenses, `licenses.scopes.${scopeName}.allowedLicenses`)
	);
	const approvedPackages = Array.isArray(scope.approvedPackages)
		? scope.approvedPackages.map((entry, index) =>
				parseApprovedPackage(entry, `licenses.scopes.${scopeName}.approvedPackages[${index}]`)
			)
		: [];

	return {
		allowedLicenses,
		approvedPackages: new Map(
			approvedPackages.map((entry) => [`${entry.name}::${entry.license}`, entry])
		)
	};
}

function parsePolicy(rawPolicy) {
	const policy = assertRecord(rawPolicy, 'dependency policy');
	const audit = assertRecord(policy.audit, 'dependency policy.audit');
	const auditScopes = assertRecord(audit.scopes, 'dependency policy.audit.scopes');
	const licenses = assertRecord(policy.licenses, 'dependency policy.licenses');
	const licenseScopes = assertRecord(licenses.scopes, 'dependency policy.licenses.scopes');

	return {
		auditScopes: new Map(
			Object.entries(auditScopes).map(([scopeName, scopeValue]) => [
				scopeName,
				parseAuditScope(scopeValue, scopeName)
			])
		),
		licenseScopes: new Map(
			Object.entries(licenseScopes).map(([scopeName, scopeValue]) => [
				scopeName,
				parseLicenseScope(scopeValue, scopeName)
			])
		)
	};
}

function runJsonCommand(command, args, label) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: 'pipe',
		maxBuffer: 20 * 1024 * 1024
	});

	if (result.error) {
		throw result.error;
	}

	const stdout = result.stdout.trim();
	const stderr = result.stderr.trim();

	if (!stdout) {
		throw new Error([`${label} produced no JSON output`, stderr].filter(Boolean).join('\n'));
	}

	try {
		return {
			status: result.status ?? 0,
			json: JSON.parse(stdout)
		};
	} catch (error) {
		throw new Error(
			[`${label} returned invalid JSON`, stderr, stdout.slice(0, 1000), error.message]
				.filter(Boolean)
				.join('\n')
		);
	}
}

function parseAuditReport(rawReport, scopeName) {
	const report = assertRecord(rawReport, `pnpm audit report (${scopeName})`);
	const advisoriesRecord = assertRecord(
		report.advisories ?? {},
		`pnpm audit advisories (${scopeName})`
	);
	const advisories = Object.values(advisoriesRecord).map((entry, index) => {
		const advisory = assertRecord(entry, `pnpm audit advisory (${scopeName})[${index}]`);

		return {
			id: assertString(String(advisory.id), `pnpm audit advisory (${scopeName})[${index}].id`),
			module: assertString(
				advisory.module_name,
				`pnpm audit advisory (${scopeName})[${index}].module_name`
			),
			severity: assertString(
				advisory.severity,
				`pnpm audit advisory (${scopeName})[${index}].severity`
			),
			url: assertString(advisory.url, `pnpm audit advisory (${scopeName})[${index}].url`),
			recommendation:
				typeof advisory.recommendation === 'string' && advisory.recommendation.trim()
					? advisory.recommendation.trim()
					: 'No recommendation provided'
		};
	});

	for (const advisory of advisories) {
		if (!(advisory.severity in severityRank)) {
			throw new Error(
				`Unsupported advisory severity "${advisory.severity}" in ${scopeName} audit report`
			);
		}
	}

	return advisories.sort((left, right) => left.id.localeCompare(right.id));
}

function evaluateAuditScope(scopeName, policyScope) {
	const args = ['audit', '--json'];

	if (scopeName === 'prod') {
		args.push('--prod');
	} else if (scopeName === 'dev') {
		args.push('--dev');
	} else {
		throw new Error(`Unsupported audit scope "${scopeName}"`);
	}

	const { json } = runJsonCommand('pnpm', args, `pnpm ${args.join(' ')}`);
	const advisories = parseAuditReport(json, scopeName);
	const relevantAdvisories = advisories.filter(
		(advisory) => severityRank[advisory.severity] >= severityRank[policyScope.threshold]
	);
	const approved = [];
	const unapproved = [];

	for (const advisory of relevantAdvisories) {
		const exception = policyScope.approvedAdvisories.get(advisory.id);

		if (exception && exception.module === advisory.module) {
			approved.push({
				...advisory,
				reason: exception.reason,
				reviewBy: exception.reviewBy
			});
			continue;
		}

		unapproved.push(advisory);
	}

	return {
		scope: scopeName,
		threshold: policyScope.threshold,
		relevantCount: relevantAdvisories.length,
		approvedCount: approved.length,
		unapprovedCount: unapproved.length,
		approved,
		unapproved
	};
}

function parseLicenseInventory(rawInventory, scopeName) {
	const inventory = assertRecord(rawInventory, `pnpm licenses list (${scopeName})`);
	const packages = [];

	for (const [licenseName, rawPackages] of Object.entries(inventory)) {
		if (!Array.isArray(rawPackages)) {
			throw new Error(
				`pnpm licenses list (${scopeName}) entry for ${licenseName} must be an array`
			);
		}

		for (const [index, rawPackage] of rawPackages.entries()) {
			const pkg = assertRecord(
				rawPackage,
				`pnpm licenses list (${scopeName}) ${licenseName}[${index}]`
			);

			packages.push({
				name: assertString(
					pkg.name,
					`pnpm licenses list (${scopeName}) ${licenseName}[${index}].name`
				),
				license: assertString(
					pkg.license,
					`pnpm licenses list (${scopeName}) ${licenseName}[${index}].license`
				),
				versions: Array.isArray(pkg.versions)
					? pkg.versions.map((version, versionIndex) =>
							assertString(
								version,
								`pnpm licenses list (${scopeName}) ${licenseName}[${index}].versions[${versionIndex}]`
							)
						)
					: []
			});
		}
	}

	return packages.sort((left, right) => left.name.localeCompare(right.name));
}

function evaluateLicenseScope(scopeName, policyScope) {
	const args = ['licenses', 'list', '--json'];

	if (scopeName === 'prod') {
		args.push('--prod');
	} else if (scopeName === 'dev') {
		args.push('--dev');
	} else {
		throw new Error(`Unsupported license scope "${scopeName}"`);
	}

	const { json } = runJsonCommand('pnpm', args, `pnpm ${args.join(' ')}`);
	const packages = parseLicenseInventory(json, scopeName);
	const licenseCounts = {};
	const approved = [];
	const unapproved = [];

	for (const pkg of packages) {
		licenseCounts[pkg.license] = (licenseCounts[pkg.license] ?? 0) + 1;

		if (policyScope.allowedLicenses.has(pkg.license)) {
			continue;
		}

		const exception = policyScope.approvedPackages.get(`${pkg.name}::${pkg.license}`);

		if (exception) {
			approved.push({
				...pkg,
				reason: exception.reason,
				evidence: exception.evidence,
				reviewBy: exception.reviewBy
			});
			continue;
		}

		unapproved.push(pkg);
	}

	return {
		scope: scopeName,
		licenseCounts,
		approvedCount: approved.length,
		unapprovedCount: unapproved.length,
		approved,
		unapproved
	};
}

function main() {
	const policy = parsePolicy(readJsonFile(policyPath, 'dependency policy'));
	const audit = Object.fromEntries(
		[...policy.auditScopes.entries()].map(([scopeName, scopePolicy]) => [
			scopeName,
			evaluateAuditScope(scopeName, scopePolicy)
		])
	);
	const licenses = Object.fromEntries(
		[...policy.licenseScopes.entries()].map(([scopeName, scopePolicy]) => [
			scopeName,
			evaluateLicenseScope(scopeName, scopePolicy)
		])
	);
	const failures = [
		...Object.values(audit)
			.filter((scope) => scope.unapprovedCount > 0)
			.map((scope) => `${scope.scope} audit has ${scope.unapprovedCount} unapproved advisories`),
		...Object.values(licenses)
			.filter((scope) => scope.unapprovedCount > 0)
			.map((scope) => `${scope.scope} licenses have ${scope.unapprovedCount} unapproved packages`)
	];

	console.log(
		JSON.stringify(
			{
				policyPath: 'config/dependency-policy.json',
				audit,
				licenses,
				ok: failures.length === 0,
				failures
			},
			null,
			2
		)
	);

	if (failures.length > 0) {
		process.exitCode = 1;
	}
}

main();
