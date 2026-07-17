# Windows 构建
本机（macOS）不能交叉构建。两条路：
1. **GitHub Actions**（已配 `.github/workflows/build.yml`，projectPath=apps/desktop-pet）：
   workflow_dispatch 或 v* tag → artifact `desktop-pet-windows-x64-<sha>`（NSIS .exe）。
2. Windows 真机：`cd apps/desktop-pet && npm ci && npm run tauri build -- --bundles nsis`。
宠物包平台无关，Windows 构建不改 pets/。产物入 releases/windows/。未签名 → SmartScreen「更多信息→仍要运行」。
