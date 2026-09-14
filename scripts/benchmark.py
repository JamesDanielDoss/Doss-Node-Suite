"""Measure representative Doss operations; makes no comparative performance claim."""
import argparse
import json
import platform
import statistics
import sys
import time
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.tensors import canvas_prep, transform_image, color_match, refine_mask


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--output", type=Path, required=True); args = parser.parse_args()
    report = {"python": platform.python_version(), "torch": torch.__version__, "platform": platform.platform(), "method": "2 warmups then 5 iterations; synchronized CUDA timing; one 1024x1024 float32 RGB image and mask; no image decoding or disk I/O", "operations": []}
    for device in (["cpu", "cuda"] if torch.cuda.is_available() else ["cpu"]):
        torch.manual_seed(42)
        image = torch.rand(1, 1024, 1024, 3, device=device); mask = image[..., 0].clone(); reference = image.flip(1)
        operations = {
            "canvas_fit_768_square": lambda: canvas_prep(image, 768, 768, "fit", "#000000", mask),
            "transform_rotate_15": lambda: transform_image(image, 0, 0, 15, 1, mask),
            "color_match": lambda: color_match(image, reference, 0.7),
            "mask_grow4_feather8": lambda: refine_mask(mask, 4, 8, False, 0.5),
        }
        for name, operation in operations.items():
            for _ in range(2): operation()
            if device == "cuda": torch.cuda.synchronize(); torch.cuda.reset_peak_memory_stats(); baseline = torch.cuda.memory_allocated()
            times = []
            for _ in range(5):
                start = time.perf_counter(); output = operation()
                if device == "cuda": torch.cuda.synchronize()
                times.append((time.perf_counter() - start) * 1000); del output
            item = {"operation": name, "device": torch.cuda.get_device_name() if device == "cuda" else platform.processor(), "median_ms": round(statistics.median(times), 3), "minimum_ms": round(min(times), 3), "maximum_ms": round(max(times), 3)}
            if device == "cuda": item["incremental_peak_allocated_bytes"] = torch.cuda.max_memory_allocated() - baseline
            report["operations"].append(item); print(name, device, item["median_ms"], "ms", flush=True)
        del image, mask, reference
    args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__": main()
