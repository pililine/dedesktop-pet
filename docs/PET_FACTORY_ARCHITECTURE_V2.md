# Pet Factory 架构 V2（规划）

## 1. Engine 与 Factory 边界（硬约束）

| Engine（apps/desktop-pet） | Factory（pet_factory） |
|---|---|
| 读宠物包、图集播放、状态机、移动、窗口/托盘、平台适配、设置、（未来）自动更新 | 项目创建、素材状态、QA、manifest、atlas、pet.json、build、staging、promote/rollback、release 元数据 |

禁止入 Engine：任何单只宠物的专属逻辑（动作 row、FPS、渲染特例）。宠物差异一律由 pet.json 表达；
无法表达时先提 schema 演进案，绝不写 `if (petId === "wangdulan")`。
现状核查：引擎动画词表（idle/walk*/jump/sleep/interaction/wave/groom/lieDown/sleepDeep/turnBack/backRest/wakeFront/working/review）
是**语义词表**而非宠物专属——两只宠物各实现子集，缺失自动降级，符合边界。**已满足零专属逻辑。**

## 2. 版本体系

`pets/<id>/pet.json` 增补字段（schema 演进时落地，本轮不改代码）：

```json
"packageVersion": "1.0.0",
"schemaVersion":  "0.1.0",
"assetRevision":  "base-r1",
"minEngineVersion": "0.1.0",
"platforms": { "macos": "verified", "windows": "pending-verification" },
"build": { "sourceManifestSha": "…", "atlasSha": "…" }
```

| 变更 | packageVersion | assetRevision | schemaVersion | app(engine)Version |
|---|---|---|---|---|
| 改一帧图片 | patch | ✓ 新代号 | – | – |
| 改动作时长 / pingPong | patch | – | – | – |
| 增删动作（结构内） | minor | ✓ | – | – |
| pet.json 新字段语义 | – | – | ✓ minor | 需支持则同步 app |
| 改引擎行为 | – | – | – | app version |
| Windows 兼容性修复 | –（引擎侧包不变） | – | – | app patch |

规则：assetRevision 用人读代号（`walk16-r2`）；build.*Sha 由 build 自动写，作为确定性与防篡改锚。

## 3. 存储治理

| 类别 | 内容 | 策略 |
|---|---|---|
| **永久** | photos、identity-reference、approved/*+APPROVED.json、pets/ 版本备份、releases+manifests、构建/发布报告、必要 generation-notes | 入 Git；额外仓库外备份 |
| **阶段清理**（生产周期后） | 未批准候选、onion/预览/contact-sheet、临时 atlas、debug 构建、重复导出、rejected 实体 | 保留 manifest 记录，实体可清 |
| **随时可重建，不保存** | dist、node_modules、target、QA 派生图、临时 GIF | .gitignore；不备份 |

- 清理命令（未来）：`pet_factory clean <pet> --tier candidates|derived [--dry-run]`。**默认 dry-run**；实删要求二次确认；
  被 APPROVED.json / lifecycle.json / release manifest 引用的哈希**拒绝删除**（引用保护）。
- 保留期限：候选/派生图默认保留至该宠物 released 后 30 天；rejected 实体保留至下一次 clean。approved/photos 永不自动清。
- Git LFS：当 `source-assets/` 超 ~200MB 时对 png/webp 启用；当前约 30MB，**暂不需要**。
- 不进 Git：dist、node_modules、target、.tools、*.app/*.dmg/*.exe。
- 必须外部备份：photos、identity、approved、APPROVED.json（现有 iCloud + GitHub 远程即双份；CHARACTER.md 曾丢失是教训）。

## 4. 动作格式演进（结论：维持 ADR-0005 方案 A）

当前：源=条图/帧 PNG（work/<pet>/frames），发行=固定网格 atlas + pet.json（build 确定性生成）。
- **是否同时支持 source/dist 两格式**：是，已经是——两层分离本身就是答案。
- **制作 16 帧、发行重打包**：支持——frames 天然允许每动作不同帧数，build 时列数取最大值，空槽透明。
- **旧包兼容**：发行格式不变，旧包零改可用。
- **升级触发条件**（满足其一再评估方案 D：atlas+坐标 manifest）：单宠物 >24 行 或 atlas 边长 >8192px；需要非等宽帧（特写/大动作）；需要运行时按需加载动作。

## 5. 发布与回滚

```text
work/<pet>/build(candidate) → test package(validate) → test app(启动冒烟) → 用户实机验收
→ promote：①备份 pets/<pet> → releases/manifests/backups/<pet>/<ts>/  ②写入 pets/  ③validate（失败自动还原）
→ release：产物入 releases/{macos,windows}/<pet>-<ver>/，manifest 记录双平台验证等级+包哈希+engine 版本
→ rollback <ver>：从备份还原并重跑 validate
```
规则：promote 必先备份（不覆盖唯一历史）；release manifest 是恢复任意版本的索引；
macOS 实机过而 Windows 仅 CI → manifest 标 `windows: pending-verification`，**不得标全平台 released**。
```text
releases/
├── macos/<pet>-<ver>/{Desktop Pet.app 或 .dmg}
├── windows/<pet>-<ver>/*.exe
└── manifests/<pet>-<ver>.json   # 双平台验证等级、哈希、engine 版本、backup 指针
```
