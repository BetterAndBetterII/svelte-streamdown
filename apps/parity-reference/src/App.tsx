import { useEffect, useState, type ChangeEvent } from 'react';
import { Streamdown } from 'streamdown';
import type { ParityFixtureId } from '../../../fixtures/parity/fixture-registry.js';
import { listParityFixtures, resolveParityFixture } from '../../parity-shared/fixtures.js';

const fixtureOptions = listParityFixtures();

export function App() {
	const [fixtureId, setFixtureId] = useState<ParityFixtureId>(() => resolveParityFixture(null).id);

	useEffect(() => {
		const initialFixture = resolveParityFixture(
			new URL(window.location.href).searchParams.get('fixture')
		);
		setFixtureId(initialFixture.id);
	}, []);

	const fixture = resolveParityFixture(fixtureId);

	const handleFixtureChange = (event: ChangeEvent<HTMLSelectElement>) => {
		const nextFixture = resolveParityFixture(event.currentTarget.value);
		const url = new URL(window.location.href);
		url.searchParams.set('fixture', nextFixture.id);
		window.history.replaceState(null, '', url);
		setFixtureId(nextFixture.id);
	};

	return (
		<div className="parity-app" data-parity-app="reference">
			<div className="parity-shell">
				<header className="parity-header">
					<div>
						<h1>Reference Streamdown Harness</h1>
						<p>
							Shared query route: <code>/?fixture=&lt;fixture-id&gt;</code>. The rendered output
							below is the frozen reference `streamdown` target at commit `5f64751`.
						</p>
					</div>

					<div className="parity-picker">
						<label htmlFor="parity-reference-fixture">Fixture</label>
						<select
							id="parity-reference-fixture"
							name="fixture"
							onChange={handleFixtureChange}
							value={fixtureId}
						>
							{fixtureOptions.map((option) => (
								<option key={option.id} value={option.id}>
									{option.id}
								</option>
							))}
						</select>
					</div>
				</header>

				<div className="parity-grid">
					<section className="parity-panel">
						<h2>Source Fixture</h2>
						<p data-parity-fixture-id>{fixture.id}</p>
						<textarea
							readOnly
							className="parity-source"
							data-parity-source
							value={fixture.markdown}
						/>
					</section>

					<section className="parity-panel">
						<h2>Rendered Output</h2>
						<p>{fixture.label}</p>
						<div className="parity-rendered" data-parity-rendered>
							<Streamdown mode="static">{fixture.markdown}</Streamdown>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
