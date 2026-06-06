from .nodes.image_comparer import DossImageComparer


WEB_DIRECTORY = "./js"


NODE_CLASS_MAPPINGS = {
    "DossImageComparer": DossImageComparer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DossImageComparer": "Doss Image Comparer",
}

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
