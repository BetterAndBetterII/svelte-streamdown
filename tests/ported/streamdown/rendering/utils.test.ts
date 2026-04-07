import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cn, save } from '../../../../src/lib/index.js';
import { describeInNode } from '../../../helpers/index.js';

if (typeof URL.createObjectURL === 'undefined') {
	URL.createObjectURL = vi.fn();
	URL.revokeObjectURL = vi.fn();
}

describeInNode('ported streamdown utils surface', () => {
	test('keeps cn available through the root utility entry', () => {
		expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
		expect(cn('px-2', 'px-4')).toBe('px-4');
		expect(cn('base', false, undefined, null, ['more'])).toBe('base more');
	});

	describe('save utility', () => {
		beforeEach(() => {
			Object.defineProperty(globalThis, 'document', {
				configurable: true,
				value: {
					createElement: () => null,
					body: {
						appendChild: () => null,
						removeChild: () => null
					}
				}
			});
		});

		afterEach(() => {
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		test('creates and triggers a download for string content', () => {
			vi.useFakeTimers();
			const createObjectURLSpy = vi
				.spyOn(URL, 'createObjectURL')
				.mockReturnValue('blob:mock-url');
			const revokeObjectURLSpy = vi
				.spyOn(URL, 'revokeObjectURL')
				.mockImplementation(() => undefined);
			const clickSpy = vi.fn();
			const mockAnchor = {
				href: '',
				download: '',
				click: clickSpy
			} as unknown as HTMLAnchorElement;
			const createElementSpy = vi
				.spyOn(document, 'createElement')
				.mockReturnValue(mockAnchor);
			const appendChildSpy = vi
				.spyOn(document.body, 'appendChild')
				.mockImplementation((node) => node);
			const removeChildSpy = vi
				.spyOn(document.body, 'removeChild')
				.mockImplementation((node) => node);

			save('test.txt', 'Hello, World!', 'text/plain');

			expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
			expect(createElementSpy).toHaveBeenCalledWith('a');
			expect(appendChildSpy).toHaveBeenCalled();
			expect(clickSpy).toHaveBeenCalled();
			expect(removeChildSpy).toHaveBeenCalled();

			vi.runAllTimers();
			expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
		});
	});
});
