const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const redirectSource = read("public/mobile-redirect.js");

function route({
  href = "https://kmonkeyhead.github.io/mwolab/?lang=kr&loadout=A%2BB#build",
  userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  userAgentData,
  maxTouchPoints = 0,
  preferredView = "",
  mobileShell = false,
} = {}) {
  const stored = new Map(preferredView ? [["mwolab:preferred-view:v1", preferredView]] : []);
  const calls = { replace: [], history: [] };
  const locationUrl = new URL(href);
  const location = {
    href: locationUrl.href,
    pathname: locationUrl.pathname,
    search: locationUrl.search,
    hash: locationUrl.hash,
    replace(value) { calls.replace.push(value); },
  };
  const context = {
    URL,
    navigator: { userAgent, userAgentData, maxTouchPoints },
    localStorage: {
      getItem(key) { return stored.get(key) || null; },
      setItem(key, value) { stored.set(key, String(value)); },
      removeItem(key) { stored.delete(key); },
    },
    history: {
      state: null,
      replaceState(state, title, value) { calls.history.push(value); },
    },
    location,
    __MWOLAB_MOBILE__: mobileShell,
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(redirectSource, context);
  return { calls, stored };
}

function mobileSharedFittingHarness({ href, fetchDocument }) {
  const source = read("public/mobile/mobile-shared-fitting.js")
    .replace(/^import[^\n]+\n/, 'const firebaseConfig = { projectId: "mwolab-2e145", apiKey: "test-key" };\n');
  const listeners = new Map();
  const events = [];
  const openedCodes = [];
  const status = { textContent: "" };
  const windowObject = {
    location: { href },
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent(event) { events.push(event); },
  };
  const context = {
    URL,
    window: windowObject,
    document: { getElementById: () => status },
    fetch: fetchDocument,
    encodeURIComponent,
    setTimeout(callback) { callback(); },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    MwoLabMobileBridge: {
      ready: () => true,
      openSharedFittingCode(code) { openedCodes.push(code); },
    },
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return { events, listeners, openedCodes, status, window: windowObject };
}

const flushAsyncWork = () => new Promise((resolve) => setImmediate(resolve));

test("휴대폰과 태블릿은 쿼리·해시를 보존해 모바일 경로로 이동한다", () => {
  const iphone = route({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile" });
  assert.deepEqual(iphone.calls.replace, [
    "https://kmonkeyhead.github.io/mwolab/mobile/?lang=kr&loadout=A%2BB#build",
  ]);

  const androidTablet = route({
    href: "https://kmonkeyhead.github.io/mwolab/?mech=123",
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel Tablet)",
  });
  assert.deepEqual(androidTablet.calls.replace, [
    "https://kmonkeyhead.github.io/mwolab/mobile/?mech=123",
  ]);

  const ipadDesktopUa = route({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15",
    maxTouchPoints: 5,
  });
  assert.equal(ipadDesktopUa.calls.replace.length, 1);

  const noTrailingSlash = route({
    href: "https://kmonkeyhead.github.io/mwolab?lang=en",
    userAgent: "Mozilla/5.0 (iPhone) Mobile",
  });
  assert.deepEqual(noTrailingSlash.calls.replace, [
    "https://kmonkeyhead.github.io/mwolab/mobile/?lang=en",
  ]);
});

test("PC는 루트에 머물고 모바일은 이전 PC 보기 선호를 무시한다", () => {
  assert.equal(route().calls.replace.length, 0);
  const mobile = route({
    userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
    preferredView: "desktop",
  });
  assert.deepEqual(mobile.calls.replace, [
    "https://kmonkeyhead.github.io/mwolab/mobile/?lang=kr&loadout=A%2BB#build",
  ]);
  assert.equal(mobile.stored.has("mwolab:preferred-view:v1"), false);
});

test("이전 보기 제어 파라미터를 제거하고 기기 종류로만 분기한다", () => {
  const mobile = route({
    href: "https://kmonkeyhead.github.io/mwolab/?view=desktop&lang=en#x",
    userAgent: "Mozilla/5.0 (iPhone) Mobile",
  });
  assert.deepEqual(mobile.calls.replace, ["https://kmonkeyhead.github.io/mwolab/mobile/?lang=en#x"]);
  assert.equal(mobile.stored.has("mwolab:preferred-view:v1"), false);
  assert.deepEqual(mobile.calls.history, ["/mwolab/?lang=en#x"]);

  const desktop = route({
    href: "https://kmonkeyhead.github.io/mwolab/?view=mobile&mech=42",
    preferredView: "desktop",
  });
  assert.equal(desktop.stored.has("mwolab:preferred-view:v1"), false);
  assert.deepEqual(desktop.calls.replace, []);
  assert.deepEqual(desktop.calls.history, ["/mwolab/?mech=42"]);
});

test("모바일 셸에서 다시 라우팅하지 않아 중첩 경로 루프를 막는다", () => {
  const result = route({
    href: "https://kmonkeyhead.github.io/mwolab/mobile/?lang=kr",
    userAgent: "Mozilla/5.0 (iPhone) Mobile",
    mobileShell: true,
  });
  assert.equal(result.calls.replace.length, 0);
});

test("모바일 공유 문서는 코드로 변환하고 오류를 보이는 상태 이벤트로 전달한다", async () => {
  const valid = mobileSharedFittingHarness({
    href: "https://kmonkeyhead.github.io/mwolab/mobile/?fitting=public-id",
    fetchDocument: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ fields: {
        schemaVersion: { integerValue: "2" },
        loadoutCode: { stringValue: "MWO-CODE" },
      } }),
    }),
  });
  await flushAsyncWork();
  await flushAsyncWork();
  assert.deepEqual(valid.openedCodes, ["MWO-CODE"]);
  assert.ok(valid.events.some((event) => event.type === "mwolab:mobile-shared-fitting-loaded"));
  assert.ok(valid.events.some((event) => (
    event.type === "mwolab:mobile-shared-fitting-status" && event.detail.message === ""
  )));

  const missing = mobileSharedFittingHarness({
    href: "https://kmonkeyhead.github.io/mwolab/mobile/?fitting=missing-id",
    fetchDocument: async () => ({ ok: false, status: 404 }),
  });
  await flushAsyncWork();
  await flushAsyncWork();
  assert.deepEqual(missing.openedCodes, []);
  assert.ok(missing.events.some((event) => (
    event.type === "mwolab:mobile-shared-fitting-status"
    && event.detail.tone === "error"
    && /존재하지 않습니다/.test(event.detail.message)
  )));
});

