import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { Streamdown } from 'streamdown';
import { cjk } from '@streamdown/cjk';
import { code } from '@streamdown/code';
import { math } from '@streamdown/math';
import { mermaid } from '@streamdown/mermaid';
import { listParityFixtures } from '../../parity-shared/fixtures.js';
import {
	applyParityHarnessUpdate,
	buildParityUrlFromState,
	resolveParityHarnessStateFromUrl,
	type ParityHarnessState,
	type ParityHarnessUpdate
} from '../../parity-shared/harness-state.js';

const fixtureOptions = listParityFixtures();
const defaultPlugins = { code, math, mermaid, cjk };

function createInitialState(): ParityHarnessState {
	return resolveParityHarnessStateFromUrl(new URL(window.location.href));
}

export function App() {
	const [harnessState, setHarnessState] = useState<ParityHarnessState>(createInitialState);
	const stateRef = useRef(harnessState);

	useEffect(() => {
		stateRef.current = harnessState;
		window.history.replaceState(null, '', buildParityUrlFromState(harnessState));
	}, [harnessState]);

	useEffect(() => {
		window.__STREAMDOWN_PARITY__ = {
			getState: () => ({ ...stateRef.current }),
			setState: async (update: ParityHarnessUpdate) => {
				flushSync(() => {
					setHarnessState((currentState) => applyParityHarnessUpdate(currentState, update));
				});
			}
		};

		return () => {
			delete window.__STREAMDOWN_PARITY__;
		};
	}, []);

	const handleFixtureChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const nextFixtureId = event.currentTarget.value;
		setHarnessState((currentState) =>
			applyParityHarnessUpdate(currentState, { fixtureId: nextFixtureId })
		);
	};

	return (
		<div className="parity-app" data-parity-app="reference">
			<div className="parity-shell">
				<header className="parity-header">
					<div>
						<h1>Reference Streamdown Harness</h1>
						<p>
							Shared query route: <code>/?fixture=&lt;fixture-id&gt;</code> or
							<code>/?markdown=&lt;base64url&gt;</code>. The rendered output below is the frozen
							reference <code>streamdown</code> target at commit <code>5f64751</code>.
						</p>
					</div>

					<div className="parity-picker">
						<label htmlFor="parity-reference-fixture">Fixture</label>
						<select
							id="parity-reference-fixture"
							name="fixture"
							onChange={handleFixtureChange}
							value={harnessState.fixtureId}
						>
							{fixtureOptions.map((fixture) => (
								<option key={fixture.id} value={fixture.id}>
									{fixture.id}
								</option>
							))}
						</select>
					</div>
				</header>

				<div className="parity-grid">
					<section className="parity-panel">
						<h2>Source Fixture</h2>
						<p data-parity-fixture-id>{harnessState.fixtureId}</p>
						<p data-parity-profile>{harnessState.profile}</p>
						<p data-parity-mode>{harnessState.mode}</p>
						<p data-parity-is-animating>{harnessState.isAnimating ? 'true' : 'false'}</p>
						<textarea
							readOnly
							className="parity-source"
							data-parity-source
							value={harnessState.markdown}
						/>
					</section>

					<section className="parity-panel">
						<h2>Rendered Output</h2>
						<p>{harnessState.fixtureLabel}</p>
						<div className="parity-rendered" data-parity-rendered>
							<Streamdown
								controls={harnessState.profile === 'commonmark' ? false : undefined}
								linkSafety={{ enabled: harnessState.profile !== 'commonmark' }}
								mode={harnessState.mode}
								isAnimating={harnessState.isAnimating}
								caret={harnessState.caret === 'none' ? undefined : harnessState.caret}
								plugins={harnessState.profile === 'commonmark' ? undefined : defaultPlugins}
							>
								{harnessState.markdown}
							</Streamdown>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
