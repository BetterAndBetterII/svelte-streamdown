import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

type MatrixRow = {
	id: string;
	status: string;
};

type CapabilityBacklogRow = {
	matrixRow: string;
};

type BacklogRow = {
	category: string;
	nextAction: string;
	referenceFile: string;
};

type DriftRow = {
	id: string;
};

type InventoryRow = {
	sourceFile: string;
	migrationStatus: string;
	evidence: string;
};

type MigrationStatusRow = {
	sourceFile: string;
	localDestination: string;
	blocker: string;
};

function parseMarkdownRow(line: string): string[] {
	const cells: string[] = [];
	let current = '';
	let isEscaped = false;

	for (const char of line.slice(1, -1)) {
		if (isEscaped) {
			current += char;
			isEscaped = false;
			continue;
		}

		if (char === '\\') {
			current += char;
			isEscaped = true;
			continue;
		}

		if (char === '|') {
			cells.push(current.trim());
			current = '';
			continue;
		}

		current += char;
	}

	cells.push(current.trim());
	return cells;
}

function unwrapCode(cell: string): string {
	return cell.replace(/^`/, '').replace(/`$/, '');
}

function readDoc(relativePath: string): string {
	const url = new URL(`../../${relativePath}`, import.meta.url);
	return readFileSync(url, 'utf8');
}

