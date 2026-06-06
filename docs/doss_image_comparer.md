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
| `comparer_mode` | dropdown | Choose `Side By Side` or `Slider`. |

## Outputs

| Output | Type | Description |
| --- | --- | --- |
| `image_a` | `IMAGE` | First comparison image output. |
| `image_b` | `IMAGE` | Second comparison image output. If no second image is available, this mirrors `image_a`. |

## Behavior

- With `image_a` and `image_b` connected, the node compares those two inputs.
- With only `image_a` connected and a batch of at least two images, the node uses the first two images from `image_a`.
- With only one available image, the node displays and returns that image safely.
- `Side By Side` is the default display mode and draws image A and image B inside the node.
- `Slider` draws image A and image B inside the node with a simple pointer-position split.
- No persistent overlay, popup preview, or centered lightbox image is created by the Doss widget.

## Frontend

The node uses `js/doss_image_comparer.js` and exports `WEB_DIRECTORY = "./js"` from the package `__init__.py`.

The frontend extension:

- Uses `app.registerExtension`.
- Targets only `DossImageComparer`.
- Draws a custom canvas widget inside the node.
- Avoids setting `node.imgs`, so ComfyUI should not create an extra floating preview for this node.
- Avoids returning generic `ui.images`, so ComfyUI's built-in preview overlay is not triggered.
- Catches widget setup/rendering errors so ComfyUI can keep loading.

## Validation Note

Install the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`, restart ComfyUI, add `Doss Image Comparer` from `Doss Node Suite / Image`, connect two IMAGE outputs, queue the prompt, and confirm Side By Side and Slider both render inside the node without a floating center preview.
