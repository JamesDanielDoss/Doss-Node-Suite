# Doss Workflow Timer and Alarm

`Doss Workflow Timer and Alarm` is a visual ComfyUI canvas timer for monitoring workflow runtime.

It has no wire inputs and no wire outputs. It sits on the canvas as a display utility, starts when ComfyUI reports workflow execution has started, updates live while execution runs, and stops when execution completes, errors, or is interrupted.

## Node

- Class: `DossWorkflowTimerAndAlarm`
- Display name: `Doss Workflow Timer and Alarm`
- Category: `⚡ Doss Node Suite`
- Input connections: none
- Output connections: none

## Visible UI

The normal node view is a clean dashboard card with:

- Timer label.
- Elapsed time.
- Status.
- Optional small alarm indicator.
- A `Customize` button.

The style and alarm settings are stored in ComfyUI widgets for workflow persistence, but the frontend hides those setting widgets from the main node body and edits them through the `Customize` modal.

Double-clicking the timer card also opens `Customize`. If `Display-only mode` is enabled, the visible `Customize` button is hidden, internal widgets remain collapsed, and the frontend minimizes the normal ComfyUI node chrome as much as LiteGraph allows. Double-click remains the customization path.

## Stored Settings

| Widget | Type | Default | Description |
| --- | --- | --- | --- |
| `timer_label` | `STRING` | `Workflow Timer` | Label text used when `show_timer_label` is enabled. |
| `show_timer_label` | `BOOLEAN` | `True` | Shows or hides the small title/label text on the timer card. |
| `show_status` | `BOOLEAN` | `True` | Shows Ready, Running, Complete, Error, or Canceled. |
| `show_milliseconds` | `BOOLEAN` | `False` | Shows milliseconds in the elapsed time display. |
| `hide_node_ui` | `BOOLEAN` | `False` | Internal persisted setting for user-facing `Display-only mode`. It hides the visible `Customize` button and minimizes the normal node shell. Double-click still opens the modal. |
| `font_size` | `INT` | `28` | Timer value font size, range 12 to 96. |
| `font_color` | `STRING` | `#ffffff` | Timer value color. |
| `background_color` | `STRING` | `#111111` | Timer card background color. |
| `background_opacity` | `FLOAT` | `0.85` | Timer card background opacity, range 0.0 to 1.0. |
| `border_color` | `STRING` | `#3b82f6` | Timer card border color. |
| `border_radius` | `INT` | `8` | Timer card border radius, range 0 to 32. |
| `alarm_enabled` | `BOOLEAN` | `True` | Enables a completion alarm after successful workflow completion. |
| `alarm_sound` | dropdown | `Ping` | `Ping` or `Beep`. |
| `alarm_volume` | `INT` | `70` | Alarm volume, range 0 to 100. |

## Behavior

- Starts on ComfyUI `execution_start`.
- Updates live while the workflow is running.
- Stops on `execution_success` and shows `Complete`.
- Stops on `execution_error` and shows `Error`.
- Stops on `execution_interrupted` and shows `Canceled`.
- Does not treat `executing` with a null node as workflow completion.
- Resets cleanly on the next workflow run.
- Plays generated browser audio only on successful completion.
- Does not play audio when `alarm_enabled` is disabled or `alarm_volume` is `0`.

## Customize Modal

Click `Customize`, or double-click the timer card, to edit the timer display and alarm settings. The modal includes a preview, text/label field, title/label visibility toggle, font size, preset text/background/border color swatches, background opacity, border radius, status/milliseconds toggles, alarm toggle, alarm sound, alarm volume, Save, and Cancel.

The color controls use preset ComfyUI-styled swatches instead of browser color picker inputs. `Transparent` is available for text, background, and border. Existing saved workflows that store hex colors still work. Transparent background skips drawing the card fill, and transparent border skips drawing the border.

Saving writes the selected values back to the node's internal widgets so the settings persist when the workflow is saved.

`Display-only mode` keeps the timer card visible, hides the `Customize` button, tightens the node size, clears the node title text, and minimizes the normal node shell. Regular click-and-hold on the card remains available for dragging the node, while double-click opens `Customize`. ComfyUI/LiteGraph may still show selection outlines, drag handles, or other canvas chrome when the node is selected.

## Limitations

- Timing starts when ComfyUI execution starts, not necessarily when a prompt first enters a busy queue.
- Browser autoplay rules may block alarm playback until the user has interacted with the ComfyUI page.
- Error and canceled states depend on ComfyUI frontend events being emitted for the running prompt.
- Full frameless drawing is limited by the ComfyUI/LiteGraph node renderer; display-only mode minimizes the shell without modifying ComfyUI core.
