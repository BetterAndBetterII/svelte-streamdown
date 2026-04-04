import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const inventoryPath = resolve(repoRoot, "docs/reference-tests-inventory.md");
const outputPath = resolve(repoRoot, "docs/test-migration-status.md");

const PASS_STATUS_BY_MIGRATION_STATUS = {
  blocked_by_missing_surface: "blocked",
  mapped_to_local_tests: "passes (local analogue)",
  not_started: "missing",
  partial_local_coverage: "partial",
  ported_to_local_harness: "passes (ported)",
  ported_with_documented_gap: "passes (ported gap)",
  support_file: "support only",
};

const PASS_STATUS_ORDER = [
  "passes (ported)",
  "passes (ported gap)",
  "passes (local analogue)",
  "partial",
  "missing",
  "blocked",
  "support only",
];

const PRIORITY_ORDER = ["P0", "P1", "P2"];
const SOURCE_SCOPE_ORDER = ["remend", "streamdown", "plugins", "support"];
const PARITY_CATEGORIES = new Set([
  "parser",
  "security",
  "rendering",
  "interactions",
  "plugins",
  "package/export boundaries",
  "performance/framework drift",
]);
const NEXT_ACTIONS = new Set([
  "implement",
  "add/port test",
  "accepted drift",
  "release blocker",
]);

function parseArgs(argv) {
  const options = {
    check: false,
    write: false,
    summaryFile: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--check") {
      options.check = true;
      continue;
    }

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--summary-file") {
      options.summaryFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.write && !options.check && !options.summaryFile) {
    options.write = true;
  }

  return options;
}

function parseMarkdownRow(line) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function unwrapCode(cell) {
  return cell.replace(/^`/, "").replace(/`$/, "");
}

function extractLocalDestinations(evidence) {
  const matches = evidence.matchAll(/`((?:src|tests)\/[^`]+)`/g);
  return [...new Set(Array.from(matches, (match) => match[1]))];
}

function formatCell(value) {
  return value.replaceAll("|", "\\|");
}

function formatPaths(paths) {
  if (paths.length === 0) {
    return "-";
  }

  return paths.map((path) => `\`${path}\``).join("<br>");
}

function classifyScope(sourceFile, passStatus) {
  if (passStatus === "support only") {
    return "support";
  }

  if (sourceFile.startsWith("packages/remend/")) {
    return "remend";
  }

  if (sourceFile.startsWith("packages/streamdown/")) {
    return "streamdown";
  }

  return "plugins";
}

function parseUnresolvedMetadata(markdown) {
  const lines = markdown.split("\n");
  const metadata = new Map();
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      inSection = line === "## Categorized Remaining Test Backlog";
      continue;
    }

    if (!inSection || !line.startsWith("|")) {
      continue;
    }

    const cells = parseMarkdownRow(line);

    if (cells.length < 3) {
      continue;
    }

    if (cells[0] === "Parity category" || /^-+$/.test(cells[0])) {
      continue;
    }

    const parityCategory = unwrapCode(cells[0]);
    const nextAction = unwrapCode(cells[1]);
    const sourceFile = unwrapCode(cells[2]);

    if (!sourceFile.startsWith("packages/")) {
      continue;
    }

    if (!PARITY_CATEGORIES.has(parityCategory)) {
      throw new Error(
        `Unhandled parity category metadata for ${sourceFile}: ${parityCategory}`,
      );
    }

    if (!NEXT_ACTIONS.has(nextAction)) {
      throw new Error(
        `Unhandled next action metadata for ${sourceFile}: ${nextAction}`,
      );
    }

    if (metadata.has(sourceFile)) {
      throw new Error(`Duplicate categorized backlog entry for ${sourceFile}`);
    }

    metadata.set(sourceFile, {
      nextAction,
      parityCategory,
    });
  }

  return metadata;
}

function parseInventory(markdown, unresolvedMetadata) {
  const records = [];

  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|")) {
      continue;
    }

    const cells = parseMarkdownRow(line);
    if (!cells[0]?.startsWith("`packages/")) {
      continue;
    }

    const sourceFile = unwrapCode(cells[0]);
    const isTrackedReferenceFile =
      sourceFile.includes("/__tests__/") &&
      (sourceFile.endsWith(".test.ts") ||
        sourceFile.endsWith(".test.tsx") ||
        sourceFile.endsWith("/setup.ts"));

    if (!isTrackedReferenceFile) {
      continue;
    }

    if (cells.length < 5) {
      throw new Error(`Unexpected inventory row shape: ${line}`);
    }

    const area = unwrapCode(cells[1]);
    const priority = unwrapCode(cells[2]);
    const migrationStatus = unwrapCode(cells[3]);
    const evidence = cells[4];
    const passStatus = PASS_STATUS_BY_MIGRATION_STATUS[migrationStatus];
    const isUnresolved = ["partial", "missing", "blocked"].includes(passStatus);
    const metadata = unresolvedMetadata.get(sourceFile);

    if (!passStatus) {
      throw new Error(`Unhandled migration status: ${migrationStatus}`);
    }

    if (isUnresolved && !metadata) {
      throw new Error(
        `Missing categorized remaining-test metadata for unresolved reference file: ${sourceFile}`,
      );
    }

    records.push({
      area,
      evidence,
      localDestinations: extractLocalDestinations(evidence),
      migrationStatus,
      nextAction: metadata?.nextAction ?? null,
      parityCategory: metadata?.parityCategory ?? null,
      passStatus,
      priority,
      scope: classifyScope(sourceFile, passStatus),
      sourceFile,
    });
  }

  return records;
}

