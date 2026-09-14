"""Build a deterministic, installable ComfyUI custom-node ZIP from the runtime files."""
from __future__ import annotations

import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def runtime_files():
    names = ["__init__.py", "hub.py", "pyproject.toml", "requirements.txt", "LICENSE", "README.md", "CHANGELOG.md", "catalog.json", "node_list.json"]
    for directory, suffixes in (("core", {".py"}), ("nodes", {".py"}), ("js", {".js", ".css"}), ("examples", {".json"}), ("docs", {".md"})):
        names.extend(path.relative_to(ROOT).as_posix() for path in (ROOT / directory).rglob("*") if path.is_file() and path.suffix in suffixes and "__pycache__" not in path.parts)
    return sorted(names)


def main():
    version = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))["version"]
    destination = ROOT / "dist"; destination.mkdir(exist_ok=True)
    path = destination / f"doss-node-suite-{version}.zip"
    files = runtime_files()
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    dirty = bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip())
    manifest = {"schema_version": 1, "version": version, "source_commit": commit, "source_dirty": dirty, "files": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in files}}
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in [*files, "release-manifest.json"]:
            data = (ROOT / name).read_bytes() if name in files else (json.dumps(manifest, indent=2) + "\n").encode()
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0)); info.external_attr = 0o644 << 16; info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data)
    checksum = hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix(".zip.sha256").write_text(f"{checksum}  {path.name}\n", encoding="utf-8")
    print(f"{path.name}: {len(files)} runtime files; sha256 {checksum}")


if __name__ == "__main__": main()