test("모바일 공유 문서는 오래된 응답을 버리고 뒤로가기에서 다시 조회한다", async () => {
  let resolveFirstFetch;
  let fetchCount = 0;
  const validResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({ fields: {
      schemaVersion: { integerValue: "2" },
      loadoutCode: { stringValue: "LATEST-CODE" },
    } }),
  });
  const harness = mobileSharedFittingHarness({
    href: "https://kmonkeyhead.github.io/mwolab/mobile/?fitting=public-id",
    fetchDocument: async () => {
      fetchCount += 1;
      if (fetchCount === 1) return new Promise((resolve) => { resolveFirstFetch = resolve; });
      return validResponse();
    },
  });
  await flushAsyncWork();
  harness.window.location.href = "https://kmonkeyhead.github.io/mwolab/mobile/?mech=52";
  await harness.listeners.get("popstate")();
  resolveFirstFetch(validResponse());
  await flushAsyncWork();
  await flushAsyncWork();
  assert.deepEqual(harness.openedCodes, []);

  harness.window.location.href = "https://kmonkeyhead.github.io/mwolab/mobile/?fitting=public-id";
  await harness.listeners.get("popstate")();
  assert.deepEqual(harness.openedCodes, ["LATEST-CODE"]);
  assert.equal(fetchCount, 2);
});

