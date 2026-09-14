"""Regenerate versioned catalogue and workflow fixtures from a running ComfyUI schema."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DETAILS = {
    "CanvasPrep": ("Image", "One geometry operation keeps image and mask aligned through resize, center crop, or padding."),
    "ImageTransform": ("Image", "Translate, rotate, and scale the image and its mask with the same sampling grid."),
    "LayerComposite": ("Image", "Place a masked layer with opacity and blending, and reuse the resulting coverage mask."),
    "ColorMatch": ("Image", "Blend per-channel reference statistics by strength without loading a color model."),
    "ImageComparer": ("Image", "Name two takes, show supplied settings, and keep both original pass-through outputs."),
    "MaskRefine": ("Masks", "Combine signed growth, feathering, and optional threshold in a single ordered operation."),
    "MaskCombine": ("Masks", "Choose four explicit mask operations with strict spatial validation and singleton broadcast."),
    "MaskPreview": ("Masks", "Preview a colored overlay while passing the original mask onward unchanged."),
    "MaskFromChannels": ("Masks", "Select an inclusive range from RGB, alpha, or luminance with optional inversion."),
    "ClipTrim": ("Video", "Trim native VIDEO by time or frame index while retaining synchronized audio."),
    "ClipJoin": ("Video", "Check clip compatibility and align audio sample boundaries before joining."),
    "ShotSheet": ("Video", "Get timestamped contact sheets and the exact selected frame batch together."),
    "LTXMotionSettings": ("Video", "Keep LTX prompt, duration, frame count, seed, and motion controls together."),
    "LTXMotionStudio": ("Video", "Draw and restore LTX motion tracks directly over the source image."),
    "LTXResolveMotionTracks": ("Video", "Resolve the saved motion plan against explicit source geometry and frame count."),
    "AudioFinish": ("Audio", "Trim, gain, normalize, and fade together, with feedback when samples exceed full scale."),
    "PromptRecipe": ("Prompts", "Keep named sections and their enabled states alongside an exact assembled prompt preview."),
    "TextToolkit": ("Prompts", "Use literal text operations and JSON extraction without expressions or custom scripts."),
    "SeedSequence": ("Prompts", "Reproduce any indexed experiment directly, without relying on queue history."),
    "ValueSchedule": ("Prompts", "Evaluate explicit linear or stepped keyframes and inspect the curve on the node."),
    "ModelInventory": ("Generation", "Inspect model availability without loading weights or changing the installation."),
    "MultiLoraLoader": ("Generation", "Reorder an entire LoRA stack with independent model and CLIP weights and legacy schema migration."),
    "SamplingPreset": ("Generation", "Keep related sampler settings together and wire standard typed outputs to core samplers."),
    "ResolutionPlan": ("Generation", "Choose aspect ratio and divisibility explicitly and inspect the resulting aspect error."),
    "TypedSwitch": ("Workflow", "Choose a native data type and evaluate only the selected upstream branch."),
    "BatchSelect": ("Workflow", "Pick exact image or mask takes, slices, and repeated indices in the requested order."),
    "BatchJoin": ("Workflow", "Join compatible image or mask batches with a count and clear mismatch errors."),
    "TableInput": ("Workflow", "Drive indexed experiments from embedded CSV or JSON without another file dependency."),
    "WorkflowTimerAndAlarm": ("Workflow", "Watch queue lifecycle and hear a completion alarm without adding processing wires."),
    "Inspector": ("Diagnostics", "Inspect shape, batch, dtype, ranges, and non-finite counts while passing the value through."),
    "SaveImage": ("Output", "Keep the existing seven formats and output paths, with optional structured run records."),
    "VideoOutputPack": ("Output", "Save native video and audio with collision-safe paths and a record of timing and encoding settings."),
}
PRESETS = {
    "CanvasPrep": [("Square 1024", {"width": 1024, "height": 1024, "mode": "fit"}), ("Portrait 9:16", {"width": 576, "height": 1024, "mode": "fill"})],
    "ImageTransform": [("Reset transform", {"x": 0, "y": 0, "rotation": 0, "scale": 1})],
    "MaskRefine": [("Soft edge", {"grow": 4, "feather": 8, "apply_threshold": False}), ("Reset refine", {"grow": 0, "feather": 0, "apply_threshold": False})],
    "AudioFinish": [("Peak -1 dBFS", {"normalize": True, "peak_db": -1, "gain_db": 0}), ("Short fades", {"fade_in": 0.05, "fade_out": 0.1})],
    "ResolutionPlan": [("Landscape / 64", {"aspect_width": 16, "aspect_height": 9, "long_edge": 1024, "multiple": 64}), ("Portrait / 32", {"aspect_width": 9, "aspect_height": 16, "long_edge": 1024, "multiple": 32})],
    "BatchSelect": [("First take", {"indices": "0"}), ("Last take", {"indices": "-1"})],
    "SaveImage": [("PNG with run record", {"file_format": "PNG", "save_run_record": True, "save_location": "Doss"})],
}


def widget(spec):
    return isinstance(spec[0], list) or spec[0] in ("STRING", "INT", "FLOAT", "BOOLEAN", "COMBO") and not (len(spec) > 1 and spec[1].get("forceInput"))


def default(spec):
    options = spec[1] if len(spec) > 1 else {}
    if "default" in options: return options["default"]
    if isinstance(spec[0], list): return spec[0][0] if spec[0] else ""
    if spec[0] == "COMBO": return options.get("options", [""])[0] if options.get("options") else ""
    return {"INT": 0, "FLOAT": 0.0, "BOOLEAN": False, "STRING": ""}.get(spec[0])


class Graph:
    def __init__(self, info): self.info, self.prompt = info, {}

    def add(self, kind, **values):
        inputs = {}
        for section in ("required", "optional"):
            for name, spec in self.info[kind]["input"].get(section, {}).items():
                if widget(spec): inputs[name] = default(spec)
        inputs.update(values)
        key = str(len(self.prompt) + 1)
        self.prompt[key] = {"class_type": kind, "inputs": inputs}
        return key

    def image(self, color=0x338899, batch_size=1): return self.add("EmptyImage", width=128, height=96, batch_size=batch_size, color=color)
    def mask(self): return self.add("SolidMask", width=128, height=96, value=0.7)
    def audio(self): return self.add("EmptyAudio", duration=1, sample_rate=24000, channels=2)
    def video(self): return self.add("CreateVideo", images=(self.image(batch_size=12), 0), audio=(self.audio(), 0), fps=12)
    def inspect(self, source, slot=0): return self.add("DossInspector", value=(source, slot))

    def save(self, name, description, requires_models=False):
        records, links, by_id = [], [], {}
        for key, item in self.prompt.items():
            meta = self.info[item["class_type"]]
            inputs, values, outputs = [], [], []
            for section in ("required", "optional"):
                for field, spec in meta["input"].get(section, {}).items():
                    value = item["inputs"].get(field)
                    is_link = isinstance(value, tuple)
                    if widget(spec):
                        values.append(default(spec) if is_link else value)
                        if len(spec) > 1 and spec[1].get("control_after_generate"): values.append("fixed")
                    if not widget(spec) or is_link:
                        data_type = "COMBO" if isinstance(spec[0], list) else spec[0]
                        slot = {"name": field, "type": data_type, "link": None}
                        if widget(spec): slot["widget"] = {"name": field}
                        inputs.append(slot)
            for index, typ in enumerate(meta.get("output", [])):
                if isinstance(typ, list): typ = "COMBO"
                if typ == "*" and "data_type" in item["inputs"]: typ = item["inputs"]["data_type"]
                outputs.append({"name": meta.get("output_name", meta["output"])[index], "type": typ, "links": [], "slot_index": index})
            number = int(key)
            record = {"id": number, "type": item["class_type"], "pos": [60 + ((number - 1) % 4) * 380, 80 + ((number - 1) // 4) * 520], "size": [340, 360], "flags": {}, "order": number - 1, "mode": 0, "inputs": inputs, "outputs": outputs, "properties": {"Node name for S&R": item["class_type"]}, "widgets_values": values}
            records.append(record); by_id[key] = record
        for key, item in self.prompt.items():
            for field, value in item["inputs"].items():
                if not isinstance(value, tuple): continue
                source, source_slot = value
                target_slot = next(i for i, slot in enumerate(by_id[key]["inputs"]) if slot["name"] == field)
                number = len(links) + 1
                typ = by_id[source]["outputs"][source_slot]["type"]
                by_id[key]["inputs"][target_slot]["link"] = number
                by_id[source]["outputs"][source_slot]["links"].append(number)
                links.append([number, int(source), source_slot, int(key), target_slot, typ])
        workflow = {"last_node_id": len(records), "last_link_id": len(links), "nodes": records, "links": links, "groups": [], "config": {}, "extra": {"doss": {"schema_version": 1, "description": description, "requires_models": requires_models}}, "version": 0.4}
        (ROOT / "examples" / f"{name}.json").write_text(json.dumps(workflow, indent=2) + "\n", encoding="utf-8")
        (ROOT / "examples" / "api" / f"{name}.json").write_text(json.dumps({"prompt": self.prompt, "doss_example": workflow["extra"]["doss"]}, indent=2) + "\n", encoding="utf-8")


def node_example(g, short):
    kind = "Doss" + short
    values = {}
    meta = g.info[kind]
    for field, spec in meta["input"].get("required", {}).items():
        typ = spec[0]
        if widget(spec): continue
        if typ == "IMAGE": values[field] = (g.image(0x338899 if field not in ("reference", "foreground") else 0xcc7733), 0)
        elif typ == "MASK": values[field] = (g.mask(), 0)
        elif typ == "AUDIO": values[field] = (g.audio(), 0)
        elif typ == "VIDEO": values[field] = (g.video(), 0)
        elif typ in ("*", "IMAGE,MASK"): values[field] = (g.image(batch_size=3), 0)
    if short == "MultiLoraLoader":
        loader = g.add("CheckpointLoaderSimple", ckpt_name="CHOOSE_YOUR_INSTALLED_CHECKPOINT.safetensors")
        values.update(model=(loader, 0), clip=(loader, 1))
    if short in ("LTXMotionStudio", "LTXResolveMotionTracks"):
        values["motion_plan"] = json.dumps({"schemaVersion": 1, "source": {"ref": "", "width": 128, "height": 96}, "stale": False, "tracks": [{"id": "track-1", "name": "Example track", "color": "#ef4444", "points": [{"x": 0.2, "y": 0.5}, {"x": 0.8, "y": 0.5}]}]})
        if short == "LTXResolveMotionTracks": values["frame_count"] = 9
    if short == "CanvasPrep": values.update(width=192, height=192, mask=(g.mask(), 0))
    if short == "ImageTransform": values.update(rotation=20, scale=0.8, mask=(g.mask(), 0))
    if short == "ImageComparer": values.update(image_b=(g.image(0xcc7733), 0), label_a="A: Teal", label_b="B: Orange")
    if short == "BatchSelect": values.update(indices="-1,0")
    if short == "SaveImage": values.update(filename="Doss_Example", save_location="Doss/Examples", save_run_record=True)
    if short == "VideoOutputPack": values.update(save_location="Doss/Examples")
    if short == "ValueSchedule": values.update(index=12)
    if short == "TextToolkit": values.update(text="  A   sailboat  at sunrise  ")
    target = g.add(kind, **values)
    if not meta.get("output_node") and meta.get("output"): g.inspect(target)
    if short == "WorkflowTimerAndAlarm": g.add("PreviewImage", images=(g.image(), 0))


def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--server", default="http://127.0.0.1:8190"); args = parser.parse_args()
    info = json.load(urlopen(args.server + "/object_info"))
    (ROOT / "examples" / "api").mkdir(parents=True, exist_ok=True)
    catalog = {"schema_version": 1, "version": "0.7.0", "links": {"GitHub · source & commits": "https://github.com/JamesDanielDoss/Doss-Node-Suite", "Comfy Registry · existing listing": "https://registry.comfy.org/nodes/doss-node-suite", "Hugging Face · James Daniel Doss": "https://huggingface.co/jamesdanieldoss"}, "nodes": [], "workflows": []}
    for short, (category, advantage) in DETAILS.items():
        kind = "Doss" + short; meta = info[kind]
        ports = [f"{name}: {'choice' if isinstance(spec[0], list) else spec[0]}" for section in ("required", "optional") for name, spec in meta["input"].get(section, {}).items()]
        catalog["nodes"].append({"id": kind, "name": meta["display_name"], "category": category, "description": meta.get("description") or advantage, "advantage": advantage, "aliases": [short, category], "example": kind + ".json", "inputs": ports, "outputs": [f"{name}: {'COMBO' if isinstance(typ, list) else typ}" for name, typ in zip(meta.get("output_name", []), meta.get("output", []))], "presets": [{"name": name, "values": values} for name, values in PRESETS.get(short, [])]})
        g = Graph(info); node_example(g, short); g.save(kind, advantage, short == "MultiLoraLoader")
    catalog["nodes"].append({"id": "Doss Label Maker", "name": "Doss Label Maker", "category": "Workflow", "description": "Add styled canvas labels without adding executable prompt nodes.", "advantage": "Organize the canvas with saved typography, colors, and text; labels stay out of API prompts.", "aliases": ["annotation", "title", "DossCanvasLabel"], "inputs": [], "outputs": [], "presets": []})
    for category in ("Image", "Masks", "Video", "Audio", "Prompts", "Generation", "Workflow", "Diagnostics", "Output"):
        g = Graph(info)
        if category == "Image":
            image = g.image(); mask = g.mask()
            prep = g.add("DossCanvasPrep", image=(image, 0), mask=(mask, 0), width=192, height=192)
            moved = g.add("DossImageTransform", image=(prep, 0), mask=(prep, 1), rotation=12, scale=0.9)
            g.add("DossSaveImage", image=(moved, 0), filename="Canvas", save_location="Doss/Examples", save_run_record=True)
            description = "Prepare image and mask together, transform them, then save a PNG and run record."
        elif category == "Masks":
            image = g.image(); channel = g.add("DossMaskFromChannels", image=(image, 0), low=0.2)
            refined = g.add("DossMaskRefine", mask=(channel, 0), grow=-6, feather=4)
            preview = g.add("DossMaskPreview", image=(image, 0), mask=(refined, 0))
            g.add("PreviewImage", images=(preview, 0)); description = "Extract, refine, and review a mask while preserving the mask output for further use."
        elif category == "Video":
            video = g.video(); trim = g.add("DossClipTrim", video=(video, 0), units="frames", start=2, end=10)
            joined = g.add("DossClipJoin", a=(trim, 0), b=(trim, 0))
            shots = g.add("DossShotSheet", video=(joined, 0), count=4, tile_width=128)
            g.add("PreviewImage", images=(shots, 0)); g.add("DossVideoOutputPack", video=(joined, 0), filename="Joined", save_location="Doss/Examples")
            description = "Trim a one-second clip with audio, join two takes, review timestamps, and export video."
        elif category == "Audio":
            finished = g.add("DossAudioFinish", audio=(g.audio(), 0), duration=0.8, normalize=True, fade_in=0.05, fade_out=0.1)
            g.inspect(finished); g.add("PreviewAudio", audio=(finished, 0)); description = "Finish a silent test clip, inspect its shape, and preview the result. Replace Empty Audio with your recording."
        elif category == "Prompts":
            recipe = g.add("DossPromptRecipe"); text = g.add("DossTextToolkit", text=(recipe, 0), operation="replace", argument="sailboat", replacement="canoe")
            g.inspect(text); schedule = g.add("DossValueSchedule", index=12); g.inspect(schedule); description = "Assemble a named prompt recipe, replace one subject, and inspect a deterministic value schedule."
        elif category == "Generation":
            resolution = g.add("DossResolutionPlan", long_edge=256, multiple=32)
            image = g.add("EmptyImage", width=(resolution, 0), height=(resolution, 1), color=0x338899)
            settings = g.add("DossSamplingPreset"); g.inspect(settings, 5)
            seed = g.add("DossSeedSequence", base_seed=42, index=3); g.inspect(seed)
            g.add("PreviewImage", images=(image, 0)); description = "Plan dimensions, indexed seeds, and reusable sampler settings without loading any weights."
        elif category == "Workflow":
            batch = g.add("DossBatchJoin", a=(g.image(), 0), b=(g.image(0xcc7733), 0))
            selected = g.add("DossBatchSelect", batch=(batch, 0), indices="1")
            switch = g.add("DossTypedSwitch", a=(selected, 0), b=(g.image(0), 0), select="a")
            g.add("PreviewImage", images=(switch, 0)); description = "Join two takes, select an explicit index, then route only the selected branch."
        elif category == "Diagnostics":
            report = g.inspect(g.image(batch_size=3)); g.add("PreviewImage", images=(report, 0))
            inventory = g.add("DossModelInventory", category="loras"); g.inspect(inventory)
            description = "Inspect an image batch and check installed LoRA filenames without loading weights."
        else:
            image = g.image(); g.add("DossSaveImage", image=(image, 0), filename="Recorded", save_location="Doss/Examples", save_run_record=True, run_details='{"project":"Foundation examples","take":1}')
            g.add("DossVideoOutputPack", video=(g.video(), 0), filename="Recorded", save_location="Doss/Examples")
            description = "Export image and video deliverables with matching structured run records in one output folder."
        file = "category_" + category.lower(); g.save(file, description)
        catalog["workflows"].append({"name": category + " essentials", "category": category, "file": file + ".json", "description": description})
    (ROOT / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "node_list.json").write_text(json.dumps({n["id"]: n["name"] for n in catalog["nodes"] if n["id"] != "Doss Label Maker"}, indent=2) + "\n", encoding="utf-8")
    doc = ["# Doss tools", "", "The versioned Hub catalogue is `catalog.json`. All processing tools also work from ComfyUI's normal node menu and API. Example JSON files contain a complete graph; the `api` subfolder contains executable prompts. The LoRA example requires your own checkpoint selection. Other examples use core synthetic inputs and need no models.", "", "Controls use pixels, clockwise degrees, seconds, dB gain/dBFS peaks, and zero-based end-exclusive indices. Typed switches and batch nodes require choosing the data type before connecting. Defaults are neutral where practical; packaged presets include reset variants. No node installs software or downloads weights.", ""]
    for item in catalog["nodes"]:
        doc += ["## " + item["name"], "", item["description"], "", "Practical advantage: " + item["advantage"], ""]
        if item.get("example"): doc += [f"[Executable workflow](../examples/{item['example']}) · [API prompt](../examples/api/{item['example']})", ""]
        doc += ["Inputs: " + ("; ".join(item["inputs"]) or "None"), "", "Outputs: " + ("; ".join(item["outputs"]) or "None"), ""]
    (ROOT / "docs" / "foundation.md").write_text("\n".join(doc), encoding="utf-8")
    print(f"Generated {len(catalog['nodes'])} catalogue entries and 41 workflow/API pairs.")


if __name__ == "__main__": main()
