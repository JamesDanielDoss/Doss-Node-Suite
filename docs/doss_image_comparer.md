# Doss Image Comparer

Category: `Doss Node Suite / Image`

Display name: `Doss Image Comparer`

## Purpose

Compare two ComfyUI IMAGE inputs visually. This is the first proof-of-work visual node for Doss Node Suite.

The V0.1 goal is stable loading, useful pass-through outputs, and simple visual comparison.

## Inputs

| Input | Type | Description |
| --- | --- | --- |
| `image_a` | `IMAGE` | Required first image input. |
| `image_b` | `IMAGE` | Optional second image input. |
| `comparer_mode` | dropdown | Choose `Side By Side`, `Slide`, or `Click`. |

## Outputs

| Output | Type | Description |
| --- | --- | --- |
| `image_a` | `IMAGE` | First comparison image output. |
| `image_b` | `IMAGE` | Second comparison image output. If no second image is available, this mirrors `image_a`. |
| `selected_image` | `IMAGE` | V0.1 selected output. Defaults to `image_a`. |

## Behavior

- With `image_a` and `image_b` connected, the node compares those two inputs.
- With only `image_a` connected and a batch of at least two images, the node uses the first two images from `image_a`.
- With only one available image, the node displays and returns that image safely.
- `Side By Side` is the default display mode.
- `Slide` draws a simple hover-position split when two preview images are available.
- `Click` shows A normally and B while the pointer is held down.

## Frontend

The node uses `js/doss_image_comparer.js` and exports `WEB_DIRECTORY = "./js"` from the package `__init__.py`.

The frontend extension:

- Uses `app.registerExtension`.
- Targets only `DossImageComparer`.
- Draws a custom canvas widget inside the node.
- Catches widget setup/rendering errors so ComfyUI can keep loading.

## Validation Note

Install the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`, restart ComfyUI, add `Doss Image Comparer` from `Doss Node Suite / Image`, connect two IMAGE outputs, queue the prompt, and confirm the node displays or compares images without blocking ComfyUI from loading.
