import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

from nodes.save_image import (
    BAD_FILENAME_WARNING,
    DEFAULT_FILENAME,
    DEFAULT_SAVE_LOCATION,
    FILE_FORMATS,
    ICO_SIZES,
    DossSaveImage,
    build_batch_paths,
    flatten_transparency_to_white,
    next_available_path,
    normalize_output_relative_path,
    resolve_save_directory,
    sanitize_filename_stem,
    validate_file_format,
    write_metadata_text_file,
)


class DossSaveImageTests(unittest.TestCase):
    def test_filename_widget_default_is_comfyui(self):
        input_types = DossSaveImage.INPUT_TYPES()

        self.assertEqual(
            input_types["required"]["filename"][1]["default"],
            DEFAULT_FILENAME,
        )

    def test_save_location_widget_default_is_output(self):
        input_types = DossSaveImage.INPUT_TYPES()

        self.assertEqual(
            input_types["required"]["save_location"][1]["default"],
            DEFAULT_SAVE_LOCATION,
        )

    def test_filename_sanitization_replaces_invalid_windows_characters(self):
        safe, changed = sanitize_filename_stem('bad\\/:*?"<>|name')

        self.assertEqual(safe, "bad_name")
        self.assertTrue(changed)

    def test_auto_increment_naming_skips_existing_files(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            (directory / "ComfyUI.png").write_bytes(b"existing")

            self.assertEqual(
                next_available_path(directory, "ComfyUI", ".png").name,
                "ComfyUI(1).png",
            )

    def test_batch_naming_behavior(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            directory = Path(temp_dir)
            paths = build_batch_paths(directory, "ComfyUI", ".png", 3)

            self.assertEqual(
                [path.name for path in paths],
                ["ComfyUI.png", "ComfyUI(1).png", "ComfyUI(2).png"],
            )

    def test_format_option_validation(self):
        self.assertEqual(FILE_FORMATS, ("JPEG", "PNG", "PDF", "WEBP", "TIFF", "ICO", "BMP"))
        for file_format in FILE_FORMATS:
            self.assertEqual(validate_file_format(file_format), file_format)
        for unsupported in ("SVG", "AVIF"):
            with self.assertRaises(ValueError):
                validate_file_format(unsupported)

    def test_jpeg_transparency_flattening_to_white(self):
        image = Image.new("RGBA", (1, 1), (255, 0, 0, 0))

        flattened = flatten_transparency_to_white(image)

        self.assertEqual(flattened.mode, "RGB")
        self.assertEqual(flattened.getpixel((0, 0)), (255, 255, 255))

    def test_ico_size_list_behavior(self):
        self.assertEqual(ICO_SIZES, [(256, 256)])

    def test_metadata_text_file_creation(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image_path = Path(temp_dir) / "ComfyUI.png"
            payload = {
                "filename": "ComfyUI.png",
                "format": "PNG",
                "metadata_available": False,
                "batch_index": 0,
                "node_settings": {"filename": "ComfyUI"},
            }

            text_path = write_metadata_text_file(image_path, payload)

            self.assertTrue(text_path.exists())
            self.assertEqual(text_path.name, "ComfyUI.png.txt")
            text = text_path.read_text(encoding="utf-8")
            self.assertIn("Generation metadata was unavailable.", text)
            self.assertIn("ComfyUI.png", text)

    def test_metadata_sidecars_are_tied_to_exact_saved_filename(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image = np.zeros((1, 2, 2, 4), dtype=np.float32)
            node = DossSaveImage()
            with patch("nodes.save_image.get_comfy_output_directory", return_value=Path(temp_dir)):
                node.save_image(
                    image=image,
                    filename="ComfyUI",
                    file_format="PDF",
                    save_metadata_text_file=True,
                )
                node.save_image(
                    image=image,
                    filename="ComfyUI",
                    file_format="BMP",
                    save_metadata_text_file=True,
                )

            pdf_sidecar = Path(temp_dir) / "ComfyUI.pdf.txt"
            bmp_sidecar = Path(temp_dir) / "ComfyUI.bmp.txt"
            self.assertTrue(pdf_sidecar.exists())
            self.assertTrue(bmp_sidecar.exists())
            self.assertFalse((Path(temp_dir) / "ComfyUI.txt").exists())
            self.assertIn('"format": "PDF"', pdf_sidecar.read_text(encoding="utf-8"))
            self.assertIn('"format": "BMP"', bmp_sidecar.read_text(encoding="utf-8"))

    def test_batch_metadata_sidecars_match_incremented_names(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image = np.zeros((3, 2, 2, 4), dtype=np.float32)
            node = DossSaveImage()
            with patch("nodes.save_image.get_comfy_output_directory", return_value=Path(temp_dir)):
                node.save_image(
                    image=image,
                    filename="ComfyUI",
                    file_format="BMP",
                    save_metadata_text_file=True,
                )

            expected_sidecars = [
                "ComfyUI.bmp.txt",
                "ComfyUI(1).bmp.txt",
                "ComfyUI(2).bmp.txt",
            ]
            self.assertEqual(
                {path.name for path in Path(temp_dir).glob("*.txt")},
                set(expected_sidecars),
            )
            for sidecar in expected_sidecars:
                text = (Path(temp_dir) / sidecar).read_text(encoding="utf-8")
                self.assertIn(sidecar.removesuffix(".txt"), text)

    def test_save_location_rejects_paths_outside_output(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            with self.assertRaises(ValueError):
                resolve_save_directory("..", output_dir)
            with self.assertRaises(ValueError):
                resolve_save_directory("C:/Temp", output_dir)

    def test_save_location_root_aliases_resolve_to_output_root(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir).resolve()

            self.assertEqual(resolve_save_directory("", output_dir), output_dir)
            self.assertEqual(resolve_save_directory("output", output_dir), output_dir)
            self.assertEqual(resolve_save_directory("output/", output_dir), output_dir)
            self.assertEqual(normalize_output_relative_path("output"), "")
            self.assertFalse((output_dir / "output").exists())

    def test_save_location_subfolder_resolves_inside_output_root(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir).resolve()

            self.assertEqual(
                resolve_save_directory("Doss Test", output_dir),
                output_dir / "Doss Test",
            )
            self.assertTrue((output_dir / "Doss Test").is_dir())

    def test_image_pass_through_and_warning_payload(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image = np.zeros((1, 2, 2, 4), dtype=np.float32)
            node = DossSaveImage()
            with patch("nodes.save_image.get_comfy_output_directory", return_value=Path(temp_dir)):
                result = node.save_image(
                    image=image,
                    filename="bad:name",
                    file_format="PNG",
                    save_metadata_text_file=True,
                )

            self.assertIs(result["result"][0], image)
            self.assertEqual(result["ui"]["warnings"], [BAD_FILENAME_WARNING])
            self.assertTrue((Path(temp_dir) / "bad_name.png").exists())
            self.assertTrue((Path(temp_dir) / "bad_name.png.txt").exists())

    def test_node_mappings_include_only_public_nodes(self):
        package_path = Path(__file__).resolve().parents[1] / "__init__.py"
        spec = importlib.util.spec_from_file_location(
            "doss_node_suite_test",
            package_path,
            submodule_search_locations=[str(package_path.parent)],
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)

        self.assertEqual(
            set(module.NODE_CLASS_MAPPINGS),
            {"DossImageComparer", "DossSaveImage", "DossWorkflowTimerAndAlarm"},
        )
        self.assertEqual(
            module.NODE_DISPLAY_NAME_MAPPINGS,
            {
                "DossImageComparer": "Doss Image Comparer",
                "DossSaveImage": "Doss Save Image",
                "DossWorkflowTimerAndAlarm": "Doss Workflow Timer and Alarm",
            },
        )
        self.assertNotIn("DossFileNameFormatter", module.NODE_CLASS_MAPPINGS)


if __name__ == "__main__":
    unittest.main()
