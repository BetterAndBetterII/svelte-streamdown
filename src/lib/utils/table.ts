export interface TableData {
	headers: string[];
	rows: string[][];
}

const escapeCSV = (value: string): string => {
	let needsEscaping = false;
	let hasQuote = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char === '"') {
			needsEscaping = true;
			hasQuote = true;
			break;
		}
		if (char === ',' || char === '\n') {
			needsEscaping = true;
		}
	}

	if (!needsEscaping) {
		return value;
	}

	if (hasQuote) {
		return `"${value.replace(/"/g, '""')}"`;
	}

	return `"${value}"`;
};

const escapeTSV = (value: string): string => {
	let needsEscaping = false;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char === '\t' || char === '\n' || char === '\r') {
			needsEscaping = true;
			break;
		}
	}

	if (!needsEscaping) {
		return value;
	}

	const parts = new Array<string>(value.length);
	let partIndex = 0;

	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		if (char === '\t') {
			parts[partIndex] = '\\t';
		} else if (char === '\n') {
			parts[partIndex] = '\\n';
		} else if (char === '\r') {
			parts[partIndex] = '\\r';
		} else {
			parts[partIndex] = char;
		}
		partIndex += 1;
	}

	return parts.join('');
};

const escapeMarkdownTableCell = (cell: string): string => {
	let needsEscaping = false;

	for (let index = 0; index < cell.length; index += 1) {
		const char = cell[index];
		if (char === '\\' || char === '|') {
			needsEscaping = true;
			break;
		}
	}

	if (!needsEscaping) {
		return cell;
	}

	const parts = new Array<string>(cell.length);
	let partIndex = 0;

	for (let index = 0; index < cell.length; index += 1) {
		const char = cell[index];
		if (char === '\\') {
			parts[partIndex] = '\\\\';
		} else if (char === '|') {
			parts[partIndex] = '\\|';
		} else {
			parts[partIndex] = char;
		}
		partIndex += 1;
	}

	return parts.join('');
};

const formatDelimitedRow = (
	row: readonly string[],
	delimiter: string,
	escapeCell: (value: string) => string
): string => {
	if (row.length === 0) {
		return '';
	}

	const formattedCells = new Array<string>(row.length);
	for (let index = 0; index < row.length; index += 1) {
		formattedCells[index] = escapeCell(row[index] ?? '');
	}

	return formattedCells.join(delimiter);
};

export const extractTableDataFromElement = (tableElement: ParentNode): TableData => {
	const headers: string[] = [];
	const rows: string[][] = [];

	const headerCells = tableElement.querySelectorAll('thead th');
	for (const cell of headerCells) {
		headers.push(cell.textContent?.trim() || '');
	}

	const bodyRows = tableElement.querySelectorAll('tbody tr');
	for (const row of bodyRows) {
		const rowData: string[] = [];
		const cells = row.querySelectorAll('td');
		for (const cell of cells) {
			rowData.push(cell.textContent?.trim() || '');
		}
		rows.push(rowData);
	}

	return { headers, rows };
};

export const tableDataToCSV = ({ headers, rows }: TableData): string => {
	const totalRows = headers.length > 0 ? rows.length + 1 : rows.length;
	const csvRows: string[] = new Array(totalRows);
	let rowIndex = 0;

	if (headers.length > 0) {
		csvRows[rowIndex] = formatDelimitedRow(headers, ',', escapeCSV);
		rowIndex += 1;
	}

	for (const row of rows) {
		csvRows[rowIndex] = formatDelimitedRow(row, ',', escapeCSV);
		rowIndex += 1;
	}

	return csvRows.join('\n');
};

export const tableDataToTSV = ({ headers, rows }: TableData): string => {
	const totalRows = headers.length > 0 ? rows.length + 1 : rows.length;
	const tsvRows: string[] = new Array(totalRows);
	let rowIndex = 0;

	if (headers.length > 0) {
		tsvRows[rowIndex] = formatDelimitedRow(headers, '\t', escapeTSV);
		rowIndex += 1;
	}

	for (const row of rows) {
		tsvRows[rowIndex] = formatDelimitedRow(row, '\t', escapeTSV);
		rowIndex += 1;
	}

	return tsvRows.join('\n');
};

export const tableDataToMarkdown = ({ headers, rows }: TableData): string => {
	if (headers.length === 0) {
		return '';
	}

	const markdownRows: string[] = new Array(rows.length + 2);
	let rowIndex = 0;

	const escapedHeaders = new Array<string>(headers.length);
	for (let index = 0; index < headers.length; index += 1) {
		escapedHeaders[index] = escapeMarkdownTableCell(headers[index]);
	}
	markdownRows[rowIndex] = `| ${escapedHeaders.join(' | ')} |`;
	rowIndex += 1;

	const separatorParts = new Array(headers.length);
	for (let i = 0; i < headers.length; i += 1) {
		separatorParts[i] = '---';
	}
	markdownRows[rowIndex] = `| ${separatorParts.join(' | ')} |`;
	rowIndex += 1;

	for (const row of rows) {
		if (row.length < headers.length) {
			const paddedRow = new Array(headers.length);
			for (let i = 0; i < headers.length; i += 1) {
				paddedRow[i] = i < row.length ? escapeMarkdownTableCell(row[i]) : '';
			}
			markdownRows[rowIndex] = `| ${paddedRow.join(' | ')} |`;
		} else {
			const escapedRow = new Array<string>(row.length);
			for (let i = 0; i < row.length; i += 1) {
				escapedRow[i] = escapeMarkdownTableCell(row[i]);
			}
			markdownRows[rowIndex] = `| ${escapedRow.join(' | ')} |`;
		}
		rowIndex += 1;
	}

	return markdownRows.join('\n');
};
