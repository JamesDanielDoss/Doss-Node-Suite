# Doss tools

The versioned Hub catalogue is `catalog.json`. All processing tools also work from ComfyUI's normal node menu and API. Example JSON files contain a complete graph; the `api` subfolder contains executable prompts. The LoRA example requires your own checkpoint selection. Other examples use core synthetic inputs and need no models.

Controls use pixels, clockwise degrees, seconds, dB gain/dBFS peaks, and zero-based end-exclusive indices. Typed switches and batch nodes require choosing the data type before connecting. Defaults are neutral where practical; packaged presets include reset variants. No node installs software or downloads weights.

## Doss Canvas Prep

Fit, fill, or stretch an image and mask together. Fit pads; fill center-crops. An absent mask means the entire source is selected.

Practical advantage: One geometry operation keeps image and mask aligned through resize, center crop, or padding.

[Executable workflow](../examples/DossCanvasPrep.json) · [API prompt](../examples/api/DossCanvasPrep.json)

Inputs: image: IMAGE; width: INT; height: INT; mode: choice; background: STRING; mask: MASK

Outputs: image: IMAGE; mask: MASK

## Doss Image Transform

Translate, rotate clockwise, and scale an image and its mask around their center with identical geometry. Exposed edges become zero.

Practical advantage: Translate, rotate, and scale the image and its mask with the same sampling grid.

[Executable workflow](../examples/DossImageTransform.json) · [API prompt](../examples/api/DossImageTransform.json)

Inputs: image: IMAGE; x: FLOAT; y: FLOAT; rotation: FLOAT; scale: FLOAT; mask: MASK

Outputs: image: IMAGE; mask: MASK

## Doss Layer Composite

Place a foreground using pixel offsets and an optional white-is-selected mask. Supports singleton foreground batches and RGBA alpha.

Practical advantage: Place a masked layer with opacity and blending, and reuse the resulting coverage mask.

[Executable workflow](../examples/DossLayerComposite.json) · [API prompt](../examples/api/DossLayerComposite.json)

Inputs: background: IMAGE; foreground: IMAGE; x: INT; y: INT; opacity: FLOAT; blend: choice; mask: MASK

Outputs: image: IMAGE; coverage: MASK

## Doss Color Match

Match per-channel RGB means and standard deviations to a reference. Strength blends the correction; alpha is preserved. Connect to Doss Image Comparer to review.

Practical advantage: Blend per-channel reference statistics by strength without loading a color model.

[Executable workflow](../examples/DossColorMatch.json) · [API prompt](../examples/api/DossColorMatch.json)

Inputs: image: IMAGE; reference: IMAGE; strength: FLOAT

Outputs: image: IMAGE

## Doss Image Comparer

Compare two images visually and pass the selected tensors through.

Practical advantage: Name two takes, show supplied settings, and keep both original pass-through outputs.

[Executable workflow](../examples/DossImageComparer.json) · [API prompt](../examples/api/DossImageComparer.json)

Inputs: image_a: IMAGE; comparer_mode: choice; image_b: IMAGE; label_a: STRING; label_b: STRING; settings_json: STRING

Outputs: image_a: IMAGE; image_b: IMAGE

## Doss Mask Refine

Refine in this order: grow/shrink, Gaussian feather, optional threshold. White pixels select an area.

Practical advantage: Combine signed growth, feathering, and optional threshold in a single ordered operation.

[Executable workflow](../examples/DossMaskRefine.json) · [API prompt](../examples/api/DossMaskRefine.json)

Inputs: mask: MASK; grow: INT; feather: INT; apply_threshold: BOOLEAN; threshold: FLOAT

Outputs: mask: MASK

## Doss Mask Combine

Combine equal-sized masks: union=max, intersection=min, subtract=clamped A-B, difference=abs(A-B). A single mask can broadcast over a batch.

Practical advantage: Choose four explicit mask operations with strict spatial validation and singleton broadcast.

[Executable workflow](../examples/DossMaskCombine.json) · [API prompt](../examples/api/DossMaskCombine.json)

Inputs: mask_a: MASK; mask_b: MASK; operation: choice

Outputs: mask: MASK

## Doss Mask Preview

Create a colored mask overlay and pass the original mask through. Connect overlay to Preview Image or Doss Image Comparer.

Practical advantage: Preview a colored overlay while passing the original mask onward unchanged.

