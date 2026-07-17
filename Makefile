# Desktop Pet Factory — 根目录统一入口
# 本地工具链（node/cargo）位于 .tools/；系统已装同名工具亦可。
ROOT    := $(shell pwd)
APP     := apps/desktop-pet
PY      := /opt/homebrew/bin/python3
export PATH := $(ROOT)/.tools/node/bin:$(ROOT)/.tools/cargo/bin:$(PATH)
export RUSTUP_HOME := $(ROOT)/.tools/rustup
export CARGO_HOME  := $(ROOT)/.tools/cargo

.PHONY: help test py-test lint format build-macos validate-pets preview build-pet dev

help:
	@echo "make test           # 前端 + Python 全部测试"
	@echo "make lint           # eslint + clippy"
	@echo "make build-macos    # 候选 macOS App（不覆盖 /Applications）"
	@echo "make validate-pets  # 校验全部正式宠物包"
	@echo "make build-pet PET=wangdulan   # 从 work/<pet>/frames 组装正式包"
	@echo "make preview        # 素材预览页（http://localhost:8080/tools/pet-preview.html）"
	@echo "make dev            # 应用开发模式"

test: py-test
	cd $(APP) && npm run typecheck && npm run test

py-test:
	$(PY) -m unittest discover -s tests -t . -q

lint:
	cd $(APP) && npm run lint && npm run format:check
	cd $(APP)/src-tauri && cargo fmt --check && cargo clippy -- -D warnings

build-macos:
	cd $(APP) && npm run tauri build -- --bundles app
	@echo "候选 App: $(APP)/src-tauri/target/release/bundle/macos/Desktop Pet.app"

validate-pets:
	@for p in pets/*/; do $(PY) -m pet_factory validate $$(basename $$p); done

build-pet:
	$(PY) -m pet_factory build $(PET)

preview:
	$(PY) -m http.server 8080

dev:
	cd $(APP) && npm run tauri dev
