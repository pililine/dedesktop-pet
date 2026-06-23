# Desktop Pet

Desktop Pet 是一个基于 Tauri 2、原生 TypeScript、HTML、CSS 和 Rust 的独立桌面宠物应用。它不依赖 Codex 运行，可在 Windows 10/11 与 macOS 上构建为普通桌面应用。

当前默认宠物使用仓库原有的“牛牛”素材：

- `pets/default/pet.json`
- `pets/default/spritesheet.webp`

原始 Codex 宠物包 `niuniu/` 与生成/修复资料 `work/` 被保留，没有被应用运行时直接依赖。

## 已实现功能

- 透明、无边框、始终置顶的宠物窗口
- Windows 跳过任务栏图标；macOS 使用 Accessory 激活策略
- Canvas 精灵图播放器，按图片尺寸和 atlas 行列数计算帧尺寸
- `requestAnimationFrame` 驱动动画，支持 Retina/高 DPI
- idle、walkLeft、walkRight、jump、sleep、interaction 状态
- 空闲随机动作、点击互动、双击跳跃、拖动窗口
- 自动行走与当前显示器工作区边缘碰撞
- 右键原生应用菜单与系统托盘菜单
- 宠物大小、置顶、自动移动、开机启动等设置持久化
- 图片或配置错误时的可读错误界面
- TypeScript strict、运行时配置校验、Vitest、ESLint、Prettier
- Windows NSIS、macOS `.app`/`.dmg` 构建配置
- Windows/macOS GitHub Actions 构建工作流

## 目录结构

```text
.
├── pets/default/              # 独立应用使用的宠物资源
├── src/                       # TypeScript 前端
│   ├── animation-player.ts    # Canvas 动画播放器
│   ├── pet-config.ts          # pet.json 解析与运行时校验
│   ├── pet-state-machine.ts   # 宠物状态机
│   └── window-controller.ts   # 前端与 Tauri 命令桥接
├── src-tauri/
│   ├── src/settings.rs        # 设置读取、校验、持久化
│   ├── src/window_ops.rs      # 窗口缩放、移动、边缘约束
│   ├── src/tray.rs            # 托盘与应用菜单
│   └── tauri.conf.json        # 窗口和安装包配置
└── .github/workflows/build.yml
```

## 环境要求

通用：

- Node.js 20 或更新版本（CI 使用 Node.js 22）
- npm
- Rust stable，最低 1.77.2
- Git（建议）

Windows：

- Windows 10 或 Windows 11
- Microsoft C++ Build Tools，安装“使用 C++ 的桌面开发”
- WebView2 Runtime。Windows 11 通常已安装，Windows 10 可从微软安装

macOS：

- macOS 10.15 或更新版本
- Xcode Command Line Tools：`xcode-select --install`

更多系统依赖可参考 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)。

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run tauri dev
```

首次 Rust 构建会下载并编译 Tauri 依赖，耗时通常明显长于之后的增量构建。

仅运行浏览器前端可以执行 `npm run dev`，但窗口、托盘、拖动和持久化命令需要在 Tauri 环境中才能工作。

## 验证命令

```bash
npm run typecheck
npm run test
npm run lint
npm run format:check
```

Rust 侧可额外执行：

```bash
cd src-tauri
cargo test
cargo clippy --all-targets --all-features -- -D warnings
```

## 构建安装包

在当前操作系统构建：

```bash
npm run tauri build
```

建议按平台明确指定产物：

```bash
# Windows
npm run tauri build -- --bundles nsis

# macOS
npm run tauri build -- --bundles app,dmg
```

产物位于：

```text
src-tauri/target/release/bundle/
```

Tauri 不能在普通 macOS 主机上直接生成 Windows 安装包，也不能在普通 Windows 主机上直接生成 macOS 安装包。仓库中的 GitHub Actions 会分别使用 `windows-latest` 和 `macos-14` runner 构建。

工作流触发方式：

- GitHub Actions 页面手动运行
- 推送形如 `v0.1.0` 的 tag

## 放入 Codex Pet 素材

默认宠物必须放在：

```text
pets/default/pet.json
pets/default/spritesheet.webp
```

本仓库已经把原有的 `niuniu/spritesheet.webp` 复制为默认素材。如果要替换为新的 Codex Pet：

1. 备份 `pets/default/`。
2. 用真实文件替换 `pets/default/spritesheet.webp`。
3. 根据真实 atlas 修改 `pets/default/pet.json`。
4. 确认 `spritesheet` 或兼容字段 `spritesheetPath` 指向同目录下的图片。
5. 运行 `npm run test`，再启动 `npm run tauri dev` 进行视觉检查。

应用兼容 Codex 的最小格式：

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "spritesheetPath": "spritesheet.webp"
}
```

最小格式会使用 Codex 标准的 8×9 atlas 和默认行映射。为了避免真实素材版本差异，推荐显式写出 `atlas` 与 `animations`。

## 修改动画行、帧数和速度

所有动画映射集中在 `pets/default/pet.json`：

```json
{
  "atlas": {
    "columns": 8,
    "rows": 9
  },
  "animations": {
    "idle": {
      "row": 0,
      "frames": 6,
      "frameDurationMs": 160,
      "loop": true
    }
  }
}
```

字段含义：

- `row`：从 0 开始的精灵图行号
- `frames`：该动画使用的连续帧数，从第 0 列开始
- `frameDurationMs`：每帧显示时长
- `loop`：是否循环

图片宽度必须能被 `atlas.columns` 整除，图片高度必须能被 `atlas.rows` 整除。`frames` 不能大于列数，`row` 不能超出行数。

