# Doss Node Suite Publication Checklist

## Registry Identity

- Publisher ID: `jamesdossai`
- Publisher Display Name: `James Doss AI`
- Node pack display name: `Doss Node Suite`
- GitHub repository: `https://github.com/JamesDanielDoss/Doss-Node-Suite`

## Repository Locations

- Active development folder: `C:\AI\Doss-Node-Suite`
- Published staging folder: `C:\AI\Published_ComfyUI_Node_Packs\Doss-Node-Suite`
- Live runtime install target: `C:\AI\ComfyUI\custom_nodes\ComfyUI-Doss-Node-Suite`

## Required Node Pack Files

- `__init__.py`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `requirements.txt`
- `pyproject.toml`
- `.comfyignore`
- `node_list.json`
- `nodes\`
- `js\`
- `docs\`
- `examples\`
- `tests\`

## Required ComfyUI Exports

The top-level `__init__.py` must export:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`
- `WEB_DIRECTORY = "./js"` while frontend JavaScript is used

## Current Completed Nodes

### Doss Image Comparer

- Class: `DossImageComparer`
- Display name: `Doss Image Comparer`
- Category: `Doss Node Suite / Image`
- Inputs: `image_a`, optional `image_b`, `comparer_mode`
- Outputs: `image_a`, `image_b`
- Modes: `Side By Side`, `Slider`
- Removed: `Click` mode, `selected_image` output, persistent floating center preview

### Doss Save Image

- Class: `DossSaveImage`
- Display name: `Doss Save Image`
- Category: `Doss Node Suite`
- Input connection: `image`
- Output connection: `image`
- Widgets: `filename`, `save_location`, `file_format`, `save_metadata`, `save_metadata_text_file`
- Formats: `JPEG`, `PNG`, `PDF`, `WEBP`, `TIFF`, `ICO`, `BMP`
- Browse scope: ComfyUI output directory only
- ICO behavior: one 256x256 `.ico` file

## Registry Preparation Checklist

1. Confirm `pyproject.toml` has `[project]` metadata.
2. Confirm `[project.urls]` includes Repository and Issues.
3. Confirm `[tool.comfy]` includes `PublisherId = "jamesdossai"`.
4. Confirm `[tool.comfy]` includes `DisplayName = "Doss Node Suite"`.
5. Confirm `.comfyignore` excludes development-only files.
6. Confirm runtime files are not excluded.
7. Confirm `node_list.json` lists only currently shipped nodes.
8. Run `python -m unittest discover -s tests`.
9. Run `python -m pytest`.
10. Run a package mapping import check.
11. Fresh clone the GitHub repo into ComfyUI `custom_nodes`.
12. Restart ComfyUI and confirm the shipped nodes load.
13. Confirm public mappings include only `DossImageComparer` and `DossSaveImage`.
14. Confirm no `DossFileNameFormatter` references are active.

## User Install Instructions

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone https://github.com/JamesDanielDoss/Doss-Node-Suite.git ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI and search for `Doss Image Comparer`.
Search for `Doss Save Image` to place the save node.

## Fresh Clone Testing Checklist

1. Clone into a clean ComfyUI `custom_nodes` folder.
2. Restart ComfyUI.
3. Confirm there are no import errors.
4. Confirm `Doss Image Comparer` appears under `Doss Node Suite / Image`.
5. Run `python -m unittest discover -s tests`.
6. Run `python -m pytest`.
7. Run the package mapping import check.
8. Place `Doss Image Comparer` in a workflow.
9. Confirm only `image_a` and `image_b` outputs exist.
10. Confirm Side By Side mode works.
11. Confirm Slider mode works.
12. Confirm no floating center preview remains.
13. Place `Doss Save Image` in a workflow.
14. Confirm Browse is limited to the ComfyUI output directory.
15. Confirm batch saving and auto-incremented filenames work.
16. Confirm invalid filename warning appears when needed.

## Public Safety Checklist

- Confirm no private workflow files are included.
- Confirm no YouTube production files are included.
- Confirm no admin notes, credentials, API keys, account data, or secrets are included.
- Confirm examples are minimal node test examples, not private production workflow packs.

## Publishing Rules

Do not publish to ComfyUI Manager, ComfyUI Registry, GitHub releases, or any public channel without explicit approval from James.

Do not push future changes to GitHub unless James explicitly approves the push.
