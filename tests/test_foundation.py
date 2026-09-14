import json
import types
from fractions import Fraction
from unittest.mock import patch

import pytest
import torch

from core import tensors as T
from core.controls import indices, table_rows, redact
from core.media import finish_audio, join_videos
from nodes.foundation_controls import DossPromptRecipe, DossTextToolkit, DossSeedSequence, DossValueSchedule, DossResolutionPlan
from nodes.foundation_image import DossMaskCombine, DossMaskFromChannels, DossMaskPreview
from nodes.foundation_workflow import DossBatchSelect, DossBatchJoin, DossTypedSwitch, DossInspector
from nodes.foundation_media import DossClipTrim
from nodes.save_image import DossSaveImage


def marker_image():
    image = torch.zeros(2, 7, 11, 3)
    image[:, 2:5, 3:7, 0] = 1
    return image


@pytest.mark.parametrize("mode", ["fit", "fill", "stretch"])
def test_canvas_keeps_image_and_mask_geometry(mode):
    image = marker_image()
    original = image.clone()
    result, mask = T.canvas_prep(image, 16, 16, mode, mask=image[:1, ..., 0])
    assert result.shape == (2, 16, 16, 3)
    torch.testing.assert_close(result[..., 0], mask)
    torch.testing.assert_close(image, original)


def test_canvas_fit_uses_background_only_outside_content():
    result, mask = T.canvas_prep(torch.ones(1, 4, 8, 3), 8, 8, "fit", "#ff0000")
    torch.testing.assert_close(result[0, 0, 0], torch.tensor([1., 0., 0.]))
    assert mask[0, 0, 0] == 0 and mask[0, 3, 3] == 1


@pytest.mark.parametrize("settings", [(2, -1, 0, 1), (0, 0, 90, 1), (0, 0, 0, 0.5), (-2, 1, 31, 1.3)])
def test_transform_alignment_and_no_mutation(settings):
    image = marker_image()
    original = image.clone()
    output, mask = T.transform_image(image, *settings, mask=image[..., 0])
    torch.testing.assert_close(output[..., 0], mask)
    torch.testing.assert_close(image, original)


def test_transform_translation_has_expected_pixel_position():
    image = torch.zeros(1, 5, 7, 3)
    image[0, 2, 2] = 1
    output, _ = T.transform_image(image, x=2, y=-1)
    torch.testing.assert_close(output[0, 1, 4], torch.ones(3))
    assert output.sum().item() == pytest.approx(3, abs=1e-5)


def test_composite_clips_at_canvas_edges_and_preserves_background():
    bg = torch.zeros(2, 4, 4, 3)
    fg = torch.ones(1, 3, 3, 3)
    result, coverage = T.composite(bg, fg, x=-1, y=2, opacity=0.5)
    assert result[0, 2, 0, 0] == 0.5 and coverage.sum() == 4
    assert result.sum() == 12 and bg.sum() == 0


def test_composite_respects_rgba_alpha():
    bg = torch.zeros(1, 2, 2, 4)
    fg = torch.ones(1, 2, 2, 4)
    fg[..., 3] = 0.5
    result, _ = T.composite(bg, fg)
    torch.testing.assert_close(result[..., :3], torch.ones(1, 2, 2, 3))
    torch.testing.assert_close(result[..., 3], torch.full((1, 2, 2), 0.5))


def test_color_match_constant_image_is_finite_and_preserves_alpha():
    image = torch.full((1, 3, 3, 4), 0.2)
    ref = torch.full((1, 4, 5, 3), 0.7)
    result = T.color_match(image, ref)
    torch.testing.assert_close(result[..., :3], torch.full((1, 3, 3, 3), 0.7))
    torch.testing.assert_close(result[..., 3], image[..., 3])


def test_mask_grow_and_shrink_are_predictable():
    mask = torch.zeros(1, 9, 9)
    mask[:, 4, 4] = 1
    grown = T.refine_mask(mask, grow=1)
    assert grown.sum() == 9
    torch.testing.assert_close(T.refine_mask(grown, grow=-1), mask)
    assert T.refine_mask(mask, feather=2)[0, 4, 3] > 0


