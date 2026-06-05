# ComfyUI-Doss-Node-Suite

Doss-Node-Suite is a public ComfyUI custom node pack for practical workflow utilities.

The first release includes **Doss File Name Formatter**, a small utility node that generates standardized, Windows-safe filename strings for ComfyUI output workflows.

## Installation

Clone this repository into your ComfyUI custom nodes folder:

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone <your-repository-url> ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI. The node pack loads through the top-level `__init__.py` and exports:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`

No frontend JavaScript is required for the initial node, so `WEB_DIRECTORY` is intentionally not exported yet.

## Nodes

### Doss File Name Formatter

Category: `Doss Node Suite / Utilities`

Display name: `Doss File Name Formatter`

Purpose: Generate a standardized filename string for ComfyUI outputs.

Input fields:

| Input | Type | Notes |
| --- | --- | --- |
| `topic` | `STRING` | Filename topic, such as `text to image`. |
| `title` | `STRING` | Filename title, such as `production workflow`. |
| `date_day` | `INT` | Day number, formatted as `DD`. |
| `date_month` | `INT` | Month number, formatted as `MM`. |
| `date_year` | `INT` | Year number, formatted as `YYYY`. |
| `separator` | dropdown | Choose `_` or `-`. |
| `lowercase` | `BOOLEAN` | Converts topic and title segments to lowercase when enabled. |

Output fields:

| Output | Type | Notes |
| --- | --- | --- |
| `filename` | `STRING` | A filename stem in `topic_title_DD_MM_YYYY` format. |

Example:

```text
text_to_image_production_workflow_02_06_2026
```

The formatter replaces spaces and unsafe filename characters, collapses repeated separators, trims unsafe trailing characters, and keeps the result Windows-safe.

## Example Workflow

An example workflow is included at:

```text
examples/doss_file_name_formatter.workflow.json
```

Load it from the ComfyUI workflow menu after installing the node pack.

## Validation

Run the unit tests from the repository root:

```powershell
python -m unittest discover -s tests
```

Manual ComfyUI validation:

1. Install the repo into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI and confirm no import errors appear in the console.
3. Add `Doss File Name Formatter` from `Doss Node Suite / Utilities`.
4. Use the default values and confirm the `filename` output is `text_to_image_production_workflow_02_06_2026`.
5. Try unsafe characters such as `/`, `:`, `*`, and `?` in `topic` or `title`; confirm they are replaced with the selected separator.

## License

MIT. See `LICENSE`.
