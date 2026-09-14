"""Run a clean ComfyUI integration server and execute all model-free examples."""
from __future__ import annotations
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from run_examples import execute, request

ROOT = Path(__file__).resolve().parents[1]


def checks(server):
    # The unselected branch deliberately fails if evaluated.
    lazy = {
        "1": {"class_type":"DossPromptRecipe", "inputs":{"sections":'[{"name":"Test","text":"selected"}]', "separator":", ", "prefix":"", "suffix":""}},
        "2": {"class_type":"DossTextToolkit", "inputs":{"text":"bad branch", "operation":"replace", "argument":"", "replacement":""}},
        "3": {"class_type":"DossTypedSwitch", "inputs":{"data_type":"STRING", "select":"a", "a":["1",0], "b":["2",0]}},
        "4": {"class_type":"DossInspector", "inputs":{"value":["3",0]}},
    }
    execute(server, lazy)
    print("PASS lazy switch avoided the failing branch", flush=True)
    subprocess.run([sys.executable, str(ROOT / "scripts/run_examples.py"), "--server", server], check=True)


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--comfy-root", type=Path); parser.add_argument("--server"); args = parser.parse_args()
    if args.server: checks(args.server); return
    if not args.comfy_root: parser.error("Provide --server or --comfy-root")
    comfy = args.comfy_root.resolve()
    with tempfile.TemporaryDirectory(prefix="doss-native-") as temp:
        root = Path(temp)
        for name in ("input", "output", "user", "custom_nodes"): (root / name).mkdir()
        link = root / "custom_nodes" / "doss-node-suite"
        if os.name == "nt":
            # Copy runtime source rather than requiring Windows symlink privileges.
            import shutil
            from build_release import runtime_files
            link.mkdir()
            for name in runtime_files():
                target = link / name; target.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / name, target)
        else: link.symlink_to(ROOT, target_is_directory=True)
        config = root / "paths.yaml"; config.write_text("doss_test:\n  custom_nodes: " + (root / "custom_nodes").as_posix() + "\n")
        args = [sys.executable, str(comfy / "main.py"), "--cpu", "--listen", "127.0.0.1", "--port", "8195", "--disable-auto-launch", "--disable-api-nodes", "--extra-model-paths-config", str(config), "--database-url", "sqlite:///" + (root / "user" / "comfyui.db").as_posix()]
        for name in ("input", "output", "user"): args += ["--" + name + "-directory", str(root / name)]
        with (root / "server.log").open("w", encoding="utf-8") as log:
            process = subprocess.Popen(args, cwd=comfy, stdout=log, stderr=subprocess.STDOUT)
            try:
                server = "http://127.0.0.1:8195"
                for _ in range(120):
                    if process.poll() is not None: raise RuntimeError("ComfyUI exited during startup")
                    try:
                        info = request(server, "/object_info")
                        assert "DossCanvasPrep" in info; break
                    except Exception: time.sleep(1)
                else: raise TimeoutError("ComfyUI did not start")
                checks(server)
            except Exception:
                log.flush(); print((root / "server.log").read_text(encoding="utf-8")[-16000:]); raise
            finally:
                process.terminate()
                try: process.wait(timeout=15)
                except subprocess.TimeoutExpired: process.kill(); process.wait()


if __name__ == "__main__": main()
