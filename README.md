# Desktop Pet Factory

桌面宠物生产线：一个仓库同时容纳 **桌面应用**（Tauri 2，macOS/Windows）与 **Pet Factory**（素材加工、QA、宠物包构建）。

## 目录
| 目录 | 用途 | 谁可写 |
|---|---|---|
| `apps/desktop-pet/` | 桌面应用（前端 + Rust） | CC |
| `pet_factory/` | Python 工具集（slice/compose/validate/CLI） | CC |
| `source-assets/<pet>/` | 素材生产区（photos → codex-output → approved/rejected） | Codex 只写 `codex-output/` |
| `work/<pet>/` | 加工工作区（frames/tasks/qa/build） | CC |
| `pets/<pet>/` | **正式宠物包（唯一权威，禁止手改）** | 仅 `pet_factory build` |
| `tools/` | 通用查看器与一次性脚本 | CC |
| `tests/` `docs/` `reports/` | 测试 / 文档 / 报告 | CC |
| `releases/{macos,windows}/` | 分发产物 | CC |
| `archive/` | 历史归档（niuniu 遗产等） | CC |

## 常用命令（根目录）
```bash
make test            # 全部测试（Python + 前端）
make lint            # 全部静态检查
make validate-pets   # 校验正式宠物包
make build-pet PET=wangdulan
make build-macos     # 候选 macOS App
make dev             # 开发模式
```

## 分工
- **Codex**：只生成图像素材，写入 `source-assets/<pet>/codex-output/`。
- **CC**：结构、加工、QA、宠物包、引擎、构建。
- **用户**：视觉选择与最终批准（review 勾选后素材方可进 `approved/`）。

## 新增一只宠物
1. `source-assets/<id>/photos/` 放参考照片，写 `identity-reference/CHARACTER.md`；
2. CC 出任务规范 → Codex 出图到 `codex-output/`；
3. QA → 用户批准 → `approved/`；
4. `python3 -m pet_factory slice` 切帧到 `work/<id>/frames/<action>/`；
5. `make build-pet PET=<id>` 组装并校验；
6. `make build-macos` 候选 App 验收。

详见 docs/：PROJECT_STRUCTURE · ARCHITECTURE · PET_PRODUCTION_PIPELINE · TOOL_RESPONSIBILITIES · MACOS_BUILD · WINDOWS_BUILD · MIGRATION_GUIDE
