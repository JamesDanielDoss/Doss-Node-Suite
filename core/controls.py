from __future__ import annotations

import csv
import io
import json
import math
import re


MAX_TEXT = 1_000_000


def bounded_text(value: str, name="Text") -> str:
    if not isinstance(value, str) or len(value) > MAX_TEXT:
        raise ValueError(f"{name} must be text no longer than {MAX_TEXT:,} characters.")
    return value


def parse_json(value: str, name="JSON"):
    try:
        return json.loads(bounded_text(value, name), parse_constant=lambda s: (_ for _ in ()).throw(ValueError(f"{name} cannot contain {s}.")))
    except (json.JSONDecodeError, RecursionError) as error:
        raise ValueError(f"{name} is not valid JSON: {error}") from error


def json_text(value) -> str:
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def indices(text: str, count: int) -> list[int]:
    bounded_text(text, "Indices")
    if count < 1:
        raise ValueError("The batch is empty.")
    if not text.strip():
        raise ValueError("Enter indices such as 0,2,4 or a Python-style slice 0:8:2.")
    result = []
    for entry in text.split(","):
        entry = entry.strip()
        if ":" in entry:
            parts = entry.split(":")
            if not 2 <= len(parts) <= 3:
                raise ValueError(f"Invalid slice: {entry}")
            try:
                values = [int(p) if p else None for p in parts]
                step = values[2] if len(values) == 3 else None
                if step == 0: raise ValueError("Slice step cannot be zero.")
                selected = range(*slice(values[0], values[1], step).indices(count))
            except ValueError as error:
                raise ValueError(f"Invalid slice: {entry}") from error
            if len(result) + len(selected) > 4096:
                raise ValueError("Selections are limited to 4096 items.")
            result.extend(selected)
        else:
            try: index = int(entry)
            except ValueError as error: raise ValueError(f"Invalid index: {entry}") from error
            if index < 0: index += count
            if not 0 <= index < count: raise ValueError(f"Index {entry} is outside a batch of {count} items.")
            result.append(index)
        if len(result) > 4096: raise ValueError("Selections are limited to 4096 items.")
    if not result: raise ValueError("Selection contains no items.")
    return result


def table_rows(text: str, format: str) -> list[dict]:
    bounded_text(text, "Table")
    if format == "json":
        rows = parse_json(text, "Table")
        if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
            raise ValueError("JSON table must be an array of row objects.")
    elif format == "csv":
        reader = csv.DictReader(io.StringIO(text, newline=""))
        fields = reader.fieldnames
        if not fields or any(not field.strip() for field in fields) or len(set(fields)) != len(fields):
            raise ValueError("CSV needs a header with unique, nonempty column names.")
        rows = list(reader)
        if any(None in row or any(value is None for value in row.values()) for row in rows):
            raise ValueError("Each CSV row must have the same number of columns as the header.")
    else:
        raise ValueError("Table format must be csv or json.")
    if not 1 <= len(rows) <= 10000:
        raise ValueError("Table must contain between 1 and 10,000 rows.")
    return rows


def schedule_points(text: str) -> list[tuple[float, float]]:
    payload = parse_json(text, "Keyframes")
    if not isinstance(payload, list) or not 1 <= len(payload) <= 256:
        raise ValueError("Keyframes must contain 1..256 [index, value] pairs.")
    points = []
    for point in payload:
        if not isinstance(point, list) or len(point) != 2:
            raise ValueError("Every keyframe must be [index, value].")
        try: x, y = float(point[0]), float(point[1])
        except (TypeError, ValueError) as error: raise ValueError("Keyframes must be numeric.") from error
        if not math.isfinite(x) or not math.isfinite(y) or x < 0:
            raise ValueError("Keyframe indices must be nonnegative and values finite.")
        if points and x <= points[-1][0]:
            raise ValueError("Keyframes must have strictly increasing indices.")
        points.append((x, y))
    return points


def value_at(points, index: float, interpolation="linear") -> float:
    if interpolation not in ("linear", "step"): raise ValueError("Interpolation must be linear or step.")
    if not math.isfinite(index) or index < 0: raise ValueError("Index must be finite and nonnegative.")
    if index <= points[0][0]: return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if index < x1:
            return y0 if interpolation == "step" else y0 + (y1 - y0) * (index - x0) / (x1 - x0)
    return points[-1][1]


def redact(value, depth=0):
    """Remove credential fields from run records without changing workflow node IDs."""
    if depth > 40: return "[depth limit]"
    if isinstance(value, dict):
        return {str(k): "[redacted]" if re.search(r"password|secret|authorization|api[_-]?key|access[_-]?token|auth[_-]?token|cookie", str(k), re.I) else redact(v, depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)): return [redact(v, depth + 1) for v in value]
    if isinstance(value, str):
        return re.sub(r"\b(?:hf_[a-zA-Z0-9]{16,}|gh[pousr]_[a-zA-Z0-9]{16,}|github_pat_[a-zA-Z0-9_]{16,}|sk-[a-zA-Z0-9_-]{16,})\b", "[redacted]", value)
    if value is None or isinstance(value, (bool, int)): return value
    if isinstance(value, float): return value if math.isfinite(value) else str(value)
    return f"[{type(value).__name__}]"
