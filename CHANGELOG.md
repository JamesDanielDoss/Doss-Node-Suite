# Changelog

All notable changes to Doss-Node-Suite will be documented in this file.

## [0.1.0] - 2026-06-05

### Added

- Initial ComfyUI custom node pack structure.
- `Doss File Name Formatter` node under `Doss Node Suite / Utilities`.
- `Doss Image Comparer` node under `Doss Node Suite / Image`.
- Frontend canvas widget for basic side-by-side and slider comparison modes.
- Chainable IMAGE outputs from the comparer: `image_a` and `image_b`.
- Windows-safe filename sanitization with `_` and `-` separator options.
- README documentation, dedicated node docs, minimal example workflows, validation notes, and unit tests.

### Changed

- Removed `Click` mode from Doss Image Comparer.
- Removed the `selected_image` output from Doss Image Comparer.
- Removed frontend image-preview plumbing that could create a persistent floating center preview.
- Removed generic `ui.images` preview metadata from Doss Image Comparer so only the in-node comparer widget displays images.