test("모바일 공유 문서 상태는 닫힌 멕 목록 오버레이를 다시 연다", () => {
  const mobileApp = read("public/mobile/mobile-app.js");
  const handlerBody = mobileApp.match(
    /window\.addEventListener\("mwolab:mobile-shared-fitting-status", \(event\) => \{([\s\S]*?)\n  \}\);/,
  )?.[1] || "";
  assert.ok(handlerBody);
  const calls = [];
  const sharedFittingStatus = {
    textContent: "",
    hidden: true,
    classList: { toggle(name, enabled) { calls.push(["class", name, enabled]); } },
  };
  const mechListOverlay = { hidden: true };
  const showOverlay = (overlay) => {
    overlay.hidden = false;
    calls.push(["show"]);
  };
  const handler = vm.runInNewContext(
    `(event) => {${handlerBody}}`,
    { sharedFittingStatus, mechListOverlay, showOverlay, String },
  );
  handler({ detail: { message: "공유 핏팅을 불러오는 중입니다.", tone: "" } });
  assert.equal(mechListOverlay.hidden, false);
  assert.equal(sharedFittingStatus.hidden, false);
  assert.equal(sharedFittingStatus.textContent, "공유 핏팅을 불러오는 중입니다.");
  assert.ok(calls.some(([type]) => type === "show"));
});

