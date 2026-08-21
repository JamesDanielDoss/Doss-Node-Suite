# Doss Label Maker

`Doss Label Maker` is a frontend-only visual utility for adding fully customizable free-floating text to a ComfyUI workflow. It is saved in workflow JSON but never enters prompt execution and has no inputs, outputs, widgets, or backend function. The older `DossCanvasLabel` type remains registered as a hidden compatibility alias so existing workflows continue to load, while new labels use the readable `Doss Label Maker` type.

## Add and edit

1. Double-click an empty area of the canvas.
2. Search for `Doss Label Maker`.
3. Place the label and double-click anywhere inside its resizable area to open the formatting panel.
4. Edit the text directly as multiple lines and adjust its font, color, alignment, line height, and wrapping.
5. Choose **Save** to preserve the current size, or **Save and Fit to Text** to fit the area to the explicit text lines.
6. Drag the bottom-right corner on the canvas whenever you want to resize the text area manually.

When the label is not selected, only the formatted text is drawn. Click it once to show a temporary outline and bottom-right resize handle. The outline and handle disappear when another canvas item is selected. Large text automatically expands the required bounds rather than being clipped.

## Properties

Double-click the label to adjust:

- text content;
- font family, size, weight, style, stretch, color, and opacity;
- uppercase, lowercase, title case, underline, strikethrough, and small caps;
- horizontal and vertical alignment plus left-to-right or right-to-left direction;
- line height, letter spacing, word spacing, first-line indentation, padding, and wrapping;
- kerning, with a normal/none choice that is easiest to see in letter pairs such as `AV` and `WA`;
- checkbox-enabled text outline width/color plus checkbox-enabled shadow color, optional blur, and offsets;
- more than 80 curated installed-font choices, plus custom font and color values.

Controls that need context say so in their labels: line height and first-line indentation need multiline text, word spacing needs spaces, right-to-left direction is intended for scripts such as Arabic or Hebrew, and vertical alignment is visible when the label has extra height. **Enable text outline**, **Enable shadow**, and **Blur shadow** make effects explicit. Enabling an effect supplies a visible starting width, offset, or blur while keeping every value editable; shadow color is selectable whenever Shadow is enabled. Font stretch is rendered with explicit horizontal scaling, so every condensed and expanded choice produces a visible geometry change instead of relying on inconsistent browser font support.

The editor intentionally contains no timer, alarm, status, millisecond, background, or persistent node-border settings. Text outlines are an optional typography effect and are unrelated to the temporary resize outline.

## Execution and portability

This is a browser-side virtual node. It does not appear in the ComfyUI API prompt and consumes no model, CPU, GPU, or generation time. A workflow containing it requires Doss Node Suite to display the label; the rest of the executable workflow remains unaffected if the visual extension is missing.
