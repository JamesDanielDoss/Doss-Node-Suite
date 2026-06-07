try:
    from .nodes.image_comparer import DossImageComparer
    from .nodes.save_image import DossSaveImage, register_doss_save_image_routes
except ImportError:  # pragma: no cover - supports direct pytest collection from repo root.
    from nodes.image_comparer import DossImageComparer
    from nodes.save_image import DossSaveImage, register_doss_save_image_routes


WEB_DIRECTORY = "./js"

register_doss_save_image_routes()

NODE_CLASS_MAPPINGS = {
    "DossImageComparer": DossImageComparer,
    "DossSaveImage": DossSaveImage,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DossImageComparer": "Doss Image Comparer",
    "DossSaveImage": "Doss Save Image",
}

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
