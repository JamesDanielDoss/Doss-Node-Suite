"""Validate identity, compiled assets, and release gates without installing packages."""
from __future__ import annotations
import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--tag"); parser.add_argument("--publish", action="store_true"); args = parser.parse_args()
    project = (ROOT / "pyproject.toml").read_text(encoding="utf-8")
    version = re.search(r'^version = "([^"]+)"', project, re.M)[1]
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    assert catalog["version"] == version
    assert 'name = "doss-node-suite"' in project and 'PublisherId = "jamesdossai"' in project
    assert 'VERSION = "' + version + '"' in (ROOT / "core" / "records.py").read_text()
    for name in ("doss_hub.js", "hub_model.js", "doss_foundation.js", "doss_hub.css"):
        assert (ROOT / "js" / name).stat().st_size > 100
    assert len(catalog["nodes"]) == 33
    if args.tag:
        assert re.fullmatch(r"v\d+\.\d+\.\d+", args.tag), "Use a plain tested release tag"
        assert args.tag == "v" + version
        assert subprocess.check_output(["git", "rev-parse", args.tag + "^{commit}"], cwd=ROOT) == subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT)
    if args.publish:
        gate = json.loads((ROOT / "release-gate.json").read_text())
        assert gate["registry_060_reason_verified"] and gate["registry_review_resolved"], "Resolve the existing 0.6.0 Registry review before publishing."
        assert gate["registry_evidence"] and gate["rtx_ltx_verified"] and gate["coexistence_verified"], "Complete and record the release acceptance checks."
    print("Release identity and compiled assets verified: " + version)


if __name__ == "__main__": main()
