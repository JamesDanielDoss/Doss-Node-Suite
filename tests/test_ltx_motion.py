import json
import unittest
from pathlib import Path

from nodes.ltx_motion import (
    DossLTXMotionSettings,
    DossLTXMotionStudio,
    DossLTXResolveMotionTracks,
    calculate_ltx_frame_count,
    interpolate_normalized_track,
    resolve_motion_tracks,
    validate_motion_plan,
)


class FakeImage:
    shape = (1, 512, 768, 3)


def plan(*, stale=False, source_ref="input.png", width=768, height=512):
    return {
        "schemaVersion": 1,
        "source": {"ref": source_ref, "width": width, "height": height},
        "stale": stale,
        "tracks": [
            {
                "id": "track-1",
                "name": "Red ball",
                "color": "#ef4444",
                "points": [
                    {"x": 0.25, "y": 0.5},
                    {"x": 0.5, "y": 0.6},
                    {"x": 0.75, "y": 0.8},
                ],
            }
        ],
    }


class LTXMotionTests(unittest.TestCase):
    def test_frame_count_obeys_ltx_8n_plus_1_rule(self):
        self.assertEqual(calculate_ltx_frame_count(5.0, 24), 121)
        self.assertEqual(calculate_ltx_frame_count(5.0, 30), 145)
        self.assertEqual((calculate_ltx_frame_count(3.2, 24) - 1) % 8, 0)

    def test_frame_count_rejects_unsupported_fps(self):
        with self.assertRaisesRegex(ValueError, "24 or 30"):
            calculate_ltx_frame_count(5, 25)

    def test_plan_is_canonicalized(self):
        result = validate_motion_plan(
            plan(), image_width=768, image_height=512, source_ref="input.png"
        )
        self.assertEqual(result["schemaVersion"], 1)
        self.assertEqual(result["tracks"][0]["name"], "Red ball")
        self.assertFalse(result["stale"])

    def test_plan_rejects_stale_source(self):
        with self.assertRaisesRegex(ValueError, "Keep & rescale or Clear"):
            validate_motion_plan(plan(stale=True))

    def test_plan_rejects_changed_filename(self):
        with self.assertRaisesRegex(ValueError, "source filename"):
            validate_motion_plan(plan(), source_ref="different.png")

    def test_plan_rejects_changed_dimensions(self):
        with self.assertRaisesRegex(ValueError, "source dimensions"):
            validate_motion_plan(plan(), image_width=640, image_height=360)

    def test_plan_rejects_empty_tracks(self):
        value = plan()
        value["tracks"] = []
        with self.assertRaisesRegex(ValueError, "at least one motion track"):
            validate_motion_plan(value)

    def test_plan_rejects_out_of_bounds_points(self):
        value = plan()
        value["tracks"][0]["points"][0]["x"] = 1.01
        with self.assertRaisesRegex(ValueError, "inside the image"):
            validate_motion_plan(value)

    def test_static_track_repeats_for_every_frame(self):
        result = interpolate_normalized_track([{"x": 0.4, "y": 0.6}], 9)
        self.assertEqual(result, [{"x": 0.4, "y": 0.6}] * 9)

    def test_two_point_track_preserves_endpoints(self):
        result = interpolate_normalized_track(
            [{"x": 0.0, "y": 0.25}, {"x": 1.0, "y": 0.75}], 5
        )
        self.assertEqual(result[0], {"x": 0.0, "y": 0.25})
        self.assertEqual(result[-1], {"x": 1.0, "y": 0.75})

    def test_resolver_returns_one_pixel_position_per_frame(self):
        raw = resolve_motion_tracks(plan(), 768, 512, 121)
        tracks = json.loads(raw)
        self.assertEqual(len(tracks), 1)
        self.assertEqual(len(tracks[0]), 121)
        self.assertEqual(tracks[0][0], {"x": 192, "y": 256})
        self.assertTrue(all(0 <= p["x"] < 768 and 0 <= p["y"] < 512 for p in tracks[0]))

    def test_settings_expose_curated_basic_and_advanced_controls(self):
        required = DossLTXMotionSettings.INPUT_TYPES()["required"]
        self.assertEqual(
            list(required),
            [
                "positive_prompt",
                "duration_seconds",
                "negative_prompt",
                "seed",
                "motion_strength",
                "image_adherence",
                "fps",
            ],
        )
        result = DossLTXMotionSettings().build_settings(
            "two balls roll down a path", 5, "", 42, 1.0, 0.7, "24"
        )
        self.assertEqual(result[4], 121)

    def test_studio_validates_before_passing_image(self):
        image = FakeImage()
        returned_image, returned_plan = DossLTXMotionStudio().validate_and_pass(
            image, json.dumps(plan()), "input.png"
        )
        self.assertIs(returned_image, image)
        self.assertEqual(json.loads(returned_plan)["tracks"][0]["id"], "track-1")

    def test_resolver_node_uses_resized_image_dimensions(self):
        (tracks_json,) = DossLTXResolveMotionTracks().resolve(
            FakeImage(), json.dumps(plan()), 121
        )
        tracks = json.loads(tracks_json)
        self.assertEqual(tracks[0][-1], {"x": 575, "y": 409})

    def test_frontend_contains_app_and_editor_contracts(self):
        source = (
            Path(__file__).resolve().parents[1] / "js" / "doss_ltx_motion.js"
        ).read_text(encoding="utf-8")
        for contract in [
            'node.addDOMWidget("settings_panel"',
            'node.addDOMWidget("motion_studio"',
            'data-testid="linear-welcome"',
            "upstreamImageReference",
            "Keep & rescale",
            "Clear tracks",
            "Static point",
            "Path preview",
            "right-click a point to remove",
            "MutationObserver",
            "api.apiURL",
            "installResponsiveWidget",
            "getMinHeight",
            "afterResize",
            'green: "#69f58a"',
            'backdropFilter: "blur(18px) saturate(125%)"',
        ]:
            self.assertIn(contract, source)


if __name__ == "__main__":
    unittest.main()
