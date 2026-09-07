"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMechLab({
  storageValues = {},
  storageReadError = false,
  storageWriteError = false,
  storageWrites = [],
  elements = {},
  mobile = false,
  windowHref = "http://localhost/?lang=en",
  windowLocation = null,
  historyReplacements = [],
} = {}) {
  const quirkSource = fs.readFileSync(
    path.join(__dirname, "..", "public", "quirk-calculations.js"),
    "utf8",
  );
  const loadoutUrlCodecSource = fs.readFileSync(
    path.join(__dirname, "..", "public", "loadout-url-codec.js"),
    "utf8",
  );
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  const sandbox = {
    __MWOLAB_TEST__: true,
    __MWOLAB_MOBILE__: mobile,
    console,
    URL,
    URLSearchParams,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Object,
    Array,
    Math,
    Number,
    String,
    Boolean,
    RegExp,
    JSON,
    Date,
    Intl,
    Promise,
    Uint8Array,
    TextEncoder,
    TextDecoder,
    CompressionStream,
    DecompressionStream,
    Blob,
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    performance: { now: () => 0 },
    navigator: { language: "en", languages: ["en"] },
    localStorage: {
      getItem: (key) => {
        if (storageReadError) throw new Error("storage unavailable");
        return Object.hasOwn(storageValues, key) ? storageValues[key] : null;
      },
      setItem: (key, value) => {
        if (storageWriteError) throw new Error("storage unavailable");
        storageWrites.push([key, value]);
      },
      removeItem: () => {},
    },
    location: { protocol: new URL(windowHref).protocol },
    fetch: async () => { throw new Error("fetch must not run in unit tests"); },
    document: {
      getElementById: (id) => elements[id] || null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      documentElement: {},
      body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
    },
  };
  const resolvedWindowLocation = windowLocation || {
    href: windowHref,
    search: new URL(windowHref).search,
  };
  sandbox.window = {
    location: resolvedWindowLocation,
    history: {
      pushState: () => {},
      replaceState(state, title, value) { historyReplacements.push(value); },
    },
    addEventListener: () => {},
    innerWidth: 1280,
    innerHeight: 720,
    setTimeout,
    clearTimeout,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(loadoutUrlCodecSource, sandbox, { filename: "public/loadout-url-codec.js" });
  vm.runInContext(quirkSource, sandbox, { filename: "public/quirk-calculations.js" });
  vm.runInContext(source, sandbox, { filename: "public/app.js" });
  return sandbox.__MWOLAB_TEST_API__;
}

const api = loadMechLab();

test("사용자 지정 장비 숨김 목록과 표시명 원본 보존을 적용한다", () => {
  const nobleAc20 = {
    id: 1264,
    name: "NobleAutoCannon20",
    display_name: "AC/20",
    item_type: "weapon",
  };
  const equipment = { items: { 1264: nobleAc20 } };

  assert.equal(api.isHiddenMechlabEquipment(nobleAc20), true);
  assert.equal(api.isHiddenMechlabEquipment({ name: "ClanAutoCannon20" }), false);
  assert.equal(api.applyEquipmentDisplayNameOverrides(equipment), equipment);
  assert.equal(nobleAc20.display_name, "NOBLE AC/20");
  assert.equal(nobleAc20.source_display_name, "AC/20");
});

test("모바일 아머 입력은 쿼크 최종값 대신 실제 할당 포인트를 표시한다", () => {
  const mobileApi = loadMechLab({ mobile: true });
  const desktopHtml = api.renderArmorStepper("left_arm", "front", 10, 20, 0, false, 3, 20, 0, 0, 0, true);
  const mobileHtml = mobileApi.renderArmorStepper("left_arm", "front", 10, 20, 0, false, 3, 20, 0, 0, 0, true);

  assert.match(desktopHtml, /value="13"/);
  assert.match(desktopHtml, /data-armor-quirk="3"/);
  assert.match(mobileHtml, /value="10"/);
  assert.match(mobileHtml, /max="20"/);
  assert.match(mobileHtml, /data-armor-quirk="0"/);
  assert.match(mobileHtml, /data-armor-include-skill="false"/);
});

test("핏팅 브라우저 자동 태그는 지정된 DPS와 열효율 경계에서만 생성한다", () => {
  assert.deepEqual(Array.from(api.communityFittingTags({ dps: 19.999, heatEfficiency: 79.999 })), []);
  assert.deepEqual(Array.from(api.communityFittingTags({ dps: 20, heatEfficiency: 79.999 })), ["highPower"]);
  assert.deepEqual(Array.from(api.communityFittingTags({ dps: 19.999, heatEfficiency: 80 })), ["cooler"]);
  assert.deepEqual(Array.from(api.communityFittingTags({ dps: 20, heatEfficiency: 80 })), ["highPower", "cooler"]);
});

test("핏팅 브라우저 방어·사거리·전투 성향 태그는 확정된 경계만 사용한다", () => {
  assert.deepEqual(Array.from(api.communityFittingTags({
    dps: 12.5,
    alphaDamage: 50,
    armorPercent: 100,
    hasArmor: true,
    ghostHeat: true,
    rangeDps: { short: 5, medium: 5.01, long: 0 },
    sniperAlpha: 20,
    brawlerAlpha: 29.999,
  })), ["ghostHeat", "fullArmor", "mediumRange", "sniper"]);
  assert.deepEqual(Array.from(api.communityFittingTags({
    dps: 10,
    alphaDamage: 40,
    armorPercent: 65,
    hasArmor: true,
    rangeDps: { short: 7, medium: 0, long: 0 },
    sniperAlpha: 19.999,
    brawlerAlpha: 30,
  })), ["glassArmor", "shortRange", "brawler"]);
  assert.deepEqual(Array.from(api.communityFittingTags({
    dps: 20,
    alphaDamage: 50,
    rangeDps: { short: 0, medium: 0, long: 8 },
  })), ["highPower", "longRange"]);
});

test("스나이퍼 태그는 사용자가 검증한 정확한 무장 ID만 허용한다", () => {
  const equipment = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "equipment.json"),
    "utf8",
  ));
  const expectedWeapons = new Map([
    [1005, "ERLargeLaser"],
    [1006, "ERPPC"],
    [1021, "GaussRifle"],
    [1079, "SilverBulletGaussRifle"],
    [1208, "ClanGaussRifle"],
    [1213, "ClanERLargeLaser"],
    [1217, "ClanERPPC"],
    [1255, "ClanHyperAssaultGaussRifle20"],
    [1256, "ClanHyperAssaultGaussRifle30"],
    [1257, "ClanHyperAssaultGaussRifle40"],
  ]);
  expectedWeapons.forEach((expectedName, id) => {
    const item = equipment.items[String(id)];
    assert.equal(item?.name, expectedName, id);
    assert.equal(api.communitySniperWeapon(item), true, id);
  });
  [1045, 1046, 1211, 1212, 1244, 1263].forEach((id) => {
    assert.equal(api.communitySniperWeapon(equipment.items[String(id)]), false, id);
  });
  assert.equal(api.communitySniperWeapon({ id: 1005.5 }), false);
  assert.equal(api.communitySniperWeapon({ aliases: "ERPPC,ERLaser,GaussRifle" }), false);
  assert.equal(api.communitySniperWeapon({ name: "ClanHyperAssaultGaussRifle20" }), false);
});

test("핏팅 브라우저 태그 지표는 기존 사거리 타입과 무기 DPS·알파값을 합산한다", () => {
  const shortErLaser = {
    item: {
      id: 1045,
      aliases: "Energy,ERLaser",
      ranges: [
        { start: 0, damageModifier: 1 },
        { start: 300, damageModifier: 1 },
        { start: 600, damageModifier: 0 },
      ],
    },
    damage: 12,
    cycle: 2,
  };
  const longHag = {
    item: {
      id: 1255,
      name: "ClanHyperAssaultGaussRifle20",
      aliases: "Ballistic,LargeWeapon,ClanGaussRifle",
      ranges: [
        { start: 0, damageModifier: 1 },
        { start: 800, damageModifier: 1 },
        { start: 1600, damageModifier: 0 },
      ],
    },
    damage: 20,
    cycle: 4,
  };
  const metrics = api.communityFittingTagMetrics([shortErLaser, longHag], { dps: 11, alphaDamage: 32 });
  assert.deepEqual({ ...metrics.rangeDps }, { short: 6, medium: 0, long: 5 });
  assert.equal(metrics.sniperAlpha, 20);
  assert.equal(metrics.brawlerAlpha, 12);
});

test("핏팅 브라우저 하드포인트 배지는 실제 장착 무기 타입과 수량만 센다", () => {
  const summary = api.communityInstalledWeaponSummary([
    { id: 1, display_name: "Laser", item_type: "weapon", hardpoint_type: "energy" },
    { id: 1, display_name: "Laser", item_type: "weapon", hardpoint_type: "energy" },
    { id: 2, display_name: "AC", item_type: "weapon", stats: { type: "ballistic" } },
    { id: 3, display_name: "LRM", item_type: "weapon", hardpoint_type: "missile" },
    { id: 4, display_name: "AMS", item_type: "weapon", hardpoint_type: "ams" },
  ]);
  assert.deepEqual({ ...summary.hardpoints }, { energy: 2, ballistic: 1, missile: 1, ams: 1 });
  assert.deepEqual(Array.from(summary.weapons, ({ id, count }) => ({ id, count })), [
    { id: "1", count: 2 },
    { id: "2", count: 1 },
    { id: "3", count: 1 },
    { id: "4", count: 1 },
  ]);
});

test("핏팅 브라우저 대표 무장은 장비별 총 톤수 순으로 최대 4종을 고른다", () => {
  const summary = api.communityInstalledWeaponSummary([
    ...Array.from({ length: 5 }, () => ({ id: 1, display_name: "Medium Laser", hardpoint_type: "energy", stats: { tons: 1 } })),
    ...Array.from({ length: 12 }, () => ({ id: 2, display_name: "Small Laser", hardpoint_type: "energy", stats: { tons: 0.5 } })),
    { id: 3, display_name: "AC/20", hardpoint_type: "ballistic", stats: { tons: 14 } },
    { id: 4, display_name: "AMS", hardpoint_type: "ams", stats: { tons: 0.5 } },
  ]);
  assert.deepEqual(Array.from(summary.weapons, ({ name, count, totalTons }) => ({ name, count, totalTons })), [
    { name: "Medium Laser", count: 5, totalTons: 5 },
    { name: "Small Laser", count: 12, totalTons: 6 },
    { name: "AC/20", count: 1, totalTons: 14 },
    { name: "AMS", count: 1, totalTons: 0.5 },
  ]);
  assert.deepEqual(
    api.communityRepresentativeWeapons(summary.weapons).map((weapon) => weapon.name),
    ["AC/20", "Small Laser", "Medium Laser", "AMS"],
  );

  const fallbackAndTie = api.communityInstalledWeaponSummary([
    { id: 10, display_name: "First Equal", hardpoint_type: "energy", stats: { weight: 2 } },
    { id: 11, display_name: "Second Equal", hardpoint_type: "missile", stats: { weight: 1 } },
    { id: 11, display_name: "Second Equal", hardpoint_type: "missile", stats: { weight: 1 } },
  ]);
  assert.deepEqual(
    api.communityRepresentativeWeapons(fallbackAndTie.weapons).map(({ name, totalTons }) => ({ name, totalTons })),
    [
      { name: "First Equal", totalTons: 2 },
      { name: "Second Equal", totalTons: 2 },
    ],
  );
});

test("기본 하드포인트 필터는 각 타입의 전체 최솟값을 1로 유지한다", () => {
  Object.values(api.state.mechHardpointFilters).forEach((filter) => {
    assert.equal(filter.minimums.total, 1);
    assert.equal(filter.minimums.left_torso, 0);
  });
  assert.equal(api.normalizeMechHardpointFilterMinimum("total", 0), 1);
  assert.equal(api.normalizeMechHardpointFilterMinimum("total", ""), 1);
  assert.equal(api.normalizeMechHardpointFilterMinimum("total", 2.9), 2);
  assert.equal(api.normalizeMechHardpointFilterMinimum("left_torso", 0), 0);
});

test("옵니포드의 0 하드포인트는 타입 색상을 유지한 채 어둡게 표시한다", () => {
  const styles = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");
  const zeroRuleIndex = styles.indexOf(".omnipod-hardpoint.zero");
  assert.ok(zeroRuleIndex > styles.indexOf(".omnipod-hardpoint.ecm"));
  const zeroRule = styles.slice(zeroRuleIndex, zeroRuleIndex + 120);
  assert.match(zeroRule, /opacity:\s*0\.38/);
  assert.doesNotMatch(zeroRule, /color\s*:/);
});

test("장비 툴팁 적용 효과 설정은 기본 ON이며 저장값을 복원한다", () => {
  const key = "mwolab:show-weapon-tooltip-quirks";
  assert.equal(api.state.showWeaponTooltipQuirks, true);
  assert.equal(loadMechLab({ storageValues: { [key]: "true" } }).state.showWeaponTooltipQuirks, true);
  assert.equal(loadMechLab({ storageValues: { [key]: "false" } }).state.showWeaponTooltipQuirks, false);
  assert.equal(loadMechLab({ storageReadError: true }).state.showWeaponTooltipQuirks, true);
});

test("개인설정 초기 피팅은 장비 제거·풀아머 기본값과 저장 복원·부위 한도를 유지한다", () => {
  const key = "mwolab:initial-fitting:v1";
  const writes = [];
  const local = loadMechLab({ storageWrites: writes });
  assert.equal(local.state.initialFittingPreferences.mode, "strip");
  assert.equal(local.state.initialFittingPreferences.armorMode, "full");
  local.setInitialFittingPreference("armorMode", "custom");
  local.setInitialFittingPreference("armor", 75, "torso", "front");
  local.setInitialFittingPreference("armor", 40, "torso", "rear");
  assert.equal(local.state.initialFittingPreferences.armor.centre_torso.rear, 25);
  local.setInitialFittingPreference("armor", 90, "torso", "front");
  assert.equal(local.state.initialFittingPreferences.armor.centre_torso.front, 75);
  local.setInitialFittingPreference("armor", -5, "head", "front");
  assert.equal(local.state.initialFittingPreferences.armor.head.front, 0);
  local.setInitialFittingPreference("armor", 60, "shoulders", "front");
  local.setInitialFittingPreference("armor", 30, "shoulders", "rear");
  assert.deepEqual(
    local.state.initialFittingPreferences.armor.left_torso,
    local.state.initialFittingPreferences.armor.right_torso,
  );
  assert.equal(local.state.initialFittingPreferences.armor.left_torso.front, 60);
  assert.equal(local.state.initialFittingPreferences.armor.left_torso.rear, 30);
  const restored = loadMechLab({ storageValues: { [key]: writes.at(-1)[1] } });
  assert.equal(JSON.stringify(restored.state.initialFittingPreferences), JSON.stringify(local.state.initialFittingPreferences));
  for (const armorMode of ["full", "none", "custom"]) {
    local.setInitialFittingPreference("armorMode", armorMode);
    const reopened = loadMechLab({ storageValues: { [key]: writes.at(-1)[1] } });
    assert.equal(reopened.state.initialFittingPreferences.mode, "strip");
    assert.equal(reopened.state.initialFittingPreferences.armorMode, armorMode);
    assert.equal(reopened.state.initialFittingPreferences.armor.centre_torso.front, 75);
    assert.equal(reopened.state.initialFittingPreferences.armor.centre_torso.rear, 25);
  }
  assert.equal(loadMechLab({ storageValues: { [key]: "broken" } }).state.initialFittingPreferences.mode, "strip");
  assert.equal(loadMechLab({ storageReadError: true }).state.initialFittingPreferences.mode, "strip");
  const unavailable = loadMechLab({ storageWriteError: true });
  unavailable.setInitialFittingPreference("mode", "stock");
  assert.equal(unavailable.state.initialFittingPreferences.mode, "stock");
});

test("새 멕 프리셋은 장비만 제거하고 선택 멕의 아머 한도·스톡 후면을 사용한다", () => {
  const local = loadMechLab();
  const mech = { id: 1, stock_loadout: "preset", definition: { components: {
    head: { hp: 3 }, centre_torso: { hp: 21 }, left_arm: { hp: 10, fixed: [999] },
  } } };
  const stock = { components: {
    head: { armor: 8, items: [{ item_id: 1 }] },
    centre_torso: { armor: 20, items: [{ item_id: 2 }] },
    centre_torso_rear: { armor: 6 },
    left_arm: { armor: 10, items: [{ item_id: 3 }] },
  }, upgrades: { armor: { ItemID: 123 } } };
  local.state.loadouts = { preset: stock };
  const original = JSON.stringify(stock);
  const defaultFull = local.buildForMechSelection(mech);
  assert.equal(defaultFull.components.head.armor, 18);
  assert.equal(defaultFull.components.centre_torso.armor, 36);
  assert.equal(defaultFull.rearArmor.centre_torso, 6);
  assert.equal(defaultFull.components.centre_torso.items.length, 0);
  local.setInitialFittingPreference("mode", "stock");
  const normal = local.buildForMechSelection(mech);
  assert.equal(normal.components.head.items.length, 1);
  assert.equal(normal.components.centre_torso.armor, 20);
  local.setInitialFittingPreference("mode", "strip");
  // The selected old mech must not supply the newly loaded mech's capacity.
  local.state.selectedMech = { definition: { components: { centre_torso: { hp: 100 } } } };
  const full = local.buildForMechSelection(mech);
  assert.equal(full.components.head.armor, 18);
  assert.equal(full.components.centre_torso.armor, 36);
  assert.equal(full.rearArmor.centre_torso, 6);
  assert.equal(full.components.left_arm.armor, 20);
  assert.equal(full.components.centre_torso.items.length, 0);
  assert.equal(full.engineHeatSinks.length, 0);
  assert.equal(full.upgrades.armor.ItemID, 123);
  assert.deepEqual(mech.definition.components.left_arm.fixed, [999]);
  local.setInitialFittingPreference("armorMode", "custom");
  local.setInitialFittingPreference("armor", 75, "torso", "front");
  local.setInitialFittingPreference("armor", 25, "torso", "rear");
  local.setInitialFittingPreference("armor", 50, "head", "front");
  const custom = local.buildForMechSelection(mech);
  assert.equal(custom.components.centre_torso.armor, 31);
  assert.equal(custom.rearArmor.centre_torso, 10);
  assert.equal(custom.components.head.armor, 9);
  local.setInitialFittingPreference("armorMode", "none");
  const unarmored = local.buildForMechSelection(mech);
  assert.ok(Object.values(unarmored.components).every((part) => part.armor === 0 && part.items.length === 0));
  assert.ok(Object.values(unarmored.rearArmor).every((armor) => armor === 0));
  local.setInitialFittingPreference("armorMode", "custom");
  assert.equal(local.buildForMechSelection(mech).components.centre_torso.armor, 31);
  assert.equal(JSON.stringify(stock), original);
  const mobile = loadMechLab({ mobile: true });
  mobile.state.loadouts = { preset: stock };
  mobile.setInitialFittingPreference("mode", "strip");
  assert.equal(mobile.buildForMechSelection(mech).components.head.items.length, 1);
});

