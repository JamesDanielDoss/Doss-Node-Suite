# Changelog

All notable changes to Doss Node Suite will be documented in this file.

## [0.1.0] - 2026-06-05

### Added

- Initial ComfyUI custom node pack structure.
- `Doss Image Comparer` node under `Doss Node Suite / Image`.
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

## [0.2.0] - 2026-06-06

### Added

- `Doss Save Image` node under `Doss Node Suite`.
- Output-rooted Browse button for selecting or creating save subfolders inside the ComfyUI output directory.
- Save support for JPEG, PNG, PDF, WEBP, TIFF, ICO, and BMP.
- Auto-incrementing filenames to avoid overwrites.
- Filename sanitization for invalid Windows filename characters with a user-visible warning.
- Optional metadata text sidecar files.
- Tests for save format validation, filename behavior, batch naming, metadata sidecars, pass-through behavior, and public node mappings.
