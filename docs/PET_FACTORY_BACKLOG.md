# Pet Factory Backlog

负责人：CC / Codex / 用户 / Win实机。工作量：S(<0.5d) M(0.5–2d) L(2–5d) XL(>5d)。

## P0 · 阻塞生产闭环
| # | 项 | 用户价值 | 量 | 风险 | 依赖 | 验收 | 负责 |
|---|---|---|---|---|---|---|---|
| P0-1 | lifecycle.json 状态落盘 + CLI 校验 | 防 candidate 误当 approved、防跳步 | M | 低 | – | 每命令前置校验当前状态，非法转换拒绝 | CC |
| P0-2 | `pet_factory qa` 标准命令（泛化 walk16 三件套到任意动作） | 所有候选统一 L0/L1 自动 QA | L | 中 | measure.py | 对任一 action 候选产出 qa.json+review 页 | CC |
| P0-3 | create / approve 命令 | 新宠物有正式入口，approved 有据可查 | L | 中 | P0-1 | 空跑 dummy 走完 created→approved | CC |

## P1 · 显著提升稳定性
| # | 项 | 价值 | 量 | 风险 | 依赖 | 验收 | 负责 |
|---|---|---|---|---|---|---|---|
| P1-1 | promote + 备份 + 自动回滚 | 正式包更新不再手动、可恢复 | M | 中 | P0-1 | promote 校验失败自动还原旧包 | CC |
| P1-2 | test-install 启动冒烟（macOS） | 候选 App 自动验存活，减人工 | M | 低 | – | 装→启→存活 8s→杀，超时不卡 | CC |
| P1-3 | 版本体系字段落地（schemaVersion 演进） | 可追溯"哪版哪帧" | M | 中 | schema 演进 | pet.json 带版本，validate 认字段 | CC |
| P1-4 | Windows 实机 Phase 1 验证 | 决定 Windows 能否走向发布 | L | 高 | Win实机 | 透明/DPI/托盘/拖拽/自启动通过 | 用户/Win实机 |

## P2 · 提高效率
| # | 项 | 价值 | 量 | 风险 | 依赖 | 验收 | 负责 |
|---|---|---|---|---|---|---|---|
| P2-1 | 第三只宠物 dummy 全流程演练 | 暴露工厂缺口 | M | 中 | P0-* | 引擎零 diff 出候选 App | CC+Codex |
| P2-2 | release 命令 + manifest（分平台验证等级） | 发布可审计、可回溯 | M | 低 | P1-1 | manifest 记录双平台等级+哈希 | CC |
| P2-3 | clean 命令（dry-run + 引用保护） | 控制素材膨胀 | M | 中（误删） | – | 被引用哈希拒删；默认 dry-run | CC |

## P3 · 长期增强
| # | 项 | 价值 | 量 | 风险 | 依赖 |
|---|---|---|---|---|---|
| P3-1 | Factory GUI（评审/总览/构建 3 页） | 评审体验、非 CLI 用户 | XL | 中 | CLI 稳定 |
| P3-2 | Windows 签名 + 自动更新 | 正式对外无警告 | XL | 高 | 证书(用户)、Win实机 |
| P3-3 | macOS 公证 stapling | 对外分发无 Gatekeeper 拦截 | L | 中 | Apple 账号(用户) |
| P3-4 | 动作格式方案 D（atlas+manifest） | 支持特写/大动作/按需加载 | XL | 高 | 触发条件达成 |

## Not Now（明确不做）
| 项 | 原因 |
|---|---|
| AI 视觉相似度/人脸式身份评分 | 人工 review 分钟级即可；模型假阴假阳仍需人工复核，净收益为负。>5 只并行再评估 |
| 多宠物市场/云端分发 | 单人产线，无需求 |
| 引擎内宠物专属逻辑 | 违反 ADR-0002/边界；一切走 pet.json 配置 |
| monorepo 重型框架（nx/turbo） | 两包一线，Makefile 足够 |
| 根目录改名与结构再搬迁 | 结构已稳定；改名单独一轮（.tools 内嵌绝对路径需处理） |
