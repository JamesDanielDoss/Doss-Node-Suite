from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
from PIL.PngImagePlugin import PngInfo


DEFAULT_FILENAME = "ComfyUI"
DEFAULT_SAVE_LOCATION = "output"
FILE_FORMATS = ("JPEG", "PNG", "PDF", "WEBP", "TIFF", "ICO", "BMP")
FORMAT_EXTENSIONS = {
    "JPEG": ".jpg",
    "PNG": ".png",
    "PDF": ".pdf",
    "WEBP": ".webp",
    "TIFF": ".tiff",
    "ICO": ".ico",
    "BMP": ".bmp",
}
ICO_SIZES = [(256, 256)]
INVALID_FILENAME_PATTERN = re.compile(r'[\\/:*?"<>|]+')
KNOWN_EXTENSION_PATTERN = re.compile(r"\.(jpe?g|png|pdf|webp|tiff?|ico|bmp)$", re.IGNORECASE)
BAD_FILENAME_WARNING = 'Bad filename due to special characters. Characters have been changed to underscores "_".'


def get_comfy_output_directory() -> Path:
    try:
        import folder_paths

        return Path(folder_paths.get_output_directory()).resolve()
    except Exception:
        return Path.cwd().resolve()


def sanitize_filename_stem(filename: Any) -> tuple[str, bool]:
    text = DEFAULT_FILENAME if filename is None else str(filename).strip()
    if not text:
        text = DEFAULT_FILENAME

    text = KNOWN_EXTENSION_PATTERN.sub("", text)
    changed = bool(INVALID_FILENAME_PATTERN.search(text))
    safe = INVALID_FILENAME_PATTERN.sub("_", text)
    safe = safe.strip(" .")

    if not safe:
        safe = DEFAULT_FILENAME

    return safe, changed


def validate_file_format(file_format: str) -> str:
    normalized = str(file_format).upper()
    if normalized not in FILE_FORMATS:
        raise ValueError(f"Unsupported file format: {file_format}")
    return normalized


def _has_drive_or_absolute_path(value: str) -> bool:
    path = Path(value)
    return path.is_absolute() or bool(path.drive)


def normalize_output_relative_path(save_location: Any) -> str:
    if save_location is None:
        return ""

    text = str(save_location).strip().replace("\\", "/")
    if not text:
        return ""
    if text.strip("/").lower() == DEFAULT_SAVE_LOCATION:
        return ""
    if _has_drive_or_absolute_path(text):
        raise ValueError("save_location must be relative to the ComfyUI output folder.")

    parts = []
    for part in text.split("/"):
        part = part.strip()
        if not part or part == ".":
            continue
        if part == "..":
            raise ValueError("save_location cannot use '..' traversal.")
        safe_part, _ = sanitize_filename_stem(part)
        parts.append(safe_part)

    return "/".join(parts)


def resolve_save_directory(save_location: Any = "", output_directory: Path | None = None) -> Path:
    output_root = (output_directory or get_comfy_output_directory()).resolve()
    relative = normalize_output_relative_path(save_location)
    target = (output_root / relative).resolve() if relative else output_root

    if target != output_root and output_root not in target.parents:
        raise ValueError("save_location must stay inside the ComfyUI output folder.")

    target.mkdir(parents=True, exist_ok=True)
    return target


def next_available_path(directory: Path, stem: str, extension: str) -> Path:
    candidate = directory / f"{stem}{extension}"
    index = 1
    while candidate.exists():
        candidate = directory / f"{stem}({index}){extension}"
        index += 1
    return candidate


def build_batch_paths(directory: Path, stem: str, extension: str, count: int) -> list[Path]:
    paths = []
    for _ in range(count):
        path = next_available_path(directory, stem, extension)
        paths.append(path)
        path.touch()
    for path in paths:
        path.unlink(missing_ok=True)
    return paths


def _batch_length(images: Any) -> int:
    try:
        return len(images)
    except TypeError:
        return 1


def _batch_item(images: Any, index: int) -> Any:
    try:
        return images[index]
    except TypeError:
        return images