test("개인설정은 프로필 왼쪽에 있고 새 선택에만 적용하며 IMPORT·공유·스톡 기준 계산은 유지한다", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(__dirname, "..", "public", "styles.css"), "utf8");
  assert.equal((html.match(/id="open-ui-settings"/g) || []).length, 1);
  assert.ok(html.indexOf('id="open-ui-settings"') < html.indexOf('id="community-login"'));
  assert.ok(html.indexOf('id="open-ui-settings"') < html.indexOf('class="topbar-account-actions"'));
  assert.match(html, /data-i18n="ui.open"[^>]*>개인설정/);
  assert.match(html, /data-i18n="ui.initialFitting">로드아웃 방식/);
  assert.match(html, /data-personal-settings-tab="loadout"[^>]*>로드아웃/);
  assert.match(html, /data-personal-settings-tab="values"[^>]*>수치/);
  assert.match(html, /data-personal-settings-tab="common"[^>]*>공용/);
  assert.match(html, /id="initial-armor-settings"(?![^>]*hidden)/);
  assert.match(html, /id="initial-armor-percentages"(?![^>]*hidden)/);
  assert.doesNotMatch(html, /<fieldset[^>]+(?:initial-fitting-settings|initial-armor-settings)/);
  const armorGroups = app.slice(app.indexOf("const INITIAL_ARMOR_GROUPS"), app.indexOf("const MWO_EXPORT_COMPONENT_ORDER"));
  const groupOrder = ["head", "shoulders", "torso", "arms", "legs"];
  assert.deepEqual([...armorGroups.matchAll(/key: "([^"]+)"/g)].map((match) => match[1]), groupOrder);
  assert.match(app, /armorSettings\.classList\.toggle\("disabled", !stripEnabled\)/);
  assert.match(app, /input\.disabled = !stripEnabled/);
  assert.match(app, /const customArmorEnabled = stripEnabled && preferences\.armorMode === "custom"/);
  assert.match(app, /container\.classList\.toggle\("disabled", !customArmorEnabled\)/);
  assert.match(app, /input\.disabled = !customArmorEnabled/);
  assert.match(app, /function setPersonalSettingsTab[\s\S]*data-personal-settings-panel/);
  assert.match(styles, /\.ui-settings-dialog \{[\s\S]*height: min\(42rem, calc\(100dvh - 2rem\)\)/);
  assert.match(styles, /\.initial-fitting-options input:checked \+ span/);
  assert.match(app, /preserveCurrentBuild \? state.currentBuild : buildForMechSelection\(nextMech\)/);
  assert.match(app, /function loadBuild\(mech\) \{\s*return buildFromLoadout\(mech\)/);
  const imported = app.match(/function importMwoCode\([\s\S]*?(?=\nfunction describeMwoCode)/)[0];
  assert.doesNotMatch(imported, /buildForMechSelection/);
  assert.match(imported, /buildFromMwoCode\(decoded, mech\)/);
});

test("추천 핏팅 표시 설정은 기본 ON이며 저장값과 fitting URL 판정을 사용한다", () => {
  const key = "mwolab:show-recommended-fittings";
  assert.equal(api.state.showRecommendedFittings, true);
  assert.equal(loadMechLab({ storageValues: { [key]: "true" } }).state.showRecommendedFittings, true);
  assert.equal(loadMechLab({ storageValues: { [key]: "false" } }).state.showRecommendedFittings, false);
  assert.equal(loadMechLab({ storageReadError: true }).state.showRecommendedFittings, true);
  assert.equal(loadMechLab({ windowHref: "http://localhost/?lang=en&fitting=document-id" }).recommendationContext().sharedFittingRequestPending, true);
  assert.equal(loadMechLab({ windowHref: "http://localhost/?lang=en&loadout=code" }).recommendationContext().sharedFittingRequestPending, false);
  const contextApi = loadMechLab();
  contextApi.state.selectedMech = { id: 713 };
  contextApi.state.currentBuild = { components: {} };
  contextApi.state.activeMainTab = "info";
  assert.equal(contextApi.recommendationContext().enabled, false);
  contextApi.state.activeMainTab = "mechlab";
  contextApi.state.mechlabBrowseMode = true;
  assert.equal(contextApi.recommendationContext().enabled, false);
  contextApi.state.mechlabBrowseMode = false;
  assert.equal(contextApi.recommendationContext().enabled, true);
});

test("장비 툴팁 적용 효과 설정은 즉시 저장하고 열린 툴팁을 다시 렌더한다", () => {
  const storageWrites = [];
  const option = {
    checked: true,
    closest: () => ({ classList: { toggle: () => {} } }),
  };
  let tooltipRenderCount = 0;
  const tooltip = {
    hidden: true,
    style: {},
    offsetWidth: 240,
    offsetHeight: 120,
    classList: { toggle: () => {}, remove: () => {} },
  };
  Object.defineProperty(tooltip, "innerHTML", {
    set: () => { tooltipRenderCount += 1; },
  });
  const elements = {
    "simplify-ammo-quirks": option,
    "simplify-ammo-quirks-state": { textContent: "" },
    "show-weapon-tooltip-quirks": option,
    "show-weapon-tooltip-quirks-state": { textContent: "" },
    "show-recommended-fittings": option,
    "show-recommended-fittings-state": { textContent: "" },
    "equipment-tooltip": tooltip,
  };
  const settingsApi = loadMechLab({ storageWrites, elements });
  settingsApi.state.equipment = {
    items: {
      "2000": { id: 2000, item_type: "ammo", name: "Ammo", stats: { numShots: 100, tons: 1 } },
    },
  };
  const target = {
    dataset: { tooltipItem: "2000" },
    classList: { contains: () => false },
    isConnected: true,
    getBoundingClientRect: () => ({ left: 20, right: 120, top: 30 }),
  };
  settingsApi.showEquipmentTooltip(target);
  const initialRenderCount = tooltipRenderCount;
  settingsApi.setShowWeaponTooltipQuirks(false);
  assert.equal(settingsApi.state.showWeaponTooltipQuirks, false);
  assert.deepEqual(storageWrites.at(-1), ["mwolab:show-weapon-tooltip-quirks", "false"]);
  assert.equal(tooltipRenderCount, initialRenderCount + 1);
  settingsApi.setShowRecommendedFittings(false);
  assert.equal(settingsApi.state.showRecommendedFittings, false);
  assert.deepEqual(storageWrites.at(-1), ["mwolab:show-recommended-fittings", "false"]);

  const unavailableApi = loadMechLab({ storageWriteError: true, elements });
  assert.doesNotThrow(() => unavailableApi.setShowWeaponTooltipQuirks(false));
  assert.doesNotThrow(() => unavailableApi.setShowRecommendedFittings(false));
  assert.equal(unavailableApi.state.showWeaponTooltipQuirks, false);
  assert.equal(unavailableApi.state.showRecommendedFittings, false);
});

test("쿼크 필터는 빈 수치를 보유 여부로, 입력 수치를 효과 크기 하한으로 적용한다", () => {
  const previousMode = api.state.mechQuirkFilterMode;
  const previousSelections = api.state.mechQuirkFilterSelections;
  const previousCache = api.state.mechQuirkValuesCache;
  try {
    api.state.mechQuirkValuesCache = new Map([
      ["filter-test", new Map([
        ["all_cooldown_multiplier", -0.15],
        ["armorresist_all_additive", 12],
      ])],
    ]);
    api.state.mechQuirkFilterMode = "all";
    api.state.mechQuirkFilterSelections = new Map([
      ["all_cooldown_multiplier", null],
      ["armorresist_all_additive", 12],
    ]);
    assert.equal(api.mechMatchesQuirkFilters({ id: "filter-test" }), true);

    api.state.mechQuirkFilterSelections.set("all_cooldown_multiplier", 15.00005);
    assert.equal(api.mechMatchesQuirkFilters({ id: "filter-test" }), false);

    api.state.mechQuirkFilterMode = "any";
    assert.equal(api.mechMatchesQuirkFilters({ id: "filter-test" }), true);

    api.state.mechQuirkFilterSelections = new Map([["missing_quirk_additive", null]]);
    assert.equal(api.mechMatchesQuirkFilters({ id: "filter-test" }), false);
  } finally {
    api.state.mechQuirkFilterMode = previousMode;
    api.state.mechQuirkFilterSelections = previousSelections;
    api.state.mechQuirkValuesCache = previousCache;
  }
});

test("UM-AIV 계열의 고정 XL Gyro를 특수 장비로 판별한다", () => {
  const equipment = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "equipment.json"),
    "utf8",
  ));
  const mechs = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "mechs.json"),
    "utf8",
  ));
  const loadouts = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "loadouts.json"),
    "utf8",
  ));
  const xlGyroMechs = mechs.filter((entry) => (
    entry.definition.components.centre_torso.internals.includes(1942)
  ));
  const xlGyro = equipment.items["1942"];
  const standardGyro = equipment.items["1903"];
  const previous = {
    equipment: api.state.equipment,
    loadouts: api.state.loadouts,
    omnipods: api.state.omnipods,
    improvedJumpJetChassis: api.state.improvedJumpJetChassis,
  };

  assert.equal(xlGyro.name, "XLGyroLight");
  assert.equal(xlGyro.item_type, "internal");
  assert.equal(xlGyro.loc.desc_tag, "@mdf_XLGyroDesc");
  assert.ok(xlGyro.stats.slots > standardGyro.stats.slots);
  assert.ok(xlGyro.stats.tons < standardGyro.stats.tons);
  assert.deepEqual(
    xlGyroMechs.map((mech) => mech.display_name).sort(),
    ["UM-AIV", "UM-AIV(S)"],
  );

  try {
    api.state.equipment = equipment;
    api.state.loadouts = loadouts;
    api.state.omnipods = {};
    api.state.mechSpecialFeatureCache.clear();
    api.state.improvedJumpJetChassis = null;

    xlGyroMechs.forEach((mech) => {
      assert.equal(api.mechSpecialFeatures(mech).has("xl-gyro"), true);
    });
  } finally {
    Object.assign(api.state, previous);
    api.state.mechSpecialFeatureCache.clear();
  }
});

test("공유 URL은 MWO 코드를 압축하고 기존 코드를 정확히 복원한다", async () => {
  const code = "A12?@[\\]^_`abc|def";
  const sharedUrl = new URL(await api.sharedLoadoutUrl(code));
  const compressedValue = sharedUrl.searchParams.get("loadout");

  assert.equal(sharedUrl.origin, "http://localhost");
  assert.equal(sharedUrl.searchParams.get("lang"), "en");
  assert.match(compressedValue, /^z[A-Za-z0-9_-]+$/);
  assert.equal(await api.decodeSharedLoadoutValue(compressedValue), code);
  assert.equal(await api.decodeSharedLoadoutValue(code), code);
  assert.equal(sharedUrl.searchParams.has("tab"), false);
  assert.equal(sharedUrl.searchParams.has("mech"), false);
  assert.ok(sharedUrl.search.startsWith("?lang=en&loadout="));

  const mobileApi = loadMechLab({
    mobile: true,
    windowHref: "https://kmonkeyhead.github.io/mwolab/mobile/?lang=kr&mech=713",
  });
  const mobileSharedUrl = new URL(await mobileApi.sharedLoadoutUrl(code));
  assert.equal(mobileSharedUrl.pathname, "/mwolab/");
  assert.equal(mobileSharedUrl.searchParams.get("lang"), "kr");
  assert.match(mobileSharedUrl.searchParams.get("loadout"), /^z[A-Za-z0-9_-]+$/);
});

test("늦게 끝난 공유 URL 압축은 사용자가 이동한 새 주소를 덮어쓰지 않는다", async () => {
  const windowLocation = {
    href: "http://localhost/?fitting=public-record",
    search: "?fitting=public-record",
  };
  const historyReplacements = [];
  const raceApi = loadMechLab({ windowLocation, historyReplacements });
  const replacement = raceApi.replaceSharedLoadoutNavigation("A12?@[\\]^_`abc|def");

  windowLocation.href = "http://localhost/?mech=713";

  assert.equal(await replacement, false);
  assert.deepEqual(historyReplacements, []);
});

test("공개 핏팅 공유 URL은 언어와 문서 ID만 유지한다", () => {
  const sharedUrl = new URL(api.publicFittingUrl("55gilU1WqsTZVVsouu6E"));

  assert.equal(sharedUrl.origin, "http://localhost");
  assert.equal(sharedUrl.searchParams.get("lang"), "en");
  assert.equal(sharedUrl.searchParams.get("fitting"), "55gilU1WqsTZVVsouu6E");
  assert.equal(Array.from(sharedUrl.searchParams.keys()).join(","), "lang,fitting");
  assert.equal(sharedUrl.hash, "");
});

test("URL 공유 핏팅 원상복귀와 이전 History 복원 경로는 공유 상태를 보존한다", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  assert.match(appSource, /if \(isShared && record\.navigationMode !== "replace"\) preserveCurrentFittingHistoryEntry\(\)/);
  assert.match(appSource, /mechlabSnapshot: snapshot/);
  assert.match(appSource, /restoreMechlabHistorySnapshot\(window\.history\.state\?\.mechlabSnapshot\)/);
  assert.match(appSource, /importMwoCode\(source\.loadoutCode, \{ closeDialog: false, updateNavigation: false \}\)/);

  const tab = { id: "fitting-1", mechId: 1, build: { marker: "public" }, communitySource: { id: "public-b", liked: true, canLike: true } };
  const snapshot = { tabId: "fitting-1", mechId: 1, build: { marker: "previous" }, communitySource: { id: "public-a", liked: true, canLike: true } };
  assert.equal(api.applyMechlabHistorySnapshotToTab(tab, snapshot, false), true);
  assert.equal(tab.build.marker, "previous");
  assert.equal(tab.communitySource.id, "public-a");
  assert.equal(tab.communitySource.canLike, false);
  assert.equal(tab.communitySource.liked, false);
  snapshot.build.marker = "changed-after-restore";
  assert.equal(tab.build.marker, "previous");
});

test("공유 핏팅 좋아요 상태와 로그인 가능 여부는 같은 문서의 모든 탭에 동기화한다", () => {
  const previousTabs = api.state.mechlabTabs;
  try {
    const first = { communitySource: { id: "public-a", likeCount: 1, liked: false, canLike: false } };
    const second = { communitySource: { id: "public-b", likeCount: 2, liked: true, canLike: true } };
    const duplicate = { communitySource: { id: "public-a", likeCount: 1, liked: false, canLike: false } };
    api.state.mechlabTabs = [first, second, duplicate];

    assert.equal(api.updateMechlabTabsPublicFittingLike("public-a", 9, true, true), true);
    assert.deepEqual(
      [first.communitySource, duplicate.communitySource].map(({ likeCount, liked, canLike }) => ({ likeCount, liked, canLike })),
      [{ likeCount: 9, liked: true, canLike: true }, { likeCount: 9, liked: true, canLike: true }],
    );
    assert.equal(second.communitySource.likeCount, 2);
    assert.equal(
      JSON.stringify(api.openPublicFittingSources()),
      JSON.stringify([{ id: "public-a", likeCount: 9 }, { id: "public-b", likeCount: 2 }]),
    );

    assert.equal(api.setMechlabTabsPublicLikeCapability(false), true);
    assert.ok(api.state.mechlabTabs.every((entry) => entry.communitySource.canLike === false));
    assert.ok(api.state.mechlabTabs.every((entry) => entry.communitySource.liked === false));
    assert.equal(api.setMechlabTabsPublicLikeCapability(true), true);
    assert.ok(api.state.mechlabTabs.every((entry) => entry.communitySource.canLike === true));
  } finally {
    api.state.mechlabTabs = previousTabs;
  }
});

test("멕랩 핏팅 탭은 중복 멕의 독립 빌드를 생성하고 활성 탭만 교체한다", () => {
  const previous = {
    mechs: api.state.mechs,
    mechlabTabs: api.state.mechlabTabs,
    activeMechlabTabId: api.state.activeMechlabTabId,
    selectedMech: api.state.selectedMech,
    currentBuild: api.state.currentBuild,
    selectedChassis: api.state.selectedChassis,
    mechlabSelection: api.state.selectedMechIdsByTab.mechlab,
  };
  const alpha = { id: 101, chassis: "alpha", display_name: "ALPHA" };
  const beta = { id: 202, chassis: "beta", display_name: "BETA" };
  const alphaBuildOne = { mechId: alpha.id, marker: "one" };
  const alphaBuildTwo = { mechId: alpha.id, marker: "two" };
  const betaBuild = { mechId: beta.id, marker: "beta" };

  try {
    api.state.mechs = [alpha, beta];
    api.state.mechlabTabs = [];
    api.state.activeMechlabTabId = null;

    const first = api.addMechlabTabRecord(alpha, alphaBuildOne);
    first.communitySource = { id: "public-alpha" };
    const second = api.addMechlabTabRecord(alpha, alphaBuildTwo);
    assert.equal(api.state.mechlabTabs.length, 2);
    assert.deepEqual(api.state.mechlabTabs[0].communitySource, { id: "public-alpha" });
    assert.deepEqual(Array.from(api.mechlabFittingTabLabels()), ["ALPHA", "ALPHA 2"]);
    assert.equal(api.activeMechlabTab().id, second.id);
    assert.equal(api.state.currentBuild, alphaBuildTwo);

    api.activateMechlabTabRecord(first.id);
    assert.equal(api.state.currentBuild, alphaBuildOne);
    api.replaceActiveMechlabTabRecord(beta, betaBuild);
    assert.equal(api.state.mechlabTabs.length, 2);
    assert.equal(api.state.mechlabTabs[0].id, first.id);
    assert.equal(api.state.mechlabTabs[0].mechId, beta.id);
    assert.equal(api.state.mechlabTabs[0].communitySource, undefined);
    assert.equal(api.state.currentBuild, betaBuild);
    assert.equal(api.state.mechlabTabs[1].build, alphaBuildTwo);
  } finally {
    api.state.mechs = previous.mechs;
    api.state.mechlabTabs = previous.mechlabTabs;
    api.state.activeMechlabTabId = previous.activeMechlabTabId;
    api.state.selectedMech = previous.selectedMech;
    api.state.currentBuild = previous.currentBuild;
    api.state.selectedChassis = previous.selectedChassis;
    api.state.selectedMechIdsByTab.mechlab = previous.mechlabSelection;
  }
});

test("플러스 빈 탭 슬롯은 화면 전환 뒤에도 다음 피팅과 IMPORT 대상을 새 탭으로 유지한다", () => {
  const previous = {
    mechs: api.state.mechs,
    mechlabTabs: api.state.mechlabTabs,
    activeMechlabTabId: api.state.activeMechlabTabId,
    mechlabPendingTabIndex: api.state.mechlabPendingTabIndex,
    mechlabBrowseIntent: api.state.mechlabBrowseIntent,
    activeMainTab: api.state.activeMainTab,
    selectedMech: api.state.selectedMech,
    currentBuild: api.state.currentBuild,
    selectedChassis: api.state.selectedChassis,
    mechlabSelection: api.state.selectedMechIdsByTab.mechlab,
  };
  const alpha = { id: 211, chassis: "empty-slot-a", display_name: "EMPTY A" };
  const beta = { id: 212, chassis: "empty-slot-b", display_name: "EMPTY B" };
  const alphaBuild = { mechId: alpha.id, marker: "existing" };
  const importedBuild = { mechId: beta.id, marker: "imported" };

  try {
    api.state.mechs = [alpha, beta];
    api.state.mechlabTabs = [];
    api.state.activeMechlabTabId = null;
    api.state.mechlabPendingTabIndex = null;
    api.state.activeMainTab = "mechlab";
    const first = api.addMechlabTabRecord(alpha, alphaBuild);

    assert.equal(api.focusEmptyMechlabTabSlot(), true);
    assert.equal(api.state.mechlabPendingTabIndex, 1);
    assert.equal(api.hasFocusedEmptyMechlabTabSlot(), true);
    assert.equal(api.mechlabFittingTargetMode("replace"), "add");

    api.state.activeMainTab = "info";
    api.restoreMechlabMainTabViewState();
    assert.equal(api.state.mechlabBrowseMode, true);
    assert.equal(api.mechlabFittingTargetMode("replace"), "add");

    const imported = api.setMechlabFitting(beta, importedBuild, "replace");
    assert.equal(api.state.mechlabTabs.length, 2);
    assert.equal(api.state.mechlabTabs[0].id, first.id);
    assert.equal(api.state.mechlabTabs[0].build, alphaBuild);
    assert.equal(imported.mechId, beta.id);
    assert.equal(imported.build, importedBuild);
    assert.equal(api.state.activeMechlabTabId, imported.id);
    assert.equal(api.state.mechlabPendingTabIndex, null);

    assert.equal(api.focusEmptyMechlabTabSlot(), true);
    api.activateMechlabTabRecord(first.id);
    assert.equal(api.hasFocusedEmptyMechlabTabSlot(), false);
  } finally {
    api.state.mechs = previous.mechs;
    api.state.mechlabTabs = previous.mechlabTabs;
    api.state.activeMechlabTabId = previous.activeMechlabTabId;
    api.state.mechlabPendingTabIndex = previous.mechlabPendingTabIndex;
    api.state.mechlabBrowseIntent = previous.mechlabBrowseIntent;
    api.state.activeMainTab = previous.activeMainTab;
    api.state.selectedMech = previous.selectedMech;
    api.state.currentBuild = previous.currentBuild;
    api.state.selectedChassis = previous.selectedChassis;
    api.state.selectedMechIdsByTab.mechlab = previous.mechlabSelection;
  }
});

test("멕랩 핏팅 탭은 10개로 제한하고 활성 탭 닫기 시 왼쪽 탭을 선택한다", () => {
  const previous = {
    mechs: api.state.mechs,
    mechlabTabs: api.state.mechlabTabs,
    activeMechlabTabId: api.state.activeMechlabTabId,
    selectedMech: api.state.selectedMech,
    currentBuild: api.state.currentBuild,
    selectedChassis: api.state.selectedChassis,
    mechlabSelection: api.state.selectedMechIdsByTab.mechlab,
  };
  const mech = { id: 303, chassis: "limit", display_name: "LIMIT" };

  try {
    api.state.mechs = [mech];
    api.state.mechlabTabs = [];
    api.state.activeMechlabTabId = null;
    const tabs = [];
    for (let index = 0; index < api.MAX_MECHLAB_FITTING_TABS; index += 1) {
      tabs.push(api.addMechlabTabRecord(mech, { mechId: mech.id, index }));
    }
    assert.equal(api.state.mechlabTabs.length, 10);
    assert.equal(api.addMechlabTabRecord(mech, { mechId: mech.id, index: 10 }), null);
    const buildAtLimit = api.state.currentBuild;
    assert.equal(
      api.restoreMechlabHistoryTabRecord(mech, "closed-fitting-tab", { mechId: mech.id, index: 11 }),
      null,
    );
    assert.equal(api.state.currentBuild, buildAtLimit);

    api.activateMechlabTabRecord(tabs[5].id);
    assert.equal(api.closeMechlabTabRecord(tabs[5].id), true);
    assert.equal(api.state.activeMechlabTabId, tabs[4].id);
    assert.equal(api.state.currentBuild.index, 4);

    const inactiveId = tabs[8].id;
    assert.equal(api.closeMechlabTabRecord(inactiveId), true);
    assert.equal(api.state.activeMechlabTabId, tabs[4].id);

    while (api.state.mechlabTabs.length > 1) {
      const removable = api.state.mechlabTabs.find((tab) => tab.id !== api.state.activeMechlabTabId);
      api.closeMechlabTabRecord(removable.id);
    }
    assert.equal(api.closeMechlabTabRecord(api.state.activeMechlabTabId), false);
    assert.equal(api.state.mechlabTabs.length, 1);
  } finally {
    api.state.mechs = previous.mechs;
    api.state.mechlabTabs = previous.mechlabTabs;
    api.state.activeMechlabTabId = previous.activeMechlabTabId;
    api.state.selectedMech = previous.selectedMech;
    api.state.currentBuild = previous.currentBuild;
    api.state.selectedChassis = previous.selectedChassis;
    api.state.selectedMechIdsByTab.mechlab = previous.mechlabSelection;
  }
});

test("닫힌 피팅 탭의 History 복원은 현재 활성 빌드를 교체하지 않는다", () => {
  const previous = {
    mechs: api.state.mechs,
    mechlabTabs: api.state.mechlabTabs,
    activeMechlabTabId: api.state.activeMechlabTabId,
    selectedMech: api.state.selectedMech,
    currentBuild: api.state.currentBuild,
    selectedChassis: api.state.selectedChassis,
    mechlabSelection: api.state.selectedMechIdsByTab.mechlab,
  };
  const alpha = { id: 401, chassis: "history-a", display_name: "HISTORY A" };
  const beta = { id: 402, chassis: "history-b", display_name: "HISTORY B" };
  const alphaBuild = { mechId: alpha.id, marker: "alpha-original" };
  const betaBuild = { mechId: beta.id, marker: "beta-unsaved" };
  const restoredAlphaBuild = { mechId: alpha.id, marker: "alpha-restored" };

  try {
    api.state.mechs = [alpha, beta];
    api.state.mechlabTabs = [];
    api.state.activeMechlabTabId = null;
    const alphaTab = api.addMechlabTabRecord(alpha, alphaBuild);
    const betaTab = api.addMechlabTabRecord(beta, betaBuild);
    api.closeMechlabTabRecord(alphaTab.id);

    const restored = api.restoreMechlabHistoryTabRecord(alpha, alphaTab.id, restoredAlphaBuild);
    assert.notEqual(restored.id, betaTab.id);
    assert.equal(api.state.mechlabTabs.find((tab) => tab.id === betaTab.id).build, betaBuild);
    assert.equal(betaBuild.marker, "beta-unsaved");
    assert.equal(api.state.currentBuild, restoredAlphaBuild);

    api.activateMechlabTabRecord(betaTab.id);
    const exact = api.restoreMechlabHistoryTabRecord(alpha, restored.id, { marker: "unused" });
    assert.equal(exact.id, restored.id);
    assert.equal(api.state.currentBuild, restoredAlphaBuild);
  } finally {
    api.state.mechs = previous.mechs;
    api.state.mechlabTabs = previous.mechlabTabs;
    api.state.activeMechlabTabId = previous.activeMechlabTabId;
    api.state.selectedMech = previous.selectedMech;
    api.state.currentBuild = previous.currentBuild;
    api.state.selectedChassis = previous.selectedChassis;
    api.state.selectedMechIdsByTab.mechlab = previous.mechlabSelection;
  }
});

test("멕 목록 정렬은 기준, 방향과 진영 그룹 설정을 반영한다", () => {
  const clanLight = { tons: 20, faction: "Clan", label: "Clan A", order: 0 };
  const innerLight = { tons: 25, faction: "InnerSphere", label: "Inner B", order: 1 };
  const clanHeavy = { tons: 30, faction: "Clan", label: "Clan C", order: 2 };

  api.state.mechSort = "tons";
  api.state.mechSortDirection = "asc";
  api.state.mechSortGroupFaction = true;
  assert.deepEqual(
    [innerLight, clanHeavy, clanLight].sort(api.sortChassisGroups).map((entry) => entry.label),
    ["Clan A", "Clan C", "Inner B"],
  );

  api.state.mechSortDirection = "desc";
  assert.deepEqual(
    [innerLight, clanHeavy, clanLight].sort(api.sortChassisGroups).map((entry) => entry.label),
    ["Clan C", "Clan A", "Inner B"],
  );

  api.state.mechSortGroupFaction = false;
  assert.deepEqual(
    [innerLight, clanHeavy, clanLight].sort(api.sortChassisGroups).map((entry) => entry.label),
    ["Clan C", "Inner B", "Clan A"],
  );

  const zulu = { tons: 25, faction: "Clan", label: "Zulu 2", order: 0 };
  const alphaTen = { tons: 25, faction: "Clan", label: "Alpha 10", order: 1 };
  const alphaTwo = { tons: 25, faction: "Clan", label: "Alpha 2", order: 2 };
  api.state.mechSort = "alphabetical";
  api.state.mechSortDirection = "asc";
  assert.deepEqual(
    [zulu, alphaTen, alphaTwo].sort(api.sortChassisGroups).map((entry) => entry.label),
    ["Alpha 2", "Alpha 10", "Zulu 2"],
  );

  api.state.mechSortDirection = "desc";
  assert.deepEqual(
    [zulu, alphaTen, alphaTwo].sort(api.sortChassisGroups).map((entry) => entry.label),
    ["Zulu 2", "Alpha 10", "Alpha 2"],
  );

  api.state.mechSort = "default";
  api.state.mechSortDirection = "asc";
  api.state.mechSortGroupFaction = true;
});

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function quirk(name, value) {
  return { name, value };
}

