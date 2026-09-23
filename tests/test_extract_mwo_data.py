import importlib.util
import io
import tempfile
import unittest
import zipfile
from contextlib import redirect_stderr
from pathlib import Path


MODULE_PATH = Path(__file__).parents[1] / "tools" / "extract_mwo_data.py"
SPEC = importlib.util.spec_from_file_location("extract_mwo_data", MODULE_PATH)
EXTRACTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXTRACTOR)


class FakeGameData:
    def __init__(self, files):
        self.files = files

    def namelist(self):
        return list(self.files)

    def read(self, name):
        return self.files[name]


def loadout_xml(omnipod=None):
    omnipod_attribute = "" if omnipod is None else f' OmniPod="{omnipod}"'
    return f"""
        <Loadout MechID="3683" Public="1" Name="VIPER VPR-SC">
          <ComponentList>
            <component Name="centre_torso" Armor="46"{omnipod_attribute} />
          </ComponentList>
        </Loadout>
    """.encode()


def definitions(omnipod=None):
    component = {"name": "centre_torso"}
    if omnipod is not None:
        component["omnipod"] = omnipod
    return {
        "vpr-sc": {
            "stats": {"Variant": "VPR-SC", "VariantType": "Hero"},
            "components": {"centre_torso": component},
        }
    }


