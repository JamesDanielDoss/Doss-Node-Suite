import unittest

from nodes.file_name_formatter import DossFileNameFormatter, format_doss_filename


class DossFileNameFormatterTests(unittest.TestCase):
    def test_expected_example_filename(self):
        filename = format_doss_filename(
            topic="text to image",
            title="production workflow",
            date_day=2,
            date_month=6,
            date_year=2026,
            separator="_",
            lowercase=True,
        )

        self.assertEqual(filename, "text_to_image_production_workflow_02_06_2026")

    def test_sanitizes_windows_unsafe_characters(self):
        filename = format_doss_filename(
            topic="Text to Image: Production",
            title='Workflow / Draft* V1?',
            date_day=2,
            date_month=6,
            date_year=2026,
            separator="_",
            lowercase=True,
        )

        self.assertEqual(
            filename,
            "text_to_image_production_workflow_draft_v1_02_06_2026",
        )

    def test_dash_separator_and_case_preservation(self):
        filename = format_doss_filename(
            topic="My Topic",
            title="Final_Output",
            date_day=9,
            date_month=1,
            date_year=2027,
            separator="-",
            lowercase=False,
        )

        self.assertEqual(filename, "My-Topic-Final-Output-09-01-2027")

    def test_comfy_node_returns_single_string_output(self):
        node = DossFileNameFormatter()

        self.assertEqual(
            node.format_filename(
                topic="text to image",
                title="production workflow",
                date_day=2,
                date_month=6,
                date_year=2026,
                separator="_",
                lowercase=True,
            ),
            ("text_to_image_production_workflow_02_06_2026",),
        )


if __name__ == "__main__":
    unittest.main()
