#!/usr/bin/env python3
"""Prepare the existing Niuniu atlas for a three-row animation repair."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


CELL_WIDTH = 192
CELL_HEIGHT = 208
ROWS = [
    ("idle", 0, 6),
    ("running-right", 1, 8),
    ("running-left", 2, 8),
    ("waving", 3, 4),
    ("jumping", 4, 5),
    ("failed", 5, 8),
    ("waiting", 6, 6),
    ("running", 7, 6),
    ("review", 8, 6),
]


def clear_transparent_rgb(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = bytearray(rgba.tobytes())
    for index in range(0, len(pixels), 4):
        if pixels[index + 3] == 0:
            pixels[index : index + 3] = b"\x00\x00\x00"
    return Image.frombytes("RGBA", rgba.size, bytes(pixels))


def main() -> None:
    run_dir = Path(__file__).resolve().parent
    workspace = run_dir.parents[1]
    source_path = workspace / "niuniu" / "spritesheet-original.webp"

    with Image.open(source_path) as source:
        atlas = source.convert("RGBA")

    if atlas.size != (1536, 1872):
        raise SystemExit(f"Unexpected source atlas size: {atlas.size}")

    canonical = atlas.crop((0, 0, CELL_WIDTH, CELL_HEIGHT))
    canonical = clear_transparent_rgb(canonical)
    canonical.save(run_dir / "references" / "canonical-base.png")

    frames_root = run_dir / "frames"
    for state, row, frame_count in ROWS:
        state_dir = frames_root / state
        state_dir.mkdir(parents=True, exist_ok=True)
        for column in range(frame_count):
            left = column * CELL_WIDTH
            top = row * CELL_HEIGHT
            frame = atlas.crop(
                (left, top, left + CELL_WIDTH, top + CELL_HEIGHT)
            )
            frame = clear_transparent_rgb(frame)
            frame.save(state_dir / f"{column:02d}.png")

    print(f"Prepared canonical reference and frames under {run_dir}")


if __name__ == "__main__":
    main()
