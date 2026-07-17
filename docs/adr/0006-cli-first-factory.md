# ADR-0006 CLI 优先的工厂形态

## Context
当前产线使用者只有一人 + 两个 AI 代理；每一步都需要可追溯、可脚本化、可被 CC 调用。
GUI 对代理不可操作，对单人用户收益低于成本。

## Decision
Pet Factory 以 CLI（python -m pet_factory）为唯一操作面，状态落盘为纯文本
（JSON manifest / markdown 勾选表），人工批准通过 review 页 + 勾选表完成。
GUI 若做，必须是 CLI 核心之上的薄壳，不得出现"只有 GUI 能做"的操作。

## Alternatives considered
- 先做 Factory GUI：核心状态机未稳定前 UI 会反复返工。
- 全自动无人工门：违反 ADR-0003。

## Consequences
+ 每步可重放、可测试、可被 CC 在会话中直接执行。
− 视觉比对（逐帧挑选）在纯 CLI 下体验差——由静态 review HTML 弥补，这也是未来 GUI 的第一候选页面。

## Status
Accepted