function weapon(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    item_type: "weapon",
    name: overrides.name ?? "TestWeapon",
    display_name: overrides.display_name ?? "Test Weapon",
    hardpoint_type: overrides.hardpoint_type ?? "energy",
    faction: overrides.faction ?? "InnerSphere",
    stats: {
      damage: 10,
      heat: 5,
      cooldown: 2,
      numFiring: 1,
      ...overrides.stats,
    },
    ranges: overrides.ranges || [],
    aliases: overrides.aliases || "",
    ctype: overrides.ctype,
  };
}

function resetEquipment(items = {}) {
  api.state.equipment = { items };
  api.state.currentBuild = {
    upgrades: { artemis: { Equipped: false } },
    components: {},
    rearArmor: {},
  };
  api.state.alwaysAppliedWeaponModuleBonusCache.clear();
  api.state.artemisSpreadMultiplierCache = null;
  api.state.ammoHardpointTypeCache = null;
}

test("기본 숫자와 장비 공식", async (t) => {
  await t.test("유효하지 않은 숫자는 지정한 기본값을 사용한다", () => {
    assert.equal(api.number(NaN, 7), 7);
    assert.equal(api.number("3", 7), 7);
    assert.equal(api.number(3, 7), 3);
  });

  await t.test("탄환형 무기는 발사 수와 펠릿 수를 모두 피해에 반영한다", () => {
    resetEquipment();
    const item = weapon({ stats: { damage: 2, numFiring: 3, projectileclass: "bullet", numPerShot: 4 } });
    assert.equal(api.weaponProjectilesPerFiring(item), 4);
    assert.equal(api.weaponBaseDirectDamage(item), 24);
  });

  await t.test("비탄환형 무기는 numPerShot을 피해에 중복 적용하지 않는다", () => {
    resetEquipment();
    const item = weapon({ stats: { damage: 2, numFiring: 3, projectileclass: "missile", numPerShot: 4 } });
    assert.equal(api.weaponProjectilesPerFiring(item), 1);
    assert.equal(api.weaponBaseDirectDamage(item), 6);
  });

  await t.test("로켓런처는 데이터의 numPerShot을 발당 피해에 적용한다", () => {
    resetEquipment();
    const launchers = [10, 15, 20].map((shots, index) => weapon({
      name: `RocketLauncher${shots}`,
      display_name: `ROCKET LAUNCHER ${shots}`,
      aliases: `Missile,RocketLauncher,RocketLauncher${shots}`,
      hardpoint_type: "missile",
      stats: { damage: 0.375, numFiring: 1, numPerShot: index + 1 },
    }));
    assert.deepEqual(launchers.map(api.weaponProjectilesPerFiring), [1, 2, 3]);
    assert.deepEqual(launchers.map(api.weaponBaseDirectDamage), [0.375, 0.75, 1.125]);
    assert.deepEqual(launchers.map(api.weaponDamageTooltipValue), ["0.4", "0.8", "1.1"]);
  });

  await t.test("항상 적용되는 무기 모듈의 피해와 발열을 수량만큼 더한다", () => {
    const item = weapon({ id: 10, name: "Laser_X", stats: { damage: 5, heat: 3, numFiring: 2 } });
    const module = {
      id: 20,
      item_type: "module",
      faction: "InnerSphere",
      stats: { amountAllowed: 2 },
      weapon_stat_filters: [{
        compatible_weapons: ["Laser_X"],
        weapon_stats: [{ operation: "+", damage: 1, heat: 0.5 }],
      }],
    };
    resetEquipment({ 10: item, 20: module });
    assert.equal(api.weaponBonusDirectDamage(item), 4);
    assert.equal(api.weaponDirectDamage(item), 14);
    assert.equal(api.itemHeat(item), 4);
  });

  await t.test("스플래시는 기본 피해 양쪽과 모듈 총 스플래시를 정확히 합산한다", () => {
    const item = weapon({ id: 11, name: "Splash_X", stats: { damage: 10, splashPercent: 0.2 } });
    const module = {
      item_type: "module",
      faction: "InnerSphere",
      stats: { amountAllowed: 2 },
      weapon_stat_filters: [{
        compatible_weapons: ["Splash_X"],
        weapon_stats: [{ operation: "+", damage: 2 }],
      }],
    };
    resetEquipment({ 11: item, 21: module });
    assert.equal(api.weaponDirectDamage(item), 14);
    assert.equal(api.weaponSplashDamage(item), 2.4);
    closeTo(api.weaponTotalDamage(item), 18.8);
    assert.equal(api.weaponTotalDamage(item, false), 14);
  });

  await t.test("톤수는 구조 0.5톤 올림과 장갑 환산을 사용한다", () => {
    assert.equal(api.structureUpgradeTonnage(55, { stats: { weightPerTon: 0.05 } }), 3);
    assert.equal(api.structureUpgradeTonnage(55, { stats: { weightPerTon: 0.1 } }), 5.5);
    assert.equal(api.armorTonnage(320, { stats: { armorPerTon: 32 } }), 10);
    assert.equal(api.armorTonnage(320, { stats: { armorPerTon: 0 } }), 0);
    assert.equal(api.internalItemTonnageModifier({ name: "CompactGyro", stats: { tons: -2 } }), 2);
  });

  await t.test("엔진 히트싱크와 사이드 슬롯은 소스 수치를 경계 처리한다", () => {
    const engine = { stats: { heatsinks: 13, sideSlots: 3 } };
    assert.equal(api.engineIncludedHeatSinkCount(engine), 10);
    assert.equal(api.engineAdditionalHeatSinkCapacity(engine), 3);
    assert.equal(api.engineSideSlots(engine), 3);
    assert.equal(api.engineSideSlots({ stats: { sideSlots: -2 } }), 0);
  });

  await t.test("고정 옴니 엔진의 내부 히트싱크는 유지하고 빈 슬롯 없이 잠근다", () => {
    const previous = {
      equipment: api.state.equipment,
      loadouts: api.state.loadouts,
      omnipods: api.state.omnipods,
      selectedMech: api.state.selectedMech,
      currentBuild: api.state.currentBuild,
    };
    const engine = {
      id: 100,
      item_type: "engine",
      display_name: "FIXED CLAN ENGINE 300",
      faction: "Clan",
      stats: { rating: 300, heatsinks: 12, sideSlots: 2, slots: 6 },
    };
    const sink = {
      id: 200,
      item_type: "module",
      ctype: "CHeatSinkStats",
      name: "ClanDoubleHeatSink",
      display_name: "CLAN DOUBLE HEAT SINK",
      faction: "Clan",
      stats: { slots: 2, tons: 1 },
    };
    const mech = {
      id: 9001,
      faction: "Clan",
      stock_loadout: "test-omni",
      definition: {
        stats: { MinEngineRating: 300, MaxEngineRating: 300 },
        components: { centre_torso: { fixed: [engine.id] } },
      },
    };
    const build = {
      components: { centre_torso: { omnipod: 77, items: [] } },
      engineHeatSinks: [{ item_id: sink.id }],
    };

    try {
      api.state.equipment = { items: { [engine.id]: engine, [sink.id]: sink } };
      api.state.loadouts = { "test-omni": { components: { centre_torso: { omnipod: 77 } } } };
      api.state.omnipods = {};
      api.state.selectedMech = mech;
      api.state.currentBuild = build;
      api.state.fixedOmniEngineCache.clear();

      assert.equal(api.engineStoredHeatSinkCapacity(engine, mech, build), 2);
      assert.equal(api.engineUserHeatSinkCapacity(engine, mech, build), 0);
      api.normalizeEngineHeatSinks(mech, build);
      assert.equal(build.engineHeatSinks.map((entry) => entry.item_id).join(","), String(sink.id));

      const html = api.renderEngineHeatSinkBay(engine, { engineHeatSinkCapacity: 2 });
      assert.match(html, /fixed-engine-heat-sink omnipod-engine-heat-sink/);
      assert.doesNotMatch(html, /data-engine-heat-sink-item/);
      assert.doesNotMatch(html, /data-engine-heat-sink-drop/);
      assert.doesNotMatch(html, /empty-engine-heat-sink/);

      const standardMech = {
        ...mech,
        stock_loadout: "test-standard",
        definition: {
          stats: { MinEngineRating: 200, MaxEngineRating: 400 },
          components: { centre_torso: { fixed: [] } },
        },
      };
      api.state.loadouts["test-standard"] = { components: {} };
      api.state.selectedMech = standardMech;
      assert.equal(api.engineUserHeatSinkCapacity(engine, standardMech, build), 2);
      const standardHtml = api.renderEngineHeatSinkBay(engine, { engineHeatSinkCapacity: 2 });
      assert.match(standardHtml, /data-engine-heat-sink-item/);
      assert.match(standardHtml, /data-engine-heat-sink-drop/);
      assert.match(standardHtml, /empty-engine-heat-sink/);
      assert.doesNotMatch(standardHtml, /data-mobile-engine-heat-sink-delta/);
    } finally {
      Object.assign(api.state, previous);
      api.state.fixedOmniEngineCache.clear();
    }
  });
});

test("탄약·Artemis·하드포인트 공식", async (t) => {
  await t.test("Artemis 장착 여부와 alwaysHasArtemis가 활성 탄종을 결정한다", () => {
    const item = weapon({ stats: { ammoType: "LRM", artemisAmmoType: "LRMArtemis" } });
    resetEquipment();
    assert.equal(api.activeWeaponAmmoType(item), "LRM");
    api.state.currentBuild.upgrades.artemis.Equipped = true;
    assert.equal(api.activeWeaponAmmoType(item), "LRMArtemis");
    api.state.currentBuild.upgrades.artemis.Equipped = false;
    item.stats.alwaysHasArtemis = 1;
    assert.equal(api.activeWeaponAmmoType(item), "LRMArtemis");
  });

  await t.test("탄약 소모량은 ammoPerShot과 순차 발사 수 중 큰 정수값이다", () => {
    resetEquipment();
    assert.equal(api.weaponAmmoPerTrigger(weapon({ stats: { ammoType: "AC", ammoPerShot: 1, numFiring: 4 } })), 4);
    assert.equal(api.weaponAmmoPerTrigger(weapon({ stats: { ammoType: "LBX", ammoPerShot: 1, numFiring: 1, numPerShot: 10 } })), 1);
    assert.equal(api.weaponAmmoPerTrigger(weapon({ stats: {} })), 0);
  });

  await t.test("탄약 쿼크는 정규화한 탄종과 톤수를 기반으로 발수를 늘리거나 줄인다", () => {
    const ammo = { item_type: "ammo", name: "Clan LRM Ammo", stats: { type: "ClanLRMAmmo", numShots: 120, tons: 0.5 } };
    assert.equal(api.ammoCapacityQuirkKey(ammo), "clrm");
    assert.equal(api.ammoCapacityQuirkBonus(ammo, [quirk("ammocapacity_clrm_additive", 20)]), 20);
    assert.equal(api.effectiveAmmoShots(ammo, [quirk("AmmoCapacity_CLRM_Additive", 20)]), 130);

    const reductions = [
      ["ClanUltraAC5Ammo", "cultraac5", -40, 80, 40, 40, 20],
      ["ClanUltraAC10Ammo", "cultraac10", -46, 69, 33, 23, 10],
      ["ClanUltraAC20Ammo", "cultraac20", -30, 40, 20, 10, 5],
      ["ClanAC10Ammo", "cac10", -23, 46, 23, 23, 11],
      ["ClanAC20Ammo", "cac20", -24, 36, 18, 12, 6],
    ];
    reductions.forEach(([type, key, value, fullBase, halfBase, fullFinal, halfFinal]) => {
      const full = { item_type: "ammo", name: type, stats: { type, numShots: fullBase, tons: 1 } };
      const half = { item_type: "ammo", name: `${type}Half`, stats: { type, numShots: halfBase, tons: 0.5 } };
      const matchingQuirk = [quirk(`ammocapacity_${key}_additive`, value)];
      assert.equal(api.ammoCapacityQuirkBonus(full, matchingQuirk), value, `${key}: signed bonus`);
      assert.equal(api.effectiveAmmoShots(full, matchingQuirk), fullFinal, `${key}: full ton`);
      assert.equal(api.effectiveAmmoShots(half, matchingQuirk), halfFinal, `${key}: half ton`);
    });

    const halfUac20 = { item_type: "ammo", name: "C-UAC/20 AMMO (1/2)", stats: { type: "ClanUltraAC20Ammo", numShots: 20, tons: 0.5 } };
    const reduction = [quirk("ammocapacity_cultraac20_additive", -30)];
    const applied = api.collectEquipmentQuirkEffects(halfUac20, reduction).applied[0];
    assert.equal(applied.effective_value, -30);
    assert.equal(applied.display_value, -15);
    assert.match(applied.display_value_text, /-15/);
    assert.equal(api.effectiveAmmoShots(halfUac20, [quirk("ammocapacity_cac20_additive", -24)]), 20);

    const fractional = { item_type: "ammo", name: "FRACTIONAL", stats: { type: "ClanAC20Ammo", numShots: 10, tons: 0.5 } };
    assert.equal(api.effectiveAmmoShots(fractional, [quirk("ammocapacity_cac20_additive", -0.1)]), 9);
    assert.equal(api.collectEquipmentQuirkEffects(
      fractional,
      [quirk("ammocapacity_cac20_additive", 0.1)],
    ).applied.length, 0);
  });

  await t.test("하드포인트 수는 weapon_slots를 합산하고 누락 시 1을 사용한다", () => {
    const definition = { components: {
      left_arm: { hardpoints: [
        { hardpoint_type: "energy", weapon_slots: 3 },
        { hardpoint_type: "energy" },
        { Type: "4", weapon_slots: 2 },
      ] },
    } };
    const counts = api.hardpointCountsFromDefinition(definition);
    assert.equal(counts.energy, 4);
    assert.equal(counts.ams, 2);
    assert.equal(api.hardpointSlots({ weapon_slots: 0 }), 1);
  });

  await t.test("ECM 능력은 컴포넌트 원본 속성만 사용한다", () => {
    const ecmApi = loadMechLab();
    const mech = {
      id: 36,
      stock_loadout: "cda-3m",
      definition: { components: {
        left_torso: { hardpoints: [], internals: [], fixed: [], CanEquipECM: 1 },
        right_torso: { hardpoints: [], internals: [], fixed: [] },
      } },
    };
    const build = { components: {
      left_torso: { items: [], omnipod: null },
      right_torso: { items: [], omnipod: null },
    } };
    ecmApi.state.loadouts = {
      "cda-3m": { components: {
        right_torso: { items: [{ item_id: 9006 }] },
      } },
    };
    ecmApi.state.equipment = { items: {
      9006: { id: 9006, item_type: "module", ctype: "CGECMStats" },
    } };

    const left = ecmApi.effectiveComponentDefinition(mech, build, "left_torso");
    const right = ecmApi.effectiveComponentDefinition(mech, build, "right_torso");
    assert.equal(ecmApi.hardpointCountsFromDefinition({ components: { left } }).ecm, 1);
    assert.equal(ecmApi.hardpointCountsFromDefinition({ components: { right } }).ecm, undefined);
  });

  await t.test("ECM 능력은 선택한 옴니포드의 원본 속성을 사용한다", () => {
    const ecmApi = loadMechLab();
    const mech = {
      id: 1,
      stock_loadout: "fmt-prime",
      definition: { components: {
        right_arm: { hardpoints: [], internals: [], fixed: [] },
      } },
    };
    const build = { components: {
      right_arm: { items: [], omnipod: 31533 },
    } };
    ecmApi.state.omnipods = {
      31533: { id: 31533, hardpoints: [], internals: [], fixed: [], CanEquipECM: 1 },
    };

    const component = ecmApi.effectiveComponentDefinition(mech, build, "right_arm");
    assert.equal(ecmApi.hardpointCountsFromDefinition({ components: { component } }).ecm, 1);
  });

  await t.test("구조·장갑 업그레이드 슬롯을 컴포넌트 여유 공간에 순서대로 배치한다", () => {
    resetEquipment();
    const definition = { components: {
      right_torso: { slots: 2 },
      centre_torso: { slots: 2 },
    } };
    const build = { components: {}, upgrades: {} };
    const allocation = api.allocateUpgradeSlots(3, definition, build, null, null);
    assert.equal(allocation.byComponent.right_torso, 2);
    assert.equal(allocation.byComponent.centre_torso, 1);
    assert.equal(allocation.unallocated, 0);
    const fixed = api.allocateFixedUpgradeSlots(
      { right_torso: 3, centre_torso: 1 },
      definition,
      build,
      null,
      null,
    );
    assert.equal(fixed.unallocated, 1);
  });
});

test("내구도 공식", async (t) => {
  const mech = {
    id: "fixture",
    faction: "InnerSphere",
    definition: {
      stats: { MaxTons: 50 },
      components: {
        head: { hp: 15 },
        centre_torso: { hp: 30 },
        left_torso: { hp: 20 },
        right_torso: { hp: 20 },
        left_arm: { hp: 16 },
        right_arm: { hp: 16 },
        left_leg: { hp: 22 },
        right_leg: { hp: 22 },
      },
    },
  };

  await t.test("내구 스킬 배율은 각 합계에 내림 적용한다", () => {
    assert.equal(api.durabilitySkillFinalValue(101, 0.1), 111);
    assert.equal(api.durabilitySkillFinalValue(101, 0), 101);
  });

  await t.test("머리 최대 장갑은 18, 나머지는 구조의 두 배다", () => {
    api.state.selectedMech = mech;
    assert.equal(api.baseMaxArmor("head", mech), 18);
    assert.equal(api.baseMaxArmor("centre_torso", mech), 60);
    assert.equal(api.componentArmorCapacity("left_arm", mech.definition.components.left_arm), 32);
  });

  await t.test("장갑·후면·구조 쿼크와 스킬을 합산한다", () => {
    api.state.selectedMech = mech;
    const values = {
      armorresist_all_additive: 2,
      armorresist_ct_additive: 3,
      armorresist_ctr_additive: 1,
      internalresist_all_additive: 1,
      internalresist_ct_additive: 4,
      increasedarmor_multiplier: 0.1,
      increasedstructure_multiplier: 0.1,
    };
    const armor = api.armorInfoRows(values, mech)[1];
    const structure = api.structureInfoRows(values, mech)[1];
    assert.equal(armor.frontBase, 60);
    assert.equal(armor.rear, 3);
    assert.equal(armor.total, 74);
    assert.equal(structure.base, 30);
    assert.equal(structure.total, 38);
    const combined = api.combinedDurabilityRows([armor], [structure])[0];
    assert.equal(combined.total, 112);
  });

  await t.test("현재 장갑은 전후면을 합친 뒤 스킬 내림을 한 번 적용한다", () => {
    api.state.selectedMech = mech;
    const build = {
      components: Object.fromEntries(Object.keys(mech.definition.components).map((key) => [key, { armor: key === "centre_torso" ? 50 : 0 }])),
      rearArmor: { centre_torso: 10 },
    };
    const values = {
      armorresist_all_additive: 1,
      armorresist_ct_additive: 2,
      armorresist_ctr_additive: 3,
      increasedarmor_multiplier: 0.1,
    };
    assert.equal(api.currentBuildArmorTotal(values, mech, build), 82);
    assert.equal(api.finalArmorAllocation(50, 3, 0.1, 10, 4), 59);
    assert.equal(api.finalArmorAllocation(10, 4, 0.1, 50, 3, false), 14);
  });

  await t.test("컴포넌트 내구 기여도는 구조 쿼크와 스킬 증가분을 합친다", () => {
    const values = {
      armorresist_all_additive: 1,
      armorresist_ct_additive: 2,
      armorresist_ctr_additive: 3,
      internalresist_all_additive: 1,
      internalresist_ct_additive: 4,
      increasedarmor_multiplier: 0.1,
      increasedstructure_multiplier: 0.1,
    };
    const result = api.componentDurabilityQuirkValues(
      "centre_torso",
      values,
      mech.definition.components.centre_torso,
    );
    assert.equal(result.frontArmor, 3);
    assert.equal(result.rearArmor, 4);
    assert.equal(result.armorSkillMultiplier, 0.1);
    assert.equal(result.structure, 8);
  });
});

test("기동·센서·점프젯 공식", async (t) => {
  const mech = {
    id: "mobility",
    faction: "InnerSphere",
    definition: {
      stats: { MaxTons: 50, MaxEngineRating: 300, SensorRange: 800 },
      movement: {
        MaxMovementSpeed: 10,
        ReverseSpeedMultiplier: 0.6,
        AccelLerpMidRate: 20,
        DecelLerpMidRate: 500,
        TurnLerpMidRate: Math.PI / 2,
        TorsoTurnSpeedYaw: 60,
        MaxTorsoAngleYaw: 90,
        MaxTorsoAnglePitch: 25,
        MaxArmRotationYaw: 15,
        MaxArmRotationPitch: 10,
      },
      components: {},
    },
  };

  await t.test("이동 공식은 엔진/톤수와 쿼크 합산 배율을 적용한다", () => {
    api.state.selectedMech = mech;
    const values = {
      mechtopspeed_multiplier: 0.1,
      reversespeed_multiplier: 0.2,
      mechacceleration_multiplier: 0.1,
      accellerp_all_multiplier: 0.05,
      mechdeceleration_multiplier: 0.2,
      turnrate_multiplier: 0.1,
      torso_yawangle_additive: 10,
      torso_yawangle_multiplier: 0.1,
      torso_pitchangle_additive: 5,
      torso_yawspeed_multiplier: 0.25,
    };
    const result = api.movementInfo(values, mech);
    assert.equal(result.baseMaxSpeed, 60);
    closeTo(result.maxSpeed, 66);
    closeTo(result.reverseSpeed, 47.52);
    closeTo(result.acceleration, 23);
    assert.equal(result.deceleration, 12);
    closeTo(result.turnSpeed, 99);
    closeTo(result.angleX[0], 110);
    assert.equal(result.angleY[0], 30);
    assert.equal(result.torsoSpeed, 75);
  });

  await t.test("점프젯은 burn-time과 initial-thrust 쿼크를 최종 높이에 반영한다", () => {
    const jets = [
      { stats: { duration: 2, boost_instant: 4, boost_z: 10, boost_fwd: 3 } },
      { stats: { duration: 1, boost_instant: 6, boost_z: 8, boost_fwd: 3 } },
    ];
    const quirks = [
      quirk("jumpjets_burntime_multiplier", 0.1),
      quirk("jumpjets_initialthrust_multiplier", 0.2),
    ];
    const final = api.jumpJetFinalStats(jets[0], quirks);
    closeTo(final.duration, 2.2);
    closeTo(final.initialThrust, 4.8);
    closeTo(api.jumpJetHeight(jets, 50, quirks), (7.5 * 18 + 2.2 * 0.75 * 7.2) / 50);
    assert.equal(api.jumpJetHeight([], 50, quirks), 0);
  });

  await t.test("센서 장비 보너스는 쿼크 적용 후 곱한다", () => {
    resetEquipment();
    api.state.selectedMech = mech;
    api.state.currentBuild = { components: {}, upgrades: {}, rearArmor: {} };
    closeTo(api.mechSensorRange([
      quirk("sensorrange_multiplier", 0.1),
      quirk("sensorrange_additive", 20),
    ], mech, api.state.currentBuild), 900);
    assert.equal(api.targetEquipmentSensorRangeBonus({ item_type: "module", name: "Not Sensor", stats: {} }), 0);
  });

  await t.test("타깃 컴퓨터 필터의 사거리·속도·치명타 보너스를 누적한다", () => {
    const item = weapon({ name: "PPC" });
    const module = {
      weapon_stat_filters: [{
        compatible_weapons: ["PPC"],
        ranges: [{ multiplier: 1.1 }],
        weapon_stats: [{ operation: "*", speed: 1.2 }, { operation: "+", critChanceIncrease: "0.1,0.2,-1" }],
      }],
    };
    const result = api.targetComputerWeaponModifiers(item, [module]);
    closeTo(result.rangeBonus, 0.1);
    closeTo(result.speedBonus, 0.2);
    closeTo(result.criticalChance[0], 0.1);
    closeTo(result.criticalChance[1], 0.2);
    assert.equal(result.criticalChance[2], -1);
  });
});

