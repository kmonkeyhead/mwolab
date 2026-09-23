#!/usr/bin/env python3
import argparse
import json
import os
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

GAME_DATA_PAK = Path("Game") / "GameData.pak"
LOCALIZATION_PAK = Path("Game") / "Localized" / "English_xml.pak"
MECHS_DIR = Path("Game") / "mechs"

HARDPOINT_TYPES = {
    "0": "ballistic",
    "1": "energy",
    "2": "missile",
    "3": "ams",
    "4": "ams",
}
COMPONENT_CAPABILITY_ATTRIBUTES = {
    "canequipecm": "CanEquipECM",
}

ITEM_FILES = [
    ("weapons", "Libs/Items/Weapons/Weapons.xml"),
    ("ammo", "Libs/Items/Modules/Ammo.xml"),
    ("engines", "Libs/Items/Modules/Engines.xml"),
    ("equipment", "Libs/Items/Modules/Equipment.xml"),
    ("internals", "Libs/Items/Modules/Internals.xml"),
    ("jumpjets", "Libs/Items/Modules/JumpJets.xml"),
    ("masc", "Libs/Items/Modules/MASC.xml"),
    ("weapon_mods", "Libs/Items/Modules/WeaponMods.xml"),
    ("upgrades", "Libs/Items/UpgradeTypes/UpgradeTypes.xml"),
]

SKILL_TREE_FILE = "Libs/MechPilotTalents/MechSkillTreeNodes.xml"
SKILL_TREE_DISPLAY_FILE = "Libs/MechPilotTalents/MechSkillTreeNodesDisplay.xml"
SKILL_CATEGORY_COLUMN_RANGES = [
    ("FirePower", 0, 16),
    ("Survival", 18, 28),
    ("Mobility", 30, 39),
    ("JumpJets", 41, 45),
    ("Operations", 47, 54),
    ("Sensors", 56, 63),
    ("Auxiliary", 65, 73),
]
SKILL_SCOPE_TYPES = {"Faction", "WeightClass", "Tonnage", "Mech"}


def missing_self_closing_tag_endings(data: bytes):
    """Return byte offsets of a narrowly proven missing ``>`` terminator.

    The installed data has one known form of XML damage: a complete start tag
    ending in ``/`` at a physical line boundary, without its final ``>``.  Do
    not make this a general XML fixer.  In particular, comments, CDATA,
    declarations, processing instructions, quoted attribute values, and text
    are skipped rather than searched for a repair candidate.
    """
    repairs = []
    index = 0
    length = len(data)
    name_start = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_:"

    while index < length:
        if data[index:index + 1] != b"<":
            index += 1
            continue
        if data.startswith(b"<!--", index):
            end = data.find(b"-->", index + 4)
            index = length if end == -1 else end + 3
            continue
        if data.startswith(b"<![CDATA[", index):
            end = data.find(b"]]>", index + 9)
            index = length if end == -1 else end + 3
            continue
        if data.startswith(b"<?", index):
            end = data.find(b"?>", index + 2)
            index = length if end == -1 else end + 2
            continue
        if data.startswith(b"<!", index) or data.startswith(b"</", index):
            # Declarations (including DOCTYPE internal subsets) and end tags
            # are not start tags.  Skip quoted text and nested declaration
            # brackets so their contents cannot become repair candidates.
            cursor = index + 2
            quote = None
            bracket_depth = 0
            while cursor < length:
                char = data[cursor:cursor + 1]
                if quote:
                    if char == quote:
                        quote = None
                elif char in (b'"', b"'"):
                    quote = char
                elif char == b"[":
                    bracket_depth += 1
                elif char == b"]" and bracket_depth:
                    bracket_depth -= 1
                elif char == b">" and not bracket_depth:
                    cursor += 1
                    break
                cursor += 1
            index = cursor
            continue
        if data[index + 1:index + 2] not in name_start:
            index += 1
            continue

        # This is a named XML start tag.  Only a slash outside attribute
        # quotes followed only by horizontal whitespace and a line boundary
        # (or EOF) can be repaired.
        cursor = index + 1
        quote = None
        while cursor < length:
            char = data[cursor:cursor + 1]
            if quote:
                if char == quote:
                    quote = None
                cursor += 1
                continue
            if char in (b'"', b"'"):
                quote = char
                cursor += 1
                continue
            if char == b">":
                cursor += 1
                break
            if char == b"/":
                boundary = cursor + 1
                while boundary < length and data[boundary:boundary + 1] in (b" ", b"\t"):
                    boundary += 1
                if (
                    boundary == length
                    or data.startswith(b"\r\n", boundary)
                    or data.startswith(b"\n", boundary)
                ):
                    repairs.append(cursor + 1)
                    cursor = boundary
                    if data.startswith(b"\r\n", cursor):
                        cursor += 2
                    elif data.startswith(b"\n", cursor):
                        cursor += 1
                    break
            cursor += 1
        index = cursor
    return repairs


def apply_missing_self_closing_tag_endings(data: bytes, repairs):
    if not repairs:
        return data
    repaired = bytearray()
    previous = 0
    for offset in repairs:
        repaired.extend(data[previous:offset])
        repaired.extend(b">")
        previous = offset
    repaired.extend(data[previous:])
    return bytes(repaired)


def source_lines_for_offsets(data: bytes, offsets):
    return [data.count(b"\n", 0, offset) + 1 for offset in offsets]


def parse_xml(data: bytes, source: str):
    try:
        return ET.fromstring(data)
    except ET.ParseError as strict_error:
        repairs = missing_self_closing_tag_endings(data)
        if not repairs:
            raise RuntimeError(f"Could not parse {source}: {strict_error}") from strict_error
        try:
            root = ET.fromstring(apply_missing_self_closing_tag_endings(data, repairs))
        except ET.ParseError as repaired_error:
            raise RuntimeError(f"Could not parse {source}: {repaired_error}") from repaired_error
        lines = ", ".join(str(line) for line in source_lines_for_offsets(data, repairs))
        print(
            f"Repaired missing XML self-closing tag terminator in {source} at line(s): {lines}",
            file=sys.stderr,
        )
        return root


