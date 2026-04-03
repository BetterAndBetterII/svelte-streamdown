import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const packageJsonPath = join(repoRoot, 'package.json');

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

export function runCommand(command, args, label, cwd = repoRoot) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		stdio: 'pipe',
		maxBuffer: 10 * 1024 * 1024
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		const stderr = result.stderr.trim();
		const stdout = result.stdout.trim();
		throw new Error(
			[`${label} failed`, stderr, stdout].filter(Boolean).join('\n') ||
				`Failed to run ${command} ${args.join(' ')}`
		);
	}

	return result.stdout.trim();
}

export function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readRootPackageJson() {
	return readJson(packageJsonPath);
}

function createPackDestination() {
	return mkdtempSync(join(tmpdir(), 'svelte-streamdown-release-pack-'));
}

function clearReleaseArtifactOutputs(outputDirectory) {
	for (const entry of readdirSync(outputDirectory)) {
		if (
			entry.endsWith('.tgz') ||
			entry.endsWith('.sha256') ||
			entry === 'build-metadata.json' ||
			entry === 'artifact-metadata.json' ||
			entry === 'provenance-metadata.json'
		) {
			rmSync(join(outputDirectory, entry), {
				force: true
			});
		}
	}
}

function findTarball(packDestination) {
	const tarballs = readdirSync(packDestination).filter((entry) => entry.endsWith('.tgz'));

	if (tarballs.length !== 1) {
		throw new Error(
			`Expected exactly one tarball from pnpm pack, found ${tarballs.length}: ${tarballs.join(', ')}`
		);
	}

	return join(packDestination, tarballs[0]);
}

function toRepoRelativePath(path) {
	const relativePath = relative(repoRoot, path);
	return relativePath.split(sep).join('/');
}

function computeHashes(filePath) {
	const content = readFileSync(filePath);

	return {
		sha256: createHash('sha256').update(content).digest('hex'),
		sha512: createHash('sha512').update(content).digest('hex'),
		integrity: `sha512-${createHash('sha512').update(content).digest('base64')}`
	};
}

function readRepositoryIdentifier(packageJson, env) {
	const githubRepository = parseOptionalNonEmptyString(env.GITHUB_REPOSITORY);

	if (githubRepository) {
		return githubRepository;
	}

	const repositoryField = packageJson.repository;

	if (typeof repositoryField === 'string') {
		return repositoryField;
	}

	if (repositoryField && typeof repositoryField === 'object' && !Array.isArray(repositoryField)) {
		return parseOptionalNonEmptyString(repositoryField.url) ?? 'unknown';
	}

	return 'unknown';
}

function readGitCommitSha(env) {
	return (
		parseOptionalNonEmptyString(env.GITHUB_SHA) ??
		runCommand('git', ['rev-parse', 'HEAD'], 'git rev-parse')
	);
}

function readPnpmVersion() {
	return runCommand('pnpm', ['--version'], 'pnpm --version');
}

function createBuildMetadata(packageJson, env) {
	const repository = readRepositoryIdentifier(packageJson, env);
	const commitSha = readGitCommitSha(env);
	const serverUrl = parseOptionalNonEmptyString(env.GITHUB_SERVER_URL) ?? 'https://github.com';
	const runId = parseOptionalNonEmptyString(env.GITHUB_RUN_ID);
	const runUrl =
		repository !== 'unknown' && runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : null;

	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		package: {
			name: packageJson.name,
			version: packageJson.version
		},
		source: {
			repository,
			commitSha,
			ref: parseOptionalNonEmptyString(env.GITHUB_REF),
			refName: parseOptionalNonEmptyString(env.GITHUB_REF_NAME),
			eventName: parseOptionalNonEmptyString(env.GITHUB_EVENT_NAME),
			workflow: parseOptionalNonEmptyString(env.GITHUB_WORKFLOW),
			workflowRef: parseOptionalNonEmptyString(env.GITHUB_WORKFLOW_REF),
			job: parseOptionalNonEmptyString(env.GITHUB_JOB),
			runId,
			runAttempt: parseOptionalNonEmptyString(env.GITHUB_RUN_ATTEMPT),
			runUrl,
			actor: parseOptionalNonEmptyString(env.GITHUB_ACTOR)
		},
		build: {
			ciProvider:
				env.GITHUB_ACTIONS === 'true' ? 'github-actions' : env.CI ? 'generic-ci' : 'local',
			nodeVersion: process.version,
			pnpmVersion: readPnpmVersion(),
			platform: process.platform,
			arch: process.arch
		}
	};
}