class ExtractMwoDataTests(unittest.TestCase):
    def test_parse_xml_keeps_valid_input_unchanged(self):
        data = b'<root><Quirk name="x" value="-0.2" /></root>'
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics):
            root = EXTRACTOR.parse_xml(data, "valid.xml")

        self.assertEqual(root[0].attrib, {"name": "x", "value": "-0.2"})
        self.assertEqual(diagnostics.getvalue(), "")

    def test_parse_mdf_repairs_missing_self_closing_tag_terminator(self):
        data = b'''<Definition>
<Mech Variant="JM6-DDP" />
<QuirkList>
<Quirk name="ultraautocannon_jamduration_multiplier" value="-0.2" /
</QuirkList>
</Definition>'''
        source = "jagermech.pak:Objects/mechs/jagermech/jm6-ddp.mdf"
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics):
            definition, _ = EXTRACTOR.parse_mdf(data, source, {}, {})

        self.assertEqual(
            definition["quirks"][0]["name"],
            "ultraautocannon_jamduration_multiplier",
        )
        self.assertEqual(definition["quirks"][0]["value"], -0.2)
        self.assertIn(source, diagnostics.getvalue())
        self.assertIn("line(s): 4", diagnostics.getvalue())

    def test_parse_xml_repairs_multiple_crlf_terminators(self):
        data = (
            b"<root>\r\n"
            b'<Quirk name="first" value="-0.2" /\t \r\n'
            b'<Quirk name="second" value="-0.1" / \r\n'
            b"</root>"
        )
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics):
            root = EXTRACTOR.parse_xml(data, "multiple-crlf.xml")

        self.assertEqual([node.attrib["value"] for node in root], ["-0.2", "-0.1"])
        self.assertIn("line(s): 2, 3", diagnostics.getvalue())

    def test_parse_xml_repairs_final_line_terminator_at_eof(self):
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics):
            root = EXTRACTOR.parse_xml(b"<root /", "final-line.xml")

        self.assertEqual(root.tag, "root")
        self.assertIn("line(s): 1", diagnostics.getvalue())

    def test_parse_xml_ignores_non_tag_lookalikes_during_repair(self):
        data = b'''<!DOCTYPE root [
<!ENTITY lookalike "<Tag value='x' /
">
]>
<root>
<!-- <Tag value="x" /
-->
<?note <Tag value="x" /
?>
<value><![CDATA[<Tag value="x" /
]]></value>
<plain>ordinary /\x20
</plain>
<real value="kept" /
</root>'''
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics):
            root = EXTRACTOR.parse_xml(data, "lookalikes.xml")

        self.assertEqual(root.find("value").text, '<Tag value="x" /\n')
        self.assertEqual(root.find("plain").text, "ordinary / \n")
        self.assertEqual(root.find("real").attrib, {"value": "kept"})
        self.assertIn("line(s): 14", diagnostics.getvalue())

    def test_parse_xml_rejects_other_malformed_input_without_repair_log(self):
        data = b'''<root><Quirk name="first" name="duplicate" /
</root>'''
        diagnostics = io.StringIO()

        with redirect_stderr(diagnostics), self.assertRaisesRegex(
            RuntimeError,
            "broken-source.mdf",
        ):
            EXTRACTOR.parse_xml(data, "broken-source.mdf")

        self.assertEqual(diagnostics.getvalue(), "")

    def test_parse_xml_rejects_unmatched_attribute_quote(self):
        data = b'<root><Quirk value="unterminated /\n</root>'

        with self.assertRaisesRegex(RuntimeError, "quoted-source.mdf"):
            EXTRACTOR.parse_xml(data, "quoted-source.mdf")

    def test_malformed_hardpoint_source_stops_extraction(self):
        path = "Objects/mechs/test/test-hardpoints.xml"
        source = FakeGameData({path: b'<Hardpoints><Hardpoint id="1">'})

        with self.assertRaisesRegex(
            RuntimeError,
            f"Failed to parse hardpoint source {path}",
        ):
            EXTRACTOR.parse_hardpoint_weapon_slots(source)

    def test_malformed_detailed_omnipod_source_stops_extraction(self):
        path = "Objects/mechs/test/test-omnipods.xml"
        source = FakeGameData({path: b'<OmniPods><Set name="test">'})

        with self.assertRaisesRegex(
            RuntimeError,
            f"Failed to parse detailed OmniPod source {path}",
        ):
            EXTRACTOR.parse_detailed_omnipods(source, {}, {})

    def parse_loadout(self, loadout_omnipod=None, mdf_omnipod=None):
        game_data = FakeGameData({
            "Libs/MechLoadout/vpr-sc.xml": loadout_xml(loadout_omnipod),
        })
        mechs = {
            "3683": {
                "id": 3683,
                "name": "vpr-sc",
                "chassis": "viper",
            }
        }
        return EXTRACTOR.parse_loadouts(
            game_data,
            mechs,
            definitions(mdf_omnipod),
            {},
            [],
        )["vpr-sc"]

    def test_parse_mdf_preserves_explicit_component_omnipod(self):
        data = b"""
            <Definition>
              <Mech Variant="VPR-SC" VariantType="Hero" />
              <ComponentList>
                <Component Name="centre_torso" Slots="12" HP="24" OmniPod="31402" />
              </ComponentList>
            </Definition>
        """
        definition, _ = EXTRACTOR.parse_mdf(data, "vpr-sc.mdf", {}, {})
        self.assertEqual(definition["components"]["centre_torso"]["omnipod"], 31402)

    def test_lowercase_mdf_variant_fields_preserve_lgd_display_rule(self):
        mech = {"name": "rfl-3n-shlgd", "chassis": "sneede"}
        definition = {
            "stats": {"variant": "RFL-3N-SHLGD", "varianttype": "Special"},
        }
        localization = {
            "rfl-3n-shlgd": "SNEEDE RFL-3N-SHLGD",
            "sneede": "SNEEDE",
        }

        display_name = EXTRACTOR.localized_mech_name(
            mech,
            definition,
            localization,
            [],
            mech["name"],
        )

        self.assertEqual(display_name, "RFL-3N-SHLGD (LGD)")

    def test_lowercase_normal_mdf_variant_is_used_as_display_name(self):
        mech = {"name": "jm6-de", "chassis": "jagermech"}
        definition = {"stats": {"variant": "JM6-DE", "varianttype": ""}}

        display_name = EXTRACTOR.localized_mech_name(
            mech,
            definition,
            {"jm6-de": "JAGERMECH JM6-DE"},
            [],
            mech["name"],
        )

        self.assertEqual(display_name, "JM6-DE")

    def test_conflicting_variant_type_spellings_stop_extraction(self):
        definition = {
            "stats": {"VariantType": "Hero", "varianttype": "Special"},
        }

        with self.assertRaisesRegex(RuntimeError, "Conflicting source fields"):
            EXTRACTOR.is_normal_mech(definition)

    def test_parse_mdf_preserves_component_ecm_capability(self):
        data = b"""
            <Definition>
              <Mech Variant="CDA-3M" />
              <ComponentList>
                <Component Name="left_torso" Slots="12" HP="20" CanEquipECM="1" />
              </ComponentList>
            </Definition>
        """
        definition, _ = EXTRACTOR.parse_mdf(data, "cda-3m.mdf", {}, {})
        self.assertEqual(definition["components"]["left_torso"]["CanEquipECM"], 1)

    def test_parse_mdf_normalizes_lowercase_component_ecm_capability(self):
        data = b"""
            <Definition>
              <Mech Variant="AS7-D-H" />
              <ComponentList>
                <Component Name="centre_torso" canequipecm="1" />
              </ComponentList>
            </Definition>
        """
        definition, _ = EXTRACTOR.parse_mdf(data, "as7-d-h.mdf", {}, {})
        component = definition["components"]["centre_torso"]
        self.assertEqual(component["CanEquipECM"], 1)
        self.assertNotIn("canequipecm", component)

    def test_conflicting_component_ecm_spellings_stop_archive_extraction(self):
        with tempfile.TemporaryDirectory() as temp_name:
            game_dir = Path(temp_name)
            mech_dir = game_dir / EXTRACTOR.MECHS_DIR
            mech_dir.mkdir(parents=True)
            with zipfile.ZipFile(mech_dir / "cicada.pak", "w") as archive:
                archive.writestr(
                    "Objects/mechs/cicada/cda-3m.mdf",
                    '<Definition><Mech Variant="CDA-3M" />'
                    '<ComponentList><Component Name="left_torso" '
                    'CanEquipECM="1" canequipecm="0" />'
                    '</ComponentList></Definition>',
                )

            with self.assertRaisesRegex(RuntimeError, "Failed to parse MDF source"):
                EXTRACTOR.parse_mech_definitions(game_dir, {})

    def test_omnipod_component_ecm_capability_uses_detailed_source(self):
        details = EXTRACTOR.parse_detailed_omnipods(
            FakeGameData({
                "Objects/mechs/firemoth/firemoth-omnipods.xml": b"""
                    <OmniPods>
                      <Set name="fmt-b">
                        <component name="right_arm" CanEquipECM="1" />
                      </Set>
                    </OmniPods>
                """,
            }),
            {},
            {},
        )
        game_data = FakeGameData({
            "Libs/Items/OmniPods.xml": b"""
                <OmniPods>
                  <OmniPod id="31533" chassis="firemoth" set="fmt-b" component="right_arm" />
                </OmniPods>
            """,
        })
        pods = EXTRACTOR.parse_omnipods(game_data, details)
        self.assertEqual(pods["31533"]["CanEquipECM"], 1)

    def test_loadout_uses_mdf_omnipod_when_xml_omits_it(self):
        loadout = self.parse_loadout(mdf_omnipod=31402)
        self.assertEqual(loadout["components"]["centre_torso"]["omnipod"], 31402)

    def test_matching_explicit_omnipods_are_accepted(self):
        loadout = self.parse_loadout(loadout_omnipod=31402, mdf_omnipod=31402)
        self.assertEqual(loadout["components"]["centre_torso"]["omnipod"], 31402)

    def test_loadout_value_is_preserved_when_mdf_omits_it(self):
        loadout = self.parse_loadout(loadout_omnipod=31402)
        self.assertEqual(loadout["components"]["centre_torso"]["omnipod"], 31402)

    def test_textual_none_is_treated_as_missing(self):
        loadout = self.parse_loadout(loadout_omnipod="none", mdf_omnipod=31402)
        self.assertEqual(loadout["components"]["centre_torso"]["omnipod"], 31402)

    def test_conflicting_explicit_omnipods_stop_extraction(self):
        with self.assertRaisesRegex(RuntimeError, "Conflicting explicit OmniPod IDs"):
            self.parse_loadout(loadout_omnipod=30483, mdf_omnipod=31433)

    def test_missing_loadout_body_component_stops_extraction(self):
        game_data = FakeGameData({
            "Libs/MechLoadout/vpr-sc.xml": (
                b'<Loadout MechID="3683" Public="1" Name="VIPER VPR-SC">'
                b"<ComponentList /></Loadout>"
            ),
        })
        mechs = {"3683": {"id": 3683, "name": "vpr-sc", "chassis": "viper"}}
        with self.assertRaisesRegex(RuntimeError, "omits MDF body components"):
            EXTRACTOR.parse_loadouts(
                game_data,
                mechs,
                definitions(31402),
                {},
                [],
            )

    def test_missing_mdf_definition_stops_extraction(self):
        game_data = FakeGameData({
            "Libs/MechLoadout/vpr-sc.xml": loadout_xml(),
        })
        mechs = {"3683": {"id": 3683, "name": "vpr-sc", "chassis": "viper"}}
        with self.assertRaisesRegex(RuntimeError, "has no parsed MDF definition"):
            EXTRACTOR.parse_loadouts(game_data, mechs, {}, {}, [])

    def test_loadout_omnipod_must_match_chassis_and_component(self):
        loadouts = {"vpr-sc": self.parse_loadout(mdf_omnipod=31402)}
        mechs = {"3683": {"name": "vpr-sc", "chassis": "viper"}}
        wrong_pods = {
            "31402": {
                "id": 31402,
                "chassis": "executioner",
                "component": "centre_torso",
            }
        }
        with self.assertRaisesRegex(RuntimeError, "does not match chassis/component"):
            EXTRACTOR.validate_loadout_omnipods(loadouts, mechs, wrong_pods)

    def test_partially_resolved_omnimech_stops_extraction(self):
        loadout = self.parse_loadout(mdf_omnipod=31402)
        loadout["components"]["head"] = {"omnipod": None, "items": []}
        loadouts = {"vpr-sc": loadout}
        mechs = {"3683": {"name": "vpr-sc", "chassis": "viper"}}
        pods = {
            "31402": {
                "id": 31402,
                "chassis": "viper",
                "component": "centre_torso",
            }
        }
        with self.assertRaisesRegex(RuntimeError, "unresolved OmniPods: head"):
            EXTRACTOR.validate_loadout_omnipods(loadouts, mechs, pods)

if __name__ == "__main__":
    unittest.main()
