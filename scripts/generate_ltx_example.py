"""Build an LTX-2.5 integration example using user-supplied models and native nodes."""
import json
from urllib.request import urlopen

from generate_catalog import Graph, ROOT


def main():
    info = json.load(urlopen("http://127.0.0.1:8190/object_info")); g = Graph(info)
    model = g.add("UNETLoader", unet_name="ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors")
    clip = g.add("CLIPLoader", clip_name="gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors", type="ltxv")
    vae = g.add("VAELoader", vae_name="ltx-2.5-video-vae-conv-bf16.safetensors")
    audio_vae = g.add("VAELoader", vae_name="ltx-2.5-audio-vae-bf16.safetensors")
    lora = g.add("DossMultiLoraLoader", model=(model,0), clip=(clip,0))
    recipe = g.add("DossPromptRecipe", sections=json.dumps([{"name":"Subject", "text":"A small wooden sailboat drifting on a calm mountain lake at sunrise"}, {"name":"Camera", "text":"The camera slowly tracks right, realistic reflections and natural motion"}, {"name":"Sound", "text":"Gentle water and light wind, no music, no speech"}]))
    settings = g.add("DossLTXMotionSettings", positive_prompt=(recipe,0), duration_seconds=1, seed=42, fps="24", negative_prompt="blurry, cartoon, text, watermark")
    size = g.add("DossResolutionPlan", aspect_width=4, aspect_height=3, long_edge=256, multiple=64)
    positive = g.add("CLIPTextEncode", clip=(lora,1), text=(settings,0))
    negative = g.add("CLIPTextEncode", clip=(lora,1), text=(settings,1))
    conditioned = g.add("LTXVConditioning", positive=(positive,0), negative=(negative,0), frame_rate=(settings,3))
    guider = g.add("LTXVDualCFGGuider", model=(lora,0), positive=(conditioned,0), negative=(conditioned,1), video_cfg=1, audio_cfg=1)
    video_latent = g.add("EmptyLTXVLatentVideo", width=(size,0), height=(size,1), length=(settings,4))
    audio_latent = g.add("LTXVEmptyLatentAudio", frames_number=(settings,4), frame_rate=(settings,3), audio_vae=(audio_vae,0))
    latent = g.add("LTXVConcatAVLatent", video_latent=(video_latent,0), audio_latent=(audio_latent,0))
    sampling = g.add("DossSamplingPreset", steps=8, cfg=1, sampler_name="euler_ancestral", scheduler="normal")
    sampler = g.add("KSamplerSelect", sampler_name=(sampling,2))
    noise = g.add("RandomNoise", noise_seed=(settings,5))
    sigmas = g.add("ManualSigmas", sigmas="1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0")
    sampled = g.add("SamplerCustomAdvanced", noise=(noise,0), guider=(guider,0), sampler=(sampler,0), sigmas=(sigmas,0), latent_image=(latent,0))
    separated = g.add("LTXVSeparateAVLatent", av_latent=(sampled,1))
    frames = g.add("VAEDecodeTiled", samples=(separated,0), vae=(vae,0), tile_size=256, overlap=64, temporal_size=32, temporal_overlap=8)
    audio = g.add("LTXVAudioVAEDecode", samples=(separated,1), audio_vae=(audio_vae,0))
    finished = g.add("DossAudioFinish", audio=(audio,0), normalize=True, peak_db=-1, fade_in=0.02, fade_out=0.02)
    video = g.add("CreateVideo", images=(frames,0), audio=(finished,0), fps=(settings,3))
    g.add("DossVideoOutputPack", video=(video,0), filename="LTX25_Integration", save_location="Doss/Examples", run_details='{"purpose":"RTX 3090 integration","sampling":"official distilled 8-step sigmas","lora_stack":"empty passthrough"}')
    shots = g.add("DossShotSheet", video=(video,0), count=4, tile_width=128, max_frames=64)
    g.add("DossSaveImage", image=(shots,0), filename="LTX25_ShotSheet", save_location="Doss/Examples", save_run_record=True)
    g.save("ltx25_integration", "One-second LTX-2.5 integration at 256×192 and 24 fps. Requires the four named installed models. No download is performed.", True)
    print("Generated LTX integration workflow and API prompt.")


if __name__ == "__main__": main()
