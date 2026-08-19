from __future__ import annotations

import json
import math
import re
from copy import deepcopy
from typing import Any


MOTION_PLAN_SCHEMA_VERSION = 1
MOTION_TRACK_COLORS = (
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#f59e0b",
    "#a855f7",
    "#06b6d4",
    "#f97316",
    "#84cc16",
)
SUPPORTED_FPS = ("24", "30")
_HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def calculate_ltx_frame_count(duration_seconds: float, fps: int) -> int:
    duration = float(duration_seconds)
    frame_rate = int(fps)
    if not math.isfinite(duration) or duration <= 0:
        raise ValueError("Duration must be a positive finite number.")
    if frame_rate not in {24, 30}:
        raise ValueError("FPS must be 24 or 30.")
    return 1 + math.floor(duration * frame_rate / 8) * 8


def _number(value: Any, label: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{label} must be finite.")
    return number


def _parse_plan(raw: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(raw, dict):
        plan = deepcopy(raw)
    else:
        try:
            plan = json.loads(raw or "{}")
        except (json.JSONDecodeError, TypeError) as error:
            raise ValueError("Motion plan is not valid JSON.") from error
    if not isinstance(plan, dict):
        raise ValueError("Motion plan must be a JSON object.")
    return plan


def validate_motion_plan(
    raw: str | dict[str, Any],
    *,
    image_width: int | None = None,
    image_height: int | None = None,
    source_ref: str | None = None,
) -> dict[str, Any]:
    plan = _parse_plan(raw)
    if plan.get("schemaVersion") != MOTION_PLAN_SCHEMA_VERSION:
        raise ValueError(
            f"Motion plan schemaVersion must be {MOTION_PLAN_SCHEMA_VERSION}."
        )
    if plan.get("stale") is True:
        raise ValueError(
            "Motion tracks belong to a different starting image. Choose Keep & rescale or Clear tracks in Doss Motion Studio | LTX 2.5."
        )

    source = plan.get("source")
    if not isinstance(source, dict):
        raise ValueError("Motion plan is missing its source image record.")
    source_width = int(source.get("width") or 0)
    source_height = int(source.get("height") or 0)
    if source_width <= 0 or source_height <= 0:
        raise ValueError("Motion plan source image dimensions are missing.")
    if image_width is not None and image_height is not None:
        if (source_width, source_height) != (int(image_width), int(image_height)):
            raise ValueError(
                "Motion plan source dimensions do not match the loaded starting image. Choose Keep & rescale or Clear tracks."
            )
    if source_ref is not None and source_ref:
        if str(source.get("ref") or "") != source_ref:
            raise ValueError(
                "Motion plan source filename does not match the loaded starting image. Choose Keep & rescale or Clear tracks."
            )

    tracks = plan.get("tracks")
    if not isinstance(tracks, list) or not tracks:
        raise ValueError("Add at least one motion track before running the workflow.")
    if len(tracks) > len(MOTION_TRACK_COLORS):
        raise ValueError(f"At most {len(MOTION_TRACK_COLORS)} motion tracks are supported.")

    normalized_tracks: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for track_index, track in enumerate(tracks, start=1):
        if not isinstance(track, dict):
            raise ValueError(f"Track {track_index} must be an object.")
        track_id = str(track.get("id") or f"track-{track_index}").strip()
        if not track_id or track_id in seen_ids:
            raise ValueError("Every motion track must have a unique nonempty id.")
        seen_ids.add(track_id)
        name = str(track.get("name") or f"Track {track_index}").strip()
        if not name:
            raise ValueError(f"Track {track_index} needs a name.")
        color = str(track.get("color") or MOTION_TRACK_COLORS[(track_index - 1) % len(MOTION_TRACK_COLORS)])
        if not _HEX_COLOR.fullmatch(color):
            raise ValueError(f"Track {track_index} color must use #RRGGBB format.")
        points = track.get("points")
        if not isinstance(points, list) or not points:
            raise ValueError(f"Track {track_index} needs at least one point.")
        normalized_points: list[dict[str, float]] = []
        for point_index, point in enumerate(points, start=1):
            if not isinstance(point, dict):
                raise ValueError(f"Track {track_index} point {point_index} must be an object.")
            x = _number(point.get("x"), f"Track {track_index} point {point_index} x")
            y = _number(point.get("y"), f"Track {track_index} point {point_index} y")
            if not 0.0 <= x <= 1.0 or not 0.0 <= y <= 1.0:
                raise ValueError(
                    f"Track {track_index} point {point_index} must stay inside the image."
                )
            normalized_points.append({"x": round(x, 6), "y": round(y, 6)})
        normalized_tracks.append(
            {
                "id": track_id,
                "name": name,
                "color": color.lower(),
                "points": normalized_points,
            }
        )

    return {
        "schemaVersion": MOTION_PLAN_SCHEMA_VERSION,
        "source": {
            "ref": str(source.get("ref") or ""),
            "width": source_width,
            "height": source_height,
        },
        "stale": False,
        "tracks": normalized_tracks,
    }


def _catmull_rom(
    p0: dict[str, float],
    p1: dict[str, float],
    p2: dict[str, float],
    p3: dict[str, float],
    t: float,
) -> dict[str, float]:
    t2 = t * t
    t3 = t2 * t
    return {
        "x": 0.5
        * (
            2 * p1["x"]
            + (-p0["x"] + p2["x"]) * t
            + (2 * p0["x"] - 5 * p1["x"] + 4 * p2["x"] - p3["x"]) * t2
            + (-p0["x"] + 3 * p1["x"] - 3 * p2["x"] + p3["x"]) * t3
        ),
        "y": 0.5
        * (
            2 * p1["y"]
            + (-p0["y"] + p2["y"]) * t
            + (2 * p0["y"] - 5 * p1["y"] + 4 * p2["y"] - p3["y"]) * t2
            + (-p0["y"] + 3 * p1["y"] - 3 * p2["y"] + p3["y"]) * t3
        ),
    }


def interpolate_normalized_track(
    points: list[dict[str, float]], frame_count: int
) -> list[dict[str, float]]:
    count = int(frame_count)
    if count < 2:
        raise ValueError("Frame count must be at least 2.")
    if len(points) == 1:
        return [dict(points[0]) for _ in range(count)]
    if len(points) == 2:
        a, b = points
        return [
            {
                "x": a["x"] + (b["x"] - a["x"]) * index / (count - 1),
                "y": a["y"] + (b["y"] - a["y"]) * index / (count - 1),
            }
            for index in range(count)
        ]

    padded = [points[0], *points, points[-1]]
    segment_count = len(padded) - 3
    result: list[dict[str, float]] = []
    for index in range(count):
        global_t = index / (count - 1) * segment_count
        segment = min(math.floor(global_t), segment_count - 1)
        local_t = global_t - segment
        point = _catmull_rom(
            padded[segment],
            padded[segment + 1],
            padded[segment + 2],
            padded[segment + 3],
            local_t,
        )
        result.append(
            {
                "x": min(1.0, max(0.0, point["x"])),
                "y": min(1.0, max(0.0, point["y"])),
            }
        )
    return result


def resolve_motion_tracks(
    raw: str | dict[str, Any], width: int, height: int, frame_count: int
) -> str:
    plan = validate_motion_plan(raw)
    resolved: list[list[dict[str, int]]] = []
    for track in plan["tracks"]:
        samples = interpolate_normalized_track(track["points"], int(frame_count))
        resolved.append(
            [
                {
                    "x": round(point["x"] * max(0, int(width) - 1)),
                    "y": round(point["y"] * max(0, int(height) - 1)),
                }
                for point in samples
            ]
        )
    return json.dumps(resolved, separators=(",", ":"))


def _image_dimensions(image: Any) -> tuple[int, int]:
    shape = getattr(image, "shape", None)
    if shape is None or len(shape) < 3:
        raise ValueError("Doss Motion Node | LTX 2.5 requires a ComfyUI IMAGE input.")
    return int(shape[-2]), int(shape[-3])


class DossLTXMotionSettings:
    CATEGORY = "⚡ Doss Node Suite/LTX-2.5"
    FUNCTION = "build_settings"
    RETURN_TYPES = ("STRING", "STRING", "FLOAT", "FLOAT", "INT", "INT", "FLOAT", "FLOAT")
    RETURN_NAMES = (
        "positive_prompt",
        "negative_prompt",
        "duration_seconds",
        "fps",
        "frame_count",
        "seed",
        "motion_strength",
        "image_adherence",
    )

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "positive_prompt": ("STRING", {"default": "", "multiline": True}),
                "duration_seconds": (
                    "FLOAT",
                    {"default": 5.0, "min": 1.0, "max": 20.0, "step": 0.5},
                ),
                "negative_prompt": ("STRING", {"default": "", "multiline": True}),
                "seed": (
                    "INT",
                    {"default": 42, "min": 0, "max": 0x7FFFFFFFFFFFFFFF, "control_after_generate": True},
                ),
                "motion_strength": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.0, "max": 1.5, "step": 0.05},
                ),
                "image_adherence": (
                    "FLOAT",
                    {"default": 0.7, "min": 0.0, "max": 1.0, "step": 0.05},
                ),
                "fps": (SUPPORTED_FPS, {"default": "24"}),
            }
        }

    def build_settings(
        self,
        positive_prompt: str,
        duration_seconds: float,
        negative_prompt: str,
        seed: int,
        motion_strength: float,
        image_adherence: float,
        fps: str,
    ):
        frame_rate = int(fps)
        frame_count = calculate_ltx_frame_count(duration_seconds, frame_rate)
        return (
            positive_prompt,
            negative_prompt,
            float(duration_seconds),
            float(frame_rate),
            frame_count,
            int(seed),
            float(motion_strength),
            float(image_adherence),
        )


