import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = new URL('..', import.meta.url);

function runCommand(command, args, label) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: 'pipe'
	});

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

function parseGitStatusEntry(line) {
	if (line.length < 4) {
		throw new Error(`Unexpected git status entry: ${line}`);
	}

	return {
		indexStatus: line[0],
		worktreeStatus: line[1],
		path: line.slice(3)
	};
}

function readGitStatus() {
	const raw = runCommand(
		'git',
		['status', '--short', '--untracked-files=all'],
		'git status --short --untracked-files=all'
	);

	if (!raw) {
		return [];
	}

	return raw
		.split('\n')
		.filter(Boolean)
		.map((line) => parseGitStatusEntry(line.trimEnd()));
}

function assertCleanWorktree(stage) {
	const entries = readGitStatus();

	if (entries.length === 0) {
		return;
	}

	const details = entries
		.map((entry) => `${entry.indexStatus}${entry.worktreeStatus} ${entry.path}`)
		.join('\n');

	throw new Error(`Worktree must stay clean ${stage}.\n${details}`);
}

function removeBuildOutputs() {
	for (const path of ['dist', '.svelte-kit', 'build']) {
		rmSync(new URL(`../${path}`, import.meta.url), {
			force: true,
			recursive: true
		});
	}
}

function createPackDestination() {
	return mkdtempSync(join(tmpdir(), 'svelte-streamdown-pack-'));
}

function main() {
	assertCleanWorktree('before clean build verification starts');
	removeBuildOutputs();
	assertCleanWorktree('after removing local build outputs');

	runCommand('pnpm', ['check'], 'pnpm check');
	assertCleanWorktree('after pnpm check');
	runCommand('pnpm', ['build'], 'pnpm build');
	assertCleanWorktree('after pnpm build');

	const packDestination = createPackDestination();

	try {
		runCommand('pnpm', ['pack', '--pack-destination', packDestination], 'pnpm pack');
		assertCleanWorktree('after pnpm pack');

		const tarballs = readdirSync(packDestination).filter((entry) => entry.endsWith('.tgz'));

		if (tarballs.length !== 1) {
			throw new Error(
				`Expected exactly one tarball from pnpm pack, found ${tarballs.length}: ${tarballs.join(', ')}`
			);
		}

		console.log(
			JSON.stringify(
				{
					check: 'passed',
					build: 'passed',
					pack: 'passed',
					tarball: tarballs[0]
				},
				null,
				2
			)
		);
	} finally {
		rmSync(packDestination, {
			force: true,
			recursive: true
		});
	}
}

main();
