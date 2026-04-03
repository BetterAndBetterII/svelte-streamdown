import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	verifyReleaseArtifactMetadata,
	writeReleaseArtifactMetadata
} from './lib/release-artifacts.mjs';

function main() {
	const outputDirectory = mkdtempSync(join(tmpdir(), 'svelte-streamdown-release-metadata-'));

	try {
		writeReleaseArtifactMetadata({
			outputDirectory
		});

		const verificationResult = verifyReleaseArtifactMetadata(outputDirectory);

		console.log(
			JSON.stringify(
				{
					...verificationResult,
					requiredFiles: [
						'build-metadata.json',
						'artifact-metadata.json',
						'provenance-metadata.json',
						`${verificationResult.tarball}.sha256`
					]
				},
				null,
				2
			)
		);
	} finally {
		rmSync(outputDirectory, {
			force: true,
			recursive: true
		});
	}
}

main();
