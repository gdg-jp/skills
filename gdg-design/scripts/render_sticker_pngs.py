#!/usr/bin/env python3
"""Render individual sticker SVGs to transparent long-edge PNGs."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path


def view_box_size(path: Path) -> tuple[float, float]:
    root = ET.parse(path).getroot()
    view_box = root.get("viewBox")
    if not view_box:
        raise SystemExit(f"SVG has no viewBox: {path}")
    _, _, width, height = (float(part) for part in view_box.split())
    if width <= 0 or height <= 0:
        raise SystemExit(f"SVG has an invalid viewBox: {path}")
    return width, height


def render(input_dir: Path, output_dir: Path, *, size: int, force: bool) -> None:
    if shutil.which("rsvg-convert") is None:
        raise SystemExit("Required command not found: rsvg-convert")
    sources = sorted(input_dir.glob("*.svg"))
    if not sources:
        raise SystemExit(f"No SVG files found in {input_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    for source in sources:
        destination = output_dir / f"{source.stem}.png"
        if destination.exists() and not force:
            raise SystemExit(f"Refusing to overwrite {destination}; pass --force to replace")

        width, height = view_box_size(source)
        dimension = "-w" if width >= height else "-h"
        subprocess.run(
            [
                "rsvg-convert",
                dimension,
                str(size),
                str(source),
                "-o",
                str(destination),
            ],
            check=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if args.size <= 0:
        parser.error("--size must be positive")
    render(args.input_dir, args.output_dir, size=args.size, force=args.force)


if __name__ == "__main__":
    main()
