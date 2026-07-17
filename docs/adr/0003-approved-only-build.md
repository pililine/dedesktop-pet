# ADR-0003 只有 approved 素材可进入构建

## Context
自动 QA 无法判断"是不是同一只猫"（脸/花纹/Q 版化是人工判断项）；
曾出现候选质量参差（walk 步态两种制式）——若自动采纳会污染正式包。

## Decision
素材状态机 raw → candidate → approved/rejected。构建输入只来自 approved（或由
approved 派生的 work/<pet>/frames）。自动 QA 通过≠approved；approved 必须带
source hash、action、frame order、批准来源，禁止伪造审批记录。

## Alternatives considered
- QA 通过即自动 approve：视觉身份错误会静默入包。
- 每次构建人工挑图：不可重复、不可测试。

## Consequences
+ 确定性重建可写成单元测试（已存在：候选 atlas 与正式逐字节一致）。
+ rejected 永不在任何默认构建路径上（有测试断言）。
− 多一个人工步骤（review 页/勾选表已把成本降到分钟级）。

## Status
Accepted（APPROVED.json + tests/pet_factory 覆盖）