test("무기 쿼크·연사·사거리 공식", async (t) => {
  await t.test("감소·증가·부호 보존 쿼크를 구분한다", () => {
    const quirks = [
      quirk("all_cooldown_multiplier", -0.1),
      quirk("all_range_multiplier", 0.2),
      quirk("all_duration_multiplier", 0.15),
    ];
    assert.equal(api.quirkReduction(quirks, "all_cooldown_multiplier"), 0.1);
    assert.equal(api.quirkIncrease(quirks, "all_range_multiplier"), 0.2);
    assert.equal(api.quirkSignedValue(quirks, "all_duration_multiplier"), 0.15);
  });

  await t.test("무기 적용 쿼크는 실제 효과를 합산하고 출처를 보존한다", () => {
    const item = weapon({
      name: "PPC",
      aliases: "Energy,PPC",
      stats: {
        heat: 10,
        cooldown: 4,
        duration: 0.5,
        projectileclass: "bullet",
        speed: 1000,
        spread: 2,
        minheatpenaltylevel: 3,
        heatpenalty: 7,
        heatPenaltyID: 1,
      },
      ranges: [
        { start: 0, damageModifier: 1 },
        { start: 500, damageModifier: 1 },
      ],
    });
    const effects = api.collectWeaponQuirkEffects(item, [
      { name: "all_cooldown_multiplier", display_name: "Cooldown", value: -0.1, source_text: "Variant" },
      { name: "ALL_COOLDOWN_MULTIPLIER", display_name: "Cooldown", value: -0.05, source_text: "SKILLS · firepower" },
      { name: "energy_cooldown_multiplier", value: -0.1, source_text: "LEFT ARM" },
      { name: "ppc_cooldown_multiplier", value: -0.05, source_text: "SET 8pc" },
      { name: "ppc_duration_multiplier", value: 0.1, source_text: "Variant" },
      { name: "energy_spread_multiplier", value: 0.1, source_text: "Variant" },
      { name: "all_minheatpenaltylevel_additive", value: 1, source_text: "SKILLS · firepower" },
    ]);
    closeTo(effects.totals.cooldownReduction, 0.3);
    closeTo(effects.totals.durationModifier, 0.1);
    closeTo(effects.totals.spreadModifier, 0.1);
    assert.equal(effects.totals.hslBonus, 1);
    const cooldown = effects.applied.filter((entry) => entry.name === "all_cooldown_multiplier");
    assert.equal(cooldown.length, 1);
    closeTo(cooldown[0].value, -0.15);
    assert.match(cooldown[0].source_text, /Variant/);
    assert.match(cooldown[0].source_text, /SKILLS/);
    assert.equal(effects.applied.find((entry) => entry.name === "ppc_duration_multiplier").harmful, true);
    assert.equal(effects.applied.find((entry) => entry.name === "energy_spread_multiplier").harmful, true);
  });

  await t.test("무기 적용 쿼크는 무기별 예외와 대상 스탯 유무를 반영한다", () => {
    const rocket = weapon({
      name: "RocketLauncher10",
      aliases: "Missile,RocketLauncher,RocketLauncher10",
      hardpoint_type: "missile",
      stats: { cooldown: 0.125, projectileclass: "missile" },
    });
    const rocketEffects = api.collectWeaponQuirkEffects(rocket, [
      quirk("all_cooldown_multiplier", -0.1),
      quirk("missile_cooldown_multiplier", -0.2),
      quirk("rocketlauncher10_cooldown_multiplier", -0.3),
    ]);
    assert.equal(rocketEffects.totals.cooldownReduction, 0);
    assert.equal(rocketEffects.applied.length, 0);

    const ams = weapon({
      name: "ClanAntiMissileSystem",
      display_name: "C-AMS",
      aliases: "AntiMissileSystem,ClanAntiMissileSystem",
      hardpoint_type: "ams",
      ctype: "WeaponAMS",
      ranges: [{ start: 0 }, { start: 500 }],
    });
    const amsEffects = api.collectWeaponQuirkEffects(ams, [
      quirk("all_range_multiplier", 0.2),
      quirk("ams_range_multiplier", 0.05),
      quirk("clanantimissilesystem_range_multiplier", 0.1),
    ]);
    closeTo(amsEffects.totals.rangeBonus, 0.35);
    assert.deepEqual(
      Array.from(amsEffects.applied, (entry) => entry.name).sort(),
      [
        "all_range_multiplier",
        "ams_range_multiplier",
        "clanantimissilesystem_range_multiplier",
      ],
    );

    const laserAms = weapon({
      name: "LaserAntiMissileSystem",
      display_name: "LASER AMS",
      aliases: "ISAntiMissileSystem,LaserAntiMissileSystem,ISLaserAntiMissileSystem",
      hardpoint_type: "ams",
      ctype: "WeaponAMS",
      ranges: [{ start: 0 }, { start: 500 }],
    });
    const laserAmsEffects = api.collectWeaponQuirkEffects(laserAms, [
      quirk("all_range_multiplier", 0.2),
      quirk("ams_range_multiplier", 0.05),
      quirk("laserantimissilesystem_range_multiplier", 0.1),
    ]);
    closeTo(laserAmsEffects.totals.rangeBonus, 0.35);
    assert.deepEqual(
      Array.from(laserAmsEffects.applied, (entry) => entry.name).sort(),
      ["all_range_multiplier", "ams_range_multiplier", "laserantimissilesystem_range_multiplier"],
    );

    const hitscan = weapon({ stats: { speed: 1000, projectileclass: "" } });
    const hitscanEffects = api.collectWeaponQuirkEffects(hitscan, [
      quirk("all_velocity_multiplier", 0.2),
    ]);
    assert.equal(hitscanEffects.applied.length, 0);

    const beam = weapon({
      name: "ClanBeamLaser",
      aliases: "Energy,Laser,ClanBeamLaser",
      stats: { duration: -1, cooldown: 2 },
    });
    const beamEffects = api.collectWeaponQuirkEffects(beam, [
      quirk("all_cooldown_multiplier", -0.2),
      quirk("all_duration_multiplier", -0.2),
    ]);
    assert.equal(beamEffects.applied.length, 0);
  });

  await t.test("장비 툴팁 적용 효과 목록은 UI 설정으로 즉시 숨길 수 있다", () => {
    const previous = api.state.showWeaponTooltipQuirks;
    const item = weapon({ stats: { cooldown: 2 } });
    const quirks = [{
      name: "all_cooldown_multiplier",
      display_name: "Cooldown",
      value: -0.1,
      source_text: "Variant, SKILLS · firepower",
    }];
    try {
      api.state.showWeaponTooltipQuirks = true;
      const visible = api.equipmentTooltipAppliedEffectsHtml(item, quirks);
      assert.match(visible, /APPLIED EFFECTS/);
      assert.match(visible, /Cooldown/);
      assert.doesNotMatch(visible, /SKILLS/);
      const equipmentOnly = {
        sources: [{
          display_name: "TARGETING COMP. MK I",
          effects: [{ label: "BEAM RANGE", value_text: "+4%" }],
        }],
      };
      assert.match(api.equipmentTooltipAppliedEffectsHtml(item, [], equipmentOnly), /TARGETING COMP\. MK I/);
      api.state.showWeaponTooltipQuirks = false;
      assert.equal(api.equipmentTooltipAppliedEffectsHtml(item, quirks), "");
      assert.equal(api.equipmentTooltipAppliedEffectsHtml(item, [], equipmentOnly), "");
    } finally {
      api.state.showWeaponTooltipQuirks = previous;
    }
  });

  await t.test("Target Computer 장비 효과는 출처별로 쿼크 다음에 표시한다", () => {
    const beam = weapon({
      name: "MediumLaser",
      display_name: "MEDIUM LASER",
      ranges: [{ start: 0 }, { start: 450 }],
      stats: { projectileclass: "" },
    });
    const targetComputer = {
      id: 9013,
      name: "TargetingComputerMkI",
      display_name: "TARGETING COMP. MK I",
      weapon_stat_filters: [{
        tag: "BeamWeapons",
        compatible_weapons: ["MediumLaser"],
        weapon_stats: [{
          operation: "+",
          critChanceIncrease: "0.0114,0.0064,0.0014",
        }],
        ranges: [{ multiplier: 1.04 }],
      }],
    };
    const result = api.collectTargetComputerWeaponEffects(beam, [targetComputer]);
    closeTo(result.totals.rangeBonus, 0.04);
    closeTo(result.totals.criticalChance[0], 0.0114);
    closeTo(api.targetComputerWeaponModifiers(beam, [targetComputer]).rangeBonus, 0.04);
    assert.equal(result.sources.length, 1);
    assert.deepEqual(
      Array.from(result.sources[0].effects, (effect) => effect.label),
      ["BEAM CRITICAL CHANCE", "BEAM RANGE"],
    );

    const html = api.equipmentTooltipAppliedEffectsHtml(beam, [{
      name: "all_cooldown_multiplier",
      display_name: "COOLDOWN",
      value: -0.1,
    }], result);
    assert.ok(html.indexOf("COOLDOWN") < html.indexOf("TARGETING COMP. MK I"));
    assert.match(html, /BEAM CRITICAL CHANCE/);
    assert.match(html, /\+1\.14%/);
    assert.doesNotMatch(html, /0\.64%|0\.14%/);
    assert.match(html, /BEAM RANGE/);
    assert.match(html, /\+4%/);
    assert.doesNotMatch(html, /VELOCITY/);
    assert.match(html, /class="equipment-tooltip-equipment-source-title">TARGETING COMP\. MK I/);
    assert.match(html, /equipment-tooltip-equipment-effect quirk-tone-energy/);
    assert.match(html, /strong class="quirk-value">\+1\.14%/);

    const secondComputer = {
      ...targetComputer,
      id: 9014,
      display_name: "TARGETING COMP. MK II",
      weapon_stat_filters: [{
        ...targetComputer.weapon_stat_filters[0],
        ranges: [{ multiplier: 1.05 }],
      }],
    };
    const stacked = api.collectTargetComputerWeaponEffects(beam, [targetComputer, secondComputer]);
    closeTo(stacked.totals.rangeBonus, 0.09);
    assert.deepEqual(
      Array.from(stacked.sources, (source) => source.display_name),
      ["TARGETING COMP. MK I", "TARGETING COMP. MK II"],
    );
  });

  await t.test("Projectile TC와 ASP는 실제로 일치하는 무기 효과만 표시한다", () => {
    const projectile = weapon({
      name: "PPC",
      ranges: [{ start: 0 }, { start: 540 }],
      stats: { speed: 1000, projectileclass: "ppc" },
    });
    const targetComputer = {
      display_name: "TARGETING COMP. MK I",
      weapon_stat_filters: [{
        tag: "ProjectileWeapons",
        compatible_weapons: ["PPC"],
        weapon_stats: [
          { operation: "+", critChanceIncrease: "0.0057,0.0032,0.0007" },
          { operation: "*", speed: 1.1 },
        ],
        ranges: [],
      }],
    };
    const result = api.collectTargetComputerWeaponEffects(projectile, [targetComputer]);
    assert.deepEqual(
      Array.from(result.sources[0].effects, (effect) => effect.label),
      ["PROJECTILE CRITICAL CHANCE", "PROJECTILE VELOCITY"],
    );
    const projectileHtml = api.equipmentTooltipAppliedEffectsHtml(projectile, [], result);
    assert.match(projectileHtml, /equipment-tooltip-equipment-effect quirk-tone-energy/);
    assert.equal(api.collectTargetComputerWeaponEffects(
      weapon({ name: "UnmatchedWeapon" }),
      [targetComputer],
    ).sources.length, 0);

    const tag = weapon({ name: "TAG", ranges: [{ start: 0 }, { start: 750 }] });
    const laser = weapon({ name: "MediumLaser", ranges: [{ start: 0 }, { start: 450 }] });
    const asp = {
      name: "CCC",
      display_name: "ADVANCED SENSOR PACKAGE",
      weapon_stat_filters: [{
        tag: "BeamWeapons",
        compatible_weapons: ["TAG"],
        weapon_stats: [],
        ranges: [{ multiplier: 1.2 }],
      }],
    };
    assert.equal(
      api.collectTargetComputerWeaponEffects(tag, [asp]).sources[0].effects[0].label,
      "TAG RANGE",
    );
    assert.equal(api.collectTargetComputerWeaponEffects(laser, [asp]).sources.length, 0);
  });

  await t.test("Modified Ballistic Loader 자체 툴팁은 명시된 TC 효과를 표시한다", () => {
    const loader = {
      id: 9031,
      item_type: "module",
      name: "BaneHeroComputer",
      display_name: "Modified Ballistic Loader",
      ctype: "CTargetingComputerStats",
      stats: { slots: 1, tons: 1, health: 99999, amountAllowed: 1 },
      weapon_stat_filters: [
        {
          tag: "BeamWeapons",
          compatible_weapons: ["MediumLaser"],
          weapon_stats: [{ operation: "+", critChanceIncrease: "0.0114,0.0064,0.0014" }],
          ranges: [{ multiplier: 1.04 }],
        },
        {
          tag: "ProjectileWeapons",
          compatible_weapons: ["ClanUltraAutoCannon20"],
          weapon_stats: [
            { operation: "+", critChanceIncrease: "0.0114,0.0064,0.0014" },
            { operation: "*", speed: 1.05 },
          ],
          ranges: [],
        },
        {
          tag: "ProjectileWeapons",
          compatible_weapons: ["ClanHyperAssaultGaussRifle40"],
          weapon_stats: [
            { operation: "+", spread: 0.5 },
            { operation: "+", numPerShot: 3 },
            { operation: "*", damage: 0.34 },
            { operation: "*", volleydelay: 0.7 },
          ],
          ranges: [],
        },
        {
          tag: "ProjectileWeapons",
          compatible_weapons: ["ClanUltraAutoCannon20"],
          weapon_stats: [
            { operation: "+", numFiring: -3 },
            { operation: "*", damage: 4 },
          ],
          ranges: [],
        },
      ],
    };
    const rows = api.equipmentTooltipGroups(loader, 0, []).flat();
    const labels = Array.from(rows, ([label]) => label);
    assert.ok(labels.includes("BEAM RANGE"));
    assert.ok(labels.includes("BEAM CRITICAL CHANCE"));
    assert.ok(labels.includes("PROJECTILE VELOCITY"));
    assert.ok(labels.includes("PROJECTILE CRITICAL CHANCE"));
    assert.ok(labels.includes("SENSOR RANGE"));
    assert.ok(labels.includes("HAG / GAUSS FIRING MODE"));
    assert.ok(labels.includes("AC / UAC FIRING MODE"));
    assert.equal(rows.find(([label]) => label === "HAG / GAUSS FIRING MODE")[1], "SHOTGUN");
    assert.equal(rows.find(([label]) => label === "AC / UAC FIRING MODE")[1], "SINGLE PROJECTILE");
    assert.ok(!labels.some((label) => label.endsWith("PELLETS / SHOT")));
    assert.ok(!labels.some((label) => label.endsWith("DAMAGE / PROJECTILE")));
    assert.ok(!labels.some((label) => label.endsWith("PROJECTILES")));
    assert.ok(!labels.some((label) => label.endsWith("SPREAD")));
    assert.equal(rows.find(([label]) => label === "C.HAG INTERVAL")[1], "×0.7");
    assert.ok(!labels.includes("DAMAGE"));
    assert.ok(!labels.includes("SHOTS"));

    const hag = weapon({
      name: "ClanHyperAssaultGaussRifle40",
      hardpoint_type: "ballistic",
      stats: { speed: 1000, projectileclass: "bullet" },
    });
    const uac = weapon({
      name: "ClanUltraAutoCannon20",
      hardpoint_type: "ballistic",
      stats: { speed: 1000, projectileclass: "bullet" },
    });
    const hagEffects = api.collectTargetComputerWeaponEffects(hag, [loader]);
    const uacEffects = api.collectTargetComputerWeaponEffects(uac, [loader]);
    assert.ok(hagEffects.sources[0].effects.some((effect) => (
      effect.label === "FIRING MODE" && effect.value_text === "SHOTGUN"
    )));
    assert.ok(!hagEffects.sources[0].effects.some((effect) => effect.label === "PELLETS / SHOT"));
    assert.ok(!hagEffects.sources[0].effects.some((effect) => effect.label === "DAMAGE / PROJECTILE"));
    assert.ok(!hagEffects.sources[0].effects.some((effect) => effect.label === "SPREAD"));
    assert.ok(hagEffects.sources[0].effects.some((effect) => (
      effect.label === "C.HAG INTERVAL" && effect.value_text === "×0.7"
    )));
    assert.ok(uacEffects.sources[0].effects.some((effect) => (
      effect.label === "FIRING MODE" && effect.value_text === "SINGLE PROJECTILE"
    )));
    assert.ok(!uacEffects.sources[0].effects.some((effect) => effect.label === "PROJECTILES"));
  });

  await t.test("Modified Ballistic Loader는 모든 일치 필터를 적용해 AC/UAC와 Gauss/HAG를 변환한다", () => {
    const loader = {
      id: 9031,
      item_type: "module",
      name: "BaneHeroComputer",
      display_name: "Modified Ballistic Loader",
      weapon_stat_filters: [
        {
          compatible_weapons: ["ClanUltraAutoCannon20"],
          weapon_stats: [
            { operation: "+", numFiring: -3 },
            { operation: "*", damage: 4 },
          ],
        },
        {
          compatible_weapons: ["ClanGaussRifle"],
          weapon_stats: [
            { operation: "+", spread: 0.25 },
            { operation: "+", numPerShot: 4 },
            { operation: "*", damage: 0.25 },
          ],
        },
        {
          compatible_weapons: ["ClanHyperAssaultGaussRifle20"],
          weapon_stats: [
            { operation: "+", spread: 0.5 },
            { operation: "+", numPerShot: 3 },
            { operation: "*", damage: 0.34 },
            { operation: "*", volleydelay: 0.7 },
          ],
        },
      ],
    };
    const uac = weapon({
      name: "ClanUltraAutoCannon20",
      hardpoint_type: "ballistic",
      stats: {
        ammoType: "ClanUltraAC20Ammo",
        ammoPerShot: 1,
        numFiring: 4,
        damage: 5,
        volleydelay: 0.11,
      },
    });
    const gauss = weapon({
      name: "ClanGaussRifle",
      hardpoint_type: "ballistic",
      stats: { ammoType: "ClanGaussAmmo", ammoPerShot: 1, numFiring: 1, damage: 15, volleydelay: 0, projectileclass: "bullet" },
    });
    const hag20 = weapon({
      name: "ClanHyperAssaultGaussRifle20",
      hardpoint_type: "ballistic",
      stats: {
        ammoType: "ClanHAG20Ammo",
        ammoPerShot: 1,
        numFiring: 4,
        damage: 4,
        volleydelay: 0.13,
        projectileclass: "bullet",
        critChanceIncrease: "0.17,-1,-1",
      },
    });

    assert.equal(api.weaponDirectDamage(uac), 20);
    assert.equal(api.weaponAmmoPerTrigger(uac, []), 4);
    assert.equal(api.weaponAmmoPerTrigger(uac, [loader]), 1);
    assert.equal(api.effectiveWeaponFiringProfile(uac, [loader]).firingShots, 1);
    assert.equal(api.weaponFiringTime(uac, [loader]), 0);
    assert.ok(api.weaponExpectedCooldown(uac, [], [loader]) < api.weaponExpectedCooldown(uac, [], []));
    const uacRows = Object.fromEntries(api.equipmentTooltipGroups(uac, 0, [], [loader]).flat());
    assert.equal(
      uacRows.SHOTS.html,
      '<span class="equipment-tooltip-final quirk-applied">1</span>',
    );
    assert.equal(uacRows["SHOT INTERVAL"], undefined);

    closeTo(api.weaponDirectDamage(gauss, [loader]), 15);
    closeTo(api.weaponDirectDamage(hag20, [loader]), 16.32);
    assert.equal(api.weaponAmmoPerTrigger(gauss, [loader]), 1);
    assert.equal(api.weaponAmmoPerTrigger(hag20, [loader]), 4);
    closeTo(api.weaponFiringTime(hag20, [loader]), 0.273);
    assert.ok(api.weaponExpectedCooldown(hag20, [], [loader]) < api.weaponExpectedCooldown(hag20, [], []));
    const gaussRows = Object.fromEntries(api.equipmentTooltipGroups(gauss, 0, [], [loader]).flat());
    const hagRows = Object.fromEntries(api.equipmentTooltipGroups(hag20, 0, [], [loader]).flat());
    assert.equal(
      gaussRows.SHOTS.html,
      '<span class="equipment-tooltip-final quirk-applied">4</span>',
    );
    assert.equal(
      hagRows.SHOTS.html,
      '<span class="equipment-tooltip-final quirk-applied">3 X 4</span>',
    );
    assert.match(hagRows["SHOT INTERVAL"].html, /equipment-tooltip-final quirk-applied/);
    assert.match(hagRows["SHOT INTERVAL"].html, /0\.091 s/);

    const singleCases = [
      ["ClanUltraAutoCannon5", 2, 2.5, -1, 2],
      ["ClanUltraAutoCannon10", 3, 3.3334, -2, 3],
      ["ClanUltraAutoCannon20", 4, 5, -3, 4],
      ["ClanAutoCannon10", 2, 5, -1, 2],
      ["ClanAutoCannon20", 3, 6.6666, -2, 3],
    ];
    const allSingleLoader = {
      ...loader,
      weapon_stat_filters: [
        {
          compatible_weapons: singleCases.map(([name]) => name),
          weapon_stats: [
            { operation: "+", critChanceIncrease: "0.0114,0.0064,0.0014" },
            { operation: "*", speed: 1.05 },
          ],
        },
        ...singleCases.map(([name, , , delta, multiplier]) => ({
          compatible_weapons: [name],
          weapon_stats: [
            { operation: "+", numFiring: delta },
            { operation: "*", damage: multiplier },
          ],
        })),
      ],
    };
    singleCases.forEach(([name, shots, damage], index) => {
      const item = weapon({
        name,
        hardpoint_type: "ballistic",
        stats: { ammoType: `${name}Ammo`, ammoPerShot: 1, numFiring: shots, damage, volleydelay: 0.11 },
      });
      const effective = api.effectiveWeaponStats(item, [allSingleLoader]);
      assert.deepEqual(Array.from(effective.matchedFilterIndexes), [0, index + 1], name);
      closeTo(effective.damage, damage * singleCases[index][4]);
      assert.equal(effective.numFiring, 1, name);
      closeTo(api.weaponDirectDamage(item, [allSingleLoader]), shots * damage);
      assert.equal(api.effectiveWeaponFiringProfile(item, [allSingleLoader]).firingShots, 1, name);
      assert.equal(api.weaponAmmoPerTrigger(item, [allSingleLoader]), 1, name);
      assert.equal(api.weaponFiringTime(item, [allSingleLoader]), 0, name);
      const rows = Object.fromEntries(api.equipmentTooltipGroups(item, 0, [], [allSingleLoader]).flat());
      assert.equal(
        rows.SHOTS.html,
        '<span class="equipment-tooltip-final quirk-applied">1</span>',
        name,
      );
      assert.equal(rows["SHOT INTERVAL"], undefined, name);
      const baseExpected = api.weaponExpectedCooldown(item, [], []);
      const finalExpected = api.weaponExpectedCooldown(item, [], [allSingleLoader]);
      if (name.includes("Ultra")) assert.ok(finalExpected < baseExpected, name);
      else assert.equal(finalExpected, null, name);
    });

    const unmatched = weapon({
      name: "ClanUltraAutoCannon2",
      hardpoint_type: "ballistic",
      stats: { ammoType: "ClanUltraAC2Ammo", ammoPerShot: 1, numFiring: 2, damage: 1, volleydelay: 0.11 },
    });
    assert.equal(api.weaponAmmoPerTrigger(unmatched, [allSingleLoader]), 2);
    assert.equal(api.weaponFiringTime(unmatched, [allSingleLoader]), 0.11);
    assert.equal(
      Object.fromEntries(api.equipmentTooltipGroups(unmatched, 0, [], [allSingleLoader]).flat())["SHOT INTERVAL"],
      "0.11 s",
    );

    const shotgunCases = [
      ["ClanGaussRifle", 1, 15, 0],
      ["ClanHyperAssaultGaussRifle20", 4, 4, 0.13],
      ["ClanHyperAssaultGaussRifle30", 6, 4, 0.12],
      ["ClanHyperAssaultGaussRifle40", 8, 4, 0.11],
    ];
    const allShotgunLoader = {
      ...loader,
      weapon_stat_filters: [
        {
          compatible_weapons: shotgunCases.map(([name]) => name),
          weapon_stats: [
            { operation: "+", critChanceIncrease: "0.0114,0.0064,0.0014" },
            { operation: "*", speed: 1.05 },
          ],
        },
        ...shotgunCases.map(([name]) => ({
          compatible_weapons: [name],
          weapon_stats: [
            ...(name === "ClanGaussRifle" ? [{ operation: "+", spread: 0.25 }] : [{ operation: "+", spread: 0.5 }]),
            { operation: "+", numPerShot: name === "ClanGaussRifle" ? 4 : 3 },
            { operation: "*", damage: name === "ClanGaussRifle" ? 0.25 : 0.34 },
            ...(name === "ClanGaussRifle" ? [] : [{ operation: "*", volleydelay: 0.7 }]),
          ],
        })),
      ],
    };
    shotgunCases.forEach(([name, shots, damage, delay], index) => {
      const item = weapon({
        name,
        hardpoint_type: "ballistic",
        stats: { ammoType: `${name}Ammo`, ammoPerShot: 1, numFiring: shots, damage, volleydelay: delay, projectileclass: "bullet" },
      });
      const effective = api.effectiveWeaponStats(item, [allShotgunLoader]);
      assert.deepEqual(Array.from(effective.matchedFilterIndexes), [0, index + 1], name);
      const pellets = name === "ClanGaussRifle" ? 4 : 3;
      const damageMultiplier = name === "ClanGaussRifle" ? 0.25 : 0.34;
      closeTo(effective.damage, damage * damageMultiplier);
      assert.equal(effective.numPerShot, pellets, name);
      closeTo(effective.spread, name === "ClanGaussRifle" ? 0.25 : 0.5);
      closeTo(effective.volleydelay, name === "ClanGaussRifle" ? delay : delay * 0.7);
      closeTo(api.weaponDirectDamage(item, [allShotgunLoader]), shots * damage * damageMultiplier * pellets);
      assert.equal(api.weaponAmmoPerTrigger(item, [allShotgunLoader]), shots, name);
      closeTo(
        api.weaponFiringTime(item, [allShotgunLoader]),
        Math.max(0, shots - 1) * (name === "ClanGaussRifle" ? delay : delay * 0.7),
      );
      const shotsValue = Object.fromEntries(
        api.equipmentTooltipGroups(item, 0, [], [allShotgunLoader]).flat(),
      ).SHOTS;
      const expectedShots = shots === 1 ? `${pellets}` : `${pellets} X ${shots}`;
      assert.equal(
        shotsValue.html,
        `<span class="equipment-tooltip-final quirk-applied">${expectedShots}</span>`,
        name,
      );
    });
    const commonEffects = api.collectTargetComputerWeaponEffects(hag20, [allShotgunLoader]);
    closeTo(commonEffects.totals.speedBonus, 0.05);
    closeTo(commonEffects.totals.criticalChance[0], 0.0114);
    const criticalHtml = api.weaponTooltipCriticalChance(hag20, commonEffects.totals).html;
    assert.match(criticalHtml, /18\.1%/);
    assert.doesNotMatch(criticalHtml, /-99\.4%/);
    assert.doesNotMatch(criticalHtml, /-99\.9%/);
    assert.equal((criticalHtml.match(/>X<\/span>/g) || []).length, 2);
  });

  await t.test("Modified Missile Loader는 LRM과 ATM의 volley를 stream fire로 표시한다", () => {
    const filterSpecs = [
      [["ClanLRM20", "ClanLRM20_Artemis"], 0.2, -4.35, -12],
      [["ClanLRM15", "ClanLRM15_Artemis"], 0.2833, -3.9667, -9],
      [["ClanLRM10", "ClanLRM10_Artemis"], 0.45, -3.5, -6],
      [["ClanLRM5", "ClanLRM5_Artemis"], 0.95, -2.5, -3],
      [["ClanATM12"], 0.1166, -4.8333, -4],
      [["ClanATM9"], 0.1722, -4.7778, -3],
      [["ClanATM6"], 0.2833, -3.666, -2],
      [["ClanATM3"], 0.641, -2.334, -1],
    ];
    const loader = {
      id: 9032,
      item_type: "module",
      name: "NagaHeroComputer",
      display_name: "Modified Missile Loader",
      ctype: "CTargetingComputerStats",
      stats: { slots: 1, tons: 1, health: 99999, amountAllowed: 0 },
      weapon_stat_filters: filterSpecs.map(([compatibleWeapons, delay, cooldown, reduction]) => ({
        tag: "MissileWeapons",
        compatible_weapons: compatibleWeapons,
        weapon_stats: [
          { operation: "+", volleydelay: delay },
          { operation: "+", cooldown },
          { operation: "+", numFiring: reduction },
          { operation: "+", ammoPerShot: reduction },
          { operation: "+", MinReactivationTime: 0.15 },
        ],
        ranges: [],
      })),
    };
    const rows = api.equipmentTooltipGroups(loader, 0, []).flat();
    assert.deepEqual(
      Array.from(rows.find(([label]) => label === "LRM / ATM VOLLEY")),
      ["LRM / ATM VOLLEY", "STREAM FIRE"],
    );
    assert.ok(!Array.from(rows, ([label]) => label).includes("SENSOR RANGE"));

    const cases = [
      ["ClanLRM20", 20, 1, 0.05, 4.6, 2, 8, 0.25, 0.25, 0],
      ["ClanLRM20_Artemis", 20, 1, 0.05, 4.6, 2, 8, 0.25, 0.25, 0],
      ["ClanLRM15", 15, 1, 0.05, 4.3, 2, 6, 0.3333, 0.3333, 1],
      ["ClanLRM15_Artemis", 15, 1, 0.05, 4.3, 2, 6, 0.3333, 0.3333, 1],
      ["ClanLRM10", 10, 1, 0.05, 4, 2, 4, 0.5, 0.5, 2],
      ["ClanLRM10_Artemis", 10, 1, 0.05, 4, 2, 4, 0.5, 0.5, 2],
      ["ClanLRM5", 5, 1, 0.05, 3.5, 2, 2, 1, 1, 3],
      ["ClanLRM5_Artemis", 5, 1, 0.05, 3.5, 2, 2, 1, 1, 3],
      ["ClanATM12", 12, 2, 0.05, 5, 1, 8, 0.1666, 0.1667, 4],
      ["ClanATM9", 9, 2, 0.05, 5, 1, 6, 0.2222, 0.2222, 5],
      ["ClanATM6", 6, 2, 0.05, 4, 1, 4, 0.3333, 0.334, 6],
      ["ClanATM3", 3, 2, 0.025, 3, 1, 2, 0.666, 0.666, 7],
    ];
    const items = cases.map(([
      name,
      rawShots,
      damage,
      rawDelay,
      rawCooldown,
      volleySize,
      finalShots,
      finalDelay,
      finalCooldown,
      filterIndex,
    ]) => ({
      item: weapon({
        name,
        hardpoint_type: "missile",
        stats: {
          ammoType: name.startsWith("ClanATM") ? "ClanATMAmmo" : "ClanLRMAmmo",
          ammoPerShot: rawShots,
          numFiring: rawShots,
          damage,
          volleydelay: rawDelay,
          cooldown: rawCooldown,
          volleysize: volleySize,
          projectileclass: "javelin",
        },
      }),
      rawShots,
      damage,
      finalShots,
      finalDelay,
      finalCooldown,
      volleySize,
      filterIndex,
    }));
    const unrelated = weapon({ name: "ClanSRM6", hardpoint_type: "missile" });
    const innerSphereLrm = weapon({ name: "LRM20", hardpoint_type: "missile" });
    items.forEach(({ item, rawShots, damage, finalShots, finalDelay, finalCooldown, volleySize, filterIndex }) => {
      const effects = api.collectTargetComputerWeaponEffects(item, [loader]);
      assert.equal(effects.sources[0].display_name, "Modified Missile Loader");
      assert.deepEqual(
        Array.from(effects.sources[0].effects, (effect) => [effect.label, effect.value_text]),
        [["FIRING MODE", "STREAM FIRE"]],
      );
      const effective = api.effectiveWeaponStats(item, [loader]);
      assert.equal(effective.numFiring, finalShots, item.name);
      assert.equal(effective.ammoPerShot, finalShots, item.name);
      closeTo(effective.volleydelay, finalDelay);
      closeTo(effective.cooldown, finalCooldown);
      closeTo(effective.minReactivationTime, 0.15);
      assert.deepEqual(Array.from(effective.matchedFilterIndexes), [filterIndex]);
      assert.deepEqual(
        Array.from(effective.contributions, (entry) => entry.field),
        ["volleydelay", "cooldown", "numFiring", "ammoPerShot", "minReactivationTime"],
      );
      assert.equal(api.weaponAmmoPerTrigger(item, [loader]), finalShots, item.name);
      closeTo(api.weaponDirectDamage(item, [loader]), damage * finalShots);
      closeTo(api.simulationWeaponTiming(item, [], [loader]).cooldown, finalCooldown);
      const firingProfile = api.effectiveWeaponFiringProfile(item, [loader]);
      closeTo(firingProfile.shotDelay, finalDelay);
      const eventCount = Math.ceil(finalShots / volleySize);
      assert.equal(api.weaponFiringEventCount(item, [loader]), eventCount, item.name);
      const expectedShots = eventCount <= 1
        ? `${finalShots}`
        : `${volleySize} X ${Math.floor(finalShots / volleySize)}`;
      assert.equal(firingProfile.displayShots, expectedShots, item.name);
      closeTo(api.weaponFiringTime(item, [loader]), Math.max(0, eventCount - 1) * finalDelay);
      const finalCycle = api.weaponExpectedCooldown(item, [], [loader])
        ?? api.simulationWeaponTiming(item, [], [loader]).cooldown;
      closeTo(finalCycle, Math.max(0, eventCount - 1) * finalDelay + finalCooldown);
      assert.equal(api.effectiveWeaponStats(item, []).numFiring, rawShots, item.name);
      assert.equal(api.weaponAmmoPerTrigger(item, []), rawShots, item.name);
      const tooltipRows = Object.fromEntries(api.equipmentTooltipGroups(item, 0, [], [loader]).flat());
      assert.match(tooltipRows.DAMAGE.html, /quirk-applied/, item.name);
      assert.equal(
        tooltipRows.SHOTS.html,
        `<span class="equipment-tooltip-final quirk-applied">${expectedShots}</span>`,
        item.name,
      );
      assert.equal(typeof tooltipRows.COOLDOWN, "object", item.name);
      assert.match(tooltipRows.COOLDOWN.final, / s$/, item.name);
      if (eventCount > 1) {
        assert.match(tooltipRows["SHOT INTERVAL"].html, /quirk-applied/, item.name);
      } else {
        assert.equal(tooltipRows["SHOT INTERVAL"], undefined, item.name);
      }
    });
    assert.equal(api.collectTargetComputerWeaponEffects(unrelated, [loader]).sources.length, 0);
    assert.equal(api.collectTargetComputerWeaponEffects(innerSphereLrm, [loader]).sources.length, 0);
    assert.equal(api.effectiveWeaponStats(unrelated, [loader]).matchedFilterIndexes.length, 0);
    assert.equal(api.effectiveWeaponStats(innerSphereLrm, [loader]).matchedFilterIndexes.length, 0);

    const orderedFilters = {
      ...loader,
      weapon_stat_filters: [
        loader.weapon_stat_filters[0],
        {
          tag: "MissileWeapons",
          compatible_weapons: ["ClanLRM20"],
          weapon_stats: [{ operation: "+", cooldown: 0.1 }],
          ranges: [],
        },
      ],
    };
    const lrm20 = items[0].item;
    const orderedSnapshot = api.effectiveWeaponStats(lrm20, [orderedFilters]);
    assert.deepEqual(Array.from(orderedSnapshot.matchedFilterIndexes), [0, 1]);
    closeTo(orderedSnapshot.cooldown, 0.35);
    assert.equal(orderedSnapshot.contributions.at(-1).filterIndex, 1);
    closeTo(
      api.simulationWeaponTiming(lrm20, [quirk("all_cooldown_multiplier", -0.1)], [loader]).cooldown,
      0.225,
    );

    const occurrenceLoader = {
      ...loader,
      weapon_stat_filters: [{
        tag: "MissileWeapons",
        compatible_weapons: ["ClanLRM20"],
        weapon_stats: [{ operation: "+", cooldown: 0.1 }],
        ranges: [],
      }],
    };
    const occurrenceSnapshot = api.effectiveWeaponStats(lrm20, [occurrenceLoader, occurrenceLoader]);
    closeTo(occurrenceSnapshot.cooldown, 4.8);
    assert.deepEqual(
      Array.from(occurrenceSnapshot.contributions, (entry) => entry.moduleOccurrence),
      [0, 1],
    );

    const canonicalLoader = {
      ...loader,
      weapon_stat_filters: [{
        ...loader.weapon_stat_filters[0],
        compatible_weapons: ["ClanLRM20"],
        weapon_stats: [{ operation: "+", MinReactivationTime: 0.15 }],
      }],
    };
    const sourceWithLegacyCase = weapon({
      name: "ClanLRM20",
      hardpoint_type: "missile",
      stats: { MinReactivationTIme: 0.05 },
    });
    closeTo(api.effectiveWeaponStats(sourceWithLegacyCase, [canonicalLoader]).minReactivationTime, 0.2);
  });

  await t.test("Artemis와 Railgun Capacitor는 실제 계산값을 장비 출처로 표시한다", () => {
    const artemis = {
      id: 3050,
      item_type: "upgrade",
      name: "Artemis",
      display_name: "ARTEMIS",
      stats: { extraSlots: 1, missileSpread: 0.7 },
    };
    const capacitor = {
      id: 9033,
      item_type: "module",
      name: "RailgunCapacitorClan",
      display_name: "RAILGUN CAPACITOR",
      faction: "Clan",
      stats: { amountAllowed: 2 },
      weapon_stat_filters: [{
        compatible_weapons: ["ClanRailGun"],
        weapon_stats: [{ operation: "+", damage: 8, heat: 4 }],
      }],
    };
    const artemisWeapon = weapon({
      id: 401,
      name: "LRM10_Artemis",
      hardpoint_type: "missile",
      stats: { spread: 2, artemisAmmoType: "LRMAmmoArtemis" },
    });
    resetEquipment({ 3050: artemis, 9033: capacitor });
    api.state.currentBuild.upgrades.artemis.Equipped = true;
    const artemisEffects = api.collectInstalledWeaponEquipmentEffects(artemisWeapon, []);
    assert.equal(artemisEffects.sources.length, 1);
    assert.equal(artemisEffects.sources[0].display_name, "ARTEMIS");
    assert.equal(artemisEffects.sources[0].effects[0].value_text, "-30%");
    assert.match(
      api.equipmentTooltipAppliedEffectsHtml(artemisWeapon, [], artemisEffects),
      /equipment-tooltip-equipment-effect quirk-tone-missile/,
    );

    api.state.currentBuild.upgrades.artemis.Equipped = false;
    assert.equal(api.collectInstalledWeaponEquipmentEffects(artemisWeapon, []).sources.length, 0);
    const builtInArtemis = weapon({
      name: "BuiltInArtemis",
      hardpoint_type: "missile",
      stats: { spread: 2, artemisAmmoType: "LRMAmmoArtemis", alwaysHasArtemis: 1 },
    });
    api.state.currentBuild.upgrades.artemis.Equipped = true;
    assert.equal(api.collectInstalledWeaponEquipmentEffects(builtInArtemis, []).sources.length, 0);

    const railgun = weapon({
      id: 402,
      name: "ClanRailGun",
      faction: "Clan",
      hardpoint_type: "ballistic",
      stats: { damage: 10, heat: 5 },
    });
    api.state.currentBuild.upgrades.artemis.Equipped = false;
    const railgunEffects = api.collectInstalledWeaponEquipmentEffects(railgun, []);
    assert.equal(railgunEffects.sources.length, 1);
    assert.equal(railgunEffects.sources[0].display_name, "RAILGUN CAPACITOR ×2");
    assert.deepEqual(
      Array.from(railgunEffects.sources[0].effects, (effect) => [effect.label, effect.value_text]),
      [["DAMAGE", "+16"], ["HEAT", "+8"]],
    );
    assert.equal(api.weaponDirectDamage(railgun), 26);
    assert.equal(api.itemHeat(railgun), 13);
    assert.match(
      api.equipmentTooltipAppliedEffectsHtml(railgun, [], railgunEffects),
      /APPLIED EFFECTS[\s\S]*RAILGUN CAPACITOR ×2[\s\S]*DAMAGE[\s\S]*HEAT/,
    );
    assert.match(
      api.equipmentTooltipAppliedEffectsHtml(railgun, [], railgunEffects),
      /equipment-tooltip-equipment-effect quirk-tone-ballistic/,
    );
  });

  await t.test("탄약과 장비는 실제 툴팁 수치를 바꾸는 효과만 표시한다", () => {
    const ammo = {
      item_type: "ammo",
      name: "Clan LRM Ammo",
      stats: { type: "ClanLRMAmmo", numShots: 120, tons: 0.5 },
    };
    const ammoEffects = api.collectEquipmentQuirkEffects(ammo, [
      quirk("ammocapacity_clrm_additive", 20),
      quirk("ammocapacity_csrm_additive", 20),
    ]);
    assert.deepEqual(
      Array.from(ammoEffects.applied, (entry) => entry.name),
      ["ammocapacity_clrm_additive"],
    );
    assert.equal(ammoEffects.applied[0].display_value_text, "+10");
    const halfTonHtml = api.equipmentTooltipAppliedEffectsHtml(ammo, [
      quirk("ammocapacity_clrm_additive", 20),
    ]);
    assert.match(halfTonHtml, />\+10<\/strong>/);
    assert.doesNotMatch(halfTonHtml, />\+20<\/strong>/);
    assert.equal(api.collectEquipmentQuirkEffects(ammo, [
      quirk("ammocapacity_clrm_additive", 0.5),
    ]).applied.length, 0);

    const artemisAmmo = {
      item_type: "ammo",
      name: "LRM Artemis Ammo",
      stats: { type: "LRMAmmoArtemis", numShots: 120, tons: 1 },
    };
    const artemisEffects = api.collectEquipmentQuirkEffects(artemisAmmo, [
        quirk("ammocapacity_lrm_artemis_additive", 18),
      ]);
    assert.deepEqual(
      Array.from(artemisEffects.applied, (entry) => entry.name),
      ["ammocapacity_lrm_artemis_additive"],
    );
    assert.equal(artemisEffects.applied[0].display_value_text, "+18");

    const heatSink = {
      item_type: "equipment",
      ctype: "CHeatSinkStats",
      stats: { heatbase: -0.85, cooling: 0.15, engineCooling: 0.18 },
    };
    const heatSinkEffects = api.collectEquipmentQuirkEffects(heatSink, [
      quirk("maxheat_multiplier", 0.1),
      quirk("heatdissipation_multiplier", 0.05),
    ]);
    assert.deepEqual(
      Array.from(heatSinkEffects.applied, (entry) => entry.name).sort(),
      ["heatdissipation_multiplier", "maxheat_multiplier"],
    );

    const jumpJet = {
      item_type: "jumpjet",
      stats: { duration: 5, boost_instant: 200 },
    };
    const jumpJetEffects = api.collectEquipmentQuirkEffects(jumpJet, [
      quirk("jumpjets_burntime_multiplier", 0.1),
      quirk("jumpjets_initialthrust_multiplier", 0.2),
      quirk("jumpjetslots_additive", 1),
    ]);
    assert.deepEqual(
      Array.from(jumpJetEffects.applied, (entry) => entry.name).sort(),
      ["jumpjets_burntime_multiplier", "jumpjets_initialthrust_multiplier"],
    );

    const ecm = {
      item_type: "equipment",
      ctype: "CGECMStats",
      stats: { range: 90 },
    };
    const ecmEffects = api.collectEquipmentQuirkEffects(ecm, [
      quirk("ecmtargetrangereduction_multiplier", 0.2),
      quirk("stealtharmorcooldown_multiplier", -0.1),
      quirk("sensorrange_multiplier", 0.1),
    ]);
    assert.deepEqual(
      Array.from(ecmEffects.applied, (entry) => entry.name).sort(),
      ["ecmtargetrangereduction_multiplier", "stealtharmorcooldown_multiplier"],
    );
    const ecmHtml = api.equipmentTooltipAppliedEffectsHtml(ecm, ecmEffects.applied);
    assert.match(ecmHtml, /ecmtargetrangereduction_multiplier/i);
    assert.match(ecmHtml, /stealtharmorcooldown_multiplier/i);
  });

  await t.test("엔진과 MASC는 현재 툴팁의 기동 효과만 표시한다", () => {
    const previousMech = api.state.selectedMech;
    const previousBuild = api.state.currentBuild;
    const previousEquipment = api.state.equipment;
    const engine = { id: 3210, item_type: "engine", stats: { rating: 250 } };
    try {
      api.state.selectedMech = {
        faction: "InnerSphere",
        definition: {
          stats: { MaxTons: 50, MinEngineRating: 100, MaxEngineRating: 300 },
          movement: {
            MaxMovementSpeed: 16.2,
            AccelLerpMidRate: 20,
            DecelLerpMidRate: 1000,
            TurnLerpMidRate: 1,
          },
        },
      };
      api.state.equipment = { items: { "3210": engine } };
      api.state.currentBuild = {
        components: { centre_torso: { items: [{ item_id: 3210 }] } },
      };
      assert.deepEqual(
        Array.from(api.collectEquipmentQuirkEffects(engine, [
          quirk("mechtopspeed_multiplier", 0.1),
          quirk("reversespeed_multiplier", 0.2),
        ]).applied, (entry) => entry.name),
        ["mechtopspeed_multiplier"],
      );

      const masc = {
        item_type: "masc",
        stats: { BoostSpeed: 0.2, BoostAccel: 1, BoostDecel: 1, BoostTurn: 0.5 },
      };
      const mascEffects = api.collectEquipmentQuirkEffects(masc, [
        quirk("mechtopspeed_multiplier", 0.1),
        quirk("accellerp_all_multiplier", 0.2),
        quirk("decellerp_all_multiplier", 0.3),
        quirk("turnlerp_all_multiplier", 0.4),
        quirk("torso_yawspeed_multiplier", 0.5),
      ]);
      assert.deepEqual(
        Array.from(mascEffects.applied, (entry) => entry.name).sort(),
        [
          "accellerp_all_multiplier",
          "decellerp_all_multiplier",
          "mechtopspeed_multiplier",
          "turnlerp_all_multiplier",
        ],
      );
    } finally {
      api.state.selectedMech = previousMech;
      api.state.currentBuild = previousBuild;
      api.state.equipment = previousEquipment;
    }
  });

  await t.test("무기별·계열·전체 쿨다운/듀레이션을 합산한다", () => {
    const item = weapon({ name: "ER_Large_Laser", aliases: "ERLL" });
    const quirks = [
      quirk("all_cooldown_multiplier", -0.1),
      quirk("energy_cooldown_multiplier", -0.1),
      quirk("er_large_laser_cooldown_multiplier", -0.05),
      quirk("all_duration_multiplier", -0.1),
      quirk("energy_duration_multiplier", 0.2),
    ];
    const timing = api.simulationWeaponTiming(item, quirks);
    assert.equal(timing.cooldown, 1.5);
    assert.equal(timing.duration, 0);
    assert.equal(timing.cycle, 1.5);
  });

  await t.test("로켓런처 쿨다운은 스킬·쿼크 감소를 적용하지 않는다", () => {
    const item = weapon({
      name: "RocketLauncher10",
      aliases: "Missile,RocketLauncher,RocketLauncher10",
      hardpoint_type: "missile",
      stats: { cooldown: 0.125 },
    });
    const timing = api.simulationWeaponTiming(item, [
      quirk("all_cooldown_multiplier", -0.1),
      quirk("missile_cooldown_multiplier", -0.2),
      quirk("rocketlauncher10_cooldown_multiplier", -0.3),
    ]);
    assert.equal(timing.cooldown, 0.125);
    assert.equal(timing.cycle, 0.125);
  });

  await t.test("ROF 무기는 증가 쿼크를 초당 발사 횟수에 적용한다", () => {
    const item = weapon({ name: "MachineGun", stats: { damage: 1, rof: 5 } });
    const timing = api.simulationWeaponTiming(item, [quirk("machinegun_rof_multiplier", 0.2)]);
    closeTo(timing.cycle, 1 / 6);
    const rate = api.weaponDamagePerSecond(item, [quirk("machinegun_rof_multiplier", 0.2)]);
    assert.equal(rate.base, 5);
    assert.equal(rate.final, 6);
  });

  await t.test("연속형 무기는 데미지와 발열을 초당값으로 사용한다", () => {
    resetEquipment();
    const rac = weapon({
      name: "RotaryAutoCannon5",
      aliases: "Ballistic,RotaryAutoCannon,RotaryAutoCannon5",
      stats: { damage: 1.1, numFiring: 1, heat: 3.25, rof: 10 },
    });
    const rows = Object.fromEntries(api.weaponTooltipStatistics(rac, []));
    assert.equal(rows.DPS, "11");
    assert.equal(rows.DPH, "3.38");
    assert.equal(rows.HPS, "3.25");
    assert.equal(api.simulationWeaponHeatPerSecond({ item: rac, heat: 3.25, cycle: 0.1 }), 3.25);
    const racTooltip = Object.fromEntries(api.equipmentTooltipGroups(rac, 0).flat());
    assert.equal(racTooltip.DAMAGE, "11/s");
    assert.equal(racTooltip.HEAT, "3.25/s");

    const beam = weapon({
      name: "ClanBeamLaser",
      aliases: "Energy,Laser,ClanBeamLaser",
      stats: { damage: 5.5, numFiring: 1, heat: 3, duration: -1, cooldown: 0 },
    });
    const beamRows = Object.fromEntries(api.weaponTooltipStatistics(beam, []));
    assert.equal(beamRows.DPS, "5.5");
    assert.equal(beamRows.DPH, "1.83");
    assert.equal(beamRows.HPS, "3");
    assert.equal(api.simulationWeaponHeatPerSecond({ item: beam, heat: 3, cycle: 1 }), 3);
    const beamTooltip = Object.fromEntries(api.equipmentTooltipGroups(beam, 0).flat());
    assert.equal(beamTooltip.DAMAGE, "5.5/s");
    assert.equal(beamTooltip.HEAT, "3/s");

    const flamer = weapon({
      name: "Flamer",
      aliases: "Energy,Flamer,ISFlamer",
      stats: { damage: 0.1, numFiring: 1, heat: 1, duration: -1, cooldown: 0 },
    });
    const flamerRows = Object.fromEntries(api.weaponTooltipStatistics(flamer, []));
    assert.equal(flamerRows.DPS, "0.1");
    assert.equal(flamerRows.DPH, "0.1");
    assert.equal(flamerRows.HPS, "1");
    assert.equal(api.simulationWeaponHeatPerSecond({ item: flamer, heat: 1, cycle: 1 }), 1);
    const flamerTooltip = Object.fromEntries(api.equipmentTooltipGroups(flamer, 0).flat());
    assert.equal(flamerTooltip.DAMAGE, "0.1/s");
    assert.equal(flamerTooltip.HEAT, "1/s");

    const machineGun = weapon({
      name: "MachineGun",
      aliases: "Ballistic,MachineGun,ISMachineGun",
      stats: { damage: 0.1, numFiring: 1, heat: 0, rof: 10, duration: -1, cooldown: 0 },
    });
    const machineGunTooltip = Object.fromEntries(api.equipmentTooltipGroups(machineGun, 0).flat());
    assert.equal(machineGunTooltip.DAMAGE, "1/s");
    assert.equal(machineGunTooltip.HEAT, "0/s");

    const equipmentData = JSON.parse(fs.readFileSync(
      path.join(__dirname, "..", "public", "data", "equipment.json"),
      "utf8",
    ));
    const machineGuns = equipmentData.families.weapons
      .map((id) => equipmentData.items[id])
      .filter((item) => String(item.aliases || "").split(",").some((alias) => (
        alias === "MachineGun" || alias.endsWith("MachineGun")
      )));
    assert.equal(machineGuns.length > 0, true);
    assert.equal(machineGuns.every((item) => item.stats.heat === 0), true);
    assert.equal(machineGuns.every(api.isContinuousPerSecondWeapon), true);
    assert.equal(machineGuns.every((item) => (
      api.simulationWeaponHeatPerSecond({ item, heat: item.stats.heat, cycle: 0.1 }) === 0
    )), true);
  });

  await t.test("발사 이벤트와 발사 시간은 volley size로 묶는다", () => {
    const item = weapon({ hardpoint_type: "missile", stats: { numFiring: 10, volleysize: 4, volleydelay: 0.1 } });
    assert.equal(api.weaponVolleySize(item), 4);
    assert.equal(api.weaponFiringEventCount(item), 3);
    closeTo(api.weaponFiringTime(item), 0.2);
  });

  await t.test("SHOTS는 이벤트당 발사체 수와 이벤트 횟수 및 나머지를 표시한다", () => {
    const cases = [
      ["ClanLRM20", "missile", { numFiring: 20, volleysize: 2, volleydelay: 0.05, projectileclass: "javelin" }, "2 X 10"],
      ["ClanLRM5", "missile", { numFiring: 5, volleysize: 2, volleydelay: 0.05, projectileclass: "javelin" }, "2 X 2 + 1"],
      ["ClanLRM15", "missile", { numFiring: 15, volleysize: 2, volleydelay: 0.05, projectileclass: "javelin" }, "2 X 7 + 1"],
      ["ClanSRM6", "missile", { numFiring: 6, volleydelay: 0, projectileclass: "waypointrocket" }, "6"],
      ["ClanLBXAutoCannon20", "ballistic", { numFiring: 1, numPerShot: 20, volleydelay: 0, projectileclass: "bullet" }, "20"],
      ["ClanProtoAutocannon8", "ballistic", { numFiring: 2, volleydelay: 0.11, projectileclass: "bullet" }, "1 X 2"],
      ["GroupedPellets", "missile", { numFiring: 5, numPerShot: 3, volleysize: 2, volleydelay: 0.1 }, "6 X 2 + 3"],
    ];
    cases.forEach(([name, hardpointType, stats, expected]) => {
      const item = weapon({ name, hardpoint_type: hardpointType, stats });
      const profile = api.effectiveWeaponFiringProfile(item, []);
      assert.equal(profile.displayShots, expected, name);
      assert.equal(
        Object.fromEntries(api.equipmentTooltipGroups(item, 0, [], []).flat()).SHOTS,
        expected,
        name,
      );
    });

    const partialOnly = weapon({
      name: "PartialVolley",
      hardpoint_type: "missile",
      stats: { numFiring: 1, volleysize: 2, volleydelay: 0.1, projectileclass: "javelin" },
    });
    const partialProfile = api.effectiveWeaponFiringProfile(partialOnly, []);
    assert.equal(partialProfile.displayShots, "1");
    assert.equal(partialProfile.eventCount, 1);
    assert.equal(
      Object.fromEntries(api.equipmentTooltipGroups(partialOnly, 0, [], []).flat()).SHOTS,
      undefined,
    );
  });

  await t.test("IS·Clan SSRM 2/4/6은 전탄 동시 발사로 딜레이가 없다", () => {
    for (const faction of ["InnerSphere", "Clan"]) {
      for (const shots of [2, 4, 6]) {
        const item = weapon({
          name: faction === "Clan" ? `ClanStreakSRM${shots}` : `StreakSRM${shots}`,
          aliases: `Missile,Missile${shots},StreakSRM,StreakSRM${shots}`,
          faction,
          hardpoint_type: "missile",
          stats: { numFiring: shots, volleydelay: 0.25, cooldown: 3 },
        });
        assert.equal(api.isStreakSrm(item), true);
        assert.equal(api.weaponVolleySize(item), shots);
        assert.equal(api.weaponFiringEventCount(item), 1);
        assert.equal(api.weaponFiringTime(item), 0);
        assert.equal(api.weaponExpectedCooldown(item), null);
        assert.equal(api.effectiveWeaponFiringProfile(item, []).displayShots, `${shots}`);
      }
    }
  });

  await t.test("기대 쿨다운은 충전·연속발사·듀레이션·쿨다운을 모두 더한다", () => {
    const item = weapon({ stats: {
      chargeTime: 1,
      numFiring: 3,
      volleydelay: 0.1,
      duration: 0.5,
      cooldown: 2,
    } });
    closeTo(api.weaponExpectedCooldown(item), 3.7);
  });

  await t.test("발열과 사거리 보너스는 전체·계열·무기별 쿼크를 합산한다", () => {
    const item = weapon({ name: "PPC", stats: { heat: 10 } });
    const quirks = [
      quirk("all_heat_multiplier", -0.1),
      quirk("energy_heat_multiplier", -0.2),
      quirk("ppc_heat_multiplier", -0.1),
      quirk("all_range_multiplier", 0.1),
      quirk("energy_range_multiplier", 0.2),
      quirk("ppc_range_multiplier", 0.1),
    ];
    resetEquipment();
    assert.equal(api.simulationWeaponHeat(item, quirks), 6);
    closeTo(api.simulationWeaponRangeBonus(item, quirks), 0.4);
  });

  await t.test("spread의 유해한 양수 쿼크도 부호를 보존한다", () => {
    const item = weapon({ name: "Laser", stats: { spread: 2 } });
    resetEquipment();
    const result = api.weaponSpreadValues(item, [quirk("energy_spread_multiplier", 0.25)]);
    assert.equal(result.modifier, 0.25);
    assert.equal(result.final, 2.5);
  });

  await t.test("LOS 퍼짐 원본이 있는 무기만 SPREAD DIRECT를 별도 표시한다", () => {
    resetEquipment();
    const quirks = [quirk("missile_spread_multiplier", -0.1)];
    const lrm = weapon({
      name: "LRM20",
      display_name: "LRM 20",
      hardpoint_type: "missile",
      stats: {
        spread: 5.7,
        spreadLOS: 4.7,
        speed: 175,
        artemisAmmoType: "LRMAmmoArtemis",
      },
    });
    const directSpread = api.weaponSpreadValues(lrm, quirks, [], "spreadLOS");
    assert.equal(directSpread.base, 4.7);
    closeTo(directSpread.final, 4.23);
    assert.equal(api.isLosWeapon(lrm), true);
    assert.equal(api.hasLrmDirectVelocity(lrm), true);
    closeTo(api.weaponDirectVelocity(lrm), 245);

    const lrmGroups = api.equipmentTooltipGroups(lrm, 0, quirks, []);
    const lrmRows = lrmGroups.flat();
    assert.deepEqual(
      Array.from(lrmRows, ([label]) => label).filter((label) => label.startsWith("SPREAD")),
      ["SPREAD", "SPREAD DIRECT"],
    );
    const spreadGroupIndex = lrmGroups.findIndex((group) => (
      group.some(([label]) => label === "SPREAD")
    ));
    assert.ok(spreadGroupIndex >= 0);
    assert.deepEqual(
      Array.from(lrmGroups[spreadGroupIndex], ([label]) => label),
      ["SPREAD"],
    );
    assert.deepEqual(
      Array.from(lrmGroups[spreadGroupIndex + 1], ([label]) => label),
      ["SPREAD DIRECT", "VELOCITY DIRECT"],
    );

    const atm = weapon({
      name: "ClanATM12",
      display_name: "C-ATM 12",
      hardpoint_type: "missile",
      stats: { spread: 6.05, spreadLOS: 4.8, speed: 242 },
    });
    assert.equal(api.isLosWeapon(atm), true);
    assert.equal(api.hasLrmDirectVelocity(atm), false);
    assert.equal(api.weaponDirectVelocity(atm), null);
    const atmDirectLabels = api.equipmentTooltipGroups(atm, 0, quirks, [])
      .find((group) => group.some(([label]) => label === "SPREAD DIRECT"))
      .map(([label]) => label);
    assert.deepEqual(Array.from(atmDirectLabels), ["SPREAD DIRECT"]);

    const losTable = api.renderEquipmentInfoWeapons([lrm, atm]);
    assert.match(losTable, /data-equipment-info-table="special-los"/);
    assert.match(losTable, /Spread Direct/);
    assert.match(losTable, /Velocity Direct/);
    assert.match(losTable, />245m\/s</);

    const ordinary = weapon({ name: "SRM6", hardpoint_type: "missile", stats: { spread: 3 } });
    const ordinaryLabels = api.equipmentTooltipGroups(ordinary, 0, quirks, [])
      .flat()
      .map(([label]) => label);
    assert.ok(ordinaryLabels.includes("SPREAD"));
    assert.ok(!ordinaryLabels.includes("SPREAD DIRECT"));
    assert.ok(!ordinaryLabels.includes("VELOCITY DIRECT"));
  });

  await t.test("무장 정보 탄약 표는 1톤 일반탄만 분류하고 최경량 무기 총 피해를 표시한다", () => {
    const lrm5 = weapon({
      id: 501,
      name: "LRM5",
      display_name: "LRM 5",
      hardpoint_type: "missile",
      stats: {
        tons: 2,
        damage: 1,
        numFiring: 5,
        ammoPerShot: 5,
        ammoType: "LRMAmmo",
        artemisAmmoType: "LRMAmmoArtemis",
      },
    });
    const lrm10 = weapon({
      id: 502,
      name: "LRM10",
      display_name: "LRM 10",
      hardpoint_type: "missile",
      stats: {
        tons: 5,
        damage: 1,
        numFiring: 10,
        ammoPerShot: 10,
        ammoType: "LRMAmmo",
        artemisAmmoType: "LRMAmmoArtemis",
      },
    });
    const artemisLrm5 = weapon({
      id: 503,
      name: "LRM5_Artemis",
      display_name: "LRM 5 + ARTEMIS",
      hardpoint_type: "missile",
      stats: {
        tons: 2,
        damage: 1,
        numFiring: 5,
        ammoPerShot: 5,
        ammoType: "LRMAmmo",
        artemisAmmoType: "LRMAmmoArtemis",
      },
    });
    const full = {
      id: 601,
      item_type: "ammo",
      name: "LRMAmmo",
      display_name: "LRM AMMO",
      faction: "InnerSphere",
      stats: { type: "LRMAmmo", tons: 1, numShots: 240, health: 10, internalDamage: 1 },
    };
    const half = {
      id: 602,
      item_type: "ammo",
      name: "LRMAmmoHalf",
      display_name: "LRM AMMO (1/2)",
      faction: "InnerSphere",
      stats: { type: "LRMAmmo", tons: 0.5, numShots: 120, health: 10, internalDamage: 1 },
    };
    const artemis = {
      id: 603,
      item_type: "ammo",
      name: "LRMAmmoArtemis",
      display_name: "LRM AMMO + ARTEMIS IV",
      faction: "InnerSphere",
      stats: { type: "LRMAmmoArtemis", tons: 1, numShots: 240, health: 10, internalDamage: 1 },
    };
    const items = { 501: lrm5, 502: lrm10, 503: artemisLrm5, 601: full, 602: half, 603: artemis };
    resetEquipment(items);

    assert.equal(api.equipmentInfoWeaponAmmoType(lrm5), "LRMAmmo");
    assert.equal(api.equipmentInfoWeaponAmmoType(artemisLrm5), "LRMAmmoArtemis");
    assert.equal(api.isEquipmentInfoArtemisAmmo(artemis), true);
    assert.equal(api.equipmentInfoAmmoCategory(full, [lrm10, artemisLrm5, lrm5]), "missile");
    assert.equal(api.equipmentInfoWeaponAmmoType(weapon({
      name: "ClanATM3",
      stats: { ammoType: "ClanATMAmmo", artemisAmmoType: "UnusedArtemisAmmo", alwaysHasArtemis: 1 },
    })), "ClanATMAmmo");
    assert.deepEqual(Array.from(api.equipmentInfoAmmoWeapons(full, [lrm10, artemisLrm5, lrm5]), (item) => item.id), [501, 502]);
    assert.deepEqual(Array.from(api.equipmentInfoAmmoWeapons(artemis, [lrm10, artemisLrm5, lrm5]), (item) => item.id), [503]);
    assert.equal(api.equipmentInfoAmmoFireCount(full, lrm5), 48);
    assert.equal(api.equipmentInfoAmmoFireCount(full, lrm10), 24);
    assert.equal(api.equipmentInfoAmmoTotalDamage(full, [lrm10, lrm5]), 240);
    assert.equal(api.equipmentInfoAmmoTotalDamage(half, [lrm10, lrm5]), 120);

    const clanAc20Ammo = {
      item_type: "ammo",
      name: "ClanAC20Ammo",
      stats: { type: "ClanAC20Ammo", tons: 1, numShots: 36, health: 10, internalDamage: 5 },
    };
    const clanAc20 = weapon({
      id: 1241,
      name: "ClanAutoCannon20",
      display_name: "C-AC/20",
      hardpoint_type: "ballistic",
      stats: { tons: 12, damage: 6.6666, numFiring: 3, ammoPerShot: 1, ammoType: "ClanAC20Ammo" },
    });
    const nobleAc20 = weapon({
      id: 1264,
      name: "NobleAutoCannon20",
      display_name: "AC/20",
      hardpoint_type: "ballistic",
      stats: { tons: 14, damage: 20, numFiring: 1, ammoPerShot: 1, ammoType: "ClanAC20Ammo" },
    });
    assert.equal(api.equipmentInfoAmmoWeapons(clanAc20Ammo, [nobleAc20, clanAc20])[0].id, 1241);
    assert.equal(api.equipmentInfoAmmoCategory(clanAc20Ammo, [nobleAc20, clanAc20]), "ballistic");
    closeTo(api.equipmentInfoAmmoWeaponTotalDamage(clanAc20Ammo, clanAc20), 239.9976);
    assert.equal(api.equipmentInfoAmmoWeaponTotalDamage(clanAc20Ammo, nobleAc20), 720);
    closeTo(api.equipmentInfoAmmoTotalDamage(clanAc20Ammo, [nobleAc20, clanAc20]), 239.9976);
    const hagAmmo = {
      item_type: "ammo",
      name: "ClanHyperAssaultGauss40Ammo",
      stats: { type: "ClanHyperAssaultGauss40Ammo", tons: 1, numShots: 48, health: 10, internalDamage: 0 },
    };
    const hag20 = weapon({
      id: 1255,
      name: "ClanHyperAssaultGaussRifle20",
      display_name: "C-H.A. GAUSS 20",
      hardpoint_type: "ballistic",
      stats: {
        tons: 10,
        damage: 4,
        numFiring: 4,
        ammoPerShot: 1,
        splashPercent: 0.125,
        ammoType: "ClanHyperAssaultGauss40Ammo",
      },
    });
    assert.deepEqual(
      Object.fromEntries(Object.entries(api.equipmentInfoAmmoWeaponDamageParts(hagAmmo, hag20))),
      { direct: 192, splash: 48, total: 240 },
    );
    assert.equal(
      api.equipmentInfoAmmoDamageHtml(hagAmmo, hag20),
      '192 <span class="equipment-info-splash">+ 48</span>',
    );
    const halfClanAc10Ammo = {
      item_type: "ammo",
      name: "ClanAC10AmmoHalf",
      stats: { type: "ClanAC10Ammo", tons: 0.5, numShots: 23, health: 10, internalDamage: 3.75 },
    };
    const clanAc10 = weapon({
      id: 1239,
      name: "ClanAutoCannon10",
      display_name: "C-AC/10",
      hardpoint_type: "ballistic",
      stats: { tons: 10, damage: 5, numFiring: 2, ammoPerShot: 1, ammoType: "ClanAC10Ammo" },
    });
    assert.equal(api.equipmentInfoAmmoFireCount(halfClanAc10Ammo, clanAc10), 11);
    assert.equal(api.equipmentInfoAmmoTotalDamage(halfClanAc10Ammo, [clanAc10]), 115);

    const row = api.equipmentInfoAmmoRow(half, 1, [lrm10, lrm5]);
    assert.equal(row.cells.ammoCount, "120");
    assert.equal(row.cells.health, "10");
    assert.equal(row.cells.totalDamage, "120");
    assert.equal(row.cells.internalDamage, "1 x 120");
    assert.equal(api.equipmentInfoAmmoInternalDamageText({
      stats: { internalDamage: 2.15, numShots: 150 },
    }), "2.15 x 150");
    assert.equal(api.equipmentInfoAmmoInternalDamageText({
      stats: { internalDamage: 0, numShots: 48 },
    }), "-");

    const sharedRows = api.equipmentInfoSharedAmmoRows([full, half, artemis], [lrm10, artemisLrm5, lrm5]);
    assert.equal(sharedRows.length, 2);
    assert.deepEqual(Array.from(sharedRows, (sharedRow) => sharedRow.cells.weaponName), ["LRM 5", "LRM 10"]);
    assert.deepEqual(Array.from(sharedRows, (sharedRow) => sharedRow.cells.fireCount), ["48", "24"]);
    assert.deepEqual(Array.from(sharedRows, (sharedRow) => sharedRow.cells.totalDamage), ["240", "240"]);
    const sharedGroups = api.equipmentInfoSharedAmmoGroups([full, half, artemis], [lrm10, artemisLrm5, lrm5]);
    assert.equal(sharedGroups.length, 1);
    assert.equal(api.equipmentInfoSharedAmmoLabel(sharedGroups[0].ammo), "LRM");

    const html = api.renderEquipmentInfoAmmo(Object.values(items));
    assert.match(html, /All Ammo/);
    assert.match(html, /Missile Ammo/);
    assert.match(html, /Ballistic Ammo/);
    assert.match(html, /equipment-info-ammo-missile equipment-info-missile/);
    assert.match(html, /equipment-info-ammo-ballistic equipment-info-ballistic/);
    assert.match(html, /LRM Shared Ammo/);
    assert.doesNotMatch(html, /LRM AMMO \(1\/2\)/);
    assert.doesNotMatch(html, /LRM AMMO \+ ARTEMIS IV/);
    assert.doesNotMatch(html, />Tons</);
    assert.doesNotMatch(html, />Faction</);
    assert.match(html, /Internal Damage/);
    assert.ok(html.indexOf("Total Damage") < html.indexOf("Ammo Count"));
  });

  await t.test("사거리 프로필은 최소사거리를 고정하고 이후 구간만 늘린다", () => {
    const item = weapon({ ranges: [
      { start: 0, damageModifier: 0 },
      { start: 90, damageModifier: 1 },
      { start: 450, damageModifier: 1 },
      { start: 900, damageModifier: 0, interpolationToNextRange: "linear" },
    ] });
    const profile = api.simulationWeaponRangeProfile(item, 0.1, 0.1);
    assert.equal(profile.minimumRange, 90);
    closeTo(profile.optimalRange, 540);
    closeTo(profile.maximumRange, 1080);
    assert.equal(profile.ranges[1].start, 90);
  });

  await t.test("선형·step·지수 감쇠와 범위 밖 피해를 처리한다", () => {
    resetEquipment();
    const base = weapon();
    const linear = {
      item: base,
      rangeProfile: {
        minimumRange: 0,
        optimalRange: 100,
        maximumRange: 200,
        ranges: [
          { start: 100, modifier: 1, interpolation: "linear", exponent: 1 },
          { start: 200, modifier: 0, interpolation: "linear", exponent: 1 },
        ],
      },
    };
    closeTo(api.simulationWeaponDamageMultiplier(linear, 150), 0.5);
    assert.equal(api.simulationWeaponDamageMultiplier(linear, 201), 0);
    linear.rangeProfile.ranges[0].interpolation = "step";
    assert.equal(api.simulationWeaponDamageMultiplier(linear, 150), 1);
    linear.rangeProfile.ranges[0].interpolation = "exponential";
    linear.rangeProfile.ranges[0].exponent = 2;
    closeTo(api.simulationWeaponDamageMultiplier(linear, 150), 0.75);

    const clanLrmItem = weapon({ name: "ClanLRM20", ranges: [
      { start: 0, damageModifier: 0, interpolationToNextRange: "exponential", exponent: 2 },
      { start: 180, damageModifier: 1, interpolationToNextRange: "linear" },
      { start: 900, damageModifier: 1, interpolationToNextRange: "linear" },
    ] });
    const clanLrm = {
      item: clanLrmItem,
      rangeProfile: api.simulationWeaponRangeProfile(clanLrmItem, 0, 0),
    };
    closeTo(api.simulationWeaponDamageMultiplier(clanLrm, 90), 0.25);
    assert.equal(api.simulationWeaponDamageMultiplier(clanLrm, 180), 1);

    const innerSphereLrmItem = weapon({ name: "LRM20", ranges: [
      { start: 0, damageModifier: 0, interpolationToNextRange: "step" },
      { start: 180, damageModifier: 1, interpolationToNextRange: "linear" },
      { start: 900, damageModifier: 1, interpolationToNextRange: "linear" },
    ] });
    const innerSphereLrm = {
      item: innerSphereLrmItem,
      rangeProfile: api.simulationWeaponRangeProfile(innerSphereLrmItem, 0, 0),
    };
    assert.equal(api.simulationWeaponDamageMultiplier(innerSphereLrm, 90), 0);
  });

  await t.test("ATM은 거리대별 1.25/1/0.8 배율과 경계를 적용한다", () => {
    const item = weapon({ name: "Clan_ATM" });
    const profile = { rangeMultiplier: 1.1 };
    const wrapped = { item, rangeProfile: profile };
    assert.equal(api.simulationWeaponDamageMultiplier(wrapped, 59), 0);
    assert.equal(api.simulationWeaponDamageMultiplier(wrapped, 100), 1.25);
    assert.equal(api.simulationWeaponDamageMultiplier(wrapped, 500), 1);
    assert.equal(api.simulationWeaponDamageMultiplier(wrapped, 900), 0.8);
    assert.equal(api.simulationWeaponDamageMultiplier(wrapped, 1211), 0);
    const bands = api.atmTooltipDamageBands(item, 0.1);
    assert.equal(bands[0].start, 60);
    assert.equal(bands[2].end, 1210);
  });

  await t.test("UAC 재밍은 확률과 지속시간 감소를 각각 적용한다", () => {
    const item = weapon({ name: "UltraAutoCannon5", stats: { JammingChance: 0.2, JammedTime: 5 } });
    const result = api.ultraAutoCannonJamStats(item, [
      quirk("all_jamchance_multiplier", -0.25),
      quirk("ultraautocannon5_jamchance_multiplier", -0.25),
      quirk("all_jamduration_multiplier", -0.2),
    ]);
    assert.equal(result.chance, 0.1);
    assert.equal(result.duration, 4);
  });

  await t.test("UAC 예상 쿨다운은 더블탭 기대 발사 수를 반영한다", () => {
    const item = weapon({
      name: "UltraAutoCannon5",
      aliases: "Ballistic,UltraAutoCannon,UltraAutoCannon5",
      stats: {
        damage: 5,
        numFiring: 1,
        cooldown: 1,
        volleydelay: 0.2,
        JammingChance: 0.2,
        JammedTime: 5,
        ShotsDuringCooldown: 1,
      },
    });
    const firingTime = 0;
    const expectedCycle = (
      firingTime
      + 0.8 * 1
      + 0.2 * Math.max(1, 5)
    ) / (2 - 0.2);
    closeTo(api.weaponExpectedCooldown(item), expectedCycle);
  });

  await t.test("AMS additive와 ROF 피해율의 총 스플래시 배율을 계산한다", () => {
    resetEquipment();
    const ams = weapon({ name: "LaserAntiMissileSystem", ctype: "WeaponAMS", stats: { damage: 3 } });
    const amsRate = api.amsDamagePerSecond(ams, [
      quirk("laserantimissilesystem_damage_additive", 2),
    ]);
    assert.equal(amsRate.base, 3);
    assert.equal(amsRate.final, 5);

    const machineGun = weapon({ name: "MachineGun", stats: { damage: 2, rof: 4, splashPercent: 0.25 } });
    const totalRate = api.weaponTotalDamageRate(
      machineGun,
      [quirk("machinegun_rof_multiplier", 0.25)],
    );
    assert.equal(totalRate.base, 12);
    assert.equal(totalRate.final, 15);
  });

  await t.test("시뮬레이션 피해 래퍼는 거리 배율·발사 수·스플래시 옵션을 반영한다", () => {
    const wrapped = {
      item: weapon(),
      directDamage: 10,
      damage: 14,
      directDamagePerSecond: 5,
      damagePerSecond: 7,
      rangeProfile: null,
    };
    api.state.simulation.applySplashDamage = true;
    assert.equal(api.simulationWeaponDamage(wrapped, 3), 42);
    assert.equal(api.simulationWeaponDamagePerSecond(wrapped), 7);
    api.state.simulation.applySplashDamage = false;
    assert.equal(api.simulationWeaponDamage(wrapped, 3), 30);
    assert.equal(api.simulationWeaponDamagePerSecond(wrapped), 5);
  });

  await t.test("무장 상세 빈도는 0% 미사용, 50% 쿨타임 2배, 100% 원래 쿨타임으로 계산한다", () => {
    assert.equal(api.state.weaponDetail.rangeCombinationDps, false);
    assert.equal(api.weaponDetailFrequencyRatio(0), 0);
    assert.equal(api.weaponDetailFrequencyRatio(50), 0.5);
    assert.equal(api.weaponDetailFrequencyRatio(100), 1);
    assert.equal(api.weaponDetailAdjustedRate(12, 0), 0);
    assert.equal(api.weaponDetailAdjustedRate(12, 50), 6);
    assert.equal(api.weaponDetailAdjustedRate(12, 100), 12);
    assert.equal(api.weaponDetailEffectiveCooldown(3, 0), null);
    assert.equal(api.weaponDetailEffectiveCooldown(3, 50), 6);
    assert.equal(api.weaponDetailEffectiveCooldown(3, 100), 3);
  });

  await t.test("무장별·사거리 타입 ON/OFF는 저장한 발사 빈도와 독립적으로 계산을 제외한다", () => {
    const toggledWeapon = {
      key: "toggle-test",
      item: weapon({ ranges: [
        { start: 0, damageModifier: 1 },
        { start: 200, damageModifier: 1 },
      ] }),
      rangeProfile: { maximumRange: 400 },
    };
    api.state.weaponDetail.frequencyByWeaponKey.set(toggledWeapon.key, 75);
    assert.equal(api.weaponDetailWeaponEnabled(toggledWeapon.key), true);
    assert.equal(api.weaponDetailRangeTypeEnabled(toggledWeapon.item), true);
    assert.equal(api.weaponDetailEffectiveFrequency(toggledWeapon, 100), 75);

    api.state.weaponDetail.enabledByWeaponKey.set(toggledWeapon.key, false);
    assert.equal(api.weaponDetailEffectiveFrequency(toggledWeapon, 100), 0);
    assert.equal(api.state.weaponDetail.frequencyByWeaponKey.get(toggledWeapon.key), 75);
    api.state.weaponDetail.enabledByWeaponKey.set(toggledWeapon.key, true);

    api.state.weaponDetail.enabledRangeTypes.delete("short");
    assert.equal(api.weaponDetailEffectiveFrequency(toggledWeapon, 100), 0);
    assert.equal(api.state.weaponDetail.frequencyByWeaponKey.get(toggledWeapon.key), 75);
    api.state.weaponDetail.enabledRangeTypes.add("short");
    assert.equal(api.weaponDetailEffectiveFrequency(toggledWeapon, 100), 75);
  });

  await t.test("무장 상세 거리 눈금은 최대 DPS와 데미지 0 구간을 분리한다", () => {
    const rangedWeapon = {
      key: "range-test",
      item: weapon(),
      damagePerSecond: 10,
      rangeProfile: {
        minimumRange: 0,
        optimalRange: 100,
        maximumRange: 200,
        ranges: [
          { start: 0, modifier: 1, interpolation: "linear", exponent: 1 },
          { start: 100, modifier: 1, interpolation: "linear", exponent: 1 },
          { start: 200, modifier: 0, interpolation: "linear", exponent: 1 },
        ],
      },
    };
    const segments = api.weaponDetailDistanceSegments(
      [rangedWeapon],
      new Map([["range-test", 100]]),
      1,
      300,
    );
    assert.equal(segments.maximumDps, 10);
    assert.deepEqual(
      JSON.parse(JSON.stringify(segments.maximumSegments)),
      [{ start: 1, end: 100 }],
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(segments.zeroSegments)),
      [{ start: 200, end: 300 }],
    );
    closeTo(api.weaponDetailDamageRatio(100, segments), 1);
    closeTo(api.weaponDetailDamageRatio(150, segments), 0.5);
    closeTo(api.weaponDetailDamageRatio(199, segments), 0.01);
    assert.equal(api.weaponDetailDamageRatio(200, segments), null);
    assert.equal(api.weaponDetailDamageColor(1), "rgb(73, 166, 200)");
    assert.equal(api.weaponDetailDamageColor(0.99), "rgb(154, 201, 95)");
    assert.equal(api.weaponDetailDamageColor(0.5), "rgb(188, 152, 87)");
    assert.equal(api.weaponDetailDamageColor(0), "rgb(223, 101, 79)");
    assert.equal(api.weaponDetailDamageColor(null), "rgb(38, 52, 58)");
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.weaponDetailDistanceBoundaries(segments))),
      [1, 100.5, 101.5, 199.5, 300],
    );
    closeTo(api.weaponDetailWeaponDamageRatio(rangedWeapon, 100), 1);
    closeTo(api.weaponDetailWeaponDamageRatio(rangedWeapon, 150), 0.5);
    closeTo(api.weaponDetailWeaponDamageRatio(rangedWeapon, 200), 0);
    assert.equal(api.weaponDetailWeaponRangeTone(0.99), "range-high");
    assert.equal(api.weaponDetailWeaponRangeTone(0.5), "range-medium");
    assert.equal(api.weaponDetailWeaponRangeTone(0.499), "range-low");

    const rangeTypeAt = (optimalRange) => JSON.parse(JSON.stringify(
      api.weaponDetailRangeType(weapon({ ranges: [
        { start: 0, damageModifier: 1 },
        { start: optimalRange, damageModifier: 1 },
        { start: optimalRange * 2, damageModifier: 0 },
      ] })),
    ));
    assert.deepEqual(rangeTypeAt(350), { type: "short", maximumDamageRange: 350 });
    assert.deepEqual(rangeTypeAt(351), { type: "medium", maximumDamageRange: 351 });
    assert.deepEqual(rangeTypeAt(700), { type: "medium", maximumDamageRange: 700 });
    assert.deepEqual(rangeTypeAt(701), { type: "long", maximumDamageRange: 701 });

    const visibleRangeWeapons = [
      {
        key: "visible-short",
        item: weapon({ ranges: [
          { start: 0, damageModifier: 1 },
          { start: 200, damageModifier: 1 },
        ] }),
      },
      {
        key: "hidden-medium",
        item: weapon({ ranges: [
          { start: 0, damageModifier: 1 },
          { start: 500, damageModifier: 1 },
        ] }),
      },
      {
        key: "visible-long",
        item: weapon({ ranges: [
          { start: 0, damageModifier: 1 },
          { start: 800, damageModifier: 1 },
        ] }),
      },
    ];
    assert.deepEqual(
      JSON.parse(JSON.stringify(api.weaponDetailVisibleRangeTypes(
        visibleRangeWeapons,
        new Map([
          ["visible-short", 50],
          ["hidden-medium", 0],
          ["visible-long", 1],
        ]),
      ))),
      ["short", "long"],
    );

    const availabilityWeapon = {
      key: "availability-test",
      item: weapon(),
      rangeProfile: { maximumRange: 200 },
    };
    api.state.weaponDetail.frequencyByWeaponKey.set("availability-test", 75);
    assert.equal(api.weaponDetailEffectiveFrequency(availabilityWeapon, 200), 75);
    assert.equal(api.weaponDetailEffectiveFrequency(availabilityWeapon, 201), 0);
    assert.equal(api.state.weaponDetail.frequencyByWeaponKey.get("availability-test"), 75);

    const shortItem = weapon({ name: "ShortAvailability", ranges: [
      { start: 0, damageModifier: 1 },
      { start: 100, damageModifier: 1 },
      { start: 200, damageModifier: 0 },
    ] });
    const longItem = weapon({ name: "LongAvailability", ranges: [
      { start: 0, damageModifier: 1 },
      { start: 900, damageModifier: 1 },
    ] });
    const mixedRangeWeapons = [
      {
        key: "short-availability",
        item: shortItem,
        damagePerSecond: 10,
        rangeProfile: api.simulationWeaponRangeProfile(shortItem, 0, 0),
      },
      {
        key: "long-availability",
        item: longItem,
        damagePerSecond: 10,
        rangeProfile: api.simulationWeaponRangeProfile(longItem, 0, 0),
      },
    ];
    const globalDpsSegments = api.weaponDetailDistanceSegments(
      mixedRangeWeapons,
      new Map(),
      1,
      1000,
      false,
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(globalDpsSegments.maximumSegments)),
      [{ start: 1, end: 100 }],
    );
    const availabilitySegments = api.weaponDetailDistanceSegments(
      mixedRangeWeapons,
      new Map(),
      1,
      1000,
      true,
    );
    assert.deepEqual(
      JSON.parse(JSON.stringify(availabilitySegments.maximumSegments)),
      [{ start: 1, end: 100 }, { start: 201, end: 900 }],
    );
  });

  await t.test("무장 상세 열효율은 75%부터 25%까지 초록색에서 빨간색으로 변한다", () => {
    assert.equal(api.weaponDetailHeatEfficiency(2, 5), 100);
    closeTo(api.weaponDetailHeatEfficiency(5, 2), 40);
    assert.equal(api.weaponDetailHeatEfficiencyColor(75), "rgb(154, 201, 95)");
    assert.equal(api.weaponDetailHeatEfficiencyColor(50), "rgb(189, 151, 87)");
    assert.equal(api.weaponDetailHeatEfficiencyColor(25), "rgb(223, 101, 79)");
    assert.equal(api.weaponDetailHeatEfficiencyColor(10), "rgb(223, 101, 79)");
  });

  await t.test("ATO는 알파 사이 냉각과 고스트 힛 추가 발열을 반영한다", () => {
    closeTo(api.alphasToOverheat(100, 30, 5, 2), 4.5);
    closeTo(api.alphasToOverheat(100, 120, 5, 2), 100 / 120);
    assert.equal(api.alphasToOverheat(100, 10, 5, 2), Infinity);
    assert.equal(api.alphasToOverheat(100, 0, 5, 2), null);

    const ghostItem = weapon({ stats: {
      heat: 5,
      heatPenaltyID: 9,
      minheatpenaltylevel: 2,
      heatpenalty: 24,
    } });
    const ghostWeapons = [0, 1].map((index) => ({
      key: `ghost-${index}`,
      item: ghostItem,
      ghostHeatBase: 5,
      ghostHeatHslBonus: 0,
    }));
    closeTo(api.ghostHeatForSimulationWeapons(ghostWeapons), 9.6);
  });

  await t.test("툴팁 사거리는 최소·최적·최대 경계를 소스 구간에서 찾는다", () => {
    const ranges = api.weaponTooltipRanges(weapon({ ranges: [
      { start: 0, damageModifier: 0 },
      { start: 90, damageModifier: 1 },
      { start: 450, damageModifier: 1 },
      { start: 900, damageModifier: 0 },
    ] }));
    assert.equal(ranges.minRange, 90);
    assert.equal(ranges.optimalRange, 450);
    assert.equal(ranges.maxRange, 900);
  });
});

