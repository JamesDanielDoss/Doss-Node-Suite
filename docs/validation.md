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
- Doss Workflow Timer and Alarm widget defaults.
- Doss Workflow Timer and Alarm no-wire visual node behavior.
- Public node mappings for `DossImageComparer`, `DossSaveImage`, and `DossWorkflowTimerAndAlarm` only.

## Manual ComfyUI Check: Image Comparer

1. Clone or copy the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Search for `Doss Image Comparer`.
4. Confirm it appears under `⚡ Doss Node Suite`.
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
4. Confirm the node appears under `⚡ Doss Node Suite`.
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

## Manual ComfyUI Check: Workflow Timer and Alarm

1. Clone or copy the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Search for `Doss Workflow Timer and Alarm`.
4. Confirm the node appears under `⚡ Doss Node Suite`.
5. Confirm the node has no input wire connections.
6. Confirm the node has no output wire connections.
7. Confirm the node shows a large clean timer dashboard card and a `Customize` button.
8. Confirm the main node body does not show the full stack of style/alarm controls.
9. Confirm the timer card shows the default label `Workflow Timer`.
10. Confirm the status starts as `Ready`.
11. Click `Customize` and confirm a modal opens.
12. Confirm the modal uses preset color swatches instead of browser color picker inputs.
13. Confirm the modal checkboxes are compact and directly beside their labels.
14. Change label, color swatches, font size, background opacity, border radius, status/milliseconds toggles, and alarm settings.
15. Select `Transparent` for background color and confirm the timer card fill is not drawn.
16. Select `Transparent` for border color and confirm the timer card border is not drawn.
17. Save the modal and confirm the node display updates.
18. Double-click the timer card and confirm the `Customize` modal opens.
19. Enable `Display-only mode`, save, and confirm the visible `Customize` button is hidden.
20. Confirm the normal widget stack stays hidden and the visible node becomes as clean/minimal as ComfyUI allows.
21. Confirm the display-only node shell/background is hidden or minimized behind the timer card.
22. Toggle `Show title/label` and confirm the small `Workflow Timer` label hides and returns while the large timer remains visible.
23. Click and hold anywhere on the display-only timer card and confirm the node can be dragged.
24. Double-click again with `Display-only mode` enabled and confirm the modal still opens.
25. Confirm dragging does not accidentally open `Customize`.
26. Disable `Display-only mode`, save, and confirm the `Customize` button returns.
27. Queue a workflow and confirm the status changes to `Running`.
28. Confirm the elapsed time updates live while the workflow runs.
29. Confirm the timer keeps running until image generation/save is actually complete.
30. Confirm successful completion changes the status to `Complete` and freezes the final elapsed time.
31. Confirm the next workflow run resets the timer cleanly.
32. Enable `show_milliseconds` and confirm milliseconds appear.
33. Set `alarm_enabled` to false and confirm no alarm plays.
34. Set `alarm_volume` to `0` and confirm no alarm plays.
35. Set `alarm_sound` to `Ping` and `Beep` and confirm each generated sound works after successful completion when the browser allows audio.
36. Cancel or error a workflow if practical and confirm the timer shows `Canceled` or `Error`.

Browser autoplay rules may block alarm playback until the user has interacted with the ComfyUI page.
