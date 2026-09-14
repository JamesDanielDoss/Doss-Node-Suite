from __future__ import annotations

import math
import re

import torch
import torch.nn.functional as F


def image_tensor(value: torch.Tensor, name: str = "image") -> torch.Tensor:
    if not isinstance(value, torch.Tensor) or value.ndim != 4 or value.shape[-1] not in (3, 4):
        raise ValueError(f"{name} must be an IMAGE tensor [batch, height, width, 3 or 4].")
    if min(value.shape) < 1 or not value.is_floating_point():
        raise ValueError(f"{name} must contain at least one floating-point image.")
    if not torch.isfinite(value).all():
        raise ValueError(f"{name} contains NaN or infinity; inspect its upstream source.")
    return value


def mask_tensor(value: torch.Tensor, name: str = "mask") -> torch.Tensor:
    if not isinstance(value, torch.Tensor) or value.ndim != 3 or min(value.shape) < 1:
        raise ValueError(f"{name} must be a nonempty MASK tensor [batch, height, width].")
    if not value.is_floating_point() or not torch.isfinite(value).all():
        raise ValueError(f"{name} must contain finite floating-point values.")
    return value.clamp(0, 1)


def matching_mask(image: torch.Tensor, mask: torch.Tensor | None) -> torch.Tensor:
    if mask is None:
        return torch.ones(image.shape[:3], device=image.device, dtype=image.dtype)
    mask = mask_tensor(mask)
    if mask.shape[1:3] != image.shape[1:3] or mask.shape[0] not in (1, image.shape[0]):
        raise ValueError("Mask must match image dimensions and have one mask or one per image. Use Canvas Prep first.")
    return mask.to(device=image.device, dtype=image.dtype).expand(image.shape[:3])


def batch_match(value: torch.Tensor, count: int, name: str) -> torch.Tensor:
    if value.shape[0] not in (1, count):
        raise ValueError(f"{name} has {value.shape[0]} items; expected 1 or {count}.")
    return value.expand(count, *value.shape[1:])


def color_rgb(text: str) -> tuple[float, float, float]:
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", text):
        raise ValueError("Color must be a hex value such as #18202e.")
    return tuple(int(text[i:i + 2], 16) / 255 for i in (1, 3, 5))


def finite_number(value: float, name: str, low: float | None = None, high: float | None = None) -> float:
    value = float(value)
    if not math.isfinite(value) or (low is not None and value < low) or (high is not None and value > high):
        raise ValueError(f"{name} must be finite" + (f" and at least {low}" if low is not None else "") + (f" and at most {high}" if high is not None else "") + ".")
    return value


def resize_image(image: torch.Tensor, width: int, height: int) -> torch.Tensor:
    result = F.interpolate(image.movedim(-1, 1).float(), size=(height, width), mode="bilinear", align_corners=False, antialias=True)
    return result.movedim(1, -1).to(image.dtype)


def resize_mask(mask: torch.Tensor, width: int, height: int) -> torch.Tensor:
    return F.interpolate(mask[:, None].float(), size=(height, width), mode="bilinear", align_corners=False, antialias=True)[:, 0].to(mask.dtype)


