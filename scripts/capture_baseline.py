"""Capture contracts and exact workflow examples from previously downloaded releases."""
import argparse
import hashlib
import importlib.util
import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("archives", type=Path); args = parser.parse_args()
    destination = ROOT / "tests" / "fixtures" / "legacy"; destination.mkdir(parents=True, exist_ok=True)
    for version in ("0.3.2", "0.6.0"):
        archive_path = args.archives / (version + ".zip")
        with tempfile.TemporaryDirectory() as temp, zipfile.ZipFile(archive_path) as archive:
            root = Path(temp)
            for name in archive.namelist():
                target = (root / name).resolve()
                if not target.is_relative_to(root): raise ValueError("Archive path escapes temporary directory")
            archive.extractall(root)
            alias = "doss_baseline_" + version.replace(".", "_")
            spec = importlib.util.spec_from_file_location(alias, root / "__init__.py", submodule_search_locations=[str(root)])
            module = importlib.util.module_from_spec(spec); sys.modules[alias] = module; spec.loader.exec_module(module)
            contracts = {"version": version, "archive_sha256": hashlib.sha256(archive_path.read_bytes()).hexdigest(), "nodes": {}}
            for name, cls in module.NODE_CLASS_MAPPINGS.items():
                contracts["nodes"][name] = {"inputs": cls.INPUT_TYPES(), "outputs": cls.RETURN_TYPES, "name": module.NODE_DISPLAY_NAME_MAPPINGS[name], "category": cls.CATEGORY, "function": cls.FUNCTION}
            (destination / f"{version}-contracts.json").write_text(json.dumps(contracts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            for path in (root / "examples").glob("*.json"):
                (destination / f"{version}-{path.name}").write_bytes(path.read_bytes())
            print(version, len(contracts["nodes"]), "backend contracts captured")


if __name__ == "__main__": main()
