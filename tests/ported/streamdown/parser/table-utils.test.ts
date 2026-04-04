import { expect } from 'vitest';
import {
	tableDataToCSV,
	tableDataToTSV,
	tableDataToMarkdown,
	type TableData
} from '../../../../src/lib/utils/table.js';
import { describeInNode, testInNode } from '../../../helpers/index.js';

describeInNode('ported streamdown table-utils', () => {
	describeInNode('tableDataToCSV', () => {
		testInNode('converts simple table data to CSV', () => {
			const data: TableData = {
				headers: ['Name', 'Age', 'City'],
				rows: [
					['John', '30', 'New York'],
					['Jane', '25', 'London']
				]
			};
			expect(tableDataToCSV(data)).toBe('Name,Age,City\nJohn,30,New York\nJane,25,London');
		});

		testInNode('escapes commas in values', () => {
			const data: TableData = {
				headers: ['Name', 'Location'],
				rows: [['John', 'New York, USA']]
			};
			expect(tableDataToCSV(data)).toBe('Name,Location\nJohn,"New York, USA"');
		});

		testInNode('escapes quotes in values', () => {
			const data: TableData = {
				headers: ['Quote'],
				rows: [['He said "Hello"']]
			};
			expect(tableDataToCSV(data)).toBe('Quote\n"He said ""Hello"""');
		});

		testInNode('escapes newlines in values', () => {
			const data: TableData = {
				headers: ['Text'],
				rows: [['Line 1\nLine 2']]
			};
			expect(tableDataToCSV(data)).toBe('Text\n"Line 1\nLine 2"');
		});

		testInNode('handles empty headers', () => {
			const data: TableData = { headers: [], rows: [['Value1', 'Value2']] };
			expect(tableDataToCSV(data)).toBe('Value1,Value2');
		});

		testInNode('handles empty rows', () => {
			const data: TableData = { headers: ['Header1', 'Header2'], rows: [] };
			expect(tableDataToCSV(data)).toBe('Header1,Header2');
		});
	});

	describeInNode('tableDataToTSV', () => {
		testInNode('converts simple table data to TSV', () => {
			const data: TableData = {
				headers: ['Name', 'Age', 'City'],
				rows: [
					['John', '30', 'New York'],
					['Jane', '25', 'London']
				]
			};
			expect(tableDataToTSV(data)).toBe('Name\tAge\tCity\nJohn\t30\tNew York\nJane\t25\tLondon');
		});

		testInNode('escapes tabs in values', () => {
			const data: TableData = { headers: ['Text'], rows: [['Value\tWith\tTabs']] };
			expect(tableDataToTSV(data)).toBe('Text\nValue\\tWith\\tTabs');
		});

		testInNode('escapes newlines in values', () => {
			const data: TableData = { headers: ['Text'], rows: [['Line1\nLine2']] };
			expect(tableDataToTSV(data)).toBe('Text\nLine1\\nLine2');
		});

		testInNode('escapes carriage returns in values', () => {
			const data: TableData = { headers: ['Text'], rows: [['Value\rWith\rCR']] };
			expect(tableDataToTSV(data)).toBe('Text\nValue\\rWith\\rCR');
		});

		testInNode('handles empty headers', () => {
			const data: TableData = { headers: [], rows: [['Value1', 'Value2']] };
			expect(tableDataToTSV(data)).toBe('Value1\tValue2');
		});

		testInNode('handles empty rows', () => {
			const data: TableData = { headers: ['Header1', 'Header2'], rows: [] };
			expect(tableDataToTSV(data)).toBe('Header1\tHeader2');
		});
	});

	describeInNode('tableDataToMarkdown', () => {
		testInNode('converts simple table data to Markdown', () => {
			const data: TableData = {
				headers: ['Name', 'Age', 'City'],
				rows: [
					['John', '30', 'New York'],
					['Jane', '25', 'London']
				]
			};
			expect(tableDataToMarkdown(data)).toBe(
				'| Name | Age | City |\n| --- | --- | --- |\n| John | 30 | New York |\n| Jane | 25 | London |'
			);
		});

		testInNode('escapes pipes in values', () => {
			const data: TableData = {
				headers: ['Header'],
				rows: [['Value | With | Pipes']]
			};
			expect(tableDataToMarkdown(data)).toBe(
				'| Header |\n| --- |\n| Value \\| With \\| Pipes |'
			);
		});

		testInNode('escapes backslashes in values', () => {
			const data: TableData = {
				headers: ['Path'],
				rows: [['C:\\Users\\Name']]
			};
			expect(tableDataToMarkdown(data)).toBe('| Path |\n| --- |\n| C:\\\\Users\\\\Name |');
		});

		testInNode('pads rows with empty strings if shorter than headers', () => {
			const data: TableData = {
				headers: ['Col1', 'Col2', 'Col3'],
				rows: [['A', 'B']]
			};
			expect(tableDataToMarkdown(data)).toBe(
				'| Col1 | Col2 | Col3 |\n| --- | --- | --- |\n| A | B |  |'
			);
		});

		testInNode('returns empty string if no headers', () => {
			const data: TableData = { headers: [], rows: [['Value1', 'Value2']] };
			expect(tableDataToMarkdown(data)).toBe('');
		});

		testInNode('handles empty rows', () => {
			const data: TableData = { headers: ['Header1', 'Header2'], rows: [] };
			expect(tableDataToMarkdown(data)).toBe('| Header1 | Header2 |\n| --- | --- |');
		});
	});
});
