#!/usr/bin/env python3
"""Validate the public PAWOS Showcase boundary and source map."""

from __future__ import annotations

import json
import hashlib
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "control-center-web"
UPSTREAM = ROOT / "UPSTREAM.json"
SCENARIOS = ROOT / "showcase/scenarios.v1.json"
FILE_MANIFEST = ROOT / "manifest/source-files.sha256"
REGISTRY = WEB / "src/features/paw-os/model/app-registry.ts"
EXPECTED_APP_COUNT = 11
TEXT_SUFFIXES = {".css", ".html", ".js", ".json", ".md", ".mjs", ".py", ".ts", ".tsx", ".txt"}
SECRET_PATTERNS = {
    "GitHub token": re.compile(r"(?:ghp|gho|github_pat)_[A-Za-z0-9_]{20,}"),
    "OpenAI-style secret": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"),
    "private key": re.compile(r"BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY"),
    "personal macOS home": re.compile(r"/Users/(?!example/|preview/)[^/\s]+/"),
    "machine-specific volume": re.compile(r"/Volumes/(?!work/)[^/\s]+/"),
}
FORBIDDEN_PARTS = {".git", "__pycache__", "node_modules", "dist", "output", "test-results", "playwright-report"}


def load_object(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def registry_ids() -> list[str]:
    source = REGISTRY.read_text(encoding="utf-8")
    registry = source.split("export const pawOsAppRegistry", 1)[1]
    registry = registry.split("export const primaryDockAppIds", 1)[0]
    return re.findall(r"\bid:\s*'([^']+)'", registry)


def snapshot_files() -> list[Path]:
    return sorted(
        path for path in ROOT.rglob("*")
        if path.is_file()
        and path != FILE_MANIFEST
        and not any(part in FORBIDDEN_PARTS for part in path.relative_to(ROOT).parts)
    )


def expected_manifest() -> str:
    return "".join(
        f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(ROOT).as_posix()}\n"
        for path in snapshot_files()
    )


def main() -> int:
    errors: list[str] = []
    upstream = load_object(UPSTREAM)
    scenarios = load_object(SCENARIOS)

    source_commit = upstream.get("sourceCommit")
    if not isinstance(source_commit, str) or not re.fullmatch(r"[0-9a-f]{40}", source_commit):
        errors.append("UPSTREAM.json must pin a full source commit")
    if upstream.get("authority") != "derivative-showcase-not-product-source":
        errors.append("UPSTREAM.json must preserve the derivative authority boundary")
    if scenarios.get("dataMode") != "synthetic-preview-only":
        errors.append("scenario dataMode must be synthetic-preview-only")

    expected_ids = registry_ids()
    apps = scenarios.get("apps")
    if not isinstance(apps, list):
        apps = []
        errors.append("scenario apps must be a list")
    scenario_ids = [item.get("id") for item in apps if isinstance(item, dict)]
    if len(expected_ids) != EXPECTED_APP_COUNT:
        errors.append(f"registry exposes {len(expected_ids)} Apps, expected {EXPECTED_APP_COUNT}")
    if scenario_ids != expected_ids:
        errors.append(f"scenario App order differs from registry: {scenario_ids!r} != {expected_ids!r}")

    for item in apps:
        if not isinstance(item, dict):
            continue
        app_id = item.get("id", "<missing>")
        if item.get("claim") == "live":
            errors.append(f"{app_id}: public Showcase cannot claim live Runtime data")
        for key in ("renderOwner",):
            value = item.get(key)
            if not isinstance(value, str) or not (ROOT / value).is_file():
                errors.append(f"{app_id}: missing {key} {value!r}")
        sources = item.get("scenarioSources")
        if not isinstance(sources, list) or not sources:
            errors.append(f"{app_id}: scenarioSources must be non-empty")
        else:
            for source in sources:
                if not isinstance(source, str) or not (ROOT / source).is_file():
                    errors.append(f"{app_id}: missing scenario source {source!r}")

    package = load_object(WEB / "package.json")
    scripts = package.get("scripts")
    build_script = scripts.get("build", "") if isinstance(scripts, dict) else ""
    dev_script = scripts.get("dev", "") if isinstance(scripts, dict) else ""
    if "VITE_CONTROL_TRANSPORT=mock" not in str(build_script):
        errors.append("build script is not pinned to mock transport")
    if "VITE_CONTROL_TRANSPORT=mock" not in str(dev_script):
        errors.append("dev script is not pinned to mock transport")

    if not FILE_MANIFEST.is_file():
        errors.append("manifest/source-files.sha256 is missing")
    elif FILE_MANIFEST.read_text(encoding="utf-8") != expected_manifest():
        errors.append("manifest/source-files.sha256 is stale; run scripts/build_manifest.py")

    scanned = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        if path.resolve() == Path(__file__).resolve():
            # This file contains the deny-list regex source itself.
            continue
        if any(part in FORBIDDEN_PARTS for part in path.relative_to(ROOT).parts):
            continue
        scanned += 1
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            errors.append(f"text-like file is not UTF-8: {path.relative_to(ROOT)}")
            continue
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"{path.relative_to(ROOT)} contains {label}")

    if (ROOT / ".git").is_dir():
        tracked = subprocess.check_output(
            ["git", "ls-files", "-z"], cwd=ROOT,
        ).decode("utf-8").split("\0")
        forbidden_tracked = sorted(
            relative for relative in tracked if relative
            and any(part in FORBIDDEN_PARTS for part in Path(relative).parts)
        )
        if forbidden_tracked:
            errors.append(f"forbidden generated/private paths are tracked: {forbidden_tracked[:8]!r}")

    if errors:
        print("PAW public Showcase: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print(
        f"PAW public Showcase: OK ({len(expected_ids)} Apps, "
        f"{len(snapshot_files())} files hashed, {scanned} public text files scanned)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