def test_mask_preview_and_channel_selection():
    image = marker_image()
    mask = image[..., 0]
    selected = DossMaskFromChannels().execute(image, "red", 0.8, 1)[0]
    torch.testing.assert_close(selected, mask)
    overlay, passthrough = DossMaskPreview().execute(image, mask)
    assert passthrough is mask
    assert overlay[0, 3, 4, 1] > 0
    assert DossMaskCombine().execute(mask, mask, "subtract")[0].sum() == 0


@pytest.mark.parametrize("mask", [torch.zeros(3, 7, 11), torch.zeros(1, 3, 4)])
def test_mask_shape_mismatch_is_actionable(mask):
    with pytest.raises(ValueError, match="Mask must match"):
        T.canvas_prep(marker_image(), 16, 16, mask=mask)


def test_non_finite_inputs_rejected_but_inspector_can_report_them():
    value = marker_image()
    value[0, 0, 0, 0] = float("nan")
    with pytest.raises(ValueError, match="NaN"):
        T.color_match(value, marker_image())
    result = DossInspector().execute({"samples": value})
    assert result["result"][0]["samples"] is value
    assert json.loads(result["result"][1])["tensors"]["samples"]["non_finite"] == 1


def test_prompt_recipe_exact_assembly_and_disabled_sections():
    sections = '[{"name":"subject","text":"boat"},{"name":"style","text":"ink","enabled":false},{"name":"light","text":"sunrise"}]'
    result = DossPromptRecipe().execute(sections, "; ", "Scene: ", ".")
    assert result["result"][0] == "Scene: boat; sunrise."


def test_text_extraction_is_literal_and_handles_missing_paths():
    node = DossTextToolkit()
    assert node.execute('{"shots":[{"prompt":"lake"}]}', "json_field", "shots.0.prompt") == ("lake",)
    assert node.execute("a.b a?b", "replace", "a.b", "x") == ("x a?b",)
    with pytest.raises(ValueError, match="does not exist"):
        node.execute('{"a":1}', "json_field", "b")


def test_seed_sequence_wraps_within_browser_safe_integers():
    assert DossSeedSequence().execute(2**53 - 1, 1, 1) == (0,)
    assert DossSeedSequence().execute(42, 3, -2) == (36,)


def test_schedule_endpoints_and_linear_and_step():
    node = DossValueSchedule()
    points = "[[0,0],[10,1],[20,0]]"
    assert node.execute(points, 5)["result"][0] == 0.5
    assert node.execute(points, 10, "step")["result"][0] == 1
    assert node.execute(points, 25)["result"][0] == 0
    with pytest.raises(ValueError, match="increasing"):
        node.execute("[[0,1],[0,2]]")


def test_resolution_plan_reports_actual_snapped_dimensions():
    w, h, report = DossResolutionPlan().execute(16, 9, 1024, 64)["result"]
    assert (w, h) == (1024, 576)
    assert json.loads(report)["aspect_error_percent"] == 0


def test_table_parses_quoted_fields_and_rejects_bad_rows():
    assert table_rows('prompt,seed\n"lake, dawn",42', "csv") == [{"prompt": "lake, dawn", "seed": "42"}]
    with pytest.raises(ValueError, match="same number"):
        table_rows("a,b\n1,2,3", "csv")


def test_batch_indices_order_duplicates_and_reverse():
    assert indices("-1,0,1:4:2", 4) == [3, 0, 1, 3]
    assert indices("::-1", 3) == [2, 1, 0]
    batch = torch.arange(3.).reshape(3, 1, 1).expand(3, 2, 2)
    selected = DossBatchSelect().execute("MASK", batch, "2,0,2")["result"][0]
    torch.testing.assert_close(selected[:, 0, 0], torch.tensor([2., 0., 2.]))
    with pytest.raises(ValueError, match="outside"):
        indices("3", 3)


def test_batch_join_rejects_mismatched_shapes():
    with pytest.raises(ValueError, match="must match"):
        DossBatchJoin().execute("IMAGE", marker_image(), torch.zeros(1, 2, 2, 3))


