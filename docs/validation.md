# Validation Notes

## Automated

Run from the repository root:

```powershell
python -m unittest discover -s tests
```

The tests cover:

- Doss Image Comparer batch fallback behavior.
- Doss Image Comparer single-image safe fallback behavior.
- Doss Image Comparer metadata, mode normalization, and result shape.
- Export mapping registration for the shipped node.

## Manual ComfyUI Check: Image Comparer

1. Clone or copy the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Search for `Doss Image Comparer`.
4. Confirm it appears under `Doss Node Suite / Image`.
5. Connect two IMAGE outputs to `image_a` and `image_b`.
6. Queue the prompt.
7. Confirm Side By Side displays image A and image B inside the node.
8. Switch `comparer_mode` to `Slider` and confirm the slider comparison stays inside the node without overlapping canvas labels.
9. Confirm no persistent floating center image, popup preview, lightbox thumbnail, or centered overlay appears in front of the comparer.
10. Confirm `Click` mode does not appear in the mode dropdown.
11. Confirm the node has only `image_a` and `image_b` outputs; `selected_image` should not exist, including on older workflow nodes after reload.
12. Confirm `image_a` and `image_b` outputs still pass images to downstream nodes.
13. Disconnect `image_b`, send a batch of at least two images into `image_a`, and confirm the first two batch images are used.
14. Test a single image connected to `image_a` and confirm the node does not crash.
15. Confirm no console errors prevent ComfyUI loading.

If the frontend widget fails, the backend should still return the two IMAGE outputs safely.
