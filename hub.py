"""Read-only, output-independent endpoints used by the optional Doss Hub."""
from __future__ import annotations

import importlib.metadata
import json
import os
import uuid
from pathlib import Path

try:
    from .core.records import VERSION
    from .nodes.foundation_controls import model_inventory
except ImportError:
    from core.records import VERSION
    from nodes.foundation_controls import model_inventory


ROOT = Path(__file__).resolve().parent


def load_catalog():
    return json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))


def status():
    dependencies = {}
    for name in ("torch", "numpy", "Pillow", "av"):
        try: dependencies[name] = {"available": True, "version": importlib.metadata.version(name)}
        except importlib.metadata.PackageNotFoundError: dependencies[name] = {"available": False, "version": None}
    return {"schema_version": 1, "version": VERSION, "dependencies": dependencies, "downloads_models": False}


def example_document(name):
    catalog = load_catalog()
    allowed = {entry["example"] for entry in catalog["nodes"] if entry.get("example")}
    allowed.update(item["file"] for item in catalog.get("workflows", []))
    if name not in allowed: raise ValueError("Example is not in the published Doss catalogue.")
    return json.loads((ROOT / "examples" / name).read_text(encoding="utf-8"))


def validate_preferences(value):
    if not isinstance(value, dict) or value.get("schema_version") != 1:
        raise ValueError("Preferences require schema_version 1.")
    favorites, presets = value.get("favorites", []), value.get("presets", [])
    if not isinstance(favorites, list) or len(favorites) > 256 or not all(isinstance(x, str) and len(x) <= 128 for x in favorites):
        raise ValueError("Invalid favorites list.")
    if not isinstance(presets, list) or len(presets) > 128:
        raise ValueError("At most 128 user presets are supported.")
    for preset in presets:
        if not isinstance(preset, dict) or not all(isinstance(preset.get(k), str) and 0 < len(preset[k]) <= 128 for k in ("id", "name", "node_id")) or not isinstance(preset.get("values"), dict):
            raise ValueError("Each preset needs id, name, node_id, and values.")
        if not all(isinstance(k, str) and (v is None or type(v) in (str, bool, int, float)) for k, v in preset["values"].items()):
            raise ValueError("Preset values must be scalar widget values.")
    if len(json.dumps(value, allow_nan=False)) > 256000:
        raise ValueError("Doss preferences are limited to 256 KB.")
    return {"schema_version": 1, "favorites": list(dict.fromkeys(favorites)), "presets": presets}


def register_hub_routes():
    try:
        from aiohttp import web
        from server import PromptServer
    except ImportError:
        return
    server = getattr(PromptServer, "instance", None)
    if server is None or getattr(server, "_doss_hub_registered", False): return

    @server.routes.get("/doss/hub/catalog")
    async def catalog_route(_request):
        return web.json_response(load_catalog())

    @server.routes.get("/doss/hub/status")
    async def status_route(_request):
        return web.json_response(status())

    @server.routes.get("/doss/hub/models")
    async def models_route(request):
        try:
            return web.json_response(model_inventory(request.query.get("category", "all"), request.query.get("contains", "")))
        except ValueError as error:
            return web.json_response({"error": str(error)}, status=400)

    def preferences_path(request):
        path = server.user_manager.get_request_user_filepath(request, "doss/hub-v1.json")
        if not path: raise ValueError("User preferences directory is unavailable.")
        return Path(path)

    @server.routes.get("/doss/hub/preferences")
    async def preferences_get(request):
        try:
            path = preferences_path(request)
            value = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"schema_version": 1, "favorites": [], "presets": []}
            return web.json_response(validate_preferences(value))
        except (ValueError, KeyError, OSError) as error:
            return web.json_response({"error": str(error)}, status=400)

    @server.routes.post("/doss/hub/preferences")
    async def preferences_post(request):
        try:
            body = await request.text()
            if len(body) > 256000: raise ValueError("Doss preferences are limited to 256 KB.")
            value = validate_preferences(json.loads(body))
            path = preferences_path(request)
            path.parent.mkdir(parents=True, exist_ok=True)
            temp = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
            try:
                temp.write_text(json.dumps(value, allow_nan=False), encoding="utf-8")
                os.replace(temp, path)
            finally:
                temp.unlink(missing_ok=True)
            return web.json_response({"saved": True})
        except (ValueError, KeyError, OSError) as error:
            return web.json_response({"error": str(error)}, status=400)

    @server.routes.get("/doss/hub/examples/{name}")
    async def example_route(request):
        try: return web.json_response(example_document(request.match_info["name"]))
        except (ValueError, FileNotFoundError) as error: return web.json_response({"error": str(error)}, status=404)

    server._doss_hub_registered = True