[Executable workflow](../examples/DossMaskPreview.json) · [API prompt](../examples/api/DossMaskPreview.json)

Inputs: image: IMAGE; mask: MASK; color: STRING; opacity: FLOAT

Outputs: overlay: IMAGE; mask: MASK

## Doss Mask From Channels

Select pixels within an inclusive channel/luminance range. Alpha requires an RGBA image; core Load Image supplies transparency separately as a mask.

Practical advantage: Select an inclusive range from RGB, alpha, or luminance with optional inversion.

[Executable workflow](../examples/DossMaskFromChannels.json) · [API prompt](../examples/api/DossMaskFromChannels.json)

Inputs: image: IMAGE; channel: choice; low: FLOAT; high: FLOAT; invert: BOOLEAN

Outputs: mask: MASK

## Doss Clip Trim

Trim a native video in seconds or frames. End is exclusive; end=0 means the end of the clip. Audio follows the same range.

Practical advantage: Trim native VIDEO by time or frame index while retaining synchronized audio.

[Executable workflow](../examples/DossClipTrim.json) · [API prompt](../examples/api/DossClipTrim.json)

Inputs: video: VIDEO; units: choice; start: FLOAT; end: FLOAT

Outputs: video: VIDEO; report: STRING

## Doss Clip Join

Join two compatible native clips and align audio to the frame boundary. Materializes short clips in memory; max_frames limits the combined output.

Practical advantage: Check clip compatibility and align audio sample boundaries before joining.

[Executable workflow](../examples/DossClipJoin.json) · [API prompt](../examples/api/DossClipJoin.json)

Inputs: a: VIDEO; b: VIDEO; max_frames: INT

Outputs: video: VIDEO; report: STRING

## Doss Shot Sheet

Make a labeled contact sheet plus selected IMAGE frames from a short native video. Enter indices/slices or leave blank for evenly spaced samples. The source remains unchanged.

Practical advantage: Get timestamped contact sheets and the exact selected frame batch together.

[Executable workflow](../examples/DossShotSheet.json) · [API prompt](../examples/api/DossShotSheet.json)

Inputs: video: VIDEO; indices: STRING; count: INT; columns: INT; tile_width: INT; max_frames: INT

Outputs: sheet: IMAGE; frames: IMAGE; timestamps_json: STRING

## Doss Motion Settings | LTX 2.5

Keep LTX prompt, duration, frame count, seed, and motion controls together.

Practical advantage: Keep LTX prompt, duration, frame count, seed, and motion controls together.

[Executable workflow](../examples/DossLTXMotionSettings.json) · [API prompt](../examples/api/DossLTXMotionSettings.json)

Inputs: positive_prompt: STRING; duration_seconds: FLOAT; negative_prompt: STRING; seed: INT; motion_strength: FLOAT; image_adherence: FLOAT; fps: choice

Outputs: positive_prompt: STRING; negative_prompt: STRING; duration_seconds: FLOAT; fps: FLOAT; frame_count: INT; seed: INT; motion_strength: FLOAT; image_adherence: FLOAT

## Doss Motion Studio | LTX 2.5

Draw and restore LTX motion tracks directly over the source image.

Practical advantage: Draw and restore LTX motion tracks directly over the source image.

[Executable workflow](../examples/DossLTXMotionStudio.json) · [API prompt](../examples/api/DossLTXMotionStudio.json)

Inputs: image: IMAGE; motion_plan: STRING; source_ref: STRING

Outputs: image: IMAGE; motion_plan: STRING

## Doss Resolve Motion Tracks | LTX 2.5

Resolve the saved motion plan against explicit source geometry and frame count.

Practical advantage: Resolve the saved motion plan against explicit source geometry and frame count.

[Executable workflow](../examples/DossLTXResolveMotionTracks.json) · [API prompt](../examples/api/DossLTXResolveMotionTracks.json)

Inputs: image: IMAGE; motion_plan: STRING; frame_count: INT

Outputs: tracks: STRING

## Doss Audio Finish

Trim, apply gain or per-item peak normalization, then fade. Silence stays silent. Samples over full scale are reported instead of silently clipped. Duration=0 keeps the remainder.

Practical advantage: Trim, gain, normalize, and fade together, with feedback when samples exceed full scale.

[Executable workflow](../examples/DossAudioFinish.json) · [API prompt](../examples/api/DossAudioFinish.json)

