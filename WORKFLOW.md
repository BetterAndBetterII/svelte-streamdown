---
tracker:
  kind: github_project
  project_owner: 'BetterAndBetterII'
  project_number: 23
  project_field_status: 'Status'
  active_states:
    - Todo
    - In Progress
    - Rework
    - In Review
    - Merging
  terminal_states:
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
    - Duplicated
    - Done
polling:
  interval_ms: 10000
server:
  port: 40024
workspace:
  root: '/home/yuzhong/agent-workspace/svelte-streamdown/workspaces'
hooks:
  after_create: |
    git clone --depth 1 https://github.com/BetterAndBetterII/svelte-streamdown.git .
    if command -v pnpm >/dev/null 2>&1; then
      pnpm install --frozen-lockfile
    else
      npm install
    fi

    mkdir -p references
    if [ -d references/streamdown/.git ]; then
      git -C references/streamdown remote set-url origin https://github.com/vercel/streamdown.git
      git -C references/streamdown fetch --depth 1 origin
      default_branch="$(git -C references/streamdown remote show origin | sed -n '/HEAD branch/s/.*: //p')"
      if [ -z "$default_branch" ]; then
        default_branch=main
      fi
      git -C references/streamdown checkout -B "$default_branch" "origin/$default_branch"
      git -C references/streamdown reset --hard "origin/$default_branch"
      git -C references/streamdown clean -fd
    else
      git clone --depth 1 https://github.com/vercel/streamdown.git references/streamdown
    fi
agent:
  max_concurrent_agents: 10
  max_turns: 24
codex:
  command: codex --config shell_environment_policy.inherit=all --config model_reasoning_effort=high --model gpt-5.3-codex app-server
  approval_policy: never
  thread_sandbox: danger-full-access
  turn_sandbox_policy:
    type: dangerFullAccess
    networkAccess: true
---

你正在处理当前仓库 `svelte-streamdown` 的 GitHub 工单 `{{ issue.identifier }}`。

{% if attempt %}
续跑上下文：

- 这是第 #{{ attempt }} 次重试，因为工单仍处于活跃状态。
- 直接基于当前工作区继续，而不是从零开始。
- 不要重复已经完成的排查、移植、验证或对比，除非新的反馈明确要求。
  {% endif %}

仓库上下文：

- 当前仓库是 `svelte-streamdown`，目标是把它推进到对参考实现 `streamdown` 的高可信 parity。
- 参考实现固定放在 `references/streamdown`，来源必须是 `https://github.com/vercel/streamdown.git`。
- 顶层执行计划以仓库根目录的 `PLAN.md` 为准；当前 issue 的工作必须能映射到 `PLAN.md` 中的某个 issue、phase 或 milestone。
- 当前仓库的四条主线是：
  1. 可信、可复现、安全发布
  2. 原版 `streamdown` / `remend` 测试移植
  3. API、解析、渲染、交互的 parity 对比测试
  4. 补齐 `streamdown` 支持的全部功能
- 不允许只“看起来像”就宣布完成。必须以代码、测试、对比夹具或发布校验作为证据。

工单信息：
编号: {{ issue.identifier }}
标题: {{ issue.title }}
当前状态: {{ issue.state }}
标签: {{ issue.labels }}
URL: {{ issue.url }}

描述：
{% if issue.description %}
{{ issue.description }}
{% else %}
未提供描述。
{% endif %}

## 全局规则

1. 这是无人值守会话。不要要求人类在本地执行命令。
2. 只有在缺少必要权限、鉴权或关键外部资源时才允许停止，并把阻塞写入工作台评论。
3. 只在当前 issue 对应工作区内工作，不要修改其它 issue 工作区。
4. 任何功能改动都必须先定位到 `PLAN.md` 的对应任务，再实施。
5. 任何 parity 相关改动都必须有测试或对比夹具支撑；不允许先改实现、后想办法解释。
6. 不要为了让测试通过而扭曲代码语义；要以参考实现行为为目标。
7. 最终目标是把工单推进到可评审、可合并、可发布的状态，而不是输出长篇解释。

