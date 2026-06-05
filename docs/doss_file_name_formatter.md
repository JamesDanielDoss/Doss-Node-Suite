# Doss File Name Formatter

Category: `Doss Node Suite / Utilities`

Display name: `Doss File Name Formatter`

## Purpose

Generate a standardized filename string for ComfyUI outputs.

The output format is:

```text
topic_title_DD_MM_YYYY
```

When the `separator` input is set to `-`, the same structure is emitted with dashes:

```text
topic-title-DD-MM-YYYY
```

## Inputs

| Input | Type | Description |
| --- | --- | --- |
| `topic` | `STRING` | Main filename topic. |
| `title` | `STRING` | Secondary filename title. |
| `date_day` | `INT` | Day value, clamped to `1` through `31` and formatted as two digits. |
| `date_month` | `INT` | Month value, clamped to `1` through `12` and formatted as two digits. |
| `date_year` | `INT` | Year value, clamped to `1` through `9999` and formatted as four digits. |
| `separator` | dropdown | `_` or `-`. |
| `lowercase` | `BOOLEAN` | Lowercase topic and title segments when enabled. |

## Outputs

| Output | Type | Description |
| --- | --- | --- |
| `filename` | `STRING` | Windows-safe filename stem. |

## Sanitizing Rules

- Spaces become the selected separator.
- Windows-unsafe characters are replaced: `<`, `>`, `:`, `"`, `/`, `\`, `|`, `?`, `*`, and control characters.
- Repeated spaces, underscores, and dashes collapse into the selected separator.
- Unsupported filename characters outside `A-Z`, `a-z`, `0-9`, `.`, `_`, and `-` are replaced.
- Empty topic or title segments become `untitled`.
- Reserved Windows device names such as `CON` and `LPT1` are suffixed with `file`.

## Example

Inputs:

```text
topic: text to image
title: production workflow
date_day: 2
date_month: 6
date_year: 2026
separator: _
lowercase: true
```

Output:

```text
text_to_image_production_workflow_02_06_2026
```

## Validation Note

In ComfyUI, install this repository into `custom_nodes/ComfyUI-Doss-Node-Suite`, restart ComfyUI, add the node from `Doss Node Suite / Utilities`, and verify the default output matches:

```text
text_to_image_production_workflow_02_06_2026
```