Inputs: audio: AUDIO; start: FLOAT; duration: FLOAT; gain_db: FLOAT; normalize: BOOLEAN; peak_db: FLOAT; fade_in: FLOAT; fade_out: FLOAT

Outputs: audio: AUDIO; report: STRING

## Doss Prompt Recipe

Assemble ordered named sections. JSON entries use name, text, and optional enabled. Returns exact text and a recipe record; no AI or model is needed.

Practical advantage: Keep named sections and their enabled states alongside an exact assembled prompt preview.

[Executable workflow](../examples/DossPromptRecipe.json) · [API prompt](../examples/api/DossPromptRecipe.json)

Inputs: sections: STRING; separator: STRING; prefix: STRING; suffix: STRING

Outputs: prompt: STRING; recipe_json: STRING

## Doss Text Toolkit

Clean whitespace, replace literal text, join strings, or extract a dotted JSON path (arrays use numeric indices). Never evaluates code or regular expressions.

Practical advantage: Use literal text operations and JSON extraction without expressions or custom scripts.

[Executable workflow](../examples/DossTextToolkit.json) · [API prompt](../examples/api/DossTextToolkit.json)

Inputs: text: STRING; operation: choice; argument: STRING; replacement: STRING

Outputs: text: STRING

## Doss Seed Sequence

Derive a repeatable seed from base + index × step, wrapping at 2^53. This range round-trips exactly through browser workflow JSON.

Practical advantage: Reproduce any indexed experiment directly, without relying on queue history.

[Executable workflow](../examples/DossSeedSequence.json) · [API prompt](../examples/api/DossSeedSequence.json)

Inputs: base_seed: INT; index: INT; step: INT

Outputs: seed: INT

## Doss Value Schedule

Evaluate ordered [index,value] keyframes with linear or stepped interpolation. Holds endpoints outside the range; supplies curve data to the node preview.

Practical advantage: Evaluate explicit linear or stepped keyframes and inspect the curve on the node.

[Executable workflow](../examples/DossValueSchedule.json) · [API prompt](../examples/api/DossValueSchedule.json)

Inputs: keyframes: STRING; index: FLOAT; interpolation: choice

Outputs: value: FLOAT; schedule_json: STRING

## Doss Model Inventory

List installed model names by category without loading weights, downloading files, or exposing absolute filesystem paths. Refreshes each run.

Practical advantage: Inspect model availability without loading weights or changing the installation.

[Executable workflow](../examples/DossModelInventory.json) · [API prompt](../examples/api/DossModelInventory.json)

Inputs: category: choice; contains: STRING

Outputs: inventory_json: STRING; count: INT

## Doss Multi-LoRA Loader

Add, remove, enable, and weight multiple LoRAs in one ordered loader. Each enabled LoRA is applied to MODEL and CLIP in displayed order.

Practical advantage: Reorder an entire LoRA stack with independent model and CLIP weights and legacy schema migration.

[Executable workflow](../examples/DossMultiLoraLoader.json) · [API prompt](../examples/api/DossMultiLoraLoader.json)

Inputs: model: MODEL; clip: CLIP; lora_stack_json: STRING

Outputs: model: MODEL; clip: CLIP

## Doss Sampling Preset

Keep sampling parameters together while wiring each value to standard sampler inputs. Saves exact settings, without changing the model or assuming an optimal preset.

Practical advantage: Keep related sampler settings together and wire standard typed outputs to core samplers.

[Executable workflow](../examples/DossSamplingPreset.json) · [API prompt](../examples/api/DossSamplingPreset.json)

Inputs: steps: INT; cfg: FLOAT; sampler_name: choice; scheduler: choice; denoise: FLOAT

Outputs: steps: INT; cfg: FLOAT; sampler_name: STRING; scheduler: STRING; denoise: FLOAT; settings_json: STRING

## Doss Resolution Plan

Set a target long edge and aspect ratio, then snap dimensions to an explicit multiple. Reports the resulting aspect error; does not infer model requirements.

Practical advantage: Choose aspect ratio and divisibility explicitly and inspect the resulting aspect error.

[Executable workflow](../examples/DossResolutionPlan.json) · [API prompt](../examples/api/DossResolutionPlan.json)

Inputs: aspect_width: INT; aspect_height: INT; long_edge: INT; multiple: choice; rounding: choice

Outputs: width: INT; height: INT; report: STRING

## Doss Typed Switch

