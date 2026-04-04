import { afterEach, beforeEach, expect, vi } from 'vitest';
import {
	DEFAULT_MERMAID_PNG_SCALE,
	getMermaidSvgMarkup,
	serializeSvg,
	svgToPngBlob
} from '../../../../src/lib/utils/mermaid.js';
import { describeInBrowser, testInBrowser } from '../../../helpers/index.js';

describeInBrowser('ported streamdown mermaid utilities', () => {
	const originalCreateElement = document.createElement.bind(document);
	let originalImage: typeof Image;
	let mockCanvas: {
		width: number;
		height: number;
		getContext: ReturnType<typeof vi.fn>;
		toBlob: ReturnType<typeof vi.fn>;
	};
	let mockCtx: {
		drawImage: ReturnType<typeof vi.fn>;
	};
	let mockImage: {
		width: number;
		height: number;
		crossOrigin: string;
		src: string;
		onload: (() => void) | null;
		onerror: (() => void) | null;
	};

	beforeEach(() => {
		mockCtx = {
			drawImage: vi.fn()
		};
		mockCanvas = {
			width: 0,
			height: 0,
			getContext: vi.fn().mockReturnValue(mockCtx),
			toBlob: vi.fn()
		};
		mockImage = {
			width: 100,
			height: 50,
			crossOrigin: '',
			src: '',
			onload: null,
			onerror: null
		};
		originalImage = globalThis.Image;

		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			if (tagName === 'canvas') {
				return mockCanvas as unknown as HTMLCanvasElement;
			}
			return originalCreateElement(tagName);
		});

		globalThis.Image = class {
			constructor() {
				return mockImage as unknown as HTMLImageElement;
			}
		} as typeof Image;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		globalThis.Image = originalImage;
		document.body.innerHTML = '';
	});

	testInBrowser('serializes SVG markup with XML namespaces and finds DOM-backed markup', async () => {
		document.body.innerHTML = `
			<div data-streamdown-mermaid="mermaid-1">
				<div data-mermaid-svg>
					<svg width="40" height="20"><text>DOM Diagram</text></svg>
				</div>
			</div>
		`;

		const svg = document.querySelector('svg') as SVGSVGElement;
		const serialized = serializeSvg(svg);
		expect(serialized).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(serialized).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');

		const markup = await getMermaidSvgMarkup({ id: 'mermaid-1' });
		expect(markup).toContain('DOM Diagram');
	});

	testInBrowser('prefers renderSvg when provided', async () => {
		const renderSvg = vi.fn(async () => '<svg><text>Rendered Directly</text></svg>');

		const markup = await getMermaidSvgMarkup({
			id: 'unused-id',
			renderSvg
		});

		expect(renderSvg).toHaveBeenCalledTimes(1);
		expect(markup).toContain('Rendered Directly');
	});

	testInBrowser('converts SVG markup to PNG blobs with default and custom scale', async () => {
		mockCanvas.toBlob.mockImplementation((callback: (blob: Blob | null) => void) => {
			callback(new Blob(['png'], { type: 'image/png' }));
		});

		const defaultPromise = svgToPngBlob('<svg width="100" height="50"><text>Test</text></svg>');
		mockImage.onload?.();
		const defaultBlob = await defaultPromise;

		expect(defaultBlob.type).toBe('image/png');
		expect(mockCtx.drawImage).toHaveBeenCalled();
		expect(mockCanvas.width).toBe(100 * DEFAULT_MERMAID_PNG_SCALE);
		expect(mockCanvas.height).toBe(50 * DEFAULT_MERMAID_PNG_SCALE);
		expect(mockImage.crossOrigin).toBe('anonymous');
		expect(mockImage.src).toMatch(/^data:image\/svg\+xml;base64,/);

		mockCanvas.toBlob.mockImplementation((callback: (blob: Blob | null) => void) => {
			callback(new Blob(['png'], { type: 'image/png' }));
		});

		const scaledPromise = svgToPngBlob('<svg width="100" height="50"><text>Test</text></svg>', {
			scale: 2
		});
		mockImage.onload?.();
		await scaledPromise;

		expect(mockCanvas.width).toBe(200);
		expect(mockCanvas.height).toBe(100);
	});

	testInBrowser('rejects when canvas creation or encoding fails', async () => {
		mockCanvas.getContext.mockReturnValueOnce(null);
		const missingContext = svgToPngBlob('<svg><text>Test</text></svg>');
		mockImage.onload?.();
		await expect(missingContext).rejects.toThrow(
			'Failed to create 2D canvas context for PNG export'
		);

		mockCanvas.getContext.mockReturnValue(mockCtx);
		mockCanvas.toBlob.mockImplementationOnce((callback: (blob: Blob | null) => void) => {
			callback(null);
		});
		const missingBlob = svgToPngBlob('<svg><text>Test</text></svg>');
		mockImage.onload?.();
		await expect(missingBlob).rejects.toThrow('Failed to create PNG blob');

		const imageError = svgToPngBlob('<svg><text>Test</text></svg>');
		mockImage.onerror?.();
		await expect(imageError).rejects.toThrow('Failed to load SVG image');
	});
});