## 分支规则

当需要创建新分支时，分支名必须符合：

- 格式：`第一段/第二段`
- 第一段使用：`feat` / `fix` / `docs` / `refactor` / `test` / `perf` / `chore` / `misc`
- 第二段使用 2-4 个以 `-` 连接的小写关键词
- 第二段第一个关键词必须是工单号的小写形式

示例：

- `feat/ssd-12-line-numbers`
- `fix/ssd-18-link-safety`
- `test/ssd-27-playwright-parity`
- `chore/ssd-31-release-gates`

## 默认执行方式

- 每次开工先查找或创建一条持久化工作台评论，标题标记为 `## Codex Workpad`。
- 工作台评论是唯一事实来源：计划、验证、阻塞、参考仓库同步结果、PR、反馈处理、合并记录都持续写到这一条里。
- 实现前先读取相关代码、`PLAN.md` 和参考实现 `references/streamdown` 的对应代码/测试/文档。
- 如果 issue 本身没写清楚对应 `PLAN.md` 项，先在工作台评论中建立映射。
- 对于 bug 或 parity 差异，优先先复现；若测试可模拟，就先补失败测试再修复。
- 对于功能补齐，优先先补 reference parity fixture 或 ported test，再改实现。
- 对于发布或安全工作，优先补 CI gate、pack 校验、可重复构建校验，而不是先改 README。
- 提交前至少运行与改动相关的最小验证，并把命令和结果写入工作台评论。
- 除非仓库策略明确要求直推主干，否则默认通过分支 + PR 推进。

## 状态映射

- `Backlog` -> 不处理，等待人类推进。
- `Todo` -> 立即切换到 `In Progress`，然后开始执行，不经过 Spec 阶段。
- `In Progress` -> 直接实现或继续推进当前任务；完成后推到 `In Review`。
- `In Review` -> 这是可执行状态，必须主动审核当前 PR / 分支 / parity 证据，而不是继续堆实现。
- `Rework` -> 基于 review 反馈继续实现；修复后重新回到 `In Review`。
- `Merging` -> 已批准，可以整理分支、同步最新主干、完成合并或执行仓库规定的落地动作。
- `Done` -> 终态，不做任何操作。

## 执行步骤

1. 通过明确的工单 ID 获取工单并确认当前状态。
2. 如果状态是 `Todo`，立刻把它移动到 `In Progress`。
3. 查找或创建 `## Codex Workpad` 评论，并在顶部写入环境戳：
   `<host>:<abs-workdir>@<short-sha>`
4. 在同一条评论中维护：
   - 当前计划
   - 对应的 `PLAN.md` issue / milestone
   - Acceptance Criteria
   - Validation
   - Notes
   - 阻塞项
5. 在开始新编辑前先同步仓库：
   - 更新当前仓库的 `origin`
   - 确认当前 issue 是否已有对应分支和打开中的 PR
   - 如果没有工作分支，则从最新默认分支创建干净分支
6. 在同步当前仓库之后，必须同步参考实现：
   - 确认 `references/streamdown` 存在
   - 若不存在，则执行 `git clone --depth 1 https://github.com/vercel/streamdown.git references/streamdown`
   - 若已存在，则：
     - 校验其 `origin` 指向 `https://github.com/vercel/streamdown.git`
     - `fetch` 最新默认分支
     - 将工作树硬对齐到最新默认分支
   - 在工作台评论记录参考仓库的 commit SHA
7. 在动手实现前，先确认当前任务属于哪一类：
   - 发布/安全
   - 测试移植
   - parity 对比
   - 功能补齐
8. 对四类任务分别采用以下默认策略：
   - 发布/安全：
     - 先补脚本和 CI gate
     - 再补文档和流程
   - 测试移植：
     - 先分类 reference tests
     - 再移植 harness
     - 最后迁移单个测试文件
   - parity 对比：
     - 先定义 normalized contract
     - 再补 parser/API parity
     - 最后补 Playwright DOM/interaction parity
   - 功能补齐：
     - 先补失败测试或 fixture
     - 再实现最小修复
     - 最后补文档
