#!/usr/bin/env python3
"""Write the deterministic SHA-256 inventory for public Showcase files."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "manifest/source-files.sha256"
EXCLUDED_PARTS = {
    ".git",
    "__pycache__",
    "node_modules",
    "dist",
    "output",
    "test-results",
    "playwright-report",
}


def included_files() -> list[Path]:
    return sorted(
        path for path in ROOT.rglob("*")
        if path.is_file()
        and path != TARGET
        and not any(part in EXCLUDED_PARTS for part in path.relative_to(ROOT).parts)
    )


def main() -> None:
    lines = [
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(ROOT).as_posix()}\n"
        for path in included_files()
    ]
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text("".join(lines), encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)} ({len(lines)} files)")


if __name__ == "__main__":
    main()