test("히트싱크·고스트 히트·요약 공식", async (t) => {
  await t.test("첫 10개와 외부 히트싱크의 용량/냉각 공식을 구분한다", () => {
    const sink = { stats: {
      engineHeatbase: -1,
      heatbase: -1.5,
      engineCooling: 0.1,
      cooling: 0.2,
    } };
    const result = api.simulationHeatSystemFromSink(sink, 12, 0.1, 0.2);
    assert.equal(result.maxHeat, 49.6);
    closeTo(result.coolingRate, 1.54);
  });

  await t.test("고스트 히트는 HSL 전에는 0이고 활성화 후 원래 단계부터 누적한다", () => {
    resetEquipment();
    const item = weapon({ name: "PPC", stats: {
      heat: 10,
      minheatpenaltylevel: 3,
      heatpenalty: 10,
      heatPenaltyID: 1,
    } });
    assert.equal(api.ghostHeatWeaponExtra(item, 3, 10, 1), 0);
    assert.equal(api.ghostHeatWeaponExtra(item, 4, 10, 1), 48);
    assert.equal(api.ghostHeatGroupKey(item), "shared:1");
  });

  await t.test("HSL 쿼크는 전체·계열·무기별 값을 합산한다", () => {
    const item = weapon({ name: "PPC" });
    assert.equal(api.ghostHeatHslBonus(item, [
      quirk("all_minheatpenaltylevel_additive", 1),
      quirk("energy_minheatpenaltylevel_additive", 1),
      quirk("ppc_minheatpenaltylevel_additive", 2),
    ]), 4);
  });

  await t.test("요약 DPS/DPH/HPS와 열효율·회복시간을 한 공식으로 계산한다", () => {
    const metrics = api.mechSummaryWeaponMetrics([
      { damage: 20, heat: 5, cycle: 2 },
      { damage: 15, heat: 3, cycle: 1 },
    ], 35, { coolingRate: 2, maxHeat: 40 });
    assert.equal(metrics.alphaHeat, 8);
    assert.equal(metrics.dps, 25);
    assert.equal(metrics.hps, 5.5);
    assert.equal(metrics.dph, 4.375);
    closeTo(metrics.heatEfficiency, 2 / 5.5 * 100);
    assert.equal(metrics.alphaHeatRecovery, 4);
    assert.equal(metrics.alphaHeatPercent, 20);
    assert.equal(metrics.ato, 9);
    assert.deepEqual(Array.from(metrics.alphaHeatPercents), [20, 30, 40, 50]);
  });

  await t.test("연속 알파는 냉각 후 0 미만으로 내려가지 않고 100% 초과 발열도 유지한다", () => {
    const weapons = [{ damage: 20, heat: 30, cycle: 2 }];
    const cooled = api.mechSummaryWeaponMetrics(weapons, 20, { coolingRate: 20, maxHeat: 100 });
    assert.deepEqual(Array.from(cooled.alphaHeatPercents), [30, 30, 30, 30]);
    assert.equal(cooled.ato, Infinity);
    assert.match(api.renderMechSummaryAlphaHeat(cooled), />∞<\/strong>/);
    const uncooled = api.mechSummaryWeaponMetrics(weapons, 20, { coolingRate: 0, maxHeat: 100 });
    assert.deepEqual(Array.from(uncooled.alphaHeatPercents), [30, 60, 90, 120]);
    const empty = api.mechSummaryWeaponMetrics([], 0, { coolingRate: 2, maxHeat: 100 });
    assert.deepEqual(Array.from(empty.alphaHeatPercents), [0, 0, 0, 0]);
  });

  await t.test("고스트 알파는 추가열을 포함하고 HSL로 억제되면 행을 숨긴다", () => {
    const item = weapon({ stats: { heat: 5, heatPenaltyID: 9, minheatpenaltylevel: 2, heatpenalty: 24 } });
    const weapons = [0, 1].map(() => ({ item, heat: 5, cycle: 2, ghostHeatBase: 5, ghostHeatHslBonus: 0 }));
    const metrics = api.mechSummaryWeaponMetrics(weapons, 0, { coolingRate: 2, maxHeat: 100 });
    [10, 16, 22, 28].forEach((expected, index) => closeTo(metrics.alphaHeatPercents[index], expected));
    [19.6, 35.2, 50.8, 66.4].forEach((expected, index) => closeTo(metrics.ghostAlphaHeatPercents[index], expected));
    closeTo(metrics.ato, 16);
    closeTo(metrics.ghostAto, 1 + (100 - 19.6) / (19.6 - 4));
    const html = api.renderMechSummaryAlphaHeat(metrics);
    assert.match(html, /<h3>ALPHA HEAT<\/h3>/);
    for (const label of ["1ST", "2ND", "3RD", "4TH", "ATO", "GHOST ATO"]) {
      assert.ok(html.includes(`>${label}</span>`));
    }
    assert.match(html, /title="Alpha strike 1/);
    assert.match(html, /title="ATO:/);
    const rows = api.mechSummaryAlphaHeatRows(metrics);
    assert.equal(rows.length, 2);
    assert.equal(rows[1][0], "GHOST ALPHA HEAT");
    assert.equal(rows[0][2], rows[1][2]);
    weapons.forEach((entry) => { entry.ghostHeatHslBonus = 1; });
    const suppressed = api.mechSummaryWeaponMetrics(weapons, 0, { coolingRate: 2, maxHeat: 100 });
    assert.equal(suppressed.ghostAlphaHeatPercents, null);
    assert.equal(suppressed.ghostAto, null);
    assert.doesNotMatch(api.renderMechSummaryAlphaHeat(suppressed), /GHOST ATO|GHOST ALPHA HEAT/);
    assert.equal(api.mechSummaryAlphaHeatRows(suppressed).length, 1);
  });

  await t.test("알파 열 색상은 25·50·75·100 경계와 100 초과를 구분한다", () => {
    const cases = [[0, 1], [25, 1], [25.1, 2], [50, 2], [50.1, 3], [75, 3], [75.1, 4], [100, 4], [100.1, 5]];
    for (const [percent, level] of cases) {
      const rows = api.mechSummaryAlphaHeatRows({ alphaHeatPercents: [percent], ghostAlphaHeatPercents: [percent] });
      for (const row of rows) {
        assert.match(row[1], new RegExp(`class="alpha-heat-level-${level}"`));
        assert.match(row[1], />\d+%<\/span>/);
      }
    }
  });

  await t.test("발열이 없으면 DPH가 없고 냉각이 충분하면 열효율은 100이다", () => {
    const metrics = api.mechSummaryWeaponMetrics(
      [{ damage: 10, heat: 0, cycle: 1 }],
      10,
      { coolingRate: 1, maxHeat: 0 },
    );
    assert.equal(metrics.dph, null);
    assert.equal(metrics.heatEfficiency, 100);
    assert.equal(metrics.alphaHeatRecovery, 0);
    assert.equal(metrics.alphaHeatPercent, 0);
    assert.equal(metrics.ato, null);
    assert.deepEqual(Array.from(metrics.alphaHeatPercents), [0, 0, 0, 0]);
  });
});

test("추출된 전체 무기 스펙은 명시된 필드와 공식으로 계산된다", () => {
  const equipmentData = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "public", "data", "equipment.json"),
    "utf8",
  ));
  const weapons = equipmentData.families.weapons.map((id) => equipmentData.items[id]);
  assert.equal(weapons.length > 0, true);

  for (const item of weapons) {
    const stats = item.stats || {};
    for (const field of ["damage", "numFiring", "heat", "cooldown", "tons", "slots"]) {
      assert.equal(Number.isFinite(stats[field]), true, `${item.name}: ${field}`);
    }
    assert.equal(Array.isArray(item.ranges) && item.ranges.length > 0, true, `${item.name}: ranges`);
    for (let index = 1; index < item.ranges.length; index += 1) {
      assert.equal(
        item.ranges[index - 1].start <= item.ranges[index].start,
        true,
        `${item.name}: range order`,
      );
    }

    const projectileClass = String(stats.projectileclass || "").toLowerCase();
    const projectileMultiplier = projectileClass === "bullet" || api.isRocketLauncher(item)
      ? Math.max(1, Math.trunc(stats.numPerShot || 1))
      : 1;
    closeTo(
      api.weaponBaseDirectDamage(item),
      stats.damage * stats.numFiring * projectileMultiplier,
    );

    if (stats.numPerShot > 0) {
      assert.equal(
        projectileClass === "bullet" || api.isRocketLauncher(item),
        true,
        `${item.name}: numPerShot use`,
      );
    }
    if (stats.rof > 0 || (stats.duration < 0 && stats.damage > 0)) {
      assert.notEqual(api.weaponDamageRate(item, []), null, `${item.name}: damage rate`);
    }
    const expectedCooldown = api.weaponExpectedCooldown(item, []);
    assert.equal(
      expectedCooldown === null || (Number.isFinite(expectedCooldown) && expectedCooldown > 0),
      true,
      `${item.name}: expected cooldown`,
    );
  }

  const rockets = weapons
    .filter(api.isRocketLauncher)
    .sort((left, right) => left.id - right.id);
  assert.deepEqual(rockets.map((item) => item.stats.numPerShot), [1, 2, 3]);
  assert.deepEqual(rockets.map((item) => api.weaponBaseDirectDamage(item)), [0.375, 0.75, 1.125]);

  const streaks = weapons.filter(api.isStreakSrm);
  assert.equal(streaks.length, 6);
  for (const item of streaks) {
    assert.equal(api.weaponVolleySize(item), item.stats.numFiring, item.name);
    assert.equal(api.weaponFiringTime(item), 0, item.name);
  }
});

