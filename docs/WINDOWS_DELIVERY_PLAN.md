# Windows 交付计划

## 平台能力矩阵（macOS 现状 vs Windows 预期）

| 能力 | macOS | Windows | 是否需实机验证 |
|---|---|---|---|
| 透明窗口 | ✅ 实机验证 | 预期 OK（CSS 透明 + WebView2；已配 `transparent:true`） | **是** |
| always-on-top | ✅ | 预期 OK | 是 |
| click-through | 未启用（本项目不需要） | 同 | – |
| 拖拽移动 | ✅ | 预期 OK（startDragging 跨平台） | **是** |
| 多显示器 | ✅ work_area 夹取 | 预期 OK（同 Tauri API） | 是 |
| DPI scaling | ✅ | 预期 OK（manifest PerMonitorV2 已确认在 exe 内） | **是（125/150/200%）** |
| 托盘 | ✅ | 预期 OK（tray-icon + .ico 已就绪） | **是** |
| 开机启动 | ✅ LaunchAgent | 预期 OK（autostart 插件走注册表，当前用户免管理员） | **是（enable/disable/is_enabled）** |
| 窗口位置持久化 | ✅ | 预期 OK（%APPDATA% via app_config_dir） | 是 |
| 动画渲染 | ✅ 60fps 余量大 | 预期 OK（同 Canvas） | 是 |
| WebView | WKWebView | WebView2（downloadBootstrapper 已配） | **是（含无 WebView2 机器）** |
| 安装包 | .app/.dmg | NSIS .exe（CI 已产出） | – |
| 代码签名 | 未签（Gatekeeper 警告） | 未签（SmartScreen） | Phase 3 |
| 自动更新 | 未做 | 未做 | Phase 3 |
| 卸载 | 拖入废纸篓 | NSIS 卸载器 | **是** |
| 日志位置 | Console / stderr | %APPDATA% / stderr | 是 |

## 分阶段方案

- **Phase 0（已达成）**：CI 编译通过；未签名 NSIS 测试包产出并校验（PE32/NSIS、asInvoker、约 3.7MB）；WebView2 策略=downloadBootstrapper。
- **Phase 1（实机 MVP）**：Windows 11 实机/VM 验证透明窗口、DPI 三档、拖拽、托盘、开机启动 enable/disable/is_enabled、位置持久化。**全部必须实机**。
- **Phase 2（安装生命周期）**：NSIS 静默安装/卸载冒烟（可 CI 化）、图标各尺寸、覆盖安装/升级、Defender 误报检查（需实机/VM）。
- **Phase 3（正式发布）**：代码签名（OV/EV 证书，用户提供）、自动更新、release manifest 标 verified。

## 分工
- **仅 CI 可完成**：编译、NSIS 打包、静态校验（PE/大小/签名状态）、安装+启动+存活+卸载的**无 UI 冒烟**（PowerShell 脚本 + 超时）。
- **必须实机/VM**：一切透明窗口/DPI/托盘/拖拽/自启动的**行为与观感**验证、Defender 交互、升级体验。
- **建议**：继续用 GitHub Actions windows-latest 做构建与冒烟；**需要一台 Windows 11 实机或 VM** 做 Phase 1 行为验证（这是 Windows 正式化的硬门槛，不能只靠 CI）。
