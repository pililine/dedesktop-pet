#!/usr/bin/env python3
"""Slice a horizontal animation strip into per-frame PNGs.

Frames are cleaned so fully transparent pixels carry no residual RGB.
Library use:  from pet_factory.processing.slice import slice_strip
CLI use:      python3 -m pet_factory slice <strip.png> <destDir> [frames]
"""
import os

from PIL import Image


def clean_alpha(img: Image.Image) -> Image.Image:
    r, g, b, a = img.split()
    mask = a.point(lambda v: 255 if v > 0 else 0)
    black = Image.new("L", img.size, 0)
    return Image.merge(
        "RGBA",
        (
            Image.composite(r, black, mask),
            Image.composite(g, black, mask),
            Image.composite(b, black, mask),
            a,
        ),
    )


def slice_strip(strip_path: str, dest_dir: str, frames: int = 8) -> int:
    strip = Image.open(strip_path).convert("RGBA")
    w, h = strip.size
    if w % frames != 0:
        raise ValueError(f"strip width {w} is not divisible by {frames}")
    fw = w // frames

    os.makedirs(dest_dir, exist_ok=True)
    for i in range(frames):
        frame = clean_alpha(strip.crop((i * fw, 0, (i + 1) * fw, h)))
        frame.save(os.path.join(dest_dir, f"{i:02d}.png"))
    return frames
