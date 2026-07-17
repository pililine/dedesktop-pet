#!/usr/bin/env python3
"""Standard validation for a pet package (pet.json + spritesheet.webp).

Mirrors the runtime rules in apps/desktop-pet/src/pet-config.ts so packages
can be checked without Node. `python3 -m pet_factory validate <petId|dir>`.
Returns a list of problems; empty list == valid.
"""
import json
import os

from PIL import Image

from pet_factory import paths


def validate_package(target: str) -> list[str]:
    root = target if os.path.isdir(target) else str(paths.pets(target))
    problems: list[str] = []
    pj = os.path.join(root, "pet.json")
    sheet_path = None

    if not os.path.exists(pj):
        return [f"missing pet.json: {pj}"]
    try:
        cfg = json.load(open(pj, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"pet.json 不是有效 JSON: {e}"]

    if not isinstance(cfg, dict):
        return ["pet.json 顶层必须是对象"]

    sheet_rel = cfg.get("spritesheet", "spritesheet.webp")
    if not isinstance(sheet_rel, str) or not sheet_rel.strip():
        problems.append("spritesheet 必须是非空字符串")
    else:
        norm = sheet_rel.replace("\\", "/")
        if norm.startswith("/") or ".." in norm.split("/") or ":" in norm.split("/")[0]:
            problems.append(f"spritesheet 路径不安全: {sheet_rel}")
        sheet_path = os.path.join(root, sheet_rel)

    atlas = cfg.get("atlas", {})
    cols, rows = atlas.get("columns"), atlas.get("rows")
    if not (isinstance(cols, int) and cols > 0 and isinstance(rows, int) and rows > 0):
        problems.append("atlas.columns/rows 必须是正整数")
        cols = rows = None

    scale = cfg.get("defaultScale", 1)
    if not (isinstance(scale, (int, float)) and 0.25 <= scale <= 4):
        problems.append("defaultScale 必须在 0.25 到 4 之间")

    anims = cfg.get("animations")
    if not isinstance(anims, dict) or not anims:
        problems.append("animations 必须是非空对象")
        anims = {}
    if "idle" not in anims:
        problems.append('必须配置 "idle" 动画')

    for name, a in anims.items():
        if not isinstance(a, dict):
            problems.append(f"动画 {name} 必须是对象")
            continue
        row, fr, dur, loop = a.get("row"), a.get("frames"), a.get("frameDurationMs"), a.get("loop")
        if rows is not None and not (isinstance(row, int) and 0 <= row < rows):
            problems.append(f"动画 {name} 的 row 越界: {row} (rows={rows})")
        if cols is not None and not (isinstance(fr, int) and 1 <= fr <= cols):
            problems.append(f"动画 {name} 的 frames 越界: {fr} (columns={cols})")
        if not (isinstance(dur, (int, float)) and dur >= 16):
            problems.append(f"动画 {name} 的 frameDurationMs 必须 >= 16")
        if not isinstance(loop, bool):
            problems.append(f"动画 {name} 的 loop 必须是布尔值")
        if "pingPong" in a and not isinstance(a["pingPong"], bool):
            problems.append(f"动画 {name} 的 pingPong 必须是布尔值")

    if sheet_path and os.path.exists(sheet_path):
        im = Image.open(sheet_path)
        if im.mode not in ("RGBA", "LA", "PA"):
            problems.append(f"spritesheet 缺少 alpha 通道: mode={im.mode}")
        if cols and rows:
            if im.size[0] % cols != 0 or im.size[1] % rows != 0:
                problems.append(f"图集 {im.size} 无法被 {cols}x{rows} 整除")
    elif sheet_path:
        problems.append(f"spritesheet 文件缺失: {sheet_path}")

    return problems
