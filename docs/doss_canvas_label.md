# Doss Canvas Label

`Doss Canvas Label` is a frontend-only visual utility for adding free-floating text to a ComfyUI workflow. It is saved in the workflow JSON but never enters prompt execution and has no inputs, outputs, widgets, or backend function.

## Add and edit

1. Double-click an empty area of the canvas.
2. Search for `Doss Canvas Label`.
3. Place the label and double-click it to edit the text.
4. Use the literal sequence `\n` for a new line.
5. Drag the bottom-right corner to resize it.
6. Right-click and choose `Fit Label to Text` to fit the box to explicit lines.

The node is plain floating text by default. Its selection boundary is only visible while selected.

## Properties

Open the node properties to adjust:

- font size, family, weight, and color;
- left, center, or right alignment;
- line height and wrapping;
- optional background color, padding, and border radius.

Use `transparent` as the background color for unboxed text. Hex, RGB, and RGBA CSS colors are supported by the browser canvas.

## Execution and portability

This is a browser-side virtual node. It does not appear in the ComfyUI API prompt and consumes no model, CPU, GPU, or generation time. A workflow containing it requires Doss Node Suite to display the label; the rest of the executable workflow remains unaffected if the visual extension is missing.