function assertMetadataCoverage(records, unresolvedMetadata) {
  const unresolvedSourceFiles = new Set(
    records
      .filter((record) =>
        ["partial", "missing", "blocked"].includes(record.passStatus),
      )
      .map((record) => record.sourceFile),
  );

  for (const sourceFile of unresolvedMetadata.keys()) {
    if (!unresolvedSourceFiles.has(sourceFile)) {
      throw new Error(
        `Categorized remaining-test metadata exists for ${sourceFile}, but the file is not unresolved in the inventory tables`,
      );
    }
  }
}

function compareRecords(left, right) {
  return (
    PASS_STATUS_ORDER.indexOf(left.passStatus) -
      PASS_STATUS_ORDER.indexOf(right.passStatus) ||
    PRIORITY_ORDER.indexOf(left.priority) -
      PRIORITY_ORDER.indexOf(right.priority) ||
    SOURCE_SCOPE_ORDER.indexOf(left.scope) -
      SOURCE_SCOPE_ORDER.indexOf(right.scope) ||
    left.sourceFile.localeCompare(right.sourceFile)
  );
}

function countBy(records, selector, allowedKeys) {
  const counts = Object.fromEntries(allowedKeys.map((key) => [key, 0]));

  for (const record of records) {
    const key = selector(record);
    counts[key] += 1;
  }

  return counts;
}

function collectSummary(records) {
  const executable = records.filter(
    (record) => record.passStatus !== "support only",
  );
  const support = records.filter(
    (record) => record.passStatus === "support only",
  );
  const passStatusCounts = countBy(
    records,
    (record) => record.passStatus,
    PASS_STATUS_ORDER,
  );
  const p0Remaining = executable.filter(
    (record) =>
      record.priority === "P0" &&
      (record.passStatus === "partial" ||
        record.passStatus === "missing" ||
        record.passStatus === "blocked"),
  );
  const prioritySummary = PRIORITY_ORDER.map((priority) => {
    const priorityRecords = executable.filter(
      (record) => record.priority === priority,
    );

    return {
      priority,
      total: priorityRecords.length,
      ported: priorityRecords.filter(
        (record) => record.passStatus === "passes (ported)",
      ).length,
      portedGap: priorityRecords.filter(
        (record) => record.passStatus === "passes (ported gap)",
      ).length,
      localAnalogue: priorityRecords.filter(
        (record) => record.passStatus === "passes (local analogue)",
      ).length,
      partial: priorityRecords.filter(
        (record) => record.passStatus === "partial",
      ).length,
      missing: priorityRecords.filter(
        (record) => record.passStatus === "missing",
      ).length,
      blocked: priorityRecords.filter(
        (record) => record.passStatus === "blocked",
      ).length,
    };
  });
  const scopeSummary = SOURCE_SCOPE_ORDER.map((scope) => {
    const scopeRecords = records.filter((record) => record.scope === scope);

    return {
      scope,
      total: scopeRecords.length,
      ported: scopeRecords.filter(
        (record) => record.passStatus === "passes (ported)",
      ).length,
      portedGap: scopeRecords.filter(
        (record) => record.passStatus === "passes (ported gap)",
      ).length,
      localAnalogue: scopeRecords.filter(
        (record) => record.passStatus === "passes (local analogue)",
      ).length,
      partial: scopeRecords.filter((record) => record.passStatus === "partial")
        .length,
      missing: scopeRecords.filter((record) => record.passStatus === "missing")
        .length,
      blocked: scopeRecords.filter((record) => record.passStatus === "blocked")
        .length,
      supportOnly: scopeRecords.filter(
        (record) => record.passStatus === "support only",
      ).length,
    };
  });

  return {
    executable,
    p0Remaining,
    passStatusCounts,
    prioritySummary,
    scopeSummary,
    support,
  };
}

function renderSummaryTable(summary) {
  return [
    "| Category | Count |",
    "| --- | ---: |",
    `| Executable frozen reference files | ${summary.executable.length} |`,
    `| Support files | ${summary.support.length} |`,
    `| Passing via ported upstream file | ${summary.passStatusCounts["passes (ported)"]} |`,
    `| Passing with documented port gap | ${summary.passStatusCounts["passes (ported gap)"]} |`,
    `| Passing via local analogue only | ${summary.passStatusCounts["passes (local analogue)"]} |`,
    `| Partial local coverage | ${summary.passStatusCounts.partial} |`,
    `| Missing local coverage | ${summary.passStatusCounts.missing} |`,
    `| Blocked by missing surface | ${summary.passStatusCounts.blocked} |`,
    `| Remaining P0 files not yet passing via port or local analogue | ${summary.p0Remaining.length} |`,
  ].join("\n");
}

