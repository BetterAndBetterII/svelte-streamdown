# 发布说明：Streamdown 中文混排演练 07

这份说明面向中文团队，但会穿插 `README.zh-CN.md`、`pnpm test:unit`、emoji 😀，以及 **parser 边界**、_render 稳定性_、~~legacy fallback~~ 等术语；当中文紧贴 English token 时，断句不应吞字。请先看 [回归说明](https://example.com/spec?lang=zh-CN&case=07)，再访问 https://streamdown.dev/docs/cjk?from=ase-70。谢谢。

> 维护提示：如果你在 `src/lib/Streamdown.svelte` 附近调整逻辑，请同步检查以下几点：
>
> - 中文括号（例如「发布（beta）说明」）里的 _emphasis_ 不能串到后文。
> - 自动链接 https://status.example.com/path?q=中文。后面的句号要留在正文里。
> - 引用里提到的 ~~旧规则~~ 只作为历史背景，不应影响新输出。

1. 第一阶段：确认 **主标题**、`code span` 与中文逗号，能够同时出现。
2. 第二阶段：核对嵌套列表。
   - 子项 A：检查 `src/routes/+page.svelte` 与 `fixtures/parity/markdown` 的相邻边界。
   - 子项 B：记录 _hotfix_、**patch note**、~~deprecated flag~~ 是否保持原顺序。
   - 子项 C：访问 <https://example.org/cases/ase-70>，确认链接后的中文说明还在。
3. 第三阶段：保留示例代码块。

```ts
const report = {
	file: 'README.zh-CN.md',
	command: 'pnpm exec vitest --run',
	note: '中文与 English mix，一次通过。'
};

console.log(`${report.file} => ${report.command}`);
```

| 字段 | English Key | 说明                                                  |
| ---- | ----------- | ----------------------------------------------------- |
| 标题 | `title`     | 保留中文冒号：例如「状态：stable」                    |
| 链接 | `url`       | 自动链接 https://streamdown.dev/docs/cjk?from=table。 |
| 备注 | `note`      | 支持 emoji 😀、文件名 `CHANGELOG.md` 与中英混排       |

收尾段落：请确认“中文 + `inline code` + [链接](https://example.net/final) + English”这一行，在渲染后仍保持原有层级与标点。
