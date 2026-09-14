"""Queue the shipped API fixtures against an isolated, running ComfyUI instance.

Examples write only below ComfyUI's output/Doss/Examples. No weights are downloaded.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def request(server, path, body=None):
    req = Request(server + path, data=json.dumps(body).encode() if body is not None else None, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=30) as response: return json.load(response)
    except HTTPError as error:
        raise RuntimeError(error.read().decode()) from error


def execute(server, prompt, timeout=120):
    submitted = request(server, "/prompt", {"prompt": prompt})
    key = submitted["prompt_id"]
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        history = request(server, "/history/" + key)
        if key in history:
            result = history[key]
            if result["status"]["status_str"] != "success": raise RuntimeError(json.dumps(result["status"]))
            return result
        time.sleep(0.2)
    raise TimeoutError(f"Prompt {key} did not complete in {timeout} seconds.")


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--server", default="http://127.0.0.1:8190")
    parser.add_argument("--match", default="*.json"); parser.add_argument("--report", type=Path)
    args = parser.parse_args(); results = []
    for path in sorted((ROOT / "examples" / "api").glob(args.match)):
        example = json.loads(path.read_text(encoding="utf-8"))
        if example.get("doss_example", {}).get("requires_models"):
            results.append({"example": path.name, "status": "requires_user_model"}); print("MODEL REQUIRED", path.name, flush=True); continue
        start = time.perf_counter()
        try:
            result = execute(args.server, example["prompt"])
            results.append({"example": path.name, "status": "passed", "seconds": round(time.perf_counter() - start, 3), "output_nodes": sorted(result["outputs"])})
            print("PASS", path.name, flush=True)
        except Exception as error:
            results.append({"example": path.name, "status": "failed", "error": str(error)})
            print("FAIL", path.name, str(error)[:1200], flush=True)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    failed = sum(item["status"] == "failed" for item in results)
    print(f"{len(results) - failed} non-failing examples; {failed} failures.")
    raise SystemExit(bool(failed))


if __name__ == "__main__": main()
