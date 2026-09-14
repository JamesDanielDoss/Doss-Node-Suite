# After the foundation

The 0.7 foundation establishes processing utilities, native types, compatibility fixtures, a versioned catalogue, per-user presets, and executable examples. The following are subsequent increments, not features claimed by this release.

1. **Crop and restore:** explicit crop transforms and metadata, mask-driven regions, and restoration into the original canvas. Verify geometry through nested crops and batched inputs.
2. **Segmentation and upscaling adapters:** adapters around installed providers with availability checks and explicit model selection. Users obtain weights separately; avoid duplicating inference engines.
3. **Animation and transitions:** deterministic motion schedules, compatible video transitions, audio mixing, sample/frame alignment, and bounded-memory processing of longer clips.
4. **Experiments and sampling:** batch parameter tables, reusable experiments, advanced sampler adapters, run comparisons, and measured performance diagnostics.
5. **Continuity and 3D/texture utilities:** shot-to-shot comparison, reusable review records, texture preparation, and native mesh/3D interoperability where supported.

Each increment needs a concrete core-workflow advantage, stable sockets and saved settings, a runnable example, failure cases, and measured benchmarks before performance claims. Keep a wholesale V3 node migration separate from feature releases, with its own workflow restoration and API compatibility tests.
