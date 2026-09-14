from __future__ import annotations

import torch

try:
    from ..core.controls import indices as parse_indices, json_text, table_rows
    from ..core.tensors import image_tensor, mask_tensor
except ImportError:
    from core.controls import indices as parse_indices, json_text, table_rows
    from core.tensors import image_tensor, mask_tensor
from .foundation_image import integer


KINDS = ["IMAGE", "MASK", "LATENT", "AUDIO", "VIDEO", "MODEL", "CLIP", "VAE", "CONDITIONING", "STRING", "INT", "FLOAT", "BOOLEAN"]


def check_kind(value, kind):
    if kind not in KINDS: raise ValueError("Unknown data type.")
    if kind == "IMAGE": image_tensor(value)
    elif kind == "MASK": mask_tensor(value)
    elif kind in ("INT", "FLOAT", "BOOLEAN", "STRING"):
        expected = {"INT": int, "FLOAT": float, "BOOLEAN": bool, "STRING": str}[kind]
        if type(value) is not expected: raise ValueError(f"Selected value must be {kind}.")
    elif kind == "LATENT" and (not isinstance(value, dict) or "samples" not in value): raise ValueError("Selected value must be a LATENT dictionary.")
    elif kind == "AUDIO" and (not isinstance(value, dict) or "waveform" not in value): raise ValueError("Selected value must be AUDIO.")
    elif kind == "VIDEO" and not hasattr(value, "get_components"): raise ValueError("Selected value must be a native VIDEO.")
    return value


class WorkflowNode:
    FUNCTION = "execute"
    CATEGORY = "⚡ Doss Node Suite/Workflow"


class DossTypedSwitch(WorkflowNode):
    DESCRIPTION = "Select A or B of an explicit native type. Only the selected branch executes. Change data_type before connecting; incompatible links are rejected."
    RETURN_TYPES = ("*",)
    RETURN_NAMES = ("selected",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"data_type": (KINDS,), "select": (["a", "b"],), "a": ("*", {"lazy": True}), "b": ("*", {"lazy": True})}}

    @classmethod
    def VALIDATE_INPUTS(cls, input_types, data_type):
        for name in ("a", "b"):
            if input_types.get(name) not in (None, "*", data_type):
                return f"{name} is {input_types[name]}; the switch is set to {data_type}."
        return True

    def check_lazy_status(self, data_type, select, a=None, b=None):
        if select not in ("a", "b"): raise ValueError("Select must be a or b.")
        return [select] if (a if select == "a" else b) is None else []

    def execute(self, data_type, select="a", a=None, b=None):
        if select not in ("a", "b"): raise ValueError("Select must be a or b.")
        value = a if select == "a" else b
        if value is None: raise ValueError("The selected branch did not produce a value.")
        return (check_kind(value, data_type),)


class DossBatchSelect(WorkflowNode):
    DESCRIPTION = "Select image or mask items using comma-separated indices and slices such as 0,2,4:10:2. Negative indices count from the end; duplicates preserve requested order."
    RETURN_TYPES = ("*", "STRING")
    RETURN_NAMES = ("selected", "selection_json")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"data_type": (["IMAGE", "MASK"],), "batch": ("IMAGE,MASK",), "indices": ("STRING", {"default": "0"})}}

    def execute(self, data_type, batch, indices="0"):
        check_kind(batch, data_type)
        selected = parse_indices(indices, len(batch))
        result = batch.index_select(0, torch.tensor(selected, device=batch.device))
        return {"ui": {"text": [f"Selected {len(selected)} of {len(batch)}: {selected}"]}, "result": (result, json_text(selected))}


class DossBatchJoin(WorkflowNode):
    DESCRIPTION = "Concatenate two compatible image or mask batches. Dimensions, channels, dtype, and device must agree. Never silently resizes or converts your inputs."
    RETURN_TYPES = ("*", "INT")
    RETURN_NAMES = ("batch", "count")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"data_type": (["IMAGE", "MASK"],), "a": ("IMAGE,MASK",), "b": ("IMAGE,MASK",)}}

    def execute(self, data_type, a, b):
        check_kind(a, data_type)
        check_kind(b, data_type)
        if a.shape[1:] != b.shape[1:] or a.dtype != b.dtype or a.device != b.device:
            raise ValueError(f"Batches must match shape, dtype, and device. A: {tuple(a.shape)}, {a.dtype}, {a.device}; B: {tuple(b.shape)}, {b.dtype}, {b.device}.")
        result = torch.cat((a, b), 0)
        return result, len(result)


class DossTableInput(WorkflowNode):
    DESCRIPTION = "Select one row from CSV with a header or a JSON array of objects. Pair row_json with Text Toolkit → json_field; row_index is explicit and repeatable."
    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("row_json", "row_count")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"table": ("STRING", {"default": "prompt,seed\nA sailboat at sunrise,42\nA cabin in snow,43", "multiline": True}), "format": (["csv", "json"],), "row_index": integer(0, 0, 9999)}}

    def execute(self, table, format="csv", row_index=0):
        rows = table_rows(table, format)
        if not 0 <= row_index < len(rows): raise ValueError(f"Row index must be 0..{len(rows) - 1}.")
        row = json_text(rows[row_index])
        return {"ui": {"text": [f"Row {row_index + 1}/{len(rows)}: {row}"]}, "result": (row, len(rows))}


def inspect_value(value):
    if isinstance(value, torch.Tensor):
        result = {"type": "tensor", "shape": list(value.shape), "dtype": str(value.dtype), "device": str(value.device), "elements": value.numel(), "bytes": value.numel() * value.element_size()}
        if value.numel() and (value.is_floating_point() or value.is_complex()):
            if value.is_complex(): result["complex"] = True
            else:
                finite = torch.isfinite(value)
                result["non_finite"] = int((~finite).sum().item())
                if finite.any():
                    result["min"] = float(torch.where(finite, value, float("inf")).min().item())
                    result["max"] = float(torch.where(finite, value, -float("inf")).max().item())
        return result
    if isinstance(value, dict):
        return {"type": "mapping", "keys": sorted(str(k) for k in value), "tensors": {str(k): inspect_value(v) for k, v in value.items() if isinstance(v, torch.Tensor)}}
    if hasattr(value, "get_dimensions") and hasattr(value, "get_frame_rate"):
        return {"type": "VIDEO", "dimensions": value.get_dimensions(), "fps": float(value.get_frame_rate()), "duration_seconds": value.get_duration()}
    return {"type": type(value).__name__, "length": len(value) if isinstance(value, (str, list, tuple)) else None}


class DossInspector(WorkflowNode):
    CATEGORY = "⚡ Doss Node Suite/Diagnostics"
    DESCRIPTION = "Inspect tensor dimensions, devices, ranges, and non-finite counts without changing the input. Reports structure rather than prompt text, credentials, or tensor contents."
    RETURN_TYPES = ("*", "STRING")
    RETURN_NAMES = ("value", "report_json")
    OUTPUT_NODE = True

    @classmethod
    def INPUT_TYPES(cls): return {"required": {"value": ("*",)}}

    def execute(self, value):
        report = json_text(inspect_value(value))
        return {"ui": {"text": [report]}, "result": (value, report)}


NODES = {cls.__name__: cls for cls in (DossTypedSwitch, DossBatchSelect, DossBatchJoin, DossTableInput, DossInspector)}
