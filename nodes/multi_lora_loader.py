from __future__ import annotations

import json
import math
from collections import OrderedDict
from pathlib import Path
from typing import Any


LORA_STACK_SCHEMA_VERSION = 2
MAX_LORA_ENTRIES = 32
DEFAULT_LORA_STACK = json.dumps(
    {"version": LORA_STACK_SCHEMA_VERSION, "entries": []},
    separators=(",", ":"),
)


def available_lora_names() -> list[str]:
    try:
        import folder_paths

        return sorted(str(name) for name in folder_paths.get_filename_list("loras"))
    except Exception:
        return []


def parse_lora_stack(raw: str | dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(raw, dict):
        payload = raw
    else:
        try:
            payload = json.loads(raw or DEFAULT_LORA_STACK)
        except (json.JSONDecodeError, TypeError) as error:
            raise ValueError("LoRA stack is not valid JSON.") from error

    if not isinstance(payload, dict):
        raise ValueError("LoRA stack must be a JSON object.")
    version = payload.get("version")
    if version not in {1, LORA_STACK_SCHEMA_VERSION}:
        raise ValueError(
            f"LoRA stack version must be 1 or {LORA_STACK_SCHEMA_VERSION}."
        )
    entries = payload.get("entries")
    if not isinstance(entries, list):
        raise ValueError("LoRA stack entries must be a list.")
    if len(entries) > MAX_LORA_ENTRIES:
        raise ValueError(f"LoRA stack cannot exceed {MAX_LORA_ENTRIES} entries.")

    normalized: list[dict[str, Any]] = []
    for index, entry in enumerate(entries, start=1):
        if not isinstance(entry, dict):
            raise ValueError(f"LoRA entry {index} must be an object.")
        name = str(entry.get("name") or "").strip()
        if not name:
            raise ValueError(f"LoRA entry {index} is missing a filename.")
        legacy_strength = entry.get("strength", 1.0)
        try:
            strength_model = float(entry.get("strength_model", legacy_strength))
            strength_clip = float(entry.get("strength_clip", legacy_strength))
        except (TypeError, ValueError) as error:
            raise ValueError(f"LoRA entry {index} has an invalid MODEL or CLIP weight.") from error
        for label, strength in (("MODEL", strength_model), ("CLIP", strength_clip)):
            if not math.isfinite(strength) or not -100.0 <= strength <= 100.0:
                raise ValueError(
                    f"LoRA entry {index} {label} weight must be finite and between -100 and 100."
                )
        normalized.append(
            {
                "name": name,
                "strength_model": strength_model,
                "strength_clip": strength_clip,
                "enabled": bool(entry.get("enabled", True)),
            }
        )
    return normalized


def _resolve_lora_path(name: str) -> Path:
    import folder_paths

    return Path(folder_paths.get_full_path_or_raise("loras", name)).resolve()


def _load_lora_file(path: Path) -> tuple[Any, Any]:
    import comfy.utils

    return comfy.utils.load_torch_file(
        str(path), safe_load=True, return_metadata=True
    )


def _apply_lora(
    model: Any,
    clip: Any,
    lora: Any,
    strength_model: float,
    strength_clip: float,
    metadata: Any,
) -> tuple[Any, Any]:
    import comfy.sd

    return comfy.sd.load_lora_for_models(
        model,
        clip,
        lora,
        strength_model,
        strength_clip,
        lora_metadata=metadata,
    )


def register_doss_multi_lora_routes() -> None:
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception:
        return

    server = getattr(PromptServer, "instance", None)
    if server is None or getattr(server, "_doss_multi_lora_routes_registered", False):
        return

    @server.routes.get("/doss/multi_lora_loader/loras")
    async def doss_list_loras(_request):
        return web.json_response({"loras": available_lora_names()})

    server._doss_multi_lora_routes_registered = True


class DossMultiLoraLoader:
    """Apply an ordered, editable stack of LoRAs to MODEL and CLIP."""

    def __init__(self) -> None:
        self._cache: OrderedDict[str, tuple[int, int, Any, Any]] = OrderedDict()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "model": ("MODEL",),
                "clip": ("CLIP",),
                "lora_stack_json": (
                    "STRING",
                    {
                        "default": DEFAULT_LORA_STACK,
                        "multiline": False,
                        "tooltip": "Persisted Doss Multi-LoRA stack. Edit it with the controls inside the node.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("MODEL", "CLIP")
    RETURN_NAMES = ("model", "clip")
    FUNCTION = "load_lora_stack"
    CATEGORY = "⚡ Doss Node Suite"
    DESCRIPTION = (
        "Add, remove, enable, and weight multiple LoRAs in one ordered loader. "
        "Each enabled LoRA is applied to MODEL and CLIP in displayed order."
    )

    def _cached_lora(self, name: str) -> tuple[Any, Any]:
        path = _resolve_lora_path(name)
        stat = path.stat()
        key = str(path)
        cached = self._cache.get(key)
        if cached and cached[0] == stat.st_mtime_ns and cached[1] == stat.st_size:
            self._cache.move_to_end(key)
            return cached[2], cached[3]

        lora, metadata = _load_lora_file(path)
        self._cache[key] = (stat.st_mtime_ns, stat.st_size, lora, metadata)
        self._cache.move_to_end(key)
        while len(self._cache) > MAX_LORA_ENTRIES:
            self._cache.popitem(last=False)
        return lora, metadata

    def load_lora_stack(self, model: Any, clip: Any, lora_stack_json: str):
        current_model = model
        current_clip = clip
        for entry in parse_lora_stack(lora_stack_json):
            strength_model = entry["strength_model"]
            strength_clip = entry["strength_clip"]
            if not entry["enabled"] or (strength_model == 0 and strength_clip == 0):
                continue
            lora, metadata = self._cached_lora(entry["name"])
            current_model, current_clip = _apply_lora(
                current_model,
                current_clip,
                lora,
                strength_model,
                strength_clip,
                metadata,
            )
        return current_model, current_clip