def canvas_prep(image, width, height, mode="fit", background="#000000", mask=None):
    image = image_tensor(image)
    if not 1 <= width <= 16384 or not 1 <= height <= 16384:
        raise ValueError("Canvas width and height must be between 1 and 16384 pixels.")
    if mode not in ("fit", "fill", "stretch"):
        raise ValueError("Canvas mode must be fit, fill, or stretch.")
    mask = matching_mask(image, mask)
    batch, ih, iw, channels = image.shape
    if mode == "stretch":
        return resize_image(image, width, height), resize_mask(mask, width, height)
    scale = (min if mode == "fit" else max)(width / iw, height / ih)
    rw, rh = max(1, round(iw * scale)), max(1, round(ih * scale))
    rgb = color_rgb(background)
    fill = image.new_tensor((*rgb, 1.0) if channels == 4 else rgb)
    output = fill.expand(batch, height, width, channels).clone()
    output_mask = image.new_zeros((batch, height, width))
    resized, resized_mask = resize_image(image, rw, rh), resize_mask(mask, rw, rh)
    sx, sy = max(0, (rw - width) // 2), max(0, (rh - height) // 2)
    dx, dy = max(0, (width - rw) // 2), max(0, (height - rh) // 2)
    cw, ch = min(width, rw), min(height, rh)
    output[:, dy:dy + ch, dx:dx + cw] = resized[:, sy:sy + ch, sx:sx + cw]
    output_mask[:, dy:dy + ch, dx:dx + cw] = resized_mask[:, sy:sy + ch, sx:sx + cw]
    return output, output_mask


def transform_image(image, x=0.0, y=0.0, rotation=0.0, scale=1.0, mask=None):
    image = image_tensor(image)
    mask = matching_mask(image, mask)
    x, y = finite_number(x, "X"), finite_number(y, "Y")
    angle = math.radians(finite_number(rotation, "Rotation"))
    scale = finite_number(scale, "Scale", 0.001, 100)
    batch, h, w, _ = image.shape
    yy, xx = torch.meshgrid(torch.arange(h, device=image.device, dtype=torch.float32), torch.arange(w, device=image.device, dtype=torch.float32), indexing="ij")
    xx, yy = xx - (w - 1) / 2 - x, yy - (h - 1) / 2 - y
    # Inverse sampling transform, in pixel coordinates: positive rotation is clockwise.
    ix = (math.cos(angle) * xx + math.sin(angle) * yy) / scale + (w - 1) / 2
    iy = (-math.sin(angle) * xx + math.cos(angle) * yy) / scale + (h - 1) / 2
    grid = torch.stack((2 * (ix + 0.5) / w - 1, 2 * (iy + 0.5) / h - 1), -1)[None].expand(batch, -1, -1, -1)
    result = F.grid_sample(image.movedim(-1, 1).float(), grid, align_corners=False).movedim(1, -1).to(image.dtype)
    result_mask = F.grid_sample(mask[:, None].float(), grid, align_corners=False)[:, 0].to(image.dtype)
    return result, result_mask


def composite(background, foreground, mask=None, x=0, y=0, opacity=1.0, blend="normal"):
    background, foreground = image_tensor(background, "background"), image_tensor(foreground, "foreground")
    opacity = finite_number(opacity, "Opacity", 0, 1)
    if blend not in ("normal", "multiply", "screen"):
        raise ValueError("Blend must be normal, multiply, or screen.")
    mask = matching_mask(foreground, mask)
    foreground = batch_match(foreground, background.shape[0], "Foreground").to(background)
    mask = batch_match(mask, background.shape[0], "Mask").to(background)
    b, bh, bw, _ = background.shape
    fh, fw = foreground.shape[1:3]
    result, coverage = background.clone(), background.new_zeros((b, bh, bw))
    dx, dy, sx, sy = max(0, x), max(0, y), max(0, -x), max(0, -y)
    cw, ch = min(bw - dx, fw - sx), min(bh - dy, fh - sy)
    if cw <= 0 or ch <= 0:
        return result, coverage
    fg = foreground[:, sy:sy + ch, sx:sx + cw]
    bg = background[:, dy:dy + ch, dx:dx + cw]
    alpha = mask[:, sy:sy + ch, sx:sx + cw, None] * opacity
    if fg.shape[-1] == 4:
        alpha = alpha * fg[..., 3:4].clamp(0, 1)
    color = fg[..., :3]
    if blend == "multiply":
        color = color * bg[..., :3]
    elif blend == "screen":
        color = 1 - (1 - color) * (1 - bg[..., :3])
    bg_alpha = bg[..., 3:4].clamp(0, 1) if bg.shape[-1] == 4 else torch.ones_like(alpha)
    out_alpha = alpha + bg_alpha * (1 - alpha)
    out_color = (color * alpha + bg[..., :3] * bg_alpha * (1 - alpha)) / out_alpha.clamp_min(1e-8)
    result[:, dy:dy + ch, dx:dx + cw, :3] = out_color
    if bg.shape[-1] == 4:
        result[:, dy:dy + ch, dx:dx + cw, 3:4] = out_alpha
    coverage[:, dy:dy + ch, dx:dx + cw] = alpha[..., 0]
    return result, coverage


def color_match(image, reference, strength=1.0):
    image, reference = image_tensor(image), image_tensor(reference, "reference")
    strength = finite_number(strength, "Strength", 0, 1)
    ref = batch_match(reference, image.shape[0], "Reference").to(image)[..., :3].float()
    src = image[..., :3].float()
    source_mean, ref_mean = src.mean((1, 2), keepdim=True), ref.mean((1, 2), keepdim=True)
    source_std = src.std((1, 2), correction=0, keepdim=True).clamp_min(1e-6)
    ref_std = ref.std((1, 2), correction=0, keepdim=True)
    matched = ((src - source_mean) / source_std * ref_std + ref_mean).clamp(0, 1)
    result = image.clone()
    result[..., :3] = torch.lerp(src, matched, strength).to(image.dtype)
    return result


def refine_mask(mask, grow=0, feather=0, apply_threshold=False, threshold=0.5):
    mask = mask_tensor(mask)
    if not -128 <= grow <= 128 or not 0 <= feather <= 128:
        raise ValueError("Grow must be -128..128 and feather 0..128 pixels.")
    threshold = finite_number(threshold, "Threshold", 0, 1)
    value = mask[:, None].float()
    if grow:
        radius = abs(grow)
        padded = F.pad(value if grow > 0 else 1 - value, (radius,) * 4, mode="replicate")
        value = F.max_pool2d(padded, 2 * radius + 1, stride=1)
        if grow < 0:
            value = 1 - value
    if feather:
        axis = torch.arange(-feather, feather + 1, device=mask.device, dtype=torch.float32)
        kernel = torch.exp(-axis.square() / (2 * max(feather / 3, 0.5) ** 2))
        kernel = kernel / kernel.sum()
        value = F.conv2d(F.pad(value, (feather, feather, 0, 0), mode="replicate"), kernel[None, None, None, :])
        value = F.conv2d(F.pad(value, (0, 0, feather, feather), mode="replicate"), kernel[None, None, :, None])
    if apply_threshold:
        value = (value >= threshold).float()
    return value[:, 0].to(mask.dtype).clamp(0, 1)
