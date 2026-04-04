import { afterEach, expect } from 'vitest';
import {
	lockBodyScroll,
	resetBodyScrollLocksForTests
} from '../../../../src/lib/utils/scroll-lock.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown scroll lock utility', () => {
	afterEach(() => {
		resetBodyScrollLocksForTests();
	});

	testInBrowser(
		'reference-counts nested body locks and restores the original overflow after the final release',
		() => {
			document.body.style.overflow = 'clip';

			const releaseFirstLock = lockBodyScroll();
			expect(document.body.style.overflow).toBe('hidden');

			const releaseSecondLock = lockBodyScroll();
			expect(document.body.style.overflow).toBe('hidden');

			releaseFirstLock();
			expect(document.body.style.overflow).toBe('hidden');

			releaseSecondLock();
			expect(document.body.style.overflow).toBe('clip');
		}
	);
});
