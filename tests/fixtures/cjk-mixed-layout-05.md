# 复杂中文混排 Markdown 样例 05

这段说明用于验证 **中文加粗重点**、_English term_、~~旧版字段~~ 与 `src/lib/markdown.ts` 能在同一行稳定共存；同时保留 [SvelteKit 文档](https://kit.svelte.dev) 和 <https://example.com/docs/case-05?lang=zh-CN>，以及 emoji 😀。

1. **发布检查**：确认 `README.zh-CN.md`、`CHANGELOG.md` 与 API schema 已同步。
   - 若看到 `pnpm test -- --run`，说明本地 smoke test 已执行。
   - 若出现 _hotfix_ 标签，也不要把中文逗号，或句号。吞掉。
2. **渲染观察**：保留全角边界（例如「title」与 English 相邻）以及 ~~legacy~~ 标记。
   1. 子步骤 A：记录 `packages/streamdown-cjk/package.json`。
   2. 子步骤 B：核对 [issue board](https://example.com/issues/ase-68)。
3. **链接回归**：若需复现，请打开 https://example.com/case-05）；继续追踪后续说明。

> 评审备注：引用块里也要支持 **加粗**、_斜体_、`code span` 与 [发布日志](https://example.com/changelog)；否则就不是完整样例。🧪

```ts title="fixtures/cjk-mixed-layout-05.ts"
const summary = ['中文', 'English', 'emoji😀'].join(' / ');
console.log(`build ok: ${summary}`);
```

| 模块     | 输入片段                          | 预期结果                           |
| -------- | --------------------------------- | ---------------------------------- |
| parser   | `中文English`                     | 保留中文与 English 的相邻边界      |
| renderer | `https://example.com/case-05）；` | 链接后保留 `）；` 与后续中文       |
| docs     | `README.zh-CN.md`                 | 文件名与中文说明之间不插入异常空格 |

补充段落：请同时检查《OpenASE Guide》、`tests/fixtures/cjk-mixed-layout-05.md` 与 <mailto:support@example.com>；这里的中文冒号：和英文冒号: 都不应造成断词。

- 收尾动作：记录 `vitest --project server` 与 `vitest --project browser`。
- 风险提示：如果列表层级错乱，就回看 `ordered list` / `unordered list` 的 DOM 结构。