def tensor_to_pil(image: Any) -> Image.Image:
    if hasattr(image, "detach"):
        image = image.detach()
    if hasattr(image, "cpu"):
        image = image.cpu()
    if hasattr(image, "numpy"):
        image = image.numpy()

    array = np.asarray(image)
    if array.ndim == 4 and array.shape[0] == 1:
        array = array[0]
    if array.dtype.kind == "f":
        array = np.clip(array * 255.0, 0, 255).astype(np.uint8)
    else:
        array = np.clip(array, 0, 255).astype(np.uint8)

    return Image.fromarray(array)


def flatten_transparency_to_white(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    background.alpha_composite(rgba)
    return background.convert("RGB")


def build_metadata_payload(
    path: Path,
    file_format: str,
    image: Image.Image,
    batch_index: int,
    node_settings: dict[str, Any],
    prompt: Any = None,
    extra_pnginfo: Any = None,
) -> dict[str, Any]:
    metadata_available = prompt is not None or bool(extra_pnginfo)
    return {
        "filename": path.name,
        "path": str(path),
        "format": file_format,
        "date_time": datetime.now().isoformat(timespec="seconds"),
        "dimensions": {"width": image.width, "height": image.height},
        "batch_index": batch_index,
        "node_settings": node_settings,
        "metadata_available": metadata_available,
        "prompt": prompt,
        "extra_pnginfo": extra_pnginfo,
    }


def _metadata_text(payload: dict[str, Any]) -> str:
    if not payload.get("metadata_available"):
        header = "Generation metadata was unavailable.\n\n"
    else:
        header = "Generation metadata:\n\n"
    return header + json.dumps(payload, indent=2, default=str)


def write_metadata_text_file(path: Path, payload: dict[str, Any]) -> Path:
    text_path = path.with_name(f"{path.name}.txt")
    text_path.write_text(_metadata_text(payload), encoding="utf-8")
    return text_path


def _png_metadata(prompt: Any = None, extra_pnginfo: Any = None) -> PngInfo | None:
    metadata = PngInfo()
    added = False
    if prompt is not None:
        metadata.add_text("prompt", json.dumps(prompt, default=str))
        added = True
    if extra_pnginfo:
        for key, value in extra_pnginfo.items():
            metadata.add_text(str(key), json.dumps(value, default=str))
            added = True
    return metadata if added else None


def save_pil_image(
    image: Image.Image,
    path: Path,
    file_format: str,
    save_metadata: bool,
    prompt: Any = None,
    extra_pnginfo: Any = None,
) -> None:
    if file_format == "PNG":
        pnginfo = _png_metadata(prompt, extra_pnginfo) if save_metadata else None
        image.save(path, format="PNG", pnginfo=pnginfo)
    elif file_format == "JPEG":
        flatten_transparency_to_white(image).save(path, format="JPEG", quality=95, subsampling=0)
    elif file_format == "PDF":
        flatten_transparency_to_white(image).save(path, format="PDF", quality=95)
    elif file_format == "WEBP":
        image.save(path, format="WEBP", quality=100, method=6)
    elif file_format == "TIFF":
        image.save(path, format="TIFF", compression="tiff_lzw")
    elif file_format == "ICO":
        image.convert("RGBA").resize((256, 256), Image.Resampling.LANCZOS).save(
            path,
            format="ICO",
            sizes=ICO_SIZES,
        )
    elif file_format == "BMP":
        if image.mode in ("RGBA", "LA"):
            image = flatten_transparency_to_white(image)
        image.save(path, format="BMP")
    else:
        raise ValueError(f"Unsupported file format: {file_format}")


def list_output_subfolders(save_location: Any = "", output_directory: Path | None = None) -> dict[str, Any]:
    output_root = (output_directory or get_comfy_output_directory()).resolve()
    current = resolve_save_directory(save_location, output_root)
    relative_current = current.relative_to(output_root).as_posix()
    if relative_current == ".":
        relative_current = ""

    folders = []
    for entry in sorted(current.iterdir(), key=lambda item: item.name.lower()):
        if entry.is_dir() and not entry.name.startswith("."):
            relative = entry.relative_to(output_root).as_posix()
            folders.append({"name": entry.name, "path": relative})

    parent = ""
    if current != output_root:
        parent = current.parent.relative_to(output_root).as_posix()
        if parent == ".":
            parent = ""

    return {
        "root": str(output_root),
        "current": relative_current,
        "parent": parent,
        "folders": folders,
    }


def create_output_subfolder(parent: Any, folder_name: Any, output_directory: Path | None = None) -> dict[str, Any]:
    safe_name, _ = sanitize_filename_stem(folder_name)
    if not safe_name:
        raise ValueError("Folder name cannot be empty.")
    relative_parent = normalize_output_relative_path(parent)
    relative = "/".join(part for part in (relative_parent, safe_name) if part)
    target = resolve_save_directory(relative, output_directory)
    return {"name": safe_name, "path": target.relative_to((output_directory or get_comfy_output_directory()).resolve()).as_posix()}


def register_doss_save_image_routes() -> None:
    try:
        from aiohttp import web
        from server import PromptServer
    except Exception:
        return

    server = getattr(PromptServer, "instance", None)
    if server is None or getattr(server, "_doss_save_image_routes_registered", False):
        return

    routes = server.routes

    @routes.get("/doss/save_image/folders")
    async def doss_list_folders(request):
        try:
            return web.json_response(list_output_subfolders(request.query.get("path", "")))
        except Exception as error:
            return web.json_response({"error": str(error)}, status=400)

    @routes.post("/doss/save_image/folders")
    async def doss_create_folder(request):
        try:
            data = await request.json()
            return web.json_response(create_output_subfolder(data.get("path", ""), data.get("name", "")))
        except Exception as error:
            return web.json_response({"error": str(error)}, status=400)

    server._doss_save_image_routes_registered = True


class DossSaveImage:
    """Save IMAGE batches to user-selected ComfyUI output folders and pass images through."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "filename": ("STRING", {"default": DEFAULT_FILENAME, "multiline": False}),
                "save_location": ("STRING", {"default": DEFAULT_SAVE_LOCATION, "multiline": False}),
                "file_format": (list(FILE_FORMATS), {"default": "PNG"}),
                "save_metadata": ("BOOLEAN", {"default": True}),
                "save_metadata_text_file": ("BOOLEAN", {"default": False}),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "save_image"
    CATEGORY = "Doss Node Suite"
    OUTPUT_NODE = True
    DESCRIPTION = "Save images to the ComfyUI output folder or an output subfolder."

    def save_image(
        self,
        image,
        filename=DEFAULT_FILENAME,
        save_location="",
        file_format="PNG",
        save_metadata=True,
        save_metadata_text_file=False,
        prompt=None,
        extra_pnginfo=None,
    ):
        safe_stem, filename_changed = sanitize_filename_stem(filename)
        normalized_format = validate_file_format(file_format)
        extension = FORMAT_EXTENSIONS[normalized_format]
        output_dir = resolve_save_directory(save_location)
        batch_count = _batch_length(image)
        paths = build_batch_paths(output_dir, safe_stem, extension, batch_count)
        saved_files = []

        node_settings = {
            "filename": filename,
            "sanitized_filename": safe_stem,
            "save_location": normalize_output_relative_path(save_location),
            "file_format": normalized_format,
            "save_metadata": bool(save_metadata),
            "save_metadata_text_file": bool(save_metadata_text_file),
        }

        for batch_index, path in enumerate(paths):
            pil_image = tensor_to_pil(_batch_item(image, batch_index))
            save_pil_image(pil_image, path, normalized_format, bool(save_metadata), prompt, extra_pnginfo)
            payload = build_metadata_payload(
                path,
                normalized_format,
                pil_image,
                batch_index,
                node_settings,
                prompt,
                extra_pnginfo,
            )
            text_file = None
            if save_metadata_text_file:
                text_file = write_metadata_text_file(path, payload)
            saved_files.append(
                {
                    "filename": path.name,
                    "path": str(path),
                    "text_file": str(text_file) if text_file else None,
                    "format": normalized_format,
                    "batch_index": batch_index,
                }
            )

        ui = {"saved_files": saved_files}
        if filename_changed:
            ui["warnings"] = [BAD_FILENAME_WARNING]
            ui["sanitized_filename"] = [safe_stem]

        return {
            "ui": ui,
            "result": (image,),
        }
