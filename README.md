# Doss Node Suite

Doss Node Suite is a public ComfyUI custom node pack focused on practical visual workflow tools.

GitHub: `https://github.com/JamesDanielDoss/Doss-Node-Suite`

Current shipped nodes:

- **Doss Image Comparer**: compares two IMAGE inputs visually and passes IMAGE tensors through.
- **Doss Save Image**: saves IMAGE batches to the ComfyUI output folder or an output subfolder and passes IMAGE tensors through.

## Installation

Clone this repository into your ComfyUI custom nodes folder:

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone https://github.com/JamesDanielDoss/Doss-Node-Suite.git ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI.

Find the nodes by searching for `Doss`, or browse:

```text
Doss Node Suite / Image
Doss Node Suite
```

The node pack loads through the top-level `__init__.py` and exports:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`
- `WEB_DIRECTORY`

`WEB_DIRECTORY` points to `./js` for the Doss Image Comparer frontend canvas widget and the Doss Save Image Browse button.

## Nodes

### Doss Image Comparer

Category: `Doss Node Suite / Image`

Display name: `Doss Image Comparer`

Purpose: Compare two ComfyUI IMAGE inputs visually while keeping the node chainable.

Input fields:

| Input | Type | Notes |
| --- | --- | --- |
| `image_a` | `IMAGE` | Required first image input. |
| `image_b` | `IMAGE` | Optional second image input. |
| `comparer_mode` | dropdown | `Side By Side` or `Slider`. |

Output fields:

| Output | Type | Notes |
| --- | --- | --- |
| `image_a` | `IMAGE` | Pass-through first comparison image. |
| `image_b` | `IMAGE` | Pass-through second comparison image. Mirrors `image_a` if no second image is available. |

Behavior:

- If `image_b` is connected, the node compares `image_a` and `image_b`.
- If `image_b` is not connected and `image_a` has a batch of at least two images, the node compares the first two images from `image_a`.
- If only one image is available, the node shows and returns `image_a` safely.
- `Side By Side` displays image A and image B inside the node.
- `Slider` compares image A and image B with a simple in-node slider.
- The comparer does not create a persistent floating center preview.

### Doss Save Image

Category: `Doss Node Suite`

Display name: `Doss Save Image`

Purpose: Save images to the normal ComfyUI output folder or an output subfolder while passing the original IMAGE batch through unchanged.

Wire connections:

| Direction | Name | Type |
| --- | --- | --- |
| Input | `image` | `IMAGE` |
| Output | `image` | `IMAGE` |

Widgets:

| Widget | Type | Notes |
| --- | --- | --- |
| `filename` | `STRING` | Default `ComfyUI`. Invalid Windows filename characters are replaced with `_`. |
| `save_location` | `STRING` | Default `output`, which means the normal ComfyUI output folder. Subfolders are output-relative, such as `Doss Test` or `portraits/session_01`. |
| `file_format` | dropdown | `JPEG`, `PNG`, `PDF`, `WEBP`, `TIFF`, `ICO`, or `BMP`. |
| `save_metadata` | boolean | Attempts to embed available metadata when the selected format supports it. |
| `save_metadata_text_file` | boolean | Writes a `.txt` sidecar tied to the full saved image filename, such as `ComfyUI.png.txt`, with available generation metadata and save details. |

Behavior:

- The Browse button only browses folders inside the normal ComfyUI output directory.
- `output`, `output/`, and an empty value all resolve to the base ComfyUI output folder.
- Absolute paths, drive letters, `..` traversal, and paths outside output are rejected.
- Existing files are not overwritten; names auto-increment like `ComfyUI.png`, `ComfyUI(1).png`, `ComfyUI(2).png`.
- Batches save every image using the same settings.
- JPEG and PDF flatten transparency onto white.
- PNG and WEBP preserve transparency when possible.
- ICO saves one 256x256 `.ico` file per batch image.
- No quality or compression sliders are exposed.

## Example Workflow

A minimal placement/test example is included at:

```text
examples/doss_image_comparer_example.json
examples/doss_save_image_example.json
```

This example is only for placing and testing the node. It is not a production workflow pack.

## Validation

Run the unit tests from the repository root:

```powershell
python -m unittest discover -s tests
python -m pytest
```

Manual ComfyUI validation:

1. Install the repo into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI and confirm no import errors appear in the console.
3. Search for `Doss Image Comparer`.
4. Connect two IMAGE outputs to `image_a` and `image_b`.
5. Queue the prompt and confirm the node displays Side By Side inside the node.
6. Switch to `Slider` and confirm the slider stays inside the node.
7. Confirm no `Click` mode appears and no `selected_image` output exists.
8. Confirm no console errors prevent ComfyUI from loading.
9. Search for `Doss Save Image`.
10. Confirm only `image` input and `image` output wire connections exist.
11. Click Browse and confirm only ComfyUI output folders can be selected.
12. Save a PNG batch and confirm auto-incremented filenames.
13. Try invalid filename characters and confirm this warning appears: `Bad filename due to special characters. Characters have been changed to underscores "_".`

## License

MIT. See `LICENSE`.
