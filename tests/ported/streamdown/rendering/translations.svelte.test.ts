import { render } from 'vitest-browser-svelte';
import { expect, vi } from 'vitest';
import Streamdown from '../../../../src/lib/Streamdown.svelte';
import Code from '../../../../src/lib/Elements/Code.svelte';
import Mermaid from '../../../../src/lib/Elements/Mermaid.svelte';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		render: vi.fn(async () => ({
			svg: '<svg width="120" height="80"><text>Graph</text></svg>'
		}))
	}
}));

describeInBrowser('ported streamdown translations', () => {
	testInBrowser('applies custom translations across code, table, mermaid, and image fallbacks', async () => {
		const screen = render(Streamdown, {
			content: [
				'```javascript',
				'console.log("hello");',
				'```',
				'',
				'```mermaid',
				'graph TD; A-->B',
				'```',
				'',
				'| Name | Value |',
				'| ---- | ----- |',
				'| Foo | Bar |',
				'',
				'![Broken image](https://example.com/image.png)'
			].join('\n'),
			components: {
				code: Code,
				mermaid: Mermaid
			},
			translations: {
				copyCode: 'Kopieren',
				downloadFile: 'Datei herunterladen',
				copyTable: 'Tabelle kopieren',
				downloadTable: 'Tabelle herunterladen',
				downloadTableAsCsv: 'Tabelle als CSV herunterladen',
				copyTableAsMarkdown: 'Tabelle als Markdown kopieren',
				downloadDiagram: 'Diagramm herunterladen',
				viewFullscreen: 'Vollbild anzeigen',
				exitFullscreen: 'Vollbild verlassen',
				imageNotAvailable: 'Bild nicht verfügbar'
			}
		});

		await vi.waitFor(() => {
			expect(screen.container.querySelector('button[title="Kopieren"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Datei herunterladen"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Tabelle kopieren"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Tabelle herunterladen"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Diagramm herunterladen"]')).toBeTruthy();
			expect(screen.container.querySelector('button[title="Vollbild anzeigen"]')).toBeTruthy();
		});

		const image = screen.container.querySelector('img[alt="Broken image"]');
		expect(image).toBeTruthy();
		image?.dispatchEvent(new Event('error'));

		await vi.waitFor(() => {
			const fallback = screen.container.querySelector('[data-streamdown-image-fallback]');
			expect(fallback?.textContent).toContain('Bild nicht verfügbar');
		});
	});
});
