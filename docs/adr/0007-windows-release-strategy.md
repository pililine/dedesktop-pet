# ADR-0007 Windows 发布策略

## Context
事实基线：NSIS 安装包已由 GitHub Actions windows-latest 构建成功（PE32/NSIS、asInvoker、
PerMonitorV2、约 3.7MB）并校验，但从未在 Windows 实机运行；本机为 macOS 无法交叉构建。

## Decision
Windows 采用四阶段推进（详见 WINDOWS_DELIVERY_PLAN）：
P0 CI 编译+未签名包（已达成）→ P1 实机/VM 核心体验验证 → P2 安装生命周期 → P3 签名+自动更新。
CI 负责构建与静态验证；凡涉及透明窗口/DPI/托盘/自启动的行为验证必须实机或 VM，禁止仅凭 CI 绿标记 released。

## Alternatives considered
- 直接标记 Windows 可发布：违反"未实机不得声称验证"的项目纪律（曾因此类问题吃过 Load failed 教训）。
- 本机装 Windows 虚拟机立即验证：可行但非当前瓶颈，排在第三只宠物验证之后。

## Consequences
+ 发布状态诚实：release manifest 必须分平台记录验证等级。
− Windows 正式发布依赖一台实机/VM 资源（Backlog 中标注归属：用户/Windows 实机）。

## Status
Accepted
