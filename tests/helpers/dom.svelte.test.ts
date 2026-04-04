import { expect } from 'vitest';
import { describeInBrowser, normalizeDomHtml, testInBrowser } from './index.js';

describeInBrowser('dom normalization helpers', () => {
	testInBrowser('preserves whitespace inside pre and code blocks', () => {
		const normalized = normalizeDomHtml(
			'<div class="wrapper"><pre class="shell"><code data-streamdown-code="abc">line 1\n  line 2</code></pre></div>'
		);

		expect(normalized).toContain('<pre><code>line 1\n  line 2</code></pre>');
		expect(normalized).not.toContain('class=');
		expect(normalized).not.toContain('data-streamdown-');
	});
});