class DossLTXMotionStudio:
    CATEGORY = "⚡ Doss Node Suite/LTX-2.5"
    FUNCTION = "validate_and_pass"
    RETURN_TYPES = ("IMAGE", "STRING")
    RETURN_NAMES = ("image", "motion_plan")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "motion_plan": (
                    "STRING",
                    {
                        "default": json.dumps(
                            {
                                "schemaVersion": MOTION_PLAN_SCHEMA_VERSION,
                                "source": {"ref": "", "width": 0, "height": 0},
                                "stale": False,
                                "tracks": [],
                            },
                            separators=(",", ":"),
                        ),
                        "multiline": False,
                    },
                ),
                "source_ref": ("STRING", {"default": "", "multiline": False}),
            }
        }

    def validate_and_pass(self, image: Any, motion_plan: str, source_ref: str):
        width, height = _image_dimensions(image)
        plan = validate_motion_plan(
            motion_plan,
            image_width=width,
            image_height=height,
            source_ref=source_ref,
        )
        return (image, json.dumps(plan, separators=(",", ":")))


class DossLTXResolveMotionTracks:
    CATEGORY = "⚡ Doss Node Suite/LTX-2.5"
    FUNCTION = "resolve"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("tracks",)

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "motion_plan": ("STRING", {"default": "", "multiline": False}),
                "frame_count": ("INT", {"default": 121, "min": 9, "max": 10000}),
            }
        }

    def resolve(self, image: Any, motion_plan: str, frame_count: int):
        width, height = _image_dimensions(image)
        return (resolve_motion_tracks(motion_plan, width, height, int(frame_count)),)
