# ADR-0002 Codex 与 CC 职责边界

## Context
Codex 擅长图像生成但曾维护独立软件项目，产生结构漂移；CC 擅长工程但无图像生成能力（本项目内验证过：矢量占位无法达到写实要求）。

## Decision
Codex＝只生成图像素材（读 photos/identity/任务包，写 codex-output/ 与 generation-notes）。
CC＝结构、加工、QA、宠物包、引擎、构建。用户＝视觉选择与最终批准。
Codex 禁写：apps/、pet_factory/、schemas/、pets/、releases/、正式 atlas/pet.json。

## Alternatives considered
- Codex 全栈直改宠物包：无 QA 门与确定性，历史上产生过 Q 版偏差、身份漂移素材。
- CC 兼做图像修补：能力不匹配，产出质量不可接受。

## Consequences
+ 每张进入正式包的图都有"任务包→候选→QA→人工批准"的可追溯链。
− 多一次目录交接成本（由标准任务包模板摊薄）。

## Status
Accepted（walk16 任务包 + 8 动作迁移流程已按此运行）
