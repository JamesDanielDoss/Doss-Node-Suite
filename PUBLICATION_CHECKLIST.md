# Doss Node Suite Publication Checklist

## Registry Identity

- Publisher ID: `jamesdossai`
- Publisher Display Name: `James Doss AI`
- Node display name: `Doss Node Suite`
- GitHub repository: `https://github.com/JamesDanielDoss/Doss-Node-Suite`

## Repository Locations

- Active development folder: `C:\AI\ComfyUI\custom_nodes\ComfyUI-Doss-Node-Suite`
- Local backup mirror: `C:\AI\GitHub_Backups\ComfyUI-Doss-Node-Suite`
- Published staging folder: `C:\AI\Published_ComfyUI_Node_Packs\Doss-Node-Suite`

## Required Node Pack Files

- `__init__.py`
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `requirements.txt`
- `pyproject.toml`
- `.comfyignore`
- `nodes\`
- `js\`
- `docs\`
- `examples\`
- `node_list.json`

## Required ComfyUI Exports

The top-level `__init__.py` must export:

- `NODE_CLASS_MAPPINGS`
- `NODE_DISPLAY_NAME_MAPPINGS`
- `WEB_DIRECTORY = "./js"` while frontend JavaScript is used

## Current Completed Node

### Doss Image Comparer

- Category: `Doss Node Suite / Image`
- Inputs: `image_a`, `image_b`
- Outputs: `image_a`, `image_b`
- Modes: `Side By Side`, `Slider`
- Removed: `Click` mode, `selected_image` output, persistent floating center preview

## Registry Preparation Checklist

1. Confirm `pyproject.toml` has `[project]` metadata.
2. Confirm `[project.urls]` includes Repository and Issues.
3. Confirm `[tool.comfy]` includes `PublisherId = "jamesdossai"`.
4. Confirm `[tool.comfy]` includes `DisplayName = "Doss Node Suite"`.
5. Confirm `node_list.json` contains `DossImageComparer`.
6. Confirm `.comfyignore` excludes development-only files.
7. Confirm runtime files are not excluded.
8. Run `python -m unittest discover -s tests`.
9. Run the package mapping import check.
10. Fresh clone the GitHub repo into ComfyUI `custom_nodes`.
11. Restart ComfyUI and confirm Doss Image Comparer loads.

## Future Registry Steps

These steps come later and require explicit approval from James:

- Configure the Comfy Registry API key.
- Run the manual publish command:

```powershell
comfy node publish
```

Do not publish without explicit approval.

## User Install Instructions

```powershell
cd C:\AI\ComfyUI\custom_nodes
git clone https://github.com/JamesDanielDoss/Doss-Node-Suite.git ComfyUI-Doss-Node-Suite
```

Then restart ComfyUI and search for `Doss`.

## Fresh Clone Testing Checklist

1. Clone into a clean ComfyUI `custom_nodes` folder.
2. Restart ComfyUI.
3. Confirm there are no import errors.
4. Confirm `Doss Image Comparer` appears under `Doss Node Suite / Image`.
5. Run `python -m unittest discover -s tests`.
6. Run the package mapping import check.
7. Place `Doss Image Comparer` in a workflow.
8. Confirm only `image_a` and `image_b` outputs exist.
9. Confirm Side By Side mode works.
10. Confirm Slider mode works.
11. Confirm no floating center preview remains.

## ComfyUI Manager Publishing Checklist

Do not publish to ComfyUI Manager without explicit approval from James.

Before submitting:

- Confirm repository URL is public and stable.
- Confirm license is correct.
- Confirm README install instructions are accurate.
- Confirm node categories and display names are stable.
- Confirm dependencies are minimal and listed in `requirements.txt`.
- Confirm fresh clone testing passes.
- Confirm examples are minimal test examples, not workflow packs.

## Comfy Registry Publishing Checklist

Do not publish to Comfy Registry without explicit approval from James.

Before submitting:

- Review current Comfy Registry package requirements.
- Confirm metadata in `pyproject.toml` is accurate.
- Confirm versioning policy.
- Confirm all public docs match the shipped node behavior.
- Confirm no private/local-only paths are required at runtime.
- Confirm fresh install and ComfyUI startup validation pass.

## Future Push Rules

- Local edits are allowed only in `C:\AI\ComfyUI\custom_nodes\ComfyUI-Doss-Node-Suite`.
- Local commits are allowed.
- Local backup mirroring is allowed.
- Do not push future changes to GitHub unless James explicitly approves the push.
- Do not create tags, releases, pull requests, GitHub Actions, or repository setting changes without explicit approval.
- Do not publish to ComfyUI Manager or Comfy Registry without explicit approval.

Required approval phrase for future GitHub pushes:

```text
Approved, push to GitHub.
```

Public publishing requires separate explicit approval.
