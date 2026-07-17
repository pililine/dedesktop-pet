# 职责与目录所有权

| 角色  | 职责                          | 可写目录                                                                                                                  |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Codex | 只生成宠物图像素材            | source-assets/<pet>/codex-output/（含 generation-notes）                                                                  |
| CC    | 结构/加工/QA/宠物包/引擎/构建 | apps(=根)、tools/、docs/、work/、pets/、reports/、releases/、archive/、source-assets/<pet>/{approved,rejected,manifests}/ |
| 用户  | 视觉选择与最终批准            | review 勾选、验收决定                                                                                                     |

硬规则：

- Codex 不得改：src/、src-tauri/、tools/、pets/、releases/、正式 atlas、正式 pet.json。
- pets/<pet>/ 不得由 Codex 或人工直接编辑，只能由工具从 approved 素材构建。
- 素材状态机：raw → candidate（过基础格式检查）→ approved（仅用户明确批准）/ rejected。
  自动 QA 通过≠approved；approved 必须带 source hash、action、frame order、批准来源。
- 所有工具经 tools/paths.py 解析路径；禁止写死用户绝对路径；禁止跨外部项目读素材。

## 王杜兰 walk16 补充（2026-07-08）

Codex:

- 图像美术生产端。
- 读取 CC 提供的任务包和身份基准。
- 生成候选图像与 generation notes。
- 正常生产只写 `source-assets/<pet>/codex-output/`。
- 不审批、不加工正式包、不构建应用、不修改 atlas、不修改 `pet.json`。

CC:

- 工程和生产线负责人。
- 生成任务包、测量、QA、评审页和 approved 状态管理。
- 负责抠图、切帧、对齐、组装、`pet.json`、atlas、macOS/Windows 构建、测试、安装与回滚。

用户:

- 视觉总监。
- 选择候选、批准动作、批准候选安装、批准正式发布。

For walk16, Codex only produces the requested in-between candidates; CC performs measurement and QA; the user makes the final visual selection.

