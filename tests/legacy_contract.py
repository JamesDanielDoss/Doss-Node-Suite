"""The seven public backend identities shipped in 0.6.0 remain contractual."""
LEGACY_IDS = {
    "DossImageComparer", "DossLTXMotionSettings", "DossLTXMotionStudio",
    "DossLTXResolveMotionTracks", "DossMultiLoraLoader", "DossSaveImage",
    "DossWorkflowTimerAndAlarm",
}


def legacy(mapping):
    return {key: value for key, value in mapping.items() if key in LEGACY_IDS}
