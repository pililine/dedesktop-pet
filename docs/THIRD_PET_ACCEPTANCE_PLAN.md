# 第三只宠物 · 零改引擎验收计划

## 目的
王杜兰经历大量历史修复，不能作为唯一工厂验收对象。用一只**全新宠物**验证：
**从 create 到候选 App，`apps/desktop-pet/src` 与 `src-tauri/src` 的 git diff 必须为空。**

## 约束（验收即失败条件）
- 不改引擎代码、不改 schema、不加宠物专属脚本；
- 只用标准任务包 + Codex + QA + approved + build；
- 同一宠物包 macOS/Windows 共用。
任一被打破即视为工厂有缺口，记录并回到 Backlog，不得为过关而改引擎。

## 输入
- 照片：**3–5 张**（正面清晰 1、侧面 1、休息姿 1，其余可选），放 `source-assets/<id>/photos/`。
- 身份基准：由 Codex 按现有 CHARACTER 模板产出（不是 CC 写视觉）。

## MVP 动作（4 个，与引擎语义词表对齐）
`idle`（必需）、`walkRight`、`interaction`；`walkLeft` 由 walkRight 镜像不单独出图。
—— 刻意选与王杜兰相同的动作名，以此证明"新宠物无需新动作词/新引擎分支"。

## 阶段与验收
| 阶段 | 产物 | 验收 | 失败退出 |
|---|---|---|---|
| create | 目录骨架 + lifecycle=created | 目录合规、无越界写 | 命令报错即停 |
| import-photos | photos/ + manifest | 3–5 张入库、哈希记录 | 照片格式不符 |
| identity（Codex） | identity-reference + CHARACTER | 用户批准身份基准 | 身份不达标重来 |
| create-task | idle/walkRight/interaction 任务包 | 任务包含参考图+量化目标 | 缺身份基准 |
| Codex 出图 | codex-output/<action>/ 候选 | 每动作 ≥1 候选 | 长期无候选 |
| qa | L0/L1 报告 + review 页 | 尺寸/alpha/整除/几何在区间 | 全部 FAIL |
| approve | approved/ + APPROVED.json | 用户勾选、有批准来源 | 无可接受候选 |
| build | 候选包 pets 结构 | `pet_factory validate` 通过、图集整除 | 校验失败 |
| test-install | 候选 App | 宠物显示、idle 播放、单击回应、走动 | 启动崩溃/Load failed |
| **验收判定** | – | **`git diff --stat apps/desktop-pet/src apps/desktop-pet/src-tauri/src` 为空** | 有 diff＝工厂缺口 |

## 预计会暴露的工厂缺口（提前登记，验证时确认）
1. 无 `create`/`import-photos`/`create-task`/`approve` 命令 → 目前需手工建目录（P0-3）。
2. QA 未标准化为 `pet_factory qa`，walk16 三件套是一次性脚本（P0-2）。
3. lifecycle 状态未落盘，跳步无人拦（P0-1）。
4. test-install 冒烟未自动化（P1-2）。
5. 若新宠物需要"新动作"（如 stretch/play）→ 检验语义词表是否够用；不够则走 schema/词表演进，而非引擎 if 分支。

## 结论
第三只宠物是 Phase 3 的验收载体：**它跑通之时，即"批量宠物工厂"的最小闭环成立之时**。
本计划只定义流程与判据，不启动出图（需 Codex + 用户照片）。
