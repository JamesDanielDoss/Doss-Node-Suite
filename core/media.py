from __future__ import annotations

from fractions import Fraction

import torch
import torch.nn.functional as F

from .tensors import finite_number, image_tensor


def audio_tensor(audio):
    if not isinstance(audio, dict) or not isinstance(audio.get("waveform"), torch.Tensor):
        raise ValueError("Audio must be native AUDIO with waveform and sample_rate.")
    waveform, rate = audio["waveform"], audio.get("sample_rate")
    if waveform.ndim != 3 or min(waveform.shape) < 1 or not waveform.is_floating_point() or not torch.isfinite(waveform).all():
        raise ValueError("Audio waveform must be finite and nonempty [batch, channels, samples].")
    if not isinstance(rate, int) or not 1 <= rate <= 768000:
        raise ValueError("Audio sample_rate must be a positive integer up to 768000.")
    return waveform, rate


def finish_audio(audio, start=0.0, duration=0.0, gain_db=0.0, normalize=False, peak_db=-1.0, fade_in=0.0, fade_out=0.0):
    waveform, rate = audio_tensor(audio)
    start, duration = finite_number(start, "Start", 0), finite_number(duration, "Duration", 0)
    gain_db, peak_db = finite_number(gain_db, "Gain", -96, 48), finite_number(peak_db, "Peak", -96, 0)
    fade_in, fade_out = finite_number(fade_in, "Fade in", 0), finite_number(fade_out, "Fade out", 0)
    first = round(start * rate)
    end = waveform.shape[-1] if duration == 0 else min(waveform.shape[-1], first + round(duration * rate))
    if first >= end: raise ValueError("Audio trim selects no samples.")
    result = waveform[..., first:end].clone().float() * 10 ** (gain_db / 20)
    if normalize:
        peaks = result.abs().amax(dim=(-1, -2), keepdim=True)
        result = result * torch.where(peaks > 1e-12, 10 ** (peak_db / 20) / peaks.clamp_min(1e-12), torch.ones_like(peaks))
    samples = result.shape[-1]
    for fade, reverse in ((fade_in, False), (fade_out, True)):
        count = min(samples, round(fade * rate))
        if count:
            ramp = torch.linspace(0, 1, count, device=result.device)
            if reverse: result[..., -count:] *= ramp.flip(0)
            else: result[..., :count] *= ramp
    clipped = int((result.abs() > 1).sum().item())
    report = {"sample_rate": rate, "samples": samples, "duration_seconds": samples / rate, "peak": float(result.abs().max().item()), "samples_over_full_scale": clipped, "normalized": normalize}
    # Report clipping instead of silently limiting or changing its sound.
    return {**audio, "waveform": result.to(waveform.dtype)}, report


def video_info(video):
    if not all(hasattr(video, name) for name in ("get_components", "get_dimensions", "get_frame_rate", "get_duration")):
        raise ValueError("Connect a native ComfyUI VIDEO. Use core Create Video for an image batch.")
    width, height = video.get_dimensions()
    fps = Fraction(video.get_frame_rate())
    duration = float(video.get_duration())
    if min(width, height) < 1 or fps <= 0 or not duration > 0:
        raise ValueError("Video must contain frames and a positive frame rate and duration.")
    return {"width": width, "height": height, "fps": float(fps), "duration_seconds": duration, "frames": int(video.get_frame_count())}


def components_checked(video, max_frames=256):
    info = video_info(video)
    if not 1 <= max_frames <= 4096: raise ValueError("Frame limit must be 1..4096.")
    if info["frames"] > max_frames:
        raise ValueError(f"Video has {info['frames']} frames, above the {max_frames} frame memory limit. Trim it first or raise the limit deliberately.")
    # At least two float buffers may coexist during joins. Bound unexpectedly large decodes.
    if info["frames"] * info["width"] * info["height"] * 12 > 4 * 1024**3:
        raise ValueError("Decoded RGB video would exceed 4 GiB. Trim or reduce resolution before this operation.")
    components = video.get_components()
    image_tensor(components.images, "Video frames")
    if len(components.images) > max_frames: raise ValueError("Decoded frame count exceeds the memory limit.")
    return components


def new_video(images, fps, audio=None, metadata=None, alpha=None, bit_depth=8, color_space="sRGB"):
    from comfy_api.latest import InputImpl, Types
    components = Types.VideoComponents(images=images, frame_rate=Fraction(fps), audio=audio, metadata=metadata, alpha=alpha)
    return InputImpl.VideoFromComponents(components, bit_depth=bit_depth, color_space=color_space)


def join_videos(a, b, max_frames=256):
    ai, bi = video_info(a), video_info(b)
    for key in ("width", "height"):
        if ai[key] != bi[key]: raise ValueError(f"Clip {key} differs: {ai[key]} vs {bi[key]}. Normalize the clips before joining.")
    if Fraction(a.get_frame_rate()) != Fraction(b.get_frame_rate()): raise ValueError("Clip frame rates differ. Retime before joining.")
    color_a, color_b = a.get_color_space(), b.get_color_space()
    if color_a != color_b or a.get_bit_depth() != b.get_bit_depth(): raise ValueError("Clip color spaces and bit depths must match.")
    if ai["frames"] + bi["frames"] > max_frames: raise ValueError("Combined frame count exceeds max_frames. Trim clips or raise the memory limit.")
    if (ai["frames"] + bi["frames"]) * ai["width"] * ai["height"] * 12 > 4 * 1024**3: raise ValueError("Combined decoded RGB exceeds 4 GiB. Trim or resize the clips.")
    ac, bc = components_checked(a, max_frames), components_checked(b, max_frames)
    if ac.images.shape[1:] != bc.images.shape[1:] or ac.images.dtype != bc.images.dtype or ac.images.device != bc.images.device:
        raise ValueError("Decoded clips must have matching channels, dtype, and device.")
    if (ac.audio is None) != (bc.audio is None): raise ValueError("Both clips must have audio, or both must be silent. Add silence explicitly before joining.")
    audio = None
    if ac.audio is not None:
        aw, ar = audio_tensor(ac.audio)
        bw, br = audio_tensor(bc.audio)
        if ar != br or aw.shape[:2] != bw.shape[:2] or aw.device != bw.device or aw.dtype != bw.dtype:
            raise ValueError("Audio sample rate, batch, channels, dtype, and device must match.")
        # Video frame duration is authoritative. Align each audio boundary to it.
        a_samples = round(Fraction(len(ac.images), 1) / ac.frame_rate * ar)
        total_samples = round(Fraction(len(ac.images) + len(bc.images), 1) / ac.frame_rate * ar)
        def align(waveform, length):
            return F.pad(waveform[..., :length], (0, max(0, length - waveform.shape[-1])))
        audio = {**ac.audio, "waveform": torch.cat((align(aw, a_samples), align(bw, total_samples - a_samples)), -1)}
    if (ac.alpha is None) != (bc.alpha is None): raise ValueError("Both clips must carry alpha, or neither may carry alpha.")
    images = torch.cat((ac.images, bc.images), 0)
    alpha = torch.cat((ac.alpha, bc.alpha), 0) if ac.alpha is not None else None
    result = new_video(images, ac.frame_rate, audio, {"doss_join_sources": [ac.metadata, bc.metadata]}, alpha, a.get_bit_depth(), "sRGB" if color_a == "auto" else color_a)
    return result, {"frames": len(images), "duration_seconds": float(len(images) / ac.frame_rate), "fps": float(ac.frame_rate), "audio": audio is not None, "audio_alignment": "trimmed or padded to video frame boundaries"}
