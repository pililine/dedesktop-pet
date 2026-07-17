# ADR-0005 源格式与发行格式分离

## Context
生产侧天然按"每动作横条/每帧 PNG"工作（Codex 输出、QA、补帧都以帧为单位）；
运行侧需要单张 atlas（Canvas 一次加载、行列寻址简单高效，已验证 60fps 余量巨大）。
walk16 将出现 16 帧动作，与 8 帧动作共存时 atlas 列数=最大帧数，空槽为透明浪费（可接受）。

## Decision
源格式＝source-assets 条图 + work/<pet>/frames/<action>/NN.png（真源）；
发行格式＝固定网格 atlas + pet.json（由 pet_factory build 确定性生成）。
两者永不混淆；引擎只认发行格式。制作阶段帧数不受发行格式限制，build 时统一打包。

## Alternatives considered
- 运行时逐帧加载（方案 C）：IO/解码碎片化，无收益。
- 纹理 atlas+任意坐标 manifest（方案 D）：灵活但引擎/QA/工具全链复杂化，当前规模不值得。

## Consequences
+ 单帧修改=替换 frames 里一张 PNG + 重建，确定性保留。
+ 旧宠物包天然兼容（发行格式不变）。
− 大动作集下 atlas 变大：16 列时约 3072px 宽，仍远低于纹理上限；超过阈值时再评估方案 D。

## Status
Accepted（升级触发条件写入 ARCHITECTURE_V2 §格式演进）
