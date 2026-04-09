# 发布回顾：`Streamdown` 中文混排样例 03

昨天我在整理 `README.md` 和 `src/routes/playground/+page.svelte` 时，发现“中文说明 + English term + code span + URL”的组合最容易出问题：比如 **加粗提示**、_斜体备注_、~~旧命令~~、`pnpm test:unit`、https://streamdown.app/docs/start-here，以及 emoji 😀 挤在一起时，前后的全角标点（，。：；（））不应该吞字。

## 复盘清单

1. 先确认发布说明写进 `docs/release-notes.md`，并把 “beta channel” 标成 **待确认**。
   - 若 `CI` 仍然提示 flaky test，就先记录在 `issues/ase-66.md`。
   - 相关命令是 `pnpm verify:clean-build` 和 `pnpm test:contracts`。
2. 再检查链接边界：
   - 主站：https://streamdown.app/zh-CN/getting-started。
   - 监控面板：<https://status.streamdown.app/incidents/ase-66>。
3. 最后整理嵌套说明：
   - 第一层备注里有 _inline emphasis_ 与 `code span`。
   - 第二层备注要保留 ~~deprecated flag~~，不要把“中文（含括号）English”拆坏。

> 这次回归的重点不是“看起来差不多”，而是要确保：`README.md`、`deploy.sh` 和 [发布检查表](https://example.com/release-checklist) 在中文句子里并排出现时，token 结构仍然稳定；必要时还要保留 🙂。

```bash
pnpm test:unit -- --run tests/ported/streamdown/parser/cjk-mixed-markdown-03.test.ts
pnpm exec vitest --run --project server tests/ported/streamdown/parser/cjk-mixed-markdown-03.test.ts
echo "done"
```

| 项目 | 当前值                    | 说明                                                  |
| ---- | ------------------------- | ----------------------------------------------------- |
| 分支 | `test/ase-66-cjk-md`      | 用于补 fixture 与断言                                 |
| 文件 | `README.md` / `deploy.sh` | 中英混排要保留边界                                    |
| 状态 | ok 😀                     | 访问 https://streamdown.app/changelog；不要吞掉句号。 |

补充说明：如果同事回复“Look good，直接 merge 吧。”，也要再检查 `pnpm lint`；另外，[内部文档](https://example.com/internal?lang=zh-CN) 与 https://example.com/guide?id=ase-66 这样的 URL，周围的中文引号“”、顿号、冒号，都应该保持原样。
