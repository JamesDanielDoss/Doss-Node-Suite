from .nodes.file_name_formatter import DossFileNameFormatter


NODE_CLASS_MAPPINGS = {
    "DossFileNameFormatter": DossFileNameFormatter,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DossFileNameFormatter": "Doss File Name Formatter",
}

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]
