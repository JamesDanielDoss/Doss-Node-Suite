from __future__ import annotations

import math
import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont

try:
    from ..core.controls import indices as parse_indices, json_text, redact
    from ..core.media import components_checked, encoded_media_info, finish_audio, join_videos, video_info
    from ..core.records import reserve_output, run_record, write_record
    from ..core.tensors import finite_number
except ImportError:
    from core.controls import indices as parse_indices, json_text, redact
    from core.media import components_checked, encoded_media_info, finish_audio, join_videos, video_info
    from core.records import reserve_output, run_record, write_record
    from core.tensors import finite_number
from .foundation_image import integer, number
from .save_image import resolve_save_directory, sanitize_filename_stem, build_preview_image_payload


class MediaNode:
    CATEGORY = "⚡ Doss Node Suite/Video"
    FUNCTION = "execute"


class DossClipTrim(MediaNode):
    DESCRIPTION = "Trim a native video in seconds or frames. End is exclusive; end=0 means the end of the clip. Audio follows the same range."
    RETURN_TYPES = ("VIDEO", "STRING")
    RETURN_NAMES = ("video", "report")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"video": ("VIDEO",), "units": (["seconds", "frames"],), "start": number(0, 0, 1e8, 0.01), "end": number(0, 0, 1e8, 0.01)}}

    def execute(self, video, units="seconds", start=0, end=0):
        info = video_info(video)
        start, end = finite_number(start, "Start", 0), finite_number(end, "End", 0)
        if units == "frames":
            if not start.is_integer() or not end.is_integer(): raise ValueError("Frame indices must be whole numbers.")
            fps = float(video.get_frame_rate())
            start, end = start / fps, end / fps
        elif units != "seconds": raise ValueError("Units must be seconds or frames.")
        end = info["duration_seconds"] if end == 0 else end
        if not 0 <= start < end <= info["duration_seconds"] + 1e-7:
            raise ValueError(f"Trim must satisfy 0 <= start < end <= {info['duration_seconds']:.6g} seconds.")
        result = video.as_trimmed(start, end - start, strict_duration=True)
        if result is None: raise ValueError("Video does not support this trim range.")
        report = json_text({"start_seconds": start, "end_seconds": end, "duration_seconds": end - start, "fps": info["fps"]})
        return {"ui": {"text": [report]}, "result": (result, report)}


class DossClipJoin(MediaNode):
    DESCRIPTION = "Join two compatible native clips and align audio to the frame boundary. Materializes short clips in memory; max_frames limits the combined output."
    RETURN_TYPES = ("VIDEO", "STRING")
    RETURN_NAMES = ("video", "report")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"a": ("VIDEO",), "b": ("VIDEO",), "max_frames": integer(256, 1, 4096)}}

    def execute(self, a, b, max_frames=256):
        video, details = join_videos(a, b, max_frames)
        report = json_text(details)
        return {"ui": {"text": [report]}, "result": (video, report)}


class DossShotSheet(MediaNode):
    DESCRIPTION = "Make a labeled contact sheet plus selected IMAGE frames from a short native video. Enter indices/slices or leave blank for evenly spaced samples. The source remains unchanged."
    RETURN_TYPES = ("IMAGE", "IMAGE", "STRING")
    RETURN_NAMES = ("sheet", "frames", "timestamps_json")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"video": ("VIDEO",), "indices": ("STRING", {"default": ""}), "count": integer(8, 1, 64), "columns": integer(4, 1, 8), "tile_width": integer(256, 64, 1024), "max_frames": integer(256, 1, 4096)}}

    def execute(self, video, indices="", count=8, columns=4, tile_width=256, max_frames=256):
        if not 1 <= count <= 64 or not 1 <= columns <= 8 or not 64 <= tile_width <= 1024: raise ValueError("Invalid shot sheet layout.")
        components = components_checked(video, max_frames)
        images = components.images
        selection = parse_indices(indices, len(images)) if indices.strip() else torch.linspace(0, len(images) - 1, min(count, len(images))).round().int().tolist()
        if len(selection) > 64: raise ValueError("A shot sheet can contain at most 64 frames.")
        frames = images.index_select(0, torch.tensor(selection, device=images.device))
        tile_height = max(1, round(tile_width * images.shape[1] / images.shape[2]))
        if tile_height > 2048: raise ValueError("Shot sheet tiles would be too tall; reduce tile_width or crop the video.")
        columns = min(columns, len(selection))
        rows, gap, label_height = math.ceil(len(selection) / columns), 12, 28
        sheet = Image.new("RGB", (columns * (tile_width + gap) + gap, rows * (tile_height + label_height + gap) + gap), "#141b26")
        draw, font = ImageDraw.Draw(sheet), ImageFont.load_default(size=14)
        timestamps = []
        for slot, index in enumerate(selection):
            x, y = gap + slot % columns * (tile_width + gap), gap + slot // columns * (tile_height + label_height + gap)
            array = (frames[slot, ..., :3].detach().float().cpu().clamp(0, 1).numpy() * 255).round().astype(np.uint8)
            thumb = Image.fromarray(array).resize((tile_width, tile_height), Image.Resampling.LANCZOS)
            sheet.paste(thumb, (x, y))
            seconds = float(index / components.frame_rate)
            draw.text((x, y + tile_height + 6), f"#{index}  {seconds:.3f}s", fill="#dfe7f2", font=font)
            timestamps.append({"frame": index, "seconds": seconds})
        result = torch.from_numpy(np.asarray(sheet).copy()).float().div(255).unsqueeze(0)
        return result, frames, json_text(timestamps)


