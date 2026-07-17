# 2026-07-08 项目级重构迁移记录与回滚

## 移动映射
| 旧 | 新 |
|---|---|
| 根 src/ src-tauri/ index.html vite/ts/eslint/prettier 配置 package(-lock).json node_modules dist | apps/desktop-pet/ 同名 |
| tools/slice-strip.py | pet_factory/processing/slice.py（模块化） |
| tools/compose-atlas.py | pet_factory/build/compose.py（模块化+保留调优字段） |
| tools/paths.py | pet_factory/paths.py（增强） |
| tools/make-wangdulan-placeholder.py | work/wangdulan/tools/ |
| pets/wangdulan/source-frames/ | work/wangdulan/frames/ |
| 根 niuniu/ | archive/niuniu-legacy/pack/ |
| work/niuniu-{generation,repair}/ | archive/niuniu-legacy/work-history/ |
| pets/default/spritesheet-9row-backup.webp | archive/niuniu-legacy/ |
| 根 README.md | apps/desktop-pet/README.md（根新写工厂 README） |

## 路径修复
vite.config.ts petsDirectory=../../pets；pet-config.test.ts ../pets→../../../pets；
.gitignore src-tauri 路径规则前缀 apps/desktop-pet/；CI 全部 working-directory/projectPath/缓存/产物路径。

## 命令变化
`python3 tools/compose-atlas.py X` → `python3 -m pet_factory build X`
`python3 tools/slice-strip.py A B` → `python3 -m pet_factory slice A B`

## 回滚
未提交 git；`git status` 可见全部改名/修改。整体回滚：`git checkout -- . && git clean -fd`（会清除未跟踪新目录，先备份 source-assets 与 reports）。单项回滚按上表逆向 mv 并还原四个路径修复点。
注意：cargo target 因绝对路径缓存已 clean 过，回滚后首次构建为冷编译。

## 根目录改名（未执行，单独批准后做）
当前根名 `desktpo-pet` 为拼写错误。建议改 `desktop-pet-factory`。
影响：.tools/cargo/env 与 env.tcsh 内嵌当前绝对路径（改名后需重生成或改写）；iCloud 同步会全量重索引；git 远程不受影响。与结构重构解耦，留待单独一轮。
