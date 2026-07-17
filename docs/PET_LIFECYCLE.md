# 宠物生命周期状态机

状态落盘于 `source-assets/<pet>/manifests/lifecycle.json`（`{"state": "...", "history":[...]}`，由 CLI 写入）。

## 状态转移图

```text
created → photos-imported → identity-draft → identity-approved① → tasks-ready
   → assets-generating ⇄ assets-candidate → assets-reviewed① → assets-approved
   → package-built → package-validated → test-installed → test-approved①
   → promoted → released① → deprecated → archived

任何 assets-* 状态 --(否决)--> tasks-ready（重出任务）
package/test 失败 --> assets-approved（回到上一个稳定点）
released --(缺陷)--> promoted 回滚至上一 release
①＝必须人工批准的门
```

## 状态定义表

| 状态 | 进入条件 | 允许 | 禁止 | 必需文件 | 可回退到 | 负责 |
|---|---|---|---|---|---|---|
| created | `create` 命令 | 建目录/写身份草稿 | 出图 | 目录骨架 | – | CC |
| photos-imported | photos/ 非空 | 做 identity | 出图 | photos/* | created | 用户提供+CC |
| identity-draft | CHARACTER.md 草稿 | 修订 | 出任务 | identity-reference/ | 上一状态 | CC |
| **identity-approved** | **用户确认身份基准** | 出任务包 | 改身份文件（需重批） | 批准记录 | draft | **用户** |
| tasks-ready | 任务包生成 | Codex 领任务 | 直接写 frames | work/<pet>/…/tasks/ | – | CC |
| assets-generating | Codex 开始写 codex-output | 追加候选 | 写 approved | – | tasks-ready | Codex |
| assets-candidate | 基础 QA 通过（L0/L1） | 进入评审 | 进构建 | qa 报告 | generating | CC |
| **assets-reviewed** | **用户在 review 勾选** | 落 approved/rejected | – | selection-form 勾选 | candidate | **用户** |
| assets-approved | APPROVED.json 写入 | slice→frames→build | 改 approved 内容（改=新 revision） | APPROVED.json | reviewed | CC |
| package-built | build 成功 | validate | promote | 候选包 | approved | CC |
| package-validated | validate 通过 | test-install | promote | validate 记录 | built | CC |
| test-installed | 候选 App 装载运行 | 用户验收 | promote | 候选 App | validated | CC |
| **test-approved** | **用户实机验收通过** | promote | – | 验收记录 | installed | **用户** |
| promoted | 正式包更新（旧包已备份） | release | 手改 pets/ | pets/<pet>/ + 备份 | 上一版包 | CC |
| **released** | **manifest 写入 releases/**（分平台验证等级） | 分发 | 覆盖既有 release | releases/manifests/ | promoted | **用户批准** |
| deprecated | 新版取代/下架 | 保留下载 | 新装推荐 | 标记 | released | CC |
| archived | 生产周期结束 | 只读 | 一切写 | 归档记录 | – | CC |

## 防错规则（来自真实事故）
1. **未批准素材永不入包**：构建输入只认 approved（ADR-0003，有测试）。
2. **candidate≠approved**：状态由 lifecycle.json 记录，CLI 校验后才允许 build。
3. **旧素材不得覆盖新版本**：approved 内容不可变；修改＝新 assetRevision（见版本体系）。
4. **构建失败禁止 promote**：promote 前置校验 package-validated + test-approved。
5. **macOS 通过≠released**：release manifest 按平台记录验证等级（macOS: 实机 / Windows: 仅CI），未达标平台标 `pending-verification`。
