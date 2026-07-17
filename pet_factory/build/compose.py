#!/usr/bin/env python3
"""Compose a pet's spritesheet atlas from per-action frames.

Reads   <frames_dir>/<action>/00.png, 01.png, ...   (default work/<pet>/frames)
Writes  <out_dir>/spritesheet.webp + updates <out_dir>/pet.json
        (default pets/<pet> — the official package; pass out_dir for candidates)

Library:  from pet_factory.build.compose import compose_atlas
CLI:      python3 -m pet_factory build <petId> [--frames DIR] [--out DIR]
"""
import glob
import json
import os

from PIL import Image

from pet_factory import paths

# Canonical animation semantics understood by the app's state machine.
# name -> (loop, frameDurationMs)
ANIM_DEFAULTS = {
    "idle": (True, 160),
    "walkRight": (True, 100),
    "walkLeft": (True, 100),
    "interaction": (False, 120),
    "jump": (False, 100),
    "wave": (False, 400),
    "groom": (False, 400),
    "sleep": (True, 250),
    "lieDown": (False, 300),
    "sleepDeep": (True, 400),
    "turnBack": (False, 300),
    "backRest": (True, 400),
    "wakeFront": (False, 300),
    "working": (True, 140),
    "review": (True, 180),
    "computerIdle": (True, 160),
}
ROW_ORDER = list(ANIM_DEFAULTS.keys())


def compose_atlas(pet_id: str, frames_dir: str | None = None, out_dir: str | None = None) -> dict:
    src = frames_dir or str(paths.frames(pet_id))
    root = out_dir or str(paths.pets(pet_id))
    if not os.path.isdir(src):
        raise FileNotFoundError(f"frames dir missing: {src}")

    actions = [d for d in os.listdir(src) if os.path.isdir(os.path.join(src, d))]
    if "idle" not in actions:
        raise ValueError("an 'idle' action is required (pets need a fallback animation)")
    actions.sort(key=lambda a: (ROW_ORDER.index(a) if a in ROW_ORDER else len(ROW_ORDER), a))

    frames_by_action: dict[str, list[Image.Image]] = {}
    fw = fh = None
    for a in actions:
        files = sorted(glob.glob(os.path.join(src, a, "*.png")))
        if not files:
            raise ValueError(f"action '{a}' has no PNG frames")
        imgs = [Image.open(f).convert("RGBA") for f in files]
        for im in imgs:
            if fw is None:
                fw, fh = im.size
            elif im.size != (fw, fh):
                raise ValueError(f"frame size mismatch in '{a}': {im.size} != {(fw, fh)}")
        frames_by_action[a] = imgs

    cols = max(len(v) for v in frames_by_action.values())
    rows = len(actions)
    sheet = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
    animations: dict[str, dict] = {}
    for ri, a in enumerate(actions):
        imgs = frames_by_action[a]
        for ci, im in enumerate(imgs):
            sheet.paste(im, (ci * fw, ri * fh))
        loop, dur = ANIM_DEFAULTS.get(a, (True, 150))
        animations[a] = {"row": ri, "frames": len(imgs), "frameDurationMs": dur, "loop": loop}

    os.makedirs(root, exist_ok=True)
    sheet.save(os.path.join(root, "spritesheet.webp"), "WEBP", lossless=True, quality=100, method=6)

    pj_path = os.path.join(root, "pet.json")
    pet: dict = {}
    if os.path.exists(pj_path):
        pet = json.load(open(pj_path, encoding="utf-8"))
    pet.setdefault("id", pet_id)
    pet.setdefault("displayName", pet_id)
    pet["spritesheet"] = "spritesheet.webp"
    pet["atlas"] = {"columns": cols, "rows": rows}
    pet.setdefault("defaultScale", 1)
    # 保留既有动画的手工微调（pingPong/时长），仅更新结构字段
    old_anims = pet.get("animations", {})
    for name, spec in animations.items():
        if name in old_anims:
            merged = dict(old_anims[name])
            merged.update({"row": spec["row"], "frames": spec["frames"]})
            merged.setdefault("frameDurationMs", spec["frameDurationMs"])
            merged.setdefault("loop", spec["loop"])
            animations[name] = merged
    pet["animations"] = animations
    with open(pj_path, "w", encoding="utf-8") as f:
        json.dump(pet, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return {"sheet": sheet.size, "rows": rows, "cols": cols, "frame": (fw, fh), "out": root}
