# Changelog

All notable changes to Doss Node Suite will be documented in this file.

## [0.5.0] - 2026-08-19

### Added

- Added Doss Canvas Label, a frontend-only resizable floating-text utility that is saved in workflow JSON and excluded from prompt execution.
- Added double-click editing, explicit multiline labels, word wrapping, fit-to-text, font/alignment properties, and optional transparent or colored backgrounds.
- Added a selection-only Doss green outline so the label has no persistent node shell.

## [0.4.0] - 2026-08-19

### Added

- Added Doss Motion Settings | LTX 2.5 with curated Basic/Advanced controls and deterministic 8n+1 frame math.
- Added Doss Motion Studio | LTX 2.5 with pre-run upstream image display, named/color tracks, static tracks, editing history, playhead preview, normalized coordinates, and stale-image fencing.
- Added Doss Resolve Motion Tracks | LTX 2.5 with validated Catmull-Rom interpolation and one LTX coordinate per frame.
- Added unit coverage for frame math, plan validation, source changes, static paths, interpolation, and resolved coordinates.

### Changed

- Updated Doss Save Image to return ComfyUI's standard `ui.images` preview payload so saved images display inside the node after execution.
- Preserved Doss Save Image pass-through output, `saved_files` UI metadata, invalid filename warnings, Browse behavior, batch saving, auto-increment naming, and metadata sidecars.

## [0.3.2] - 2026-06-08

### Changed

- Fixed Doss Image Comparer resize-down behavior.
- Made Image Comparer layout use stable widget sizing and current node bounds for drawing.
- Locked `image_a` to the left and `image_b` to the right in Side By Side and Slider modes.
- Added Slider mode corner badges: `A: Original` and `B: Result`.
- Kept socket identifiers `image_a` and `image_b` for workflow compatibility.

## [0.3.1] - 2026-06-07

### Changed

- Flattened all active nodes into one `⚡ Doss Node Suite` category.
- Added `⚡` category branding while keeping node display names unchanged.

## [0.3.0] - 2026-06-07

### Added

- `Doss Workflow Timer and Alarm` node under `⚡ Doss Node Suite`.
- Visual canvas timer card with Ready, Running, Complete, Error, and Canceled states.
- Workflow timing through ComfyUI frontend execution events.
- Optional generated browser alarm sounds for successful workflow completion.
- Preset color swatches with transparent options for timer text, background, and border.
- Display-only mode that hides the visible Customize button while keeping double-click customization.
- Optional title/label visibility toggle for the timer card.
- Display-only card dragging from anywhere on the timer card.
- Tests for timer widget defaults, no-wire node behavior, public mappings, and node list contents.

## [0.2.0] - 2026-06-06

### Added

- `Doss Save Image` node under `⚡ Doss Node Suite`.
- Output-rooted Browse button for selecting or creating save subfolders inside the ComfyUI output directory.
- Save support for JPEG, PNG, PDF, WEBP, TIFF, ICO, and BMP.
- Auto-incrementing filenames to avoid overwrites.
- Filename sanitization for invalid Windows filename characters with a user-visible warning.
- Optional metadata text sidecar files.
- Tests for save format validation, filename behavior, batch naming, metadata sidecars, pass-through behavior, and public node mappings.

## [0.1.0] - 2026-06-05

### Added

- Initial ComfyUI custom node pack structure.
- `Doss Image Comparer` node under `⚡ Doss Node Suite`.
- Frontend canvas widget for basic side-by-side and slider comparison modes.
- Chainable IMAGE outputs from the comparer: `image_a` and `image_b`.
- README documentation, dedicated node docs, minimal example workflow, validation notes, and unit tests.

### Changed

- Removed `Click` mode from Doss Image Comparer.
- Removed the `selected_image` output from Doss Image Comparer.
- Removed frontend image-preview plumbing that could create a persistent floating center preview.
- Removed generic `ui.images` preview metadata from Doss Image Comparer so only the in-node comparer widget displays images.
- Added frontend cleanup for stale `selected_image` outputs on existing workflow nodes.
- Removed overlapping canvas labels from Slider mode.
