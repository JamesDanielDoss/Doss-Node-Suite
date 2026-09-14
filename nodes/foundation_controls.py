from __future__ import annotations

import math
import re

try:
    from ..core.controls import bounded_text, json_text, parse_json, schedule_points, value_at
    from ..core.tensors import finite_number
except ImportError:
    from core.controls import bounded_text, json_text, parse_json, schedule_points, value_at
    from core.tensors import finite_number
from .foundation_image import integer, number


class ControlNode:
    FUNCTION = "execute"
    CATEGORY = "⚡ Doss Node Suite/Prompts"


class DossPromptRecipe(ControlNode):
    DESCRIPTION = "Assemble ordered named sections. JSON entries use name, text, and optional enabled. Returns exact text and a recipe record; no AI or model is needed."
    RETURN_TYPES = ("STRING", "STRING")
    RETURN_NAMES = ("prompt", "recipe_json")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"sections": ("STRING", {"multiline": True, "default": '[{"name":"Subject","text":"A small sailboat on a mountain lake"},{"name":"Light","text":"Soft sunrise light"}]'}), "separator": ("STRING", {"default": ", "}), "prefix": ("STRING", {"default": ""}), "suffix": ("STRING", {"default": ""})}}

    def execute(self, sections, separator=", ", prefix="", suffix=""):
        entries = parse_json(sections, "Sections")
        if not isinstance(entries, list) or len(entries) > 128: raise ValueError("Sections must be an array of up to 128 named entries.")
        text = []
        for entry in entries:
            if not isinstance(entry, dict) or not isinstance(entry.get("name"), str) or not isinstance(entry.get("text"), str):
                raise ValueError("Each section needs a text name and text content.")
            if entry.get("enabled", True) and entry["text"].strip(): text.append(entry["text"].strip())
        prompt = bounded_text(prefix + separator.join(text) + suffix, "Assembled prompt")
        record = json_text({"schema_version": 1, "sections": entries, "separator": separator, "prefix": prefix, "suffix": suffix})
        return {"ui": {"text": [prompt]}, "result": (prompt, record)}


class DossTextToolkit(ControlNode):
    DESCRIPTION = "Clean whitespace, replace literal text, join strings, or extract a dotted JSON path (arrays use numeric indices). Never evaluates code or regular expressions."
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"text": ("STRING", {"default": "", "multiline": True}), "operation": (["cleanup", "replace", "join", "json_field"],), "argument": ("STRING", {"default": "", "tooltip": "Text to find; join separator; or JSON path such as prompt.subject."}), "replacement": ("STRING", {"default": "", "multiline": True, "tooltip": "Replacement text, or the second text to join."})}}

    def execute(self, text, operation="cleanup", argument="", replacement=""):
        text, argument, replacement = bounded_text(text), bounded_text(argument), bounded_text(replacement)
        if operation == "cleanup": result = re.sub(r"\s+", " ", text).strip()
        elif operation == "replace":
            if not argument: raise ValueError("Find text cannot be empty.")
            if len(text) + text.count(argument) * max(0, len(replacement) - len(argument)) > 1_000_000: raise ValueError("Replacement would exceed the text limit.")
            result = text.replace(argument, replacement)
        elif operation == "join": result = text + argument + replacement
        elif operation == "json_field":
            result = parse_json(text)
            for key in argument.split(".") if argument else []:
                try: result = result[int(key)] if isinstance(result, list) else result[key]
                except (KeyError, IndexError, TypeError, ValueError) as error: raise ValueError(f"JSON path '{argument}' does not exist.") from error
            if not isinstance(result, str): result = json_text(result)
        else: raise ValueError("Unknown text operation.")
        return (bounded_text(result),)


class DossSeedSequence(ControlNode):
    DESCRIPTION = "Derive a repeatable seed from base + index × step, wrapping at 2^53. This range round-trips exactly through browser workflow JSON."
    RETURN_TYPES = ("INT",)
    RETURN_NAMES = ("seed",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"base_seed": integer(0, 0, 2**53 - 1), "index": integer(0, 0, 2**31 - 1), "step": integer(1, -2**31, 2**31 - 1)}}

    def execute(self, base_seed=0, index=0, step=1):
        if not 0 <= base_seed < 2**53 or not 0 <= index < 2**31: raise ValueError("Base seed or index is outside its supported range.")
        return ((int(base_seed) + int(index) * int(step)) % 2**53,)


class DossValueSchedule(ControlNode):
    DESCRIPTION = "Evaluate ordered [index,value] keyframes with linear or stepped interpolation. Holds endpoints outside the range; supplies curve data to the node preview."
    RETURN_TYPES = ("FLOAT", "STRING")
    RETURN_NAMES = ("value", "schedule_json")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"keyframes": ("STRING", {"default": "[[0,0],[24,1],[48,0]]", "multiline": True}), "index": number(0, 0, 1e9, 1), "interpolation": (["linear", "step"],)}}

    def execute(self, keyframes, index=0, interpolation="linear"):
        points = schedule_points(keyframes)
        value = value_at(points, float(index), interpolation)
        return {"ui": {"doss_curve": [{"points": points, "index": index, "value": value, "interpolation": interpolation}], "text": [f"Value: {value:g}"]}, "result": (value, json_text({"schema_version": 1, "keyframes": points, "interpolation": interpolation}))}


