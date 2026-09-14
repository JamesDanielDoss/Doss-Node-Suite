"""Check runtime packaging and import an extracted clean custom-node installation."""
import hashlib
import importlib.util
import json
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    path = ROOT / "dist" / ("doss-node-suite-" + json.loads((ROOT / "catalog.json").read_text())["version"] + ".zip")
    with tempfile.TemporaryDirectory() as temporary, zipfile.ZipFile(path) as archive:
        # Windows runners may return an 8.3 TEMP path; compare resolved paths.
        root = Path(temporary).resolve()
        for name in archive.namelist(): assert (root / name).resolve().is_relative_to(root)
        archive.extractall(root)
        manifest = json.loads((root / "release-manifest.json").read_text())
        for name, digest in manifest["files"].items(): assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest
        assert (root / "LICENSE").read_text() == (ROOT / "LICENSE").read_text()
        for name in ("catalog.json", "hub.py", "core/media.py", "js/doss_hub.css", "js/doss_hub.js", "js/doss_foundation.js", "examples/category_video.json", "examples/api/category_video.json"):
            assert (root / name).is_file(), name
        spec = importlib.util.spec_from_file_location("doss_clean_archive", root / "__init__.py", submodule_search_locations=[str(root)])
        module = importlib.util.module_from_spec(spec); sys.modules[spec.name] = module; spec.loader.exec_module(module)
        assert len(module.NODE_CLASS_MAPPINGS) == 32
        assert module.WEB_DIRECTORY == "./js"
        print("Clean archive import and runtime asset hashes passed.")


if __name__ == "__main__": main()
