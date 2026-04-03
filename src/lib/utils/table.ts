export interface TableData {
	headers: string[];
	rows: string[][];
}

export const extractTableDataFromElement = (tableElement: ParentNode): TableData => {
	const headers = Array.from(tableElement.querySelectorAll('thead th')).map(
		(cell) => cell.textContent?.trim() || ''
	);
	const rows = Array.from(tableElement.querySelectorAll('tbody tr')).map((row) =>
		Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || '')
	);

	return { headers, rows };
};

export const tableDataToCSV = ({ headers, rows }: TableData): string => {
	const escapeCSV = (value: string): string => {
		if (!/[",\n]/.test(value)) {
			return value;
		}

		return `"${value.replace(/"/g, '""')}"`;
	};

	const outputRows = headers.length > 0 ? [headers, ...rows] : rows;
	return outputRows.map((row) => row.map(escapeCSV).join(',')).join('\n');
};

export const tableDataToTSV = ({ headers, rows }: TableData): string => {
	const escapeTSV = (value: string): string =>
		value.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

	const outputRows = headers.length > 0 ? [headers, ...rows] : rows;
	return outputRows.map((row) => row.map(escapeTSV).join('\t')).join('\n');
};

const escapeMarkdownTableCell = (cell: string): string =>
	cell.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

export const tableDataToMarkdown = ({ headers, rows }: TableData): string => {
	if (headers.length === 0) {
		return '';
	}

	const headerRow = `| ${headers.map(escapeMarkdownTableCell).join(' | ')} |`;
	const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
	const dataRows = rows.map((row) => {
		const paddedRow = headers.map((_, index) => escapeMarkdownTableCell(row[index] ?? ''));
		return `| ${paddedRow.join(' | ')} |`;
	});

	return [headerRow, separatorRow, ...dataRows].join('\n');
};
