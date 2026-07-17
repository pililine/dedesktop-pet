# Pet Factory 12 个月路线图

图例：Eng=是否改引擎 · Sch=是否改 schema · Cx=是否需 Codex · Win=是否需 Windows 实机

| Phase | 目标 | 产物 | 依赖 | 风险 | 验收标准 | Eng | Sch | Cx | Win |
|---|---|---|---|---|---|---|---|---|---|
| **1 生产线稳定化** | 现有能力固化+补状态落盘 | lifecycle.json 写入、`pet_factory qa` 标准化（泛化 walk16 三件套）、report 归档 | 现有 CLI | 低 | walk16 QA 命令对任意动作可跑；lifecycle 有测试 | 否 | 否 | 否 | 否 |
| **2 标准 create→build** | 打通"新宠物"命令闭环 | create / import-photos / create-task / ingest / approve 命令 | Phase 1 | 中（状态机边界） | 空跑一只 dummy 宠物走完 created→package-built | 否 | 否 | 否 | 否 |
| **3 第三只宠物·零改引擎** | 用真实新宠物验收工厂 | 第三只宠物候选 App | Phase 2 + Codex 出图 | 中（暴露工厂缺口） | **create→候选 App，引擎 git diff 为空** | **否(验收项)** | **否** | 是 | 否 |
| **4 Windows MVP** | Windows 11 实机核心体验 | Windows 行为验证报告 | Win 实机/VM | 高（无实机则阻塞） | 透明/DPI/托盘/拖拽/自启动实机通过 | 否 | 否 | 否 | **是** |
| **5 test-install/promote/rollback** | 发布安全网 | 三命令 + 备份/自动回滚 | Phase 2 | 中 | promote 失败自动还原；rollback 可回指定版 | 否 | 否 | 否 | 否 |
| **6 Factory GUI** | 评审/总览薄壳 | 独立 Tauri 工厂窗口（3 页 MVP） | Phase 2/5 CLI 稳定 | 中（返工） | 评审页替代勾选表；只调 CLI 核心 | 否(新 app) | 否 | 否 | 否 |
| **7 批量生产+存储治理** | 多宠物并行+清理 | clean 命令（dry-run+引用保护）、批量脚本、（必要时）LFS | Phase 3/5 | 中（误删） | dry-run 不误删被引用哈希；并行 3 只不串包 | 否 | 否 | 是 | 否 |
| **8 签名/更新/发布** | 正式对外 | macOS 公证、Windows 签名、自动更新、release manifest | 证书（用户）、Win 实机 | 高（成本/证书） | 双平台签名安装无警告；可自动更新 | 可能(更新器) | 否 | 否 | **是** |

节奏（相对）：3 个月内 Phase 1–3；6 个月内 +Phase 4–5；12 个月内 +Phase 6–8（8 依赖证书到位）。
关键路径：Phase 3（工厂是否真通）与 Phase 4（是否有 Windows 实机）是两个最大不确定性。
