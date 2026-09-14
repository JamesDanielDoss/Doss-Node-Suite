# Publishing the existing Doss suite

Canonical source and commits: [JamesDanielDoss/Doss-Node-Suite](https://github.com/JamesDanielDoss/Doss-Node-Suite). Existing package: [doss-node-suite](https://registry.comfy.org/nodes/doss-node-suite), publisher **jamesdossai**. Model/profile references: [jamesdanieldoss on Hugging Face](https://huggingface.co/jamesdanieldoss). Hugging Face is not a source mirror or package publication target.

## Registry review that must be resolved

On 2026-09-14 UTC, the [public version API](https://api.comfy.org/nodes/doss-node-suite/versions) reported **0.3.2 active** and **0.6.0 banned**. The public 0.6.0 response contains no rejection reason. Do not infer the cause from source scanning, assume it is packaging, or evade the review by renaming the package or publishing another version.

The publisher dashboard requires an authenticated Registry session. Read the actual owner-visible rejection details, correct each verified issue, and follow the review/appeal instructions shown there. Record the reason and resolution evidence in this document and `release-gate.json` after verification. Registry publishing credentials must be verified for **jamesdossai**. GitHub admin access alone does not prove Registry publishing access.

Current evidence: review reason **not yet accessible**, resolution **not verified**, Registry credential **not verified**. No 0.7.0 Registry upload has been made.

## Release procedure

1. Develop on `codex/doss-suite-expansion` in the existing repository. Preserve MIT, the package identity, legacy exports, and history. Run `python -m pytest -q`, `npm test`, `npm run build`, `python scripts/check_release.py`, and native integration checks. Compiled assets must have no diff after a clean frontend build.
2. Complete the Windows/Linux checks, browser lifecycle checks, local RTX 3090/LTX render, and coexistence checks. Keep results in `docs/validation-0.7.0.md`. Complete the Registry review above and update the explicit release gate with evidence.
3. Confirm **v0.7.0** is still unused in GitHub releases/tags and Registry versions before creating the tag. Tag the tested source revision; do not retarget an existing release tag. Merge the manually triggered workflow into the default branch so GitHub can dispatch it.
4. Store the existing publisher's key in the repository secret **REGISTRY_ACCESS_TOKEN**. Never place it in a workflow, preset, issue, screenshot, or commit. The [official Registry publishing guide](https://docs.comfy.org/registry/publishing) documents the publisher-key mechanism.
5. Manually run **Publish tested release**, specifying the existing tag. The workflow resolves and validates its commit, reruns Windows/Linux and native checks for that revision, builds the installable ZIP, publishes the tracked source through Comfy CLI, and waits for active Registry status. It compares every runtime file in the downloaded Registry archive with the tested checkout before creating the GitHub release. Pending review stops delivery; rerunning resumes the status check without uploading an existing version again.
6. Install the downloaded Registry archive in a clean ComfyUI instance. Run the node and category examples, and verify that Manager updates existing users through `doss-node-suite`. Record the Registry archive hash and installed version. A public GitHub release alone does not count as completed Registry delivery.

`scripts/build_release.py` produces an installable ZIP and SHA-256 file with a runtime manifest. `python -m build` also verifies wheel/source packaging. `scripts/check_archive.py` verifies included assets and clean package import. Runtime assets include all processing code, compiled Hub assets, catalogue, guides, and workflow/API examples. Installation needs no frontend build and no model downloads.

No automatic publication occurs on push or pull request. `release-gate.json` prevents publication while the known acceptance blockers remain unresolved.
