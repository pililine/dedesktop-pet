# ADR-0004 平台无关宠物包

## Context
Windows NSIS 已在 CI 构建成功但未实机验证；若素材按平台分叉，双平台验收成本翻倍。

## Decision
pets/<pet>/ 只含 pet.json + spritesheet.webp（+未来 preview.webp）。
两平台构建共用同一包；平台差异全部收敛在 apps/desktop-pet（窗口/托盘/DPI/自启动适配）。
构建期 dist/pets 仅是 staging 副本，非权威源。

## Alternatives considered
- 按平台出包（win 版低分辨率等）：维护两套 approved，QA 翻倍。
- 引擎内写死平台专属动画参数：违反 ADR-0006 的配置化原则。

## Consequences
+ Windows 验收只需验"应用层"，素材层零增量。
− 平台特定视觉优化（如 Windows 亚像素）不可行——接受。

## Status
Accepted
