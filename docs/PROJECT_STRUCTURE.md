# 项目结构（唯一主项目）

本仓库是 Desktop Pet 的唯一活动主项目。外部 Codex 项目目录已停用（只读遗产）。

## 当前结构 ↔ 目标结构映射

| 目标模板                          | 本项目实际                                              | 说明                                                     |
| --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| apps/desktop-pet/                 | 仓库根（apps/desktop-pet/（已迁移完成））    | 应用即仓库根；迁入 apps/ 属高风险大搬迁，暂缓            |
| pet_factory/                      | tools/                                                  | compose-atlas / slice-strip / paths / preview 等加工工具 |
| schemas/                          | src/pet-config.ts（运行时校验即 schema）                | 独立 JSON Schema 后续再抽                                |
| source-assets/<pet>/              | source-assets/{niuniu,wangdulan}/                       | 本轮新建；Codex 素材生产区                               |
| work/<pet>/                       | work/wangdulan/（walk16 已迁入）；work/niuniu-\* 为遗产 | 加工中间产物                                             |
| pets/<pet>/                       | pets/{default,wangdulan}/                               | 正式宠物包（构建产物，禁止手改）                         |
| docs/ reports/ releases/ archive/ | 本轮新建                                                | 文档/报告/发行/归档                                      |

## 本轮迁移 / 暂缓

- 已迁移：外部 desktop-pet/assets → source-assets/wangdulan/codex-output/（复制，非剪切）
- 已迁移：walk16 试点 → work/wangdulan/walk16/（旧 work/wangdulan-walk16-trial/ 保留为历史）
- 暂缓（高风险）：仓库根迁入 apps/、tools/ 更名 pet_factory/、niuniu 遗产全量迁移、CodexPets 归档删除

## 宠物包平台无关性

pets/<pet>/ 只含 pet.json + spritesheet.webp（+可选 preview）。macOS 与 Windows
构建共用同一份宠物包（经 vite 复制进 dist 后由 Tauri 嵌入），发行产物分平台放 releases/{macos,windows}/。