function createArtifactMetadata(packageJson, tarballPath) {
	const stats = statSync(tarballPath);
	const hashes = computeHashes(tarballPath);

	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		package: {
			name: packageJson.name,
			version: packageJson.version
		},
		tarball: {
			fileName: basename(tarballPath),
			sizeBytes: stats.size,
			sha256: hashes.sha256,
			sha512: hashes.sha512,
			integrity: hashes.integrity
		}
	};
}

function createProvenanceMetadata(buildMetadata, artifactMetadata, env, outputDirectory) {
	const inGitHubActions = buildMetadata.build.ciProvider === 'github-actions';
	const repository = buildMetadata.source.repository;
	const tarballFileName = artifactMetadata.tarball.fileName;

	return {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		subject: {
			name: tarballFileName,
			sha256: artifactMetadata.tarball.sha256
		},
		githubAttestation: {
			supported: inGitHubActions,
			repository: repository === 'unknown' ? null : repository,
			signerWorkflow: inGitHubActions ? '.github/workflows/release.yml' : null,
			verifyCommand:
				inGitHubActions && repository !== 'unknown'
					? `gh attestation verify ${resolve(outputDirectory, tarballFileName)} --repo ${repository}`
					: null,
			attestationUrl: null
		},
		npmProvenance: {
			expectedWhenTrustedPublishing: inGitHubActions,
			publishCommand: `npm publish ${resolve(outputDirectory, tarballFileName)}`,
			requirements: {
				publicRepository: true,
				publicPackage: true,
				githubHostedRunner: true,
				trustedPublisherWorkflow: 'release.yml'
			},
			published: false
		}
	};
}

function writeSha256File(outputDirectory, artifactMetadata) {
	const fileName = `${artifactMetadata.tarball.fileName}.sha256`;
	const content = `${artifactMetadata.tarball.sha256}  ${artifactMetadata.tarball.fileName}\n`;
	const outputPath = join(outputDirectory, fileName);
	writeFileSync(outputPath, content);
	return outputPath;
}

export function parseReleaseMetadataCommand(argv, cwd = process.cwd()) {
	const { values, positionals } = parseArgs({
		args: argv,
		options: {
			'output-dir': {
				type: 'string'
			}
		},
		allowPositionals: true
	});

	if (positionals.length > 0) {
		throw new Error(`Unexpected positional arguments: ${positionals.join(', ')}`);
	}

	const rawOutputDirectory =
		parseOptionalNonEmptyString(values['output-dir']) ?? 'artifacts/release';

	return {
		outputDirectory: resolve(cwd, rawOutputDirectory)
	};
}

export function writeReleaseArtifactMetadata({ outputDirectory, env = process.env }) {
	const packageJson = readRootPackageJson();
	const resolvedOutputDirectory = parseRequiredNonEmptyString(outputDirectory, 'outputDirectory');

	mkdirSync(resolvedOutputDirectory, {
		recursive: true
	});
	clearReleaseArtifactOutputs(resolvedOutputDirectory);

	const packDestination = createPackDestination();

	try {
		runCommand('pnpm', ['pack', '--pack-destination', packDestination], 'pnpm pack');

		const packedTarball = findTarball(packDestination);
		const copiedTarballPath = join(resolvedOutputDirectory, basename(packedTarball));

		copyFileSync(packedTarball, copiedTarballPath);

		const buildMetadata = createBuildMetadata(packageJson, env);
		const artifactMetadata = createArtifactMetadata(packageJson, copiedTarballPath);
		const provenanceMetadata = createProvenanceMetadata(
			buildMetadata,
			artifactMetadata,
			env,
			resolvedOutputDirectory
		);

		const buildMetadataPath = join(resolvedOutputDirectory, 'build-metadata.json');
		const artifactMetadataPath = join(resolvedOutputDirectory, 'artifact-metadata.json');
		const provenanceMetadataPath = join(resolvedOutputDirectory, 'provenance-metadata.json');
		const sha256Path = writeSha256File(resolvedOutputDirectory, artifactMetadata);

		writeJson(buildMetadataPath, buildMetadata);
		writeJson(artifactMetadataPath, artifactMetadata);
		writeJson(provenanceMetadataPath, provenanceMetadata);

		return {
			outputDirectory: resolvedOutputDirectory,
			files: {
				tarball: copiedTarballPath,
				buildMetadata: buildMetadataPath,
				artifactMetadata: artifactMetadataPath,
				provenanceMetadata: provenanceMetadataPath,
				sha256: sha256Path
			},
			summary: {
				packageName: packageJson.name,
				packageVersion: packageJson.version,
				commitSha: buildMetadata.source.commitSha,
				tarball: toRepoRelativePath(copiedTarballPath),
				sha256: artifactMetadata.tarball.sha256,
				runUrl: buildMetadata.source.runUrl
			}
		};
	} finally {
		rmSync(packDestination, {
			force: true,
			recursive: true
		});
	}
}

