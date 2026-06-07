import importlib.util
import json
import sys
import unittest
from pathlib import Path

from nodes.workflow_timer_and_alarm import (
    ALARM_SOUNDS,
    TIMER_LABEL_DEFAULT,
    DossWorkflowTimerAndAlarm,
)


class DossWorkflowTimerAndAlarmTests(unittest.TestCase):
    def test_widget_defaults(self):
        input_types = DossWorkflowTimerAndAlarm.INPUT_TYPES()
        required = input_types["required"]

        self.assertEqual(required["timer_label"][1]["default"], TIMER_LABEL_DEFAULT)
        self.assertEqual(required["show_timer_label"][1]["default"], True)
        self.assertEqual(required["show_status"][1]["default"], True)
        self.assertEqual(required["show_milliseconds"][1]["default"], False)
        self.assertEqual(required["hide_node_ui"][1]["default"], False)
        self.assertEqual(required["font_size"][1], {"default": 28, "min": 12, "max": 96})
        self.assertEqual(required["font_color"][1]["default"], "#ffffff")
        self.assertEqual(required["background_color"][1]["default"], "#111111")
        self.assertEqual(required["background_opacity"][1], {"default": 0.85, "min": 0.0, "max": 1.0})
        self.assertEqual(required["border_color"][1]["default"], "#3b82f6")
        self.assertEqual(required["border_radius"][1], {"default": 8, "min": 0, "max": 32})
        self.assertEqual(required["alarm_enabled"][1]["default"], True)
        self.assertEqual(required["alarm_sound"], (ALARM_SOUNDS, {"default": "Ping"}))
        self.assertEqual(required["alarm_volume"][1], {"default": 70, "min": 0, "max": 100})

    def test_has_no_wire_inputs_or_outputs(self):
        input_types = DossWorkflowTimerAndAlarm.INPUT_TYPES()

        self.assertNotIn("optional", input_types)
        self.assertNotIn("hidden", input_types)
        self.assertEqual(DossWorkflowTimerAndAlarm.RETURN_TYPES, ())
        self.assertFalse(hasattr(DossWorkflowTimerAndAlarm, "OUTPUT_NODE"))

    def test_noop_returns_empty_tuple(self):
        node = DossWorkflowTimerAndAlarm()

        self.assertEqual(node.noop(), ())

    def test_package_mappings_include_only_public_nodes(self):
        package_path = Path(__file__).resolve().parents[1] / "__init__.py"
        spec = importlib.util.spec_from_file_location(
            "doss_node_suite_timer_test",
            package_path,
            submodule_search_locations=[str(package_path.parent)],
        )
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)

        expected = {
            "DossImageComparer",
            "DossSaveImage",
            "DossWorkflowTimerAndAlarm",
        }
        self.assertEqual(set(module.NODE_CLASS_MAPPINGS), expected)
        self.assertEqual(
            module.NODE_DISPLAY_NAME_MAPPINGS,
            {
                "DossImageComparer": "Doss Image Comparer",
                "DossSaveImage": "Doss Save Image",
                "DossWorkflowTimerAndAlarm": "Doss Workflow Timer and Alarm",
            },
        )
        self.assertNotIn("DossFileNameFormatter", module.NODE_CLASS_MAPPINGS)

    def test_node_list_includes_only_public_nodes(self):
        node_list_path = Path(__file__).resolve().parents[1] / "node_list.json"
        node_list = json.loads(node_list_path.read_text(encoding="utf-8"))

        self.assertEqual(
            node_list,
            {
                "DossImageComparer": "Doss Image Comparer",
                "DossSaveImage": "Doss Save Image",
                "DossWorkflowTimerAndAlarm": "Doss Workflow Timer and Alarm",
            },
        )

    def test_frontend_does_not_complete_on_executing_null(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_workflow_timer_and_alarm.js"
        source = js_path.read_text(encoding="utf-8")

        self.assertIn('api.addEventListener("execution_success"', source)
        self.assertIn("Does not treat `executing` with a null node as workflow completion.", source)
        self.assertNotIn('finishTimer(STATUS.COMPLETE, detail.prompt_id, true);', source)

    def test_frontend_ui_polish_hooks_exist(self):
        js_path = Path(__file__).resolve().parents[1] / "js" / "doss_workflow_timer_and_alarm.js"
        source = js_path.read_text(encoding="utf-8")

        self.assertIn('const TRANSPARENT_COLOR = "transparent";', source)
        self.assertIn("makeColorSwatches", source)
        self.assertIn("isTransparentColor(settings.background_color)", source)
        self.assertIn("isTransparentColor(settings.border_color)", source)
        self.assertIn("hide_node_ui", source)
        self.assertIn("show_timer_label", source)
        self.assertIn("Show title/label", source)
        self.assertIn("Display-only mode", source)
        self.assertIn("applyDisplayOnlyMode", source)
        self.assertIn("DISPLAY_ONLY_NODE_SIZE", source)
        self.assertIn("installDisplayOnlyShellPatch", source)
        self.assertIn("drawNodeShape", source)
        self.assertIn("setCustomizeButtonVisibility", source)
        self.assertIn("onDblClick", source)
        self.assertIn('node.getTitle = () => "";', source)
        self.assertIn("transparentNodeColor", source)
        self.assertIn("displayOnlyCardBounds", source)
        self.assertIn("handleTimerCardPointer", source)
        self.assertIn("startTimerCardDrag", source)
        self.assertIn("moveTimerCardDrag", source)
        self.assertIn("finishTimerCardDrag", source)
        self.assertIn('document.addEventListener("pointermove"', source)
        self.assertIn('document.addEventListener("pointerup"', source)
        self.assertIn("CARD_DRAG_DISTANCE", source)
        self.assertIn("mouse(event, pos, node)", source)
        self.assertIn("nodeType.prototype.onMouseDown", source)
        self.assertIn("nodeType.prototype.onMouseMove", source)
        self.assertIn("nodeType.prototype.onMouseUp", source)