9. 对于 `In Progress` / `Rework` 路径，必须在进入 `In Review` 前完成：
   - 相关测试
   - 相关 typecheck / build / pack 验证
   - 如果改动涉及 parity，至少跑对应的 contract 或 fixture
   - 如果改动涉及发布，至少跑相关 release gate
10. 对于 `In Progress` / `Rework` 路径，完成实现后：

- 更新工作台评论
- 提交并推送分支
- 如果当前不存在 PR，则创建 PR；如果已存在 PR，则更新其描述
- 将工单推进到 `In Review`

11. 对于 `In Review` 路径，重点不是继续写代码，而是审核当前证据：

- diff 是否聚焦
- reference parity 证据是否充分
- 测试是否真的覆盖改动点
- `PLAN.md` 对应项是否被正确推进
- 文档是否与实现一致
- 是否还有未解决 review 评论

12. 对于 `In Review` 路径，审核结论必须二选一：

- 无阻塞问题：给出 approve / 明确通过结论，并推进到 `Merging`
- 有阻塞问题：提交 `change request`，明确列出必须处理的问题，并推进到 `Rework`

13. 对于 `Merging` 路径：

- 同步最新默认分支
- 处理冲突
- 重跑受影响验证
- 完成合并或仓库要求的落地动作

14. 合并完成后，先确认主干落地结果可追溯到当前 issue / PR，然后关闭对应 GitHub issue。
15. 只有在 issue 已关闭后，才更新工作台评论并将工单推进到 `Done`。

## 当前仓库的优先级规则

优先级从高到低：

1. 破坏发布可信度的问题
2. 破坏安全语义的问题
3. 参考实现明确支持、但本仓库缺失的 P0 parity 能力
4. 原版测试移植和对比测试基础设施
5. 纯文档修正

遇到 scope 冲突时：

- 优先让测试和发布链路可信
- 不要在没有 parity 证据的前提下大面积扩功能

## 反馈处理协议

当工单已绑定 PR 时，在回到 `In Review` 前必须清扫所有可执行反馈：

- 顶层 PR 评论
- 行内 review 评论
- review summary / request changes

每条反馈都必须满足以下之一：

- 代码或文档已经修改并解决；或
- 在对应线程中给出明确、有根据的回绝说明。

如果反馈涉及 parity：

- 必须指出对应的 reference 行为证据
- 必须指出对应测试、fixture 或 contract
- 不允许只用主观描述回应

## 合并约束

- 只有当工单状态为 `Merging` 时，才执行合并或主干落地动作。
- 合并前必须确认 PR 已通过必要检查，且分支相对默认分支没有未处理冲突。
- 如果仓库策略要求 squash / rebase / merge commit，遵循仓库既定策略，不自行发明流程。
- 合并后必须确认默认分支上的最终提交可追溯到该 issue 和对应 PR。
- 在把 Project 状态移动到 `Done` 之前，必须先关闭 GitHub issue。

## 阻塞处理

仅在以下情况允许提前停止：

- 缺少 GitHub 权限或鉴权，无法更新推送 / PR / 评论 / Project 状态
- 缺少必须的外部密钥、服务访问权限或运行环境
- 缺少完成验收所需的关键工具

出现阻塞时：

- 在 `## Codex Workpad` 中写清楚缺什么、为什么阻塞、需要什么人类动作
- 若当前工作已无法继续推进，则保持现状并在工作台评论中明确阻塞原因
- 若代码已完成但受阻于 review / merge 权限，则保持在 `In Review` 或 `Merging`，不要误标为 `Done`

## 输出要求

- 回复只报告已完成动作、验证结果、PR/提交/评论链接和阻塞项。
- 不要给人类布置泛泛的“下一步”。
