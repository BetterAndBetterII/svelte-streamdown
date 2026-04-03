export type StreamdownTranslations = {
	copyCode: string;
	downloadFile: string;
	downloadDiagram: string;
	downloadDiagramAsSvg: string;
	downloadDiagramAsPng: string;
	downloadDiagramAsMmd: string;
	viewFullscreen: string;
	exitFullscreen: string;
	mermaidFormatSvg: string;
	mermaidFormatPng: string;
	mermaidFormatMmd: string;
	copyTable: string;
	copyTableAsMarkdown: string;
	copyTableAsHtml: string;
	copyTableAsCsv: string;
	downloadTable: string;
	downloadTableAsCsv: string;
	downloadTableAsMarkdown: string;
	downloadTableAsHtml: string;
	tableFormatMarkdown: string;
	tableFormatHtml: string;
	tableFormatCsv: string;
	imageNotAvailable: string;
	downloadImage: string;
	alert: {
		note: string;
		tip: string;
		warning: string;
		caution: string;
		important: string;
	};
};

export const defaultTranslations: StreamdownTranslations = {
	copyCode: 'Copy Code',
	downloadFile: 'Download file',
	downloadDiagram: 'Download diagram',
	downloadDiagramAsSvg: 'Download diagram as SVG',
	downloadDiagramAsPng: 'Download diagram as PNG',
	downloadDiagramAsMmd: 'Download diagram as MMD',
	viewFullscreen: 'View fullscreen',
	exitFullscreen: 'Exit fullscreen',
	mermaidFormatSvg: 'SVG',
	mermaidFormatPng: 'PNG',
	mermaidFormatMmd: 'MMD',
	copyTable: 'Copy table',
	copyTableAsMarkdown: 'Copy table as Markdown',
	copyTableAsHtml: 'Copy table as HTML',
	copyTableAsCsv: 'Copy table as CSV',
	downloadTable: 'Download table',
	downloadTableAsCsv: 'Download table as CSV',
	downloadTableAsMarkdown: 'Download table as Markdown',
	downloadTableAsHtml: 'Download table as HTML',
	tableFormatMarkdown: 'Markdown',
	tableFormatHtml: 'HTML',
	tableFormatCsv: 'CSV',
	imageNotAvailable: 'Image not available',
	downloadImage: 'Download image',
	alert: {
		note: 'note',
		tip: 'tip',
		warning: 'warning',
		caution: 'caution',
		important: 'important'
	}
};

export function mergeTranslations(
	translations: Partial<StreamdownTranslations> | undefined
): StreamdownTranslations {
	if (!translations) {
		return defaultTranslations;
	}

	return {
		...defaultTranslations,
		...translations,
		alert: {
			...defaultTranslations.alert,
			...translations.alert
		}
	};
}
