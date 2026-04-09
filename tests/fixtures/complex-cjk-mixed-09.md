# 发布说明：`deploy.sh` 与 API 巡检

今天把 **Streamdown 中文 mixed mode** 上线到 _staging 环境_，并顺手检查了 ~~旧版流程~~ 新链路。`README.zh-CN.md` 里写的命令、`pnpm test -- --run`、以及 https://example.com/docs/streamdown?lang=zh-CN 都已经过了一遍；唯一要注意的是：中文标点（例如“全角冒号：”、句号。）和 English words 相邻时，渲染不要吞字。🙂

> 提醒：如果值班同学看到 `WARN_render_timeout`，先去 [Runbook（内部版）](https://example.com/runbook/cjk-layout) 对照步骤，再确认自动链接 https://status.example.com/incidents/ase-72。不要把 `src/lib/markdown.ts` 里的空格策略手改丢了。
>
> 第二条备注：引用里仍然会混排 _italic 提示_、**加粗结论** 与 `inline_code()`；句尾要保留中文分号；以及 emoji 🚀。

1. 发布前检查
   - 核对 `src/routes/+page.svelte` 与 `src/lib/Streamdown.svelte` 的变更范围。
   - 确认 **CJK 边界**：例如“版本号 v3.0.3：已发布”，冒号前后文字都要在。
   - 确认 *强调文本（含括号）*后面紧跟中文说明，不出现断裂。
2. 回归样例
   1. 打开 `tests/fixtures/complex-cjk-mixed-09.md`，检查标题、段落、引用。
   2. 观察列表里的 `code span`、https://example.com/path?q=cjk&from=fixture，以及 ~~过期说明~~ 是否都被正确解析。
3. 收尾记录
   - 把结果贴到 `notes/ase-72.md`。
   - 若失败，执行 `node scripts/report.js --case ase-72`，并附上日志文件 `artifacts/cjk-layout.log`。

```ts
export function summarizeCase(name: string) {
	return `案例 ${name}：CJK mixed layout stable`;
}
```

| 项目 | 值                                    | 备注                          |
| ---- | ------------------------------------- | ----------------------------- |
| 环境 | staging                               | 中文说明与 English label 混排 |
| 命令 | `pnpm test -- --run`                  | 关注 `code span` 与列表缩进   |
| 链接 | <https://example.com/help/cjk-layout> | 自动链接后面要保留句号。      |
