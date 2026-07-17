# ADR-0001 唯一主项目

## Context
早期存在三个并行目录：CC 工程（desktpo-pet）、Codex 素材项目（desktop-pet/）、niuniu 遗产（CodexPets/）。
跨目录绝对路径引用曾导致素材丢失风险（CHARACTER.md 一度丢失）与"改了 A 处、跑的是 B 处"的验收事故（/Applications 旧副本导致 Load failed 误判）。

## Decision
只保留一个活动主项目（本仓库）。外部目录降级为只读遗产（已哈希留底）；
Codex 只在主项目 `source-assets/<pet>/codex-output/` 内读写；CC 不跨外部项目读活动素材。

## Alternatives considered
- 多仓库（app 仓 + 素材仓）：素材与引擎版本联动割裂，当前单人产线收益为负。
- 继续双项目 + 同步脚本：同步本身成为新的故障源。

## Consequences
+ 单一事实源；确定性重建可测试。
− 仓库体积随素材增长（由存储治理 ADR/roadmap 缓解）。

## Status
Accepted（2026-07-08，已由两轮迁移与全量回归验证）
