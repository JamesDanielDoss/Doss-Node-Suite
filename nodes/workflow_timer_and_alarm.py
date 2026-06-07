from __future__ import annotations


TIMER_LABEL_DEFAULT = "Workflow Timer"
ALARM_SOUNDS = ("Ping", "Beep")


class DossWorkflowTimerAndAlarm:
    CATEGORY = "Doss Node Suite"
    FUNCTION = "noop"
    RETURN_TYPES = ()

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "timer_label": ("STRING", {"default": TIMER_LABEL_DEFAULT, "multiline": False}),
                "show_timer_label": ("BOOLEAN", {"default": True}),
                "show_status": ("BOOLEAN", {"default": True}),
                "show_milliseconds": ("BOOLEAN", {"default": False}),
                "hide_node_ui": ("BOOLEAN", {"default": False}),
                "font_size": ("INT", {"default": 28, "min": 12, "max": 96}),
                "font_color": ("STRING", {"default": "#ffffff", "multiline": False}),
                "background_color": ("STRING", {"default": "#111111", "multiline": False}),
                "background_opacity": ("FLOAT", {"default": 0.85, "min": 0.0, "max": 1.0}),
                "border_color": ("STRING", {"default": "#3b82f6", "multiline": False}),
                "border_radius": ("INT", {"default": 8, "min": 0, "max": 32}),
                "alarm_enabled": ("BOOLEAN", {"default": True}),
                "alarm_sound": (ALARM_SOUNDS, {"default": "Ping"}),
                "alarm_volume": ("INT", {"default": 70, "min": 0, "max": 100}),
            }
        }

    def noop(self, **_kwargs):
        return ()
