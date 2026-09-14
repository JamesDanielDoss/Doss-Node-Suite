# 0.7.0 candidate validation

Validation performed on 2026-09-14 UTC. This is a source candidate, not a claim of an active Registry release.

## Baseline and contracts

Development started from GitHub commit `bf925874e9e2c6dd72de6dec8251280e9e740826` on the existing repository. The original 70 tests and frontend lifecycle harnesses passed before expansion.

| Published archive | SHA-256 | Captured backend contracts |
| --- | --- | --- |
| Registry 0.3.2 | `663b0a86732c3ff5d51bd7efeee40f0be5f99dd9f02ab028f7648c9b20ddc908` | 3 |
| Registry 0.6.0 | `024be5cb0730db658d2e41ea5e7714d1a2a1439097cc29133beb5394ebd098f2` | 7 |

Exact contracts and original example workflows are stored under `tests/fixtures/legacy`. Regression checks assert the legacy input order, input definitions/defaults, output types/order, identifiers, display names, categories, and execution function names. Added optional controls come after existing controls. Both LoRA schemas, motion restoration, Label Maker's virtual registration, timer behavior, comparer outputs, and Save Image formats retain their baseline tests.

## Local automated and native checks

- **149 Python tests and 11 subtests passed.** Coverage includes geometry alignment, shape and batch rejection, tensor preservation, masks, deterministic seeds/schedules, parsing bounds, lazy switching, audio clipping/fades, video joins, path safety, run records, catalogue completeness, and legacy contracts. Cross-platform CI caught and prompted fixes for foreign absolute paths and Windows short TEMP-path normalization.
- Frontend Hub model tests and the existing Multi-LoRA, Motion Settings, and Motion Studio lifecycle harnesses passed. LoRA reordering now has an additional whole-record test.
- **40 model-free API examples passed**, covering each applicable processing node and all nine category workflows. The standalone LoRA example requires a user checkpoint; the separate LTX integration fixture requires four named installed models.
- A native API test selected one branch while its unselected branch deliberately raised an error if evaluated; the workflow succeeded.
- Wheel and source distribution builds passed. The installable custom-node ZIP passed runtime hash checks and imported all 32 backend nodes from a fresh temporary directory, including compiled Hub assets, catalogue, guides, and examples.
- Windows/Linux automation is configured for Python 3.10 and 3.13, plus a clean native ComfyUI 0.35.1 integration job. Remote results must be recorded after the workflow executes.

## RTX 3090 / LTX-2.5

Windows 11, Python 3.13.12, ComfyUI 0.35.1, frontend 1.51.10, PyTorch 2.12.1+cu130, NVIDIA RTX 3090 24 GB, system RAM 16 GB. The test used the existing managed Torch/CUDA build through a separate development environment; no weights were downloaded.

[LTX integration workflow](../examples/ltx25_integration.json) · [API prompt](../examples/api/ltx25_integration.json)

The complete render passed in **183.636 seconds**, including model initialization. Doss Prompt Recipe, Motion Settings, Resolution Plan, Multi-LoRA Loader with an empty passthrough stack, and Sampling Preset drove native LTX-2.5 nodes using the installed INT8 distilled transformer and Gemma encoder. Audio Finish, Shot Sheet, Save Image, and Video Output Pack produced the deliverables and records.

The muxed video contains **25 H.264 frames, 256×192, 24 fps, 1.041667 seconds**. AAC audio is **48 kHz**, with a muxed duration of **1.01 seconds**. The tail difference is below one video frame and is reported explicitly; encoded stream timing must not be inferred from nominal settings. The test proves this small configuration, not long-clip memory capacity or output quality at production resolutions. Nonempty LoRA application is covered by regression tests, not by this GPU render.

## Browser and coexistence

Observed in the actual ComfyUI frontend: branded Hub rendering, 33-tool catalogue, category expansion, multiword search, node insertion, Ctrl+Z undo, preset saving, favorites, example insertion with connected numeric widgets, execution, schedule curve rendering, and saving the resulting workflow. The saved workflow restored without missing nodes. The Save Image and Image Comparer workflows packaged in 0.3.2 and 0.6.0 are byte-identical across versions; both were loaded, saved, and restored in the current frontend with their legacy control values preserved. A workflow containing Label Maker executed successfully: the label was present in saved workflow metadata and absent from the executable API prompt.

Coexistence versions: KJNodes `d3cfe21625e5170126ce06fbfcfe1d88108688c3`; Pixaroma `2fe16a657e32aa6f7d4cfd0354cf184991545bac`. All **32 Doss, 260 KJNodes, and 81 Pixaroma backend nodes** loaded together. All model-free Doss examples passed in that installation, and a mixed Doss → KJNodes → Pixaroma workflow returned the expected width. KJNodes' optional Triton VAE node was unavailable because Triton is not installed. Pixaroma's banner requires UTF-8 console output on this Windows shell, so the validation server uses `python -X utf8`.

Frontend coexistence passed node/example insertion, preset and favorite persistence in a fresh page, keyboard tab navigation, grouping and undo, and workflow restoration. Disabling only `Doss.Hub` removed the sidebar; the restored Doss generation/schedule workflow still executed successfully. The Hub was then restored in the isolated test profile. A host early-graph-access console warning remains under investigation; no Doss execution or sidebar failure reproduced in a fresh page. No unrelated upstream package code was modified. Final published-archive installation remains pending Registry review.

## Measurements

`python scripts/benchmark.py --output benchmark.json` used one 1024×1024 float32 RGB image and mask, two warmups, and five timed iterations. CUDA measurements synchronize the device; disk I/O and decoding are excluded. These measurements are specific to this machine and validation session, and do not establish an advantage over core nodes or other suites.

| Operation | CPU median | RTX 3090 median | Incremental peak Torch allocation on GPU |
| --- | ---: | ---: | ---: |
| Fit to 768 square | 15.772 ms | 0.744 ms | 40,370,688 bytes |
| Rotate 15 degrees | 48.102 ms | 3.256 ms | 46,137,344 bytes |
| Color statistics match | 65.025 ms | 2.063 ms | 37,750,784 bytes |
| Mask grow 4 / feather 8 | 256.853 ms | 1.043 ms | 21,104,128 bytes |

Allocator figures exclude framework context, driver reservations, and unrelated processes. Clip joins and contact sheets materialize bounded clips; they are not streaming implementations. Join and shot-sheet limits intentionally reject oversized decodes.

## Publication checks still pending

The actual owner-visible Registry rejection reason, its verified resolution, and publisher credential are unavailable. The public Registry remains on 0.3.2 with 0.6.0 banned. Publication and final Manager update verification must wait for that review to be resolved under the existing `jamesdossai/doss-node-suite` identity.
