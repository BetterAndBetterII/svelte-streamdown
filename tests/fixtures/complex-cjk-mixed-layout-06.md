# 复杂中文混排回归样例 06

上线前，请先核对 **发布说明**、_回滚预案_ 和 ~~过期脚本~~；当前主入口是 `README.zh-CN.md`，构建命令是 `pnpm test:unit`，值班同学也会顺手打开 https://status.example.com/ops?lang=zh-CN。

1. 检查 `src/routes/+page.svelte` 是否还引用 **Beta 版** 文案。
   - 如果看到 _deprecated_ 标记，先记录到 `notes/release-plan.md`。
   - 再确认访问地址（https://example.com/release-notes）后面的中文没有被吞掉。
2. 对照发布清单，确认 API、CDN 与 i18n 资源都已同步。
   1. 在 `docs/README.zh-CN.md` 里补一句「See also `CHANGELOG.md`」。
   2. 把 ~~旧链接~~ 替换成 [新版说明](https://example.com/docs/zh/release-plan)。

> 提醒：如果日志里出现 `timeout=30s`，先别慌，先看 [排障文档](https://example.com/docs/troubleshooting)；
> 第二步再检查自动链接 https://status.example.com/ops?id=42，确认句号。不会进链接里。

```ts
const releaseNote = {
	locale: 'zh-CN',
	entry: 'README.zh-CN.md',
	reviewer: 'ops-bot'
};

console.log('deploy ok', releaseNote);
```

| 模块 | 文件 / 服务                                   | 状态   |
| ---- | --------------------------------------------- | ------ |
| Web  | `src/routes/+page.svelte`                     | 已更新 |
| Docs | [发布记录](https://example.com/release-notes) | 待复核 |
| 监控 | <https://status.example.com/ops?id=42>        | 正常   |

收尾说明：请在 18:30 前于群里回复「已完成」🙂，并注明 English term、全角标点、emoji 与 `code span` 都检查过。