Select A or B of an explicit native type. Only the selected branch executes. Change data_type before connecting; incompatible links are rejected.

Practical advantage: Choose a native data type and evaluate only the selected upstream branch.

[Executable workflow](../examples/DossTypedSwitch.json) · [API prompt](../examples/api/DossTypedSwitch.json)

Inputs: data_type: choice; select: choice; a: *; b: *

Outputs: selected: *

## Doss Batch Select

Select image or mask items using comma-separated indices and slices such as 0,2,4:10:2. Negative indices count from the end; duplicates preserve requested order.

Practical advantage: Pick exact image or mask takes, slices, and repeated indices in the requested order.

[Executable workflow](../examples/DossBatchSelect.json) · [API prompt](../examples/api/DossBatchSelect.json)

Inputs: data_type: choice; batch: IMAGE,MASK; indices: STRING

Outputs: selected: *; selection_json: STRING

## Doss Batch Join

Concatenate two compatible image or mask batches. Dimensions, channels, dtype, and device must agree. Never silently resizes or converts your inputs.

Practical advantage: Join compatible image or mask batches with a count and clear mismatch errors.

[Executable workflow](../examples/DossBatchJoin.json) · [API prompt](../examples/api/DossBatchJoin.json)

Inputs: data_type: choice; a: IMAGE,MASK; b: IMAGE,MASK

Outputs: batch: *; count: INT

## Doss Table Input

Select one row from CSV with a header or a JSON array of objects. Pair row_json with Text Toolkit → json_field; row_index is explicit and repeatable.

Practical advantage: Drive indexed experiments from embedded CSV or JSON without another file dependency.

[Executable workflow](../examples/DossTableInput.json) · [API prompt](../examples/api/DossTableInput.json)

Inputs: table: STRING; format: choice; row_index: INT

Outputs: row_json: STRING; row_count: INT

## Doss Workflow Timer and Alarm

Watch queue lifecycle and hear a completion alarm without adding processing wires.

Practical advantage: Watch queue lifecycle and hear a completion alarm without adding processing wires.

[Executable workflow](../examples/DossWorkflowTimerAndAlarm.json) · [API prompt](../examples/api/DossWorkflowTimerAndAlarm.json)

Inputs: timer_label: STRING; show_timer_label: BOOLEAN; show_status: BOOLEAN; show_milliseconds: BOOLEAN; hide_node_ui: BOOLEAN; font_size: INT; font_color: STRING; background_color: STRING; background_opacity: FLOAT; border_color: STRING; border_radius: INT; alarm_enabled: BOOLEAN; alarm_sound: choice; alarm_volume: INT

Outputs: None

## Doss Inspector

Inspect tensor dimensions, devices, ranges, and non-finite counts without changing the input. Reports structure rather than prompt text, credentials, or tensor contents.

Practical advantage: Inspect shape, batch, dtype, ranges, and non-finite counts while passing the value through.

[Executable workflow](../examples/DossInspector.json) · [API prompt](../examples/api/DossInspector.json)

Inputs: value: *

Outputs: value: *; report_json: STRING

## Doss Save Image

Save images to the ComfyUI output folder or an output subfolder.

Practical advantage: Keep the existing seven formats and output paths, with optional structured run records.

[Executable workflow](../examples/DossSaveImage.json) · [API prompt](../examples/api/DossSaveImage.json)

Inputs: image: IMAGE; filename: STRING; save_location: STRING; file_format: choice; save_metadata: BOOLEAN; save_metadata_text_file: BOOLEAN; save_run_record: BOOLEAN; run_details: STRING

Outputs: image: IMAGE

## Doss Video Output Pack

Save a native video with synchronized audio and an optional versioned run record, inside ComfyUI output. Uses native encoding and collision-safe filenames.

Practical advantage: Save native video and audio with collision-safe paths and a record of timing and encoding settings.

[Executable workflow](../examples/DossVideoOutputPack.json) · [API prompt](../examples/api/DossVideoOutputPack.json)

Inputs: video: VIDEO; filename: STRING; save_location: STRING; container: choice; codec: choice; save_run_record: BOOLEAN; run_details: STRING

Outputs: video: VIDEO; relative_path: STRING

## Doss Label Maker

Add styled canvas labels without adding executable prompt nodes.

Practical advantage: Organize the canvas with saved typography, colors, and text; labels stay out of API prompts.

Inputs: None

Outputs: None
