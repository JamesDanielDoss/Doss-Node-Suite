# Doss Node Suite

Public custom ComfyUI nodes for James Doss AI tutorials, viewers, members, and Patreon.

This repository is designed to stay simple, beginner-friendly, and installable through GitHub. The long-term goal is compatibility with ComfyUI Manager and the ComfyUI registry.

## Scope

- Public custom ComfyUI nodes.
- Free nodes unless James Doss explicitly changes the release plan.
- Node names branded with the `Doss_` prefix.
- Clear examples and beginner-focused documentation.

## Planned Node Naming

- `Doss_Positive_Prompt`
- `Doss_Negative_Prompt`
- `Doss_Upscale_Image`
- `Doss_LoRA_Loader`
- `Doss_Save_Image`

## Repository Layout

```text
Doss-Node-Suite/
README.md
LICENSE
pyproject.toml
requirements.txt
__init__.py
.gitignore
doss_nodes/
  __init__.py
  nodes/
  web/
    js/
docs/
examples/
  workflows/
  images/
tests/
```

## Development Rules

- Keep nodes focused and easy to teach.
- Do not ship private workflow strategy in this public repo.
- Do not commit models, generated image batches, credentials, or private production notes.
- Update `CHANGELOG.md` for meaningful changes.

## License

MIT License. See `LICENSE`.
