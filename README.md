# ComfyUI-Doss-Node-Suite

Doss-Node-Suite is a public ComfyUI custom node pack for practical workflow utilities and small visual helpers.

The initial nodes are:

- **Doss File Name Formatter**: generates standardized, Windows-safe filename strings.
- **Doss Image Comparer**: compares two IMAGE inputs visually and passes IMAGE tensors through.

## Installation

Clone this repository into your ComfyUI custom nodes folder:

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone <your-repository-url> ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI. The node pack loads through the top-level `__init__.py` and exports:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`
- `WEB_DIRECTORY`

`WEB_DIRECTORY` points to `./js` for the Doss Image Comparer frontend canvas widget.

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

### Doss Image Comparer

Category: `Doss Node Suite / Image`

Display name: `Doss Image Comparer`

Purpose: Compare two ComfyUI IMAGE inputs visually while keeping the node chainable.

Input fields:

| Input | Type | Notes |
| --- | --- | --- |
| `image_a` | `IMAGE` | Required first image input. |
| `image_b` | `IMAGE` | Optional second image input. |
| `comparer_mode` | dropdown | `Side By Side`, `Slide`, or `Click`. |

Output fields:

| Output | Type | Notes |
| --- | --- | --- |
| `image_a` | `IMAGE` | Pass-through first comparison image. |
| `image_b` | `IMAGE` | Pass-through second comparison image. Mirrors `image_a` if no second image is available. |
| `selected_image` | `IMAGE` | V0.1 selected output. Defaults to `image_a`. |

Behavior:

- If `image_b` is connected, the node compares `image_a` and `image_b`.
- If `image_b` is not connected and `image_a` has a batch of at least two images, the node compares the first two images from `image_a`.
- If only one image is available, the node shows and returns `image_a` safely.
- `Side By Side` is the V0.1 default and most stable display mode.
- `Slide` and `Click` are included as basic proof-of-work modes and may be expanded later.

## Example Workflows

Minimal example workflows are included at:

```text
examples/doss_file_name_formatter.workflow.json
examples/doss_image_comparer_example.json
```

These examples are only for placing and testing the nodes. They are not production workflow packs.

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
6. Search for `Doss Image Comparer`.
7. Connect two IMAGE outputs to `image_a` and `image_b`.
8. Queue the prompt and confirm the node displays or safely passes the image outputs.
9. Confirm no console errors prevent ComfyUI from loading.

## License

MIT. See `LICENSE`.
