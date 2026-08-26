from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from nodes.multi_lora_loader import (
    DEFAULT_LORA_STACK,
    DossMultiLoraLoader,
    MAX_LORA_ENTRIES,
    parse_lora_stack,
)


class DossMultiLoraLoaderTests(unittest.TestCase):
    def test_input_contract_is_model_clip_and_persisted_stack(self):
        required = DossMultiLoraLoader.INPUT_TYPES()["required"]
        self.assertEqual(required["model"][0], "MODEL")
        self.assertEqual(required["clip"][0], "CLIP")
        self.assertEqual(required["lora_stack_json"][1]["default"], DEFAULT_LORA_STACK)
        self.assertEqual(DossMultiLoraLoader.RETURN_TYPES, ("MODEL", "CLIP"))

    def test_stack_parser_migrates_legacy_shared_weight_and_accepts_split_weights(self):
        entries = parse_lora_stack(
            {
                "version": 1,
                "entries": [
                    {"name": "looks/TESS.safetensors", "strength": "0.75"},
                    {"name": "slider.safetensors", "strength_model": -2, "strength_clip": 0.5, "enabled": False},
                ],
            }
        )
        self.assertEqual(
            entries,
            [
                {"name": "looks/TESS.safetensors", "strength_model": 0.75, "strength_clip": 0.75, "enabled": True},
                {"name": "slider.safetensors", "strength_model": -2.0, "strength_clip": 0.5, "enabled": False},
            ],
        )

    def test_stack_parser_fails_closed(self):
        invalid = [
            "not json",
            {"version": 99, "entries": []},
            {"version": 1, "entries": "bad"},
            {"version": 1, "entries": [{"name": "", "strength": 1}]},
            {"version": 1, "entries": [{"name": "x", "strength": float("inf")}]},
            {
                "version": 1,
                "entries": [
                    {"name": f"{index}.safetensors", "strength": 1}
                    for index in range(MAX_LORA_ENTRIES + 1)
                ],
            },
        ]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_lora_stack(value)

    def test_enabled_loras_apply_in_displayed_order_and_disabled_entries_skip(self):
        node = DossMultiLoraLoader()
        stack = json.dumps(
            {
                "version": 1,
                "entries": [
                    {"name": "first.safetensors", "strength_model": 0.5, "strength_clip": 0.25, "enabled": True},
                    {"name": "skip.safetensors", "strength": 1.0, "enabled": False},
                    {"name": "zero.safetensors", "strength": 0.0, "enabled": True},
                    {"name": "second.safetensors", "strength_model": -1.25, "strength_clip": 0.75, "enabled": True},
                ],
            }
        )
        calls: list[tuple[str, str, str, float, float]] = []

        def cached(name):
            return f"weights:{name}", f"metadata:{name}"

        def apply(model, clip, lora, strength_model, strength_clip, _metadata):
            calls.append((model, clip, lora, strength_model, strength_clip))
            return f"{model}+{lora}", f"{clip}+{lora}"

        with patch.object(node, "_cached_lora", side_effect=cached), patch(
            "nodes.multi_lora_loader._apply_lora", side_effect=apply
        ):
            model, clip = node.load_lora_stack("model", "clip", stack)

        self.assertEqual([call[2] for call in calls], ["weights:first.safetensors", "weights:second.safetensors"])
        self.assertEqual([(call[3], call[4]) for call in calls], [(0.5, 0.25), (-1.25, 0.75)])
        self.assertEqual(model, "model+weights:first.safetensors+weights:second.safetensors")
        self.assertEqual(clip, "clip+weights:first.safetensors+weights:second.safetensors")

    def test_cache_reuses_unchanged_file_and_reloads_changed_file(self):
        node = DossMultiLoraLoader()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.safetensors"
            path.write_bytes(b"one")
            with patch("nodes.multi_lora_loader._resolve_lora_path", return_value=path), patch(
                "nodes.multi_lora_loader._load_lora_file",
                side_effect=[("first", "meta1"), ("second", "meta2")],
            ) as loader:
                self.assertEqual(node._cached_lora("test.safetensors"), ("first", "meta1"))
                self.assertEqual(node._cached_lora("test.safetensors"), ("first", "meta1"))
                path.write_bytes(b"changed")
                self.assertEqual(node._cached_lora("test.safetensors"), ("second", "meta2"))
        self.assertEqual(loader.call_count, 2)


if __name__ == "__main__":
    unittest.main()
