# Validation Notes

## Automated

Run from the repository root:

```powershell
python -m unittest discover -s tests
python -m pytest
```

The tests cover:

- Doss Image Comparer batch fallback behavior.
- Doss Image Comparer single-image safe fallback behavior.
- Connected `image_b` preservation.
- Invalid mode fallback to the default comparer mode.
- ComfyUI metadata, mode normalization, UI payload, and result shape.
- Doss Save Image filename sanitization and invalid-character warning payload.
- Auto-increment and batch naming behavior.
- Exact save format validation.
- JPEG transparency flattening to white.
- ICO 256x256 size behavior.
- Metadata text sidecar creation.
- Doss Save Image pass-through behavior.
- Public node mappings for `DossImageComparer` and `DossSaveImage` only.

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

## Manual ComfyUI Check: Save Image

1. Clone or copy the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Search for `Doss Save Image`.
4. Confirm the node appears under `Doss Node Suite`.
5. Confirm the only wire input is `image`.
6. Confirm the only wire output is `image`.
7. Confirm the widgets are `filename`, `save_location`, `file_format`, `save_metadata`, and `save_metadata_text_file`.
8. Confirm `filename` defaults to `ComfyUI`.
9. Confirm `file_format` includes only JPEG, PNG, PDF, WEBP, TIFF, ICO, and BMP.
10. Click Browse and confirm it only browses folders inside the normal ComfyUI output directory.
11. Create or select an output subfolder if needed.
12. Queue a prompt and confirm images save to the selected output-relative folder.
13. Queue a batch and confirm every image saves with auto-incremented names.
14. Enter invalid filename characters and confirm the warning appears:

```text
Bad filename due to special characters. Characters have been changed to underscores "_".
```

15. Confirm JPEG and PDF flatten transparency onto white.
16. Confirm ICO saves a single 256x256 `.ico` file.
17. Enable `save_metadata_text_file` and confirm `.txt` sidecar files are written beside saved images.
