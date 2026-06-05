# Validation Notes

## Automated

Run from the repository root:

```powershell
python -m unittest discover -s tests
```

The tests cover:

- The documented example output.
- Windows-unsafe character replacement.
- Dash separator output.
- ComfyUI-style tuple return behavior.

## Manual ComfyUI Check

1. Clone the repository into `ComfyUI/custom_nodes/ComfyUI-Doss-Node-Suite`.
2. Restart ComfyUI.
3. Confirm the console reports no import errors for the node pack.
4. Search for `Doss File Name Formatter`.
5. Confirm it appears under `Doss Node Suite / Utilities`.
6. Use the default inputs and confirm the `filename` output is:

```text
text_to_image_production_workflow_02_06_2026
```

7. Change `separator` to `-` and confirm the output uses dashes.
8. Add characters such as `/`, `:`, `*`, and `?` to `topic` or `title`, then confirm they are replaced with the selected separator.
