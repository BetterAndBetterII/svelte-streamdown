# 发布复盘：Streamdown 中文混排回归

本次回归聚焦 `tests/fixtures/cjk-complex-mixed.md`，同时核对 `src/lib/marked/index.ts` 与 `docs/release-notes.md`。请确认 **CJK 边界**、_inline emphasis_、~~旧草稿~~、`pnpm test -- --run` 以及 [发布说明](https://example.com/release-notes?lang=zh-CN) 都能稳定解析；如果要人工复查，也可以打开 https://example.com/runbook。🙂

> 引用提醒：当中文说明里紧挨着 English term 时，像“parser state”这种组合、`createCjkPlugin()`、以及 [issue #128](https://example.com/issues/128) 后面的句号。都不应该丢失。
>
> - 复查 `README.zh-CN.md`
> - 记录 emoji：🚀

## 检查清单

1. 发布前核对
   - 比对 `src/routes/+page.svelte` 与 `README.md`
   - 在「**Hotfix Ready**」标签后补一句：已同步 staging。
   - 如果看到 _fallback branch_，不要立刻合并。
2. 回归观察
   - 自动链接 https://example.com/changelog；后面的分号和“后面的中文”要保留。
   - Markdown 链接 [API diff](https://example.com/api-diff) 与 `renderInline()` 之间不能串位。
   - 嵌套说明：
     1. 先记录 `parser.ts`
     2. 再确认 ~~legacy path~~ 已下线
3. 代码片段预览：见下方 `ts` fence，与 `release/v1.2.0` 文件名一起检查。

```ts
const releaseNote = {
	file: 'src/lib/marked/index.ts',
	title: '中文 mixed Markdown 不吞全角标点',
	command: 'pnpm test -- --run'
};

console.log('ready', releaseNote);
```

## 差异摘要

| 项目     | 示例                                   | 备注                                 |
| -------- | -------------------------------------- | ------------------------------------ |
| 文件     | `README.zh-CN.md`                      | 需要同时覆盖 **粗体** 与中文句号。   |
| 链接     | [Runbook](https://example.com/runbook) | 英文 label 与中文说明相邻。          |
| 自动链接 | https://example.com/ops                | URL 后面马上接中文：请值班同学确认。 |
| Emoji    | `:rocket:` / 🚀                        | 保留 code span 与 emoji 原样。       |

最后，请把 “done” 记录到 `notes/release.log`，并确认中英混排、列表层级、表格和引用块的可读性没有回退。
