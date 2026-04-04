import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

function parseOptionalNonEmptyString(value) {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function parseRequiredNonEmptyString(value, label) {
	const parsed = parseOptionalNonEmptyString(value);

	if (!parsed) {
		throw new Error(`${label} must be a non-empty string`);
	}

	return parsed;
}

function parseBooleanString(value, label) {
	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	throw new Error(`${label} must be true or false`);
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runCommand(command, args, label) {
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		stdio: 'pipe',
		maxBuffer: 10 * 1024 * 1024
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(
			[label, result.stderr.trim(), result.stdout.trim()].filter(Boolean).join('\n') ||
				`${command} ${args.join(' ')} failed`
		);
	}

	return result.stdout.trim();
}

function computeHashes(path) {
	const contents = readFileSync(path);

	return {
		sha256: createHash('sha256').update(contents).digest('hex'),
		sha512: createHash('sha512').update(contents).digest('hex')
	};
}

function loadReleaseMetadataBundle(metadataDirectory) {
	const buildMetadataPath = join(metadataDirectory, 'build-metadata.json');
	const artifactMetadataPath = join(metadataDirectory, 'artifact-metadata.json');
	const provenanceMetadataPath = join(metadataDirectory, 'provenance-metadata.json');
	const buildMetadata = readJson(buildMetadataPath);
	const artifactMetadata = readJson(artifactMetadataPath);
	const provenanceMetadata = readJson(provenanceMetadataPath);
	const tarballPath = join(metadataDirectory, artifactMetadata.tarball.fileName);

	return {
		buildMetadataPath,
		provenanceMetadataPath,
		buildMetadata,
		artifactMetadata,
		provenanceMetadata,
		tarballPath
	};
}

function createSharedEvidence(metadata) {
	const { buildMetadata, artifactMetadata, provenanceMetadata } = metadata;

	return {
		source: {
			repository: buildMetadata.source.repository,
			commitSha: buildMetadata.source.commitSha,
			ref: buildMetadata.source.ref,
			refName: buildMetadata.source.refName,
			eventName: buildMetadata.source.eventName,
			workflow: buildMetadata.source.workflow,
			workflowRef: buildMetadata.source.workflowRef,
			job: buildMetadata.source.job,
			runId: buildMetadata.source.runId,
			runAttempt: buildMetadata.source.runAttempt,
			runUrl: buildMetadata.source.runUrl
		},
		package: {
			name: buildMetadata.package.name,
			version: buildMetadata.package.version,
			tagName: `v${buildMetadata.package.version}`
		},
		artifact: artifactMetadata.tarball,
		githubAttestation: provenanceMetadata.githubAttestation
	};
}

function createSkipReason(command, publishRequested, publishAllowed, explicitSkipReason) {
	const providedReason = parseOptionalNonEmptyString(explicitSkipReason);

	if (providedReason) {
		return providedReason;
	}

	if (!publishRequested) {
		return `${command} was not requested for this workflow run`;
	}

	if (!publishAllowed) {
		return 'publish is only allowed from workflow_dispatch runs on refs/heads/master';
	}

	return `${command} did not run`;
}

function parseCommand(argv) {
	const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv;
	const { values, positionals } = parseArgs({
		args: normalizedArgv,
		options: {
			'metadata-dir': {
				type: 'string'
			},
			output: {
				type: 'string'
			},
			'publish-requested': {
				type: 'string'
			},
			'publish-allowed': {
				type: 'string'
			},
			'publish-performed': {
				type: 'string'
			},
			'skip-reason': {
				type: 'string'
			},
			'attestation-url': {
				type: 'string'
			},
			'bundle-path': {
				type: 'string'
			}
		},
		allowPositionals: true
	});

	if (positionals.length !== 1) {
		throw new Error('Expected exactly one command: publish or verify');
	}

	const command = parseRequiredNonEmptyString(positionals[0], 'command');

	if (command !== 'publish' && command !== 'verify') {
		throw new Error(`Unsupported command "${command}"`);
	}

	const metadataDirectory = resolve(
		parseOptionalNonEmptyString(values['metadata-dir']) ?? 'artifacts/release'
	);
	const defaultOutputName =
		command === 'publish' ? 'publish-with-provenance.json' : 'post-publish-verify.json';

	return {
		command,
		metadataDirectory,
		outputPath: resolve(
			parseOptionalNonEmptyString(values.output) ?? join(metadataDirectory, defaultOutputName)
		),
		publishRequested: parseBooleanString(
			values['publish-requested'] ?? 'false',
			'publish-requested'
		),
		publishAllowed: parseBooleanString(values['publish-allowed'] ?? 'false', 'publish-allowed'),
		publishPerformed: parseBooleanString(
			values['publish-performed'] ?? 'false',
			'publish-performed'
		),
		skipReason: parseOptionalNonEmptyString(values['skip-reason']),
		attestationUrl: parseOptionalNonEmptyString(values['attestation-url']),
		bundlePath: parseOptionalNonEmptyString(values['bundle-path'])
	};
}

function writePublishEvidence(options) {
	const metadata = loadReleaseMetadataBundle(options.metadataDirectory);
	const { provenanceMetadataPath, provenanceMetadata } = metadata;
	const sharedEvidence = createSharedEvidence(metadata);
	const skipReason = options.publishPerformed
		? null
		: createSkipReason(
				'publish-with-provenance',
				options.publishRequested,
				options.publishAllowed,
				options.skipReason
			);
	const packageUrl = options.publishPerformed
		? `https://www.npmjs.com/package/${sharedEvidence.package.name}/v/${sharedEvidence.package.version}`
		: null;

	provenanceMetadata.githubAttestation.attestationUrl =
		options.attestationUrl ?? provenanceMetadata.githubAttestation.attestationUrl ?? null;
	provenanceMetadata.githubAttestation.bundlePath =
		options.bundlePath ?? provenanceMetadata.githubAttestation.bundlePath ?? null;
	provenanceMetadata.npmProvenance.publishRequested = options.publishRequested;
	provenanceMetadata.npmProvenance.publishAllowed = options.publishAllowed;
	provenanceMetadata.npmProvenance.publishSkippedReason = skipReason;
	provenanceMetadata.npmProvenance.published = options.publishPerformed;
	provenanceMetadata.npmProvenance.publishMethod = options.publishPerformed
		? 'trusted-publishing'
		: null;
	provenanceMetadata.npmProvenance.packageUrl = packageUrl;
	provenanceMetadata.npmProvenance.tagName = options.publishPerformed
		? sharedEvidence.package.tagName
		: null;

	writeJson(provenanceMetadataPath, provenanceMetadata);

	writeJson(options.outputPath, {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		job: 'publish-with-provenance',
		result: options.publishPerformed ? 'published' : 'skipped',
		requested: options.publishRequested,
		allowed: options.publishAllowed,
		skipReason,
		...sharedEvidence,
		npmProvenance: {
			expectedWhenTrustedPublishing: provenanceMetadata.npmProvenance.expectedWhenTrustedPublishing,
			published: options.publishPerformed,
			publishMethod: provenanceMetadata.npmProvenance.publishMethod,
			packageUrl,
			tagName: provenanceMetadata.npmProvenance.tagName
		}
	});
}

function buildVerificationCheck(name, expected, actual) {
	return {
		expected,
		actual,
		passed: expected === actual
	};
}

function writeVerifyEvidence(options) {
	const metadata = loadReleaseMetadataBundle(options.metadataDirectory);
	const sharedEvidence = createSharedEvidence(metadata);
	const skipReason = options.publishPerformed
		? null
		: createSkipReason(
				'post-publish-verify',
				options.publishRequested,
				options.publishAllowed,
				options.skipReason
			);

	if (!options.publishPerformed) {
		writeJson(options.outputPath, {
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			job: 'post-publish-verify',
			result: 'skipped',
			requested: options.publishRequested,
			allowed: options.publishAllowed,
			skipReason,
			...sharedEvidence
		});
		return;
	}

	const packageSpec = `${sharedEvidence.package.name}@${sharedEvidence.package.version}`;
	const registryMetadata = JSON.parse(
		runCommand(
			'npm',
			['view', packageSpec, 'version', 'dist.integrity', 'dist.tarball', 'gitHead', '--json'],
			'npm view'
		)
	);
	const registryTarballUrl = parseRequiredNonEmptyString(
		registryMetadata.dist?.tarball,
		'registry tarball url'
	);
	const downloadDirectory = mkdtempSync(join(tmpdir(), 'svelte-streamdown-release-verify-'));
	const downloadedTarballPath = join(downloadDirectory, basename(metadata.tarballPath));

	try {
		runCommand(
			'curl',
			['-LsSf', registryTarballUrl, '--output', downloadedTarballPath],
			'curl registry tarball'
		);

		const registryHashes = computeHashes(downloadedTarballPath);
		const tagCommit = runCommand(
			'git',
			['rev-parse', sharedEvidence.package.tagName],
			'git rev-parse tag'
		);
		const checks = {
			version: buildVerificationCheck(sharedEvidence.package.version, registryMetadata.version),
			integrity: buildVerificationCheck(
				metadata.artifactMetadata.tarball.integrity,
				registryMetadata.dist?.integrity ?? null
			),
			sha256: buildVerificationCheck(
				metadata.artifactMetadata.tarball.sha256,
				registryHashes.sha256
			),
			sha512: buildVerificationCheck(
				metadata.artifactMetadata.tarball.sha512,
				registryHashes.sha512
			),
			gitHead: buildVerificationCheck(
				sharedEvidence.source.commitSha,
				registryMetadata.gitHead ?? null
			),
			tagCommit: buildVerificationCheck(sharedEvidence.source.commitSha, tagCommit)
		};
		const passed = Object.values(checks).every((check) => check.passed);

		writeJson(options.outputPath, {
			schemaVersion: 1,
			generatedAt: new Date().toISOString(),
			job: 'post-publish-verify',
			result: passed ? 'passed' : 'failed',
			requested: options.publishRequested,
			allowed: options.publishAllowed,
			skipReason: null,
			...sharedEvidence,
			registry: {
				packageSpec,
				tarballUrl: registryTarballUrl
			},
			checks
		});

		if (!passed) {
			process.exitCode = 1;
		}
	} finally {
		rmSync(downloadDirectory, {
			force: true,
			recursive: true
		});
	}
}

const command = parseCommand(process.argv.slice(2));

if (command.command === 'publish') {
	writePublishEvidence(command);
} else {
	writeVerifyEvidence(command);
}
