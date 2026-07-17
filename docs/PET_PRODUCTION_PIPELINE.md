# 宠物生产链路（标准）

photos → identity-reference → CC 出动作任务规范（work/<pet>/…/tasks/）
→ Codex 写 source-assets/<pet>/codex-output/
→ CC 基础 QA（格式/尺寸/量化区间）→ raw 升 candidate
→ 用户在 review 页选择 → approved/（或 rejected/）
→ CC 拆帧/抠图/对齐 → work/<pet>/frames/ → tools/compose-atlas.py
→ 运行时校验（parsePetConfig）+ 整除校验
→ 候选 App（tauri build，不覆盖 /Applications）→ 实机验收 → 正式发布（releases/）

不得绕过：人工视觉批准、标准校验、候选安装验证、正式 promote。
当前活跃任务：walkRight 8→16（任务包 work/wangdulan/walk16/tasks/，
Codex 输出 source-assets/wangdulan/codex-output/walkRight/inbetweens/I0x/）。
