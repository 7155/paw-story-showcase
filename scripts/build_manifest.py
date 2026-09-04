#!/usr/bin/env python3
"""Write the deterministic SHA-256 inventory for public Showcase files."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "manifest/source-files.sha256"
EXCLUDED_PARTS = {
    ".git",
    ".impeccable",
    ".playwright-cli",
    ".sites-runtime",
    ".wrangler",
    "__pycache__",
    "node_modules",
    "dist",
    "output",
    "test-results",
    "playwright-report",
}

# macOS Finder metadata churns outside the source tree's control.
EXCLUDED_NAMES = {".DS_Store", "tsconfig.tsbuildinfo"}
EXCLUDED_SUFFIXES = {".zip"}
PRIVATE_LOCAL_PREFIXES = {
    ("docs",),
    ("paw-story-demo", "docs"),
}
PRIVATE_ROOT_NAMES = {"AGENTS.md"}


def is_private_local_path(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    parts = relative.parts
    if relative.as_posix() in PRIVATE_ROOT_NAMES:
        return True
    if (
        len(parts) == 2
        and parts[0] == "paw-story-demo"
        and relative.suffix.lower() == ".md"
        and parts[1] != "README.md"
    ):
        return True
    return any(parts[:len(prefix)] == prefix for prefix in PRIVATE_LOCAL_PREFIXES)


def included_files() -> list[Path]:
    return sorted(
        path for path in ROOT.rglob("*")
        if path.is_file()
        and path != TARGET
        and path.name not in EXCLUDED_NAMES
        and path.suffix.lower() not in EXCLUDED_SUFFIXES
        and not any(part in EXCLUDED_PARTS for part in path.relative_to(ROOT).parts)
        and not is_private_local_path(path)
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