def maybe_num(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    text = str(value).strip()
    if text == "":
        return text
    try:
        if text.lower().startswith("0x"):
            return text
        if any(ch in text for ch in [".", "e", "E"]):
            return float(text)
        return int(text)
    except ValueError:
        return text


def attrs(element):
    return {key: maybe_num(value) for key, value in element.attrib.items()}


def loc_data(element):
    loc = element.find("Loc")
    if loc is None:
        return {}
    return {
        "name_tag": loc.attrib.get("nameTag", ""),
        "desc_tag": loc.attrib.get("descTag", ""),
        "icon_tag": loc.attrib.get("iconTag", ""),
    }


def localization_key(tag):
    text = str(tag or "").strip()
    return text[1:] if text.startswith("@") else text


def build_localization_lookup(localization):
    lookup = {}
    source_keys = {}
    for key, value in localization.items():
        folded = localization_key(key).casefold()
        if folded in lookup:
            if lookup[folded] != value:
                raise RuntimeError(
                    "Localization keys normalize to conflicting values: "
                    f"{source_keys[folded]} and {key}"
                )
            continue
        lookup[folded] = value
        source_keys[folded] = key
    return lookup


def display_from_tag(tag, localization, fallback):
    key = localization_key(tag)
    if not key:
        return fallback
    return localization.get(key, fallback)


def localized_name(key, localization, missing, kind, internal_name):
    key = localization_key(key)
    value = localization.get(key.casefold()) if key else None
    if value:
        return value
    if key:
        missing.append({
            "kind": kind,
            "key": key,
            "internal_name": internal_name,
        })
        return key
    return internal_name


def is_non_buildable_trial_mech(mech, localization):
    key = localization_key(mech.get("name"))
    translated_name = localization.get(key.casefold()) if key else None
    return (
        isinstance(translated_name, str)
        and translated_name.rstrip().endswith("(T)")
    )


def mapping_value_case_insensitive(mapping, key, default=""):
    matches = [
        value
        for candidate, value in mapping.items()
        if str(candidate).casefold() == key.casefold()
    ]
    if not matches:
        return default
    if any(value != matches[0] for value in matches[1:]):
        raise RuntimeError(f"Conflicting source fields for {key}")
    return matches[0]


def is_lgd_special_mech(mech, definition):
    variant_type = mapping_value_case_insensitive(
        definition.get("stats", {}),
        "VariantType",
    )
    return (
        str(mech.get("name", "")).casefold().endswith("lgd")
        and str(variant_type).strip().casefold() == "special"
    )


def is_normal_mech(definition):
    variant_type = mapping_value_case_insensitive(
        definition.get("stats", {}),
        "VariantType",
    )
    return not str(variant_type).strip()


def strip_localized_chassis_prefix(mech, display_name, localization):
    chassis_key = localization_key(mech.get("chassis"))
    chassis_name = localization.get(chassis_key.casefold()) if chassis_key else None
    if not isinstance(chassis_name, str) or not chassis_name.strip():
        return display_name

    chassis_name = chassis_name.strip()
    if display_name.casefold() == chassis_name.casefold():
        return display_name
    prefixes = [chassis_name]
    chassis_words = chassis_name.split()
    if (
        len(chassis_words) == 2
        and chassis_words[1].casefold() == "clan"
    ):
        base_name = chassis_words[0]
        prefixes.extend((f"CLAN {base_name}", base_name))

    for candidate in prefixes:
        prefix = display_name[:len(candidate)]
        remainder = display_name[len(candidate):]
        if (
            prefix.casefold() != candidate.casefold()
            or not remainder
            or not remainder[0].isspace()
        ):
            continue
        stripped_name = remainder.lstrip()
        if stripped_name:
            return stripped_name
    return display_name


def localized_mech_name(
    mech,
    definition,
    localization,
    missing,
    internal_name,
):
    localized_display_name = localized_name(
        mech.get("name", ""),
        localization,
        missing,
        "mech",
        internal_name,
    )
    if is_normal_mech(definition):
        variant = str(mapping_value_case_insensitive(
            definition.get("stats", {}),
            "Variant",
        )).strip()
        if not variant:
            raise RuntimeError(
                f"Normal mech {mech.get('name', internal_name)} is missing "
                "definition.stats.Variant"
            )
        display_name = variant
    else:
        display_name = strip_localized_chassis_prefix(
            mech,
            localized_display_name,
            localization,
        )
    if (
        is_lgd_special_mech(mech, definition)
        and not display_name.rstrip().casefold().endswith("(lgd)")
    ):
        return f"{display_name.rstrip()} (LGD)"
    return display_name


def normalized_missing_localization_keys(missing):
    unique = {
        (
            str(item.get("kind", "")),
            str(item.get("key", "")),
            str(item.get("internal_name", "")),
        )
        for item in missing
    }
    return [
        {"kind": kind, "key": key, "internal_name": internal_name}
        for kind, key, internal_name in sorted(
            unique,
            key=lambda item: (
                item[0].casefold(),
                item[1].casefold(),
                item[2].casefold(),
            ),
        )
    ]


def print_missing_localization_keys(missing):
    missing = normalized_missing_localization_keys(missing)
    print("Missing localization keys:")
    if not missing:
        print("  (none)")
        return
    for item in missing:
        print(
            f"  [{item['kind']}] {item['key']} "
            f"(internal: {item['internal_name']})"
        )


def parse_localization(game_dir: Path, value_column=2):
    if value_column not in {1, 2}:
        raise ValueError(f"Unsupported localization value column: {value_column}")
    loc_pak = game_dir / LOCALIZATION_PAK
    if not loc_pak.exists():
        raise RuntimeError(f"Localization pak not found: {loc_pak}")
    with zipfile.ZipFile(loc_pak) as zf:
        root = parse_xml(zf.read("Localization/English/TheRealLoc.xml"), "TheRealLoc.xml")

    ns = {"ss": "urn:schemas-microsoft-com:office:spreadsheet"}
    data = {}
    for row in root.findall(".//ss:Row", ns):
        values = []
        for cell in row.findall("ss:Cell", ns):
            node = cell.find("ss:Data", ns)
            values.append(node.text if node is not None and node.text is not None else "")
        if len(values) >= 3:
            key = values[0].strip()
            value = values[value_column].strip()
            if key and key.lower() not in {"id", "name", "key"}:
                data[key] = value
    return data


def parse_item(
    element,
    family,
    localization,
    name_localization,
    missing_localization_keys,
):
    loc = loc_data(element)
    internal_name = element.attrib.get("name", "")
    name_tag = loc.get("name_tag")
    if family == "weapons":
        display_name = localized_name(
            name_tag or internal_name,
            name_localization,
            missing_localization_keys,
            "weapon",
            internal_name,
        )
    else:
        display_name = display_from_tag(name_tag, localization, internal_name)
    item = {
        "id": int(element.attrib["id"]),
        "name": internal_name,
        "family": family,
        "kind": element.tag.lower(),
        "ctype": element.attrib.get("CType", ""),
        "faction": element.attrib.get("faction", ""),
        "aliases": element.attrib.get("HardpointAliases", ""),
        "loc": loc,
        "display_name": display_name,
        "description": display_from_tag(loc.get("desc_tag"), localization, ""),
        "icon": "",
        "stats": {},
        "ranges": [],
        "weapon_stat_filters": [],
    }

    for child in element:
        if child.tag.endswith("Stats") or child.tag == "ModuleStats":
            item["stats"].update(attrs(child))
            if child.tag == "TargetingComputerStats":
                for filter_node in child.findall("WeaponStatsFilter"):
                    compatible_weapons = [
                        name.strip()
                        for name in filter_node.attrib.get("compatibleWeapons", "").split(",")
                        if name.strip()
                    ]
                    item["weapon_stat_filters"].append({
                        "tag": filter_node.attrib.get("tag", ""),
                        "compatible_weapons": compatible_weapons,
                        "weapon_stats": [attrs(node) for node in filter_node.findall("WeaponStats")],
                        "ranges": [attrs(node) for node in filter_node.findall("Range")],
                    })
        elif child.tag == "Ranges":
            item["ranges"] = [attrs(range_node) for range_node in child.findall("Range")]

    if not item["weapon_stat_filters"]:
        item.pop("weapon_stat_filters")

    if family == "engines":
        item["item_type"] = "engine"
    elif family == "weapons":
        item["item_type"] = "weapon"
    elif family == "ammo":
        item["item_type"] = "ammo"
    elif family == "internals":
        item["item_type"] = "internal"
    elif family == "jumpjets":
        item["item_type"] = "jumpjet"
    elif family == "masc":
        item["item_type"] = "masc"
    elif family == "weapon_mods":
        item["item_type"] = "weapon_mod"
    elif family == "upgrades":
        item["item_type"] = "upgrade"
    else:
        item["item_type"] = "module"

    if item["stats"].get("type"):
        item["hardpoint_type"] = str(item["stats"]["type"]).lower()
    return item


def quirk_loc_candidates(name):
    base = name.lower()
    short = base.replace("_multiplier", "_mult").replace("_additive", "_add")
    candidates = [
        f"qrk_{short}",
        f"ui_quirk_{base}",
    ]
    aliases = {
        "critchance": "crit_chance",
        "armorresist": "armor_resist",
        "internalresist": "internal_resist",
        "heatdissipation": "heat_loss",
        "overheatdamage": "overheat_damage",
        "xpbonus": "xp_bonus",
        "cbbonus": "cb_bonus",
        "torso_yawangle": "torso_angle_yaw",
        "torso_pitchangle": "torso_angle_pitch",
    }
    for old, new in aliases.items():
        if old in base:
            candidates.append(f"ui_quirk_{base.replace(old, new)}")
        if old in short:
            candidates.append(f"qrk_{short.replace(old, new)}")
    return candidates


def fallback_quirk_name(name):
    text = name.lower()
    text = text.replace("_multiplier", "").replace("_additive", "")
    replacements = {
        "is": "IS ",
        "clan": "Clan ",
        "armorresist": "Armor",
        "internalresist": "Structure",
        "critchance": "Crit Chance",
        "heatdissipation": "Heat Dissipation",
        "overheatdamage": "Overheat Damage",
        "xpbonus": "XP Bonus",
        "cbbonus": "C-Bills Bonus",
        "ammocapacity": "Ammo Capacity",
        "cooldown": "Cooldown",
        "velocity": "Velocity",
        "range": "Range",
        "heat": "Heat",
        "duration": "Duration",
        "spread": "Spread",
        "jamchance": "Jam Chance",
        "jamtime": "Jam Time",
    }
    words = []
    for part in text.split("_"):
        words.append(replacements.get(part, part.replace("autocannon", "AutoCannon ").title()))
    return " ".join(words).replace("  ", " ").strip()


def format_quirk_value(name, value):
    numeric = maybe_num(value)
    if not isinstance(numeric, (int, float)):
        return str(value)
    if name.endswith("_multiplier"):
        percent = numeric * 100
        return f"{percent:+g}%"
    if name.endswith("_additive"):
        return f"{numeric:+g}"
    return f"{numeric:+g}"


def parse_quirk_node(node, localization, source=""):
    name = node.attrib.get("name", "")
    value = maybe_num(node.attrib.get("value", 0))
    display = ""
    for key in quirk_loc_candidates(name):
        if key in localization:
            display = localization[key]
            break
    if not display:
        display = fallback_quirk_name(name)
    return {
        "name": name,
        "value": value,
        "value_text": format_quirk_value(name, value),
        "display_name": display,
        "source": source,
    }


def parse_quirks(parent, localization, source=""):
    if parent is None:
        return []
    return [parse_quirk_node(node, localization, source) for node in parent.findall("Quirk")]


def parse_component_hardpoints(comp):
    hardpoints = []
    for child in list(comp):
        if child.tag != "Hardpoint":
            continue
        hp = attrs(child)
        hp["hardpoint_type"] = HARDPOINT_TYPES.get(str(hp.get("Type")), str(hp.get("Type", "")).lower())
        hardpoints.append(hp)
    return hardpoints


def normalize_hardpoint_id(value):
    text = str(value).strip()
    try:
        return str(int(text))
    except ValueError:
        return text.lower()


def parse_hardpoint_weapon_slots(zf):
    slot_counts = {}
    for inner_path in zf.namelist():
        if not inner_path.lower().endswith("-hardpoints.xml"):
            continue
        try:
            root = parse_xml(zf.read(inner_path), inner_path)
        except Exception as error:
            raise RuntimeError(
                f"Failed to parse hardpoint source {inner_path}"
            ) from error
        for hardpoint in root.findall("Hardpoint"):
            hardpoint_id = hardpoint.attrib.get("id")
            if hardpoint_id is None:
                continue
            slot_counts[normalize_hardpoint_id(hardpoint_id)] = len(hardpoint.findall("WeaponSlot"))
    return slot_counts


def apply_hardpoint_weapon_slots(hardpoints, slot_counts):
    for hardpoint in hardpoints:
        hardpoint.pop("weapon_slots", None)
        weapon_slots = slot_counts.get(normalize_hardpoint_id(hardpoint.get("ID")))
        if weapon_slots is not None:
            hardpoint["weapon_slots"] = weapon_slots
    return hardpoints


def collect_hardpoint_slot_maps(game_dir: Path):
    by_variant = {}
    by_chassis = {}
    mech_dir = game_dir / MECHS_DIR
    if not mech_dir.exists():
        return by_variant, by_chassis
    for pak_path in sorted(mech_dir.glob("*.pak")):
        try:
            with zipfile.ZipFile(pak_path) as zf:
                slot_counts = parse_hardpoint_weapon_slots(zf)
                if not slot_counts:
                    continue
                for inner_path in zf.namelist():
                    lower_path = inner_path.lower()
                    if lower_path.endswith(".mdf"):
                        by_variant[Path(inner_path).stem.lower()] = slot_counts
                    elif lower_path.endswith("-omnipods.xml"):
                        by_chassis[Path(inner_path).parent.name.lower()] = slot_counts
        except zipfile.BadZipFile:
            continue
    return by_variant, by_chassis


def enrich_existing_hardpoint_data(game_dir: Path, out_dir: Path):
    mech_path = out_dir / "mechs.json"
    omnipod_path = out_dir / "omnipods.json"
    if not mech_path.exists() or not omnipod_path.exists():
        raise RuntimeError("mechs.json and omnipods.json must exist for --hardpoints-only")

    mechs = json.loads(mech_path.read_text(encoding="utf-8"))
    omnipods = json.loads(omnipod_path.read_text(encoding="utf-8"))
    by_variant, by_chassis = collect_hardpoint_slot_maps(game_dir)

    for mech in mechs:
        slot_counts = by_variant.get(str(mech.get("name", "")).lower(), {})
        for component in mech.get("definition", {}).get("components", {}).values():
            apply_hardpoint_weapon_slots(component.get("hardpoints", []), slot_counts)

    for pod in omnipods.values():
        slot_counts = by_chassis.get(str(pod.get("chassis", "")).lower(), {})
        apply_hardpoint_weapon_slots(pod.get("hardpoints", []), slot_counts)

    write_json(mech_path, mechs)
    write_json(omnipod_path, omnipods)
    return len(mechs), len(omnipods)


def parse_component_internals(comp):
    internals = []
    for child in list(comp):
        if child.tag == "Internal" and child.attrib.get("ItemID"):
            internals.append(int(child.attrib["ItemID"]))
    return internals


def parse_component_fixed(comp):
    fixed = []
    for child in list(comp):
        if child.tag == "Fixed" and child.attrib.get("ItemID"):
            fixed.append(int(child.attrib["ItemID"]))
    return fixed


def parse_component_capabilities(comp):
    capabilities = {}
    source_names = {}
    for source_name, source_value in comp.attrib.items():
        canonical_name = COMPONENT_CAPABILITY_ATTRIBUTES.get(source_name.casefold())
        if canonical_name is None:
            continue
        value = maybe_num(source_value)
        if canonical_name in capabilities and capabilities[canonical_name] != value:
            raise RuntimeError(
                f"Conflicting component capability attributes "
                f"{source_names[canonical_name]} and {source_name}"
            )
        capabilities[canonical_name] = value
        source_names[canonical_name] = source_name
    return capabilities


def parse_items(
    game_data,
    localization,
    name_localization,
    missing_localization_keys,
):
    items_by_id = {}
    by_family = defaultdict(list)

    for family, inner_path in ITEM_FILES:
        root = parse_xml(game_data.read(inner_path), inner_path)
        for element in list(root):
            if "id" not in element.attrib:
                continue
            item = parse_item(
                element,
                family,
                localization,
                name_localization,
                missing_localization_keys,
            )
            items_by_id[str(item["id"])] = item
            by_family[family].append(item["id"])

    return items_by_id, by_family


def skill_scope_payload(node):
    if node.tag not in SKILL_SCOPE_TYPES:
        raise RuntimeError(f"Unexpected skill effect scope: {node.tag}")
    if not node.attrib.get("name"):
        raise RuntimeError(f"Skill effect scope {node.tag} is missing its name")
    return {
        "type": node.tag,
        "name": node.attrib.get("name", ""),
        "value": maybe_num(node.attrib.get("value")),
        "children": [skill_scope_payload(child) for child in list(node)],
    }


def skill_category_for_column(column):
    matches = [
        name
        for name, minimum, maximum in SKILL_CATEGORY_COLUMN_RANGES
        if minimum <= column <= maximum
    ]
    if len(matches) != 1:
        raise RuntimeError(f"Skill node column {column} did not resolve to exactly one category")
    return matches[0]


def skill_subcategory(node_name):
    return node_name.rstrip("0123456789")


def parse_skills(game_data, localization):
    root = parse_xml(game_data.read(SKILL_TREE_FILE), SKILL_TREE_FILE)
    display_root = parse_xml(
        game_data.read(SKILL_TREE_DISPLAY_FILE),
        SKILL_TREE_DISPLAY_FILE,
    )
    category_order = [node.attrib.get("name", "") for node in display_root.findall("Category")]
    expected_categories = [name for name, _, _ in SKILL_CATEGORY_COLUMN_RANGES]
    if category_order != expected_categories:
        raise RuntimeError(
            f"Unexpected skill categories: {category_order}; expected {expected_categories}"
        )

    display_nodes = {}
    display_coordinates = set()
    for node in display_root.findall("Node"):
        name = node.attrib.get("name", "")
        if not name:
            continue
        if name in display_nodes:
            raise RuntimeError(f"Duplicate skill display node: {name}")
        column = int(node.attrib["column"])
        row = int(node.attrib["row"])
        if (column, row) in display_coordinates:
            raise RuntimeError(f"Duplicate skill display coordinate: column={column}, row={row}")
        display_coordinates.add((column, row))
        display_nodes[name] = {
            "name": name,
            "category": skill_category_for_column(column),
            "subcategory": skill_subcategory(name),
            "column": column,
            "row": row,
            "color_type": maybe_num(node.attrib.get("colortype", 0)),
        }

    definitions = {}
    for group in root.findall("Node"):
        names = [name.strip() for name in group.attrib.get("names", "").split(",") if name.strip()]
        affects = [attrs(node) for node in group.findall("Affects")]
        requires = [attrs(node) for node in group.findall("Require")]
        effects = []
        for effect in group.findall("Effect"):
            effect_name = effect.attrib.get("name", "")
            if not effect_name:
                raise RuntimeError(f"Skill node group {names} has an effect without a name")
            display_name = ""
            for key in quirk_loc_candidates(effect_name):
                if key in localization:
                    display_name = localization[key]
                    break
            effects.append({
                "name": effect_name,
                "display_name": display_name or fallback_quirk_name(effect_name),
                "value": maybe_num(effect.attrib.get("value", 0)),
                "scopes": [skill_scope_payload(child) for child in list(effect)],
            })
        if names and not effects:
            raise RuntimeError(f"Skill node group {names} has no effects")
        for name in names:
            if name in definitions:
                raise RuntimeError(f"Duplicate skill node definition: {name}")
            definitions[name] = {
                "affects": affects,
                "requires": requires,
                "effects": effects,
            }

    missing_definitions = sorted(set(display_nodes) - set(definitions))
    missing_display = sorted(set(definitions) - set(display_nodes))
    if missing_definitions or missing_display:
        raise RuntimeError(
            "Skill node definition/display mismatch: "
            f"missing definitions={missing_definitions}, missing display={missing_display}"
        )

    categories = []
    for category_name in category_order:
        nodes = []
        for node in sorted(
            (entry for entry in display_nodes.values() if entry["category"] == category_name),
            key=lambda entry: (entry["column"], entry["row"], entry["name"]),
        ):
            nodes.append({
                **node,
                **definitions[node["name"]],
            })
        categories.append({
            "key": category_name.lower(),
            "name": category_name,
            "nodes": nodes,
        })

    return {
        "source": {
            "nodes": SKILL_TREE_FILE,
            "display": SKILL_TREE_DISPLAY_FILE,
        },
        "categories": categories,
        "node_count": sum(len(category["nodes"]) for category in categories),
    }


def parse_mech_list(game_data):
    root = parse_xml(game_data.read("Libs/Items/Mechs/Mechs.xml"), "Mechs.xml")
    mechs = {}
    for node in root.findall("Mech"):
        mech = attrs(node)
        mech["id"] = int(mech["id"])
        mech["name"] = str(mech["name"]).lower()
        mech["chassis"] = str(mech["chassis"]).lower()
        mechs[str(mech["id"])] = mech
    return mechs


def missing_omnipod_id(value):
    return value is None or str(value).strip().lower() in {"", "none", "null"}


def merge_explicit_omnipod_id(loadout_value, mdf_value, source):
    loadout_missing = missing_omnipod_id(loadout_value)
    mdf_missing = missing_omnipod_id(mdf_value)
    if not loadout_missing and not mdf_missing and loadout_value != mdf_value:
        raise RuntimeError(
            f"Conflicting explicit OmniPod IDs for {source}: "
            f"loadout={loadout_value}, MDF={mdf_value}"
        )
    if not loadout_missing:
        return loadout_value
    if not mdf_missing:
        return mdf_value
    return loadout_value


def parse_loadouts(
    game_data,
    mechs,
    definitions,
    localization,
    missing_localization_keys,
    excluded_mech_ids=None,
):
    loadouts = {}
    excluded_mech_ids = set(excluded_mech_ids or ())
    loadout_names = [name for name in game_data.namelist() if name.startswith("Libs/MechLoadout/") and name.endswith(".xml")]
    for inner_path in loadout_names:
        root = parse_xml(game_data.read(inner_path), inner_path)
        name = Path(inner_path).stem.lower()
        mech_id = maybe_num(root.attrib.get("MechID"))
        mech = mechs.get(str(mech_id), {})
        if not mech.get("name"):
            raise RuntimeError(
                f"Loadout {inner_path} MechID {mech_id} did not match Mechs.xml"
            )
        if str(mech_id) in excluded_mech_ids:
            continue
        mech_key = str(mech["name"])
        definition = definitions.get(mech_key)
        if not definition:
            raise RuntimeError(
                f"Loadout {inner_path} MechID {mech_id} has no parsed MDF definition "
                f"for {mech_key}"
            )
        mdf_components = definition.get("components", {})
        display_name = localized_mech_name(
            mech,
            definition,
            localization,
            missing_localization_keys,
            name,
        )
        loadout = {
            "name": name,
            "source_name": root.attrib.get("Name", "").strip(),
            "display_name": display_name,
            "mech_id": mech_id,
            "public": maybe_num(root.attrib.get("Public", "0")),
            "upgrades": {},
            "components": {},
        }

        upgrades = root.find("Upgrades")
        if upgrades is not None:
            for upgrade in list(upgrades):
                loadout["upgrades"][upgrade.tag.lower()] = attrs(upgrade)

        component_list = root.find("ComponentList")
        if component_list is not None:
            for comp in component_list.findall("component"):
                comp_name = comp.attrib.get("Name", "").lower()
                loadout_omnipod = maybe_num(comp.attrib.get("OmniPod"))
                mdf_omnipod = mdf_components.get(comp_name, {}).get("omnipod")
                payload = {
                    "armor": maybe_num(comp.attrib.get("Armor", 0)),
                    "omnipod": merge_explicit_omnipod_id(
                        loadout_omnipod,
                        mdf_omnipod,
                        f"{mech_key}/{comp_name}",
                    ),
                    "items": [],
                }
                for child in list(comp):
                    item_id = child.attrib.get("ItemID")
                    if item_id is None:
                        continue
                    payload["items"].append({
                        "type": child.tag.lower(),
                        "item_id": int(item_id),
                        "weapon_group": maybe_num(child.attrib.get("WeaponGroup")),
                    })
                loadout["components"][comp_name] = payload
        missing_body_components = sorted(
            comp_name
            for comp_name in mdf_components
            if not comp_name.endswith("_rear")
            and comp_name not in loadout["components"]
        )
        if missing_body_components:
            raise RuntimeError(
                f"Loadout {name} omits MDF body components: "
                + ", ".join(missing_body_components)
            )
        loadouts[name] = loadout
    return loadouts


def parse_mdf(data: bytes, source: str, localization, hardpoint_slot_counts):
    root = parse_xml(data, source)
    mech_node = root.find("Mech")
    if mech_node is None:
        return None, None
    cockpit = root.find("Cockpit")
    cockpit_shake_damping = (
        maybe_num(cockpit.attrib.get("ShakeDamping"))
        if cockpit is not None and "ShakeDamping" in cockpit.attrib
        else None
    )
    definition = {
        "variant": mech_node.attrib.get("Variant", Path(source).stem).lower(),
        "stats": attrs(mech_node),
        "movement": attrs(root.find("MovementTuningConfiguration")) if root.find("MovementTuningConfiguration") is not None else {},
        "components": {},
        "quirks": parse_quirks(root.find("QuirkList"), localization, "variant"),
    }
    component_list = root.find("ComponentList")
    if component_list is None:
        return definition, cockpit_shake_damping

    for comp in component_list.findall("Component"):
        name = comp.attrib.get("Name", "").lower()
        component = {
            "name": name,
            "slots": maybe_num(comp.attrib.get("Slots", 0)),
            "hp": maybe_num(comp.attrib.get("HP", 0)),
            "hardpoints": apply_hardpoint_weapon_slots(
                parse_component_hardpoints(comp),
                hardpoint_slot_counts,
            ),
            "internals": parse_component_internals(comp),
            "fixed": parse_component_fixed(comp),
        }
        if "OmniPod" in comp.attrib:
            component["omnipod"] = maybe_num(comp.attrib.get("OmniPod"))
        component.update(parse_component_capabilities(comp))
        definition["components"][name] = component
    return definition, cockpit_shake_damping


def parse_detailed_omnipods(zf, localization, hardpoint_slot_counts):
    details = {}
    for inner_path in zf.namelist():
        if not inner_path.lower().endswith("-omnipods.xml"):
            continue
        try:
            root = parse_xml(zf.read(inner_path), inner_path)
        except Exception as error:
            raise RuntimeError(
                f"Failed to parse detailed OmniPod source {inner_path}"
            ) from error
        chassis = Path(inner_path).parent.name.lower()
        for set_node in root.findall("Set"):
            set_name = set_node.attrib.get("name", "").lower()
            set_bonuses = []
            bonuses = set_node.find("SetBonuses")
            if bonuses is not None:
                for bonus in bonuses.findall("Bonus"):
                    set_bonuses.append({
                        "piece_count": maybe_num(bonus.attrib.get("PieceCount", 0)),
                        "quirks": parse_quirks(bonus, localization, "set bonus"),
                    })
            for comp in set_node.findall("component"):
                component = comp.attrib.get("name", "").lower()
                detail = {
                    "chassis": chassis,
                    "set": set_name,
                    "component": component,
                    "hardpoints": apply_hardpoint_weapon_slots(
                        parse_component_hardpoints(comp),
                        hardpoint_slot_counts,
                    ),
                    "internals": parse_component_internals(comp),
                    "fixed": parse_component_fixed(comp),
                    "quirks": parse_quirks(comp, localization, "omnipod"),
                    "set_bonuses": set_bonuses,
                }
                detail.update(parse_component_capabilities(comp))
                details[f"{chassis}|{set_name}|{component}"] = detail
    return details


def parse_mech_definitions(game_dir: Path, localization):
    definitions = {}
    omnipod_details = {}
    cockpit_shake_damping = {}
    mech_dir = game_dir / MECHS_DIR
    if not mech_dir.exists():
        return definitions, omnipod_details, cockpit_shake_damping
    for pak_path in sorted(mech_dir.glob("*.pak")):
        try:
            with zipfile.ZipFile(pak_path) as zf:
                hardpoint_slot_counts = parse_hardpoint_weapon_slots(zf)
                omnipod_details.update(parse_detailed_omnipods(
                    zf,
                    localization,
                    hardpoint_slot_counts,
                ))
                for inner_path in zf.namelist():
                    if not inner_path.lower().endswith(".mdf"):
                        continue
                    try:
                        definition, shake_damping = parse_mdf(
                            zf.read(inner_path),
                            f"{pak_path.name}:{inner_path}",
                            localization,
                            hardpoint_slot_counts,
                        )
                    except Exception as error:
                        raise RuntimeError(
                            f"Failed to parse MDF source {pak_path.name}:{inner_path}"
                        ) from error
                    if definition:
                        variant = Path(inner_path).stem.lower()
                        definitions[variant] = definition
                        if shake_damping is not None:
                            cockpit_shake_damping[variant] = {
                                "shake_damping": shake_damping,
                                "source_pak": pak_path.name,
                                "source_mdf": inner_path,
                            }
        except zipfile.BadZipFile as error:
            raise RuntimeError(f"Failed to read mech archive {pak_path}") from error
    return definitions, omnipod_details, cockpit_shake_damping


def parse_omnipods(game_data, omnipod_details):
    root = parse_xml(game_data.read("Libs/Items/OmniPods.xml"), "OmniPods.xml")
    pods = {}
    for node in root.findall("OmniPod"):
        pod = attrs(node)
        pod["chassis"] = str(pod.get("chassis", "")).lower()
        pod["set"] = str(pod.get("set", "")).lower()
        pod["component"] = str(pod.get("component", "")).lower()
        detail = omnipod_details.get(f"{pod['chassis']}|{pod['set']}|{pod['component']}", {})
        pod["hardpoints"] = detail.get("hardpoints", [])
        pod["internals"] = detail.get("internals", [])
        pod["fixed"] = detail.get("fixed", [])
        pod["quirks"] = detail.get("quirks", [])
        pod["set_bonuses"] = detail.get("set_bonuses", [])
        for capability in COMPONENT_CAPABILITY_ATTRIBUTES.values():
            if capability not in detail:
                continue
            if capability in pod and pod[capability] != detail[capability]:
                raise RuntimeError(
                    f"Conflicting OmniPod capability for {pod.get('id')}: "
                    f"{capability}={pod[capability]} != {detail[capability]}"
                )
            pod[capability] = detail[capability]
        pods[str(pod["id"])] = pod
    return pods


def validate_loadout_omnipods(loadouts, mechs, omnipods):
    for loadout in loadouts.values():
        mech_id = loadout.get("mech_id")
        mech = mechs.get(str(mech_id))
        if not mech:
            raise RuntimeError(
                f"Loadout {loadout.get('name')} MechID {mech_id} did not match Mechs.xml"
            )
        expected_chassis = str(mech.get("chassis", "")).lower()
        components = loadout.get("components", {})
        body_components = {
            name: component
            for name, component in components.items()
            if not name.endswith("_rear")
        }
        if any(
            not missing_omnipod_id(component.get("omnipod"))
            for component in body_components.values()
        ):
            missing_components = sorted(
                name
                for name, component in body_components.items()
                if missing_omnipod_id(component.get("omnipod"))
            )
            if missing_components:
                raise RuntimeError(
                    f"OmniMech loadout {loadout.get('name')} has unresolved OmniPods: "
                    + ", ".join(missing_components)
                )
        for component_name, component in components.items():
            pod_id = component.get("omnipod")
            if missing_omnipod_id(pod_id):
                continue
            pod = omnipods.get(str(pod_id))
            if not pod:
                raise RuntimeError(
                    f"Loadout {loadout.get('name')}/{component_name} references "
                    f"missing OmniPod {pod_id}"
                )
            pod_chassis = str(pod.get("chassis", "")).lower()
            pod_component = str(pod.get("component", "")).lower()
            if pod_chassis != expected_chassis or pod_component != component_name:
                raise RuntimeError(
                    f"Loadout {loadout.get('name')}/{component_name} OmniPod {pod_id} "
                    f"does not match chassis/component: expected "
                    f"{expected_chassis}/{component_name}, got {pod_chassis}/{pod_component}"
                )


def build_mech_payload(
    mechs,
    definitions,
    loadouts,
    localization,
    missing_localization_keys,
):
    payload = []
    by_mech_id = {str(loadout["mech_id"]): loadout for loadout in loadouts.values() if loadout.get("mech_id") is not None}
    for mech_id, mech in sorted(mechs.items(), key=lambda pair: int(pair[0])):
        definition = definitions.get(mech["name"], {})
        stats = definition.get("stats", {})
        max_tons = maybe_num(stats.get("MaxTons", 0))
        if isinstance(max_tons, (int, float)):
            weight_class = "light" if max_tons <= 35 else "medium" if max_tons <= 55 else "heavy" if max_tons <= 75 else "assault"
        else:
            weight_class = ""
        loadout = by_mech_id.get(mech_id) or loadouts.get(mech["name"])
        display_name = localized_mech_name(
            mech,
            definition,
            localization,
            missing_localization_keys,
            mech["name"],
        )
        payload.append({
            "id": mech["id"],
            "name": mech["name"],
            "display_name": display_name,
            "chassis": mech["chassis"],
            "faction": mech.get("faction", ""),
            "weight_class": weight_class,
            "definition": definition,
            "stock_loadout": mech["name"] if mech["name"] in loadouts else (loadout or {}).get("name"),
        })
    return payload


def build_shake_damping_payload(mech_payload, cockpit_shake_damping):
    matches = []
    for mech in mech_payload:
        source = cockpit_shake_damping.get(mech["name"])
        if not source or source["shake_damping"] != 1.0:
            continue
        matches.append({
            "id": mech["id"],
            "name": mech["name"],
            "display_name": mech["display_name"],
            "chassis": mech["chassis"],
            "faction": mech["faction"],
            "shake_damping": float(source["shake_damping"]),
            "source_pak": source["source_pak"],
            "source_mdf": source["source_mdf"],
        })
    return {
        "criterion": {
            "field": "Cockpit.ShakeDamping",
            "value": 1.0,
        },
        "count": len(matches),
        "mechs": matches,
    }


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Extract local MechWarrior Online data for MwoLab.")
    parser.add_argument("--game-dir", default=os.environ.get("MWO_GAME_DIR", ""))
    parser.add_argument("--out", default="public/data")
    parser.add_argument(
        "--hardpoints-only",
        action="store_true",
        help="Enrich existing mech and omnipod JSON with model hardpoint weapon-slot counts.",
    )
    parser.add_argument(
        "--equipment-only",
        action="store_true",
        help="Refresh equipment.json without regenerating mech, loadout, or omnipod data.",
    )
    parser.add_argument(
        "--skills-only",
        action="store_true",
        help="Refresh skills.json and its index metadata without regenerating other datasets.",
    )
    args = parser.parse_args(argv)

    game_dir = Path(args.game_dir)
    out_dir = Path(args.out)

    if not args.game_dir:
        print("Set MWO_GAME_DIR or pass --game-dir.", file=sys.stderr)
        return 2

    game_data_path = game_dir / GAME_DATA_PAK
    if not game_data_path.exists():
        print(f"GameData.pak not found: {game_data_path}", file=sys.stderr)
        return 2

    out_dir.mkdir(parents=True, exist_ok=True)
    if args.hardpoints_only:
        mech_count, omnipod_count = enrich_existing_hardpoint_data(game_dir, out_dir)
        print(f"Updated hardpoints for {mech_count} mechs and {omnipod_count} omnipods.")
        return 0

    localization = parse_localization(game_dir)
    original_localization = parse_localization(game_dir, value_column=1)
    name_localization = build_localization_lookup(localization)
    missing_localization_keys = []

    if args.skills_only:
        with zipfile.ZipFile(game_data_path) as game_data:
            skills = parse_skills(game_data, original_localization)
        index_path = out_dir / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {
            "generated_from": "local game install",
            "counts": {},
            "files": {},
        }
        index.setdefault("counts", {})["skill_nodes"] = skills["node_count"]
        index.setdefault("counts", {})["localization_strings"] = len(
            localization
        )
        index.setdefault("files", {})["skills"] = "data/skills.json"
        index.setdefault("files", {})["localization"] = "data/localization.json"
        write_json(index_path, index)
        write_json(out_dir / "skills.json", skills)
        write_json(out_dir / "localization.json", localization)
        print(
            f"Extracted {skills['node_count']} skill nodes across "
            f"{len(skills['categories'])} categories."
        )
        print_missing_localization_keys(missing_localization_keys)
        return 0

    if args.equipment_only:
        with zipfile.ZipFile(game_data_path) as game_data:
            items_by_id, by_family = parse_items(
                game_data,
                original_localization,
                name_localization,
                missing_localization_keys,
            )
        write_json(out_dir / "equipment.json", {"items": items_by_id, "families": by_family})
        write_json(out_dir / "localization.json", localization)
        index_path = out_dir / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {
            "generated_from": "local game install",
            "counts": {},
            "files": {},
        }
        index.setdefault("counts", {})["items"] = len(items_by_id)
        index.setdefault("counts", {})["localization_strings"] = len(
            localization
        )
        index.setdefault("files", {})["equipment"] = "data/equipment.json"
        index.setdefault("files", {})["localization"] = "data/localization.json"
        write_json(index_path, index)
        print(f"Extracted {len(items_by_id)} items.")
        print_missing_localization_keys(missing_localization_keys)
        return 0

    definitions, omnipod_details, cockpit_shake_damping = parse_mech_definitions(
        game_dir,
        original_localization,
    )

    with zipfile.ZipFile(game_data_path) as game_data:
        items_by_id, by_family = parse_items(
            game_data,
            original_localization,
            name_localization,
            missing_localization_keys,
        )
        mechs = parse_mech_list(game_data)
        excluded_mech_ids = {
            mech_id
            for mech_id, mech in mechs.items()
            if is_non_buildable_trial_mech(mech, name_localization)
        }
        buildable_mechs = {
            mech_id: mech
            for mech_id, mech in mechs.items()
            if mech_id not in excluded_mech_ids
        }
        loadouts = parse_loadouts(
            game_data,
            mechs,
            definitions,
            name_localization,
            missing_localization_keys,
            excluded_mech_ids,
        )
        omnipods = parse_omnipods(game_data, omnipod_details)
        validate_loadout_omnipods(loadouts, mechs, omnipods)
        skills = parse_skills(game_data, original_localization)

    mech_payload = build_mech_payload(
        buildable_mechs,
        definitions,
        loadouts,
        name_localization,
        missing_localization_keys,
    )
    shake_damping_payload = build_shake_damping_payload(mech_payload, cockpit_shake_damping)

    write_json(out_dir / "index.json", {
        "generated_from": "local game install",
        "counts": {
            "mechs": len(mech_payload),
            "items": len(items_by_id),
            "loadouts": len(loadouts),
            "omnipods": len(omnipods),
            "shake_damping_mechs": shake_damping_payload["count"],
            "skill_nodes": skills["node_count"],
            "localization_strings": len(localization),
        },
        "files": {
            "mechs": "data/mechs.json",
            "equipment": "data/equipment.json",
            "loadouts": "data/loadouts.json",
            "omnipods": "data/omnipods.json",
            "shake_damping_mechs": "data/shake_damping_mechs.json",
            "skills": "data/skills.json",
            "localization": "data/localization.json",
        },
    })
    write_json(out_dir / "mechs.json", mech_payload)
    write_json(out_dir / "equipment.json", {"items": items_by_id, "families": by_family})
    write_json(out_dir / "loadouts.json", loadouts)
    write_json(out_dir / "omnipods.json", omnipods)
    write_json(out_dir / "shake_damping_mechs.json", shake_damping_payload)
    write_json(out_dir / "skills.json", skills)
    write_json(out_dir / "localization.json", localization)

    print(
        f"Extracted {len(mech_payload)} mechs, {len(items_by_id)} items, "
        f"{len(loadouts)} loadouts, and {shake_damping_payload['count']} "
        "Cockpit.ShakeDamping=1.0 mechs."
    )
    if excluded_mech_ids:
        excluded_names = sorted(mechs[mech_id]["name"] for mech_id in excluded_mech_ids)
        print(
            "Excluded non-buildable localized (T) mechs: "
            + ", ".join(excluded_names)
        )
    print_missing_localization_keys(missing_localization_keys)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
