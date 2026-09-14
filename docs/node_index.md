# Node Index

This file tracks public Doss Node Suite nodes.

The 0.7.0 candidate's full 33-tool catalogue is documented in [the foundation guide](foundation.md) and versioned in `catalog.json`. The table below records the preserved tools from earlier releases.

## Released Nodes

| Node Class | Display Name | Category | Purpose |
| --- | --- | --- | --- |
| `Doss Label Maker` (frontend-only; legacy alias `DossCanvasLabel`) | `Doss Label Maker` | `⚡ Doss Node Suite` | Add resizable free-floating text that is saved with the workflow but excluded from prompt execution. |
| `DossImageComparer` | `Doss Image Comparer` | `⚡ Doss Node Suite` | Compare two IMAGE inputs visually while passing IMAGE tensors through. |
| `DossLTXMotionSettings` | `Doss Motion Settings \| LTX 2.5` | `⚡ Doss Node Suite/LTX-2.5` | Expose curated motion-workflow controls and derive the LTX frame count. |
| `DossLTXMotionStudio` | `Doss Motion Studio \| LTX 2.5` | `⚡ Doss Node Suite/LTX-2.5` | Draw, label, preview, validate, and persist normalized object-motion paths over the starting image. |
| `DossLTXResolveMotionTracks` | `Doss Resolve Motion Tracks \| LTX 2.5` | `⚡ Doss Node Suite/LTX-2.5` | Resolve normalized paths to one official-format pixel coordinate per frame. |
| `DossMultiLoraLoader` | `Doss Multi-LoRA Loader` | `⚡ Doss Node Suite` | Apply an ordered, editable stack of installed LoRAs to MODEL and CLIP. |
| `DossSaveImage` | `Doss Save Image` | `⚡ Doss Node Suite` | Save IMAGE batches to the ComfyUI output folder or an output subfolder, display saved previews, and pass the original batch through. |
| `DossWorkflowTimerAndAlarm` | `Doss Workflow Timer and Alarm` | `⚡ Doss Node Suite` | Display a live workflow timer on the canvas and optionally play a completion alarm. |

## Status Values

- Planned
- In Progress
- Released
- Deprecated
