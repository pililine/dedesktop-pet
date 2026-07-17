# 架构

两层一线：
- **应用层** `apps/desktop-pet/`：Tauri 2。前端（Canvas 图集播放器 + 状态机 + 移动控制）、Rust 后端（托盘/窗口/设置持久化）。宠物包经 vite 插件从根 `pets/` 提供（dev 中间件 + 构建期复制进 dist，dist 为 staging 非权威）。
- **工厂层** `pet_factory/`：Python。processing.slice（切帧+透明清理）、build.compose（图集组装+pet.json 合并，保留手工调优字段）、qa.validate（镜像运行时校验规则）、paths（唯一路径解析）、cli。
- **生产线**：source-assets →（Codex 出图）→ QA → 用户批准 → approved → work/<pet>/frames → build → pets/<pet> → 候选 App → releases。

不变量：
1. `pets/<pet>/` 只由 `pet_factory build` 写；重建具确定性（approved→atlas 逐字节可复现，tests/pet_factory 有回归测试）。
2. 应用不持有第二份宠物包；macOS 与 Windows 构建共用同一包。
3. 所有工具经 pet_factory.paths / vite appRoot 解析路径，零用户绝对路径。
