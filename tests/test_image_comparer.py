import unittest
import re
from pathlib import Path

from nodes.image_comparer import (
    DEFAULT_COMPARER_MODE,
    DossImageComparer,
    choose_comparison_images,
    normalize_comparer_mode,
)


class DossImageComparerTests(unittest.TestCase):
    def test_batch_fallback_uses_first_two_images(self):
        output_a, output_b = choose_comparison_images(["a0", "a1", "a2"])

        self.assertEqual(output_a, ["a0"])
        self.assertEqual(output_b, ["a1"])

    def test_single_image_fallback_mirrors_image_a(self):
        output_a, output_b = choose_comparison_images(["a0"])

        self.assertEqual(output_a, ["a0"])
        self.assertEqual(output_b, ["a0"])

    def test_connected_image_b_is_preserved(self):
        image_a = ["a0", "a1"]
        image_b = ["b0"]

        output_a, output_b = choose_comparison_images(image_a, image_b)

        self.assertIs(output_a, image_a)
        self.assertIs(output_b, image_b)

    def test_invalid_mode_defaults_safely(self):
        self.assertEqual(normalize_comparer_mode("not a mode"), DEFAULT_COMPARER_MODE)

    def test_node_api_and_result_shape(self):
        node = DossImageComparer()
        result = node.compare_images(
            image_a=["a0", "a1"],
            comparer_mode="Slider",
        )

        self.assertEqual(result["result"], (["a0"], ["a1"]))
        self.assertEqual(result["ui"]["comparer_mode"], ["Slider"])
        self.assertEqual(result["ui"]["a_images"], [])
        self.assertEqual(result["ui"]["b_images"], [])
        self.assertNotIn("images", result["ui"])

    def test_comfy_metadata_is_declared(self):
        self.assertEqual(DossImageComparer.RETURN_TYPES, ("IMAGE", "IMAGE"))
        self.assertEqual(DossImageComparer.RETURN_NAMES, ("image_a", "image_b"))
        self.assertEqual(DossImageComparer.CATEGORY, "⚡ Doss Node Suite")
        self.assertTrue(DossImageComparer.OUTPUT_NODE)

        input_types = DossImageComparer.INPUT_TYPES()
        self.assertIn("image_a", input_types["required"])
        self.assertIn("image_b", input_types["optional"])
        self.assertIn("comparer_mode", input_types["required"])
        self.assertEqual(
            input_types["required"]["comparer_mode"][0],
            ["Side By Side", "Slider"],
        )

    def test_frontend_preview_layout_separates_minimum_from_draw_bounds(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        self.assertIn("function getPreviewHeight(node, width, y = 0)", source)
        self.assertIn("node?.size?.[1]", source)
        self.assertIn("availableHeight", source)
        self.assertIn("return Math.max(0, availableHeight)", source)
        self.assertIn("const height = getPreviewHeight(node, width, y)", source)
        self.assertIn("drawSideBySide(ctx, x, top, width, height)", source)

        compute_size_match = re.search(
            r"computeSize\(width\) \{(?P<body>.*?)\n  \}",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(compute_size_match)
        compute_size_body = compute_size_match.group("body")

        self.assertIn("MIN_PREVIEW_HEIGHT", compute_size_body)
        self.assertNotIn("getPreviewHeight", compute_size_body)
        self.assertNotIn("node?.size", compute_size_body)
        self.assertNotIn("this.node.size", compute_size_body)

    def test_frontend_resize_hook_only_marks_canvas_dirty(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        resize_match = re.search(
            r"nodeType\.prototype\.onResize = function \(\) \{(?P<body>.*?)\n    \};",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(resize_match)
        resize_body = resize_match.group("body")

        self.assertIn("nodeType.prototype.onResize", source)
        self.assertIn("setDirtyCanvas", resize_body)
        self.assertNotIn("setSize", resize_body)
        self.assertNotIn("size[1]", resize_body)

    def test_frontend_binds_entries_by_input_name(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        self.assertIn('inputName: "image_a"', source)
        self.assertIn('inputName: "image_b"', source)
        self.assertIn('function getInputEntry(entries, inputName)', source)
        self.assertIn('entry.inputName === inputName', source)

        setter_match = re.search(
            r"set value\(value\) \{(?P<body>.*?)\n  \}",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(setter_match)
        setter_body = setter_match.group("body")
        self.assertIn("return { ...entry, image }", setter_body)
        self.assertNotIn("sort(", setter_body)

    def test_frontend_side_by_side_maps_a_left_b_right(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        side_by_side_match = re.search(
            r"drawSideBySide\(ctx, x, y, width, height\) \{(?P<body>.*?)\n  \}",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(side_by_side_match)
        body = side_by_side_match.group("body")

        self.assertIn('const imageA = getInputEntry(this.entries, "image_a")', body)
        self.assertIn('const imageB = getInputEntry(this.entries, "image_b") || imageA', body)
        self.assertIn("drawImageInBounds(ctx, imageA, x, y, panelWidth, height)", body)
        self.assertIn(
            "drawImageInBounds(ctx, imageB, x + panelWidth + gap, y, panelWidth, height)",
            body,
        )
        self.assertNotIn("drawBadge", body)
        self.assertNotIn("A: Original", body)
        self.assertNotIn("B: Result", body)
        self.assertNotIn("this.entries[0]", body)
        self.assertNotIn("this.entries[1]", body)

    def test_frontend_slider_maps_a_left_b_right(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        slider_match = re.search(
            r"drawSlider\(ctx, node, x, y, width, height\) \{(?P<body>.*?)\n  \}",
            source,
            re.DOTALL,
        )
        self.assertIsNotNone(slider_match)
        body = slider_match.group("body")

        self.assertIn('const imageA = getInputEntry(this.entries, "image_a")', body)
        self.assertIn('const imageB = getInputEntry(this.entries, "image_b") || imageA', body)
        self.assertIn("drawImageInBounds(ctx, imageB, x, y, width, height, false)", body)
        self.assertIn("const rect = fitRect(imageA.image, x, y, width, height)", body)
        self.assertIn("ctx.rect(x, y, cropX, height)", body)
        self.assertIn("ctx.drawImage(imageA.image, rect.x, rect.y, rect.width, rect.height)", body)
        self.assertIn('drawBadge(ctx, "A: Original", x + labelPadding, y + labelPadding)', body)
        self.assertIn(
            'drawBadge(ctx, "B: Result", x + width - labelPadding, y + labelPadding, "right")',
            body,
        )
        self.assertNotIn("this.entries[0]", body)
        self.assertNotIn("this.entries[1]", body)

    def test_frontend_slider_labels_are_badges(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_image_comparer.js"
        source = js_path.read_text(encoding="utf-8")

        self.assertIn('drawBadge(ctx, "A: Original"', source)
        self.assertIn('drawBadge(ctx, "B: Result"', source)
        self.assertIn('function drawBadge(ctx, text, x, y, align = "left")', source)
        self.assertIn('ctx.fillStyle = "rgba(0, 0, 0, 0.62)"', source)
        self.assertIn("drawRoundedRect(ctx, left, y, width, height, 6)", source)


if __name__ == "__main__":
    unittest.main()