test("빌드 집계 공식은 개별 공식과 같은 최종값을 만든다", () => {
  const engine = {
    id: 100,
    item_type: "engine",
    name: "StandardEngine_200",
    faction: "InnerSphere",
    stats: { tons: 5, slots: 6, rating: 200, heatsinks: 10, sideSlots: 0 },
  };
  const laser = weapon({
    id: 101,
    name: "MediumLaser",
    stats: { tons: 2, slots: 1, damage: 10, heat: 5, cooldown: 2 },
  });
  const structure = {
    id: 102,
    item_type: "upgrade",
    name: "StandardStructure",
    stats: { weightPerTon: 0.1 },
  };
  const armor = {
    id: 103,
    item_type: "upgrade",
    name: "StandardArmor",
    stats: { armorPerTon: 32 },
  };
  resetEquipment({ 100: engine, 101: laser, 102: structure, 103: armor });
  const componentNames = [
    "head",
    "centre_torso",
    "left_torso",
    "right_torso",
    "left_arm",
    "right_arm",
    "left_leg",
    "right_leg",
  ];
  const components = Object.fromEntries(componentNames.map((name) => [name, {
    hp: name === "head" ? 15 : 20,
    slots: 12,
    hardpoints: name === "left_arm"
      ? [{ hardpoint_type: "energy", weapon_slots: 1 }]
      : [],
    internals: [],
    fixed: [],
  }]));
  const mech = {
    id: "build-fixture",
    stock_loadout: "build-fixture",
    faction: "InnerSphere",
    definition: {
      stats: {
        MaxTons: 50,
        MinEngineRating: 100,
        MaxEngineRating: 300,
        MaxJumpJets: 0,
      },
      components,
      quirks: [],
    },
  };
  const buildComponents = Object.fromEntries(componentNames.map((name) => [name, {
    armor: name === "centre_torso" ? 32 : 0,
    items: name === "centre_torso"
      ? [{ item_id: 100 }]
      : name === "left_arm"
        ? [{ item_id: 101 }]
        : [],
  }]));
  api.state.loadouts = {};
  api.state.omnipods = {};
  api.state.selectedMech = mech;
  api.state.currentBuild = {
    components: buildComponents,
    engineHeatSinks: [],
    rearArmor: {},
    upgrades: {
      structure: { ItemID: 102 },
      armor: { ItemID: 103 },
      artemis: { Equipped: false },
    },
  };
  const result = api.calculateBuild();
  assert.equal(result.totalTons, 13);
  assert.equal(result.alpha, 10);
  assert.equal(result.heat, 5);
  assert.equal(result.armor, 32);
  assert.equal(result.totalHeatSinkCount, 10);
  assert.equal(result.currentSlotUsage, 7);
  assert.equal(result.warnings.some((warning) => warning.includes("Tonnage")), false);
});

