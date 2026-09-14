"""Publish the tested checkout, wait for active status, and compare delivered bytes.

Requires the existing publisher's REGISTRY_ACCESS_TOKEN; no credential is persisted.
"""
import hashlib
import io
import json
import os
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from urllib.request import urlopen

from build_release import runtime_files

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.comfy.org/nodes/doss-node-suite/versions"


def versions():
    with urlopen(API, timeout=30) as response: return json.load(response)


def main():
    version = json.loads((ROOT / "catalog.json").read_text())["version"]
    subprocess.run([sys.executable, "scripts/check_release.py", "--tag", "v" + version, "--publish"], cwd=ROOT, check=True)
    current = next((v for v in versions() if v["version"] == version), None)
    if not current:
        token = os.environ.get("REGISTRY_ACCESS_TOKEN")
        if not token: raise RuntimeError("REGISTRY_ACCESS_TOKEN is missing for the existing jamesdossai publisher.")
        result = subprocess.run(["comfy", "--skip-prompt", "--no-enable-telemetry", "node", "publish", "--token", token], cwd=ROOT, capture_output=True, text=True)
        if result.returncode:
            print((result.stdout + result.stderr).replace(token, "[REDACTED]"), file=sys.stderr)
            raise RuntimeError("Registry publication failed; see the redacted CLI output.")
    deadline = time.monotonic() + 600
    while time.monotonic() < deadline:
        current = next((v for v in versions() if v["version"] == version), None)
        if current and current["status"] == "NodeVersionStatusBanned": raise RuntimeError("Registry review banned this version. Inspect the existing publisher dashboard; do not publish another version to evade review.")
        if current and current["status"] == "NodeVersionStatusActive": break
        print("Waiting for Registry review status.", flush=True); time.sleep(15)
    else: raise RuntimeError("Registry review is still pending. Resume this workflow after review; it will not republish an existing version.")
    with urlopen(current["downloadUrl"], timeout=60) as response: data = response.read()
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for name in runtime_files():
            assert archive.read(name) == (ROOT / name).read_bytes(), "Published runtime differs: " + name
    path = ROOT / "dist" / f"doss-node-suite-{version}-registry.zip"; path.write_bytes(data)
    path.with_suffix(".zip.sha256").write_text(hashlib.sha256(data).hexdigest() + "  " + path.name + "\n")
    print("Existing doss-node-suite listing is active; published runtime matches the tested checkout.")


if __name__ == "__main__": main()
