# Doss Save Image

Category: `Doss Node Suite`

Display name: `Doss Save Image`

## Purpose

Save ComfyUI IMAGE batches to the normal ComfyUI output folder or an output subfolder while passing the original IMAGE batch through unchanged.

## Connections

| Direction | Name | Type |
| --- | --- | --- |
| Input | `image` | `IMAGE` |
| Output | `image` | `IMAGE` |

No other wire/link/noodle connections are exposed.

## Widgets

| Widget | Type | Default | Description |
| --- | --- | --- | --- |
| `filename` | `STRING` | `ComfyUI` | Filename stem to save. |
| `save_location` | `STRING` | `output` | `output` means the normal ComfyUI output folder. Subfolders are output-relative, such as `Doss Test` or `portraits/session_01`. |
| `file_format` | dropdown | `PNG` | JPEG, PNG, PDF, WEBP, TIFF, ICO, or BMP. |
| `save_metadata` | boolean | `True` | Attempts embedded metadata where supported. |
| `save_metadata_text_file` | boolean | `False` | Writes a `.txt` metadata sidecar tied to the full saved image filename, such as `ComfyUI.png.txt`. |

## Browse Button

The Browse button opens a ComfyUI-styled folder browser rooted at the normal ComfyUI output directory.

- It can select existing folders inside output.
- It can create/select subfolders inside output.
- It cannot browse outside output.
- Absolute paths, drive letters, `..` traversal, and paths outside output are rejected.
- `save_location` stores `output` for the base output folder or an output-relative folder path for subfolders.
- `output`, `output/`, and empty `save_location` all mean the base ComfyUI output folder.
- `output` never creates or resolves to a nested `output/output` folder.

## Filename Safety

Invalid Windows filename characters are replaced with underscores:

```text
\ / : * ? " < > |
```

If replacement occurs, the node still saves successfully and shows:

```text
Bad filename due to special characters. Characters have been changed to underscores "_".
```

Existing files are not overwritten. Names auto-increment:

```text
ComfyUI.png
ComfyUI(1).png
ComfyUI(2).png
```

## Formats

- `JPEG`: transparency is flattened onto white.
- `PNG`: transparency is preserved where possible.
- `PDF`: raster image is saved into a PDF page; transparency is flattened onto white.
- `WEBP`: saved at high practical quality.
- `TIFF`: saved with high quality/lossless behavior where practical.
- `ICO`: saves one 256x256 `.ico` file.
- `BMP`: saved normally/uncompressed.

No SVG, AVIF, compression sliders, or quality controls are included in V1.

## Metadata

When `save_metadata` is enabled, available prompt/workflow metadata is embedded where the selected format supports it. PNG is the most reliable embedded metadata target.

When `save_metadata_text_file` is enabled, the node writes a `.txt` sidecar beside each saved image. The sidecar name appends `.txt` to the full saved filename, for example `ComfyUI.pdf.txt`, `ComfyUI.bmp.txt`, or `ComfyUI(1).bmp.txt`. The text file includes available generation metadata, filename, format, date/time, dimensions, batch index, and node settings. If generation metadata is unavailable, the sidecar says so instead of failing.
