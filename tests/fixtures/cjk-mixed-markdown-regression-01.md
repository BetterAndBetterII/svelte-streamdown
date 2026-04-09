# 复杂中文混排 Markdown 回归样例 01 🚀

发布说明里同时出现 **Streamdown**、_parser IR_、~~legacy renderer~~、`src/lib/markdown.ts`、[回归记录](https://example.com/release/ase-64) 与自动链接 https://example.com；这些中英文边界、全角标点与 emoji 😀 都不应该吞字。

> 维护提示：如果值班同学看到 `pnpm test` 失败，请先看 [CI 面板](https://example.com/ci/ase-64)；不要把中文句号“。”或冒号“：”误算进 URL。

1. 发布前核对
   - 核对 `README.md`、`CHANGELOG.md` 与 `docs/cjk-note.md`
   - 确认 **粗体术语** 与 _斜体提醒_ 在中文括号（含 English term）前后都稳定
2. 异常复盘
   - 旧文案里有 ~~legacy-parser~~，现在统一替换成 `createCjkPlugin()`
   - 当句子写成“请打开 https://example.com/docs。然后继续”时，句号必须保留
   - 二级步骤：
     1. 记录 `ASE-64`
     2. 检查 `tests/fixtures/cjk-mixed-markdown-regression-01.md`
3. 数据摘录

```ts
const regressionCase = {
	ticket: 'ASE-64',
	fixture: 'tests/fixtures/cjk-mixed-markdown-regression-01.md',
	command: 'pnpm exec vitest --run --project server',
	happy: true
};

console.log('回归样例已加载', regressionCase);
```

| 字段 | 示例                     | 备注               |
| ---- | ------------------------ | ------------------ |
| 页面 | `发布页`                 | 中英混排，emoji 😀 |
| Link | https://example.com/spec | 结尾常跟全角句号。 |
| 文件 | `README.zh-CN.md`        | 需要人工复核       |

最后说明：如果 `codespan`、[链接详情](https://example.com/spec/detail) 和 English 单词贴着中文全角逗号、顿号、括号（例如 parser、renderer）出现，渲染结构也要保持稳定。
