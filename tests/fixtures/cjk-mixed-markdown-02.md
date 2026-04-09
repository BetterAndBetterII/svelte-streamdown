# 版本回归记录：中文、English 与符号边界

昨天在 `docs/release-notes.md` 里补 ASE-65 说明时，我们发现 **主流程说明（parser token）**、_fallback 策略（render path）_、~~旧的 hotfix 文案~~ 应该一起回归；另外，值班同学提到：“请先看 https://status.example.com/streamdown，别把全角逗号吞掉。”🙂

> 发布备注：
>
> - 已复核 [回归看板](https://example.com/dashboard?tab=cjk&view=nightly)；
> - 自动链接 `https://internal.example.com/runbook` 旁边如果直接跟中文冒号：说明文字仍需可读；
> - 若看到 `pnpm test -- --run` 失败，请先确认 `tests/fixtures/` 是否为最新。

## 处理步骤

1. 打开 `src/lib/Streamdown.svelte`，核对 **中文标题（Heading）** 与 `renderTokens()` 的输出说明。
   - 第一层备注：`inline code`、English acronym、以及中文紧邻时，不应多出空格。
   - 第二层备注：
     - 访问 https://example.com/spec，确认链接后的 `，` 仍然留在正文里。
     - 检查 [发布说明](https://example.com/release-notes)（含括号）是否还是一个完整链接。
2. 查看 API 响应示例，确认 _soft wrap_ 与 ~~legacy mode~~ 的描述没有串段。
3. 最后补一张表，方便晨会同步 🚀。

```ts
const reportFile = 'tests/fixtures/cjk-mixed-markdown-02.md';
const command =
	'pnpm exec vitest --run tests/ported/streamdown/parser/cjk-mixed-markdown-02.test.ts';
console.log(`ready: ${reportFile} -> ${command}`);
```

| 检查项       | 示例                                             | 备注                 |
| ------------ | ------------------------------------------------ | -------------------- |
| 强调与代码   | **核心说明** + `token.type === "link"`           | 中文句号。不要吞字。 |
| 链接边界     | https://example.com/cases/cjk：后面还有说明      | 全角冒号要留在正文里 |
| 文件与 emoji | `README.zh-CN.md`、`src/routes/+page.svelte`、🚀 | 中英混排保持稳定     |

### 补充引用

> “如果 `release.yml` 和 `verify:clean-build` 的结果不一致，就先查 fixture，再查实现。”
>
> 这句提醒里同时出现了中文引号、英文文件名和 `code span`，是最近最容易回归的地方。

附注：更多背景见 [内部 wiki](https://intra.example.com/ase-65)；对外说明可参考 https://example.com/public/ase-65）这一页，别把右括号也吃进去。