test("모바일 브리지는 부위별 하드포인트·슬롯 검증과 보호된 편집 경로를 재사용한다", () => {
  const componentNames = [
    "head",
    "centre_torso",
    "left_torso",
    "right_torso",
    "left_arm",
    "right_arm",
    "left_leg",
    "right_leg",
  ];
  const engine = {
    id: 500,
    item_type: "engine",
    name: "StandardEngine_200",
    display_name: "STD ENGINE 200",
    faction: "InnerSphere",
    stats: { tons: 5, slots: 6, rating: 200, heatsinks: 12, sideSlots: 0 },
  };
  const smallLaser = weapon({ id: 501, name: "SmallLaser", stats: { slots: 1, tons: 1 } });
  const largeLaser = weapon({ id: 502, name: "LargeLaser", stats: { slots: 3, tons: 5 } });
  const missile = weapon({ id: 503, name: "TestMissile", hardpoint_type: "missile", stats: { slots: 1, tons: 1 } });
  const hiddenWeapon = weapon({
    id: 508,
    name: "NobleAutoCannon20",
    display_name: "NOBLE AC/20",
    faction: "InnerSphere",
    hardpoint_type: "energy",
    stats: { slots: 1, tons: 1 },
  });
  const heatSink = {
    id: 504,
    item_type: "module",
    ctype: "CHeatSinkStats",
    name: "DoubleHeatSink",
    display_name: "DOUBLE HEAT SINK",
    faction: "InnerSphere",
    stats: { slots: 1, tons: 1 },
  };
  const heatSinkUpgrade = {
    id: 505,
    item_type: "upgrade",
    name: "DoubleHeatSinkUpgrade",
    display_name: "DOUBLE HEAT SINKS",
    faction: "InnerSphere",
    stats: { compatibleHeatSink: heatSink.id },
  };
  const incompatibleHeatSink = {
    ...heatSink,
    id: 506,
    name: "SingleHeatSink",
    display_name: "SINGLE HEAT SINK",
  };
  const fixedWeaponModule = {
    id: 507,
    item_type: "module",
    ctype: "CTargetingComputerStats",
    name: "FixedWeaponModule",
    display_name: "FIXED WEAPON MODULE",
    faction: "InnerSphere",
    stats: { slots: 5, tons: 0, amountAllowed: 2 },
    weapon_stat_filters: [{ compatible_weapons: ["TestWeapon"], weapon_stats: [{ operation: "+", damage: 8 }] }],
  };
  const components = Object.fromEntries(componentNames.map((name) => [name, {
    hp: name === "head" ? 15 : 20,
    slots: name === "left_arm" ? 2 : 12,
    hardpoints: name === "left_arm"
      ? [
        { hardpoint_type: "energy", weapon_slots: 1 },
        { hardpoint_type: "missile", weapon_slots: 1 },
      ]
      : [],
    internals: [],
    fixed: [],
  }]));
  const mech = {
    id: "mobile-fixture",
    chassis: "MobileFixture",
    faction: "InnerSphere",
    definition: {
      stats: { MaxTons: 50, MinEngineRating: 100, MaxEngineRating: 300, MaxJumpJets: 0 },
      components,
      quirks: [],
    },
  };
  api.state.equipment = {
    items: { 500: engine, 501: smallLaser, 502: largeLaser, 503: missile, 504: heatSink, 505: heatSinkUpgrade, 506: incompatibleHeatSink, 507: fixedWeaponModule, 508: hiddenWeapon },
    families: { weapons: [501, 502, 503, 508], ammo: [], equipment: [504, 506, 507], jumpjets: [], masc: [], engines: [500], upgrades: [505] },
  };
  api.state.loadouts = {};
  api.state.omnipods = {};
  api.state.omnipodDefinitionCache.clear();
  api.state.selectedMech = mech;
  api.state.currentBuild = {
    components: Object.fromEntries(componentNames.map((name) => [name, {
      armor: 0,
      items: name === "centre_torso" ? [{ item_id: 500 }] : [],
    }])),
    engineHeatSinks: [],
    rearArmor: {},
    upgrades: { heatsinks: { ItemID: 505 }, artemis: { Equipped: false } },
  };

  const picker = api.mobilePickerData("left_arm", "weapons");
  assert.equal(picker.hardpointCapacity.energy, 1);
  assert.equal(picker.hardpointCapacity.missile, 1);
  assert.equal(picker.remainingHardpoints.energy, 1);
  assert.equal(picker.remainingHardpoints.missile, 1);
  assert.deepEqual(new Set(picker.items.map((item) => item.type)), new Set(["energy", "missile"]));
  assert.equal(picker.items.some((item) => item.id === "508"), false);
  assert.equal(picker.items.find((item) => item.id === "502").slotShortage, true);
  const equipmentPicker = api.mobilePickerData("left_arm", "equipment");
  assert.equal(equipmentPicker.items.some((item) => item.id === "504"), true);
  assert.equal(equipmentPicker.items.some((item) => item.id === "507"), false);
  assert.equal(equipmentPicker.items.some((item) => item.id === "500"), false);
  const torsoEquipment = api.mobilePickerData("centre_torso", "equipment");
  const torsoEngines = api.mobilePickerData("centre_torso", "engines");
  assert.deepEqual(
    Array.from(torsoEquipment.items.filter((item) => item.type === "engine")),
    Array.from(torsoEngines.items),
  );
  assert.equal(torsoEquipment.items.some((item) => item.id === "500" && !item.warning), true);
  assert.equal(api.mobilePickerData("left_torso", "equipment").items.some((item) => item.type === "engine"), false);
  const originalMaxEngineRating = mech.definition.stats.MaxEngineRating;
  mech.definition.stats.MaxEngineRating = engine.stats.rating - 1;
  assert.equal(api.mobilePickerData("centre_torso", "equipment").items.some((item) => item.type === "engine"), false);
  mech.definition.stats.MaxEngineRating = originalMaxEngineRating;
  const slotSummary = api.mobileSlotSummary();
  const calculated = api.calculateBuild();
  assert.equal(slotSummary.tons, calculated.totalTons);
  assert.equal(slotSummary.maxTons, calculated.maxTons);
  assert.equal(slotSummary.current, calculated.currentSlotUsage);
  assert.equal(slotSummary.remaining, calculated.freeSlots);
  assert.equal(api.installWarehouseItemInComponent(hiddenWeapon, "left_arm", { render: false }), true);
  assert.equal(api.mobileRemoveItem("left_arm", 0, { render: false }), true);
  assert.equal(api.installWarehouseItemInComponent(largeLaser, "left_arm", { render: false }), false);
  assert.equal(api.installWarehouseItemInComponent(smallLaser, "left_arm", { render: false }), true);
  assert.equal(api.installWarehouseItemInComponent(missile, "left_arm", { render: false }), true);
  const fullPicker = api.mobilePickerData("left_arm", "weapons");
  assert.equal(fullPicker.remainingHardpoints.energy, 0);
  assert.equal(fullPicker.remainingHardpoints.missile, 0);
  assert.deepEqual(new Set(fullPicker.items.map((item) => item.type)), new Set(["energy", "missile"]));
  assert.equal(fullPicker.items.every((item) => Boolean(item.warning)), true);
  assert.equal(api.mobileRemoveItem("left_arm", 1, { render: false }), true);
  assert.equal(api.mobileRemoveItem("left_arm", 0, { render: false }), true);
  assert.equal(api.mobileRemoveItem("centre_torso", 0, { render: false }), false);
  assert.equal(api.state.currentBuild.components.centre_torso.items[0].item_id, 500);

  assert.equal(api.mobileInstallEngineHeatSink(506, { render: false }), false);
  assert.equal(api.mobileAdjustEngineHeatSink(1, { render: false }), true);
  assert.equal(api.state.currentBuild.engineHeatSinks.length, 1);
  assert.equal(api.mobileAdjustEngineHeatSink(1, { render: false }), true);
  assert.equal(api.state.currentBuild.engineHeatSinks.length, 2);
  assert.equal(api.mobileAdjustEngineHeatSink(1, { render: false }), false);
  assert.equal(api.mobileAdjustEngineHeatSink(-1, { render: false }), true);
  assert.equal(api.mobileAdjustEngineHeatSink(-1, { render: false }), true);
  assert.equal(api.state.currentBuild.engineHeatSinks.length, 0);
  assert.equal(api.mobileAdjustEngineHeatSink(-1, { render: false }), false);

  api.state.omnipods = {
    700: { id: 700, chassis: "MobileFixture", component: "left_arm", set: "MOB-A", hardpoints: [], internals: [], fixed: [] },
  };
  api.state.currentBuild.components.left_arm.items = [{ item_id: 501 }];
  assert.equal(api.replaceOmnipod("left_arm", 700), true);
  assert.equal(api.state.currentBuild.components.left_arm.omnipod, 700);
  assert.deepEqual(Array.from(api.state.currentBuild.components.left_arm.items), []);
});

