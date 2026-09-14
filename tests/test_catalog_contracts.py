import importlib.util
import json
import sys
from pathlib import Path

import pytest

from hub import example_document, load_catalog, validate_preferences

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("doss_contract_test", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
suite = importlib.util.module_from_spec(spec); sys.modules[spec.name] = suite; spec.loader.exec_module(suite)


@pytest.mark.parametrize("version", ["0.3.2", "0.6.0"])
def test_published_node_contracts(version):
    baseline = json.loads((ROOT / "tests" / "fixtures" / "legacy" / f"{version}-contracts.json").read_text(encoding="utf-8"))
    for name, old in baseline["nodes"].items():
        cls = suite.NODE_CLASS_MAPPINGS[name]
        assert list(cls.RETURN_TYPES) == old["outputs"]
        assert cls.FUNCTION == old["function"]
        assert cls.CATEGORY == old["category"]
        assert suite.NODE_DISPLAY_NAME_MAPPINGS[name] == old["name"]
        current = json.loads(json.dumps(cls.INPUT_TYPES()))
        for section, fields in old["inputs"].items():
            assert list(current[section])[:len(fields)] == list(fields)
            assert {k: current[section][k] for k in fields} == fields


def test_exact_catalogue_registration_and_packaged_examples():
    catalog = load_catalog()
    names = {n["id"] for n in catalog["nodes"]}
    assert names - {"Doss Label Maker"} == set(suite.NODE_CLASS_MAPPINGS)
    assert len(names) == 33
    assert json.loads((ROOT / "node_list.json").read_text()) == suite.NODE_DISPLAY_NAME_MAPPINGS
    for node in catalog["nodes"]:
        assert node["description"] and node["advantage"]
        if node.get("example"):
            workflow = example_document(node["example"])
            assert node["id"] in {n["type"] for n in workflow["nodes"]}
            assert (ROOT / "examples" / "api" / node["example"]).exists()
    assert len(catalog["workflows"]) == 9


@pytest.mark.parametrize("path", sorted((ROOT / "examples" / "api").glob("*.json")), ids=lambda p:p.stem)
def test_example_links_reach_valid_nodes(path):
    prompt = json.loads(path.read_text())["prompt"]
    workflow = json.loads((ROOT / "examples" / path.name).read_text())
    assert len(prompt) == len(workflow["nodes"])
    assert all(node["class_type"] != "Doss Label Maker" for node in prompt.values())
    links = {link[0]: link for link in workflow["links"]}
    nodes = {node["id"]: node for node in workflow["nodes"]}
    for link_id, source, slot, target, target_slot, kind in links.values():
        assert link_id in nodes[source]["outputs"][slot]["links"]
        assert nodes[target]["inputs"][target_slot]["link"] == link_id
    for node in prompt.values():
        for value in node["inputs"].values():
            if isinstance(value, list): assert len(value) == 2 and value[0] in prompt


def test_preferences_are_separate_and_bounded():
    value = {"schema_version":1, "favorites":["DossCanvasPrep"]*2, "presets":[{"id":"test", "name":"Square", "node_id":"DossCanvasPrep", "values":{"width":1024}}]}
    assert validate_preferences(value)["favorites"] == ["DossCanvasPrep"]
    assert not (ROOT / "hub-v1.json").exists()
    with pytest.raises(ValueError): validate_preferences({**value, "schema_version":99})
    with pytest.raises(ValueError): validate_preferences({**value, "presets":value["presets"]*129})
    with pytest.raises(ValueError): example_document("../../pyproject.toml")