MODEL_CATEGORIES = ["checkpoints", "diffusion_models", "text_encoders", "vae", "loras", "upscale_models", "controlnet"]


def model_inventory(category="all", contains=""):
    import folder_paths
    categories = MODEL_CATEGORIES if category == "all" else [category]
    if any(c not in MODEL_CATEGORIES for c in categories): raise ValueError("Unknown model category.")
    result = {}
    for name in categories:
        try: files = folder_paths.get_filename_list(name)
        except KeyError: files = []
        result[name] = sorted(str(path) for path in files if contains.casefold() in str(path).casefold())
    return {"schema_version": 1, "models": result, "count": sum(map(len, result.values()))}


class DossModelInventory(ControlNode):
    CATEGORY = "⚡ Doss Node Suite/Generation"
    DESCRIPTION = "List installed model names by category without loading weights, downloading files, or exposing absolute filesystem paths. Refreshes each run."
    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("inventory_json", "count")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"category": (["all", *MODEL_CATEGORIES],), "contains": ("STRING", {"default": ""})}}

    @classmethod
    def IS_CHANGED(cls, **kwargs): return float("nan")

    def execute(self, category="all", contains=""):
        data = model_inventory(category, contains)
        report = json_text(data)
        return {"ui": {"text": [report]}, "result": (report, data["count"])}


def sampling_choices():
    try:
        import comfy.samplers
        return list(comfy.samplers.KSampler.SAMPLERS), list(comfy.samplers.KSampler.SCHEDULERS)
    except ImportError:
        return ["euler"], ["normal"]


class DossSamplingPreset(ControlNode):
    CATEGORY = "⚡ Doss Node Suite/Generation"
    DESCRIPTION = "Keep sampling parameters together while wiring each value to standard sampler inputs. Saves exact settings, without changing the model or assuming an optimal preset."
    RETURN_TYPES = ("INT", "FLOAT", *sampling_choices(), "FLOAT", "STRING")
    RETURN_NAMES = ("steps", "cfg", "sampler_name", "scheduler", "denoise", "settings_json")

    @classmethod
    def INPUT_TYPES(cls):
        samplers, schedulers = sampling_choices()
        return {"required": {"steps": integer(20, 1, 10000), "cfg": number(7, 0, 100, 0.1), "sampler_name": (samplers,), "scheduler": (schedulers,), "denoise": number(1)}}

    def execute(self, steps=20, cfg=7, sampler_name="euler", scheduler="normal", denoise=1):
        if not 1 <= steps <= 10000: raise ValueError("Steps must be 1..10000.")
        cfg, denoise = finite_number(cfg, "CFG", 0, 100), finite_number(denoise, "Denoise", 0, 1)
        data = {"schema_version": 1, "steps": steps, "cfg": cfg, "sampler_name": sampler_name, "scheduler": scheduler, "denoise": denoise}
        return steps, cfg, sampler_name, scheduler, denoise, json_text(data)


class DossResolutionPlan(ControlNode):
    CATEGORY = "⚡ Doss Node Suite/Generation"
    DESCRIPTION = "Set a target long edge and aspect ratio, then snap dimensions to an explicit multiple. Reports the resulting aspect error; does not infer model requirements."
    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "report")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"aspect_width": integer(16, 1), "aspect_height": integer(9, 1), "long_edge": integer(1024, 1), "multiple": ([1, 8, 16, 32, 64],), "rounding": (["nearest", "down", "up"],)}}

    def execute(self, aspect_width=16, aspect_height=9, long_edge=1024, multiple=64, rounding="nearest"):
        multiple = int(multiple)
        if min(aspect_width, aspect_height, long_edge) < 1 or max(aspect_width, aspect_height, long_edge) > 16384 or multiple not in (1, 8, 16, 32, 64): raise ValueError("Dimensions must be 1..16384 and multiple one of 1,8,16,32,64.")
        if rounding not in ("nearest", "down", "up"): raise ValueError("Unknown rounding mode.")
        fn = {"nearest": lambda n: math.floor(n + 0.5), "down": math.floor, "up": math.ceil}[rounding]
        scale = long_edge / max(aspect_width, aspect_height)
        w, h = [max(multiple, int(fn(v * scale / multiple)) * multiple) for v in (aspect_width, aspect_height)]
        report = json_text({"width": w, "height": h, "multiple": multiple, "megapixels": w * h / 1e6, "aspect_error_percent": 100 * ((w / h) / (aspect_width / aspect_height) - 1)})
        return {"ui": {"text": [report]}, "result": (w, h, report)}


NODES = {cls.__name__: cls for cls in (DossPromptRecipe, DossTextToolkit, DossSeedSequence, DossValueSchedule, DossModelInventory, DossSamplingPreset, DossResolutionPlan)}
