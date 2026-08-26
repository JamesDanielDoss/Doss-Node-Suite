# Doss Multi-LoRA Loader

`DossMultiLoraLoader` applies an ordered list of installed LoRAs to one MODEL and CLIP pair.

## Interface

- `+ Add LoRA` adds another installed LoRA row.
- Each row contains an enable checkbox, LoRA filename dropdown, separate MODEL and CLIP weights, and remove button.
- MODEL and CLIP weights display with two decimal places and start at `1.00`.
- Unchecked rows remain editable but are visibly subdued so bypassed LoRAs are obvious.
- `Refresh` reloads the filenames in the managed ComfyUI `models/loras` inventory.
- LoRAs execute from top to bottom. Changing their order changes the patch order.
- The editable stack is persisted as versioned JSON in the workflow; the frontend panel itself is not executable data.

## Execution

The node uses ComfyUI's native safe LoRA loading and `load_lora_for_models` path. Enabled rows with a nonzero MODEL or CLIP weight are applied sequentially. Version-1 stacks with one shared `strength` value migrate that value to both controls. Missing files, malformed stack data, unsupported versions, non-finite weights, and more than 32 entries fail closed.

The node does not make incompatible architectures compatible. Every LoRA must match the loaded checkpoint family and its creator's documented base model.
