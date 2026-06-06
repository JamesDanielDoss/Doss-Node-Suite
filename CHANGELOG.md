# Changelog

All notable changes to Doss-Node-Suite will be documented in this file.

## [0.1.1] - 2026-06-05

### Changed

- Updated package metadata for Registry node listing compatibility.
- Simplified shipped node exports to `DossImageComparer` only.
- Added `node_list.json` with `DossImageComparer` for Manager/Registry node discovery.
- Removed old Doss File Name Formatter files and documentation from the shipped package.

## [0.1.0] - 2026-06-05

### Added

- Initial ComfyUI custom node pack structure.
- `Doss Image Comparer` node under `Doss Node Suite / Image`.
- Frontend canvas widget for basic side-by-side and slider comparison modes.
- Chainable IMAGE outputs from the comparer: `image_a` and `image_b`.
- README documentation, dedicated node docs, minimal example workflows, validation notes, and unit tests.

### Changed

- Removed `Click` mode from Doss Image Comparer.
- Removed the `selected_image` output from Doss Image Comparer.
- Removed frontend image-preview plumbing that could create a persistent floating center preview.
- Removed generic `ui.images` preview metadata from Doss Image Comparer so only the in-node comparer widget displays images.
- Added frontend cleanup for stale `selected_image` outputs on existing workflow nodes.
- Removed overlapping canvas labels from Slider mode.
