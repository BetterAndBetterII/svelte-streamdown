# 复杂中文混排巡检 04：发布前回归记录

本次巡检围绕 `README.zh-CN.md`、`src/lib/markdown.ts` 与 `pnpm test` 展开：我们把 **高优先级提醒（beta）**、_灰度说明（draft）_、~~旧版 checklist~~ 放在同一段里，同时附上 [发布说明（含 `release-note` 标签）](https://example.com/release-notes?lang=zh-CN) 与自动链接 https://status.example.com/streamdown；如果句号、分号、emoji 😀 紧贴英文，也不应该吞字。

1. 准备阶段：确认 `docs/发布流程.md` 已更新。
   - 先核对 [内部清单（见 `PLAN.md`）](https://example.com/spec/plan)；这里的中文括号、英文文件名与链接文字要一起稳定解析。
   - 再确认 `fixtures/cases/cjk-04.json` 的字段名没有被误删。
2. 验证阶段：记录以下观察。
   - `Streamdown.render()` 前后的空格策略保持一致。
   - 列表里既有 **加粗说明**，也有 _斜体提醒_ 与 ~~待移除项~~。
   - 若出现 `token.type === "link"`，请保留中文冒号：说明，不要把后面的“说明”吞掉。
3. 收尾阶段：把结果同步到 `reports/ase-67.md`，并提醒 reviewer 查看 <https://review.example.com/ase-67>。

> 备注：如果你看到自动链接 https://ops.example.com/runbook。请确认全角句号不进入 URL。
> 另外，引用里仍然要保留 `inline code`、**强调文字** 和中文「引号」边界。

| 项目     | 当前值                                | 备注                                    |
| -------- | ------------------------------------- | --------------------------------------- |
| 文档入口 | `README.zh-CN.md`                     | 与 **API** 说明相邻，中文逗号，不丢字。 |
| 监控面板 | <https://dash.example.com/streamdown> | 后面跟中文（稳定）、emoji 🚀 也正常。   |
| 状态标签 | ~~legacy~~ -> `stable`                | 需要和 `beta-flag` 一起展示。           |

```ts
const reportFile = 'reports/巡检-04.md';
const summary = `处理中: ${reportFile}`;
console.log(summary);
```

最终，请访问 https://example.com/cjk-boundary。然后打开 [监控面板（含 `beta` 标签）](https://example.com/dashboard?view=zh-CN)；如果页面显示 “OK✅”，说明中英混排、全角标点、列表层级与代码块都保持稳定。
