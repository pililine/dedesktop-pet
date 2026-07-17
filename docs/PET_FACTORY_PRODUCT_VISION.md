# Pet Factory 产品愿景

一句话：**把"一张照片到跨平台桌宠"的手艺，固化成可批量重复的生产线。**

## 当前基线（2026-07-08 事实）
已具备：双宠物包（niuniu/wangdulan）· Tauri 应用（apps/desktop-pet，57 前端 + 9 Rust 测试）·
macOS 构建 · pet_factory CLI（selftest/validate/build/slice，6 Python 测试）· JSON Schema + 双端校验器 ·
source-assets/work/approved/pets 分层 · Codex/CC 分工（ADR-0002）· 确定性重建（逐字节，有测试）·
walk16 QA 三件套 + review 页 · Windows CI 构建通过（NSIS 已产出未实机验证）。
尚未具备：create/ingest/approve/promote/rollback/release 命令 · lifecycle 状态落盘 ·
test-install 自动冒烟 · 版本体系字段 · 存储清理 · Windows 实机验证 · 签名与自动更新 · Factory GUI。

## Level 1：开发者 CLI（当前层，扩展中）

| 命令 | 输入 | 输出 | 只读 | 可回滚 | 人工批准 | 可改正式资源 | 失败行为 | 状态变化 |
|---|---|---|---|---|---|---|---|---|
| create <id> | pet id | source-assets/work 骨架+lifecycle | ✗ | ✓(删目录) | ✗ | ✗ | 已存在则拒绝 | →created |
| import-photos <id> <dir> | 照片 | photos/ + manifest | ✗ | ✓ | ✗ | ✗ | 非图跳过并报告 | →photos-imported |
| create-task <id> <action> | 身份基准+测量 | work/<id>/tasks/ 任务包 | ✗ | ✓ | 身份须已批准 | ✗ | 缺身份则拒绝 | →tasks-ready |
| ingest-codex-output <id> | codex-output 新文件 | 归类+manifest 增量 | ✗ | ✓ | ✗ | ✗ | 不可识别→unclassified | →assets-generating |
| qa <id> [action] | 候选 | qa 报告+review 页 | ✓(仅写报告) | – | ✗ | ✗ | FAIL 列明不阻塞评审 | →assets-candidate |
| review <id> | qa 结果 | 刷新 review 页+勾选表 | ✓ | – | 用户勾选 | ✗ | – | →assets-reviewed |
| approve <id> | 勾选表 | approved/+APPROVED.json | ✗ | ✓(撤条目) | **必须** | ✗ | 无勾选拒绝 | →assets-approved |
| build <id> [--out] | approved/frames | 宠物包（默认候选目录） | ✗ | ✓ | ✗ | 仅显式 --out pets/ | 退出≠0 | →package-built |
| validate <id|dir> | 包 | 问题清单 | ✓ | – | ✗ | ✗ | 全量列出 | →package-validated |
| test-install <id> | 候选包 | 候选 App+启动冒烟 | ✗ | ✓(kill+删) | ✗ | ✗ | 失败回 approved | →test-installed |
| promote <id> | 已验收候选 | 备份旧包→写 pets/ | ✗ | **✓(还原备份)** | **必须** | **是** | 校验失败自动还原 | →promoted |
| rollback <id> [ver] | 备份 | pets/ 还原 | ✗ | ✓ | 确认一次 | 是 | 无备份拒绝 | →promoted(旧) |
| release <id> --platform | promoted 包+App | releases/ 产物+manifest | ✗ | ✓(下架标记) | **必须** | ✗(只写 releases) | 验证不足→pending | →released |

## Level 2：本地 Factory GUI

**判断：值得做，但排在 CLI 闭环与第三只宠物之后（Roadmap Phase 6）。**
- 形态：**独立轻量 Tauri 窗口**，不扩展桌宠 App——桌宠是常驻透明小窗，工厂是工作台，生命周期与权限完全不同。
- MVP 三页：①候选评审（before/candidate/after+洋葱皮+通过/拒绝，替代手写勾选表）②宠物状态总览（lifecycle 表）③构建/校验按钮页。
- 不进 GUI：promote/rollback/release（高危留 CLI 防误点）、schema/引擎操作。
- 共核原则：GUI 只调 pet_factory 包同一函数，零独立业务逻辑（ADR-0006）。

## Level 3：批量生产系统

| 阶段 | 可批量 | 必须逐只人工 |
|---|---|---|
| 照片导入/身份草稿 | ✓ | 身份基准批准 |
| 任务包生成 | ✓（动作词表模板化） | – |
| Codex 出图 | ✓（多任务并行） | – |
| L0/L1 QA | ✓ 全自动 | – |
| L2 评审 | 评审页批量排布 | **勾选必须人工** |
| build/validate | ✓ 自动+确定性 | – |
| 实机验收 | 冒烟自动 | **观感人工** |
| promote/release | 脚本化 | **放行人工** |

瓶颈永远是三道人工门（身份/素材/放行）——目标是把每道门压到分钟级，而非消灭。