function collectMatrixRows(markdown: string): MatrixRow[] {
	const rows: MatrixRow[] = [];

	for (const line of markdown.split('\n')) {
		if (!line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (cells.length < 3 || cells[0] === 'ID' || /^-+$/.test(cells[0])) {
			continue;
		}

		const id = unwrapCode(cells[0]);
		if (!/^(api|prop|parser|render|waiver|interact|sec|plugin)-\d+$/.test(id)) {
			continue;
		}

		rows.push({
			id,
			status: unwrapCode(cells[2])
		});
	}

	return rows;
}

function collectCapabilityBacklogRows(markdown: string): CapabilityBacklogRow[] {
	const rows: CapabilityBacklogRow[] = [];
	let inSection = false;

	for (const line of markdown.split('\n')) {
		if (line.startsWith('## ')) {
			inSection = line.trim() === '## Canonical Unresolved Capability Backlog';
			continue;
		}

		if (!inSection || !line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (cells.length < 1 || cells[0] === 'Matrix row' || /^-+$/.test(cells[0])) {
			continue;
		}

		rows.push({
			matrixRow: unwrapCode(cells[0])
		});
	}

	return rows;
}

function collectRemainingBacklogRows(markdown: string): BacklogRow[] {
	const rows: BacklogRow[] = [];
	let inSection = false;

	for (const line of markdown.split('\n')) {
		if (line.startsWith('## ')) {
			inSection = line.trim() === '## Categorized Remaining Test Backlog';
			continue;
		}

		if (!inSection || !line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (cells.length < 3 || cells[0] === 'Parity category' || /^-+$/.test(cells[0])) {
			continue;
		}

		rows.push({
			category: unwrapCode(cells[0]),
			nextAction: unwrapCode(cells[1]),
			referenceFile: unwrapCode(cells[2])
		});
	}

	return rows;
}

function collectDriftRows(markdown: string): DriftRow[] {
	const rows: DriftRow[] = [];
	let inSection = false;

	for (const line of markdown.split('\n')) {
		if (line.startsWith('## ')) {
			inSection = line.trim() === '## Local-Only Drift';
			continue;
		}

		if (!inSection || !line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (cells.length < 1 || cells[0] === 'ID' || /^-+$/.test(cells[0])) {
			continue;
		}

		const id = unwrapCode(cells[0]);
		if (/^drift-\d+$/.test(id)) {
			rows.push({ id });
		}
	}

	return rows;
}

function collectReferencedDriftIds(markdown: string): string[] {
	return [...new Set(markdown.match(/drift-\d+/g) ?? [])];
}

function collectInventoryRows(markdown: string): Map<string, InventoryRow> {
	const rows = new Map<string, InventoryRow>();

	for (const line of markdown.split('\n')) {
		if (!line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (cells.length < 5 || !cells[0]?.startsWith('`packages/')) {
			continue;
		}

		rows.set(unwrapCode(cells[0]), {
			sourceFile: unwrapCode(cells[0]),
			migrationStatus: unwrapCode(cells[3]),
			evidence: cells[4]
		});
	}

	return rows;
}

function collectMigrationStatusRows(markdown: string): Map<string, MigrationStatusRow> {
	const rows = new Map<string, MigrationStatusRow>();

	for (const line of markdown.split('\n')) {
		if (!line.startsWith('|')) {
			continue;
		}

		const cells = parseMarkdownRow(line);
		if (!cells[0]?.startsWith('`packages/')) {
			continue;
		}

		if (cells.length === 7) {
			rows.set(unwrapCode(cells[0]), {
				sourceFile: unwrapCode(cells[0]),
				localDestination: cells[4],
				blocker: cells[6]
			});
			continue;
		}

		if (cells.length >= 9) {
			rows.set(unwrapCode(cells[0]), {
				sourceFile: unwrapCode(cells[0]),
				localDestination: cells[6],
				blocker: cells[8]
			});
		}
	}

	return rows;
}

describe('parity boundary documentation', () => {
	test('keeps plugin and package-boundary matrix rows in final-state classifications', () => {
		const matrixRows = new Map(
			collectMatrixRows(readDoc('docs/parity-matrix.md')).map((row) => [row.id, row.status])
		);

		const expectedStatuses = new Map<string, string>([
			['api-01', 'different_by_design'],
			['api-02', 'different_by_design'],
			['api-03', 'different_by_design'],
			['api-04', 'different_by_design'],
			['api-05', 'different_by_design'],
			['api-06', 'different_by_design'],
			['api-07', 'different_by_design'],
			['api-08', 'different_by_design'],
			['prop-11', 'done'],
			['prop-12', 'different_by_design'],
			['prop-17', 'done'],
			['prop-20', 'different_by_design'],
			['plugin-01', 'done'],
			['plugin-02', 'different_by_design'],
			['plugin-03', 'different_by_design'],
			['plugin-04', 'different_by_design'],
			['plugin-05', 'different_by_design'],
			['plugin-06', 'done'],
			['parser-02', 'done'],
			['parser-03', 'different_by_design'],
			['render-11', 'done']
		]);

		for (const [id, expectedStatus] of expectedStatuses) {
			expect(matrixRows.get(id), `Unexpected matrix status for ${id}`).toBe(expectedStatus);
		}
	});

	test('closes the targeted prop/render partials and keeps the canonical backlog empty once strict closeout lands', () => {
		const matrixRows = new Map(
			collectMatrixRows(readDoc('docs/parity-matrix.md')).map((row) => [row.id, row.status])
		);
		const backlogIds = collectCapabilityBacklogRows(readDoc('docs/parity-matrix.md')).map(
			(row) => row.matrixRow
		);
		const closedRows = new Map<string, string>([
			['prop-01', 'done'],
			['prop-02', 'done'],
			['render-01', 'done'],
			['render-02', 'done'],
			['render-04', 'done'],
			['render-06', 'done'],
			['render-07', 'done'],
			['render-09', 'done']
		]);

		for (const [id, expectedStatus] of closedRows) {
			expect(matrixRows.get(id), `Unexpected matrix status for ${id}`).toBe(expectedStatus);
			expect(backlogIds).not.toContain(id);
		}

		const remainingPropRenderRows = [...matrixRows.entries()].filter(
			([id, status]) =>
				/^(prop|render)-\d+$/.test(id) && (status === 'tracked_follow_up' || status === 'missing')
		);

		expect(remainingPropRenderRows).toHaveLength(0);
		expect(backlogIds).toHaveLength(0);
	});

	test('parses single-row canonical backlog entries', () => {
		const rows = collectCapabilityBacklogRows(`
## Canonical Unresolved Capability Backlog

| Matrix row | Parity category | Status | Owning ticket | Remaining work |
| --- | --- | --- | --- | --- |
| \`render-11\` | \`rendering\` | \`tracked_follow_up\` | \`ASE-47\` | Sample backlog |
`);

		expect(rows).toEqual([
			{
				matrixRow: 'render-11'
			}
		]);
	});

	test('lists every unresolved non-drift matrix row exactly once in the canonical capability backlog', () => {
		const matrixRows = collectMatrixRows(readDoc('docs/parity-matrix.md'));
		const matrixStatusById = new Map(matrixRows.map((row) => [row.id, row.status]));
		const unresolvedIds = matrixRows
			.filter((row) => row.status === 'tracked_follow_up' || row.status === 'missing')
			.map((row) => row.id);
		const backlogIds = collectCapabilityBacklogRows(readDoc('docs/parity-matrix.md')).map(
			(row) => row.matrixRow
		);

		for (const id of unresolvedIds) {
			expect(
				backlogIds.filter((backlogId) => backlogId === id),
				`Expected exactly one capability backlog entry for ${id}`
			).toHaveLength(1);
		}

		for (const id of backlogIds) {
			expect(
				matrixStatusById.get(id),
				`Capability backlog references unknown matrix row ${id}`
			).toBeDefined();
			expect(
				matrixStatusById.get(id),
				`Capability backlog should not include done matrix row ${id}`
			).not.toBe('done');
		}

		expect(unresolvedIds).toHaveLength(0);
		expect(backlogIds).toHaveLength(0);
	});

	test('keeps package/export backlog items out of the implement bucket once they are accepted drift', () => {
		const backlogRows = collectRemainingBacklogRows(readDoc('docs/reference-tests-inventory.md'));
		const packageBoundaryRows = backlogRows.filter(
			(row) => row.category === 'package/export boundaries'
		);

		const acceptedDriftFiles = new Set([
			'packages/remend/__tests__/custom-handlers.test.ts',
			'packages/remend/__tests__/utils.test.ts',
			'packages/streamdown/__tests__/detect-direction.test.ts',
			'packages/streamdown/__tests__/icon-context.test.tsx',
			'packages/streamdown/__tests__/utils.test.ts',
			'packages/streamdown-cjk/__tests__/index.test.ts',
			'packages/streamdown-code/__tests__/index.test.ts',
			'packages/streamdown-math/__tests__/index.test.ts',
			'packages/streamdown-mermaid/__tests__/index.test.ts'
		]);

		for (const row of packageBoundaryRows) {
			if (acceptedDriftFiles.has(row.referenceFile)) {
				expect(row.nextAction, `Unexpected next action for ${row.referenceFile}`).toBe(
					'accepted drift'
				);
			}
		}

		expect(
			packageBoundaryRows
				.filter((row) => acceptedDriftFiles.has(row.referenceFile))
				.some((row) => row.nextAction === 'implement')
		).toBe(false);
	});

	test('keeps plugin accepted-drift backlog items out of the implement bucket once they are classified drift', () => {
		const backlogRows = collectRemainingBacklogRows(readDoc('docs/reference-tests-inventory.md'));
		const pluginContextRow = backlogRows.find(
			(row) => row.referenceFile === 'packages/streamdown/__tests__/plugin-context.test.tsx'
		);

		expect(pluginContextRow).toBeDefined();
		expect(pluginContextRow?.category).toBe('plugins');
		expect(pluginContextRow?.nextAction).toBe('accepted drift');
	});

	test('keeps performance accepted-drift backlog items out of the implement bucket once they are classified drift', () => {
		const backlogRows = collectRemainingBacklogRows(readDoc('docs/reference-tests-inventory.md'));
		const performanceAcceptedDriftFiles = new Set([
			'packages/streamdown/__tests__/code-block-memo.test.tsx',
			'packages/streamdown/__tests__/components-memo.test.tsx',
			'packages/streamdown/__tests__/components-rerender.test.tsx',
			'packages/streamdown/__tests__/memo-comparators.test.tsx',
			'packages/streamdown/__tests__/use-deferred-render.test.tsx'
		]);

		for (const row of backlogRows) {
			if (performanceAcceptedDriftFiles.has(row.referenceFile)) {
				expect(row.category, `Unexpected category for ${row.referenceFile}`).toBe(
					'performance/framework drift'
				);
				expect(row.nextAction, `Unexpected next action for ${row.referenceFile}`).toBe(
					'accepted drift'
				);
			}
		}
	});

	test('documents every targeted accepted-drift row with explicit rationale and generated local evidence', () => {
		const targetFiles = [
			'packages/remend/__tests__/custom-handlers.test.ts',
			'packages/remend/__tests__/utils.test.ts',
			'packages/streamdown/__tests__/detect-direction.test.ts',
			'packages/streamdown/__tests__/plugin-context.test.tsx',
			'packages/streamdown/__tests__/icon-context.test.tsx',
			'packages/streamdown/__tests__/utils.test.ts',
			'packages/streamdown/__tests__/code-block-memo.test.tsx',
			'packages/streamdown/__tests__/components-memo.test.tsx',
			'packages/streamdown/__tests__/components-rerender.test.tsx',
			'packages/streamdown/__tests__/memo-comparators.test.tsx',
			'packages/streamdown/__tests__/use-deferred-render.test.tsx',
			'packages/streamdown-cjk/__tests__/index.test.ts',
			'packages/streamdown-code/__tests__/index.test.ts',
			'packages/streamdown-math/__tests__/index.test.ts',
			'packages/streamdown-mermaid/__tests__/index.test.ts'
		];
		const inventoryRows = collectInventoryRows(readDoc('docs/reference-tests-inventory.md'));
		const statusRows = collectMigrationStatusRows(readDoc('docs/test-migration-status.md'));

		for (const sourceFile of targetFiles) {
			const inventoryRow = inventoryRows.get(sourceFile);
			expect(inventoryRow, `Missing inventory row for ${sourceFile}`).toBeDefined();
			expect(inventoryRow?.migrationStatus, `Unexpected migration status for ${sourceFile}`).toBe(
				'blocked_by_missing_surface'
			);
			expect(inventoryRow?.evidence, `Missing drift rationale for ${sourceFile}`).toMatch(
				/drift-\d+/
			);
			expect(inventoryRow?.evidence, `Missing local evidence path for ${sourceFile}`).toMatch(
				/`(?:src|tests)\/[^`]+`/
			);

			const statusRow = statusRows.get(sourceFile);
			expect(statusRow, `Missing generated status row for ${sourceFile}`).toBeDefined();
			expect(
				statusRow?.localDestination,
				`Generated tracker still lacks local evidence for ${sourceFile}`
			).not.toBe('-');
			expect(statusRow?.blocker, `Generated tracker lost rationale for ${sourceFile}`).toMatch(
				/drift-\d+/
			);
		}
	});

	test('defines every drift id that the parity matrix cites as accepted rationale', () => {
		const matrixMarkdown = readDoc('docs/parity-matrix.md');
		const definedDriftIds = new Set(collectDriftRows(matrixMarkdown).map((row) => row.id));

		for (const driftId of collectReferencedDriftIds(matrixMarkdown)) {
			expect(definedDriftIds.has(driftId), `Missing Local-Only Drift row for ${driftId}`).toBe(
				true
			);
		}
	});
});
