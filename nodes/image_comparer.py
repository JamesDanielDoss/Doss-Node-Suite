from __future__ import annotations

from typing import Any

try:
    from nodes import PreviewImage as ComfyPreviewImage
except Exception:  # pragma: no cover - ComfyUI provides this at runtime.
    ComfyPreviewImage = object


COMPARER_MODES = ("Side By Side", "Slide", "Click")
DEFAULT_COMPARER_MODE = COMPARER_MODES[0]


def _batch_length(image: Any) -> int:
    if image is None:
        return 0

    try:
        return len(image)
    except TypeError:
        return 1


def _slice_batch(image: Any, index: int) -> Any:
    if image is None:
        return None

    try:
        return image[index : index + 1]
    except Exception:
        return image


def normalize_comparer_mode(comparer_mode: str) -> str:
    if comparer_mode in COMPARER_MODES:
        return comparer_mode

    return DEFAULT_COMPARER_MODE


def choose_comparison_images(image_a: Any, image_b: Any = None) -> tuple[Any, Any, Any]:
    """Return image_a, image_b, selected_image outputs for the comparer."""

    if image_a is None and image_b is not None:
        image_a = image_b

    if image_b is None and _batch_length(image_a) >= 2:
        output_a = _slice_batch(image_a, 0)
        output_b = _slice_batch(image_a, 1)
    else:
        output_a = image_a
        output_b = image_b if image_b is not None else image_a

    selected_image = output_a
    return output_a, output_b, selected_image


class DossImageComparer(ComfyPreviewImage):
    """Compare two IMAGE inputs visually while passing tensors through."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image_a": ("IMAGE",),
                "comparer_mode": (list(COMPARER_MODES), {"default": DEFAULT_COMPARER_MODE}),
            },
            "optional": {
                "image_b": ("IMAGE",),
            },
            "hidden": {
                "prompt": "PROMPT",
                "extra_pnginfo": "EXTRA_PNGINFO",
            },
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE")
    RETURN_NAMES = ("image_a", "image_b", "selected_image")
    FUNCTION = "compare_images"
    CATEGORY = "Doss Node Suite / Image"
    OUTPUT_NODE = True
    DESCRIPTION = "Compare two images visually and pass the selected tensors through."

    def compare_images(
        self,
        image_a,
        comparer_mode=DEFAULT_COMPARER_MODE,
        image_b=None,
        prompt=None,
        extra_pnginfo=None,
    ):
        comparer_mode = normalize_comparer_mode(comparer_mode)
        output_a, output_b, selected_image = choose_comparison_images(image_a, image_b)

        ui = {
            "a_images": self._preview_images(output_a, "doss.compare.a.", prompt, extra_pnginfo),
            "b_images": self._preview_images(output_b, "doss.compare.b.", prompt, extra_pnginfo),
            "comparer_mode": [comparer_mode],
        }
        ui["images"] = [*ui["a_images"], *ui["b_images"]]

        return {
            "ui": ui,
            "result": (output_a, output_b, selected_image),
        }

    def _preview_images(self, images, filename_prefix, prompt, extra_pnginfo):
        if images is None or _batch_length(images) == 0 or not hasattr(self, "save_images"):
            return []

        try:
            result = self.save_images(images, filename_prefix, prompt, extra_pnginfo)
        except Exception:
            return []

        return result.get("ui", {}).get("images", [])