当前“牛牛”实际映射是：

| 应用状态    | Codex 行语义  | row | frames |
| ----------- | ------------- | --: | -----: |
| idle        | idle          |   0 |      6 |
| walkRight   | running-right |   1 |      8 |
| walkLeft    | running-left  |   2 |      8 |
| interaction | waving        |   3 |      4 |
| jump        | jumping       |   4 |      5 |
| sleep       | waiting       |   6 |      6 |

配置缺少 jump、sleep、interaction 或行走动画时，状态机会自动回退到 idle。显式提供 `animations` 时必须包含 idle。

## 调整自动行走速度

自动行走的水平速度由 `src/main.ts` 顶部的常量 `MOVEMENT_SPEED_PX_PER_SECOND` 控制（单位为逻辑像素/秒，默认 `48`）。要让宠物走得更快或更慢，只需修改这一个数值。

移动距离基于真实时间差（wall-clock）计算，并设有单帧时间上限 `MAX_MOVEMENT_STEP_MS`，因此速度在 60Hz、90Hz、120Hz 以及更高刷新率的显示器上保持一致，窗口隐藏、系统休眠或拖动结束后也不会产生一次性的跳跃位移。

## 设置存储位置

设置由 Rust 后端写入 Tauri 的应用配置目录，文件名为 `settings.json`。它保存：

- 上次窗口位置
- 宠物缩放比例
- 始终置顶
- 自动移动
- 开机启动
- 上次选择的宠物目录名

具体根目录由操作系统决定，例如 macOS 通常位于用户 Library 的 Application Support 下，Windows 通常位于用户 AppData 下。

## 签名与发布

### Windows

未签名的 NSIS 安装程序可以构建，但下载或运行时可能触发 Microsoft Defender SmartScreen。

#### 内测安装（未签名）

当前内测包**未做代码签名**，请注意：

- 安装包未签名，Windows 会显示发布者为“未知发布者”。
- 首次运行 `.exe` 时 Microsoft Defender SmartScreen 可能拦截。
- 受信任的测试者可点击 **更多信息（More info） → 仍要运行（Run anyway）** 继续。
- 安装为“当前用户”范围，不需要管理员权限。
- 仅建议分发给可信的朋友进行内测，不要公开分发。
- 请勿为了安装而关闭或绕过 Defender / SmartScreen。
- 正式公开发布前建议配置代码签名（见下）。

NSIS 安装包通过 GitHub Actions 的 `windows-latest` runner 构建（macOS 主机无法交叉构建 Windows 安装包）。在 Actions 运行成功后，安装包位于工作流产物（artifact）`desktop-pet-windows-x64-<commit-sha>` 中，文件名形如 `Desktop Pet_0.1.0_x64-setup.exe`。

正式发布通常需要：

- 可信代码签名证书（OV 或 EV）
- 在本机或 CI 中安全配置证书与密码
- 按 Tauri Windows signing 文档配置签名命令或证书变量

详见 [Tauri Windows code signing](https://v2.tauri.app/distribute/sign/windows/)。

### macOS

本地未签名 `.app`/`.dmg` 可以构建，但分发给其他用户时会被 Gatekeeper 警告或阻止。

正式发布通常需要：

- Apple Developer Program 账号
- Developer ID Application 证书
- 对应用签名
- Apple notarization 公证
- 对公证结果 stapling

CI 可使用 GitHub Secrets 保存 Base64 证书、证书密码、Apple ID/App Store Connect 凭据。详见 [Tauri macOS code signing](https://v2.tauri.app/distribute/sign/macos/)。

## 常见问题

### 宠物窗口透明，但图片周围有色块

检查 `spritesheet.webp` 是否真的带 alpha 通道。Canvas 不会自动去除白色、黑色或洋红色背景。

### 启动后显示“宠物加载失败”

优先检查：

- `pets/default/pet.json` 是否是有效 JSON
- `spritesheet.webp` 文件名和大小写是否匹配
- atlas 行列是否能整除图片尺寸
- row 和 frames 是否超出 atlas

### 拖动后触发了互动

实现使用 6 像素移动阈值区分点击和拖动。极慢、极短的拖动仍可能被视为点击，可在 `src/main.ts` 中调整阈值。

### Windows 没有托盘图标

检查 Windows 的“任务栏角落溢出”设置。应用窗口默认不显示普通任务栏按钮。

### macOS 看不到 Dock 图标

这是预期行为。应用使用 Accessory 激活策略，以托盘/菜单栏方式管理。

### 开机启动没有生效

开发模式下的可执行文件路径可能变化。应优先使用安装后的正式构建测试开机启动，并检查操作系统登录项权限。

## 当前已知限制

- 第一阶段只支持单个可见宠物窗口。
- 宠物选择已持久化，但尚无图形化宠物选择器；当前默认目录名为 `default`。
- 自动移动目前只做水平行走。
- 睡眠暂时复用 Codex `waiting` 行，interaction 复用 `waving` 行；可以在 pet.json 中换成更合适的真实动画。
- 浏览器单独预览不具备 Tauri 系统功能。
- Windows 与 macOS 的安装包必须分别在对应平台或对应 CI runner 上验证。
- 签名、公证和证书管理未预置真实密钥。

## 原 Codex Pets 资料

`niuniu/` 仍是可安装到 Codex 的原始自定义宠物包：

- `pet.json`：宠物名称与说明
- `spritesheet.webp`：当前成品精灵图
- `spritesheet-original.webp`：修改前的原始备份

独立 Desktop Pet 应用不读取 Codex 的 `~/.codex/pets/`，也不依赖 Codex 的宠物状态或播放器。
