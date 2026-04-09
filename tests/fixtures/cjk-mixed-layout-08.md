# 发布前检查：复杂中文 mixed Markdown 样例 08

今天的目标不是“把句子写得很长”，而是确认中文与 English 相邻时，`src/routes/+page.svelte`、`Release Notes`、emoji 🙂 和全角标点（例如：冒号、括号、顿号）都能稳定解析；如果看到 **高风险项**，请先记录到 [发布面板](https://example.com/releases/08?lang=zh-CN)，再补一句“OK，继续”。

> 值班同学提醒：当 _hotfix_、`pnpm test -- --run`、~~临时兜底~~ 与 [Runbook](https://ops.example.com/runbook#rollback) 出现在同一段里时，中文句号。和 English phrase 都不应该丢失，并继续观察。

1. 准备阶段：确认 `README.zh-CN.md` 已更新。
   - 先跑 `pnpm lint`
   - 再看 `featureFlag` 是否仍为 `false`
2. 观察阶段：中文和 **API 文案**、_fallback_、~~旧注释~~ 应该连在一起，不要因为全角逗号，或者括号（例如：`/healthz`）而断裂。
   - 人工检查 [Dashboard](https://status.example.com/release/08)
   - 自动链接：<https://status.example.com/release/08/logs>
3. 回退阶段：
   1. 执行 `git revert --no-edit HEAD`
   2. 在 `docs/release-08.md` 追加“已回退，等待复盘”。

```ts
const releaseNote = {
	locale: 'zh-CN',
	file: 'docs/release-08.md',
	summary: '中文 mixed Markdown 保持稳定'
};

console.log(`release:${releaseNote.locale}`, releaseNote.file);
```

| 项目     | 当前值                                          | 备注                            |
| :------- | :---------------------------------------------- | :------------------------------ |
| 文案状态 | `ready`                                         | 中文、English、emoji 🙂 都保留  |
| 监控链接 | [Status](https://status.example.com/release/08) | 若 5 分钟内无告警，则继续       |
| 回退开关 | `release.rollback`                              | 默认 `false`，不要写成 ~~true~~ |

补充说明：如果你直接打开 <https://docs.example.com/release-08?lang=zh-CN>，或者查看 `packages/rendering/parser.ts`，请确认“中文：English”、“全角（brackets）”、“文件名 `CHANGELOG.zh-CN.md`” 这些边界都没有吞字。🚀