function renderPriorityTable(summary) {
  const lines = [
    "| Priority | Total executable files | Ported | Ported gap | Local analogue | Partial | Missing | Blocked |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const row of summary.prioritySummary) {
    lines.push(
      `| \`${row.priority}\` | ${row.total} | ${row.ported} | ${row.portedGap} | ${row.localAnalogue} | ${row.partial} | ${row.missing} | ${row.blocked} |`,
    );
  }

  return lines.join("\n");
}

function renderScopeTable(summary) {
  const lines = [
    "| Scope | Total files | Ported | Ported gap | Local analogue | Partial | Missing | Blocked | Support only |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const row of summary.scopeSummary) {
    lines.push(
      `| \`${row.scope}\` | ${row.total} | ${row.ported} | ${row.portedGap} | ${row.localAnalogue} | ${row.partial} | ${row.missing} | ${row.blocked} | ${row.supportOnly} |`,
    );
  }

  return lines.join("\n");
}

function renderRemainingTable(records) {
  const lines = [
    "| Source file | Parity category | Next action | Priority | Local destination | Pass status | Blocker |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const record of records.sort(compareRecords)) {
    lines.push(
      `| \`${formatCell(record.sourceFile)}\` | \`${formatCell(record.parityCategory ?? "-")}\` | \`${formatCell(record.nextAction ?? "-")}\` | \`${record.priority}\` | ${formatPaths(record.localDestinations)} | \`${record.passStatus}\` | ${formatCell(record.evidence)} |`,
    );
  }

  return lines.join("\n");
}

function renderFullTracker(records) {
  const lines = [
    "| Source file | Area | Parity category | Next action | Priority | Migration status | Local destination | Pass status | Blockers or evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const record of [...records].sort(compareRecords)) {
    lines.push(
      `| \`${formatCell(record.sourceFile)}\` | \`${formatCell(record.area)}\` | \`${formatCell(record.parityCategory ?? "-")}\` | \`${formatCell(record.nextAction ?? "-")}\` | \`${record.priority}\` | \`${formatCell(record.migrationStatus)}\` | ${formatPaths(record.localDestinations)} | \`${record.passStatus}\` | ${formatCell(record.evidence)} |`,
    );
  }

  return lines.join("\n");
}

function renderDocument(records) {
  const summary = collectSummary(records);

  return (
    `# Test Migration Status

This document tracks ` +
    `P2-06: Track Test Migration Coverage` +
    ` from \`PLAN.md\`. It is generated from \`docs/reference-tests-inventory.md\` so the frozen reference inventory stays the single source of truth.

Reference inputs:

- Upstream repository: \`https://github.com/vercel/streamdown.git\`
- Frozen commit: \`5f6475139a87dee8af08fcf7b01475292bc064d2\` (\`5f64751\`)
- Inventory source: [docs/reference-tests-inventory.md](./reference-tests-inventory.md)
- Regenerate: \`node scripts/test-migration-status.mjs --write\`

## At A Glance

${renderSummaryTable(summary)}

## Priority Breakdown

${renderPriorityTable(summary)}

## Scope Breakdown

${renderScopeTable(summary)}

## Remaining Gaps

The table below keeps the missing work visible by listing every file that is still only partially covered, not started, or blocked, together with the normalized parity category and the next action.

${renderRemainingTable(
  records.filter((record) =>
    ["partial", "missing", "blocked"].includes(record.passStatus),
  ),
)}

## Full Tracker

${renderFullTracker(records)}
`
  );
}

function renderCiSummary(records) {
  const summary = collectSummary(records);
  const highestPriorityGaps = summary.p0Remaining
    .sort(compareRecords)
    .slice(0, 12);

  const gapTable = [
    "| Source file | Pass status | Local destination | Blocker |",
    "| --- | --- | --- | --- |",
  ];

  for (const record of highestPriorityGaps) {
    gapTable.push(
      `| \`${formatCell(record.sourceFile)}\` | \`${record.passStatus}\` | ${formatPaths(record.localDestinations)} | ${formatCell(record.evidence)} |`,
    );
  }

  return `## Test Migration Coverage

Generated from \`docs/reference-tests-inventory.md\` against frozen upstream commit \`5f64751\`.

${renderSummaryTable(summary)}

### Highest-priority remaining gaps

${gapTable.join("\n")}

Full tracker: \`docs/test-migration-status.md\`
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const inventory = readFileSync(inventoryPath, "utf8");
  const unresolvedMetadata = parseUnresolvedMetadata(inventory);
  const records = parseInventory(inventory, unresolvedMetadata);
  assertMetadataCoverage(records, unresolvedMetadata);
  const document = renderDocument(records);

  if (options.check) {
    const currentDocument = readFileSync(outputPath, "utf8");
    if (currentDocument !== document) {
      throw new Error(
        `docs/test-migration-status.md is out of date. Run: node scripts/test-migration-status.mjs --write`,
      );
    }
  }

  if (options.write) {
    writeFileSync(outputPath, document);
  }

  if (options.summaryFile) {
    writeFileSync(options.summaryFile, renderCiSummary(records));
  }
}

main();
