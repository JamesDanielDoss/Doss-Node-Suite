# Validation Notes

## Automated

Run from the repository root:

```powershell
python -m unittest discover -s tests
python -m pytest
```

The tests cover:

- Doss Image Comparer resize, ordering, and slider label behavior.
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
- Doss Save Image standard `ui.images` preview payload.
- Doss Save Image batch preview entries.
- Doss Save Image output-relative preview subfolder metadata.
- Doss Workflow Timer and Alarm widget defaults.
- Doss Workflow Timer and Alarm no-wire visual node behavior.
- Public node mappings for `DossImageComparer`, `DossSaveImage`, `DossWorkflowTimerAndAlarm`,
  `DossLTXMotionSettings`, `DossLTXMotionStudio`, and `DossLTXResolveMotionTracks`.
- LTX 2.5 duration/frame math, motion-plan validation, stale-source fencing,
  normalized/static paths, interpolation, and one coordinate per output frame.
- Doss Motion Settings saved-value restoration, visible-control synchronization,
  deferred frontend configuration, and idempotent node setup.
- Doss Motion Studio source-aspect containment across graph zoom and resize,
  hidden-banner layout, zoomed click mapping, same-image plan restoration,
  resize observation, redraw cleanup, and idempotent node setup.
- Doss Label Maker virtual-node registration, legacy label compatibility, resize and
  unclipped-text behavior, selection-only outline, font catalog, formatting controls,
  explicit outline/shadow switches, and absence from backend prompt execution.

Current source result on 2026-08-21:

```text
65 passed
```

`node --check` also passes for every JavaScript file in `js/`. The Motion Settings and
Motion Studio frontend lifecycle harnesses pass under Node, and `git diff --check`
reports no whitespace errors.

## Manual ComfyUI Check: Image Comparer

1. Clone or copy the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Search for `Doss Image Comparer`.
4. Confirm it appears under `⚡ Doss Node Suite`.
5. Connect two IMAGE outputs to `image_a` and `image_b`.
6. Queue the prompt.
7. Confirm Side By Side displays `image_a` on the left and `image_b` on the right.
8. Resize the node larger and smaller and confirm the preview fits inside the current node bounds.
9. Switch `comparer_mode` to `Slider` and confirm `image_a` appears on the left side of the split and `image_b` appears on the right side.
10. Confirm Slider mode shows `A: Original` in the top-left corner and `B: Result` in the top-right corner.
11. Confirm no persistent floating center image, popup preview, lightbox thumbnail, or centered overlay appears in front of the comparer.
12. Confirm `Click` mode does not appear in the mode dropdown.
13. Confirm the node has only `image_a` and `image_b` outputs; `selected_image` should not exist, including on older workflow nodes after reload.
14. Confirm `image_a` and `image_b` outputs still pass images to downstream nodes.
15. Disconnect `image_b`, send a batch of at least two images into `image_a`, and confirm the first two batch images are used.
16. Test a single image connected to `image_a` and confirm the node does not crash.
17. Confirm no console errors prevent ComfyUI loading.

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
14. Confirm saved image previews display inside Doss Save Image below the widgets/parameters.
15. Confirm the `image` output still passes the original IMAGE to downstream nodes.
16. Test PNG first.
17. Test batch save if practical and confirm each saved batch image appears in the preview list.
18. Enter invalid filename characters and confirm the warning appears:

```text
Bad filename due to special characters. Characters have been changed to underscores "_".
```

19. Confirm JPEG and PDF flatten transparency onto white.
20. Confirm ICO saves a single 256x256 `.ico` file.
21. Enable `save_metadata_text_file` and confirm `.txt` sidecar files are written beside saved images.
22. Note whether PDF or ICO previews render in the ComfyUI/browser image viewer; preview support for those formats may be limited.

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

## Manual ComfyUI Check: Doss Motion Node | LTX 2.5

1. Load the approved LTX 2.5 Motion Control workflow in managed ComfyUI Desktop.
2. Confirm Motion Settings, Motion Studio, and Resolve Motion Tracks load without red or missing nodes.
3. Select a starting image and confirm Motion Studio displays it before model execution.
4. Enter a positive prompt, leave the negative prompt empty, choose 5 seconds and 24 FPS,
   and confirm the summary reports 121 frames.
5. Create two named moving tracks, place the first point of each track on its intended object,
   and confirm the paths, point numbers, START/END labels, colors, Undo, and Redo update visibly.
6. Scrub Path preview from START to END and confirm both preview markers move without queueing.
7. Change the source image and confirm the existing plan becomes stale and Run is blocked until
   Keep & rescale or Clear tracks resolves it.
8. Queue the approved workflow once and bind the prompt/history record to both a decodable motion
   preview and a decodable final video.

## Manual ComfyUI Check: Doss Label Maker

1. Add `Doss Label Maker` and confirm only its formatted text is visible while deselected.
2. Click once and confirm the temporary selection outline and bottom-right resize handle appear;
   click elsewhere and confirm both disappear.
3. Drag the resize handle and confirm the text area resizes without clipping large text.
4. Double-click anywhere inside the label and confirm `Customize Doss Label Maker` opens.
5. Change font family, size, weight, style, stretch, color, opacity, case, alignment, direction,
   line height, letter/word spacing, indentation, wrapping, underline, strikethrough, small caps,
   and kerning; confirm every applicable choice changes the preview and saved canvas rendering.
6. Enable Outline, Shadow, and Shadow Blur individually. Confirm each switch supplies a visible
   starting value, enables its related controls, and allows its color and numeric values to change.
7. Use Save and Save and Fit to Text and confirm both preserve the intended text without clipping.
8. Save/reload the workflow and confirm the label persists but never appears in the executable prompt.
