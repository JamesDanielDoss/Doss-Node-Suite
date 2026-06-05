from __future__ import annotations

import re
from typing import Any


DEFAULT_SEGMENT = "untitled"

WINDOWS_UNSAFE_PATTERN = re.compile(r'[<>:"/\\|?*\x00-\x1f]+')
UNSUPPORTED_FILENAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")
SEPARATOR_RUN_PATTERN = re.compile(r"[\s_-]+")
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}


def _normalize_separator(separator: str) -> str:
    return "-" if separator == "-" else "_"


def _clamp_int(value: Any, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = minimum

    return max(minimum, min(number, maximum))


def _sanitize_segment(value: Any, separator: str, lowercase: bool) -> str:
    text = "" if value is None else str(value)
    text = text.strip()
    text = WINDOWS_UNSAFE_PATTERN.sub(separator, text)
    text = UNSUPPORTED_FILENAME_PATTERN.sub(separator, text)
    text = SEPARATOR_RUN_PATTERN.sub(separator, text)
    text = text.strip(f"{separator}. ")

    if lowercase:
        text = text.lower()

    if not text:
        return DEFAULT_SEGMENT

    if text.upper() in WINDOWS_RESERVED_NAMES:
        return f"{text}{separator}file"

    return text


def format_doss_filename(
    topic: str,
    title: str,
    date_day: int,
    date_month: int,
    date_year: int,
    separator: str,
    lowercase: bool,
) -> str:
    separator = _normalize_separator(separator)
    topic_part = _sanitize_segment(topic, separator, lowercase)
    title_part = _sanitize_segment(title, separator, lowercase)
    day = _clamp_int(date_day, 1, 31)
    month = _clamp_int(date_month, 1, 12)
    year = _clamp_int(date_year, 1, 9999)

    return separator.join(
        [
            topic_part,
            title_part,
            f"{day:02d}",
            f"{month:02d}",
            f"{year:04d}",
        ]
    )


class DossFileNameFormatter:
    """Generate a standardized, Windows-safe filename stem for ComfyUI outputs."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "topic": (
                    "STRING",
                    {
                        "default": "text to image",
                        "multiline": False,
                    },
                ),
                "title": (
                    "STRING",
                    {
                        "default": "production workflow",
                        "multiline": False,
                    },
                ),
                "date_day": (
                    "INT",
                    {
                        "default": 2,
                        "min": 1,
                        "max": 31,
                        "step": 1,
                    },
                ),
                "date_month": (
                    "INT",
                    {
                        "default": 6,
                        "min": 1,
                        "max": 12,
                        "step": 1,
                    },
                ),
                "date_year": (
                    "INT",
                    {
                        "default": 2026,
                        "min": 1,
                        "max": 9999,
                        "step": 1,
                    },
                ),
                "separator": (["_", "-"], {"default": "_"}),
                "lowercase": (
                    "BOOLEAN",
                    {
                        "default": True,
                    },
                ),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("filename",)
    FUNCTION = "format_filename"
    CATEGORY = "Doss Node Suite / Utilities"
    DESCRIPTION = "Generate a standardized, Windows-safe filename string."

    def format_filename(
        self,
        topic: str,
        title: str,
        date_day: int,
        date_month: int,
        date_year: int,
        separator: str,
        lowercase: bool,
    ):
        filename = format_doss_filename(
            topic=topic,
            title=title,
            date_day=date_day,
            date_month=date_month,
            date_year=date_year,
            separator=separator,
            lowercase=lowercase,
        )
        return (filename,)
