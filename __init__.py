try:
    from .nodes.image_comparer import DossImageComparer
    from .nodes.ltx_motion import (
        DossLTXMotionSettings,
        DossLTXMotionStudio,
        DossLTXResolveMotionTracks,
    )
    from .nodes.multi_lora_loader import (
        DossMultiLoraLoader,
        register_doss_multi_lora_routes,
    )
    from .nodes.save_image import DossSaveImage, register_doss_save_image_routes
    from .nodes.workflow_timer_and_alarm import DossWorkflowTimerAndAlarm
    from .nodes.foundation_image import NODES as IMAGE_NODES
    from .nodes.foundation_controls import NODES as CONTROL_NODES
    from .nodes.foundation_workflow import NODES as WORKFLOW_NODES
    from .nodes.foundation_media import NODES as MEDIA_NODES
    from .hub import register_hub_routes
except ImportError:  # pragma: no cover - supports direct pytest collection from repo root.
    from nodes.image_comparer import DossImageComparer
    from nodes.ltx_motion import (
        DossLTXMotionSettings,
        DossLTXMotionStudio,
        DossLTXResolveMotionTracks,
    )
    from nodes.multi_lora_loader import (
        DossMultiLoraLoader,
        register_doss_multi_lora_routes,
    )
    from nodes.save_image import DossSaveImage, register_doss_save_image_routes
    from nodes.workflow_timer_and_alarm import DossWorkflowTimerAndAlarm
    from nodes.foundation_image import NODES as IMAGE_NODES
    from nodes.foundation_controls import NODES as CONTROL_NODES
    from nodes.foundation_workflow import NODES as WORKFLOW_NODES
    from nodes.foundation_media import NODES as MEDIA_NODES
    from hub import register_hub_routes


WEB_DIRECTORY = "./js"

register_doss_save_image_routes()
register_doss_multi_lora_routes()
register_hub_routes()

NODE_CLASS_MAPPINGS = {
    "DossImageComparer": DossImageComparer,
    "DossLTXMotionSettings": DossLTXMotionSettings,
    "DossLTXMotionStudio": DossLTXMotionStudio,
    "DossLTXResolveMotionTracks": DossLTXResolveMotionTracks,
    "DossMultiLoraLoader": DossMultiLoraLoader,
    "DossSaveImage": DossSaveImage,
    "DossWorkflowTimerAndAlarm": DossWorkflowTimerAndAlarm,
    **IMAGE_NODES,
    **CONTROL_NODES,
    **WORKFLOW_NODES,
    **MEDIA_NODES,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DossImageComparer": "Doss Image Comparer",
    "DossLTXMotionSettings": "Doss Motion Settings | LTX 2.5",
    "DossLTXMotionStudio": "Doss Motion Studio | LTX 2.5",
    "DossLTXResolveMotionTracks": "Doss Resolve Motion Tracks | LTX 2.5",
    "DossMultiLoraLoader": "Doss Multi-LoRA Loader",
    "DossSaveImage": "Doss Save Image",
    "DossWorkflowTimerAndAlarm": "Doss Workflow Timer and Alarm",
}

import re as _re
for _node_id in (*IMAGE_NODES, *CONTROL_NODES, *WORKFLOW_NODES, *MEDIA_NODES):
    NODE_DISPLAY_NAME_MAPPINGS[_node_id] = _re.sub(r"(?<=[a-z])(?=[A-Z])", " ", _node_id)

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
