import { expect } from 'vitest';
import { describeInNode, testInNode } from '../../../helpers/index.js';
import { isPathRelativeUrl, transformUrl } from '../../../../src/lib/url-policy.js';

describeInNode('ported streamdown security URL policy', () => {
	testInNode('recognizes the reference relative URL forms', () => {
		expect(isPathRelativeUrl('/docs')).toBe(true);
		expect(isPathRelativeUrl('./page.html')).toBe(true);
		expect(isPathRelativeUrl('../assets/icon.svg')).toBe(true);
		expect(isPathRelativeUrl('#section-1')).toBe(true);
		expect(isPathRelativeUrl('?tab=preview')).toBe(true);
		expect(isPathRelativeUrl('//evil.example.com')).toBe(false);
	});

	testInNode('allows tel and mailto links under the wildcard link policy', () => {
		expect(transformUrl('tel:+44-1392-498505', ['*'])).toBe('tel:+44-1392-498505');
		expect(transformUrl('mailto:foo@example.com', ['*'])).toBe('mailto:foo@example.com');
	});

	testInNode('allows data images under the wildcard image policy', () => {
		expect(
			transformUrl('data:image/png;base64,AAAA', ['*'], undefined, {
				kind: 'image'
			})
		).toBe('data:image/png;base64,AAAA');
	});

	testInNode('blocks unsafe protocols even when wildcard prefixes are used', () => {
		expect(transformUrl('javascript:alert(1)', ['*'])).toBeNull();
		expect(
			transformUrl('data:text/html;base64,PHNjcmlwdD4=', ['*'], undefined, {
				kind: 'image'
			})
		).toBeNull();
	});

	testInNode('preserves relative URLs after same-origin prefix checks', () => {
		expect(
			transformUrl(
				'./guide/intro',
				['https://example.com/docs/guide/'],
				'https://example.com/docs/'
			)
		).toBe('./guide/intro');
		expect(
			transformUrl('/guide/intro', ['https://example.com/guide/'], 'https://example.com')
		).toBe('/guide/intro');
	});
});
