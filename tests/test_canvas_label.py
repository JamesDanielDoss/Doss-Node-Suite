import unittest
from pathlib import Path


class DossCanvasLabelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (
            Path(__file__).resolve().parents[1] / "js" / "doss_canvas_label.js"
        ).read_text(encoding="utf-8")

    def test_registers_frontend_only_virtual_node(self):
        for contract in [
            'const NODE_TYPE = "DossCanvasLabel";',
            'const DISPLAY_NAME = "Doss Canvas Label";',
            'const CATEGORY = "⚡ Doss Node Suite";',
            'name: "Doss.CanvasLabel"',
            "registerCustomNodes()",
            "this.isVirtualNode = true",
            "LiteGraphApi.registerNodeType(NODE_TYPE, DossCanvasLabel)",
            "DossCanvasLabel.category = CATEGORY",
        ]:
            self.assertIn(contract, self.source)

    def test_is_plain_text_by_default_but_editable_and_resizable(self):
        for contract in [
            'this.addProperty("font_size"',
            'this.addProperty("font_family"',
            'this.addProperty("font_color"',
            'this.addProperty("text_align"',
            'this.addProperty("wrap_text"',
            'this.addProperty("background_color", TRANSPARENT',
            "this.resizable = true",
            "onResize(size)",
            "onDblClick()",
            'content: "Fit Label to Text"',
            "installTransparentShellPatch",
        ]:
            self.assertIn(contract, self.source)

    def test_does_not_add_a_backend_execution_mapping(self):
        package = (Path(__file__).resolve().parents[1] / "__init__.py").read_text(
            encoding="utf-8"
        )
        node_list = (Path(__file__).resolve().parents[1] / "node_list.json").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("DossCanvasLabel", package)
        self.assertNotIn("DossCanvasLabel", node_list)


if __name__ == "__main__":
    unittest.main()
