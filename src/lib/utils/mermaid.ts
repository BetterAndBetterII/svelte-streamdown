export type MermaidSvgMarkupOptions = {
	id: string;
	renderSvg?: () => Promise<string>;
	root?: ParentNode;
};

export type SvgToPngBlobOptions = {
	scale?: number;
};

export const DEFAULT_MERMAID_PNG_SCALE = 5;

export const getMermaidSvgElement = (
	id: string,
	root: ParentNode = document
): SVGSVGElement | null => {
	const container = root.querySelector?.(`[data-streamdown-mermaid="${id}"]`);
	if (!container) {
		return null;
	}

	return container.querySelector('[data-mermaid-svg] svg');
};

export const serializeSvg = (svg: SVGSVGElement): string => {
	const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
	clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
	return new XMLSerializer().serializeToString(clonedSvg);
};

export const getMermaidSvgMarkup = async ({
	id,
	renderSvg,
	root = document
}: MermaidSvgMarkupOptions): Promise<string | null> => {
	if (renderSvg) {
		return renderSvg();
	}

	const svg = getMermaidSvgElement(id, root);
	return svg ? serializeSvg(svg) : null;
};

export const svgToPngBlob = async (
	svgString: string,
	options: SvgToPngBlobOptions = {}
): Promise<Blob> => {
	const encoded = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to load SVG image'));
		img.src = encoded;
	});

	const canvas = document.createElement('canvas');
	const scale = options.scale ?? DEFAULT_MERMAID_PNG_SCALE;
	canvas.width = image.width * scale;
	canvas.height = image.height * scale;

	const ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to create 2D canvas context for PNG export');
	}

	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

	return new Promise<Blob>((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('Failed to create PNG blob'));
				return;
			}

			resolve(blob);
		}, 'image/png');
	});
};
