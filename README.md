# Doss Node Suite

Doss Node Suite is an early V0.1 public ComfyUI custom node pack focused on practical visual workflow tools.

GitHub: `https://github.com/JamesDanielDoss/Doss-Node-Suite`

Current shipped node:

- **Doss Image Comparer**: compares two IMAGE inputs visually and passes IMAGE tensors through.

## Installation

Clone this repository into your ComfyUI custom nodes folder:

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone https://github.com/JamesDanielDoss/Doss-Node-Suite.git ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI.

Find the node by searching for `Doss Image Comparer` or browsing:

```text
Doss Node Suite / Image
```

The node pack loads through the top-level `__init__.py` and exports:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`
- `WEB_DIRECTORY`

`WEB_DIRECTORY` points to `./js` for the Doss Image Comparer frontend canvas widget.

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

## Example Workflow

A minimal placement/test example is included at:

```text
examples/doss_image_comparer_example.json
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

## License

MIT. See `LICENSE`.
