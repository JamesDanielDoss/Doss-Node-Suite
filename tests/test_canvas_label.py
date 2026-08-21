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
            'const NODE_TYPE = "Doss Label Maker";',
            'const LEGACY_NODE_TYPE = "DossCanvasLabel";',
            'const DISPLAY_NAME = "Doss Label Maker";',
            'const CATEGORY = "⚡ Doss Node Suite";',
            'name: "Doss.CanvasLabel"',
            "registerCustomNodes()",
            "this.isVirtualNode = true",
            'super("Doss Label")',
            'this.title = "Doss Label"',
            "LiteGraphApi.registerNodeType(NODE_TYPE, DossCanvasLabel)",
            "LiteGraphApi.registerNodeType(LEGACY_NODE_TYPE, LegacyDossCanvasLabel)",
            "LegacyDossCanvasLabel.skip_list = true",
            "node?.type === NODE_TYPE || node?.type === LEGACY_NODE_TYPE",
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
            "openCustomizeModal(this)",
            'heading.textContent = "Customize Doss Label Maker"',
            'makeField("Label text", labelText)',
            'makeField("Font size", fontSize.row)',
            'makeField("Font family", fontFamily.wrapper)',
            'makeField("Font weight", fontWeight)',
            'makeField("Horizontal alignment", textAlign)',
            'makeField("Font color", fontColor.row)',
            'makeField("Line height (multiline text)", lineHeight.row)',
            'makeCheckboxRow("Wrap text to the current label width"',
            "button.onpointerdown",
            'content: "Fit Label to Text"',
            "installTransparentShellPatch",
        ]:
            self.assertIn(contract, self.source)

    def test_canvas_draws_text_with_a_selection_only_resize_outline(self):
        self.assertNotIn("window.prompt", self.source)
        self.assertNotIn("context.fill();", self.source)
        self.assertIn("context.fillText(line, 0, 0)", self.source)
        self.assertIn("context.scale(stretch, 1)", self.source)
        self.assertIn("if (isSelected(this))", self.source)
        self.assertIn("context.setLineDash([7, 5])", self.source)
        self.assertIn("context.fillRect(width - handle", self.source)
        self.assertIn("this.resizable = true", self.source)

    def test_large_text_is_scaled_in_preview_and_forced_visible_on_canvas(self):
        self.assertIn("const MAX_FONT_SIZE = 512", self.source)
        self.assertIn("context.scale(scale, scale)", self.source)
        self.assertIn("ensureTextVisible(this, size)", self.source)
        self.assertIn("ensureTextVisible(node)", self.source)

    def test_exposes_comprehensive_text_formatting(self):
        for contract in [
            'makeSection("Text", true)',
            'makeSection("Font", true)',
            'makeSection("Paragraph and spacing", true)',
            'makeSection("Typography and effects")',
            'this.addProperty("font_style"',
            'this.addProperty("font_stretch"',
            'this.addProperty("text_opacity"',
            'this.addProperty("vertical_align"',
            'this.addProperty("text_direction"',
            'this.addProperty("text_transform"',
            'this.addProperty("letter_spacing"',
            'this.addProperty("word_spacing"',
            'this.addProperty("text_indent"',
            'this.addProperty("underline"',
            'this.addProperty("strikethrough"',
            'this.addProperty("small_caps"',
            'this.addProperty("font_kerning"',
            'this.addProperty("outline_enabled"',
            'this.addProperty("stroke_width"',
            'this.addProperty("shadow_enabled"',
            'this.addProperty("shadow_blur_enabled"',
            'this.addProperty("shadow_blur"',
        ]:
            self.assertIn(contract, self.source)

    def test_visual_controls_are_wired_and_non_effect_controls_are_removed(self):
        for contract in [
            "FONT_STRETCH_SCALES",
            "fontStretchScale(properties)",
            "context.scale(stretch, 1)",
            'const weight = text(properties.font_weight, "700")',
            'const family = text(properties.font_family, FONT_FAMILIES[0])',
            "number(properties.font_size, 32, 8, MAX_FONT_SIZE)",
            'const variant = properties.small_caps ? "small-caps" : "normal"',
            "transformedText(node.title, node.properties.text_transform)",
            "context.globalAlpha = opacity",
            "setFillStyle(context, properties.font_color, BRAND_WHITE)",
            'const alignment = ["left", "center", "right"].includes(properties.text_align)',
            'const vertical = ["top", "middle", "bottom"].includes(properties.vertical_align)',
            'context.direction = properties.text_direction === "rtl" ? "rtl" : "ltr"',
            "metrics.lines.length * metrics.lineHeight",
            "context.letterSpacing",
            "context.wordSpacing",
            "const indent = number(properties.text_indent, 0, 0, 400)",
            "const padding = number(properties.padding, 6, 0, 100)",
            "const wrap = node.properties.wrap_text !== false",
            "context.fontKerning",
            "context.strokeText(line, 0, 0)",
            "context.shadowBlur",
            "context.shadowOffsetX",
            "context.shadowOffsetY",
            "outlineIsEnabled(properties)",
            "shadowIsEnabled(properties)",
            "shadowBlurIsEnabled(properties)",
            "if (properties.underline)",
            "if (properties.strikethrough)",
            "refreshDependentControls()",
            "setControlEnabled(strokeColor.row",
            "setControlEnabled(shadowColor.row",
            'element.removeAttribute("aria-disabled")',
            'control.disabled = !enabled',
            'makeCheckboxRow(\n    "Enable text outline"',
            'makeCheckboxRow(\n    "Enable shadow"',
            'makeCheckboxRow(\n    "Blur shadow"',
        ]:
            self.assertIn(contract, self.source)
        self.assertNotIn('this.addProperty("text_rendering"', self.source)
        self.assertNotIn('makeField("Text rendering"', self.source)
        self.assertNotIn(
            'makeSelect(text(node.properties.font_style, "normal"), ["normal", "italic", "oblique"])',
            self.source,
        )

    def test_effect_checkboxes_activate_visible_defaults_and_preserve_legacy_effects(self):
        for contract in [
            'strokeWidth.range.value = "2"',
            'shadowOffsetX.range.value = "8"',
            'shadowOffsetY.range.value = "8"',
            'shadowBlur.range.value = "12"',
            "shadowEnabled.input.checked = true",
            'hasOwnProperty.call(saved, "outline_enabled")',
            'hasOwnProperty.call(saved, "shadow_enabled")',
            'hasOwnProperty.call(saved, "shadow_blur_enabled")',
        ]:
            self.assertIn(contract, self.source)
        self.assertIn('const shadowColorField = makeField("Shadow color", shadowColor.row)', self.source)
        self.assertNotIn("Shadow color (set blur or an offset)", self.source)

    def test_font_picker_has_a_large_curated_catalog_and_custom_entry(self):
        font_section = self.source.split(
            "const FONT_FAMILIES = Object.freeze([", 1
        )[1].split("]);", 1)[0]
        self.assertGreaterEqual(font_section.count("\n  "), 75)
        for family in [
            '"Segoe UI"',
            '"Century Gothic"',
            '"Times New Roman"',
            "Broadway",
            '"Brush Script MT"',
            '"Cascadia Code"',
            "Consolas",
        ]:
            self.assertIn(family, font_section)
        self.assertIn('customOption.textContent = "Custom font family…"', self.source)
        self.assertIn("option.style.fontFamily = family", self.source)

    def test_customize_panel_contains_no_timer_or_alarm_controls(self):
        for irrelevant_control in [
            "Alarm enabled",
            "Alarm sound",
            "Alarm volume",
            "Show milliseconds",
            "Show status",
            "Display-only mode",
        ]:
            self.assertNotIn(irrelevant_control, self.source)

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
