# macOS 构建
```bash
make build-macos          # 候选 .app（不覆盖 /Applications）
cd apps/desktop-pet && npm run tauri build -- --bundles dmg   # DMG
```
产物：apps/desktop-pet/src-tauri/target/release/bundle/{macos,dmg}/
验收后手动复制到 /Applications 或移入 releases/macos/。未签名：Gatekeeper 需右键打开。
本地工具链在根 .tools/（Makefile 已注入 PATH）。