test("모바일 번들은 별도 진입점과 제한된 멕랩 UI 계약을 포함한다", () => {
  const index = read("public/index.html");
  const mobileIndex = read("public/mobile/index.html");
  const mobileApp = read("public/mobile/mobile-app.js");
  const mobileSharedFitting = read("public/mobile/mobile-shared-fitting.js");
  const mobileCss = read("public/mobile/mobile.css");
  const app = read("public/app.js");
  const styles = read("public/styles.css");

  assert.match(index, /<script src="mobile-redirect\.js/);
  assert.match(mobileIndex, /<base href="\.\.\/">/);
  assert.match(mobileIndex, /__MWOLAB_MOBILE__ = true/);
  assert.match(mobileIndex, /firebase-community\\\.js/);
  assert.match(mobileIndex, /mobile\/mobile-shared-fitting\.js/);
  assert.match(mobileApp, /data-mobile-action/);
  assert.match(mobileApp, /"data-lang-link": value/);
  assert.match(mobileApp, /addEventListener\("mwolab:language-change"/);
  assert.match(mobileApp, /if \(!mechListOverlay\.hidden\) renderMechList\(\)/);
  assert.match(mobileApp, /if \(!pickerOverlay\.hidden\) renderPicker\(\)/);
  assert.match(mobileApp, /mobile-mech-list-controls/);
  assert.match(mobileApp, /mobile-shared-fitting-status/);
  assert.match(mobileApp, /mwolab:mobile-shared-fitting-status/);
  assert.match(mobileApp, /ecm: "ECM"/);
  assert.match(mobileApp, /mobile-mech-faction-group/);
  assert.match(mobileApp, /data-faction=/);
  assert.match(mobileApp, /\.sort\(\(a, b\) => a\.order - b\.order \|\| a\.label\.localeCompare\(b\.label\)\)/);
  assert.match(mobileApp, /data-mobile-mech-category/);
  assert.match(mobileApp, /const expandedMechCategories = new Set\(\)/);
  assert.match(mobileApp, /expandedMechCategories\.has\(chassis\)/);
  assert.match(mobileApp, /expandedMechCategories\.has\(category\)[\s\S]*?\.delete\(category\)[\s\S]*?\.add\(category\)/);
  assert.match(mobileApp, /\$\{query \? "disabled" : ""\}/);
  assert.match(mobileApp, /querySelectorAll\("\[data-mobile-mech-category\]"\)[\s\S]*?\.dataset\.mobileMechCategory === category[\s\S]*?\.focus\(\)/);
  assert.match(mobileApp, /mech\.chassisName/);
  assert.match(mobileApp, /class="badge-line mech-slot-tags">\$\{mech\.slotBadges \|\| ""\}/);
  assert.match(mobileApp, /class="mech-title-main">\$\{mech\.omnipodIcon \|\| ""\}/);
  assert.doesNotMatch(mobileApp, /<small>\$\{escapeHtml\(mech\.faction\)\}/);
  assert.match(mobileApp, /toolsClose\.textContent = t\("close"\)/);
  assert.match(mobileApp, /toolsClose\.classList\.add\("mobile-overlay-close"\)/);
  assert.match(mobileApp, /if \(toolsCloseX\) toolsCloseX\.hidden = true/);
  assert.doesNotMatch(mobileApp, /PC판으로 보기|View PC version|desktopViewHref|data-mobile-desktop-view/);
  assert.match(mobileApp, /data-mobile-picker-item/);
  assert.match(mobileApp, /mobile-picker-controls/);
  assert.match(mobileApp, /pickerControls\.append\(pickerTabs, pickerHardpoints, pickerStatus\)/);
  assert.match(mobileApp, /pickerBody\.append\(pickerControls, pickerList\)/);
  assert.match(mobileApp, /data-mobile-engine-heat-sink-delta/);
  assert.match(mobileApp, /bridge\.adjustEngineHeatSink/);
  assert.match(mobileApp, /event\.target\.closest\("\.engine-heat-sink-box"\)/);
  assert.doesNotMatch(mobileApp, /confirmRemovalDoubleTap\(`engine-heat-sink:/);
  assert.doesNotMatch(mobileApp, /openPicker\("centre_torso", "engine-heatsinks"\)/);
  assert.match(mobileApp, /data-mobile-omnipod/);
  assert.match(mobileApp, /let lastPickerCategory = "weapons";/);
  assert.match(mobileApp, /REMEMBERED_PICKER_CATEGORIES = \["weapons", "ammo", "equipment", "omnipods"\]/);
  assert.match(mobileApp, /const preferredCategory = category \|\| lastPickerCategory;/);
  assert.match(mobileApp, /categories\.includes\(preferredCategory\) \? preferredCategory : "weapons"/);
  assert.match(mobileApp, /if \(REMEMBERED_PICKER_CATEGORIES\.includes\(activePickerCategory\)\) \{[\s\S]*?lastPickerCategory = activePickerCategory;/);
  assert.match(mobileApp, /if \(component\) openPicker\(component\);/);
  assert.match(mobileApp, /closest\("\[data-empty-engine-slot\]"\)[\s\S]*?openPicker\("centre_torso", "engines"\)/);
  assert.match(mobileApp, /\.structure-upgrade-slot\.empty-slot, \.armor-upgrade-slot\.empty-slot/);
  assert.match(mobileApp, /emptySlot\.closest\("\[data-component-drop\]"\)\?\.dataset\.componentDrop/);
  assert.match(mobileApp, /DOUBLE_TAP_WINDOW_MS = 450/);
  assert.match(mobileApp, /confirmRemovalDoubleTap/);
  assert.match(mobileApp, /now < suppressCanvasClickUntil/);
  assert.doesNotMatch(mobileApp, /addEventListener\("dblclick"/);
  assert.match(mobileApp, /openLoadout/);
  assert.match(mobileApp, /pointerdown/);
  assert.match(mobileApp, /panel\.clientHeight - 12/);
  assert.match(mobileApp, /MAX_CANVAS_SCALE = 2\.5/);
  assert.match(mobileApp, /panel\.clientWidth - canvas\.scrollWidth \* fitScale/);
  assert.match(mobileApp, /scaledWidth <= panel\.clientWidth/);
  assert.match(mobileApp, /canvasState\.x = \(panel\.clientWidth - scaledWidth\) \/ 2/);
  assert.match(mobileApp, /mobile-weapon-group/);
  assert.match(mobileApp, /HARDPOINT_NAMES\[language\]\[type\]/);
  assert.match(mobileApp, /const summary = bridge\.slotSummary\(\);/);
  assert.match(mobileApp, /mobile-picker-summary-item/);
  assert.match(mobileApp, /summary\.current} \/ \$\{summary\.total/);
  assert.match(mobileApp, /mobile-fitting-status/);
  assert.match(mobileApp, /summary\.tons/);
  assert.match(mobileApp, /summary\.remaining/);
  assert.match(mobileApp, /function renderUpgradeSlotStatus\(\)/);
  assert.match(mobileApp, /if \(!upgradeOverlay\.hidden\) renderUpgradeSlotStatus\(\)/);
  assert.match(mobileApp, /upgradeObserver\.observe\(upgradeControls, \{ childList: true \}\)/);
  assert.match(mobileApp, /\$\{t\("slots"\)\} <strong>\$\{summary\.current\} \/ \$\{summary\.total\}<\/strong>/);
  assert.doesNotMatch(mobileApp, /summary\.current} \/ \$\{t\("free"\)\} \$\{summary\.remaining/);
  assert.match(mobileCss, /\.mobile-bottom-nav/);
  assert.match(mobileCss, /\.mobile-app #app \{[\s\S]*?display: block;[\s\S]*?height: 100dvh;/);
  assert.match(mobileCss, /height: calc\(100dvh - var\(--mobile-bar-height\)/);
  assert.match(mobileCss, /\.mechlab-workspace \{[\s\S]*?gap: 0;/);
  assert.match(mobileCss, /\.mobile-fitting-status/);
  assert.match(mobileCss, /\.mobile-save-options/);
  assert.match(mobileCss, /\.mobile-mech-list-controls \{[\s\S]*?position: sticky;[\s\S]*?z-index: 3;[\s\S]*?top: -0\.75rem;/);
  assert.match(mobileCss, /\.mobile-shared-fitting-status\.error/);
  assert.match(mobileCss, /\.mobile-picker-controls \{[\s\S]*?position: sticky;[\s\S]*?z-index: 3;[\s\S]*?top: -0\.75rem;[\s\S]*?background: #081215;/);
  assert.match(mobileCss, /\.mobile-mech-category-button/);
  assert.match(mobileCss, /\.mobile-mech-faction-title\[data-faction="Clan"\]/);
  assert.match(mobileCss, /\.mobile-mech-faction-title\[data-faction="InnerSphere"\]/);
  assert.match(mobileCss, /#build-actions-overlay \.build-actions-close \{[\s\S]*?display: none !important;/);
  assert.match(mobileCss, /#close-build-actions\.mobile-overlay-close \{[\s\S]*?justify-self: stretch;[\s\S]*?width: 100%;[\s\S]*?margin: 0;/);
  assert.match(mobileCss, /\.loadout-code-dialog\.mobile-export/);
  assert.match(mobileCss, /\.component-armor-stepper \[data-armor-delta="-1"\]/);
  assert.match(mobileCss, /\.mobile-component-armor-summary/);
  assert.match(mobileCss, /\.mobile-picker-hardpoints \{[\s\S]*?grid-template-columns: minmax\(0, 1\.35fr\) repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.mobile-picker-summary-item\.over-limit/);
  assert.match(mobileCss, /\.mobile-app #components \.component-items \{[\s\S]*?--mechlab-slot-row-height: 2\.541rem;[\s\S]*?--mechlab-slot-fill-height: 2\.475rem;/);
  assert.match(mobileCss, /\.mobile-app #components \{[\s\S]*?grid-template-columns: repeat\(5, minmax\(14rem, 1fr\)\);[\s\S]*?width: 72\.2rem;[\s\S]*?min-width: 72\.2rem;/);
  assert.match(mobileCss, /\.mobile-engine-heat-sink-controls \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.mobile-engine-heat-sink-controls button \{[\s\S]*?min-height: 2\.4rem;/);
  assert.match(mobileCss, /\.mobile-picker-item \{[\s\S]*?min-height: 5\.3rem;/);
  assert.match(mobileCss, /\.mobile-picker-item\.energy/);
  assert.match(mobileCss, /\.mobile-picker-item\.missile/);
  assert.match(mobileCss, /\.mobile-picker-item\.ballistic/);
  assert.match(mobileCss, /\.mobile-picker-item\.ams/);
  assert.match(mobileCss, /\.mobile-app \.equipment-tooltip \{[\s\S]*?display: none !important;/);
  assert.match(mobileCss, /\.mobile-hardpoint-tag\.energy \{ color: var\(--yellow\); \}/);
  assert.match(mobileCss, /\.mobile-hardpoint-tag\.missile \{ color: var\(--missile\); \}/);
  assert.match(mobileCss, /\.mobile-hardpoint-tag\.ballistic \{ color: var\(--purple\); \}/);
  assert.match(mobileCss, /\.mobile-hardpoint-tag\.ams \{ color: var\(--ams\); \}/);
  assert.match(mobileCss, /\.mobile-hardpoint-tag\.ecm \{ color: #ff9b42; \}/);
  assert.ok(mobileCss.lastIndexOf(".mobile-picker-item.invalid") > mobileCss.indexOf(".mobile-picker-item.ams"));
  assert.match(styles, /:root \{[\s\S]*?--mechlab-slot-row-height: 1\.694rem;[\s\S]*?--mechlab-slot-fill-height: 1\.65rem;/);
  assert.match(styles, /grid-auto-rows: minmax\(var\(--mechlab-slot-row-height\), auto\)/);
  assert.match(styles, /calc\(var\(--mechlab-slot-row-height\) \* var\(--slot-span, 1\)/);
  assert.match(styles, /repeating-linear-gradient\([^\n]+var\(--mechlab-slot-fill-height\)/);
  assert.match(app, /data-empty-slot-component/);
  assert.match(app, /data-empty-engine-slot[^>]*--slot-span:\$\{slots\}/);
  assert.match(app, /function emptyEngineSlotDropValidation\(item, source = null\)[\s\S]*?item\?\.item_type !== "engine"/);
  assert.match(app, /chassisName: gameLocalizedText\(mech\.chassis\) \|\| formatChassisName\(mech\.chassis\)/);
  assert.match(app, /weightClassKey: String\(mech\.weight_class \|\| ""\)/);
  assert.match(app, /factionOrder: factionRank\(mech\.faction\)/);
  assert.match(app, /function mechSlotBadges\(mech\)[\s\S]*?const build = buildFromLoadout\(mech\);[\s\S]*?hardpointCountsFromDefinition\(effectiveDefinition\(mech, build\)\)/);
  assert.match(app, /slotBadges: mechSlotBadges\(mech\)/);
  assert.match(app, /omnipodIcon: omnipodIcon\(mech\)/);
  assert.match(app, /globalThis\.__MWOLAB_MOBILE__[\s\S]*?querySelector\('\[data-mobile-action="tools"\]'\)[\s\S]*?returnTarget\?\.focus\(\)/);
  assert.match(app, /"mech-summary-weapon-section", globalThis\.__MWOLAB_MOBILE__ \? "" : `[\s\S]*?id="open-weapon-detail"/);
  assert.match(app, /frontArmor \+ rearArmor/);
  assert.match(app, /globalThis\.__MWOLAB_MOBILE__ \? ` <span class="mobile-component-armor-summary">/);
  assert.match(app, /url\.pathname = url\.pathname\.replace/);
  assert.match(app, /hardpointCapacity\[type\]/);
  assert.match(app, /category !== "equipment" \|\| Boolean\(warehouseItemSection\(item, category, isOmniMech\)\)/);
  assert.match(app, /function mobileAdjustEngineHeatSink\(delta/);
  assert.match(app, /stats\?\.compatibleHeatSink/);
  assert.match(app, /data-mobile-engine-heat-sink-delta="-1"/);
  assert.match(app, /data-mobile-engine-heat-sink-delta="1"/);
  assert.match(app, /globalThis\.__MWOLAB_MOBILE__ && event\.target\.closest\("\[data-mobile-engine-heat-sink-delta\], \.engine-heat-sink-box"\)/);
  assert.match(app, /\.engine-heat-sink-box, \.engine-main-slot, \.engine-fixed-slot/);
  assert.match(mobileApp, /addEventListener\("contextmenu",[\s\S]*?data-mobile-engine-heat-sink-delta[\s\S]*?stopImmediatePropagation\(\)[\s\S]*?}, true\)/);
  assert.match(app, /if \(!globalThis\.__MWOLAB_MOBILE__\) \{/);
  assert.match(index, /id="close-loadout-code-mobile"/);
  assert.match(app, /MwoLabMobileBridge/);
  assert.match(app, /if \(params\.has\(SHARED_PUBLIC_FITTING_QUERY_PARAM\)\) \{[\s\S]*?renderAll\(\);[\s\S]*?return;/);
  assert.match(app, /openSharedFittingCode\(code\) \{[\s\S]*?importMwoCode\(code, \{ closeDialog: false, updateNavigation: false \}\);[\s\S]*?replaceSharedLoadoutNavigation\(code\)/);
  assert.match(mobileSharedFitting, /import \{ firebaseConfig \} from "\.\.\/firebase-public-config\.js"/);
  assert.match(mobileSharedFitting, /firestore\.googleapis\.com\/v1\/projects/);
  assert.match(mobileSharedFitting, /documents\/fittings\/\$\{encodeURIComponent\(fittingId\)\}/);
  assert.match(mobileSharedFitting, /response\.status === 404/);
  assert.match(mobileSharedFitting, /\[1, 2, 3\]\.includes\(schemaVersion\)/);
  assert.match(mobileSharedFitting, /currentFittingId !== fittingId/);
  assert.match(mobileSharedFitting, /generation !== loadGeneration/);
  assert.match(mobileSharedFitting, /addEventListener\("mwolab:language-change"/);
  assert.match(mobileSharedFitting, /addEventListener\("popstate", loadSharedFittingForMobile\)/);
  assert.match(mobileSharedFitting, /bridge\.openSharedFittingCode\(loadoutCode\)/);
  assert.doesNotMatch(mobileSharedFitting, /firebase-auth|getDocs|communitySource|ownerUid|likeCount/);
  assert.match(app, /if \(globalThis\.__MWOLAB_MOBILE__\) return;/);
});

test("모바일 캔버스는 탭을 먼저 허용하고 이동 임계값을 넘긴 뒤 포인터를 캡처한다", () => {
  const mobileApp = read("public/mobile/mobile-app.js");
  const pointerDown = mobileApp.match(
    /panel\.addEventListener\("pointerdown",[\s\S]*?(?=panel\.addEventListener\("pointermove")/,
  )?.[0] || "";
  const pointerMove = mobileApp.match(
    /panel\.addEventListener\("pointermove",[\s\S]*?(?=const finishPointer)/,
  )?.[0] || "";

  assert.ok(pointerDown);
  assert.doesNotMatch(pointerDown, /setPointerCapture/);
  assert.ok(pointerMove);
  const thresholdIndex = pointerMove.indexOf("Math.hypot(dx, dy) < 6");
  const captureIndex = pointerMove.indexOf("setPointerCapture", thresholdIndex);
  assert.ok(thresholdIndex >= 0);
  assert.ok(captureIndex > thresholdIndex);
});

test("모바일 부트스트랩은 루트 골격에 공용 경로를 연결하고 Firebase를 제외한다", async () => {
  const rootHtml = read("public/index.html");
  const mobileIndex = read("public/mobile/index.html");
  const bootstrap = [...mobileIndex.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1];
  assert.ok(bootstrap);
  let output = "";
  const context = {
    fetch: async () => ({ ok: true, text: async () => rootHtml }),
    document: {
      open() {},
      write(value) { output = value; },
      close() {},
      querySelector() { return null; },
    },
    console,
  };
  await vm.runInNewContext(bootstrap, context);
  assert.match(output, /<base href="\.\.\/">/);
  assert.match(output, /globalThis\.__MWOLAB_MOBILE__ = true/);
  assert.match(output, /mobile\/mobile\.css/);
  assert.match(output, /loadout-url-codec\.js/);
  assert.match(output, /mobile\/mobile-app\.js/);
  assert.match(output, /mobile\/mobile-shared-fitting\.js/);
  assert.match(output, /content="noindex,follow,max-image-preview:none"/);
  assert.doesNotMatch(output, /src="firebase-community\.js/);
});
