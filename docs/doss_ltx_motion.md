# Doss Motion Node | LTX 2.5

These three nodes provide a beginner-facing authoring layer for the official Lightricks LTX Motion Track workflow. They do not replace the LTX model loader, conditioning, IC-LoRA guide, sampler, or decoder.

## Doss Motion Settings | LTX 2.5

Category: `⚡ Doss Node Suite/LTX-2.5`

- Basic controls: positive prompt and duration.
- Advanced controls: negative prompt, seed, motion strength, image adherence, and 24/30 FPS.
- Calculates the required frame count with `1 + floor(duration * fps / 8) * 8`.
- Exposes the calculated frame count as an output so the editor does not require a manual sample count.

## Doss Motion Studio | LTX 2.5

Category: `⚡ Doss Node Suite/LTX-2.5`

- Reads the image selected in an upstream core `Load Image` node and displays it before execution.
- Stores named and colored motion tracks as normalized coordinates.
- Supports moving tracks, static points, add/delete, clear, undo/redo, point dragging, right-click point removal, and a START-to-END playhead preview.
- Marks a plan stale when the upstream filename or image dimensions change.
- Requires the user to choose `Keep & rescale` or `Clear tracks` before execution can continue.
- Validates the filename, image dimensions, track ids, names, colors, and point bounds before passing the IMAGE and motion plan downstream.

Track names are organizational labels. The LTX model does not semantically bind a label such as `shoulder` or `ball` to an object. The first point must be placed on the object being guided; later points describe its path.

## Doss Resolve Motion Tracks | LTX 2.5

Category: `⚡ Doss Node Suite/LTX-2.5`

- Accepts the resized IMAGE, normalized motion plan, and derived frame count.
- Uses Catmull-Rom interpolation for paths with three or more points.
- Repeats a static point for every frame.
- Produces one integer pixel coordinate per track per frame.
- Returns the same JSON STRING track shape consumed by the official `LTXVDrawTracks` node.

## Compatibility boundary

The nodes were designed for the official Lightricks Motion Track Control path. A workflow still requires the official LTX model files, Motion Track IC-LoRA, ComfyUI-LTXVideo custom nodes, and compatible ComfyUI runtime. The Doss nodes fail closed when their motion plan is malformed, empty, stale, or bound to a different starting image.