export function verifyReleaseArtifactMetadata(outputDirectory, env = process.env) {
	const resolvedOutputDirectory = parseRequiredNonEmptyString(outputDirectory, 'outputDirectory');
	const packageJson = readRootPackageJson();
	const tarballFiles = readdirSync(resolvedOutputDirectory).filter((entry) =>
		entry.endsWith('.tgz')
	);

	if (tarballFiles.length !== 1) {
		throw new Error(
			`Expected exactly one tarball in ${resolvedOutputDirectory}, found ${tarballFiles.length}: ${tarballFiles.join(', ')}`
		);
	}

	const tarballPath = join(resolvedOutputDirectory, tarballFiles[0]);
	const buildMetadataPath = join(resolvedOutputDirectory, 'build-metadata.json');
	const artifactMetadataPath = join(resolvedOutputDirectory, 'artifact-metadata.json');
	const provenanceMetadataPath = join(resolvedOutputDirectory, 'provenance-metadata.json');
	const sha256Path = join(resolvedOutputDirectory, `${tarballFiles[0]}.sha256`);

	for (const path of [
		buildMetadataPath,
		artifactMetadataPath,
		provenanceMetadataPath,
		sha256Path
	]) {
		if (!existsSync(path)) {
			throw new Error(`Missing required release metadata file: ${path}`);
		}
	}

	const buildMetadata = readJson(buildMetadataPath);
	const artifactMetadata = readJson(artifactMetadataPath);
	const provenanceMetadata = readJson(provenanceMetadataPath);
	const sha256File = readFileSync(sha256Path, 'utf8').trim();
	const computedHashes = computeHashes(tarballPath);
	const expectedCommitSha = readGitCommitSha(env);

	if (buildMetadata.package?.name !== packageJson.name) {
		throw new Error(`build-metadata.json package.name mismatch: ${buildMetadata.package?.name}`);
	}

	if (buildMetadata.package?.version !== packageJson.version) {
		throw new Error(
			`build-metadata.json package.version mismatch: ${buildMetadata.package?.version}`
		);
	}

	if (buildMetadata.source?.commitSha !== expectedCommitSha) {
		throw new Error(
			`build-metadata.json source.commitSha mismatch: expected ${expectedCommitSha}, received ${buildMetadata.source?.commitSha}`
		);
	}

	if (artifactMetadata.package?.name !== packageJson.name) {
		throw new Error(
			`artifact-metadata.json package.name mismatch: ${artifactMetadata.package?.name}`
		);
	}

	if (artifactMetadata.package?.version !== packageJson.version) {
		throw new Error(
			`artifact-metadata.json package.version mismatch: ${artifactMetadata.package?.version}`
		);
	}

	if (artifactMetadata.tarball?.fileName !== basename(tarballPath)) {
		throw new Error(
			`artifact-metadata.json tarball.fileName mismatch: ${artifactMetadata.tarball?.fileName}`
		);
	}

	if (artifactMetadata.tarball?.sizeBytes !== statSync(tarballPath).size) {
		throw new Error(
			`artifact-metadata.json tarball.sizeBytes mismatch: ${artifactMetadata.tarball?.sizeBytes}`
		);
	}

	if (artifactMetadata.tarball?.sha256 !== computedHashes.sha256) {
		throw new Error('artifact-metadata.json tarball.sha256 does not match the generated tarball');
	}

	if (artifactMetadata.tarball?.sha512 !== computedHashes.sha512) {
		throw new Error('artifact-metadata.json tarball.sha512 does not match the generated tarball');
	}

	if (artifactMetadata.tarball?.integrity !== computedHashes.integrity) {
		throw new Error(
			'artifact-metadata.json tarball.integrity does not match the generated tarball'
		);
	}

	if (sha256File !== `${computedHashes.sha256}  ${basename(tarballPath)}`) {
		throw new Error(`${basename(sha256Path)} does not match the generated tarball sha256 digest`);
	}

	if (provenanceMetadata.subject?.name !== basename(tarballPath)) {
		throw new Error(
			`provenance-metadata.json subject.name mismatch: ${provenanceMetadata.subject?.name}`
		);
	}

	if (provenanceMetadata.subject?.sha256 !== computedHashes.sha256) {
		throw new Error('provenance-metadata.json subject.sha256 does not match the generated tarball');
	}

	return {
		outputDirectory: resolvedOutputDirectory,
		packageName: packageJson.name,
		packageVersion: packageJson.version,
		commitSha: expectedCommitSha,
		tarball: basename(tarballPath),
		sha256: computedHashes.sha256
	};
}
