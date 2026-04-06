<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { Streamdown, cjk, code, math, mermaid } from '../../../src/lib/index.js';
	import { listParityFixtures } from '../../parity-shared/fixtures.js';
	import {
		applyParityHarnessUpdate,
		buildParityUrlFromState,
		createDefaultParityHarnessState,
		resolveParityHarnessStateFromUrl,
		type ParityHarnessUpdate
	} from '../../parity-shared/harness-state.js';

	const fixtureOptions = listParityFixtures();
	const defaultPlugins = { code, math, mermaid, cjk };

	let harnessState = createDefaultParityHarnessState();
	let mounted = false;

	function syncUrl(): void {
		if (!mounted) {
			return;
		}

		window.history.replaceState(null, '', buildParityUrlFromState(harnessState));
	}

	async function applyUpdate(update: ParityHarnessUpdate): Promise<void> {
		harnessState = applyParityHarnessUpdate(harnessState, update);
		syncUrl();
		await tick();
	}

	function handleFixtureChange(event: Event): void {
		void applyUpdate({ fixtureId: (event.currentTarget as HTMLSelectElement).value });
	}

	onMount(() => {
		mounted = true;
		harnessState = resolveParityHarnessStateFromUrl(new URL(window.location.href));
		syncUrl();

		window.__STREAMDOWN_PARITY__ = {
			getState: () => ({ ...harnessState }),
			setState: async (update) => {
				await applyUpdate(update);
			}
		};

		return () => {
			delete window.__STREAMDOWN_PARITY__;
		};
	});
</script>

<div class="parity-app" data-parity-app="local">
	<div class="parity-shell">
		<header class="parity-header">
			<div>
				<h1>Local Svelte Streamdown Harness</h1>
				<p>
					Shared query route: <code>/?fixture=&lt;fixture-id&gt;</code> or
					<code>/?markdown=&lt;base64url&gt;</code>. The rendered output below is the local
					`svelte-streamdown` target for browser parity tests.
				</p>
			</div>

			<div class="parity-picker">
				<label for="parity-local-fixture">Fixture</label>
				<select
					id="parity-local-fixture"
					name="fixture"
					value={harnessState.fixtureId}
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
				<p data-parity-fixture-id>{harnessState.fixtureId}</p>
				<p data-parity-profile>{harnessState.profile}</p>
				<p data-parity-mode>{harnessState.mode}</p>
				<p data-parity-is-animating>{harnessState.isAnimating ? 'true' : 'false'}</p>
				<textarea class="parity-source" data-parity-source readonly value={harnessState.markdown}
				></textarea>
			</section>

			<section class="parity-panel">
				<h2>Rendered Output</h2>
				<p>{harnessState.fixtureLabel}</p>
				<div class="parity-rendered" data-parity-rendered>
					<Streamdown
						content={harnessState.markdown}
						baseTheme="shadcn"
						mode={harnessState.mode}
						isAnimating={harnessState.isAnimating}
						caret={harnessState.caret === 'none' ? undefined : harnessState.caret}
						controls={harnessState.profile === 'commonmark' ? false : undefined}
						linkSafety={{ enabled: harnessState.profile !== 'commonmark' }}
						plugins={harnessState.profile === 'commonmark' ? undefined : defaultPlugins}
					/>
				</div>
			</section>
		</div>
	</div>
</div>
