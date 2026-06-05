from .nodes.file_name_formatter import DossFileNameFormatter
from .nodes.image_comparer import DossImageComparer


WEB_DIRECTORY = "./js"


NODE_CLASS_MAPPINGS = {
    "DossFileNameFormatter": DossFileNameFormatter,
    "DossImageComparer": DossImageComparer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DossFileNameFormatter": "Doss File Name Formatter",
    "DossImageComparer": "Doss Image Comparer",
}

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
