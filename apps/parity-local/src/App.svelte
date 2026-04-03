<script lang="ts">
	import { Streamdown } from '../../../src/lib/index.js';
	import Code from '../../../src/lib/Elements/Code.svelte';
	import Mermaid from '../../../src/lib/Elements/Mermaid.svelte';
	import { onMount } from 'svelte';
	import type { ParityFixtureId } from '../../../fixtures/parity/fixture-registry.js';
	import { resolveParityFixture, listParityFixtures } from '../../parity-shared/fixtures.js';

	const fixtureOptions = listParityFixtures();

	let currentFixture = resolveParityFixture(null);
	let currentFixtureId: ParityFixtureId = currentFixture.id;

	const replaceFixtureInUrl = (fixtureId: ParityFixtureId) => {
		const url = new URL(window.location.href);
		url.searchParams.set('fixture', fixtureId);
		window.history.replaceState(null, '', url);
	};

	const applyFixture = (rawFixtureId: string | null | undefined) => {
		currentFixture = resolveParityFixture(rawFixtureId);
		currentFixtureId = currentFixture.id;
		replaceFixtureInUrl(currentFixture.id);
	};

	const handleFixtureChange = (event: Event) => {
		applyFixture((event.currentTarget as HTMLSelectElement).value);
	};

	onMount(() => {
		applyFixture(new URL(window.location.href).searchParams.get('fixture'));
	});
</script>

<div class="parity-app" data-parity-app="local">
	<div class="parity-shell">
		<header class="parity-header">
			<div>
				<h1>Local Svelte Streamdown Harness</h1>
				<p>
					Shared query route: <code>/?fixture=&lt;fixture-id&gt;</code>. The rendered output below
					is the local `svelte-streamdown` target for browser parity tests.
				</p>
			</div>

			<div class="parity-picker">
				<label for="parity-local-fixture">Fixture</label>
				<select
					id="parity-local-fixture"
					name="fixture"
					bind:value={currentFixtureId}
					on:change={handleFixtureChange}
				>
					{#each fixtureOptions as fixture}
						<option value={fixture.id}>{fixture.id}</option>
					{/each}
				</select>
			</div>
		</header>

		<div class="parity-grid">
			<section class="parity-panel">
				<h2>Source Fixture</h2>
				<p data-parity-fixture-id>{currentFixture.id}</p>
				<textarea class="parity-source" data-parity-source readonly value={currentFixture.markdown}
				></textarea>
			</section>

			<section class="parity-panel">
				<h2>Rendered Output</h2>
				<p>{currentFixture.label}</p>
				<div class="parity-rendered" data-parity-rendered>
					<Streamdown
						content={currentFixture.markdown}
						static
						components={{ code: Code, mermaid: Mermaid }}
					/>
				</div>
			</section>
		</div>
	</div>
</div>
