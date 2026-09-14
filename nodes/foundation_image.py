from __future__ import annotations

import torch

try:
    from ..core import tensors as T
except ImportError:
    from core import tensors as T


def integer(default, low=0, high=16384, tooltip=""):
    return ("INT", {"default": default, "min": low, "max": high, "tooltip": tooltip})


def number(default, low=0.0, high=1.0, step=0.01, tooltip=""):
    return ("FLOAT", {"default": default, "min": low, "max": high, "step": step, "tooltip": tooltip})


class ImageNode:
    FUNCTION = "execute"
    CATEGORY = "⚡ Doss Node Suite/Image"


class DossCanvasPrep(ImageNode):
    DESCRIPTION = "Fit, fill, or stretch an image and mask together. Fit pads; fill center-crops. An absent mask means the entire source is selected."
    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",), "width": integer(1024, 1), "height": integer(1024, 1), "mode": (["fit", "fill", "stretch"],), "background": ("STRING", {"default": "#000000"})}, "optional": {"mask": ("MASK",)}}

    def execute(self, image, width, height, mode="fit", background="#000000", mask=None):
        return T.canvas_prep(image, width, height, mode, background, mask)


class DossImageTransform(ImageNode):
    DESCRIPTION = "Translate, rotate clockwise, and scale an image and its mask around their center with identical geometry. Exposed edges become zero."
    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "mask")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",), "x": number(0, -16384, 16384, 1, "Horizontal offset in pixels."), "y": number(0, -16384, 16384, 1, "Vertical offset in pixels."), "rotation": number(0, -360, 360, 1, "Clockwise degrees."), "scale": number(1, 0.001, 100)}, "optional": {"mask": ("MASK",)}}

    def execute(self, image, x=0, y=0, rotation=0, scale=1, mask=None):
        return T.transform_image(image, x, y, rotation, scale, mask)


class DossLayerComposite(ImageNode):
    DESCRIPTION = "Place a foreground using pixel offsets and an optional white-is-selected mask. Supports singleton foreground batches and RGBA alpha."
    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("image", "coverage")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"background": ("IMAGE",), "foreground": ("IMAGE",), "x": integer(0, -16384), "y": integer(0, -16384), "opacity": number(1), "blend": (["normal", "multiply", "screen"],)}, "optional": {"mask": ("MASK",)}}

    def execute(self, background, foreground, x=0, y=0, opacity=1, blend="normal", mask=None):
        return T.composite(background, foreground, mask, x, y, opacity, blend)


class DossColorMatch(ImageNode):
    DESCRIPTION = "Match per-channel RGB means and standard deviations to a reference. Strength blends the correction; alpha is preserved. Connect to Doss Image Comparer to review."
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",), "reference": ("IMAGE",), "strength": number(1)}}

    def execute(self, image, reference, strength=1):
        return (T.color_match(image, reference, strength),)


class DossMaskRefine(ImageNode):
    CATEGORY = "⚡ Doss Node Suite/Masks"
    DESCRIPTION = "Refine in this order: grow/shrink, Gaussian feather, optional threshold. White pixels select an area."
    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("mask",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"mask": ("MASK",), "grow": integer(0, -128, 128), "feather": integer(0, 0, 128), "apply_threshold": ("BOOLEAN", {"default": False}), "threshold": number(0.5)}}

    def execute(self, mask, grow=0, feather=0, apply_threshold=False, threshold=0.5):
        return (T.refine_mask(mask, grow, feather, apply_threshold, threshold),)


class DossMaskCombine(ImageNode):
    CATEGORY = "⚡ Doss Node Suite/Masks"
    DESCRIPTION = "Combine equal-sized masks: union=max, intersection=min, subtract=clamped A-B, difference=abs(A-B). A single mask can broadcast over a batch."
    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("mask",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"mask_a": ("MASK",), "mask_b": ("MASK",), "operation": (["union", "intersection", "subtract", "difference"],)}}

    def execute(self, mask_a, mask_b, operation="union"):
        a, b = T.mask_tensor(mask_a, "mask_a"), T.mask_tensor(mask_b, "mask_b")
        if a.shape[1:] != b.shape[1:]:
            raise ValueError("Masks must have the same width and height.")
        count = max(a.shape[0], b.shape[0])
        a, b = T.batch_match(a, count, "mask_a"), T.batch_match(b, count, "mask_b").to(a)
        if operation == "union": result = torch.maximum(a, b)
        elif operation == "intersection": result = torch.minimum(a, b)
        elif operation == "subtract": result = (a - b).clamp(0, 1)
        elif operation == "difference": result = (a - b).abs()
        else: raise ValueError("Unknown mask operation.")
        return (result,)


class DossMaskPreview(ImageNode):
    CATEGORY = "⚡ Doss Node Suite/Masks"
    DESCRIPTION = "Create a colored mask overlay and pass the original mask through. Connect overlay to Preview Image or Doss Image Comparer."
    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("overlay", "mask")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",), "mask": ("MASK",), "color": ("STRING", {"default": "#35d5a4"}), "opacity": number(0.5)}}

    def execute(self, image, mask, color="#35d5a4", opacity=0.5):
        image = T.image_tensor(image)
        alpha = T.matching_mask(image, mask)[..., None] * T.finite_number(opacity, "Opacity", 0, 1)
        result = image.clone()
        result[..., :3] = torch.lerp(image[..., :3], image.new_tensor(T.color_rgb(color)), alpha)
        return result, mask


class DossMaskFromChannels(ImageNode):
    CATEGORY = "⚡ Doss Node Suite/Masks"
    DESCRIPTION = "Select pixels within an inclusive channel/luminance range. Alpha requires an RGBA image; core Load Image supplies transparency separately as a mask."
    RETURN_TYPES = ("MASK",)
    RETURN_NAMES = ("mask",)

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"image": ("IMAGE",), "channel": (["luminance", "red", "green", "blue", "alpha"],), "low": number(0.5), "high": number(1), "invert": ("BOOLEAN", {"default": False})}}

    def execute(self, image, channel="luminance", low=0.5, high=1, invert=False):
        image = T.image_tensor(image)
        low, high = T.finite_number(low, "Low", 0, 1), T.finite_number(high, "High", 0, 1)
        if low > high: raise ValueError("Low must not exceed high.")
        if channel == "luminance": value = (image[..., :3] * image.new_tensor([0.2126, 0.7152, 0.0722])).sum(-1)
        elif channel in ("red", "green", "blue", "alpha"):
            index = ("red", "green", "blue", "alpha").index(channel)
            if index >= image.shape[-1]: raise ValueError("Alpha selection requires an RGBA image.")
            value = image[..., index]
        else: raise ValueError("Unknown channel.")
        result = ((value >= low) & (value <= high)).to(image.dtype)
        return (1 - result if invert else result,)


NODES = {cls.__name__: cls for cls in (DossCanvasPrep, DossImageTransform, DossLayerComposite, DossColorMatch, DossMaskRefine, DossMaskCombine, DossMaskPreview, DossMaskFromChannels)}