class DossAudioFinish(MediaNode):
    CATEGORY = "⚡ Doss Node Suite/Audio"
    DESCRIPTION = "Trim, apply gain or per-item peak normalization, then fade. Silence stays silent. Samples over full scale are reported instead of silently clipped. Duration=0 keeps the remainder."
    RETURN_TYPES = ("AUDIO", "STRING")
    RETURN_NAMES = ("audio", "report")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"audio": ("AUDIO",), "start": number(0, 0, 1e6), "duration": number(0, 0, 1e6), "gain_db": number(0, -96, 48, 0.1), "normalize": ("BOOLEAN", {"default": False}), "peak_db": number(-1, -96, 0, 0.1), "fade_in": number(0, 0, 3600), "fade_out": number(0, 0, 3600)}}

    def execute(self, audio, start=0, duration=0, gain_db=0, normalize=False, peak_db=-1, fade_in=0, fade_out=0):
        result, details = finish_audio(audio, start, duration, gain_db, normalize, peak_db, fade_in, fade_out)
        report = json_text(details)
        return {"ui": {"text": [report]}, "result": (result, report)}


class DossVideoOutputPack(MediaNode):
    CATEGORY = "⚡ Doss Node Suite/Output"
    DESCRIPTION = "Save a native video with synchronized audio and an optional versioned run record, inside ComfyUI output. Uses native encoding and collision-safe filenames."
    RETURN_TYPES = ("VIDEO", "STRING")
    RETURN_NAMES = ("video", "relative_path")
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"video": ("VIDEO",), "filename": ("STRING", {"default": "Doss_Take"}), "save_location": ("STRING", {"default": "Doss"}), "container": (["mp4", "webm", "mkv"],), "codec": (["h264", "av1"],), "save_run_record": ("BOOLEAN", {"default": True}), "run_details": ("STRING", {"default": "{}", "multiline": True})}, "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}}

    def execute(self, video, filename="Doss_Take", save_location="Doss", container="mp4", codec="h264", save_run_record=True, run_details="{}", prompt=None, extra_pnginfo=None):
        from comfy_api.latest import Types
        info = video_info(video)
        if container not in ("mp4", "webm", "mkv") or codec not in ("h264", "av1"): raise ValueError("Unsupported container or codec.")
        if container == "webm" and codec != "av1": raise ValueError("WebM requires AV1; choose AV1 or MP4/MKV.")
        settings = {"container": container, "codec": codec, **info}
        record = run_record(settings, [], run_details, prompt, (extra_pnginfo or {}).get("workflow"))
        stem, _ = sanitize_filename_stem(filename)
        directory = resolve_save_directory(save_location)
        path = reserve_output(directory, stem, "." + container)
        try:
            video.save_to(str(path), format=Types.VideoContainer(container), codec=Types.VideoCodec(codec), metadata=redact({"prompt": prompt, **(extra_pnginfo or {})}) if save_run_record else None)
            output = build_preview_image_payload(path)
            record["outputs"] = [output]
            if save_run_record:
                record["encoding"] = encoded_media_info(path)
                write_record(path.with_name(path.name + ".doss.json"), record)
        except Exception:
            # Only remove the file reserved by this invocation.
            path.unlink(missing_ok=True)
            raise
        relative = "/".join(p for p in (output["subfolder"], output["filename"]) if p)
        return {"ui": {"images": [output], "text": [relative]}, "result": (video, relative)}


NODES = {cls.__name__: cls for cls in (DossClipTrim, DossClipJoin, DossShotSheet, DossAudioFinish, DossVideoOutputPack)}
