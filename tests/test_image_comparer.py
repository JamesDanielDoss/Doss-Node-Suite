import unittest

from nodes.image_comparer import (
    DEFAULT_COMPARER_MODE,
    DossImageComparer,
    choose_comparison_images,
    normalize_comparer_mode,
)


class DossImageComparerTests(unittest.TestCase):
    def test_batch_fallback_uses_first_two_images(self):
        output_a, output_b, selected = choose_comparison_images(["a0", "a1", "a2"])

        self.assertEqual(output_a, ["a0"])
        self.assertEqual(output_b, ["a1"])
        self.assertEqual(selected, ["a0"])

    def test_single_image_fallback_mirrors_image_a(self):
        output_a, output_b, selected = choose_comparison_images(["a0"])

        self.assertEqual(output_a, ["a0"])
        self.assertEqual(output_b, ["a0"])
        self.assertEqual(selected, ["a0"])

    def test_connected_image_b_is_preserved(self):
        image_a = ["a0", "a1"]
        image_b = ["b0"]

        output_a, output_b, selected = choose_comparison_images(image_a, image_b)

        self.assertIs(output_a, image_a)
        self.assertIs(output_b, image_b)
        self.assertIs(selected, image_a)

    def test_invalid_mode_defaults_safely(self):
        self.assertEqual(normalize_comparer_mode("not a mode"), DEFAULT_COMPARER_MODE)

    def test_node_api_and_result_shape(self):
        node = DossImageComparer()
        result = node.compare_images(
            image_a=["a0", "a1"],
            comparer_mode="Slide",
        )

        self.assertEqual(result["result"], (["a0"], ["a1"], ["a0"]))
        self.assertEqual(result["ui"]["comparer_mode"], ["Slide"])
        self.assertEqual(result["ui"]["images"], [])

    def test_comfy_metadata_is_declared(self):
        self.assertEqual(DossImageComparer.RETURN_TYPES, ("IMAGE", "IMAGE", "IMAGE"))
        self.assertEqual(DossImageComparer.RETURN_NAMES, ("image_a", "image_b", "selected_image"))
        self.assertEqual(DossImageComparer.CATEGORY, "Doss Node Suite / Image")
        self.assertTrue(DossImageComparer.OUTPUT_NODE)

        input_types = DossImageComparer.INPUT_TYPES()
        self.assertIn("image_a", input_types["required"])
        self.assertIn("image_b", input_types["optional"])
        self.assertIn("comparer_mode", input_types["required"])


if __name__ == "__main__":
    unittest.main()