def test_lazy_switch_only_requests_selected_input_and_preserves_identity():
    switch = DossTypedSwitch()
    assert switch.check_lazy_status("IMAGE", "b", a=None, b=None) == ["b"]
    image = marker_image()
    assert switch.check_lazy_status("IMAGE", "b", a=None, b=image) == []
    assert switch.execute("IMAGE", "b", a=None, b=image)[0] is image
    assert switch.VALIDATE_INPUTS({"a": "IMAGE", "b": "MASK"}, "IMAGE") is not True


def test_audio_trim_and_fades_preserve_sample_rate_and_source():
    original = torch.ones(1, 2, 1000)
    audio = {"sample_rate": 1000, "waveform": original}
    result, report = finish_audio(audio, start=0.1, duration=0.4, normalize=True, fade_in=0.1, fade_out=0.1)
    assert result["waveform"].shape == (1, 2, 400)
    assert result["sample_rate"] == 1000 and report["duration_seconds"] == 0.4
    assert result["waveform"][0, 0, 0] == 0 and result["waveform"][0, 0, -1] == 0
    assert original.min() == 1


def test_audio_silence_and_clipping_report():
    silent = {"sample_rate": 48000, "waveform": torch.zeros(1, 2, 200)}
    result, report = finish_audio(silent, normalize=True)
    assert result["waveform"].sum() == 0 and report["peak"] == 0
    loud = {"sample_rate": 48000, "waveform": torch.ones(1, 1, 200)}
    result, report = finish_audio(loud, gain_db=6)
    assert report["samples_over_full_scale"] == 200 and result["waveform"].max() > 1


class FakeVideo:
    def __init__(self, frames=3, fps=Fraction(24), audio=True):
        self.components = types.SimpleNamespace(images=torch.ones(frames, 4, 6, 3), frame_rate=fps, metadata={}, alpha=None, audio={"sample_rate": 1000, "waveform": torch.ones(1, 2, round(frames / fps * 1000))} if audio else None)
    def get_dimensions(self): return (6, 4)
    def get_frame_rate(self): return self.components.frame_rate
    def get_frame_count(self): return len(self.components.images)
    def get_duration(self): return float(self.get_frame_count() / self.get_frame_rate())
    def get_components(self): return self.components
    def get_color_space(self): return "sRGB"
    def get_bit_depth(self): return 8
    def as_trimmed(self, start, duration, strict_duration): return (start, duration, strict_duration)


def test_video_join_aligns_audio_to_fractional_frame_boundaries():
    a, b = FakeVideo(2, Fraction(30000, 1001)), FakeVideo(3, Fraction(30000, 1001))
    with patch("core.media.new_video", side_effect=lambda *args: args):
        result, report = join_videos(a, b)
    assert result[0].shape[0] == 5
    assert result[2]["waveform"].shape[-1] == round(Fraction(5, 1) / Fraction(30000, 1001) * 1000)
    assert report["frames"] == 5


def test_video_join_rejects_mismatched_audio_and_memory_limit_before_decode():
    with pytest.raises(ValueError, match="Both clips"):
        join_videos(FakeVideo(), FakeVideo(audio=False))
    with pytest.raises(ValueError, match="frame count"):
        join_videos(FakeVideo(), FakeVideo(), max_frames=4)


def test_clip_trim_frame_indices_are_exclusive_and_sync_audio():
    result = DossClipTrim().execute(FakeVideo(48), "frames", 12, 36)["result"][0]
    assert result == (0.5, 1.0, True)


def test_save_run_record_has_safe_metadata_and_keeps_legacy_output(tmp_path):
    image = torch.zeros(1, 8, 8, 3)
    with patch("nodes.save_image.get_comfy_output_directory", return_value=tmp_path):
        output = DossSaveImage().save_image(image, filename="take", save_run_record=True, run_details='{"seed":42,"api_key":"private-value"}')
    assert output["result"][0] is image
    record = json.loads((tmp_path / "take.png.doss.json").read_text())
    assert record["schema_version"] == 1 and record["supplied"]["seed"] == 42
    assert record["supplied"]["api_key"] == "[redacted]"
    assert "prompt" in record["missing"]


def test_redaction_keeps_graph_structure():
    assert redact({"12": {"inputs": {"seed": 42, "access_token": "abc"}}}) == {"12": {"inputs": {"seed": 42, "access_token": "[redacted]"}}}