test("고정 9031은 유효 정의에서 BANE 무기 계산과 시뮬레이션에 전달된다", () => {
  const engine = {
    id: 200,
    item_type: "engine",
    name: "ClanEngine_300",
    faction: "Clan",
    stats: { tons: 10, slots: 6, rating: 300, heatsinks: 10, sideSlots: 0 },
  };
  const loader = {
    id: 9031,
    item_type: "module",
    name: "BaneHeroComputer",
    display_name: "Modified Ballistic Loader",
    faction: "Clan",
    stats: { tons: 1, slots: 1, health: 99999, amountAllowed: 1 },
    weapon_stat_filters: [
      {
        tag: "ProjectileWeapons",
        compatible_weapons: ["ClanHyperAssaultGaussRifle20"],
        weapon_stats: [
          { operation: "+", critChanceIncrease: "0.0114,0.0064,0.0014" },
          { operation: "*", speed: 1.05 },
        ],
      },
      {
        tag: "ProjectileWeapons",
        compatible_weapons: ["ClanHyperAssaultGaussRifle20"],
        weapon_stats: [
          { operation: "+", spread: 0.5 },
          { operation: "+", numPerShot: 3 },
          { operation: "*", damage: 0.34 },
          { operation: "*", volleydelay: 0.7 },
        ],
      },
    ],
  };
  const hag20 = weapon({
    id: 201,
    name: "ClanHyperAssaultGaussRifle20",
    display_name: "HAG/20",
    hardpoint_type: "ballistic",
    faction: "Clan",
    stats: {
      tons: 10,
      slots: 8,
      ammoType: "ClanHAG20Ammo",
      ammoPerShot: 1,
      numFiring: 4,
      damage: 4,
      heat: 4,
      cooldown: 3,
      volleydelay: 0.13,
      projectileclass: "bullet",
      speed: 2000,
    },
  });
  const structure = { id: 202, item_type: "upgrade", name: "ClanStandardStructure", faction: "Clan", stats: { weightPerTon: 0.1 } };
  const armor = { id: 203, item_type: "upgrade", name: "ClanStandardArmor", faction: "Clan", stats: { armorPerTon: 32 } };
  resetEquipment({ 200: engine, 201: hag20, 202: structure, 203: armor, 9031: loader });
  const componentNames = [
    "head", "centre_torso", "left_torso", "right_torso",
    "left_arm", "right_arm", "left_leg", "right_leg",
  ];
  const definitionComponents = Object.fromEntries(componentNames.map((name) => [name, {
    hp: 20,
    slots: 12,
    hardpoints: name === "left_arm" ? [{ hardpoint_type: "ballistic", weapon_slots: 1 }] : [],
    internals: [],
    fixed: name === "head" ? [9031] : [],
  }]));
  api.state.loadouts = {};
  api.state.omnipods = {};
  api.state.selectedMech = {
    id: 3752,
    name: "bane-l",
    stock_loadout: "bane-l-test",
    faction: "Clan",
    definition: {
      stats: { MaxTons: 100, MinEngineRating: 200, MaxEngineRating: 400, MaxJumpJets: 0 },
      components: definitionComponents,
      quirks: [],
    },
  };
  api.state.currentBuild = {
    components: Object.fromEntries(componentNames.map((name) => [name, {
      armor: 0,
      items: name === "centre_torso"
        ? [{ item_id: 200 }]
        : name === "left_arm"
          ? [{ item_id: 201 }]
          : [],
    }])),
    engineHeatSinks: [],
    rearArmor: {},
    upgrades: {
      structure: { ItemID: 202 },
      armor: { ItemID: 203 },
      artemis: { Equipped: false },
    },
  };

  closeTo(api.calculateBuild().alpha, 16.32);
  const simulationWeapons = api.collectSimulationWeapons();
  assert.equal(simulationWeapons.length, 1);
  closeTo(simulationWeapons[0].directDamage, 16.32);
  assert.equal(simulationWeapons[0].shotCount, 4);
  assert.equal(simulationWeapons[0].eventCount, 4);
  closeTo(simulationWeapons[0].shotDelay, 0.091);
  closeTo(simulationWeapons[0].firingTime, 0.273);
});

test("고정 9032는 AMAROK 무기·탄약·시뮬레이션에 공용 Modifier로 전달된다", () => {
  const engine = {
    id: 300,
    item_type: "engine",
    name: "ClanEngine_400",
    faction: "Clan",
    stats: { tons: 15, slots: 6, rating: 400, heatsinks: 10, sideSlots: 0 },
  };
  const loader = {
    id: 9032,
    item_type: "module",
    name: "NagaHeroComputer",
    display_name: "Modified Missile Loader",
    faction: "Clan",
    stats: { tons: 1, slots: 1, health: 99999, amountAllowed: 0 },
    weapon_stat_filters: [{
      tag: "MissileWeapons",
      compatible_weapons: ["ClanLRM20", "ClanLRM20_Artemis"],
      weapon_stats: [
        { operation: "+", volleydelay: 0.2 },
        { operation: "+", cooldown: -4.35 },
        { operation: "+", numFiring: -12 },
        { operation: "+", ammoPerShot: -12 },
        { operation: "+", MinReactivationTime: 0.15 },
      ],
      ranges: [],
    }],
  };
  const lrm20 = weapon({
    id: 301,
    name: "ClanLRM20",
    display_name: "C-LRM 20",
    hardpoint_type: "missile",
    faction: "Clan",
    stats: {
      tons: 5,
      slots: 4,
      ammoType: "ClanLRMAmmo",
      ammoPerShot: 20,
      numFiring: 20,
      damage: 1,
      heat: 6,
      cooldown: 4.6,
      volleydelay: 0.05,
      volleysize: 2,
      projectileclass: "javelin",
    },
  });
  const ammo = {
    id: 302,
    item_type: "ammo",
    name: "ClanLRMAmmo",
    display_name: "C-LRM AMMO",
    faction: "Clan",
    stats: { type: "ClanLRMAmmo", numShots: 100, tons: 1, slots: 1 },
  };
  const structure = { id: 303, item_type: "upgrade", name: "ClanStandardStructure", faction: "Clan", stats: { weightPerTon: 0.1 } };
  const armor = { id: 304, item_type: "upgrade", name: "ClanStandardArmor", faction: "Clan", stats: { armorPerTon: 32 } };
  resetEquipment({ 300: engine, 301: lrm20, 302: ammo, 303: structure, 304: armor, 9032: loader });
  const componentNames = [
    "head", "centre_torso", "left_torso", "right_torso",
    "left_arm", "right_arm", "left_leg", "right_leg",
  ];
  const definitionComponents = Object.fromEntries(componentNames.map((name) => [name, {
    hp: 20,
    slots: 12,
    hardpoints: name === "left_arm" ? [{ hardpoint_type: "missile", weapon_slots: 1 }] : [],
    internals: [],
    fixed: name === "centre_torso" ? [9032] : [],
  }]));
  api.state.loadouts = {};
  api.state.omnipods = {};
  api.state.selectedMech = {
    id: 3839,
    name: "nga-am",
    stock_loadout: "nga-am-test",
    faction: "Clan",
    definition: {
      stats: { MaxTons: 100, MinEngineRating: 200, MaxEngineRating: 400, MaxJumpJets: 0 },
      components: definitionComponents,
      quirks: [],
    },
  };
  api.state.currentBuild = {
    components: Object.fromEntries(componentNames.map((name) => [name, {
      armor: 0,
      items: name === "centre_torso"
        ? [{ item_id: 300 }]
        : name === "left_arm"
          ? [{ item_id: 301 }, { item_id: 302 }]
          : [],
    }])),
    engineHeatSinks: [],
    rearArmor: {},
    upgrades: {
      structure: { ItemID: 303 },
      armor: { ItemID: 304 },
      artemis: { Equipped: false },
    },
  };

  const build = api.calculateBuild();
  closeTo(build.alpha, 8);
  assert.equal(build.ammo, 100);
  const simulationWeapons = api.collectSimulationWeapons();
  assert.equal(simulationWeapons.length, 1);
  closeTo(simulationWeapons[0].directDamage, 8);
  assert.equal(simulationWeapons[0].shotCount, 8);
  assert.equal(simulationWeapons[0].volleySize, 2);
  assert.equal(simulationWeapons[0].eventCount, 4);
  closeTo(simulationWeapons[0].shotDelay, 0.25);
  closeTo(simulationWeapons[0].firingTime, 0.75);
  closeTo(simulationWeapons[0].cooldown, 0.25);
  closeTo(simulationWeapons[0].cycle, 1);
  const ammoGroups = api.mechSummaryAmmoGroups(simulationWeapons);
  assert.equal(ammoGroups.length, 1);
  assert.equal(ammoGroups[0].volleys, 12);
  closeTo(ammoGroups[0].totalDamage, 96);
});
