from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .controls import redact, parse_json

VERSION = "0.7.0"


def run_record(settings, outputs, supplied="", prompt=None, workflow=None):
    details = parse_json(supplied, "Run details") if supplied.strip() else {}
    if not isinstance(details, dict): raise ValueError("Run details must be a JSON object.")
    return redact({"schema_version": 1, "suite": "doss-node-suite", "suite_version": VERSION, "created_at": datetime.now(timezone.utc).isoformat(), "settings": settings, "outputs": outputs, "supplied": details, "prompt": prompt, "workflow": workflow, "missing": [name for name, value in (("prompt", prompt), ("workflow", workflow), ("supplied", details)) if not value]})


def write_record(path: Path, record):
    # Exclusive creation protects sidecars belonging to an earlier take as well.
    with path.open("x", encoding="utf-8") as stream:
        json.dump(record, stream, ensure_ascii=False, indent=2, allow_nan=False)


def reserve_output(directory: Path, stem: str, suffix: str) -> Path:
    for index in range(100000):
        path = directory / f"{stem}{f'({index})' if index else ''}{suffix}"
        if any(path.with_name(path.name + extra).exists() for extra in (".doss.json", ".txt")): continue
        try:
            with path.open("xb"): pass
            return path
        except FileExistsError:
            continue
    raise ValueError("Too many takes with this filename; choose another filename.")
