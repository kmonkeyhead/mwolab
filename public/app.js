const QUIRK_CALCULATIONS = globalThis.MwoLabQuirkCalculations;
if (!QUIRK_CALCULATIONS) {
  throw new Error("quirk-calculations.js must be loaded before app.js");
}
const {
  addQuirk,
  quirkValueText,
  quirkFilterMagnitude,
  quirkValues,
  quirkAdd,
  quirkMultiplier,
  durabilitySkillFinalValue,
  isHarmfulDurationOrSpreadQuirk,
  quirkReduction,
  quirkIncrease,
  quirkSignedValue,
} = QUIRK_CALCULATIONS;

const SUPPORTED_LANGUAGES = new Set(["kr", "en"]);
const DEFAULT_LANGUAGE = "kr";
const MECHLAB_REFERENCE_WIDTH = 1920;
const MECHLAB_REFERENCE_HEIGHT = 1080;
const MECHLAB_MINIMUM_SCALE = 0.5;
const MAX_MECHLAB_FITTING_TABS = 10;
let mechlabScale = 1;
let mechlabScaleObserver = null;
let mechlabScaleFrame = 0;
let mechlabFittingTabSequence = 0;
let mechNavigationReady = false;
let mechSortTrigger = null;
let mechFilterTrigger = null;
let loadoutCodeTrigger = null;
const LOCAL_BUILDS_STORAGE_KEY = "mwolab:local-builds:v1";
const SHARED_LOADOUT_QUERY_PARAM = "loadout";
const SHARED_PUBLIC_FITTING_QUERY_PARAM = "fitting";
let sharedLoadoutNavigationSequence = 0;
const MAIN_TAB_NAMES = new Set(["mechlab", "equipment-info", "info", "compare", "stats"]);
const SINGLE_MECH_SELECTION_TABS = new Set(["mechlab", "info"]);
let resolveCommunityBridgeReady;
const communityBridgeReady = new Promise((resolve) => { resolveCommunityBridgeReady = resolve; });
let communityLikeCapability = false;
// Fixed MWO escalation curve. Weapon-specific heat, penalty, threshold, and group values come from equipment.json.
const GHOST_HEAT_LEVEL_MULTIPLIERS = Object.freeze([0, 0, 8, 18, 30, 45, 60, 80, 110, 150, 200, 300, 500]);
const GHOST_HEAT_GROUPS = Object.freeze([
  [9, "AC/20 GROUP"],
  [8, "AC/10 GROUP"],
  [7, "CLAN SRM GROUP"],
  [6, "CLAN LRM GROUP"],
  [5, "STREAK SRM GROUP"],
  [4, "IS MRM/SRM GROUP"],
  [3, "LARGE LASER GROUP"],
  [2, "IS LRM/THUNDERBOLD GROUP"],
  [17, "ROCKET LAUNCHER GROUP"],
  [15, "SMALL CLAN LRM GROUP"],
  [13, "AC/5 GROUP"],
  [12, "MEDIUM LASER GROUP"],
  [11, "IS ROTARY AC GROUP"],
  [10, "CLAN SMALL/MEDIUM LASER GROUP"],
  [1, "GAUSS/PPC GROUP"],
  ["singleton", ""],
]);

function normalizeLanguage(value) {
  const language = String(value || "").trim().toLowerCase();
  if (language === "kr" || language === "ko" || language === "ko-kr") return "kr";
  if (language === "en" || language.startsWith("en-")) return "en";
  return "";
}

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLanguage = normalizeLanguage(params.get("lang"));
  if (SUPPORTED_LANGUAGES.has(queryLanguage)) return queryLanguage;

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const language of browserLanguages) {
    const normalized = normalizeLanguage(language);
    if (SUPPORTED_LANGUAGES.has(normalized)) return normalized;
  }
  return DEFAULT_LANGUAGE;
}

const activeLanguage = detectLanguage();

const TEXT = {
  kr: {
    "common.unknown": "알 수 없음",
    "common.item": "항목",
    "common.value": "수치",
    "common.target": "대상",
    "common.ok": "OK",
    "common.check": "확인 필요",
    "common.chassis": "기종",
    "common.variants": "변형",
    "common.models": "모델",
    "common.slots": "슬롯",
    "common.tons": "톤",
    "common.armor": "아머",
    "common.engine": "엔진",
    "common.status": "상태",
    "common.heat": "발열",
    "common.ammo": "탄약",
    "common.alpha": "알파",
    "common.add": "추가",
    "common.remove": "제거",
    "common.empty": "비어 있음",
    "common.baseline": "기준",
    "common.info": "정보",
    "common.rank": "순위",
    "common.average": "평균",
    "common.max": "최대치",
    "common.min": "최소치",
    "language.switcher": "언어 선택",
    "language.kr": "한국어",
    "language.en": "English",
    "status.loadingData": "로컬 데이터 로딩 중...",
    "status.loadedData": "{count}개 멕을 로컬 게임 데이터에서 불러왔습니다",
    "status.fileProtocol": "file://에서는 로컬 데이터를 불러올 수 없습니다. 로컬 프리뷰는 public 폴더를 http://로 서빙하세요.",
    "status.loadPathFailed": "{path} 파일을 불러올 수 없습니다",
    "status.buildSaved": "빌드를 로컬에 저장했습니다",
    "localBuild.save": "저장",
    "localBuild.load": "불러오기",
    "localBuild.saveTitle": "LOCAL SAVE",
    "localBuild.loadTitle": "LOCAL LOAD",
    "localBuild.saveDescription": "현재 피팅의 저장 이름을 입력하세요. 기존 저장 목록도 아래에서 확인할 수 있습니다.",
    "localBuild.loadDescription": "저장된 피팅을 선택하세요. 현재 멕과 같은 항목이 먼저 표시됩니다.",
    "localBuild.nameLabel": "저장 이름",
    "localBuild.namePlaceholder": "저장 이름 입력",
    "localBuild.empty": "저장된 피팅이 없습니다.",
    "localBuild.currentMech": "현재 멕",
    "localBuild.nameRequired": "저장 이름을 입력하세요.",
    "localBuild.saved": "{mech} | {name} 저장 완료",
    "localBuild.loaded": "{mech} | {name} 불러오기 완료",
    "localBuild.storageFailed": "브라우저 로컬 저장소에 저장할 수 없습니다.",
    "localBuild.invalid": "저장된 피팅 데이터를 불러올 수 없습니다.",
    "localBuild.manage": "관리",
    "localBuild.saveMode": "저장 모드",
    "localBuild.delete": "삭제",
    "localBuild.deleted": "{mech} | {name} 삭제 완료",
    "mechlab.tools": "TOOLS",
    "community.actions": "핏팅 브라우저 / 저장하기",
    "community.open": "핏팅 브라우저",
    "community.browse": "브라우저",
    "community.publish": "저장하기/공유하기",
    "community.publicInfo": "공개 핏팅 정보",
    "community.restore": "원상복귀",
    "community.like": "좋아요",
    "community.unlike": "좋아요 취소",
    "community.author": "작성자",
    "community.loginToLike": "로그인 후 좋아요를 사용할 수 있습니다.",
    "skills.open": "스킬 적용",
    "skills.title": "스킬 적용",
    "skills.description": "활성화한 항목의 사용 가능한 모든 노드를 적용합니다.",
    "skills.applyAll": "모두 적용",
    "skills.applyRecommended": "추천 스킬 적용",
    "skills.nodeCount": "{count}개 노드",
    "skills.close": "닫기",
    "skills.category.firepower": "화력",
    "skills.category.survival": "생존",
    "skills.category.mobility": "기동성",
    "skills.category.jumpjets": "점프젯",
    "skills.category.operations": "오퍼레이션",
    "skills.category.sensors": "센서",
    "skills.category.auxiliary": "보조",
    "skills.group.firepowerCooldown": "화력 · 쿨다운",
    "skills.group.firepowerRange": "화력 · 레인지",
    "skills.group.firepowerHeatGen": "화력 · 힛 젠",
    "skills.group.firepowerVelocity": "화력 · 벨로시티",
    "skills.group.firepowerOther": "화력 · 그 외",
    "skills.group.operationsHeatSinks": "오퍼레이션 · 히트싱크 강화 (쿨 런 · 히트 콘테이먼트)",
    "skills.group.operationsOther": "오퍼레이션 · 그 외",
    "ui.open": "개인설정",
    "ui.preferencesTitle": "개인설정",
    "ui.initialFitting": "로드아웃 방식",
    "ui.stockLoadout": "스톡 로드아웃",
    "ui.stripEquipment": "장비 제거",
    "ui.initialArmor": "아머 설정",
    "ui.fullArmor": "풀아머",
    "ui.noArmor": "아머 없음",
    "ui.customArmor": "커스텀",
    "ui.front": "전면",
    "ui.rear": "후면",
    "ui.presetHint": "새로 선택하는 멕에 적용합니다. 부위 한도 기준 %, 소수점 버림. 어깨·몸통 전후면 합계는 100% 이내입니다.",
    "ui.fullArmorHint": "풀아머는 스톡 후면 아머를 유지하고 전면을 최대치로 채웁니다.",
    "ui.tabsLabel": "개인설정 메뉴",
    "ui.loadoutTab": "로드아웃",
    "ui.valuesTab": "수치",
    "ui.commonTab": "공용",
    "ui.armorHead": "머리",
    "ui.armorShoulders": "어깨",
    "ui.armorTorso": "몸통",
    "ui.armorArms": "팔",
    "ui.armorLegs": "다리",
    "ui.valueDisplayTitle": "수치 표기",
    "ui.finalOnly": "최종 결과만 표시",
    "ui.quirkValues": "쿼크 수치 표시",
    "ui.allValues": "모든 수치 표시",
    "ui.simplifyAmmoQuirks": "탄약 쿼크 표시 간소화",
    "ui.showWeaponTooltipQuirks": "장비 툴팁 적용 효과 표시",
    "ui.showRecommendedFittings": "추천 핏팅 보이기",
    "ui.ammoQuirksActive": "탄약 쿼크 적용중",
    "equipmentTooltip.appliedEffects": "적용 효과",
    "ui.on": "ON",
    "ui.off": "OFF",
    "ui.close": "닫기",
    "loadout.import": "IMPORT",
    "loadout.export": "EXPORT",
    "loadout.close": "로드아웃 코드 창 닫기",
    "loadout.apply": "불러오기",
    "loadout.copy": "코드 복사",
    "loadout.copyUrl": "URL 복사",
    "loadout.codeLabel": "EXPORT 코드",
    "loadout.urlLabel": "공유 URL",
    "loadout.importTitle": "MWO 코드 불러오기",
    "loadout.exportTitle": "MWO 코드 내보내기",
    "loadout.importDescription": "MWO MechLab에서 복사한 로드아웃 코드를 붙여 넣으세요.",
    "loadout.exportDescription": "현재 상태를 MWO MechLab에서 사용할 수 있는 코드로 변환했습니다.",
    "loadout.importPlaceholder": "MWO 로드아웃 코드를 붙여 넣으세요",
    "loadout.imported": "{mech} 로드아웃을 불러왔습니다.",
    "loadout.copied": "코드를 클립보드에 복사했습니다.",
    "loadout.urlCopied": "공유 URL을 클립보드에 복사했습니다.",
    "loadout.copyFailed": "클립보드 복사에 실패했습니다. 코드를 직접 선택해 복사하세요.",
    "loadout.invalidMech": "코드의 멕 ID {id}를 현재 데이터에서 찾을 수 없습니다.",
    "loadout.invalidItem": "코드에 현재 데이터에 없는 장비 ID가 있습니다: {id}",
    "loadout.invalidOmnipod": "{component}의 옵니포드 ID가 올바르지 않습니다: {id}",
    "loadout.codecUnavailable": "MWO 코드 모듈을 불러오지 못했습니다.",
    "loadout.urlCodecUnavailable": "이 브라우저에서는 압축 공유 URL을 처리할 수 없습니다.",
    "loadout.invalidSharedUrl": "압축된 공유 URL이 올바르지 않습니다.",
    "mechlab.showList": "멕 리스트",
    "mechlab.returnFitting": "돌아가기",
    "mechlab.returnFittingAria": "마지막 피팅으로 돌아가기",
    "mechlab.addMechFitting": "{mech} 새 피팅 탭에 추가",
    "mechlab.fittingTabs": "멕랩 핏팅 탭",
    "mechlab.addFittingTab": "핏팅 탭 추가",
    "mechlab.closeFittingTab": "{mech} 핏팅 탭 닫기",
    "mechlab.maxFittingTabs": "핏팅 탭은 최대 {max}개까지 열 수 있습니다.",
    "mechlab.ghostHeatWarning": "고스트 힛 발생 가능",
    "mechlab.ghostHeatWarningTitle": "GHOST HEAT WARNING",
    "mechlab.ghostHeatWarningLine": "{weapons} : 발열 {percent} (최종: {totalHeat}, 고스트 힛: {ghostHeat})",
    "weaponDetail.open": "자세히",
    "recommendations.title": "추천 핏팅",
    "recommendations.apply": "적용",
    "alphaHeat.shot": "{n}차 알파샷",
    "alphaHeat.normal": "1차는 열 0%에서 발사한 직후, 2차부터는 이전 알파샷 후 모든 무기의 쿨다운이 끝나는 즉시 다시 발사한 직후의 발열입니다. 고스트 힛은 제외합니다.",
    "alphaHeat.ghost": "1차는 열 0%에서 발사한 직후, 2차부터는 이전 알파샷 후 모든 무기의 쿨다운이 끝나는 즉시 다시 발사한 직후의 발열입니다. 고스트 힛을 포함합니다.",
    "alphaHeat.normal.first": "열 0%에서 첫 알파샷을 발사한 직후의 발열입니다. 고스트 힛은 제외합니다.",
    "alphaHeat.normal.next": "이전 알파샷 후 모든 무기의 쿨다운이 끝나는 즉시 다시 발사했을 때의 발열입니다. 대기 중 냉각을 반영하며 고스트 힛은 제외합니다.",
    "alphaHeat.ghost.first": "열 0%에서 첫 알파샷을 발사한 직후의 발열입니다. 고스트 힛을 포함합니다.",
    "alphaHeat.ghost.next": "이전 알파샷 후 모든 무기의 쿨다운이 끝나는 즉시 다시 발사했을 때의 발열입니다. 대기 중 냉각과 고스트 힛을 반영합니다.",
    "alphaHeat.ato": "ATO: 냉각을 반영해 열용량 100%에 도달하는 예상 알파샷 횟수입니다. 소수는 부분 횟수, ∞는 열이 누적되지 않음을 뜻합니다.",
    "alphaHeat.ghostAto": "고스트 힛을 포함한 ATO입니다. 소수는 부분 횟수, ∞는 열이 누적되지 않음을 뜻합니다.",
    "weaponDetail.title": "무장 상세 정보",
    "weaponDetail.close": "무장 상세 정보 닫기",
    "weaponDetail.distance": "적과의 거리",
    "weaponDetail.frequency": "발사 빈도",
    "weaponDetail.effectiveCooldown": "적용 쿨타임",
    "weaponDetail.applyGhostHeat": "고스트 힛 적용",
    "weaponDetail.rangeCombinationDps": "무기 조합별 최대 DPS",
    "weaponDetail.metricTabs": "무장 지표 보기",
    "weaponDetail.tabBasic": "기본",
    "weaponDetail.tabRange": "사거리 타입",
    "weaponDetail.metricDamage": "데미지",
    "weaponDetail.totalDamage": "총 데미지",
    "weaponDetail.rangeTypes": "사거리 타입",
    "weaponDetail.rangeTypeShort": "단거리",
    "weaponDetail.rangeTypeMedium": "중거리",
    "weaponDetail.rangeTypeLong": "장거리",
    "weaponDetail.metricHeat": "발열",
    "weaponDetail.maxDpsRange": "최대 DPS 구간",
    "weaponDetail.nearMaxDamage": "99% 데미지",
    "weaponDetail.minDamageRange": "0% 데미지",
    "weaponDetail.zeroDamageRange": "권외",
    "weaponDetail.location": "장착 위치",
    "weaponDetail.actualDamage": "실제 데미지",
    "weaponDetail.baseDamage": "기본 데미지",
    "weaponDetail.range": "사거리 (최소/적정/최대)",
    "simulation.open": "시뮬레이션",
    "simulation.title": "DPS 시뮬레이션",
    "simulation.hint": "버튼 또는 숫자 키 1~4를 누르고 있는 동안 해당 그룹을 발사합니다.",
    "simulation.close": "시뮬레이션 닫기",
    "simulation.elapsed": "경과 시간",
    "simulation.damage": "누적 데미지",
    "simulation.heat": "발열",
    "simulation.overheated": "오버히트",
    "simulation.scenario": "시나리오",
    "simulation.scenarioSelect": "시나리오 선택",
    "simulation.scenarioFree": "0. 자유 모드 / 시간제한 없음",
    "simulation.scenarioStationary": "1. 고정 표적",
    "simulation.scenarioBrawl44": "2. 4초 노출 / 2초 엄폐",
    "simulation.scenarioBrawl153": "3. 2초 노출 / 3초 엄폐",
    "simulation.movementState": "이동 상태",
    "simulation.stationary": "정지",
    "simulation.moving": "이동중",
    "simulation.movementHelp": "100% 속력으로 이동할 때 초당 0.3의 발열이 추가됩니다.",
    "simulation.mapTemperature": "맵 온도",
    "simulation.temperatureLow": "낮음",
    "simulation.temperatureNormal": "보통",
    "simulation.temperatureHigh": "높음",
    "simulation.temperatureVeryHigh": "매우 높음",
    "simulation.temperatureHelp": "맵 온도에 따라 초당 냉각량이 낮음 +0.15, 보통 0, 높음 -0.15, 매우 높음 -0.3만큼 보정됩니다.",
    "simulation.targetDistance": "적과의 거리",
    "simulation.distanceHelp": "최소 사거리 미만은 피해가 없고, 최소~적정 사거리는 100%, 적정~최대 사거리는 무기별 규칙에 따라 감소합니다.",
    "simulation.applySplash": "스플래쉬 적용",
    "simulation.endOnOverheat": "오버히트 시 종료",
    "simulation.endOnOverheatHelp": "활성화하면 최대 발열에 도달하는 즉시 발사와 측정을 종료합니다.",
    "simulation.noTimeLimit": "시간제한 없음",
    "simulation.targetVisible": "적 노출",
    "simulation.targetHidden": "적 엄폐 · 데미지 무효",
    "simulation.scenarioComplete": "시나리오 완료",
    "simulation.groups": "무기 그룹 지정",
    "simulation.reset": "측정 초기화",
    "simulation.weapon": "무기",
    "simulation.damageShort": "데미지",
    "simulation.cycle": "주기",
    "simulation.cooldown": "쿨타임",
    "simulation.group": "그룹",
    "simulation.groupStatus": "무기 그룹 상태",
    "simulation.noWeapons": "장착된 무기가 없습니다.",
    "tabs.mechlab": "멕랩",
    "tabs.equipmentInfo": "무장 정보",
    "tabs.info": "정보",
    "tabs.compare": "비교하기",
    "tabs.stats": "통계",
    "donate.label": "후원하기",
    "donate.aria": "후원 방법 열기",
    "donate.title": "후원하기",
    "donate.qrAlt": "카카오페이 후원 QR 코드",
    "donate.kofi": "Ko-fi로 후원하기",
    "donate.close": "닫기",
    "privacy.link": "개인정보",
    "help.aria": "도움말 열기",
    "help.dialogAria": "도움말",
    "help.close": "닫기",
    "help.tipsTitle": "간략한 팁",
    "help.mechlabTitle": "멕랩",
    "help.tipAssign": "장비 리스트를 클릭하거나 장착한 장비를 더블 클릭하면 같은 장비를 자동 할당합니다.",
    "help.tipRemove": "장착한 장비를 마우스 오른쪽 버튼으로 한 번 클릭하면 해제합니다.",
    "help.termsTitle": "용어 설명",
    "help.dps": "Damage Per Second. 초당 피해량입니다.",
    "help.dph": "Damage Per Heat. 발열 1점당 피해량이며 피해량을 발열로 나눈 값입니다.",
    "help.hps": "Heat Per Second. 초당 발생하는 발열량입니다.",
    "help.expectedCooldown": "충전·연속 발사·지속 시간과 울트라 오토캐논의 잼 확률까지 반영한 예상 발사 간격입니다.",
    "help.blogTitle": "블로그 주소",
    "search.mechPlaceholder": "기종 또는 변형 검색",
    "search.itemPlaceholder": "장비 검색",
    "list.smallView": "작은 리스트 보기",
    "list.largeView": "큰 리스트 보기",
    "list.noMechs": "현재 필터와 일치하는 멕이 없습니다.",
    "list.chassisVariants": "{chassis} 기종 / {variants} 변형",
    "list.variantCount": "{count} 변형",
    "filters.allFactions": "모든 진영",
    "filters.allWeightClasses": "모든 체급",
    "filters.open": "필터",
    "filters.title": "멕 필터",
    "filters.basic": "기본 필터",
    "filters.basicTab": "기본",
    "filters.tabs": "멕 필터 카테고리",
    "filters.specialFeaturesTab": "특수기능",
    "filters.quirksTab": "쿼크",
    "filters.quirkMatchMode": "쿼크 포함 방식",
    "filters.quirkList": "쿼크 목록",
    "filters.quirkSearch": "쿼크 검색",
    "filters.minimumQuirkValue": "최소 쿼크 수치",
    "filters.clearQuirkSelections": "선택 모두 해제",
    "filters.noQuirkResults": "일치하는 쿼크가 없습니다.",
    "filters.matchAllQuirks": "모두 포함",
    "filters.matchAnyQuirk": "하나라도 포함",
    "filters.specialNotes": "특수 사항",
    "filters.specialEquipment": "특수 장비",
    "filters.noJumpShake": "점프젯 사용 시 흔들림 없음",
    "filters.jamImmune": "잼 안 걸림",
    "filters.fallResistant": "낙하 데미지 없음",
    "filters.critImmune": "크리티컬 안 받음",
    "filters.compactGyro": "COMPACT GYRO",
    "filters.xlGyro": "XL GYRO",
    "filters.compactCockpit": "COMPACT COCKPIT",
    "filters.noArmActuators": "Upper Arm 액추에이터 없음",
    "filters.laserHeatSinks": "레이저 히트 싱크",
    "filters.tacticonB2000": "Tacticon B-2000",
    "filters.shield": "방패",
    "filters.supercharger": "SUPERCHARGER",
    "filters.mascSupercharger": "SUPERCHARGER + MASC",
    "filters.specialWeapon": "특수 무기",
    "filters.improvedJumpJets": "강화된 점프젯",
    "filters.partialWing": "Partial Wing 점프젯",
    "filters.specialTargetComputer": "특수 타겟컴",
    "filters.noJumpShakeDescription": "점프젯 사용 중 화면 흔들림이 없습니다.",
    "filters.jamImmuneDescription": "잼 확률 감소 100%",
    "filters.fallResistantDescription": "낙하 데미지 감소 50% 이상",
    "filters.critImmuneDescription": "CRIT HIT CHANCE (RECEIVING) 감소 100%",
    "filters.compactGyroDescription": "슬롯 감소, 톤 증가",
    "filters.xlGyroDescription": "슬롯 증가, 톤 감소",
    "filters.compactCockpitDescription": "슬롯 감소, 톤 감소",
    "filters.noArmActuatorsDescription": "팔에 슬롯 -1, 팔 움직임 불가능",
    "filters.laserHeatSinksDescription": "환경 열 100% 무시",
    "filters.tacticonB2000Description": "아군 센서 레인지 증가",
    "filters.shieldDescription": "더 많은 아머, 톤 증가",
    "filters.superchargerDescription": "톤·슬롯이 적은 MASC, 가속 없음",
    "filters.mascSuperchargerDescription": "기본 속도 증가, 더 높은 보너스, 톤 증가",
    "filters.specialWeaponDescription": "진영 무시 NOBLE AC/20·레일건·에로우 장착",
    "filters.improvedJumpJetsDescription": "IMPROVED JUMPJET 옵니포드를 사용하는 점프젯",
    "filters.partialWingDescription": "글라이딩 효과가 있는 점프젯",
    "filters.specialTargetComputerDescription": "무기 작동 방식 변경",
    "filters.faction": "진영",
    "filters.weightClass": "체급",
    "filters.mechType": "멕 종류",
    "filters.hardpoints": "하드포인트",
    "filters.hardpointType": "하드포인트 종류",
    "filters.total": "전체",
    "filters.all": "모두",
    "filters.normal": "일반형",
    "filters.hero": "히어로",
    "filters.champion": "챔피언",
    "filters.special": "스페셜",
    "filters.clan": "클랜",
    "filters.innerSphere": "이너",
    "filters.close": "닫기",
    "filters.allEquipment": "모든 장비",
    "filters.weapons": "무기",
    "filters.ammo": "탄약",
    "filters.engines": "엔진",
    "filters.equipment": "장비",
    "filters.jumpjets": "점프젯",
    "filters.masc": "MASC",
    "filters.weaponMods": "무기 모드",
    "filters.omnipods": "옵니포드",
    "filters.equipmentCategory": "장비 카테고리",
    "equipment.section.heatsinks": "HEAT SINKS",
    "equipment.section.targetComputers": "MODULES · BAP / CAP / ASP",
    "equipment.section.utility": "EQUIPMENT · MASC / ECM / JUMP JETS",
    "equipment.section.engineXl": "XL ENGINES",
    "equipment.section.engineLight": "LIGHT ENGINES",
    "equipment.section.engineStd": "STD ENGINES",
    "equipmentInfo.category": "무장 정보 카테고리",
    "equipmentInfo.weapons": "무기",
    "equipmentInfo.ammo": "탄약",
    "equipmentInfo.modules": "모듈",
    "equipmentInfo.ghostHeat": "고스트 힛",
    "equipmentInfo.ghostHeatRules": "고스트 힛 규칙",
    "equipmentInfo.ghostHeatRuleSummary1": "같은 그룹의 무기를 동시에 발사해 제한 수를 넘으면 고스트 힛이 발생합니다.",
    "equipmentInfo.ghostHeatRuleSummary2": "무기별 추가 발열 후보 중 가장 높은 값 하나만 기본 발열 합계에 더합니다.",
    "equipmentInfo.ghostHeatExampleAc20": "AC/20 계열 예시",
    "equipmentInfo.ghostHeatExampleAc10": "AC/10 계열 예시",
    "equipmentInfo.ghostHeatExampleComposition": "{weapons} 동시 발사 · 총 {count}문",
    "equipmentInfo.ghostHeatExampleCandidates": "무기별 추가 발열 후보: {candidates}",
    "equipmentInfo.ghostHeatExampleCandidate": "{weapon} ({threshold}문부터 발생) {heat}",
    "equipmentInfo.ghostHeatExampleResult": "적용 결과: 기본 발열 {baseHeat} + 가장 높은 추가 발열 {extraHeat} = 총 발열 {totalHeat}",
    "equipmentInfo.individualGroup": "개별 그룹",
    "equipmentInfo.individualGroupNote": "개별 그룹으로 서로 영향 없음",
    "equipmentInfo.noResults": "표시할 장비가 없습니다.",
    "equipmentInfo.comingSoon": "고스트 힛 정보는 추후 개발 예정입니다.",
    "equipmentInfo.name": "이름",
    "equipmentInfo.damage": "데미지",
    "equipmentInfo.cooldown": "쿨다운",
    "equipmentInfo.expectedCooldown": "예상 쿨다운",
    "equipmentInfo.duration": "듀레이션",
    "equipmentInfo.spread": "탄 퍼짐",
    "equipmentInfo.spreadDirect": "탄 퍼짐 다이렉트",
    "equipmentInfo.dph": "DPH",
    "equipmentInfo.weaponType": "계열",
    "equipmentInfo.spreadWeapons": "탄 퍼짐 무기",
    "equipmentInfo.losWeapons": "LOS 무기",
    "equipmentInfo.criticalWeapons": "크리티컬 무기",
    "equipmentInfo.jamWeapons": "잼 무기",
    "equipmentInfo.criticalChance": "크리티컬 찬스 배율",
    "equipmentInfo.criticalDamage": "크리티컬 데미지",
    "equipmentInfo.optimalRange": "적정 사거리",
    "equipmentInfo.maxRange": "최대 사거리",
    "equipmentInfo.velocity": "탄속",
    "equipmentInfo.velocityDirect": "탄속 다이렉트",
    "equipmentInfo.dps": "DPS",
    "equipmentInfo.hps": "HPS",
    "equipmentInfo.health": "내구도",
    "equipmentInfo.allAmmo": "모든 탄약",
    "equipmentInfo.missileAmmo": "미사일 탄약",
    "equipmentInfo.ballisticAmmo": "발리스틱 탄약",
    "equipmentInfo.sharedAmmoTitle": "{ammo} 공유 탄약",
    "equipmentInfo.ammoCount": "탄약 수",
    "equipmentInfo.totalDamage": "총 데미지",
    "equipmentInfo.internalDamage": "피폭 데미지",
    "equipmentInfo.sharedWeapon": "공유 무기",
    "equipmentInfo.fireCount": "발사 가능 횟수",
    "equipmentInfo.faction": "진영",
    "equipmentInfo.sensorRange": "센서 거리",
    "equipmentInfo.targetingTime": "타겟팅 시간",
    "equipmentInfo.shutdownDetection": "정지 멕 탐지",
    "equipmentInfo.beamRange": "빔 사거리",
    "equipmentInfo.projectileVelocity": "투사체 탄속",
    "equipmentInfo.targetComputers": "타겟 컴퓨터",
    "equipmentInfo.activeProbes": "액티브 프로브",
    "equipmentInfo.masc": "MASC / 슈퍼차저",
    "equipmentInfo.tonsRange": "적용 톤수",
    "equipmentInfo.speedBoost": "속도 부스트",
    "equipmentInfo.accelerationBoost": "가속 부스트",
    "equipmentInfo.decelerationBoost": "감속 부스트",
    "equipmentInfo.turnBoost": "회전 부스트",
    "equipmentInfo.ecm": "ECM",
    "equipmentInfo.ecmRange": "ECM 범위",
    "equipmentInfo.enemyTargetingReduction": "적 타겟팅 속도 감소",
    "equipmentInfo.enemyLockOnReduction": "적 락온 속도 감소",
    "equipmentInfo.jumpJets": "점프젯",
    "equipmentInfo.initialThrust": "초기 추력",
    "equipmentInfo.verticalThrust": "수직 추력",
    "equipmentInfo.forwardThrust": "전방 추력",
    "equipmentInfo.heatSinks": "히트싱크",
    "equipmentInfo.heatCapacity": "열용량",
    "equipmentInfo.heatDissipation": "냉각/초",
    "equipmentInfo.engineHeatCapacity": "엔진 열용량",
    "equipmentInfo.engineHeatDissipation": "엔진 냉각/초",
    "sort.default": "기본 정렬",
    "sort.tons": "톤수 정렬",
    "sort.alphabetical": "알파벳순",
    "sort.title": "정렬 설정",
    "sort.close": "정렬 팝업 닫기",
    "sort.open": "정렬",
    "sort.criterion": "정렬 기준",
    "sort.direction": "정렬 방향",
    "sort.ascending": "오름차순",
    "sort.descending": "내림차순",
    "sort.groupFaction": "진영별 표시",
    "weight.light": "라이트",
    "weight.medium": "미디엄",
    "weight.heavy": "헤비",
    "weight.assault": "어썰트",
    "faction.Clan": "클랜",
    "faction.InnerSphere": "이너스피어",
    "component.head": "머리",
    "component.leftArm": "왼쪽 팔",
    "component.leftTorso": "왼쪽 어깨",
    "component.centerTorso": "몸통",
    "component.rightTorso": "오른쪽 어깨",
    "component.rightArm": "오른쪽 팔",
    "component.leftLeg": "왼쪽 다리",
    "component.rightLeg": "오른쪽 다리",
    "info.selectMech": "멕을 선택하세요",
    "info.selectMechHint": "왼쪽 목록에서 카테고리를 펼친 뒤 멕을 선택하세요.",
    "info.applyQuirks": "쿼크 적용",
    "info.quirkSummary": "쿼크 서머리",
    "info.ammoQuirks": "탄약 쿼크",
    "info.noSpecialQuirks": "특수 쿼크 없음",
    "info.specialQuirks": "특수 쿼크",
    "info.cooldown": "쿨 다운",
    "info.durability": "내구도",
    "info.range": "사거리",
    "info.velocity": "탄속",
    "info.combinedDurability": "종합 내구",
    "info.durabilitySummary": "내구도 요약",
    "info.mobility": "기동성",
    "info.structureInfo": "스트럭쳐 정보",
    "info.armorInfo": "아머 정보",
    "info.engine": "엔진",
    "info.part": "부위",
    "info.stat": "항목",
    "info.armorStructureTotal": "아머 + 스트럭쳐 총합",
    "info.maxSpeed": "최대 속도",
    "info.acceleration": "가속도",
    "info.deceleration": "감속도",
    "info.turnSpeed": "선회 속도",
    "info.angleX": "회전각 X",
    "info.angleY": "회전각 Y",
    "info.torsoSpeed": "몸통 회전속도",
    "info.structureTotal": "스트럭쳐 총합",
    "info.maxArmorTotal": "최대 아머 포인트 총합",
    "info.minEngine": "최소 엔진",
    "info.maxEngine": "최대 엔진",
    "info.noQuirks": "쿼크가 없습니다",
    "info.noQuirksForMech": "이 멕에 표시할 쿼크가 없습니다.",
    "info.quirksPrompt": "멕을 선택하면 쿼크가 표시됩니다.",
    "info.componentsPrompt": "멕을 선택하면 구성 부품이 표시됩니다.",
    "compare.title": "멕 비교",
    "compare.clear": "비교 리스트 모두 지우기",
    "compare.showDeltas": "차이 표시",
    "compare.empty": "왼쪽 리스트에서 비교할 멕을 선택하세요.",
    "compare.selected": "{count}/{max} 선택됨",
    "compare.removeAria": "{name} 비교에서 제거",
    "compare.setBaseline": "기준으로 설정",
    "compare.maxSelected": "비교는 최대 {max}개까지 선택할 수 있습니다.",
    "stats.kind": "통계 종류",
    "stats.collapse": "통계 하위 메뉴 접기",
    "stats.expand": "통계 하위 메뉴 펼치기",
    "stats.rankMode": "순위 표시 방식",
    "stats.individual": "개별",
    "stats.chassis": "기종별",
    "stats.aggregateMode": "기종별 집계 방식",
    "stats.category": "통계 카테고리",
    "stats.cooldownScope": "쿨다운 하위 메뉴",
    "stats.quirkDurabilityScope": "내구도 쿼크 하위 메뉴",
    "stats.heatScope": "발열 하위 메뉴",
    "stats.rangeScope": "사거리 하위 메뉴",
    "stats.velocityScope": "탄속 하위 메뉴",
    "stats.scope": "내구도 범위",
    "stats.mode": "순위 비교 방식",
    "stats.workspace": "통계",
    "stats.filterAxis": "필터 기준",
    "stats.weightSelect": "체급 선택",
    "stats.tonsSelect": "톤수 선택",
    "stats.detail": "통계 상세",
    "stats.fit": "핏팅하기",
    "stats.total": "총합",
    "stats.structure": "스트럭쳐",
    "stats.all": "전체",
    "stats.torsoShoulders": "어깨+몸통",
    "stats.torso": "몸통",
    "stats.shoulders": "어깨",
    "stats.allList": "전체 목록",
    "stats.filter": "필터",
    "stats.faction": "진영",
    "stats.compareBy": "비교 기준",
    "stats.weight": "체급",
    "stats.tons": "톤수",
    "stats.noSelection": "왼쪽 목록에서 멕을 선택하세요.",
    "stats.noRows": "해당하는 멕 없음",
    "stats.noHardpoints": "하드포인트 없음",
    "stats.hideZeroQuirks": "적용받은 쿼크가 없으면 미표시",
    "stats.specCompare": "기종별 스펙 비교",
    "stats.chassisInfo": "기본 정보",
    "stats.modelCount": "모델 수",
    "stats.hardpoints": "하드포인트",
    "stats.energy": "에너지",
    "stats.missile": "미사일",
    "stats.ballistic": "발리스틱",
    "stats.duration": "듀레이션",
    "stats.rotaryRof": "로터리 ROF",
    "stats.machineGunRof": "머신건 ROF",
    "stats.heatDissipation": "열 방출",
    "stats.additionalSensor": "추가 센서",
    "stats.jamChance": "잼찬스",
    "stats.jamDuration": "잼 듀레이션",
    "stats.quirkSelect": "쿼크 선택",
    "equipment.noItem": "장비가 선택되지 않았습니다",
    "build.noEngine": "엔진 없음",
    "build.engineOutside": "엔진 {rating}이 허용 범위 {min}-{max} 밖입니다",
    "build.engineTorsoOnly": "엔진은 중앙 몸통에만 장착할 수 있습니다",
    "build.engineFixed": "이 옴니멕의 엔진은 고정되어 있습니다",
    "build.engineHeatSinks": "엔진 히트싱크",
    "build.engineHeatSinkOnly": "엔진 내부에는 히트싱크만 장착할 수 있습니다",
    "build.engineHeatSinkFull": "엔진 히트싱크 슬롯이 가득 찼습니다",
    "build.engineHeatSinksFixed": "옴니멕의 엔진 히트싱크는 고정되어 변경할 수 없습니다",
    "build.removeEngineHeatSink": "엔진 히트싱크 제거",
    "build.addEngineHeatSink": "엔진 히트싱크 추가",
    "build.noAutoInstallLocation": "장착 가능한 부위가 없습니다",
    "build.noEngineHeatSinkSlots": "이 엔진에는 추가 히트싱크 슬롯이 없습니다",
    "build.heatSinkMismatch": "{item}은(는) 현재 히트싱크 업그레이드와 호환되지 않습니다",
    "build.jumpJetFull": "점프젯 장착 한도를 초과합니다 ({used}/{limit})",
    "build.jumpJetLocation": "점프젯은 좌·중앙·우 몸통 또는 다리에만 장착할 수 있습니다",
    "build.equipmentGroupFull": "{group} 장착 한도를 초과합니다 ({used}/{limit})",
    "build.artemisRequired": "{item}은(는) 아르테미스 업그레이드가 필요합니다",
    "build.standardGuidanceRequired": "{item}은(는) 스탠다드 유도 장치에서만 사용할 수 있습니다",
    "build.structureSlotsUnavailable": "엔도스틸 슬롯 {count}칸을 배치할 공간이 부족합니다",
    "build.armorSlotsUnavailable": "아머 업그레이드 슬롯 {count}칸을 배치할 공간이 부족합니다",
    "build.upgradeSlotsUnavailable": "업그레이드 슬롯 {count}칸을 배치할 공간이 부족합니다",
    "build.missingItem": "누락된 장비 {id}",
    "build.missing": "{id} 누락",
    "build.factionMismatch": "{item}은(는) {faction} 멕에 장착할 수 없습니다",
    "quirk.cooldownSummary": "쿨 다운 서머리",
    "quirk.heatSummary": "발열 서머리",
    "quirk.velocitySummary": "탄속 서머리",
    "quirk.rangeSummary": "사거리 서머리",
    "quirk.durationSummary": "듀레이션/ROF 서머리",
    "quirk.spreadSummary": "탄퍼짐 서머리",
    "quirk.durabilitySummary": "내구도 서머리",
    "quirk.maxCooldown": "MAX 쿨 다운",
    "quirk.energyCooldown": "ENERGY 쿨 다운",
    "quirk.missileCooldown": "MISSILE 쿨 다운",
    "quirk.ballisticCooldown": "BALLISTIC 쿨 다운",
    "quirk.maxHeatReduction": "MAX 발열 감소",
    "quirk.energyHeat": "ENERGY 발열",
    "quirk.missileHeat": "MISSILE 발열",
    "quirk.ballisticHeat": "BALLISTIC 발열",
    "quirk.heatDissipation": "HEAT DISSIPATION",
    "quirk.maxVelocity": "MAX 탄속",
    "quirk.energyVelocity": "ENERGY 탄속",
    "quirk.missileVelocity": "MISSILE 탄속",
    "quirk.ballisticVelocity": "BALLISTIC 탄속",
    "quirk.maxRange": "MAX 사거리",
    "quirk.energyRange": "ENERGY 사거리",
    "quirk.missileRange": "MISSILE 사거리",
    "quirk.ballisticRange": "BALLISTIC 사거리",
    "quirk.additionalSensor": "추가 센서",
    "quirk.maxDuration": "MAX 듀레이션/ROF",
    "quirk.energyDuration": "ENERGY 듀레이션",
    "quirk.mgRof": "MG ROF",
    "quirk.racRof": "RAC ROF",
    "quirk.amsRof": "AMS ROF",
    "quirk.maxSpread": "MAX 탄퍼짐",
    "quirk.missileSpread": "MISSILE 탄퍼짐",
    "quirk.ballisticSpread": "BALLISTIC 탄퍼짐",
    "quirk.maxDurability": "MAX 내구도",
    "quirk.armor": "아머",
    "quirk.structure": "스트럭쳐",
    "quirk.critPrevent": "크리 방지",
    "special.jumpjets": "점프젯",
    "special.narcDuration": "NARC 지속시간"
  },
  en: {
    "common.unknown": "Unknown",
    "common.item": "Item",
    "common.value": "Value",
    "common.target": "Target",
    "common.ok": "OK",
    "common.check": "Check",
    "common.chassis": "chassis",
    "common.variants": "variants",
    "common.models": "models",
    "common.slots": "slots",
    "common.tons": "tons",
    "common.armor": "Armor",
    "common.engine": "Engine",
    "common.status": "Status",
    "common.heat": "Heat",
    "common.ammo": "Ammo",
    "common.alpha": "Alpha",
    "common.add": "Add",
    "common.remove": "Remove",
    "common.empty": "Empty",
    "common.baseline": "Baseline",
    "common.info": "Info",
    "common.rank": "Rank",
    "common.average": "Average",
    "common.max": "Max",
    "common.min": "Min",
    "language.switcher": "Language",
    "language.kr": "한국어",
    "language.en": "English",
    "status.loadingData": "Loading local data...",
    "status.loadedData": "{count} mechs loaded from local game data",
    "status.fileProtocol": "Local data cannot be loaded from file://. Serve the public folder over http:// for local preview.",
    "status.loadPathFailed": "Could not load {path}",
    "status.buildSaved": "Build saved locally",
    "localBuild.save": "Save",
    "localBuild.load": "Load",
    "localBuild.saveTitle": "LOCAL SAVE",
    "localBuild.loadTitle": "LOCAL LOAD",
    "localBuild.saveDescription": "Name the current fitting. Your existing local saves are listed below.",
    "localBuild.loadDescription": "Choose a saved fitting. Saves for the current mech are shown first.",
    "localBuild.nameLabel": "Save name",
    "localBuild.namePlaceholder": "Enter a save name",
    "localBuild.empty": "No locally saved fittings.",
    "localBuild.currentMech": "Current mech",
    "localBuild.nameRequired": "Enter a save name.",
    "localBuild.saved": "Saved {mech} | {name}",
    "localBuild.loaded": "Loaded {mech} | {name}",
    "localBuild.storageFailed": "Could not write to browser local storage.",
    "localBuild.invalid": "The saved fitting data could not be loaded.",
    "localBuild.manage": "Manage",
    "localBuild.saveMode": "Save mode",
    "localBuild.delete": "Delete",
    "localBuild.deleted": "Deleted {mech} | {name}",
    "mechlab.tools": "TOOLS",
    "community.actions": "Fitting Browser / Save",
    "community.open": "Fitting Browser",
    "community.browse": "Browse",
    "community.publish": "Save / Share",
    "community.publicInfo": "Public fitting",
    "community.restore": "Restore original",
    "community.like": "Like",
    "community.unlike": "Unlike",
    "community.author": "Author",
    "community.loginToLike": "Sign in to like this fitting.",
    "skills.open": "Apply skills",
    "skills.title": "Apply skills",
    "skills.description": "Applies every available node in each enabled group.",
    "skills.applyAll": "Apply all",
    "skills.applyRecommended": "Apply recommended",
    "skills.nodeCount": "{count} nodes",
    "skills.close": "Close",
    "skills.category.firepower": "Firepower",
    "skills.category.survival": "Survival",
    "skills.category.mobility": "Mobility",
    "skills.category.jumpjets": "Jump Jets",
    "skills.category.operations": "Operations",
    "skills.category.sensors": "Sensors",
    "skills.category.auxiliary": "Auxiliary",
    "skills.group.firepowerCooldown": "Firepower · Cooldown",
    "skills.group.firepowerRange": "Firepower · Range",
    "skills.group.firepowerHeatGen": "Firepower · Heat Gen",
    "skills.group.firepowerVelocity": "Firepower · Velocity",
    "skills.group.firepowerOther": "Firepower · Other",
    "skills.group.operationsHeatSinks": "Operations · Heat Sinks (Cool Run · Heat Containment)",
    "skills.group.operationsOther": "Operations · Other",
    "ui.open": "Preferences",
    "ui.preferencesTitle": "Preferences",
    "ui.initialFitting": "Loadout mode",
    "ui.stockLoadout": "Stock loadout",
    "ui.stripEquipment": "Strip equipment",
    "ui.initialArmor": "Armor settings",
    "ui.fullArmor": "Full armor",
    "ui.noArmor": "No armor",
    "ui.customArmor": "Custom",
    "ui.front": "Front",
    "ui.rear": "Rear",
    "ui.presetHint": "Applies to newly selected mechs. Percentages use location capacity, rounded down. Shoulder and torso front and rear total at most 100%.",
    "ui.fullArmorHint": "Full armor keeps stock rear armor and fills the remaining capacity at the front.",
    "ui.tabsLabel": "Preferences menu",
    "ui.loadoutTab": "Loadout",
    "ui.valuesTab": "Values",
    "ui.commonTab": "Common",
    "ui.armorHead": "Head",
    "ui.armorShoulders": "Shoulders",
    "ui.armorTorso": "Torso",
    "ui.armorArms": "Arms",
    "ui.armorLegs": "Legs",
    "ui.valueDisplayTitle": "Value display",
    "ui.finalOnly": "Final result only",
    "ui.quirkValues": "Show quirk value",
    "ui.allValues": "Show all values",
    "ui.simplifyAmmoQuirks": "Simplify ammo quirks",
    "ui.showWeaponTooltipQuirks": "Show applied effects in item tooltips",
    "ui.showRecommendedFittings": "Show recommended fittings",
    "ui.ammoQuirksActive": "Ammo quirks active",
    "equipmentTooltip.appliedEffects": "APPLIED EFFECTS",
    "ui.on": "ON",
    "ui.off": "OFF",
    "ui.close": "Close",
    "loadout.import": "IMPORT",
    "loadout.export": "EXPORT",
    "loadout.close": "Close loadout code dialog",
    "loadout.apply": "Import",
    "loadout.copy": "Copy code",
    "loadout.copyUrl": "Copy URL",
    "loadout.codeLabel": "EXPORT CODE",
    "loadout.urlLabel": "SHARE URL",
    "loadout.importTitle": "Import MWO code",
    "loadout.exportTitle": "Export MWO code",
    "loadout.importDescription": "Paste a loadout code copied from the MWO MechLab.",
    "loadout.exportDescription": "The current build has been converted to an MWO-compatible code.",
    "loadout.importPlaceholder": "Paste an MWO loadout code",
    "loadout.imported": "Imported the {mech} loadout.",
    "loadout.copied": "Copied the code to the clipboard.",
    "loadout.urlCopied": "Copied the share URL to the clipboard.",
    "loadout.copyFailed": "Clipboard access failed. Select and copy the code manually.",
    "loadout.invalidMech": "Mech ID {id} from the code is not present in the current data.",
    "loadout.invalidItem": "The code contains an equipment ID not present in the current data: {id}",
    "loadout.invalidOmnipod": "Invalid omnipod ID for {component}: {id}",
    "loadout.codecUnavailable": "The MWO code module could not be loaded.",
    "loadout.urlCodecUnavailable": "This browser cannot process compressed share URLs.",
    "loadout.invalidSharedUrl": "The compressed share URL is invalid.",
    "mechlab.showList": "Mech List",
    "mechlab.returnFitting": "RETURN",
    "mechlab.returnFittingAria": "Return to the last fitting",
    "mechlab.addMechFitting": "Add {mech} in a new fitting tab",
    "mechlab.fittingTabs": "MechLab fitting tabs",
    "mechlab.addFittingTab": "Add fitting tab",
    "mechlab.closeFittingTab": "Close {mech} fitting tab",
    "mechlab.maxFittingTabs": "You can open up to {max} fitting tabs.",
    "mechlab.ghostHeatWarning": "Ghost heat possible",
    "mechlab.ghostHeatWarningTitle": "GHOST HEAT WARNING",
    "mechlab.ghostHeatWarningLine": "{weapons}: heat {percent} (final: {totalHeat}, ghost heat: {ghostHeat})",
    "weaponDetail.open": "Details",
    "recommendations.title": "Recommended fittings",
    "recommendations.apply": "Apply",
    "alphaHeat.shot": "Alpha strike {n}",
    "alphaHeat.normal": "Heat after the first alpha strike from 0%, then after firing again as soon as all weapons finish cooling down from the previous strike. Excludes ghost heat.",
    "alphaHeat.ghost": "Heat after the first alpha strike from 0%, then after firing again as soon as all weapons finish cooling down from the previous strike. Includes ghost heat.",
    "alphaHeat.normal.first": "Heat immediately after the first alpha strike, starting at 0%. Excludes ghost heat.",
    "alphaHeat.normal.next": "Heat after firing again as soon as all weapons finish cooling down from the previous alpha strike. Includes cooling while waiting; excludes ghost heat.",
    "alphaHeat.ghost.first": "Heat immediately after the first alpha strike, starting at 0%. Includes ghost heat.",
    "alphaHeat.ghost.next": "Heat after firing again as soon as all weapons finish cooling down from the previous alpha strike. Includes cooling while waiting and ghost heat.",
    "alphaHeat.ato": "ATO: estimated alpha strikes to reach 100% heat, including cooling. Decimals represent partial strikes; ∞ means heat does not accumulate.",
    "alphaHeat.ghostAto": "ATO including ghost heat. Decimals represent partial strikes; ∞ means heat does not accumulate.",
    "weaponDetail.title": "Weapon Details",
    "weaponDetail.close": "Close weapon details",
    "weaponDetail.distance": "Target distance",
    "weaponDetail.frequency": "Fire frequency",
    "weaponDetail.effectiveCooldown": "Effective cooldown",
    "weaponDetail.applyGhostHeat": "Apply ghost heat",
    "weaponDetail.rangeCombinationDps": "Max DPS by weapon set",
    "weaponDetail.metricTabs": "Weapon metric view",
    "weaponDetail.tabBasic": "Basic",
    "weaponDetail.tabRange": "Range type",
    "weaponDetail.metricDamage": "Damage",
    "weaponDetail.totalDamage": "Total damage",
    "weaponDetail.rangeTypes": "Range types",
    "weaponDetail.rangeTypeShort": "Short range",
    "weaponDetail.rangeTypeMedium": "Medium range",
    "weaponDetail.rangeTypeLong": "Long range",
    "weaponDetail.metricHeat": "Heat",
    "weaponDetail.maxDpsRange": "Maximum DPS range",
    "weaponDetail.nearMaxDamage": "99% damage",
    "weaponDetail.minDamageRange": "0% damage",
    "weaponDetail.zeroDamageRange": "Out of range",
    "weaponDetail.location": "Location",
    "weaponDetail.actualDamage": "Actual damage",
    "weaponDetail.baseDamage": "Base damage",
    "weaponDetail.range": "Range (min/optimal/max)",
    "simulation.open": "Simulation",
    "simulation.title": "DPS Simulation",
    "simulation.hint": "Hold buttons or number keys 1-4 to fire the assigned weapon groups.",
    "simulation.close": "Close simulation",
    "simulation.elapsed": "Elapsed",
    "simulation.damage": "Total damage",
    "simulation.heat": "Heat",
    "simulation.overheated": "OVERHEATED",
    "simulation.scenario": "Scenario",
    "simulation.scenarioSelect": "Select scenario",
    "simulation.scenarioFree": "0. Free mode / No time limit",
    "simulation.scenarioStationary": "1. Stationary target",
    "simulation.scenarioBrawl44": "2. 4s exposed / 2s covered",
    "simulation.scenarioBrawl153": "3. 2s exposed / 3s covered",
    "simulation.movementState": "Movement",
    "simulation.stationary": "Stationary",
    "simulation.moving": "Moving",
    "simulation.movementHelp": "Moving at 100% speed adds 0.3 heat per second.",
    "simulation.mapTemperature": "Map temperature",
    "simulation.temperatureLow": "Low",
    "simulation.temperatureNormal": "Normal",
    "simulation.temperatureHigh": "High",
    "simulation.temperatureVeryHigh": "Very high",
    "simulation.temperatureHelp": "Map temperature modifies cooling per second: Low +0.15, Normal 0, High -0.15, Very high -0.3.",
    "simulation.targetDistance": "Target distance",
    "simulation.distanceHelp": "Damage is zero below minimum range, 100% from minimum through optimal range, then falls by each weapon's rule through maximum range.",
    "simulation.applySplash": "Apply splash",
    "simulation.endOnOverheat": "End on overheat",
    "simulation.endOnOverheatHelp": "When enabled, firing and measurement end immediately upon reaching maximum heat.",
    "simulation.noTimeLimit": "NO TIME LIMIT",
    "simulation.targetVisible": "TARGET EXPOSED",
    "simulation.targetHidden": "TARGET COVERED · DAMAGE BLOCKED",
    "simulation.scenarioComplete": "SCENARIO COMPLETE",
    "simulation.groups": "Weapon groups",
    "simulation.reset": "Reset run",
    "simulation.weapon": "Weapon",
    "simulation.damageShort": "Damage",
    "simulation.cycle": "Cycle",
    "simulation.cooldown": "Cooldown",
    "simulation.group": "Group",
    "simulation.groupStatus": "Weapon group status",
    "simulation.noWeapons": "No weapons are installed.",
    "tabs.mechlab": "MechLab",
    "tabs.equipmentInfo": "Equipment Info",
    "tabs.info": "Info",
    "tabs.compare": "Compare",
    "tabs.stats": "Stats",
    "donate.label": "Donate",
    "donate.aria": "Open Ko-fi support page",
    "donate.title": "Support MwoLab",
    "donate.qrAlt": "KakaoPay support QR code",
    "donate.kofi": "Support on Ko-fi",
    "donate.close": "Close",
    "privacy.link": "Privacy",
    "help.aria": "Open help",
    "help.dialogAria": "Help",
    "help.close": "Close",
    "help.tipsTitle": "Quick tips",
    "help.mechlabTitle": "MechLab",
    "help.tipAssign": "Click the equipment list, or double-click installed equipment, to assign another copy automatically.",
    "help.tipRemove": "Right-click installed equipment once to remove it.",
    "help.termsTitle": "Glossary",
    "help.dps": "Damage Per Second. The amount of damage dealt per second.",
    "help.dph": "Damage Per Heat. Damage divided by heat generated.",
    "help.hps": "Heat Per Second. The amount of heat generated per second.",
    "help.expectedCooldown": "The expected firing interval including charge, burst firing, duration, and Ultra AutoCannon jam probability.",
    "help.blogTitle": "Blog",
    "search.mechPlaceholder": "Search chassis or variant",
    "search.itemPlaceholder": "Search equipment",
    "list.smallView": "Small list view",
    "list.largeView": "Large list view",
    "list.noMechs": "No mechs match the current filters.",
    "list.chassisVariants": "{chassis} chassis / {variants} variants",
    "list.variantCount": "{count} variants",
    "filters.allFactions": "All factions",
    "filters.allWeightClasses": "All weight classes",
    "filters.open": "Filter",
    "filters.title": "Mech filters",
    "filters.basic": "Basic filters",
    "filters.basicTab": "Basic",
    "filters.tabs": "Mech filter categories",
    "filters.specialFeaturesTab": "Special features",
    "filters.quirksTab": "Quirks",
    "filters.quirkMatchMode": "Quirk matching",
    "filters.quirkList": "Quirk list",
    "filters.quirkSearch": "Search quirks",
    "filters.minimumQuirkValue": "Minimum quirk value",
    "filters.clearQuirkSelections": "Clear selection",
    "filters.noQuirkResults": "No matching quirks.",
    "filters.matchAllQuirks": "Include all",
    "filters.matchAnyQuirk": "Include any",
    "filters.specialNotes": "Special traits",
    "filters.specialEquipment": "Special equipment",
    "filters.noJumpShake": "No jump-jet shake",
    "filters.jamImmune": "Jam immune",
    "filters.fallResistant": "No fall damage",
    "filters.critImmune": "Critical-hit immune",
    "filters.compactGyro": "COMPACT GYRO",
    "filters.xlGyro": "XL GYRO",
    "filters.compactCockpit": "COMPACT COCKPIT",
    "filters.noArmActuators": "No Upper Arm Actuator",
    "filters.laserHeatSinks": "Laser heat sinks",
    "filters.tacticonB2000": "Tacticon B-2000",
    "filters.shield": "Shield",
    "filters.supercharger": "SUPERCHARGER",
    "filters.mascSupercharger": "SUPERCHARGER + MASC",
    "filters.specialWeapon": "Special weapon",
    "filters.improvedJumpJets": "Improved jump jets",
    "filters.partialWing": "Partial Wing jump jets",
    "filters.specialTargetComputer": "Special targeting computer",
    "filters.noJumpShakeDescription": "Removes screen shake while using jump jets.",
    "filters.jamImmuneDescription": "100% jam-chance reduction",
    "filters.fallResistantDescription": "At least 50% fall-damage reduction",
    "filters.critImmuneDescription": "100% CRIT HIT CHANCE (RECEIVING) reduction",
    "filters.compactGyroDescription": "Fewer slots and increased tonnage",
    "filters.xlGyroDescription": "More slots and less tonnage",
    "filters.compactCockpitDescription": "Fewer slots and less tonnage",
    "filters.noArmActuatorsDescription": "-1 arm slot; the affected arm cannot move",
    "filters.laserHeatSinksDescription": "Ignores 100% of environmental heat",
    "filters.tacticonB2000Description": "Increases allied sensor range",
    "filters.shieldDescription": "More armor at increased tonnage",
    "filters.superchargerDescription": "Lower-tonnage, fewer-slot MASC without acceleration",
    "filters.mascSuperchargerDescription": "Higher base speed and boost at increased tonnage",
    "filters.specialWeaponDescription": "Faction-ignoring NOBLE AC/20, Railgun, or Arrow",
    "filters.improvedJumpJetsDescription": "Jump jets provided by an IMPROVED JUMPJET omnipod",
    "filters.partialWingDescription": "Jump jets with a gliding effect",
    "filters.specialTargetComputerDescription": "Changes weapon behavior",
    "filters.faction": "Faction",
    "filters.weightClass": "Weight class",
    "filters.mechType": "Mech type",
    "filters.hardpoints": "Hardpoints",
    "filters.hardpointType": "Hardpoint type",
    "filters.total": "Total",
    "filters.all": "All",
    "filters.normal": "Standard",
    "filters.hero": "Hero",
    "filters.champion": "Champion",
    "filters.special": "Special",
    "filters.clan": "Clan",
    "filters.innerSphere": "Inner Sphere",
    "filters.close": "Close",
    "filters.allEquipment": "All equipment",
    "filters.weapons": "Weapons",
    "filters.ammo": "Ammo",
    "filters.engines": "Engines",
    "filters.equipment": "Equipment",
    "filters.jumpjets": "Jump jets",
    "filters.masc": "MASC",
    "filters.weaponMods": "Weapon mods",
    "filters.omnipods": "Omnipods",
    "filters.equipmentCategory": "Equipment category",
    "equipment.section.heatsinks": "HEAT SINKS",
    "equipment.section.targetComputers": "MODULES · BAP / CAP / ASP",
    "equipment.section.utility": "EQUIPMENT · MASC / ECM / JUMP JETS",
    "equipment.section.engineXl": "XL ENGINES",
    "equipment.section.engineLight": "LIGHT ENGINES",
    "equipment.section.engineStd": "STD ENGINES",
    "equipmentInfo.category": "Equipment information category",
    "equipmentInfo.weapons": "Weapons",
    "equipmentInfo.ammo": "Ammo",
    "equipmentInfo.modules": "Modules",
    "equipmentInfo.ghostHeat": "Ghost Heat",
    "equipmentInfo.ghostHeatRules": "Ghost Heat Rules",
    "equipmentInfo.ghostHeatRuleSummary1": "Ghost heat occurs when simultaneously fired weapons in the same group exceed their limit.",
    "equipmentInfo.ghostHeatRuleSummary2": "Only the single highest weapon-specific extra-heat candidate is added to the combined base heat.",
    "equipmentInfo.ghostHeatExampleAc20": "AC/20 family example",
    "equipmentInfo.ghostHeatExampleAc10": "AC/10 family example",
    "equipmentInfo.ghostHeatExampleComposition": "Fire {weapons} simultaneously · {count} weapons total",
    "equipmentInfo.ghostHeatExampleCandidates": "Extra-heat candidates: {candidates}",
    "equipmentInfo.ghostHeatExampleCandidate": "{weapon} (starts at {threshold}) {heat}",
    "equipmentInfo.ghostHeatExampleResult": "Applied result: {baseHeat} base heat + {extraHeat} highest extra heat = {totalHeat} total heat",
    "equipmentInfo.individualGroup": "INDIVIDUAL GROUP",
    "equipmentInfo.individualGroupNote": "separate groups with no interaction",
    "equipmentInfo.noResults": "No equipment to display.",
    "equipmentInfo.comingSoon": "Ghost Heat information is coming later.",
    "equipmentInfo.name": "Name",
    "equipmentInfo.damage": "Damage",
    "equipmentInfo.cooldown": "Cooldown",
    "equipmentInfo.expectedCooldown": "Expected Cooldown",
    "equipmentInfo.duration": "Duration",
    "equipmentInfo.spread": "Spread",
    "equipmentInfo.spreadDirect": "Spread Direct",
    "equipmentInfo.dph": "DPH",
    "equipmentInfo.weaponType": "Type",
    "equipmentInfo.spreadWeapons": "Spread Weapons",
    "equipmentInfo.losWeapons": "LOS Weapons",
    "equipmentInfo.criticalWeapons": "Critical Weapons",
    "equipmentInfo.jamWeapons": "Jam Weapons",
    "equipmentInfo.criticalChance": "Critical Chance Multiplier",
    "equipmentInfo.criticalDamage": "Critical Damage",
    "equipmentInfo.optimalRange": "Optimal Range",
    "equipmentInfo.maxRange": "Max Range",
    "equipmentInfo.velocity": "Velocity",
    "equipmentInfo.velocityDirect": "Velocity Direct",
    "equipmentInfo.dps": "DPS",
    "equipmentInfo.hps": "HPS",
    "equipmentInfo.health": "Health",
    "equipmentInfo.allAmmo": "All Ammo",
    "equipmentInfo.missileAmmo": "Missile Ammo",
    "equipmentInfo.ballisticAmmo": "Ballistic Ammo",
    "equipmentInfo.sharedAmmoTitle": "{ammo} Shared Ammo",
    "equipmentInfo.ammoCount": "Ammo Count",
    "equipmentInfo.totalDamage": "Total Damage",
    "equipmentInfo.internalDamage": "Internal Damage",
    "equipmentInfo.sharedWeapon": "Shared Weapon",
    "equipmentInfo.fireCount": "Possible Firings",
    "equipmentInfo.faction": "Faction",
    "equipmentInfo.sensorRange": "Sensor Range",
    "equipmentInfo.targetingTime": "Targeting Time",
    "equipmentInfo.shutdownDetection": "Shutdown Detection",
    "equipmentInfo.beamRange": "Beam Range",
    "equipmentInfo.projectileVelocity": "Projectile Velocity",
    "equipmentInfo.targetComputers": "Target Computers",
    "equipmentInfo.activeProbes": "Active Probes",
    "equipmentInfo.masc": "MASC / Supercharger",
    "equipmentInfo.tonsRange": "Tonnage Range",
    "equipmentInfo.speedBoost": "Speed Boost",
    "equipmentInfo.accelerationBoost": "Acceleration Boost",
    "equipmentInfo.decelerationBoost": "Deceleration Boost",
    "equipmentInfo.turnBoost": "Turn Boost",
    "equipmentInfo.ecm": "ECM",
    "equipmentInfo.ecmRange": "ECM Range",
    "equipmentInfo.enemyTargetingReduction": "Enemy Targeting Speed Reduction",
    "equipmentInfo.enemyLockOnReduction": "Enemy Lock-on Speed Reduction",
    "equipmentInfo.jumpJets": "Jump Jets",
    "equipmentInfo.initialThrust": "Initial Thrust",
    "equipmentInfo.verticalThrust": "Vertical Thrust",
    "equipmentInfo.forwardThrust": "Forward Thrust",
    "equipmentInfo.heatSinks": "Heat Sinks",
    "equipmentInfo.heatCapacity": "Heat Capacity",
    "equipmentInfo.heatDissipation": "Dissipation/s",
    "equipmentInfo.engineHeatCapacity": "Engine Heat Capacity",
    "equipmentInfo.engineHeatDissipation": "Engine Dissipation/s",
    "sort.default": "Default sort",
    "sort.tons": "Sort by tonnage",
    "sort.alphabetical": "Alphabetical",
    "sort.title": "Sort settings",
    "sort.close": "Close sort dialog",
    "sort.open": "Sort",
    "sort.criterion": "Sort criterion",
    "sort.direction": "Sort direction",
    "sort.ascending": "Ascending",
    "sort.descending": "Descending",
    "sort.groupFaction": "Group by faction",
    "weight.light": "Light",
    "weight.medium": "Medium",
    "weight.heavy": "Heavy",
    "weight.assault": "Assault",
    "faction.Clan": "Clan",
    "faction.InnerSphere": "Inner Sphere",
    "component.head": "Head",
    "component.leftArm": "Left Arm",
    "component.leftTorso": "Left Torso",
    "component.centerTorso": "Center Torso",
    "component.rightTorso": "Right Torso",
    "component.rightArm": "Right Arm",
    "component.leftLeg": "Left Leg",
    "component.rightLeg": "Right Leg",
    "info.selectMech": "Select a mech",
    "info.selectMechHint": "Expand a category in the left list, then choose a mech.",
    "info.applyQuirks": "Apply quirks",
    "info.quirkSummary": "Quirk Summary",
    "info.ammoQuirks": "AMMO QUIRKS",
    "info.noSpecialQuirks": "No special quirks",
    "info.specialQuirks": "Special quirks",
    "info.cooldown": "Cooldown",
    "info.durability": "Durability",
    "info.range": "Range",
    "info.velocity": "Velocity",
    "info.combinedDurability": "Combined Durability",
    "info.durabilitySummary": "Durability Summary",
    "info.mobility": "Mobility",
    "info.structureInfo": "Structure Info",
    "info.armorInfo": "Armor Info",
    "info.engine": "Engine",
    "info.part": "Part",
    "info.stat": "Stat",
    "info.armorStructureTotal": "Armor + Structure Total",
    "info.maxSpeed": "Max Speed",
    "info.acceleration": "Acceleration",
    "info.deceleration": "Deceleration",
    "info.turnSpeed": "Turn Speed",
    "info.angleX": "Angle X",
    "info.angleY": "Angle Y",
    "info.torsoSpeed": "Torso Turn Speed",
    "info.structureTotal": "Structure Total",
    "info.maxArmorTotal": "Max Armor Point Total",
    "info.minEngine": "Min Engine",
    "info.maxEngine": "Max Engine",
    "info.noQuirks": "No quirks",
    "info.noQuirksForMech": "No quirks found for this mech.",
    "info.quirksPrompt": "Select a mech to show quirks.",
    "info.componentsPrompt": "Select a mech to show components.",
    "compare.title": "Mech Compare",
    "compare.clear": "Clear compare list",
    "compare.showDeltas": "Show deltas",
    "compare.empty": "Select mechs to compare from the left list.",
    "compare.selected": "{count}/{max} selected",
    "compare.removeAria": "Remove {name} from compare",
    "compare.setBaseline": "Set as baseline",
    "compare.maxSelected": "You can compare up to {max} mechs.",
    "stats.kind": "Stats type",
    "stats.collapse": "Collapse stats submenus",
    "stats.expand": "Expand stats submenus",
    "stats.rankMode": "Ranking mode",
    "stats.individual": "Individual",
    "stats.chassis": "By chassis",
    "stats.aggregateMode": "Chassis aggregate mode",
    "stats.category": "Stats category",
    "stats.cooldownScope": "Cooldown submenu",
    "stats.quirkDurabilityScope": "Durability quirk submenu",
    "stats.heatScope": "Heat submenu",
    "stats.rangeScope": "Range submenu",
    "stats.velocityScope": "Velocity submenu",
    "stats.scope": "Durability scope",
    "stats.mode": "Ranking comparison mode",
    "stats.workspace": "Stats",
    "stats.filterAxis": "Filter axis",
    "stats.weightSelect": "Select weight class",
    "stats.tonsSelect": "Select tonnage",
    "stats.detail": "Stats detail",
    "stats.fit": "FIT MECH",
    "stats.total": "Total",
    "stats.structure": "Structure",
    "stats.all": "All",
    "stats.torsoShoulders": "Torso + shoulders",
    "stats.torso": "Torso",
    "stats.shoulders": "Shoulders",
    "stats.allList": "Full list",
    "stats.filter": "Filter",
    "stats.faction": "Faction",
    "stats.compareBy": "Compare by",
    "stats.weight": "Weight",
    "stats.tons": "Tons",
    "stats.noSelection": "Select a mech from the left list.",
    "stats.noRows": "No matching mechs.",
    "stats.noHardpoints": "No hardpoints",
    "stats.hideZeroQuirks": "Hide zero quirk values",
    "stats.specCompare": "Chassis Spec Compare",
    "stats.chassisInfo": "Basic Info",
    "stats.modelCount": "Model Count",
    "stats.hardpoints": "Hardpoints",
    "stats.energy": "Energy",
    "stats.missile": "Missile",
    "stats.ballistic": "Ballistic",
    "stats.duration": "Duration",
    "stats.rotaryRof": "Rotary ROF",
    "stats.machineGunRof": "Machine Gun ROF",
    "stats.heatDissipation": "Heat Dissipation",
    "stats.additionalSensor": "Additional Sensor",
    "stats.jamChance": "Jam Chance",
    "stats.jamDuration": "Jam Duration",
    "stats.quirkSelect": "Select quirk",
    "equipment.noItem": "No item selected",
    "build.noEngine": "No engine",
    "build.engineOutside": "Engine {rating} outside {min}-{max}",
    "build.engineTorsoOnly": "Engines can only be installed in the center torso",
    "build.engineFixed": "This OmniMech has a fixed engine",
    "build.engineHeatSinks": "Engine Heat Sinks",
    "build.engineHeatSinkOnly": "Only heat sinks can be installed inside the engine",
    "build.engineHeatSinkFull": "Engine heat sink slots are full",
    "build.engineHeatSinksFixed": "This OmniMech's engine heat sinks are fixed and cannot be changed",
    "build.removeEngineHeatSink": "Remove engine heat sink",
    "build.addEngineHeatSink": "Add engine heat sink",
    "build.noAutoInstallLocation": "No component can install this item",
    "build.noEngineHeatSinkSlots": "This engine has no additional heat sink slots",
    "build.heatSinkMismatch": "{item} is incompatible with the current heat sink upgrade",
    "build.jumpJetFull": "Jump jet limit exceeded ({used}/{limit})",
    "build.jumpJetLocation": "Jump jets can only be installed in the side/center torsos or legs",
    "build.equipmentGroupFull": "{group} limit exceeded ({used}/{limit})",
    "build.artemisRequired": "{item} requires the Artemis upgrade",
    "build.standardGuidanceRequired": "{item} can only be used with Standard guidance",
    "build.structureSlotsUnavailable": "Not enough room for {count} Endo Steel slots",
    "build.armorSlotsUnavailable": "Not enough room for {count} armor upgrade slots",
    "build.upgradeSlotsUnavailable": "Not enough room for {count} upgrade slots",
    "build.missingItem": "Missing item {id}",
    "build.missing": "Missing {id}",
    "build.factionMismatch": "{item} cannot be installed on a {faction} mech",
    "quirk.cooldownSummary": "Cooldown Summary",
    "quirk.heatSummary": "Heat Summary",
    "quirk.velocitySummary": "Velocity Summary",
    "quirk.rangeSummary": "Range Summary",
    "quirk.durationSummary": "Duration/ROF Summary",
    "quirk.spreadSummary": "Spread Summary",
    "quirk.durabilitySummary": "Durability Summary",
    "quirk.maxCooldown": "MAX Cooldown",
    "quirk.energyCooldown": "Energy Cooldown",
    "quirk.missileCooldown": "Missile Cooldown",
    "quirk.ballisticCooldown": "Ballistic Cooldown",
    "quirk.maxHeatReduction": "MAX Heat Red.",
    "quirk.energyHeat": "Energy Heat",
    "quirk.missileHeat": "Missile Heat",
    "quirk.ballisticHeat": "Ballistic Heat",
    "quirk.heatDissipation": "Heat Dissipation",
    "quirk.maxVelocity": "MAX Velocity",
    "quirk.energyVelocity": "Energy Velocity",
    "quirk.missileVelocity": "Missile Velocity",
    "quirk.ballisticVelocity": "Ballistic Velocity",
    "quirk.maxRange": "MAX Range",
    "quirk.energyRange": "Energy Range",
    "quirk.missileRange": "Missile Range",
    "quirk.ballisticRange": "Ballistic Range",
    "quirk.additionalSensor": "Additional Sensor",
    "quirk.maxDuration": "MAX Duration/ROF",
    "quirk.energyDuration": "Energy Duration",
    "quirk.mgRof": "MG ROF",
    "quirk.racRof": "RAC ROF",
    "quirk.amsRof": "AMS ROF",
    "quirk.maxSpread": "MAX Spread",
    "quirk.missileSpread": "Missile Spread",
    "quirk.ballisticSpread": "Ballistic Spread",
    "quirk.maxDurability": "MAX Durability",
    "quirk.armor": "Armor",
    "quirk.structure": "Structure",
    "quirk.critPrevent": "Crit Prevent",
    "special.jumpjets": "Jump jets",
    "special.narcDuration": "NARC duration"
  },
};

function t(key, values = {}) {
  const text = TEXT[activeLanguage]?.[key] ?? TEXT[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function languageUrl(language) {
  const url = new URL(window.location.href);
  const remainingParams = Array.from(url.searchParams.entries())
    .filter(([name]) => name !== "lang");
  url.search = "";
  url.searchParams.set("lang", language);
  remainingParams.forEach(([name, value]) => url.searchParams.append(name, value));
  return `${url.pathname}${url.search}${url.hash}`;
}

function openDonateDialog(event) {
  if (activeLanguage !== "kr") return;
  event?.preventDefault();
  $("donate-overlay").hidden = false;
  document.body.classList.add("donate-open");
  $("close-donate").focus();
}

function closeDonateDialog() {
  if ($("donate-overlay").hidden) return;
  $("donate-overlay").hidden = true;
  document.body.classList.remove("donate-open");
  $("donate-link").focus();
}

function openHelpDialog() {
  $("help-overlay").hidden = false;
  document.body.classList.add("help-open");
  $("close-help").focus();
}

function closeHelpDialog() {
  if ($("help-overlay").hidden) return;
  $("help-overlay").hidden = true;
  document.body.classList.remove("help-open");
  $("help-link").focus();
}

function mechNavigationUrl(mechId = "") {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARED_LOADOUT_QUERY_PARAM);
  url.searchParams.delete(SHARED_PUBLIC_FITTING_QUERY_PARAM);
  url.searchParams.delete("tab");
  if (mechId) url.searchParams.set("mech", mechId);
  else url.searchParams.delete("mech");
  return `${url.pathname}${url.search}${url.hash}`;
}

function mainTabNavigationUrl(tabName, mechId = null) {
  const url = new URL(window.location.href);
  url.searchParams.delete(SHARED_LOADOUT_QUERY_PARAM);
  url.searchParams.delete(SHARED_PUBLIC_FITTING_QUERY_PARAM);
  if (tabName === "mechlab") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tabName);
  if (mechId !== null) {
    if (mechId) url.searchParams.set("mech", mechId);
    else url.searchParams.delete("mech");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function sharedLoadoutUrlForValue(sharedValue) {
  const url = new URL(window.location.href);
  if (globalThis.__MWOLAB_MOBILE__) {
    url.pathname = url.pathname.replace(/\/mobile(?:\/index\.html)?\/?$/i, "/");
  }
  const language = url.searchParams.get("lang");
  const remainingParams = Array.from(url.searchParams.entries())
    .filter(([name]) => !["lang", "tab", "mech", SHARED_LOADOUT_QUERY_PARAM, SHARED_PUBLIC_FITTING_QUERY_PARAM].includes(name));
  url.search = "";
  if (language) url.searchParams.set("lang", language);
  remainingParams.forEach(([name, value]) => url.searchParams.append(name, value));
  url.searchParams.set(SHARED_LOADOUT_QUERY_PARAM, String(sharedValue || ""));
  return url.href;
}

async function encodeSharedLoadoutValue(code) {
  if (!globalThis.LoadoutUrlCodec) throw new Error(t("loadout.urlCodecUnavailable"));
  try {
    return await LoadoutUrlCodec.encode(code);
  } catch {
    throw new Error(t("loadout.urlCodecUnavailable"));
  }
}

async function decodeSharedLoadoutValue(value) {
  const normalized = String(value || "").trim();
  if (!normalized.startsWith(globalThis.LoadoutUrlCodec?.PREFIX || "z")) return normalized;
  if (!globalThis.LoadoutUrlCodec) throw new Error(t("loadout.urlCodecUnavailable"));
  try {
    return await LoadoutUrlCodec.decode(normalized);
  } catch {
    throw new Error(t("loadout.invalidSharedUrl"));
  }
}

async function sharedLoadoutUrl(code) {
  return sharedLoadoutUrlForValue(await encodeSharedLoadoutValue(code));
}

function publicFittingUrl(fittingId) {
  const url = new URL(window.location.href);
  if (globalThis.__MWOLAB_MOBILE__) {
    url.pathname = url.pathname.replace(/\/mobile(?:\/index\.html)?\/?$/i, "/");
  }
  const language = url.searchParams.get("lang");
  url.search = "";
  url.hash = "";
  if (language) url.searchParams.set("lang", language);
  url.searchParams.set(SHARED_PUBLIC_FITTING_QUERY_PARAM, String(fittingId || ""));
  return url.href;
}

function updatePublicFittingNavigation(fittingId, mode = "push") {
  const historyState = {
    mwolab: true,
    view: "mech",
    mechId: String(state.selectedMech?.id || ""),
    fittingTabId: state.activeMechlabTabId,
    publicFittingId: String(fittingId || ""),
  };
  if (mode === "replace") window.history.replaceState(historyState, "", publicFittingUrl(fittingId));
  else window.history.pushState(historyState, "", publicFittingUrl(fittingId));
}

function captureMechlabHistorySnapshot() {
  const tab = activeMechlabTab();
  if (!tab || !state.currentBuild || state.mechlabBrowseMode) return null;
  return {
    tabId: String(tab.id),
    mechId: String(tab.mechId),
    build: JSON.parse(JSON.stringify(state.currentBuild)),
    communitySource: tab.communitySource
      ? JSON.parse(JSON.stringify(tab.communitySource))
      : null,
  };
}

function preserveCurrentFittingHistoryEntry() {
  const snapshot = captureMechlabHistorySnapshot();
  if (!snapshot) return;
  window.history.replaceState(
    { ...(window.history.state || {}), mwolab: true, fittingTabId: snapshot.tabId, mechlabSnapshot: snapshot },
    "",
    window.location.href,
  );
}

function restoreMechlabHistorySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || !snapshot.build) return false;
  const tab = state.mechlabTabs.find((entry) => String(entry.id) === String(snapshot.tabId || ""));
  const mech = mechById(snapshot.mechId);
  if (!tab || !mech) return false;
  rememberActiveMechlabTabBuild();
  state.activeMechlabTabId = tab.id;
  clearEmptyMechlabTabSlotFocus();
  applyMechlabHistorySnapshotToTab(tab, snapshot, communityLikeCapability);
  applyActiveMechlabTabSelection();
  state.mechlabBrowseMode = false;
  state.mechlabBrowseIntent = "replace";
  state.mechlabBrowseSelectionId = String(mech.id);
  state.mechlabCompactListOpen = false;
  resetSelectedEquipmentForMech();
  renderAll();
  return true;
}

function applyMechlabHistorySnapshotToTab(tab, snapshot, canLike = false) {
  if (!tab || !snapshot || typeof snapshot !== "object" || !snapshot.build) return false;
  tab.mechId = snapshot.mechId;
  tab.build = JSON.parse(JSON.stringify(snapshot.build));
  if (snapshot.communitySource && typeof snapshot.communitySource === "object") {
    tab.communitySource = JSON.parse(JSON.stringify(snapshot.communitySource));
    tab.communitySource.canLike = Boolean(canLike);
    if (!canLike) tab.communitySource.liked = false;
  } else {
    delete tab.communitySource;
  }
  return true;
}

function updateMainTabNavigation(tabName, mode = "push", mechId = null) {
  const hadSharedFittingRequest = new URL(window.location.href).searchParams.has(SHARED_PUBLIC_FITTING_QUERY_PARAM);
  const normalizedTab = MAIN_TAB_NAMES.has(tabName) ? tabName : "mechlab";
  const normalizedMechId = mechId === null
    ? new URL(window.location.href).searchParams.get("mech") || ""
    : String(mechId || "");
  const historyState = {
    mwolab: true,
    tab: normalizedTab,
    mechId: normalizedMechId,
  };
  const url = mainTabNavigationUrl(normalizedTab, mechId);
  if (mode === "replace") window.history.replaceState(historyState, "", url);
  else window.history.pushState(historyState, "", url);
  if (hadSharedFittingRequest) cancelSharedFittingRequest();
}

function updateMechNavigation(view, mechId = "", mode = "push", fittingTabId = null) {
  const hadSharedFittingRequest = new URL(window.location.href).searchParams.has(SHARED_PUBLIC_FITTING_QUERY_PARAM);
  const normalizedMechId = view === "mech" ? String(mechId || "") : "";
  const historyState = {
    mwolab: true,
    view: normalizedMechId ? "mech" : "list",
    mechId: normalizedMechId,
  };
  if (normalizedMechId && fittingTabId) historyState.fittingTabId = String(fittingTabId);
  const url = mechNavigationUrl(normalizedMechId);
  if (mode === "replace") window.history.replaceState(historyState, "", url);
  else window.history.pushState(historyState, "", url);
  if (hadSharedFittingRequest) cancelSharedFittingRequest();
}

function cancelSharedFittingRequest() {
  state.sharedFittingRequestPending = false;
  lastRecommendationContextSignature = "";
  if (typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("mwolab:shared-fitting-navigation-cleared"));
  }
}

async function replaceSharedLoadoutNavigation(code, sourceValue = null) {
  const sourceHref = window.location.href;
  const url = await sharedLoadoutUrl(code);
  if (window.location.href !== sourceHref) return false;
  if (
    sourceValue !== null
    && new URL(window.location.href).searchParams.get(SHARED_LOADOUT_QUERY_PARAM) !== sourceValue
  ) return false;
  window.history.replaceState(
    {
      mwolab: true,
      view: "mech",
      mechId: String(state.selectedMech?.id || ""),
      fittingTabId: state.activeMechlabTabId,
    },
    "",
    url,
  );
  return true;
}

function applyStaticTranslations() {
  document.documentElement.lang = activeLanguage === "kr" ? "ko" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-tooltip]").forEach((element) => {
    element.dataset.tooltip = t(element.dataset.i18nTooltip);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.setAttribute("alt", t(element.dataset.i18nAlt));
  });
  document.querySelectorAll("[data-lang-link]").forEach((element) => {
    const language = element.dataset.langLink;
    element.href = languageUrl(language);
    element.classList.toggle("active", language === activeLanguage);
    element.setAttribute("aria-current", language === activeLanguage ? "true" : "false");
  });
  if (activeLanguage === "kr") {
    $("donate-link").setAttribute("aria-haspopup", "dialog");
    $("donate-link").setAttribute("aria-controls", "donate-overlay");
  } else {
    $("donate-link").removeAttribute("aria-haspopup");
    $("donate-link").removeAttribute("aria-controls");
  }
}

const COMPONENT_ORDER = [
  "head",
  "left_arm",
  "left_torso",
  "centre_torso",
  "right_torso",
  "right_arm",
  "left_leg",
  "right_leg",
];

const TORSO_REAR_COMPONENTS = {
  left_torso: "left_torso_rear",
  centre_torso: "centre_torso_rear",
  right_torso: "right_torso_rear",
};

const INITIAL_ARMOR_GROUPS = Object.freeze([
  { key: "head", labelKey: "ui.armorHead", components: ["head"], rear: false },
  { key: "shoulders", labelKey: "ui.armorShoulders", components: ["left_torso", "right_torso"], rear: true },
  { key: "torso", labelKey: "ui.armorTorso", components: ["centre_torso"], rear: true },
  { key: "arms", labelKey: "ui.armorArms", components: ["left_arm", "right_arm"], rear: false },
  { key: "legs", labelKey: "ui.armorLegs", components: ["left_leg", "right_leg"], rear: false },
]);

const MWO_EXPORT_COMPONENT_ORDER = [
  "centre_torso",
  "right_torso",
  "left_torso",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
  "head",
];

const MWO_UPGRADE_IDS = Object.freeze({
  armor: Object.freeze({ 0: 2810, 1: 2811, 2: 2812, 3: 2814, 4: 2815, 5: 2816 }),
  structure: Object.freeze({ 0: 3100, 1: 3101, 2: 3102, 3: 3103 }),
  heatsinks: Object.freeze({ 0: 3003, 1: 3002, 2: 3005, 3: 3006 }),
});

const MWO_UPGRADE_BITS = Object.freeze({
  armor: Object.freeze(Object.fromEntries(Object.entries(MWO_UPGRADE_IDS.armor).map(([bits, id]) => [id, Number(bits)]))),
  structure: Object.freeze(Object.fromEntries(Object.entries(MWO_UPGRADE_IDS.structure).map(([bits, id]) => [id, Number(bits)]))),
  heatsinks: Object.freeze(Object.fromEntries(Object.entries(MWO_UPGRADE_IDS.heatsinks).map(([bits, id]) => [id, Number(bits)]))),
});

const SHOULDER_ID = 1908;
const UPPER_ARM_ACTUATOR_ID = 1909;
const LOWER_ARM_ACTUATOR_ID = 1910;
const HAND_ACTUATOR_ID = 1911;
const MWO_ACTUATOR_BITS = Object.freeze({
  rightHandRemoved: 1,
  rightLowerArmRemoved: 2,
  leftHandRemoved: 4,
  leftLowerArmRemoved: 8,
});

const COMPONENT_NAMES = {
  head: t("component.head"),
  left_arm: t("component.leftArm"),
  left_torso: t("component.leftTorso"),
  centre_torso: t("component.centerTorso"),
  right_torso: t("component.rightTorso"),
  right_arm: t("component.rightArm"),
  left_leg: t("component.leftLeg"),
  right_leg: t("component.rightLeg"),
};

const MECHLAB_COMPONENT_NAMES = {
  head: "HEAD",
  left_arm: "LEFT ARM",
  left_torso: "LEFT TORSO",
  centre_torso: "CENTER TORSO",
  right_torso: "RIGHT TORSO",
  right_arm: "RIGHT ARM",
  left_leg: "LEFT LEG",
  right_leg: "RIGHT LEG",
};

const HARDPOINT_ORDER = ["energy", "missile", "ballistic", "ams", "ecm"];
const HARDPOINT_LABELS = {
  energy: "E",
  missile: "M",
  ballistic: "B",
  ams: "AMS",
  ecm: "ECM",
  jumpjet: "JJ",
  masc: "MASC",
};
const MECH_HARDPOINT_FILTER_ORDER = [...HARDPOINT_ORDER, "jumpjet", "masc"];
const MECH_HARDPOINT_FILTER_TOTAL_ONLY_TYPES = new Set(["ecm", "jumpjet", "masc"]);
const MECH_SPECIAL_TRAIT_ORDER = [
  "no-jump-shake",
  "jam-immune",
  "fall-resistant",
  "crit-immune",
];
const MECH_SPECIAL_EQUIPMENT_ORDER = [
  "compact-gyro",
  "xl-gyro",
  "compact-cockpit",
  "no-arm-actuators",
  "laser-heat-sinks",
  "tacticon-b2000",
  "shield",
  "supercharger",
  "masc-supercharger",
  "special-weapon",
  "improved-jump-jets",
  "partial-wing",
  "special-target-computer",
];
const SPECIAL_WEAPON_NAMES = new Set([
  "nobleautocannon20",
  "railgun",
  "clanrailgun",
  "arrowiv",
  "clanarrowiv",
]);
const MECH_FILTER_HARDPOINT_LOCATIONS = [
  { key: "total", component: null, shortLabel: "TOTAL", labelKey: "filters.total" },
  { key: "right_arm", component: "right_arm", shortLabel: "RA", labelKey: "component.rightArm" },
  { key: "right_torso", component: "right_torso", shortLabel: "RT", labelKey: "component.rightTorso" },
  { key: "head", component: "head", shortLabel: "HD", labelKey: "component.head" },
  { key: "left_torso", component: "left_torso", shortLabel: "LT", labelKey: "component.leftTorso" },
  { key: "left_arm", component: "left_arm", shortLabel: "LA", labelKey: "component.leftArm" },
];

const INFO_COMPONENTS = [
  { key: "head", label: t("component.head"), suffix: "hd" },
  { key: "centre_torso", label: t("component.centerTorso"), suffix: "ct", rearSuffix: "ctr" },
  { key: "left_torso", label: t("component.leftTorso"), suffix: "lt", rearSuffix: "ltr" },
  { key: "right_torso", label: t("component.rightTorso"), suffix: "rt", rearSuffix: "rtr" },
  { key: "left_arm", label: t("component.leftArm"), suffix: "la" },
  { key: "right_arm", label: t("component.rightArm"), suffix: "ra" },
  { key: "left_leg", label: t("component.leftLeg"), suffix: "ll" },
  { key: "right_leg", label: t("component.rightLeg"), suffix: "rl" },
];
const ENGINE_COMPONENTS = new Set(["centre_torso"]);
const ENGINE_SIDE_COMPONENTS = new Set(["left_torso", "right_torso"]);
const JUMP_JET_COMPONENTS = new Set([
  "left_torso",
  "centre_torso",
  "right_torso",
  "left_leg",
  "right_leg",
]);
const FIXED_ARMOR_SLOT_ID = 1912;
const FIXED_STRUCTURE_SLOT_ID = 1913;
const MOVABLE_UPGRADE_SLOT_IDS = new Set([FIXED_ARMOR_SLOT_ID, FIXED_STRUCTURE_SLOT_ID]);
const EXCLUDED_EQUIPMENT_NAMES = new Set([
  "dropshiplargepulselaser",
  "fakemachinegun",
]);
const EQUIPMENT_DISPLAY_NAME_OVERRIDES = new Map([
  ["nobleautocannon20", "NOBLE AC/20"],
]);
const HIDDEN_MECHLAB_EQUIPMENT_NAMES = new Set([
  "nobleautocannon20",
  "railgun",
  "clanrailgun",
  "arrowiv",
  "clanarrowiv",
  "wing_light",
  "wing_medium",
  "wing_heavy",
]);
const ARMOR_CONTAINER_SLOT_COUNTS = new Map([
  [2801, 14],
  [2802, 7],
  [2805, 7],
]);
const STEALTH_ARMOR_SLOTS_BY_COMPONENT = Object.freeze({
  left_torso: 2,
  right_torso: 2,
  left_arm: 2,
  right_arm: 2,
  left_leg: 2,
  right_leg: 2,
});
const STRUCTURE_SLOT_ORDER = [
  "right_torso",
  "centre_torso",
  "left_torso",
  "left_arm",
  "right_arm",
  "left_leg",
  "right_leg",
  "head",
];

const WEIGHT_CLASS_ORDER = ["light", "medium", "heavy", "assault"];

const WEIGHT_CLASS_LABELS = {
  light: t("weight.light"),
  medium: t("weight.medium"),
  heavy: t("weight.heavy"),
  assault: t("weight.assault"),
};

const FACTION_LABELS = {
  Clan: t("faction.Clan"),
  InnerSphere: t("faction.InnerSphere"),
};

const STATS_DURABILITY_CATEGORIES = [
  { key: "total", label: t("stats.total"), metaLabel: t("info.durability"), summaryKey: "combinedTotal" },
  { key: "armor", label: t("common.armor"), metaLabel: t("info.armorInfo"), summaryKey: "armorTotal" },
  { key: "structure", label: t("stats.structure"), metaLabel: t("info.structureInfo"), summaryKey: "structureTotal" },
];

const STATS_DURABILITY_SCOPES = [
  { key: "all", label: t("stats.all"), componentKeys: null },
  { key: "torsoShoulders", label: t("stats.torsoShoulders"), componentKeys: ["centre_torso", "left_torso", "right_torso"] },
  { key: "torso", label: t("stats.torso"), componentKeys: ["centre_torso"] },
  { key: "shoulders", label: t("stats.shoulders"), componentKeys: ["left_torso", "right_torso"] },
  { key: "head", label: t("component.head"), componentKeys: ["head"] },
  { key: "centerTorso", label: t("component.centerTorso"), componentKeys: ["centre_torso"] },
  { key: "leftTorso", label: t("component.leftTorso"), componentKeys: ["left_torso"] },
  { key: "rightTorso", label: t("component.rightTorso"), componentKeys: ["right_torso"] },
  { key: "leftArm", label: t("component.leftArm"), componentKeys: ["left_arm"] },
  { key: "rightArm", label: t("component.rightArm"), componentKeys: ["right_arm"] },
  { key: "leftLeg", label: t("component.leftLeg"), componentKeys: ["left_leg"] },
  { key: "rightLeg", label: t("component.rightLeg"), componentKeys: ["right_leg"] },
];

const STATS_MOBILITY_CATEGORIES = [
  { key: "acceleration", label: t("info.acceleration"), metaLabel: t("info.acceleration"), movementKey: "acceleration", digits: 1, unit: " kph/s" },
  { key: "deceleration", label: t("info.deceleration"), metaLabel: t("info.deceleration"), movementKey: "deceleration", digits: 1, unit: " kph/s" },
  { key: "turnSpeed", label: t("info.turnSpeed"), metaLabel: t("info.turnSpeed"), movementKey: "turnSpeed", digits: 2, unit: " °/s" },
  { key: "torsoSpeedX", label: t("info.torsoSpeed"), metaLabel: t("info.torsoSpeed"), movementKey: "torsoSpeed", digits: 1, unit: " °/s" },
];

const STATS_QUIRK_CATEGORIES = [
  { key: "cooldown", label: t("info.cooldown"), metaLabel: t("info.cooldown"), summaryKey: "cooldown", digits: 1, scale: 100, unit: "%" },
  { key: "heat", label: t("common.heat"), metaLabel: t("common.heat"), summaryKey: "heat", digits: 1, scale: 100, unit: "%" },
  { key: "durability", label: t("info.durability"), metaLabel: t("info.durability"), summaryKey: "durability", digits: 1 },
  { key: "range", label: t("info.range"), metaLabel: t("info.range"), summaryKey: "range", digits: 1, scale: 100, unit: "%" },
  { key: "velocity", label: t("info.velocity"), metaLabel: t("info.velocity"), summaryKey: "velocity", digits: 1, scale: 100, unit: "%" },
];

const STATS_QUIRK_DURABILITY_SCOPES = [
  { key: "max", label: t("stats.all"), summaryKey: "durability", digits: 1 },
  { key: "armor", label: t("quirk.armor"), summaryKey: "durabilityArmor", digits: 1 },
  { key: "structure", label: t("quirk.structure"), summaryKey: "durabilityStructure", digits: 1 },
  { key: "critPrevent", label: t("quirk.critPrevent"), summaryKey: "durabilityCritPrevent", digits: 1, scale: 100, unit: "%" },
];

const STATS_COOLDOWN_SCOPES = [
  { key: "all", label: t("stats.all"), summaryKey: "all", digits: 1, scale: 100, unit: "%" },
  { key: "energy", label: t("quirk.energyCooldown"), summaryKey: "energy", digits: 1, scale: 100, unit: "%" },
  { key: "missile", label: t("quirk.missileCooldown"), summaryKey: "missile", digits: 1, scale: 100, unit: "%" },
  { key: "ballistic", label: t("quirk.ballisticCooldown"), summaryKey: "ballistic", digits: 1, scale: 100, unit: "%" },
  { key: "duration", label: t("quirk.energyDuration"), summaryKey: "duration", digits: 1, scale: 100, unit: "%" },
  { key: "rotaryRof", label: t("quirk.racRof"), summaryKey: "rotaryRof", digits: 1, scale: 100, unit: "%" },
  { key: "machineGunRof", label: t("quirk.mgRof"), summaryKey: "machineGunRof", digits: 1, scale: 100, unit: "%" },
  { key: "jamChance", label: t("stats.jamChance"), summaryKey: "jamChance", digits: 1, scale: 100, unit: "%" },
  { key: "jamDuration", label: t("stats.jamDuration"), summaryKey: "jamDuration", digits: 1, scale: 100, unit: "%" },
];

const STATS_HEAT_SCOPES = [
  { key: "all", label: t("stats.all"), summaryKey: "heatAll", digits: 1, scale: 100, unit: "%" },
  { key: "energy", label: t("quirk.energyHeat"), summaryKey: "heatEnergy", digits: 1, scale: 100, unit: "%" },
  { key: "missile", label: t("quirk.missileHeat"), summaryKey: "heatMissile", digits: 1, scale: 100, unit: "%" },
  { key: "ballistic", label: t("quirk.ballisticHeat"), summaryKey: "heatBallistic", digits: 1, scale: 100, unit: "%" },
  { key: "heatDissipation", label: t("quirk.heatDissipation"), summaryKey: "heatDissipation", digits: 1, scale: 100, unit: "%" },
];

const STATS_RANGE_SCOPES = [
  { key: "all", label: t("stats.all"), summaryKey: "rangeAll", digits: 1, scale: 100, unit: "%" },
  { key: "energy", label: t("quirk.energyRange"), summaryKey: "rangeEnergy", digits: 1, scale: 100, unit: "%" },
  { key: "missile", label: t("quirk.missileRange"), summaryKey: "rangeMissile", digits: 1, scale: 100, unit: "%" },
  { key: "ballistic", label: t("quirk.ballisticRange"), summaryKey: "rangeBallistic", digits: 1, scale: 100, unit: "%" },
  { key: "additionalSensor", label: t("quirk.additionalSensor"), summaryKey: "additionalSensor", digits: 0 },
];

const STATS_VELOCITY_SCOPES = [
  { key: "all", label: t("stats.all"), summaryKey: "velocityAll", digits: 1, scale: 100, unit: "%" },
  { key: "energy", label: t("quirk.energyVelocity"), summaryKey: "velocityEnergy", digits: 1, scale: 100, unit: "%" },
  { key: "missile", label: t("quirk.missileVelocity"), summaryKey: "velocityMissile", digits: 1, scale: 100, unit: "%" },
  { key: "ballistic", label: t("quirk.ballisticVelocity"), summaryKey: "velocityBallistic", digits: 1, scale: 100, unit: "%" },
];

const STATS_CHASSIS_AGGREGATE_MODES = [
  { key: "average", label: t("common.average") },
  { key: "max", label: t("common.max") },
  { key: "min", label: t("common.min") },
];

const MAX_COMPARE_MECHS = 15;
const COMPARE_RANK_EPSILON = 0.0001;
const SIMULATION_TIMED_DURATION_MS = 16_000;
const SIMULATION_GROUP_FIRE_INDICATOR_MS = 250;
const SIMULATION_CONTINUOUS_HIT_EFFECT_INTERVAL_MS = 120;
const SIMULATION_MOVEMENT_HEAT_PER_SECOND = 0.3;
const MECH_BASE_SENSOR_RANGE = 800;
const TARGET_COMPUTER_SENSOR_RANGE_BONUSES = Object.freeze({
  1: 0.0225,
  2: 0.0325,
  3: 0.0425,
  4: 0.0525,
  5: 0.06,
  6: 0.0675,
  7: 0.075,
  8: 0.07875,
});
const SIMULATION_MAP_COOLING_MODIFIERS = Object.freeze({
  low: 0.15,
  normal: 0,
  high: -0.15,
  veryHigh: -0.3,
});
const SIMULATION_SCENARIOS = Object.freeze({
  free: Object.freeze({ durationMs: null, visibleMs: Number.POSITIVE_INFINITY, hiddenMs: 0 }),
  stationary: Object.freeze({ durationMs: SIMULATION_TIMED_DURATION_MS, visibleMs: SIMULATION_TIMED_DURATION_MS, hiddenMs: 0 }),
  brawl44: Object.freeze({ durationMs: SIMULATION_TIMED_DURATION_MS, visibleMs: 4_000, hiddenMs: 2_000 }),
  brawl153: Object.freeze({ durationMs: SIMULATION_TIMED_DURATION_MS, visibleMs: 2_000, hiddenMs: 3_000 }),
});
const DEFAULT_COLLAPSED_COMPARE_CATEGORIES = [t("info.combinedDurability"), t("info.armorInfo"), t("info.structureInfo"), t("stats.chassisInfo")];
const DIRECT_COOLDOWN_QUIRKS = new Set([
  "all_cooldown_multiplier",
  "energy_cooldown_multiplier",
  "missile_cooldown_multiplier",
  "ballistic_cooldown_multiplier",
]);
const DIRECT_HEAT_QUIRKS = new Set([
  "all_heat_multiplier",
  "energy_heat_multiplier",
  "missile_heat_multiplier",
  "ballistic_heat_multiplier",
]);
const DIRECT_VELOCITY_QUIRKS = new Set([
  "all_velocity_multiplier",
  "energy_velocity_multiplier",
  "missile_velocity_multiplier",
  "ballistic_velocity_multiplier",
]);
const DIRECT_RANGE_QUIRKS = new Set([
  "all_range_multiplier",
  "energy_range_multiplier",
  "missile_range_multiplier",
  "ballistic_range_multiplier",
]);
const DIRECT_DURATION_QUIRKS = new Set([
  "all_duration_multiplier",
  "energy_duration_multiplier",
]);
const DIRECT_SPREAD_QUIRKS = new Set([
  "all_spread_multiplier",
  "missile_spread_multiplier",
  "ballistic_spread_multiplier",
]);
const SKILL_SELECTION_GROUP_DEFINITIONS = Object.freeze([
  Object.freeze({ key: "firepower:cooldown", category: "firepower", subcategories: ["Cooldown"], labelKey: "skills.group.firepowerCooldown" }),
  Object.freeze({ key: "firepower:range", category: "firepower", subcategories: ["Range"], labelKey: "skills.group.firepowerRange" }),
  Object.freeze({ key: "firepower:heatgen", category: "firepower", subcategories: ["HeatGen"], labelKey: "skills.group.firepowerHeatGen" }),
  Object.freeze({ key: "firepower:velocity", category: "firepower", subcategories: ["Velocity"], labelKey: "skills.group.firepowerVelocity" }),
  Object.freeze({
    key: "firepower:other",
    category: "firepower",
    excludeSubcategories: ["Cooldown", "Range", "HeatGen", "Velocity"],
    labelKey: "skills.group.firepowerOther",
  }),
  Object.freeze({ key: "survival", category: "survival", labelKey: "skills.category.survival" }),
  Object.freeze({ key: "mobility", category: "mobility", labelKey: "skills.category.mobility" }),
  Object.freeze({ key: "jumpjets", category: "jumpjets", labelKey: "skills.category.jumpjets" }),
  Object.freeze({
    key: "operations:heatsinks",
    category: "operations",
    subcategories: ["CoolRun", "HeatContainment"],
    labelKey: "skills.group.operationsHeatSinks",
  }),
  Object.freeze({
    key: "operations:other",
    category: "operations",
    excludeSubcategories: ["CoolRun", "HeatContainment"],
    labelKey: "skills.group.operationsOther",
  }),
  Object.freeze({ key: "sensors", category: "sensors", labelKey: "skills.category.sensors" }),
  Object.freeze({ key: "auxiliary", category: "auxiliary", labelKey: "skills.category.auxiliary" }),
]);
const RECOMMENDED_SKILL_GROUP_KEYS = Object.freeze([
  "firepower:cooldown",
  "firepower:range",
  "firepower:heatgen",
  "firepower:velocity",
  "survival",
  "operations:heatsinks",
]);

const QUIRK_VALUE_DISPLAY_STORAGE_KEY = "mwolab:quirk-value-display";
const QUIRK_VALUE_DISPLAY_MODES = new Set(["final", "quirk", "all"]);
const SIMPLIFY_AMMO_QUIRKS_STORAGE_KEY = "mwolab:simplify-ammo-quirks";
const SHOW_WEAPON_TOOLTIP_QUIRKS_STORAGE_KEY = "mwolab:show-weapon-tooltip-quirks";
const INITIAL_FITTING_STORAGE_KEY = "mwolab:initial-fitting:v1";
const SHOW_RECOMMENDED_FITTINGS_STORAGE_KEY = "mwolab:show-recommended-fittings";

function savedQuirkValueDisplayMode() {
  try {
    const saved = localStorage.getItem(QUIRK_VALUE_DISPLAY_STORAGE_KEY);
    return QUIRK_VALUE_DISPLAY_MODES.has(saved) ? saved : "final";
  } catch {
    return "final";
  }
}

function savedSimplifyAmmoQuirks() {
  try {
    return localStorage.getItem(SIMPLIFY_AMMO_QUIRKS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function savedShowWeaponTooltipQuirks() {
  try {
    return localStorage.getItem(SHOW_WEAPON_TOOLTIP_QUIRKS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

const state = {
  language: activeLanguage,
  index: null,
  mechs: [],
  equipment: null,
  gameLocalization: {},
  gameLocalizationLookup: new Map(),
  loadouts: {},
  omnipods: {},
  skills: { categories: [], node_count: 0 },
  selectedSkillGroups: new Set(),
  skillEffectsCache: new Map(),
  activeMainTab: "mechlab",
  selectedMechIdsByTab: {
    mechlab: null,
    info: null,
  },
  mechlabTabs: [],
  activeMechlabTabId: null,
  mechlabPendingTabIndex: null,
  mechlabBrowseIntent: "replace",
  mechlabBrowseSelectionId: null,
  mechlabBrowseMode: true,
  mechlabCompactListOpen: false,
  mechListScrollTop: 0,
  infoApplyQuirks: true,
  quirkValueDisplayMode: savedQuirkValueDisplayMode(),
  simplifyAmmoQuirks: savedSimplifyAmmoQuirks(),
  showWeaponTooltipQuirks: savedShowWeaponTooltipQuirks(),
  initialFittingPreferences: savedInitialFittingPreferences(),
  showRecommendedFittings: savedShowRecommendedFittings(),
  sharedFittingRequestPending: new URL(window.location.href).searchParams.has(SHARED_PUBLIC_FITTING_QUERY_PARAM),
  recommendedFittingsMechId: "",
  recommendedFittings: [],
  compareMode: false,
  compareMechIds: [],
  compareBaselineMechId: null,
  compareShowDeltas: true,
  collapsedCompareCategories: new Set(DEFAULT_COLLAPSED_COMPARE_CATEGORIES),
  activeStatsView: "durability",
  statsRankMode: "individual",
  statsChassisAggregateMode: "average",
  statsDetailMenusExpanded: true,
  statsDurabilityScope: "all",
  statsDurabilityCategory: "total",
  statsMobilityCategory: "acceleration",
  statsQuirkCategory: "cooldown",
  statsQuirkDurabilityScope: "max",
  statsCooldownScope: "all",
  statsHeatScope: "all",
  statsRangeScope: "all",
  statsVelocityScope: "all",
  statsHideZeroQuirks: true,
  statsDurabilityMode: "all",
  selectedStatsMechId: null,
  statsConditionFaction: "",
  statsConditionAxis: "weight",
  statsConditionWeightClasses: new Set(),
  statsConditionTons: new Set(),
  renderedStatsEntries: [],
  renderedStatsCategory: null,
  renderedStatsValueScale: 1,
  statsEntriesCache: new Map(),
  statsSummaryWarmupScheduled: false,
  largeMechList: true,
  mechSort: "default",
  mechSortDirection: "asc",
  mechSortGroupFaction: true,
  mechFilterFaction: "",
  mechFilterWeightClasses: new Set(),
  mechFilterAllTypes: true,
  mechFilterTypeCategories: new Set(),
  mechFilterSpecialTypes: new Set(),
  mechSpecialTypeOptions: [],
  mechHardpointFilters: Object.fromEntries(MECH_HARDPOINT_FILTER_ORDER.map((type) => [
    type,
    {
      enabled: false,
      minimums: Object.fromEntries(MECH_FILTER_HARDPOINT_LOCATIONS.map((location) => [
        location.key,
        normalizeMechHardpointFilterMinimum(location.key, 0),
      ])),
    },
  ])),
  mechHardpointFilterCountsCache: new Map(),
  activeMechFilterTab: "basic",
  mechSpecialTraitSelections: new Set(),
  mechSpecialEquipmentSelections: new Set(),
  mechSpecialFeatureCache: new Map(),
  mechQuirkFilterMode: "any",
  mechQuirkFilterSelections: new Map(),
  mechQuirkFilterOptions: [],
  mechQuirkFilterSearch: "",
  mechQuirkValuesCache: new Map(),
  shakeDampingMechIds: new Set(),
  shakeDampingMechNames: new Set(),
  improvedJumpJetChassis: null,
  mechListSummaryCache: new Map(),
  mechHardpointBadgeCache: new Map(),
  mechSlotBadgeCache: new Map(),
  mechBrowserHoverMechId: null,
  mechHardpointTypeCache: new Map(),
  mechlabQuirkValuesCache: new Map(),
  weaponQuirkTypeCache: null,
  weaponQuirkTargetCache: null,
  alwaysAppliedWeaponModuleBonusCache: new Map(),
  artemisSpreadMultiplierCache: null,
  ammoHardpointTypeCache: null,
  fixedOmniEngineCache: new Map(),
  selectedMech: null,
  selectedChassis: "",
  expandedChassis: new Set(),
  selectedItemId: null,
  activeEquipmentCategory: "weapons",
  activeEquipmentInfoView: "weapons",
  equipmentInfoSortByTable: new Map(),
  equipmentInfoHtmlCache: new Map(),
  collapsedWarehouseSections: new Set(),
  omnipodDefinitionCache: new Map(),
  currentBuild: null,
  loadoutCodeMode: "import",
  localBuildMode: "save",
  localBuildManaging: false,
  activeDrag: null,
  simulation: {
    open: false,
    weapons: [],
    scenarioId: "free",
    movementState: "moving",
    mapTemperature: "normal",
    targetDistance: 180,
    applySplashDamage: true,
    endOnOverheat: true,
    targetVisible: true,
    finished: false,
    assignments: new Map(),
    heldGroups: new Set(),
    pointerGroups: new Map(),
    nextFireAt: new Map(),
    cooldownStartAt: new Map(),
    jamStartsAt: new Map(),
    jammedUntil: new Map(),
    pendingShots: [],
    groupFiringUntil: new Map(),
    lastHitEffectAt: new Map(),
    pendingHitEffectDamage: new Map(),
    activeBurns: new Map(),
    continuousFireAt: new Map(),
    totalDamage: 0,
    currentHeat: 0,
    maxHeat: 30,
    coolingRate: 0,
    heatSinkCount: 0,
    lastHeatUpdateAt: null,
    overheated: false,
    startedAt: null,
    frameId: null,
  },
  weaponDetail: {
    open: false,
    distance: 180,
    weapons: [],
    frequencyByWeaponKey: new Map(),
    enabledByWeaponKey: new Map(),
    enabledRangeTypes: new Set(["short", "medium", "long"]),
    applyGhostHeat: false,
    rangeCombinationDps: false,
    metricTab: "basic",
  },
};

const $ = (id) => document.getElementById(id);

function number(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function fmt(value, digits = 1) {
  const numeric = number(value);
  return Number.isInteger(numeric)
    ? `${numeric}`
    : numeric.toFixed(digits).replace(/(?:\.0+|(\.\d*?)0+)$/, "$1");
}

function weaponProjectilesPerFiring(item, modules = installedMechItems("module")) {
  const projectileClass = String(item?.stats?.projectileclass || "").toLowerCase();
  if (projectileClass !== "bullet" && !isRocketLauncher(item)) return 1;
  return Math.max(1, Math.trunc(effectiveWeaponStats(item, modules).numPerShot));
}

function weaponBaseDirectDamage(item, modules = installedMechItems("module")) {
  const stats = effectiveWeaponStats(item, modules);
  return stats.damage
    * stats.numFiring
    * weaponProjectilesPerFiring(item, modules);
}

function alwaysAppliedWeaponModuleBonus(item) {
  if (item?.item_type !== "weapon") return { damage: 0, heat: 0, source: null };
  const cacheKey = String(item.id ?? item.name ?? "");
  const cached = state.alwaysAppliedWeaponModuleBonusCache.get(cacheKey);
  if (cached) return cached;

  const weaponKey = normalizeLookupKey(item.name);
  const matchingModules = Object.values(state.equipment?.items || {}).filter((module) => (
    module?.item_type === "module"
    && number(module.stats?.amountAllowed) === 2
    && (module.weapon_stat_filters || []).some((filter) => (
      (filter.compatible_weapons || []).some((name) => normalizeLookupKey(name) === weaponKey)
      && (filter.weapon_stats || []).some((stats) => (
        String(stats.operation || "") === "+"
        && (number(stats.damage) !== 0 || number(stats.heat) !== 0)
      ))
    ))
  ));
  const module = matchingModules.find((candidate) => (
    normalizeFactionKey(candidate.faction) === normalizeFactionKey(item.faction)
  )) || matchingModules[0];
  const count = Math.max(0, Math.trunc(number(module?.stats?.amountAllowed)));
  const bonus = {
    damage: 0,
    heat: 0,
    source: module ? {
      id: module.id,
      name: module.name,
      display_name: module.display_name || module.name,
      count,
    } : null,
  };
  (module?.weapon_stat_filters || []).forEach((filter) => {
    if (!(filter.compatible_weapons || []).some((name) => normalizeLookupKey(name) === weaponKey)) return;
    (filter.weapon_stats || []).forEach((stats) => {
      if (String(stats.operation || "") !== "+") return;
      bonus.damage += number(stats.damage) * count;
      bonus.heat += number(stats.heat) * count;
    });
  });
  state.alwaysAppliedWeaponModuleBonusCache.set(cacheKey, bonus);
  return bonus;
}

function weaponBonusDirectDamage(item, modules = installedMechItems("module")) {
  const stats = effectiveWeaponStats(item, modules);
  return alwaysAppliedWeaponModuleBonus(item).damage
    * stats.numFiring
    * weaponProjectilesPerFiring(item, modules);
}

function weaponDirectDamage(item, modules = installedMechItems("module")) {
  return weaponBaseDirectDamage(item, modules) + weaponBonusDirectDamage(item, modules);
}

function weaponSplashDamage(item, modules = installedMechItems("module")) {
  const splashPercent = Math.max(0, number(item?.stats?.splashPercent));
  // The capacitor bonus is total splash; this helper returns the value for one side.
  return weaponBaseDirectDamage(item, modules) * splashPercent
    + weaponBonusDirectDamage(item, modules) * splashPercent / 2;
}

function weaponTotalDamage(item, includeSplash = true, modules = installedMechItems("module")) {
  const directDamage = weaponDirectDamage(item, modules);
  return directDamage + (includeSplash ? weaponSplashDamage(item, modules) * 2 : 0);
}

function jumpJetFinalStats(item, quirks = []) {
  const stats = item?.stats || {};
  return {
    duration: number(stats.duration) * (1 + quirkIncrease(quirks, "jumpjets_burntime_multiplier")),
    initialThrust: number(stats.boost_instant) * (1 + quirkIncrease(quirks, "jumpjets_initialthrust_multiplier")),
    verticalThrust: number(stats.boost_z),
    forwardThrust: number(stats.boost_fwd),
  };
}

function jumpJetHeight(items, maxTons, quirks = []) {
  if (!items.length) return 0;
  const finalStats = items.map((item) => jumpJetFinalStats(item, quirks));
  const verticalLift = finalStats.reduce((sum, stats) => sum + stats.verticalThrust, 0);
  const duration = finalStats.reduce((max, stats) => Math.max(max, stats.duration), 0);
  const initialThrust = finalStats.reduce((max, stats) => Math.max(max, stats.initialThrust), 0);
  return (7.5 * verticalLift + duration * 0.75 * initialThrust)
    / Math.max(1, number(maxTons, 1));
}

function normalizeLookupKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function mechIconSrc(mech) {
  const name = String(mech?.name || "").toLowerCase();
  if (!name) return "";
  return `assets/mech-icons/${encodeURIComponent(name)}.png`;
}

function itemById(id) {
  return state.equipment?.items?.[String(id)] || null;
}

function isHiddenMechlabEquipment(item) {
  return HIDDEN_MECHLAB_EQUIPMENT_NAMES.has(String(item?.name || "").toLowerCase());
}

function applyEquipmentDisplayNameOverrides(equipment) {
  if (!equipment?.items) return equipment;
  Object.values(equipment.items).forEach((item) => {
    if (!item) return;
    const override = EQUIPMENT_DISPLAY_NAME_OVERRIDES.get(String(item.name || "").toLowerCase());
    if (!override || item.display_name === override) return;
    item.source_display_name = item.display_name;
    item.display_name = override;
  });
  return equipment;
}

function excludeUnusedEquipment(equipment) {
  if (!equipment?.items) return equipment;
  const excludedIds = new Set(
    Object.entries(equipment.items)
      .filter(([, item]) => EXCLUDED_EQUIPMENT_NAMES.has(String(item?.name || "").toLowerCase()))
      .map(([id]) => String(id)),
  );
  excludedIds.forEach((id) => delete equipment.items[id]);
  Object.values(equipment.families || {}).forEach((ids) => {
    if (!Array.isArray(ids)) return;
    for (let index = ids.length - 1; index >= 0; index -= 1) {
      if (excludedIds.has(String(ids[index]))) ids.splice(index, 1);
    }
  });
  return equipment;
}

function loadoutInstalledEngine(build = state.currentBuild) {
  for (const component of Object.values(build?.components || {})) {
    for (const entry of component.items || []) {
      const item = itemById(entry.item_id);
      if (item?.item_type === "engine") return item;
    }
  }
  return null;
}

function engineSeriesKey(engine) {
  return String(engine?.name || "").replace(/_\d+$/i, "").toLowerCase();
}

function adjacentEngineRating(engine, direction, mech = state.selectedMech) {
  if (!engine || !direction || !mech) return null;
  const series = engineSeriesKey(engine);
  const currentRating = number(engine.stats?.rating);
  const stats = mech.definition?.stats || {};
  const minRating = number(stats.MinEngineRating);
  const maxRating = number(stats.MaxEngineRating, Number.POSITIVE_INFINITY);
  return Object.values(state.equipment?.items || {})
    .filter((candidate) => (
      candidate?.item_type === "engine"
      && engineSeriesKey(candidate) === series
      && itemMatchesMechFaction(candidate, mech)
      && number(candidate.stats?.rating) >= minRating
      && number(candidate.stats?.rating) <= maxRating
      && (direction > 0
        ? number(candidate.stats?.rating) > currentRating
        : number(candidate.stats?.rating) < currentRating)
    ))
    .sort((a, b) => direction > 0
      ? number(a.stats?.rating) - number(b.stats?.rating)
      : number(b.stats?.rating) - number(a.stats?.rating))[0] || null;
}

function fixedOmniEngine(mech = state.selectedMech) {
  if (!mech || !hasFixedOmnipods(mech)) return null;
  const stats = mech.definition?.stats || {};
  const minRating = number(stats.MinEngineRating);
  const maxRating = number(stats.MaxEngineRating);
  if (!minRating || minRating !== maxRating) return null;

  const cacheKey = String(mech.id);
  if (state.fixedOmniEngineCache.has(cacheKey)) return state.fixedOmniEngineCache.get(cacheKey);
  const explicitEngine = Object.values(mech.definition?.components || {})
    .flatMap((component) => component.fixed || [])
    .map((itemId) => itemById(itemId))
    .find((item) => item?.item_type === "engine");
  if (explicitEngine) {
    state.fixedOmniEngineCache.set(cacheKey, explicitEngine);
    return explicitEngine;
  }
  const faction = normalizeFactionKey(mech.faction);
  const expectedSideSlots = faction === "clan" ? 2 : faction === "innersphere" ? 3 : -1;
  const engine = Object.values(state.equipment?.items || {}).find((item) => (
    item.item_type === "engine"
    && number(item.stats?.rating) === minRating
    && number(item.stats?.sideSlots, -1) === expectedSideSlots
    && String(item.faction || "").split(",").map(normalizeFactionKey).includes(faction)
  )) || null;
  state.fixedOmniEngineCache.set(cacheKey, engine);
  return engine;
}

function installedEngine(build = state.currentBuild, mech = state.selectedMech) {
  return fixedOmniEngine(mech) || loadoutInstalledEngine(build);
}

function engineSideSlots(engine) {
  return Math.max(0, number(engine?.stats?.sideSlots));
}

function itemName(id) {
  const item = itemById(id);
  return item ? item.display_name || item.name : `Item ${id}`;
}

function mechById(id) {
  return state.mechs.find((mech) => String(mech.id) === String(id)) || null;
}

function itemSlots(item) {
  return number(item?.stats?.slots);
}

function isGuidanceWeapon(item) {
  return item?.item_type === "weapon"
    && Boolean(item.stats?.artemisAmmoType)
    && !number(item.stats?.alwaysHasArtemis);
}

function isArtemisWeapon(item) {
  return isGuidanceWeapon(item) && /artemis/i.test(String(item.name || ""));
}

function artemisUpgradeItem() {
  return Object.values(state.equipment?.items || {}).find((item) => (
    item?.item_type === "upgrade"
    && number(item.stats?.extraSlots) > 0
    && Number.isFinite(Number(item.stats?.missileSpread))
  )) || null;
}

function artemisSpreadMultiplier() {
  if (Number.isFinite(state.artemisSpreadMultiplierCache)) {
    return state.artemisSpreadMultiplierCache;
  }
  const upgrade = artemisUpgradeItem();
  const multiplier = Number(upgrade?.stats?.missileSpread);
  if (Number.isFinite(multiplier) && multiplier >= 0) {
    state.artemisSpreadMultiplierCache = multiplier;
    return multiplier;
  }
  return 1;
}

function savedShowRecommendedFittings() {
  try {
    return localStorage.getItem(SHOW_RECOMMENDED_FITTINGS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

const LRM_DIRECT_VELOCITY_MULTIPLIER = 1.4;

function isLosWeapon(item) {
  return item?.item_type === "weapon" && number(item.stats?.spreadLOS) > 0;
}

function hasLrmDirectVelocity(item) {
  return isLosWeapon(item) && Boolean(item.stats?.artemisAmmoType);
}

function weaponDirectVelocity(item) {
  if (!hasLrmDirectVelocity(item) || !(number(item.stats?.speed) > 0)) return null;
  return number(item.stats.speed) * LRM_DIRECT_VELOCITY_MULTIPLIER;
}

function weaponSpreadValues(
  item,
  quirks = [],
  modules = installedMechItems("module"),
  statField = "spread",
) {
  const base = statField === "spread"
    ? effectiveWeaponStats(item, modules).spread
    : number(item?.stats?.[statField]);
  if (!(base > 0)) return null;
  const modifier = collectWeaponQuirkEffects(item, quirks).totals.spreadModifier;
  const artemisMultiplier = isArtemisWeapon(item) ? artemisSpreadMultiplier() : 1;
  return {
    base,
    modifier,
    artemisMultiplier,
    final: base * Math.max(0, 1 + modifier) * artemisMultiplier,
  };
}

function artemisEquipped(build = state.currentBuild) {
  return Boolean(build?.upgrades?.artemis?.Equipped);
}

function activeWeaponAmmoType(weapon, build = state.currentBuild) {
  if (weapon?.item_type !== "weapon") return "";
  const artemisAmmoType = String(weapon.stats?.artemisAmmoType || "");
  const usesArtemisAmmo = Boolean(artemisAmmoType) && (
    number(weapon.stats?.alwaysHasArtemis) > 0
    || (artemisEquipped(build) && isGuidanceWeapon(weapon))
  );
  return usesArtemisAmmo ? artemisAmmoType : String(weapon.stats?.ammoType || "");
}

function weaponAmmoPerTrigger(weapon, modules = installedMechItems("module")) {
  if (!activeWeaponAmmoType(weapon)) return 0;
  const effective = effectiveWeaponStats(weapon, modules);
  const sourceAmmoPerShot = Math.max(0, effective.ammoPerShot);
  const sequentialShots = Math.max(1, Math.trunc(effective.numFiring));
  // Sequential projectiles consume one round each (C-AC, UAC, HAG, etc.).
  // LB-X pellets use numPerShot instead, so they correctly remain one consumed round.
  return Math.max(1, Math.trunc(Math.max(sourceAmmoPerShot, sequentialShots)));
}

function guidanceUpgrade(build = state.currentBuild) {
  return upgradeItems("guidance").find((item) => (
    (number(item.stats?.extraSlots) > 0) === artemisEquipped(build)
  ));
}

function effectiveItemSlots(item, build = state.currentBuild) {
  const extraSlots = isArtemisWeapon(item) && artemisEquipped(build)
    ? number(guidanceUpgrade(build)?.stats?.extraSlots)
    : 0;
  return itemSlots(item) + extraSlots;
}

function guidanceMismatch(item, build = state.currentBuild) {
  if (!isGuidanceWeapon(item)) return "";
  if (isArtemisWeapon(item) && !artemisEquipped(build)) {
    return t("build.artemisRequired", { item: item.display_name || item.name });
  }
  if (!isArtemisWeapon(item) && artemisEquipped(build)) {
    return t("build.standardGuidanceRequired", { item: item.display_name || item.name });
  }
  return "";
}

function structureUpgradeSlots(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build || hasFixedOmnipods(mech)) return 0;
  const upgrade = itemById(build.upgrades?.structure?.ItemID);
  if (!upgrade || number(upgrade.stats?.weightPerTon, 0.1) >= 0.1) return 0;
  return normalizeFactionKey(mech.faction) === "clan" ? 7 : 14;
}

function armorUpgradeSlots(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build || hasFixedOmnipods(mech)) return 0;
  const upgrade = itemById(build.upgrades?.armor?.ItemID);
  if (!upgrade) return 0;
  if (/stealth/i.test(String(upgrade.name || ""))) {
    return Object.values(STEALTH_ARMOR_SLOTS_BY_COMPONENT)
      .reduce((sum, slots) => sum + slots, 0);
  }
  return number(ARMOR_CONTAINER_SLOT_COUNTS.get(number(upgrade.stats?.containerId)));
}

function fixedArmorUpgradeSlots(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build || hasFixedOmnipods(mech)) return {};
  const upgrade = itemById(build.upgrades?.armor?.ItemID);
  return /stealth/i.test(String(upgrade?.name || ""))
    ? STEALTH_ARMOR_SLOTS_BY_COMPONENT
    : {};
}

function componentBaseSlotUsage(name, definition, build, engine, fixedEngine) {
  const compDef = definition.components?.[name] || {};
  const buildComp = build.components?.[name] || { items: [] };
  const internalSlots = (compDef.internals || []).reduce((sum, itemId) => {
    if (MOVABLE_UPGRADE_SLOT_IDS.has(Number(itemId))) return sum;
    return sum + Math.max(1, itemSlots(itemById(itemId)));
  }, 0);
  const fixedEquipmentSlots = (compDef.fixed || []).reduce((sum, itemId) => {
    const item = itemById(itemId);
    if (!item || item.item_type === "engine") return sum;
    if (name === "centre_torso" && isHeatSink(item)) return sum;
    return sum + Math.max(1, effectiveItemSlots(item, build));
  }, 0);
  const sideEngineSlots = ENGINE_SIDE_COMPONENTS.has(name) ? engineSideSlots(engine) : 0;
  const fixedEngineSlots = name === "centre_torso" && fixedEngine ? Math.max(1, itemSlots(fixedEngine)) : 0;
  const equipmentSlots = (buildComp.items || []).reduce((sum, entry) => {
    const item = itemById(entry.item_id);
    return item ? sum + Math.max(1, effectiveItemSlots(item, build)) : sum;
  }, 0);
  return internalSlots + fixedEquipmentSlots + sideEngineSlots + fixedEngineSlots + equipmentSlots;
}

function allocateUpgradeSlots(requiredSlots, definition, build, engine, fixedEngine, reservedByComponent = {}) {
  const byComponent = {};
  let remaining = requiredSlots;
  for (const name of STRUCTURE_SLOT_ORDER) {
    const slotLimit = number(definition.components?.[name]?.slots);
    const available = Math.max(0, slotLimit
      - componentBaseSlotUsage(name, definition, build, engine, fixedEngine)
      - number(reservedByComponent[name]));
    const allocated = Math.min(available, remaining);
    byComponent[name] = allocated;
    remaining -= allocated;
  }
  return { byComponent, unallocated: remaining };
}

function allocateFixedUpgradeSlots(slotsByComponent, definition, build, engine, fixedEngine) {
  const byComponent = { ...slotsByComponent };
  const unallocated = Object.entries(byComponent).reduce((sum, [name, requiredSlots]) => {
    const slotLimit = number(definition.components?.[name]?.slots);
    const available = Math.max(
      0,
      slotLimit - componentBaseSlotUsage(name, definition, build, engine, fixedEngine),
    );
    return sum + Math.max(0, number(requiredSlots) - available);
  }, 0);
  return { byComponent, unallocated };
}

function itemTons(item) {
  return number(item?.stats?.tons ?? item?.stats?.weight);
}

function structureUpgradeTonnage(maxTons, upgrade) {
  const rawTons = Math.max(0, number(maxTons))
    * Math.max(0, number(upgrade?.stats?.weightPerTon, 0.1));
  return Math.ceil(rawTons * 2) / 2;
}

function armorTonnage(armor, upgrade) {
  const armorPerTon = number(upgrade?.stats?.armorPerTon, 32);
  return armorPerTon > 0 ? Math.max(0, number(armor)) / armorPerTon : 0;
}

function internalItemTonnageModifier(item) {
  const tons = itemTons(item);
  const itemKey = normalizeLookupKey(item?.name);
  // Compact Gyro tonnage is an added penalty over the standard gyro.
  if (itemKey.startsWith("compactgyro")) return Math.abs(tons);
  return tons;
}

function itemHeat(item) {
  return number(item?.stats?.heat) + alwaysAppliedWeaponModuleBonus(item).heat;
}

function engineIncludedHeatSinkCount(engine) {
  return engine ? Math.min(10, number(engine.stats?.heatsinks)) : 0;
}

function isHeatSink(item) {
  return item?.ctype === "CHeatSinkStats" || String(item?.name || "").toLowerCase().includes("heatsink");
}

function heatSinkMatchesUpgrade(item, build = state.currentBuild) {
  if (!item || !isHeatSink(item)) return true;
  const upgrade = itemById(build?.upgrades?.heatsinks?.ItemID);
  const compatibleId = number(upgrade?.stats?.compatibleHeatSink);
  return !compatibleId || Number(item.id) === compatibleId;
}

function engineAdditionalHeatSinkCapacity(engine) {
  return Math.max(0, number(engine?.stats?.heatsinks) - 10);
}

function fixedEngineHeatSinkEntries(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build) return [];
  const centreBase = currentDefinition(mech).components?.centre_torso || {};
  const centreBuild = build.components?.centre_torso || {};
  const centrePod = podById(centreBuild.omnipod);
  const centrePodDefinition = centrePod ? omnipodDefinition(centrePod) : { fixed: [] };
  const baseSource = hasFixedOmnipods(mech) ? "omnipod" : "chassis";
  return [
    ...(centreBase.fixed || []).map((itemId) => ({ item: itemById(itemId), source: baseSource })),
    ...(centrePodDefinition.fixed || []).map((itemId) => ({ item: itemById(itemId), source: "omnipod" })),
  ].filter((entry) => isHeatSink(entry.item));
}

function fixedEngineHeatSinkItems(mech = state.selectedMech, build = state.currentBuild) {
  return fixedEngineHeatSinkEntries(mech, build).map((entry) => entry.item);
}

function engineHeatSinkEntries(build = state.currentBuild) {
  if (!build) return [];
  if (!Array.isArray(build.engineHeatSinks)) build.engineHeatSinks = [];
  return build.engineHeatSinks;
}

function engineUserHeatSinkCapacity(
  engine = installedEngine(),
  mech = state.selectedMech,
  build = state.currentBuild,
) {
  if (fixedOmniEngine(mech)) return 0;
  return Math.max(
    0,
    engineAdditionalHeatSinkCapacity(engine) - fixedEngineHeatSinkItems(mech, build).length,
  );
}

function engineStoredHeatSinkCapacity(
  engine = installedEngine(),
  mech = state.selectedMech,
  build = state.currentBuild,
) {
  return Math.max(
    0,
    engineAdditionalHeatSinkCapacity(engine) - fixedEngineHeatSinkItems(mech, build).length,
  );
}

function normalizeEngineHeatSinks(mech, build, { fillFromCentre = false } = {}) {
  if (!mech || !build) return build;
  build.components ||= {};
  build.components.centre_torso ||= { armor: 0, items: [] };
  const centreItems = build.components.centre_torso.items ||= [];
  const engine = installedEngine(build, mech);
  const capacity = engineStoredHeatSinkCapacity(engine, mech, build);
  const internal = [];
  const overflow = [];

  for (const entry of Array.isArray(build.engineHeatSinks) ? build.engineHeatSinks : []) {
    if (isHeatSink(itemById(entry?.item_id))) internal.push({ ...entry });
    else if (entry?.item_id) overflow.push({ ...entry });
  }

  if (fillFromCentre && capacity > internal.length) {
    for (let index = 0; index < centreItems.length && internal.length < capacity;) {
      const entry = centreItems[index];
      if (!isHeatSink(itemById(entry?.item_id))) {
        index += 1;
        continue;
      }
      internal.push(centreItems.splice(index, 1)[0]);
    }
  }

  if (internal.length > capacity) overflow.push(...internal.splice(capacity));
  build.engineHeatSinks = internal;
  centreItems.push(...overflow);
  return build;
}

function isEcm(item) {
  return item?.ctype === "CGECMStats";
}

function isAmsWeapon(item) {
  return item?.item_type === "weapon"
    && (item?.ctype === "WeaponAMS" || equipmentHardpointType(item) === "ams");
}

function fixedItemConsumesHardpoint(item, fixedSource = "", mech = state.selectedMech) {
  return Boolean(equipmentHardpointType(item))
    && !(
      fixedSource === "chassis"
      && hasFixedOmnipods(mech)
      && item?.item_type === "weapon"
    );
}

function isHitscanWeapon(item) {
  return item?.item_type === "weapon"
    && !String(item?.stats?.projectileclass || "").trim();
}

function equipmentLimitGroup(item) {
  if (isCaseEquipment(item)) return "case";
  if (!isTargetComputerEquipment(item)) return "";
  const key = normalizeLookupKey(`${item?.name || ""} ${item?.display_name || ""}`);
  if (key.includes("activeprobe") || key.includes("beagleprobe")) return "active-probe";
  return "target-computer";
}

function isAdvancedSensorPackage(item) {
  const key = normalizeLookupKey(`${item?.name || ""} ${item?.display_name || ""}`);
  return key.includes("advancedsensorpackage") || key === "ccc";
}

function equipmentLimitGroupLabel(group) {
  if (group === "case") return "C.A.S.E.";
  return group === "active-probe" ? "ACTIVE PROBE" : "TARGET COMPUTER";
}

function installedEquipmentLimitGroupItems(group) {
  return installedMechItems("module").filter((item) => equipmentLimitGroup(item) === group);
}

function equipmentLimitGroupMaximum(group, candidate = null) {
  const limits = [candidate, ...installedEquipmentLimitGroupItems(group)]
    .filter((item) => equipmentLimitGroup(item) === group)
    .map((item) => number(item.stats?.amountAllowed))
    .filter((limit) => limit > 0);
  return limits.length ? Math.min(...limits) : Number.POSITIVE_INFINITY;
}

function maximumJumpJets(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build) return 0;
  const slotBonus = effectiveQuirks(mech, build).reduce((sum, quirk) => (
    String(quirk.name || "").toLowerCase() === "jumpjetslots_additive"
      ? sum + Math.max(0, number(quirk.value))
      : sum
  ), 0);
  return Math.max(0, number(currentDefinition(mech).stats?.MaxJumpJets) + slotBonus);
}

function targetEquipmentSensorRangeBonus(item) {
  const group = equipmentLimitGroup(item);
  if (group === "active-probe") return Math.max(0, number(item.stats?.rangeboost));
  if (group !== "target-computer") return 0;
  if (isAdvancedSensorPackage(item)) return 0.1;
  const mark = Math.max(0, Math.trunc(number(item.stats?.slots)));
  return number(TARGET_COMPUTER_SENSOR_RANGE_BONUSES[mark]);
}

function installedSensorEquipmentBonus() {
  return installedMechItems("module").reduce(
    (sum, item) => sum + targetEquipmentSensorRangeBonus(item),
    0,
  );
}

function mechSensorRange(quirks, mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build) return 0;
  const baseRange = number(currentDefinition(mech).stats?.SensorRange, MECH_BASE_SENSOR_RANGE);
  const additive = quirks.reduce((sum, quirk) => (
    String(quirk.name || "").toLowerCase() === "sensorrange_additive"
      ? sum + number(quirk.value)
      : sum
  ), 0);
  const multiplier = quirks.reduce((sum, quirk) => (
    String(quirk.name || "").toLowerCase() === "sensorrange_multiplier"
      ? sum + number(quirk.value)
      : sum
  ), 0);
  const mechAndQuirkRange = baseRange * (1 + multiplier) + additive;
  return Math.max(0, mechAndQuirkRange * (1 + installedSensorEquipmentBonus()));
}

function componentCanEquipEcm(component) {
  return number(component?.CanEquipECM) > 0;
}

function equipmentHardpointType(item) {
  if (isEcm(item)) return "ecm";
  if (item?.item_type !== "weapon") return "";
  return String(item.hardpoint_type || item.stats?.type || "").toLowerCase();
}

function ammoHardpointType(item) {
  if (item?.item_type !== "ammo") return "";
  if (!state.ammoHardpointTypeCache) {
    const index = new Map();
    Object.values(state.equipment?.items || {}).forEach((weapon) => {
      if (weapon?.item_type !== "weapon") return;
      const type = equipmentHardpointType(weapon);
      if (!HARDPOINT_ORDER.includes(type)) return;
      [weapon.stats?.ammoType, weapon.stats?.artemisAmmoType].forEach((ammoType) => {
        const key = normalizeLookupKey(ammoType);
        if (key && !index.has(key)) index.set(key, type);
      });
    });
    state.ammoHardpointTypeCache = index;
  }
  return state.ammoHardpointTypeCache.get(
    normalizeLookupKey(item.stats?.type || item.name),
  ) || "";
}

function ammoCapacityQuirkKey(item) {
  return normalizeLookupKey(item?.stats?.type || item?.name)
    .replaceAll("ammo", "")
    .replace(/^clan/, "c")
    .replace("hyperassaultgauss", "hag")
    .replace("silverbulletgauss", "silverbullet")
    .replace(/(lb\d+x)ac/, "$1");
}

function ammoCapacityQuirkBonus(item, quirks = []) {
  if (item?.item_type !== "ammo") return 0;
  const ammoKey = ammoCapacityQuirkKey(item);
  if (!ammoKey) return 0;
  return quirks.reduce((sum, quirk) => {
    const name = String(quirk?.name || "").toLowerCase();
    if (!name.startsWith("ammocapacity_") || !name.endsWith("_additive")) return sum;
    const prefix = normalizeLookupKey(name.slice("ammocapacity_".length, -"_additive".length));
    if (prefix !== ammoKey) return sum;
    return sum + number(quirk.value);
  }, 0);
}

function effectiveAmmoShots(item, quirks = []) {
  const baseShots = Math.max(0, number(item?.stats?.numShots));
  const capacityBonus = ammoCapacityQuirkBonus(item, quirks) * Math.max(0, itemTons(item));
  return Math.floor(baseShots + capacityBonus + 0.000001);
}

function hardpointSlots(hardpoint) {
  return Math.max(1, number(hardpoint?.weapon_slots, 1));
}

function hardpointType(hardpoint) {
  if (String(hardpoint?.Type) === "4") return "ams";
  return String(hardpoint?.hardpoint_type || "").toLowerCase();
}

function hardpointCountsFromDefinition(definition) {
  const counts = {};
  Object.values(definition?.components || {}).forEach((component) => {
    (component.hardpoints || []).forEach((hp) => {
      const type = hardpointType(hp);
      if (!HARDPOINT_ORDER.includes(type)) return;
      counts[type] = (counts[type] || 0) + hardpointSlots(hp);
    });
  });
  return counts;
}

function hardpointCountsFromHardpoints(hardpoints = []) {
  const counts = {};
  hardpoints.forEach((hp) => {
    const type = hardpointType(hp);
    if (!HARDPOINT_ORDER.includes(type)) return;
    counts[type] = (counts[type] || 0) + hardpointSlots(hp);
  });
  return counts;
}

function renderHardpointBadges(counts, className = "", showZero = false) {
  return HARDPOINT_ORDER
    .filter((type) => Object.hasOwn(counts, type) && (showZero || number(counts[type]) > 0))
    .map((type) => `
      <span class="hardpoint-chip ${type}${className ? ` ${className}` : ""}" title="${type}">
        <span class="hardpoint-icon">${HARDPOINT_LABELS[type] || type[0].toUpperCase()}</span>
        <span class="hardpoint-count">${number(counts[type])}</span>
      </span>
    `)
    .join("");
}

function hardpointBadges(mech, build = buildFromLoadout(mech)) {
  return renderHardpointBadges(hardpointCountsFromDefinition(effectiveDefinition(mech, build)));
}

function hardpointTypes(mech, build = buildFromLoadout(mech)) {
  const definition = effectiveDefinition(mech, build);
  const types = new Set();
  Object.values(definition?.components || {}).forEach((component) => {
    (component.hardpoints || []).forEach((hp) => {
      const type = hardpointType(hp);
      if (HARDPOINT_ORDER.includes(type)) types.add(type);
    });
  });
  return HARDPOINT_ORDER.filter((type) => types.has(type));
}

function stockHardpointBadges(mech) {
  const key = String(mech?.id || "");
  if (!key) return "";
  const cached = state.mechHardpointBadgeCache.get(key);
  if (cached !== undefined) return cached;
  const badges = hardpointBadges(mech, buildFromLoadout(mech));
  state.mechHardpointBadgeCache.set(key, badges);
  return badges;
}

function mechSlotBadge(type, label, count = null) {
  const markerOnly = count === null;
  return `
    <span class="hardpoint-chip ${type} mech-slot-tag${markerOnly ? " marker-only" : ""}" title="${type}">
      <span class="hardpoint-icon">${label}</span>
      ${markerOnly ? "" : `<span class="hardpoint-count">${number(count)}</span>`}
    </span>
  `;
}

function mechSlotBadges(mech) {
  const key = String(mech?.id || "");
  if (!key) return "";
  const cached = state.mechSlotBadgeCache.get(key);
  if (cached !== undefined) return cached;

  const build = buildFromLoadout(mech);
  const counts = hardpointCountsFromDefinition(effectiveDefinition(mech, build));
  const badges = HARDPOINT_ORDER
    .filter((type) => number(counts[type]) > 0)
    .map((type) => mechSlotBadge(type, HARDPOINT_LABELS[type] || type[0].toUpperCase(), counts[type]));
  const jumpJets = maximumJumpJets(mech, build);
  if (jumpJets > 0) badges.push(mechSlotBadge("jumpjet", "JJ", jumpJets));

  const stats = currentDefinition(mech).stats || {};
  if (number(stats.CanEquipMASC) > 0 || number(stats.CanEquipMasc) > 0) {
    badges.push(mechSlotBadge("masc", "MASC"));
  }

  const html = badges.join("");
  state.mechSlotBadgeCache.set(key, html);
  return html;
}

function stockHardpointTypes(mech) {
  const key = String(mech?.id || "");
  if (!key) return [];
  const cached = state.mechHardpointTypeCache.get(key);
  if (cached) return cached;
  const types = hardpointTypes(mech, buildFromLoadout(mech));
  state.mechHardpointTypeCache.set(key, types);
  return types;
}

function hardpointTypeBadges(types) {
  return (types || [])
    .map((type) => `
      <span class="hardpoint-chip ${type}" title="${type}">
        <span class="hardpoint-icon">${HARDPOINT_LABELS[type] || type.toUpperCase()}</span>
      </span>
    `)
    .join("");
}

function mechListQuirkValues(mech, applyQuirks = state.infoApplyQuirks) {
  if (!applyQuirks) return {};
  return effectiveQuirkValues(mech, buildFromLoadout(mech));
}

function durabilityTotalForScope(rows, scope) {
  const componentKeys = scope?.componentKeys;
  if (!componentKeys) {
    return rows.reduce((sum, row) => sum + number(row.total), 0);
  }
  const allowed = new Set(componentKeys);
  return rows.reduce((sum, row, index) => (allowed.has(INFO_COMPONENTS[index]?.key) ? sum + number(row.total) : sum), 0);
}

function durabilityTotalsByScope(armorRows, structureRows, combinedRows) {
  return Object.fromEntries(
    STATS_DURABILITY_SCOPES.map((scope) => [
      scope.key,
      {
        total: durabilityTotalForScope(combinedRows, scope),
        armor: durabilityTotalForScope(armorRows, scope),
        structure: durabilityTotalForScope(structureRows, scope),
      },
    ]),
  );
}

function mechListSummary(mech, applyQuirks = state.infoApplyQuirks) {
  const key = `${mech.id}:${applyQuirks ? 1 : 0}`;
  const cached = state.mechListSummaryCache.get(key);
  if (cached) return cached;

  const values = mechListQuirkValues(mech, applyQuirks);
  const baseArmorRows = armorInfoRows({}, mech);
  const baseStructureRows = structureInfoRows({}, mech);
  const baseCombinedRows = combinedDurabilityRows(baseArmorRows, baseStructureRows);
  const armorRows = armorInfoRows(values, mech);
  const structureRows = structureInfoRows(values, mech);
  const combinedRows = combinedDurabilityRows(armorRows, structureRows);
  const baseMovement = movementInfo({}, mech);
  const build = buildFromLoadout(mech);
  const quirks = effectiveQuirks(mech, build);
  const summary = {
    stats: currentDefinition(mech).stats || {},
    quirks,
    quirkStats: quirkSummaryStats(quirks),
    baseCombinedTotal: baseCombinedRows.reduce((sum, row) => sum + number(row.total), 0),
    armorTotal: armorRows.reduce((sum, row) => sum + number(row.total), 0),
    structureTotal: structureRows.reduce((sum, row) => sum + number(row.total), 0),
    combinedTotal: combinedRows.reduce((sum, row) => sum + number(row.total), 0),
    durabilityByScope: durabilityTotalsByScope(armorRows, structureRows, combinedRows),
    baseMovement,
    movement: movementInfo(values, mech),
  };
  state.mechListSummaryCache.set(key, summary);
  return summary;
}

function scheduleStatsSummaryWarmup() {
  if (state.statsSummaryWarmupScheduled || !state.mechs.length) return;
  state.statsSummaryWarmupScheduled = true;
  let index = 0;
  const schedule = window.requestIdleCallback
    ? (callback) => window.requestIdleCallback(callback, { timeout: 500 })
    : (callback) => window.setTimeout(() => callback({ timeRemaining: () => 0 }), 16);
  const warmNextBatch = (deadline) => {
    let processed = 0;
    while (
      index < state.mechs.length
      && (processed < 8 || deadline.timeRemaining() > 3)
    ) {
      mechListSummary(state.mechs[index], true);
      index += 1;
      processed += 1;
    }
    if (index < state.mechs.length) schedule(warmNextBatch);
  };
  schedule(warmNextBatch);
}

function formatChassisName(chassis) {
  return String(chassis || t("common.unknown"))
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function variantCode(mech) {
  return mech?.definition?.stats?.Variant || String(mech?.name || "").toUpperCase();
}

function buildGameLocalizationLookup(localization) {
  const lookup = new Map();
  for (const [sourceKey, value] of Object.entries(localization || {})) {
    const key = String(sourceKey).replace(/^@/, "").toLocaleLowerCase();
    if (!lookup.has(key)) lookup.set(key, value);
  }
  return lookup;
}

function gameLocalizedText(key) {
  return state.gameLocalizationLookup.get(
    String(key || "").replace(/^@/, "").toLocaleLowerCase(),
  );
}

function chassisDisplayName(variants) {
  const mech = variants[0];
  if (!mech) return t("common.unknown");
  return gameLocalizedText(mech.chassis) || formatChassisName(mech.chassis);
}

function sortMechsByVariant(a, b) {
  return variantCode(a).localeCompare(variantCode(b), undefined, { numeric: true });
}

function factionRank(faction) {
  if (faction === "Clan") return 0;
  if (faction === "InnerSphere") return 1;
  return 99;
}

function factionLabel(faction) {
  return FACTION_LABELS[faction] || faction || t("common.unknown");
}

function normalizeFactionKey(faction) {
  return String(faction || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function itemMatchesMechFaction(item, mech = state.selectedMech) {
  if (!item) return false;
  if (!mech) return true;
  const itemFactions = String(item.faction || "")
    .split(",")
    .map(normalizeFactionKey)
    .filter(Boolean);
  if (!itemFactions.length) return true;
  const mechFaction = normalizeFactionKey(mech?.faction);
  return Boolean(mechFaction) && itemFactions.includes(mechFaction);
}

function factionClass(faction) {
  return faction === "Clan" ? "faction-clan" : "faction-innersphere";
}

function weightClassClass(weightClass) {
  return `weight-${String(weightClass || "unknown").toLowerCase()}`;
}

function sortChassisGroups(a, b) {
  const tons = Number(a.tons) - Number(b.tons);
  const faction = factionRank(a.faction) - factionRank(b.faction);
  const alphabetical = a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: "base" });
  const criterion = state.mechSort === "alphabetical"
    ? alphabetical
    : state.mechSort === "tons"
      ? tons || alphabetical
      : tons || a.order - b.order;
  const direction = state.mechSortDirection === "desc" ? -1 : 1;
  return (state.mechSortGroupFaction ? faction : 0) || criterion * direction;
}

function chassisGroupsForWeight(grouped, weightClass) {
  return Array.from(grouped.get(weightClass).entries())
    .map(([chassis, variants], order) => {
      variants.sort(sortMechsByVariant);
      return {
        chassis,
        variants,
        label: chassisDisplayName(variants),
        tons: variants[0]?.definition?.stats?.MaxTons || "?",
        faction: variants[0]?.faction || t("common.unknown"),
        order,
      };
    })
    .sort(sortChassisGroups);
}

function factionSectionsForChassisGroups(chassisGroups) {
  const sections = [];
  chassisGroups.forEach((group) => {
    const last = sections[sections.length - 1];
    if (!last || last.faction !== group.faction) {
      sections.push({
        faction: group.faction,
        groups: [],
        variantCount: 0,
      });
    }
    const section = sections[sections.length - 1];
    section.groups.push(group);
    section.variantCount += group.variants.length;
  });
  return sections;
}

function sortedClassNames(grouped) {
  return Array.from(grouped.keys()).sort((a, b) => {
    const aIndex = WEIGHT_CLASS_ORDER.indexOf(a);
    const bIndex = WEIGHT_CLASS_ORDER.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.localeCompare(b);
  });
}

function groupMechsForList(mechs) {
  const groups = new Map();
  for (const mech of mechs) {
    const weightClass = mech.weight_class || "unknown";
    const chassis = mech.chassis || "unknown";
    if (!groups.has(weightClass)) groups.set(weightClass, new Map());
    const classGroup = groups.get(weightClass);
    if (!classGroup.has(chassis)) classGroup.set(chassis, []);
    classGroup.get(chassis).push(mech);
  }
  return groups;
}

function loadoutForMech(mech) {
  return state.loadouts[mech?.stock_loadout] || {};
}

function omnipodId(value) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

function podById(id) {
  const validId = omnipodId(id);
  return validId ? state.omnipods[String(validId)] || null : null;
}

function hasFixedOmnipods(mech) {
  const loadout = loadoutForMech(mech);
  return Object.values(loadout.components || {}).some((component) => omnipodId(component.omnipod));
}

function omnipodIcon(mech) {
  if (!hasFixedOmnipods(mech)) return "";
  return `
    <span class="omnipod-icon" title="Omnipod" role="img" aria-label="Omnipod">
      <svg viewBox="0 0 32 32" focusable="false" aria-hidden="true">
        <path d="M13 3h6l1 3-2 2h-4l-2-2 1-3Z"></path>
        <path d="M11 9h10l1.5 5-3.5 3h-6l-3.5-3L11 9Z"></path>
        <path d="M5 9h4l-1 9-4 2-1-6 2-5Z"></path>
        <path d="M23 9h4l2 5-1 6-4-2-1-9Z"></path>
        <path d="M11 18h4l-1 11H8l1-7 2-4Z"></path>
        <path d="M17 18h4l2 4 1 7h-6l-1-11Z"></path>
      </svg>
    </span>
  `;
}

function findOmnipod(chassis, setName, componentName) {
  const wantedChassis = String(chassis || "").toLowerCase();
  const wantedSet = String(setName || "").toLowerCase();
  const wantedComponent = String(componentName || "").toLowerCase();
  const matches = Object.values(state.omnipods || {}).filter((pod) => (
    String(pod.chassis || "").toLowerCase() === wantedChassis
    && String(pod.set || "").toLowerCase() === wantedSet
    && String(pod.component || "").toLowerCase() === wantedComponent
  ));
  return matches.length === 1 ? matches[0] : null;
}

function applyFixedOmnipods(mech, build) {
  const loadout = loadoutForMech(mech);
  const migrateEngineHeatSinks = !Array.isArray(build.engineHeatSinks);
  normalizeRearArmor(build, mech, loadout);
  build.actuatorState = Number.isFinite(build.actuatorState)
    ? Math.max(0, build.actuatorState)
    : (hasFixedOmnipods(mech)
      ? MWO_ACTUATOR_BITS.leftLowerArmRemoved | MWO_ACTUATOR_BITS.rightLowerArmRemoved
      : 0);
  build.components ||= {};
  for (const name of COMPONENT_ORDER) {
    build.components[name] ||= { armor: 0, items: [] };
    build.components[name].omnipod = omnipodId(build.components[name].omnipod);
    const stockPodId = omnipodId(loadout.components?.[name]?.omnipod);
    if (stockPodId && !build.components[name].omnipod) build.components[name].omnipod = stockPodId;
  }
  if (fixedOmniEngine(mech)) {
    for (const component of Object.values(build.components)) {
      component.items = (component.items || []).filter((entry) => itemById(entry.item_id)?.item_type !== "engine");
    }
  }
  const centre = build.components.centre_torso;
  if (centre && !centre.omnipod) {
    const setName = String(mech?.stock_loadout || mech?.name || "").toLowerCase();
    const centrePod = findOmnipod(mech?.chassis, setName, "centre_torso");
    if (centrePod?.id) centre.omnipod = centrePod.id;
  }
  return normalizeEngineHeatSinks(mech, build, { fillFromCentre: migrateEngineHeatSinks });
}

function normalizeRearArmor(build, mech, loadout = loadoutForMech(mech)) {
  const current = build?.rearArmor;
  if (current && typeof current === "object" && !Array.isArray(current)) {
    build.rearArmor = Object.fromEntries(
      Object.keys(TORSO_REAR_COMPONENTS).map((name) => [name, Math.max(0, number(current[name]))]),
    );
    return build.rearArmor;
  }

  let remaining = Math.max(0, number(current));
  const rearArmor = {};
  for (const [name, rearName] of Object.entries(TORSO_REAR_COMPONENTS)) {
    const stockValue = Math.max(0, number(loadout?.components?.[rearName]?.armor));
    rearArmor[name] = Math.min(stockValue, remaining);
    remaining -= rearArmor[name];
  }
  if (remaining > 0) rearArmor.centre_torso += remaining;
  build.rearArmor = rearArmor;
  return rearArmor;
}

function buildFromLoadout(mech) {
  const loadout = loadoutForMech(mech);
  const components = {};
  for (const name of COMPONENT_ORDER) {
    const component = loadout.components?.[name] || {};
    components[name] = {
      armor: number(component.armor),
      omnipod: omnipodId(component.omnipod),
      items: (component.items || []).map((entry) => ({ ...entry })),
    };
  }
  const rearArmor = Object.fromEntries(
    Object.entries(TORSO_REAR_COMPONENTS).map(([name, rearName]) => (
      [name, number(loadout.components?.[rearName]?.armor)]
    )),
  );
  return applyFixedOmnipods(mech, {
    mechId: mech.id,
    loadoutName: mech.stock_loadout,
    components,
    rearArmor,
    actuatorState: hasFixedOmnipods(mech)
      ? MWO_ACTUATOR_BITS.leftLowerArmRemoved | MWO_ACTUATOR_BITS.rightLowerArmRemoved
      : 0,
    upgrades: JSON.parse(JSON.stringify(loadout.upgrades || {})),
  });
}

function mwoLoadoutEntryType(item) {
  if (item?.item_type === "weapon") return "weapon";
  if (item?.item_type === "ammo") return "ammo";
  return "module";
}

function mwoUpgradeId(category, bits, mech) {
  const id = MWO_UPGRADE_IDS[category]?.[bits];
  if (id && itemById(id)) return id;
  return number(loadoutForMech(mech).upgrades?.[category]?.ItemID);
}

function mwoUpgradeBits(category, itemId) {
  const bits = MWO_UPGRADE_BITS[category]?.[Number(itemId)];
  if (bits === undefined) {
    throw new Error(`Unsupported ${category} upgrade ID: ${itemId}`);
  }
  return bits;
}

function validateMwoOmnipod(mech, componentName, podId) {
  const pod = podById(podId);
  if (
    !pod
    || String(pod.chassis || "").toLowerCase() !== String(mech.chassis || "").toLowerCase()
    || String(pod.component || "").toLowerCase() !== componentName
  ) {
    throw new Error(t("loadout.invalidOmnipod", {
      component: COMPONENT_NAMES[componentName] || componentName,
      id: podId,
    }));
  }
  return pod;
}

function buildFromMwoCode(decoded, mech) {
  const components = {};
  for (const componentName of COMPONENT_ORDER) {
    const source = decoded.components?.[componentName] || {};
    if (decoded.isOmni && componentName !== "centre_torso") {
      validateMwoOmnipod(mech, componentName, source.omnipod);
    }
    const items = (source.itemIds || []).map((itemId) => {
      const item = itemById(itemId);
      if (!item) throw new Error(t("loadout.invalidItem", { id: itemId }));
      return {
        type: mwoLoadoutEntryType(item),
        item_id: item.id,
        weapon_group: null,
      };
    });
    components[componentName] = {
      armor: Math.max(0, number(source.armor)),
      omnipod: decoded.isOmni && componentName !== "centre_torso"
        ? number(source.omnipod)
        : null,
      items,
    };
  }

  return applyFixedOmnipods(mech, {
    mechId: mech.id,
    loadoutName: mech.stock_loadout,
    components,
    rearArmor: {
      centre_torso: Math.max(0, number(decoded.rearArmor?.centre_torso)),
      left_torso: Math.max(0, number(decoded.rearArmor?.left_torso)),
      right_torso: Math.max(0, number(decoded.rearArmor?.right_torso)),
    },
    actuatorState: decoded.isOmni ? Math.max(0, number(decoded.actuatorState)) : 0,
    upgrades: {
      armor: { ItemID: mwoUpgradeId("armor", decoded.upgrades.armorType, mech) },
      structure: { ItemID: mwoUpgradeId("structure", decoded.upgrades.structureType, mech) },
      heatsinks: { ItemID: mwoUpgradeId("heatsinks", decoded.upgrades.heatSinkType, mech) },
      artemis: { Equipped: decoded.upgrades.artemis ? 1 : 0 },
    },
  });
}

function buildAsMwoLoadout(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build) throw new Error(t("info.selectMech"));
  const isOmni = hasFixedOmnipods(mech);
  const components = Object.fromEntries(MWO_EXPORT_COMPONENT_ORDER.map((componentName) => {
    const component = build.components?.[componentName] || {};
    const engineSinkItemIds = componentName === "centre_torso"
      ? engineHeatSinkEntries(build).map((entry) => Number(entry.item_id))
      : [];
    return [componentName, {
      armor: Math.max(0, number(component.armor)),
      omnipod: component.omnipod || null,
      itemIds: [
        ...(component.items || []).map((entry) => Number(entry.item_id)),
        ...engineSinkItemIds,
      ],
    }];
  }));
  return {
    chassisId: mech.id,
    isOmni,
    actuatorState: isOmni ? Math.max(0, number(build.actuatorState)) : 0,
    upgrades: {
      armorType: mwoUpgradeBits("armor", build.upgrades?.armor?.ItemID),
      structureType: mwoUpgradeBits("structure", build.upgrades?.structure?.ItemID),
      heatSinkType: mwoUpgradeBits("heatsinks", build.upgrades?.heatsinks?.ItemID),
      artemis: Boolean(build.upgrades?.artemis?.Equipped),
    },
    components,
    rearArmor: {
      centre_torso: Math.max(0, number(build.rearArmor?.centre_torso)),
      left_torso: Math.max(0, number(build.rearArmor?.left_torso)),
      right_torso: Math.max(0, number(build.rearArmor?.right_torso)),
    },
  };
}

function compatibleHeatSinkForUpgrade(build = state.currentBuild) {
  const upgrade = itemById(build?.upgrades?.heatsinks?.ItemID);
  const item = itemById(upgrade?.stats?.compatibleHeatSink);
  return isHeatSink(item) ? item : null;
}

function currentBuildAsMwoLoadout() {
  return buildAsMwoLoadout();
}

function savedKey(mech) {
  return `local-mwo-build:${mech.name}`;
}

function normalizeInitialFittingPreferences(value = {}) {
  const percent = (input, fallback) => {
    const parsed = typeof input === "number" ? input : NaN;
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.floor(parsed))) : fallback;
  };
  const armor = Object.fromEntries(COMPONENT_ORDER.map((name) => {
    const front = percent(value?.armor?.[name]?.front, 100);
    const rear = Object.hasOwn(TORSO_REAR_COMPONENTS, name)
      ? Math.min(100 - front, percent(value?.armor?.[name]?.rear, 0)) : 0;
    return [name, { front, rear }];
  }));
  INITIAL_ARMOR_GROUPS.forEach((group) => {
    const representative = armor[group.components[0]];
    group.components.slice(1).forEach((name) => {
      armor[name] = { ...representative };
    });
  });
  return { mode: value?.mode === "stock" ? "stock" : "strip", armorMode: ["full", "none", "custom"].includes(value?.armorMode) ? value.armorMode : "full", armor };
}

function savedInitialFittingPreferences() {
  try {
    return normalizeInitialFittingPreferences(JSON.parse(localStorage.getItem(INITIAL_FITTING_STORAGE_KEY) || "null"));
  } catch {
    return normalizeInitialFittingPreferences();
  }
}

function buildForMechSelection(mech) {
  const build = buildFromLoadout(mech);
  const preferences = state.initialFittingPreferences;
  if (globalThis.__MWOLAB_MOBILE__ || preferences.mode !== "strip") return build;
  stripBuildEquipment(build);
  if (preferences.armorMode === "full") {
    maximizeBuildArmor(mech, build);
  } else if (preferences.armorMode === "none") {
    stripBuildArmor(build);
  } else {
    for (const [name, component] of Object.entries(build.components)) {
      const capacity = componentArmorCapacity(name, effectiveComponentDefinition(mech, build, name));
      const allocation = preferences.armor[name];
      component.armor = Math.floor(capacity * allocation.front / 100);
      if (Object.hasOwn(TORSO_REAR_COMPONENTS, name)) {
        build.rearArmor[name] = Math.floor(capacity * allocation.rear / 100);
      }
    }
  }
  return build;
}

function setInitialFittingPreference(field, value, location = null, side = null) {
  const preferences = state.initialFittingPreferences;
  if (field === "mode" && ["stock", "strip"].includes(value)) preferences.mode = value;
  else if (field === "armorMode" && ["full", "none", "custom"].includes(value)) preferences.armorMode = value;
  else if (field === "armor" && INITIAL_ARMOR_GROUPS.some((group) => group.key === location) && ["front", "rear"].includes(side)) {
    if (!Number.isFinite(value)) return;
    const group = INITIAL_ARMOR_GROUPS.find((entry) => entry.key === location);
    const allocation = preferences.armor[group.components[0]];
    const other = side === "front" ? "rear" : "front";
    if (side === "rear" && !group.rear) return;
    allocation[side] = Math.max(0, Math.min(group.rear ? 100 - allocation[other] : 100, Math.floor(value)));
    group.components.forEach((name) => {
      preferences.armor[name] = { ...allocation };
    });
  } else return;
  try { localStorage.setItem(INITIAL_FITTING_STORAGE_KEY, JSON.stringify(preferences)); }
  catch { /* Retain preferences for this session when storage is unavailable. */ }
  renderInitialFittingPreferences();
}

function renderInitialFittingPreferences() {
  const container = $("initial-armor-percentages");
  if (!container) return;
  const preferences = state.initialFittingPreferences;
  for (const [name, field] of [["initial-fitting-mode", "mode"], ["initial-armor-mode", "armorMode"]]) {
    document.querySelectorAll(`[name="${name}"]`).forEach((input) => {
      input.checked = input.value === preferences[field];
    });
  }
  const stripEnabled = preferences.mode === "strip";
  const customArmorEnabled = stripEnabled && preferences.armorMode === "custom";
  const armorSettings = $("initial-armor-settings");
  armorSettings.classList.toggle("disabled", !stripEnabled);
  armorSettings.querySelectorAll('[name="initial-armor-mode"]').forEach((input) => {
    input.disabled = !stripEnabled;
  });
  container.classList.toggle("disabled", !customArmorEnabled);
  if (!container.children.length) {
    container.innerHTML = INITIAL_ARMOR_GROUPS.map((group) => {
      const label = t(group.labelKey);
      return `<div class="initial-armor-row"><strong>${label}</strong>${(group.rear ? ["front", "rear"] : ["front"]).map((side) => `
        <label><span>${t(`ui.${side}`)}</span><input type="number" min="0" max="100" step="1" data-initial-armor="${group.key}" data-armor-side="${side}" aria-label="${label} ${t(`ui.${side}`)} %"><span>%</span></label>`).join("")}</div>`;
    }).join("");
  }
  container.querySelectorAll("[data-initial-armor]").forEach((input) => {
    const group = INITIAL_ARMOR_GROUPS.find((entry) => entry.key === input.dataset.initialArmor);
    const allocation = preferences.armor[group.components[0]];
    const side = input.dataset.armorSide;
    input.value = allocation[side];
    input.max = group.rear ? 100 - allocation[side === "front" ? "rear" : "front"] : 100;
    input.disabled = !customArmorEnabled;
  });
}

function handleInitialFittingPreferenceChange(event) {
  const input = event.target;
  if (input.name === "initial-fitting-mode") setInitialFittingPreference("mode", input.value);
  else if (input.name === "initial-armor-mode") setInitialFittingPreference("armorMode", input.value);
  else if (input.dataset.initialArmor) {
    setInitialFittingPreference("armor", input.valueAsNumber, input.dataset.initialArmor, input.dataset.armorSide);
    renderInitialFittingPreferences();
  }
}

function loadBuild(mech) {
  return buildFromLoadout(mech);
}

function readLocalBuilds() {
  let records = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_BUILDS_STORAGE_KEY) || "[]");
    if (Array.isArray(parsed)) {
      records = parsed.filter((record) => (
        record
        && typeof record.id === "string"
        && record.mechId !== undefined
        && typeof (record.name || record.saveName) === "string"
        && (record.build || typeof record.loadoutCode === "string")
      ));
    }
  } catch {
    records = [];
  }

  let migrated = false;
  state.mechs.forEach((mech) => {
    const legacyId = `legacy:${mech.id}`;
    if (records.some((record) => record.id === legacyId)) return;
    try {
      const legacyBuild = JSON.parse(localStorage.getItem(savedKey(mech)) || "null");
      if (!legacyBuild) return;
      records.push({
        id: legacyId,
        mechId: mech.id,
        mechName: mech.display_name || mech.name,
        saveName: "LEGACY SAVE",
        name: "LEGACY SAVE",
        build: legacyBuild,
        updatedAt: 0,
      });
      migrated = true;
    } catch {
      // Ignore an invalid legacy entry without removing the user's original data.
    }
  });
  if (migrated) {
    try {
      localStorage.setItem(LOCAL_BUILDS_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The legacy entries remain available under their original keys.
    }
  }
  return records;
}

function writeLocalBuilds(records) {
  try {
    localStorage.setItem(LOCAL_BUILDS_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

function sortedLocalBuilds() {
  const currentMechId = String(state.selectedMech?.id || "");
  return readLocalBuilds().sort((left, right) => {
    const leftCurrent = String(left.mechId) === currentMechId ? 1 : 0;
    const rightCurrent = String(right.mechId) === currentMechId ? 1 : 0;
    return rightCurrent - leftCurrent
      || Number(right.updatedAt || 0) - Number(left.updatedAt || 0)
      || String(left.name || left.saveName).localeCompare(
        String(right.name || right.saveName),
        activeLanguage === "kr" ? "ko" : activeLanguage,
        { numeric: true },
      );
  });
}

function currentDefinition(mech = state.selectedMech) {
  return mech?.definition || {};
}

function omnipodDefinition(pod) {
  if (!pod?.id) return { hardpoints: [], internals: [], fixed: [] };
  const cacheKey = String(pod.id);
  const cached = state.omnipodDefinitionCache.get(cacheKey);
  if (cached) return cached;

  let hardpoints = (pod.hardpoints || []).map((hardpoint) => ({
    ...hardpoint,
    hardpoint_type: hardpointType(hardpoint),
  }));
  if (componentCanEquipEcm(pod)) {
    hardpoints = addEcmCapabilityHardpoint(hardpoints);
  }
  const definition = {
    hardpoints,
    internals: pod.internals || [],
    fixed: pod.fixed || [],
    CanEquipECM: pod.CanEquipECM,
  };
  state.omnipodDefinitionCache.set(cacheKey, definition);
  return definition;
}

function addEcmCapabilityHardpoint(hardpoints) {
  if (hardpoints.some((hardpoint) => hardpointType(hardpoint) === "ecm")) return hardpoints;
  return [...hardpoints, {
    ID: "component-ecm-capability",
    hardpoint_type: "ecm",
    Type: "ecm",
    Slots: 1,
    weapon_slots: 1,
  }];
}

function actuatorIsRemoved(componentName, itemId, build = state.currentBuild) {
  const actuatorState = Math.max(0, number(build?.actuatorState));
  if (componentName === "left_arm") {
    if (Number(itemId) === LOWER_ARM_ACTUATOR_ID) {
      return Boolean(actuatorState & MWO_ACTUATOR_BITS.leftLowerArmRemoved);
    }
    if (Number(itemId) === HAND_ACTUATOR_ID) {
      return Boolean(
        actuatorState
        & (MWO_ACTUATOR_BITS.leftLowerArmRemoved | MWO_ACTUATOR_BITS.leftHandRemoved),
      );
    }
  }
  if (componentName === "right_arm") {
    if (Number(itemId) === LOWER_ARM_ACTUATOR_ID) {
      return Boolean(actuatorState & MWO_ACTUATOR_BITS.rightLowerArmRemoved);
    }
    if (Number(itemId) === HAND_ACTUATOR_ID) {
      return Boolean(
        actuatorState
        & (MWO_ACTUATOR_BITS.rightLowerArmRemoved | MWO_ACTUATOR_BITS.rightHandRemoved),
      );
    }
  }
  return false;
}

function effectiveComponentDefinition(mech = state.selectedMech, build = state.currentBuild, componentName) {
  const base = currentDefinition(mech).components?.[componentName] || {};
  const buildComponent = build?.components?.[componentName] || {};
  const pod = podById(buildComponent.omnipod);
  const podDefinition = pod ? omnipodDefinition(pod) : { hardpoints: [], internals: [], fixed: [] };
  const podHardpoints = podDefinition.hardpoints;
  let hardpoints = pod
    ? podHardpoints.map((hardpoint) => ({
      ...hardpoint,
      hardpoint_type: hardpointType(hardpoint),
    }))
    : (base.hardpoints || []).map((hardpoint) => ({
      ...hardpoint,
      hardpoint_type: hardpointType(hardpoint),
    }));
  const capabilitySource = pod ? podDefinition : base;
  if (componentCanEquipEcm(capabilitySource)) {
    hardpoints = addEcmCapabilityHardpoint(hardpoints);
  }
  const internals = [...(base.internals || []), ...podDefinition.internals]
    .filter((itemId) => !actuatorIsRemoved(componentName, itemId, build));
  return {
    ...base,
    hardpoints,
    internals,
    fixed: [...(base.fixed || []), ...podDefinition.fixed],
    fixedSources: [
      ...(base.fixed || []).map(() => "chassis"),
      ...podDefinition.fixed.map(() => "omnipod"),
    ],
  };
}

function effectiveDefinition(mech = state.selectedMech, build = state.currentBuild) {
  const definition = currentDefinition(mech);
  const components = {};
  for (const name of Object.keys(definition.components || {})) {
    components[name] = effectiveComponentDefinition(mech, build, name);
  }
  return {
    ...definition,
    components,
  };
}

function activeMechlabTab() {
  return state.mechlabTabs.find((tab) => tab.id === state.activeMechlabTabId) || null;
}

function hasFocusedEmptyMechlabTabSlot() {
  return state.mechlabPendingTabIndex === state.mechlabTabs.length
    && state.mechlabTabs.length < MAX_MECHLAB_FITTING_TABS;
}

function focusEmptyMechlabTabSlot() {
  if (state.mechlabTabs.length >= MAX_MECHLAB_FITTING_TABS) return false;
  rememberActiveMechlabTabBuild();
  state.mechlabPendingTabIndex = state.mechlabTabs.length;
  state.mechlabBrowseIntent = "add";
  return true;
}

function clearEmptyMechlabTabSlotFocus() {
  state.mechlabPendingTabIndex = null;
}

function mechlabFittingTargetMode(mode = "replace") {
  if (hasFocusedEmptyMechlabTabSlot()) return "add";
  return mode === "add" ? "add" : "replace";
}

function restoreMechlabMainTabViewState() {
  state.mechlabBrowseMode = hasFocusedEmptyMechlabTabSlot() || !state.selectedMech;
  state.mechlabCompactListOpen = false;
}

function rememberActiveMechlabTabBuild() {
  const tab = activeMechlabTab();
  if (!tab || !state.currentBuild || String(tab.mechId) !== String(state.selectedMech?.id || "")) return;
  tab.build = state.currentBuild;
}

function applyActiveMechlabTabSelection() {
  const tab = activeMechlabTab();
  const mech = tab ? mechById(tab.mechId) : null;
  state.selectedMech = mech;
  state.currentBuild = mech && tab?.build ? tab.build : null;
  state.selectedMechIdsByTab.mechlab = mech?.id ?? null;
  state.selectedChassis = mech?.chassis || "";
  return tab && mech ? tab : null;
}

function addMechlabTabRecord(mech, build) {
  if (!mech || !build || state.mechlabTabs.length >= MAX_MECHLAB_FITTING_TABS) return null;
  const tab = {
    id: `fitting-${++mechlabFittingTabSequence}`,
    mechId: mech.id,
    build,
  };
  state.mechlabTabs.push(tab);
  state.activeMechlabTabId = tab.id;
  clearEmptyMechlabTabSlotFocus();
  applyActiveMechlabTabSelection();
  return tab;
}

function replaceActiveMechlabTabRecord(mech, build) {
  if (!mech || !build) return null;
  const tab = activeMechlabTab();
  if (!tab) return addMechlabTabRecord(mech, build);
  tab.mechId = mech.id;
  tab.build = build;
  delete tab.communitySource;
  clearEmptyMechlabTabSlotFocus();
  applyActiveMechlabTabSelection();
  return tab;
}

function assignMechlabFittingTabRecord(mech, build, mode = "replace") {
  return mechlabFittingTargetMode(mode) === "add"
    ? addMechlabTabRecord(mech, build)
    : replaceActiveMechlabTabRecord(mech, build);
}

function activateMechlabTabRecord(tabId) {
  const tab = state.mechlabTabs.find((entry) => entry.id === tabId);
  if (!tab) return null;
  rememberActiveMechlabTabBuild();
  clearEmptyMechlabTabSlotFocus();
  state.activeMechlabTabId = tab.id;
  return applyActiveMechlabTabSelection();
}

function restoreMechlabHistoryTabRecord(mech, requestedTabId, build) {
  if (!mech || !build) return null;
  const exactTab = requestedTabId
    ? state.mechlabTabs.find((tab) => (
      tab.id === requestedTabId && String(tab.mechId) === String(mech.id)
    ))
    : null;
  if (exactTab) return activateMechlabTabRecord(exactTab.id);
  if (!requestedTabId) {
    const active = activeMechlabTab();
    if (active && String(active.mechId) === String(mech.id)) return active;
  }
  return addMechlabTabRecord(mech, build);
}

function closeMechlabTabRecord(tabId) {
  if (state.mechlabTabs.length <= 1) return false;
  const index = state.mechlabTabs.findIndex((tab) => tab.id === tabId);
  if (index < 0) return false;
  const closingActiveTab = state.activeMechlabTabId === tabId;
  state.mechlabTabs.splice(index, 1);
  if (state.mechlabPendingTabIndex !== null) {
    state.mechlabPendingTabIndex = state.mechlabTabs.length;
  }
  if (closingActiveTab) {
    const nextIndex = Math.max(0, index - 1);
    state.activeMechlabTabId = state.mechlabTabs[nextIndex].id;
    applyActiveMechlabTabSelection();
  }
  return true;
}

function setActiveMechlabTabBuild(build) {
  const tab = activeMechlabTab();
  if (!tab || !build) return false;
  tab.build = build;
  state.currentBuild = build;
  return true;
}

function rememberActiveTabMechSelection() {
  if (!SINGLE_MECH_SELECTION_TABS.has(state.activeMainTab)) return;
  state.selectedMechIdsByTab[state.activeMainTab] = state.selectedMech?.id ?? null;
  if (state.activeMainTab === "mechlab") rememberActiveMechlabTabBuild();
}

function restoreTabMechSelection(tabName) {
  if (!SINGLE_MECH_SELECTION_TABS.has(tabName)) {
    state.selectedMech = null;
    state.currentBuild = null;
    state.selectedChassis = "";
    return;
  }

  if (tabName === "mechlab") {
    applyActiveMechlabTabSelection();
    return;
  }

  const mech = mechById(state.selectedMechIdsByTab[tabName]);
  state.selectedMech = mech;
  state.selectedChassis = mech?.chassis || "";
  if (!mech) {
    state.currentBuild = null;
    return;
  }

  state.currentBuild = loadBuild(mech);
}

function setMainTab(tabName) {
  if (!MAIN_TAB_NAMES.has(tabName)) tabName = "mechlab";
  rememberActiveTabMechSelection();
  const isCompareTab = tabName === "compare";
  state.activeMainTab = tabName;
  state.compareMode = isCompareTab;
  restoreTabMechSelection(tabName);
  if (tabName === "mechlab") {
    restoreMechlabMainTabViewState();
  }
  if (isCompareTab) {
    state.selectedChassis = "";
  } else if (state.selectedMech) {
    state.selectedChassis = state.selectedMech.chassis || "";
  }
  document.querySelectorAll("[data-main-tab]").forEach((button) => {
    const active = button.dataset.mainTab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.id === `tab-${tabName}`;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  $("mech-browser-layout").hidden = ["stats", "equipment-info"].includes(tabName);
  $("summary-strip").hidden = tabName !== "mechlab";
  if (tabName === "equipment-info") {
    renderEquipmentInfo();
  } else if (tabName === "stats") {
    renderStatsPanel();
  } else {
    if (!globalThis.__MWOLAB_MOBILE__) renderMechList();
    if (tabName === "info") renderInfoPanel();
    if (tabName === "compare") renderComparePanel();
  }
  updateCompareOverlay();
  notifyRecommendationContext();
  if (tabName === "mechlab") requestAnimationFrame(updateMechlabScale);
  if (tabName === "mechlab" && state.mechlabBrowseMode) $("mech-search").focus();
}

function updateMechlabScale() {
  const panel = $("tab-mechlab");
  const workspace = panel?.querySelector(".mechlab-workspace");
  if (!panel || !workspace) return;

  if (globalThis.__MWOLAB_MOBILE__) {
    mechlabScale = 1;
    workspace.style.zoom = "";
    workspace.style.width = "";
    workspace.style.height = "";
    workspace.dataset.scale = "1";
    panel.classList.remove("mechlab-scale-limited");
    return;
  }

  const availableWidth = panel.clientWidth;
  const availableHeight = panel.clientHeight;
  if (!availableWidth || !availableHeight) return;

  const nextScale = Math.max(
    MECHLAB_MINIMUM_SCALE,
    Math.min(1, availableWidth / MECHLAB_REFERENCE_WIDTH, availableHeight / MECHLAB_REFERENCE_HEIGHT),
  );
  mechlabScale = Number(nextScale.toFixed(4));
  const logicalWidth = Math.max(MECHLAB_REFERENCE_WIDTH, availableWidth / mechlabScale);
  const logicalHeight = Math.max(MECHLAB_REFERENCE_HEIGHT, availableHeight / mechlabScale);
  const scaleLimited = mechlabScale === MECHLAB_MINIMUM_SCALE
    && (MECHLAB_REFERENCE_WIDTH * mechlabScale > availableWidth
      || MECHLAB_REFERENCE_HEIGHT * mechlabScale > availableHeight);
  workspace.style.zoom = mechlabScale === 1 ? "" : String(mechlabScale);
  workspace.style.width = mechlabScale === 1 ? "" : `${logicalWidth}px`;
  workspace.style.height = mechlabScale === 1 ? "" : `${logicalHeight}px`;
  workspace.dataset.scale = String(mechlabScale);
  panel.classList.toggle("mechlab-scale-limited", scaleLimited);
}

function scheduleMechlabScaleUpdate() {
  cancelAnimationFrame(mechlabScaleFrame);
  mechlabScaleFrame = requestAnimationFrame(updateMechlabScale);
}

function setupMechlabAutoScale() {
  const panel = $("tab-mechlab");
  if (!panel) return;
  mechlabScaleObserver?.disconnect();
  if (typeof ResizeObserver === "function") {
    mechlabScaleObserver = new ResizeObserver(scheduleMechlabScaleUpdate);
    mechlabScaleObserver.observe(panel);
  }
  window.addEventListener("resize", scheduleMechlabScaleUpdate, { passive: true });
  scheduleMechlabScaleUpdate();
}

function effectiveQuirks(mech = state.selectedMech, build = state.currentBuild) {
  const collector = new Map();
  const definition = currentDefinition(mech);
  (definition.quirks || []).forEach((quirk) => addQuirk(collector, quirk, "Variant", {
    sourceKind: "variant",
  }));

  const setCounts = {};
  const setBonuses = {};
  for (const [component, buildComponent] of Object.entries(build?.components || {})) {
    const podId = buildComponent.omnipod;
    if (!podId) continue;
    const pod = state.omnipods[String(podId)];
    if (!pod) continue;
    (pod.quirks || []).forEach((quirk) => addQuirk(
      collector,
      quirk,
      COMPONENT_NAMES[component] || "Omnipod",
      {
        sourceKind: component === "centre_torso" ? "fixedCt" : "omnipod",
        component,
        podId: pod.id,
      },
    ));
    if (pod.set) {
      setCounts[pod.set] = (setCounts[pod.set] || 0) + 1;
      setBonuses[pod.set] = pod.set_bonuses || [];
    }
  }

  for (const [setName, count] of Object.entries(setCounts)) {
    for (const bonus of setBonuses[setName] || []) {
      if (count >= number(bonus.piece_count)) {
        (bonus.quirks || []).forEach((quirk) => addQuirk(
          collector,
          quirk,
          `${setName.toUpperCase()} ${bonus.piece_count}pc`,
          {
            sourceKind: "setBonus",
            setName,
            pieceCount: number(bonus.piece_count),
          },
        ));
      }
    }
  }

  return Array.from(collector.values())
    .map((quirk) => ({
      ...quirk,
      value_text: quirkValueText(quirk.name, quirk.value),
      source_text: Array.from(quirk.sources).join(", "),
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));
}

function skillScopeMatches(scope, mech) {
  const type = String(scope?.type || "").toLowerCase();
  const expected = normalizeLookupKey(scope?.name);
  if (!type || !expected || !mech) return false;
  if (type === "faction") {
    const faction = String(mech.faction || "").toLowerCase() === "innersphere"
      ? "is"
      : normalizeLookupKey(mech.faction);
    return faction === expected;
  }
  if (type === "weightclass") {
    return normalizeLookupKey(mech.weight_class) === expected;
  }
  if (type === "tonnage") {
    const expectedTonnage = Number(scope.name);
    return Number.isFinite(expectedTonnage)
      && number(currentDefinition(mech).stats?.MaxTons) === expectedTonnage;
  }
  if (type === "mech") {
    return [mech.name, mech.chassis, mech.display_name]
      .map(normalizeLookupKey)
      .includes(expected);
  }
  return false;
}

function resolvedSkillEffectValue(effect, mech) {
  let best = {
    depth: 0,
    value: number(effect?.value),
  };
  const visit = (scopes, depth) => {
    (scopes || []).forEach((scope) => {
      if (!skillScopeMatches(scope, mech)) return;
      const value = scope.value === null || scope.value === undefined
        ? best.value
        : number(scope.value);
      if (depth >= best.depth) best = { depth, value };
      visit(scope.children, depth + 1);
    });
  };
  visit(effect?.scopes, 1);
  return best.value;
}

function skillNodeRequirementsMet(node, mech, build) {
  const definition = effectiveDefinition(mech, build);
  const requirementsMet = (node?.requires || []).every((requirement) => {
    if (requirement.equipment) {
      return normalizeLookupKey(requirement.equipment) === "jumpjets"
        && maximumJumpJets(mech, build) > 0;
    }
    if (requirement.hardpoint) {
      const requiredType = normalizeLookupKey(requirement.hardpoint);
      return Object.values(definition.components || {}).some((component) => (
        (component.hardpoints || []).some((hardpoint) => (
          normalizeLookupKey(hardpointType(hardpoint)) === requiredType
        ))
      ));
    }
    return false;
  });
  if (!requirementsMet) return false;

  return (node?.affects || []).every((affect) => {
    if (!affect.mechProperty) return true;
    if (normalizeLookupKey(affect.mechProperty) === "no360torsotwist") {
      return number(definition.movement?.MaxTorsoAngleYaw) < 360;
    }
    return false;
  });
}

function skillSelectionGroups() {
  const categories = new Map(
    (state.skills.categories || []).map((category) => [category.key, category]),
  );
  return SKILL_SELECTION_GROUP_DEFINITIONS
    .map((definition) => {
      const category = categories.get(definition.category);
      if (!category) return null;
      const included = new Set(definition.subcategories || []);
      const excluded = new Set(definition.excludeSubcategories || []);
      const nodes = (category.nodes || []).filter((node) => {
        if (included.size) return included.has(node.subcategory);
        if (excluded.size) return !excluded.has(node.subcategory);
        return true;
      });
      return {
        ...definition,
        categoryName: category.name,
        nodes,
      };
    })
    .filter(Boolean);
}

function skillEffectsForGroups(groups, mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build || !groups.length) return [];
  const collector = new Map();
  const visitedNodes = new Set();
  groups.forEach((group) => {
    (group.nodes || []).forEach((node) => {
      const nodeKey = `${group.category}:${node.name}`;
      if (visitedNodes.has(nodeKey) || !skillNodeRequirementsMet(node, mech, build)) return;
      visitedNodes.add(nodeKey);
      (node.effects || []).forEach((effect) => {
        const value = resolvedSkillEffectValue(effect, mech);
        if (!value) return;
        addQuirk(collector, {
          name: String(effect.name || "").toLowerCase(),
          display_name: effect.display_name || effect.name,
          value,
        }, `SKILLS · ${group.key}`, {
          sourceKind: "skill",
          skillCategory: group.category,
          skillGroup: group.key,
          skillNode: node.name,
        });
      });
    });
  });

  return Array.from(collector.values())
    .map((effect) => ({
      ...effect,
      value_text: quirkValueText(effect.name, effect.value),
      source_text: Array.from(effect.sources).join(", "),
    }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

function selectedSkillEffects(mech = state.selectedMech, build = state.currentBuild) {
  if (!mech || !build || state.selectedSkillGroups.size === 0) return [];
  const omnipods = COMPONENT_ORDER.map((name) => build.components?.[name]?.omnipod || "").join(":");
  const selections = Array.from(state.selectedSkillGroups).sort().join(",");
  const cacheKey = `${mech.id}:${omnipods}:${selections}`;
  const cached = state.skillEffectsCache.get(cacheKey);
  if (cached) return cached;

  const effects = skillEffectsForGroups(
    skillSelectionGroups().filter((group) => state.selectedSkillGroups.has(group.key)),
    mech,
    build,
  );
  state.skillEffectsCache.set(cacheKey, effects);
  return effects;
}

function mechlabEffectiveQuirks(mech = state.selectedMech, build = state.currentBuild) {
  const baseQuirks = effectiveQuirks(mech, build);
  const skillEffects = selectedSkillEffects(mech, build);
  if (!skillEffects.length) return baseQuirks;

  const collector = new Map();
  [...baseQuirks, ...skillEffects].forEach((effect) => {
    (effect.contributions || []).forEach((contribution) => {
      const normalizedName = String(contribution.name || "").toLowerCase();
      const existing = collector.get(normalizedName);
      const {
        name,
        display_name: displayName,
        value,
        source,
        ...details
      } = contribution;
      addQuirk(collector, {
        name: normalizedName,
        display_name: existing?.display_name || displayName || name,
        value,
      }, source, details);
    });
  });
  return Array.from(collector.values())
    .map((quirk) => ({
      ...quirk,
      value_text: quirkValueText(quirk.name, quirk.value),
      source_text: Array.from(quirk.sources).join(", "),
    }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

function effectiveQuirkValues(mech = state.selectedMech, build = state.currentBuild) {
  return quirkValues(effectiveQuirks(mech, build));
}

function mechlabQuirkValues(mech = state.selectedMech, build = state.currentBuild) {
  const omnipodKey = COMPONENT_ORDER.map((name) => build?.components?.[name]?.omnipod || "").join(":");
  const skillKey = Array.from(state.selectedSkillGroups).sort().join(",");
  const key = `${mech?.id || ""}:${omnipodKey}:${skillKey}`;
  if (state.mechlabQuirkValuesCache.has(key)) return state.mechlabQuirkValuesCache.get(key);
  const values = quirkValues(mechlabEffectiveQuirks(mech, build));
  state.mechlabQuirkValuesCache.set(key, values);
  return values;
}

function baseMaxArmor(componentName, mech = state.selectedMech) {
  if (componentName === "head") return 18;
  return number(currentDefinition(mech).components?.[componentName]?.hp) * 2;
}

function armorInfoRows(values, mech = state.selectedMech) {
  return INFO_COMPONENTS.map((component) => {
    const frontBase = baseMaxArmor(component.key, mech);
    const frontWithoutSkill = frontBase + quirkAdd(values, "armorresist", component.suffix);
    const rearBase = 0;
    const rear = component.rearSuffix
      ? rearBase + number(values.armorresist_all_additive) + number(values[`armorresist_${component.rearSuffix}_additive`])
      : null;
    const armorBeforeSkill = frontWithoutSkill + number(rear);
    const armorAfterSkill = durabilitySkillFinalValue(
      armorBeforeSkill,
      values.increasedarmor_multiplier,
    );
    const front = frontWithoutSkill + armorAfterSkill - armorBeforeSkill;
    return {
      label: component.label,
      totalBase: frontBase + (component.rearSuffix ? rearBase : 0),
      total: front + number(rear),
      frontBase,
      front,
      rearBase: component.rearSuffix ? rearBase : null,
      rear,
    };
  });
}

function structureInfoRows(values, mech = state.selectedMech) {
  return INFO_COMPONENTS.map((component) => {
    const base = number(currentDefinition(mech).components?.[component.key]?.hp);
    const structureWithoutSkill = base + quirkAdd(values, "internalresist", component.suffix);
    return {
      label: component.label,
      base,
      total: durabilitySkillFinalValue(
        structureWithoutSkill,
        values.increasedstructure_multiplier,
      ),
    };
  });
}

function currentBuildArmorTotal(
  values,
  mech = state.selectedMech,
  build = state.currentBuild,
) {
  const skillMultiplier = number(values.increasedarmor_multiplier);
  return INFO_COMPONENTS.reduce((sum, component) => {
    const frontArmor = number(build?.components?.[component.key]?.armor);
    const frontQuirk = quirkAdd(values, "armorresist", component.suffix);
    if (!component.rearSuffix) {
      return sum + durabilitySkillFinalValue(
        Math.max(0, frontArmor + frontQuirk),
        skillMultiplier,
      );
    }

    const rearArmor = number(build?.rearArmor?.[component.key]);
    const rearQuirk = number(values.armorresist_all_additive)
      + number(values[`armorresist_${component.rearSuffix}_additive`]);
    return sum + durabilitySkillFinalValue(
      Math.max(0, frontArmor + frontQuirk) + Math.max(0, rearArmor + rearQuirk),
      skillMultiplier,
    );
  }, 0);
}

function combinedDurabilityRows(armorRows, structureRows) {
  return armorRows.map((armor, index) => {
    const structure = structureRows[index] || { base: 0, total: 0 };
    const frontBase = armor.frontBase + structure.base;
    const front = armor.front + structure.total;
    const rearBase = armor.rearBase;
    const rear = armor.rear;
    return {
      label: armor.label,
      totalBase: armor.totalBase + structure.base,
      total: armor.total + structure.total,
      frontBase,
      front,
      rearBase,
      rear,
    };
  });
}

function formatInfoNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return fmt(value, digits);
}

function signedInfoNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  const text = fmt(Math.abs(value), digits);
  return `${value >= 0 ? "+" : "-"}${text}`;
}

function specValue(base, final, digits = 1, unit = "", applyQuirks = state.infoApplyQuirks) {
  const delta = final - base;
  const baseText = `${formatInfoNumber(base, digits)}${unit}`;
  if (!applyQuirks || Math.abs(delta) < 0.0001) {
    return `
      <span class="spec-value spec-base-only">
        <span class="spec-final spec-final-base">${baseText}</span>
        <span class="spec-detail spec-detail-empty"></span>
      </span>
    `;
  }
  return `
    <span class="spec-value spec-with-quirk">
      <span class="spec-final">${formatInfoNumber(final, digits)}${unit}</span>
      <span class="spec-detail">
        <span class="spec-sep">|</span>
        <span class="spec-base">${baseText}</span>
        <span class="spec-op">+</span>
        <span class="spec-quirk">${signedInfoNumber(delta, digits)}${unit}</span>
      </span>
    </span>
  `;
}

function specValueList(baseValues, finalValues, digits = 1, unit = "", applyQuirks = state.infoApplyQuirks) {
  const hasDelta = finalValues.some((value, index) => Math.abs(value - baseValues[index]) >= 0.0001);
  const baseText = baseValues.map((value) => formatInfoNumber(value, digits)).join(" / ");
  if (!applyQuirks || !hasDelta) {
    return `
      <span class="spec-value spec-base-only">
        <span class="spec-final spec-final-base">${baseText}${unit}</span>
        <span class="spec-detail spec-detail-empty"></span>
      </span>
    `;
  }
  const finalText = finalValues.map((value) => formatInfoNumber(value, digits)).join(" / ");
  const deltaText = finalValues.map((value, index) => signedInfoNumber(value - baseValues[index], digits)).join(" / ");
  return `
    <span class="spec-value spec-with-quirk">
      <span class="spec-final">${finalText}${unit}</span>
      <span class="spec-detail">
        <span class="spec-sep">|</span>
        <span class="spec-base">${baseText}${unit}</span>
        <span class="spec-op">+</span>
        <span class="spec-quirk">${deltaText}${unit}</span>
      </span>
    </span>
  `;
}

function specMobilityText(finalText, hasDelta, applyQuirks = state.infoApplyQuirks) {
  const finalClass = applyQuirks && hasDelta ? "" : " spec-final-base";
  return `
    <span class="spec-value spec-mobility-value">
      <span class="spec-final${finalClass}">${finalText}</span>
      <span class="spec-detail spec-detail-empty"></span>
    </span>
  `;
}

function specMobilityValue(base, final, digits = 1, unit = "", applyQuirks = state.infoApplyQuirks) {
  const hasDelta = Math.abs(final - base) >= 0.0001;
  const value = applyQuirks && hasDelta ? final : base;
  return specMobilityText(`${formatInfoNumber(value, digits)}${unit}`, hasDelta, applyQuirks);
}

function specMobilityList(baseValues, finalValues, digits = 1, unit = "", applyQuirks = state.infoApplyQuirks) {
  const hasDelta = finalValues.some((value, index) => Math.abs(value - baseValues[index]) >= 0.0001);
  const values = applyQuirks && hasDelta ? finalValues : baseValues;
  const finalText = `${values.map((value) => formatInfoNumber(value, digits)).join(" / ")}${unit}`;
  return specMobilityText(finalText, hasDelta, applyQuirks);
}

function specAnglePair(baseTorso, finalTorso, arm, axis, digits = 1, applyQuirks = state.infoApplyQuirks) {
  const torsoChanged = Math.abs(finalTorso - baseTorso) >= 0.0001;
  const torso = applyQuirks && torsoChanged ? finalTorso : baseTorso;
  const torsoClass = applyQuirks && torsoChanged ? "spec-angle-boosted" : "";
  return specMobilityText(`
    <span class="${torsoClass}">${formatInfoNumber(torso, digits)}°</span>
    <span class="spec-speed-sep">/</span>
    <span>${formatInfoNumber(arm, digits)}°</span>
  `, false, applyQuirks);
}

function speedPairHtml(forward, reverse, forwardChanged, reverseChanged, digits = 1, unit = "") {
  const forwardClass = forwardChanged ? "spec-speed-boosted" : "";
  const reverseClass = reverseChanged ? "spec-speed-boosted" : "";
  return `
    <span class="${forwardClass}">${formatInfoNumber(forward, digits)}</span>
    <span class="spec-speed-sep">-</span>
    <span class="${reverseClass}">${formatInfoNumber(reverse, digits)}${unit}</span>
  `;
}

function specMobilitySpeed(baseForward, baseReverse, finalForward, finalReverse, digits = 1, unit = "", applyQuirks = state.infoApplyQuirks) {
  const forwardChanged = Math.abs(finalForward - baseForward) >= 0.0001;
  const reverseChanged = Math.abs(finalReverse - baseReverse) >= 0.0001;
  const hasDelta = forwardChanged || reverseChanged;
  const forward = applyQuirks && hasDelta ? finalForward : baseForward;
  const reverse = applyQuirks && hasDelta ? finalReverse : baseReverse;
  const finalText = speedPairHtml(
    forward,
    reverse,
    applyQuirks && forwardChanged,
    applyQuirks && reverseChanged,
    digits,
    unit,
  );
  return specMobilityText(finalText, false, applyQuirks);
}

function movementInfo(values, mech = state.selectedMech) {
  const stats = currentDefinition(mech).stats || {};
  const movement = currentDefinition(mech).movement || {};
  const tons = number(stats.MaxTons);
  const maxEngine = number(stats.MaxEngineRating);
  const baseSpeed = tons ? number(movement.MaxMovementSpeed) * maxEngine / tons : 0;
  const reverseMultiplier = number(movement.ReverseSpeedMultiplier);
  const speedMultiplier = quirkMultiplier(values, ["mechtopspeed_multiplier"]);
  const reverseSpeedMultiplier = quirkMultiplier(values, ["reversespeed_multiplier"]);
  const accelMultiplier = quirkMultiplier(values, ["mechacceleration_multiplier", "accellerp_all_multiplier"]);
  const decelMultiplier = quirkMultiplier(values, ["mechdeceleration_multiplier", "decellerp_all_multiplier"]);
  const turnMultiplier = quirkMultiplier(values, ["turnrate_multiplier", "turnlerp_all_multiplier"]);
  const baseAcceleration = number(movement.AccelLerpMidRate);
  const baseDeceleration = tons ? number(movement.DecelLerpMidRate) / tons : 0;
  const baseTurnSpeed = number(movement.TurnLerpMidRate) * 180 / Math.PI;
  const baseTorsoSpeed = number(movement.TorsoTurnSpeedYaw);
  const baseTorsoAngleYaw = number(movement.MaxTorsoAngleYaw);
  const baseTorsoAnglePitch = number(movement.MaxTorsoAnglePitch);
  const baseArmAngleYaw = number(movement.MaxArmRotationYaw);
  const baseArmAnglePitch = number(movement.MaxArmRotationPitch);
  const yawAngle = (number(movement.MaxTorsoAngleYaw) + number(values.torso_yawangle_additive)) * quirkMultiplier(values, ["torso_yawangle_multiplier"]);
  const pitchAngle = number(movement.MaxTorsoAnglePitch) + number(values.torso_pitchangle_additive);

  return {
    baseMaxSpeed: baseSpeed,
    maxSpeed: baseSpeed * speedMultiplier,
    baseReverseSpeed: baseSpeed * reverseMultiplier,
    reverseSpeed: baseSpeed * reverseMultiplier * speedMultiplier * reverseSpeedMultiplier,
    baseAcceleration,
    acceleration: baseAcceleration * accelMultiplier,
    baseDeceleration,
    deceleration: baseDeceleration * decelMultiplier,
    baseAngleX: [baseTorsoAngleYaw, baseArmAngleYaw],
    angleX: [yawAngle, baseArmAngleYaw],
    baseAngleY: [baseTorsoAnglePitch, baseArmAnglePitch],
    angleY: [pitchAngle, baseArmAnglePitch],
    baseTorsoSpeed,
    torsoSpeed: baseTorsoSpeed * quirkMultiplier(values, ["torso_yawspeed_multiplier"]),
    baseTurnSpeed,
    turnSpeed: baseTurnSpeed * turnMultiplier,
  };
}

function renderInfoTable(title, headers, rows, options = {}) {
  const classes = ["info-card", options.compact ? "info-card-compact" : ""].filter(Boolean).join(" ");
  return `
    <section class="${classes}">
      <h3>${title}</h3>
      <div class="info-table">
        <div class="info-row info-head">${headers.map((header, index) => `<span>${index === 0 ? header : specHeader(header)}</span>`).join("")}</div>
        ${rows
          .map((row) => `<div class="info-row">${row.map((cell) => `<span>${cell}</span>`).join("")}</div>`)
          .join("")}
      </div>
    </section>
  `;
}

function specHeader(label) {
  return `
    <span class="spec-value spec-header-value">
      <span class="spec-final spec-header-final">${label}</span>
      <span class="spec-detail spec-detail-empty"></span>
    </span>
  `;
}

function quirkSectionTitle(quirk) {
  const match = (quirk.source_text || "").match(/\b(\d+)pc\b/i);
  return match ? `SET OF ${match[1]}` : "QUIRKS";
}

const GLOBAL_HEAT_QUIRK_NAMES = new Set([
  "all_heat_multiplier",
  "heatdissipation_multiplier",
  "maxheat_multiplier",
]);

const GLOBAL_WEAPON_QUIRK_PATTERN = /^all_(?:cooldown|jamchance|range|spread|velocity)_/;

function isAmmoQuirk(quirk) {
  const name = String(quirk?.name || "").toLowerCase();
  const displayName = String(quirk?.display_name || "").toLowerCase();
  return name.startsWith("ammocapacity_") || displayName.includes("ammo capacity");
}

function quirkWeaponType(quirk) {
  const name = String(quirk?.name || "").toLowerCase();
  if (GLOBAL_WEAPON_QUIRK_PATTERN.test(name)) return "all";
  if (name.startsWith("energy_")) return "energy";
  if (name.startsWith("missile_")) return "missile";
  if (name.startsWith("ballistic_")) return "ballistic";

  const normalizedName = normalizeLookupKey(name);
  const match = weaponQuirkTargets().quirkPrefixes
    .find((entry) => normalizedName.startsWith(entry.prefix));
  if (match) return match.type;

  if (/^(?:laser|erlaser|nonpulselaser|pulselaser|ppcfamily|tag)/.test(normalizedName)) return "energy";
  if (/^(?:atm|lrm|mrm|narcbeacon|rocketlauncher|srm|streaksrm)/.test(normalizedName)) return "missile";
  if (/^(?:autocannon|gauss|lbxautocannon|machinegun|rotaryautocannon|ultraautocannon)/.test(normalizedName)) return "ballistic";
  if (normalizedName.startsWith("antimissilesystem") || normalizedName.startsWith("clanantimissilesystem")) return "all";
  return null;
}

function quirkDisplayCategory(quirk) {
  const name = String(quirk?.name || "").toLowerCase();
  if (isAmmoQuirk(quirk)) return "ammo";
  if (GLOBAL_HEAT_QUIRK_NAMES.has(name)) return "globalHeat";
  const weaponType = quirkWeaponType(quirk);
  if (weaponType) return `weapon-${weaponType}`;
  if (name.startsWith("armorresist_") || name.startsWith("increasedarmor_")) return "armor";
  if (name.startsWith("internalresist_") || name.startsWith("increasedstructure_")) return "structure";
  return "other";
}

const QUIRK_CATEGORY_ORDER = Object.freeze({
  globalHeat: 0,
  "weapon-all": 1,
  "weapon-energy": 2,
  "weapon-missile": 3,
  "weapon-ballistic": 4,
  other: 5,
  armor: 6,
  structure: 7,
  ammo: 8,
});

function sortQuirksForDisplay(quirks) {
  return quirks
    .map((quirk, index) => ({ quirk, index }))
    .sort((left, right) => (
      number(QUIRK_CATEGORY_ORDER[quirkDisplayCategory(left.quirk)], 99)
      - number(QUIRK_CATEGORY_ORDER[quirkDisplayCategory(right.quirk)], 99)
      || left.index - right.index
    ))
    .map((entry) => entry.quirk);
}

function partitionDisplayQuirks(quirks) {
  return {
    regular: quirks.filter((quirk) => !isAmmoQuirk(quirk)),
    ammo: quirks.filter(isAmmoQuirk),
  };
}

function aggregateQuirkContributions(contributions) {
  const collector = new Map();
  contributions.forEach((contribution) => {
    const key = String(contribution?.name || "");
    if (!key) return;
    if (!collector.has(key)) {
      collector.set(key, {
        name: key,
        display_name: contribution.display_name || key,
        value: 0,
        sources: new Set(),
      });
    }
    const entry = collector.get(key);
    entry.value += number(contribution.value);
    if (contribution.source) entry.sources.add(contribution.source);
  });
  return Array.from(collector.values()).map((quirk) => ({
    ...quirk,
    value_text: quirkValueText(quirk.name, quirk.value),
    source_text: Array.from(quirk.sources).join(", "),
    inactive: contributions
      .filter((contribution) => contribution.name === quirk.name)
      .every((contribution) => contribution.inactive === true),
  }));
}

function fixedCtOmnipod(build = state.currentBuild) {
  return podById(build?.components?.centre_torso?.omnipod);
}

function omnipodSetPieceCount(pod, build = state.currentBuild) {
  if (!pod?.set) return 0;
  return Object.values(build?.components || {}).reduce((count, component) => {
    const installedPod = podById(component?.omnipod);
    return count + (installedPod?.set === pod.set ? 1 : 0);
  }, 0);
}

function omnipodSetBonusQuirks(pod, pieceCount) {
  return (pod?.set_bonuses || [])
    .filter((bonus) => number(bonus.piece_count) === pieceCount)
    .flatMap((bonus) => bonus.quirks || []);
}

function omnipodSetBonusInfo(pod, pieceCount, build = state.currentBuild) {
  const installedPieces = omnipodSetPieceCount(pod, build);
  return {
    pieceCount,
    installedPieces,
    active: installedPieces >= pieceCount,
    quirks: omnipodSetBonusQuirks(pod, pieceCount),
  };
}

function omnipodDisplayQuirkGroups(
  quirks,
  mech = state.selectedMech,
  build = state.currentBuild,
) {
  const groups = {
    fixedCt: [],
    regular: [],
    so6: [],
    so8: [],
    ammo: [],
  };
  quirks.forEach((quirk) => {
    const contributions = quirk.contributions?.length
      ? quirk.contributions
      : [{ ...quirk, sourceKind: "omnipod", source: quirk.source_text }];
    contributions.forEach((contribution) => {
      if (contribution.sourceKind === "setBonus") {
        if (contribution.pieceCount === 6) {
          if (isAmmoQuirk(contribution)) groups.ammo.push(contribution);
          else groups.so6.push(contribution);
        }
        return;
      }
      if (isAmmoQuirk(contribution)) {
        groups.ammo.push(contribution);
      } else if (contribution.sourceKind === "fixedCt") {
        groups.fixedCt.push(contribution);
      } else {
        groups.regular.push(contribution);
      }
    });
  });
  const ctPod = fixedCtOmnipod(build);
  const so8Info = omnipodSetBonusInfo(ctPod, 8, build);
  so8Info.quirks.forEach((quirk) => {
    const contribution = {
      ...quirk,
      source: `${String(ctPod?.set || "").toUpperCase()} 8pc`,
      sourceKind: "setBonus",
      pieceCount: 8,
      inactive: !so8Info.active,
    };
    if (isAmmoQuirk(contribution)) groups.ammo.push(contribution);
    else groups.so8.push(contribution);
  });
  const aggregated = Object.fromEntries(
    Object.entries(groups).map(([key, contributions]) => [key, aggregateQuirkContributions(contributions)]),
  );
  return {
    ...aggregated,
    so8Info,
    ctPod,
    isOmni: hasFixedOmnipods(mech),
  };
}

function quirkToneClass(quirk) {
  if (isHarmfulDurationOrSpreadQuirk(quirk)) return "quirk-tone-harmful";
  const category = quirkDisplayCategory(quirk);
  if (category === "globalHeat" || category === "weapon-all") return "quirk-tone-global";
  if (category === "weapon-energy") return "quirk-tone-energy";
  if (category === "weapon-missile") return "quirk-tone-missile";
  if (category === "weapon-ballistic") return "quirk-tone-ballistic";
  if (category === "armor") return "quirk-tone-armor";
  if (category === "structure") return "quirk-tone-structure";
  if (category === "ammo") return "quirk-tone-ammo";
  return "quirk-tone-other";
}

function weaponQuirkTargets() {
  if (state.weaponQuirkTargetCache) return state.weaponQuirkTargetCache;

  const aliasTypes = new Map();
  const weapons = [];
  const weaponsByKey = new Map();
  for (const item of Object.values(state.equipment?.items || {})) {
    if (item.item_type !== "weapon" && item.family !== "weapons") continue;
    const type = String(item.hardpoint_type || item.stats?.type || "").toLowerCase();
    if (!["energy", "missile", "ballistic"].includes(type)) continue;

    const keys = new Set([
      item.name,
      item.display_name,
      item.source_display_name,
      ...(String(item.aliases || "").split(",")),
    ].map(normalizeLookupKey).filter(Boolean));

    const weapon = { id: weapons.length, type, keys };
    weapons.push(weapon);

    for (const key of keys) {
      if (!aliasTypes.has(key)) aliasTypes.set(key, new Set());
      aliasTypes.get(key).add(type);
      if (!weaponsByKey.has(key)) weaponsByKey.set(key, []);
      weaponsByKey.get(key).push(weapon);
    }
  }

  const quirkPrefixes = Array.from(aliasTypes.entries())
    .filter(([prefix, types]) => prefix.length >= 3 && types.size === 1)
    .map(([prefix, types]) => ({ prefix, type: Array.from(types)[0] }))
    .sort((left, right) => right.prefix.length - left.prefix.length);

  state.weaponQuirkTargetCache = { aliasTypes, weapons, weaponsByKey, quirkPrefixes };
  return state.weaponQuirkTargetCache;
}

function weaponQuirkTypeLookup() {
  if (state.weaponQuirkTypeCache) return state.weaponQuirkTypeCache;
  state.weaponQuirkTypeCache = weaponQuirkTargets().aliasTypes;
  return state.weaponQuirkTypeCache;
}

function cooldownQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_cooldown_multiplier") || DIRECT_COOLDOWN_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_cooldown_multiplier$/, ""));
}

function heatQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_heat_multiplier") || DIRECT_HEAT_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_heat_multiplier$/, ""));
}

function velocityQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_velocity_multiplier") || DIRECT_VELOCITY_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_velocity_multiplier$/, ""));
}

function rangeQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_range_multiplier") || DIRECT_RANGE_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_range_multiplier$/, ""));
}

function durationQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_duration_multiplier") || DIRECT_DURATION_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_duration_multiplier$/, ""));
}

function spreadQuirkPrefix(quirkName) {
  const name = String(quirkName || "").toLowerCase();
  if (!name.endsWith("_spread_multiplier") || DIRECT_SPREAD_QUIRKS.has(name)) return "";
  return normalizeLookupKey(name.replace(/_spread_multiplier$/, ""));
}

function cooldownQuirkWeaponType(quirkName) {
  const prefix = cooldownQuirkPrefix(quirkName);
  if (!prefix) return null;
  const types = weaponQuirkTypeLookup().get(prefix);
  if (!types || types.size !== 1) return null;
  return Array.from(types)[0];
}

function heatQuirkWeaponType(quirkName) {
  const prefix = heatQuirkPrefix(quirkName);
  if (!prefix) return null;
  const types = weaponQuirkTypeLookup().get(prefix);
  if (!types || types.size !== 1) return null;
  return Array.from(types)[0];
}

function weaponStatMax(quirks, prefixForQuirkName, valueForQuirk, type) {
  const activeStats = quirks
    .map((quirk) => ({
      prefix: prefixForQuirkName(quirk.name),
      value: valueForQuirk(quirk),
    }))
    .filter((quirk) => quirk.prefix && quirk.value > 0);

  if (!activeStats.length) return 0;

  const weaponTotals = new Map();
  const { weaponsByKey } = weaponQuirkTargets();
  for (const quirk of activeStats) {
    const weapons = weaponsByKey.get(quirk.prefix) || [];
    for (const weapon of weapons) {
      if (weapon.type !== type) continue;
      weaponTotals.set(weapon.id, (weaponTotals.get(weapon.id) || 0) + quirk.value);
    }
  }

  let maxStat = 0;
  for (const stat of weaponTotals.values()) {
    maxStat = Math.max(maxStat, stat);
  }
  return maxStat;
}

function energyWeaponStatMax(quirks, prefixForQuirkName) {
  return weaponStatMax(quirks, prefixForQuirkName, (quirk) => Math.max(0, -number(quirk.value)), "energy");
}

function energyWeaponCooldownMax(quirks) {
  return energyWeaponStatMax(quirks, cooldownQuirkPrefix);
}

function energyWeaponHeatMax(quirks) {
  return energyWeaponStatMax(quirks, heatQuirkPrefix);
}

function formatQuirkSummaryPercent(value) {
  return value > 0 ? `${fmt(value * 100, 1)}%` : "-";
}

function formatQuirkSummaryNumber(value) {
  return value > 0 ? `+${fmt(value, 1)}` : "-";
}

function renderQuirkSummary(title, toneClass, items) {
  if (!items.some((item) => item.value > 0)) return "";

  return `
    <div class="quirk-summary ${toneClass}">
      <div class="quirk-summary-title">${title}</div>
      <div class="quirk-summary-accent" aria-hidden="true"></div>
      <div class="quirk-summary-grid">
        ${items
          .map((item) => item.empty
            ? `<div class="quirk-summary-item quirk-summary-empty" aria-hidden="true"></div>`
            : `
              <div class="quirk-summary-item ${item.className}">
                <span>${item.label}</span>
                <strong>${item.format === "number" ? formatQuirkSummaryNumber(item.value) : formatQuirkSummaryPercent(item.value)}</strong>
              </div>
            `)
          .join("")}
      </div>
    </div>
  `;
}

function cooldownQuirkSummary(quirks) {
  const allCooldown = quirkReduction(quirks, "all_cooldown_multiplier");
  const weaponCooldownMax = { energy: 0, missile: 0, ballistic: 0 };

  for (const quirk of quirks) {
    const type = cooldownQuirkWeaponType(quirk.name);
    if (!type) continue;
    weaponCooldownMax[type] = Math.max(weaponCooldownMax[type], Math.max(0, -number(quirk.value)));
  }

  const energyCooldown = allCooldown + quirkReduction(quirks, "energy_cooldown_multiplier") + energyWeaponCooldownMax(quirks);
  const groups = [
    {
      label: t("quirk.energyCooldown"),
      className: "quirk-tone-energy",
      value: energyCooldown,
    },
    {
      label: t("quirk.missileCooldown"),
      className: "quirk-tone-missile",
      value: allCooldown + quirkReduction(quirks, "missile_cooldown_multiplier") + weaponCooldownMax.missile,
    },
    {
      label: t("quirk.ballisticCooldown"),
      className: "quirk-tone-default",
      value: allCooldown + quirkReduction(quirks, "ballistic_cooldown_multiplier") + weaponCooldownMax.ballistic,
    },
  ];
  const maxCooldown = Math.max(allCooldown, ...groups.map((group) => group.value));
  return renderQuirkSummary(t("quirk.cooldownSummary"), "quirk-summary-cooldown", [
    { label: t("quirk.maxCooldown"), className: "quirk-summary-max", value: maxCooldown },
    ...groups,
  ]);
}

function heatQuirkSummary(quirks) {
  const allHeat = quirkReduction(quirks, "all_heat_multiplier");
  const weaponHeatMax = { energy: 0, missile: 0, ballistic: 0 };

  for (const quirk of quirks) {
    const type = heatQuirkWeaponType(quirk.name);
    if (!type) continue;
    weaponHeatMax[type] = Math.max(weaponHeatMax[type], Math.max(0, -number(quirk.value)));
  }

  const energyHeat = allHeat + quirkReduction(quirks, "energy_heat_multiplier") + energyWeaponHeatMax(quirks);
  const groups = [
    {
      label: t("quirk.energyHeat"),
      className: "quirk-tone-energy",
      value: energyHeat,
    },
    {
      label: t("quirk.missileHeat"),
      className: "quirk-tone-missile",
      value: allHeat + quirkReduction(quirks, "missile_heat_multiplier") + weaponHeatMax.missile,
    },
    {
      label: t("quirk.ballisticHeat"),
      className: "quirk-tone-default",
      value: allHeat + quirkReduction(quirks, "ballistic_heat_multiplier") + weaponHeatMax.ballistic,
    },
  ];
  const maxHeat = Math.max(allHeat, ...groups.map((group) => group.value));
  const heatDissipation = Math.max(0, number(quirks.find((quirk) => quirk.name.toLowerCase() === "heatdissipation_multiplier")?.value));

  return renderQuirkSummary(t("quirk.heatSummary"), "quirk-summary-heat", [
    { label: t("quirk.maxHeatReduction"), className: "quirk-summary-max", value: maxHeat },
    ...groups,
    { label: t("quirk.heatDissipation"), className: "quirk-tone-default", value: heatDissipation },
  ]);
}

function velocityQuirkSummary(quirks) {
  const allVelocity = quirkIncrease(quirks, "all_velocity_multiplier");
  const groups = [
    {
      label: t("quirk.energyVelocity"),
      className: "quirk-tone-energy",
      value: allVelocity + quirkIncrease(quirks, "energy_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "energy"),
    },
    {
      label: t("quirk.missileVelocity"),
      className: "quirk-tone-missile",
      value: allVelocity + quirkIncrease(quirks, "missile_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "missile"),
    },
    {
      label: t("quirk.ballisticVelocity"),
      className: "quirk-tone-default",
      value: allVelocity + quirkIncrease(quirks, "ballistic_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "ballistic"),
    },
  ];
  const maxVelocity = Math.max(allVelocity, ...groups.map((group) => group.value));
  return renderQuirkSummary(t("quirk.velocitySummary"), "quirk-summary-velocity", [
    { label: t("quirk.maxVelocity"), className: "quirk-summary-max", value: maxVelocity },
    ...groups,
  ]);
}

function rangeQuirkSummary(quirks) {
  const allRange = quirkIncrease(quirks, "all_range_multiplier");
  const additionalSensor = additionalSensorSummaryMax(quirks);
  const groups = [
    {
      label: t("quirk.energyRange"),
      className: "quirk-tone-energy",
      value: allRange + quirkIncrease(quirks, "energy_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "energy"),
    },
    {
      label: t("quirk.missileRange"),
      className: "quirk-tone-missile",
      value: allRange + quirkIncrease(quirks, "missile_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "missile"),
    },
    {
      label: t("quirk.ballisticRange"),
      className: "quirk-tone-default",
      value: allRange + quirkIncrease(quirks, "ballistic_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "ballistic"),
    },
  ];
  const maxRange = Math.max(allRange, ...groups.map((group) => group.value));
  return renderQuirkSummary(t("quirk.rangeSummary"), "quirk-summary-range", [
    { label: t("quirk.maxRange"), className: "quirk-summary-max", value: maxRange },
    ...groups,
    { label: t("quirk.additionalSensor"), className: "quirk-tone-default", value: additionalSensor, format: "number" },
  ]);
}

function durationQuirkSummary(quirks) {
  const allDuration = quirkReduction(quirks, "all_duration_multiplier");
  const energyDuration = allDuration + quirkReduction(quirks, "energy_duration_multiplier") + weaponStatMax(quirks, durationQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "energy");
  const machineGunRof = quirkIncrease(quirks, "ismachinegun_rof_multiplier") + quirkIncrease(quirks, "clanmachinegun_rof_multiplier");
  const rotaryAcRof = quirkIncrease(quirks, "rotaryautocannon_rof_multiplier");
  const amsRof = quirkIncrease(quirks, "clanantimissilesystem_rof_multiplier");
  const items = [
    { label: t("quirk.maxDuration"), className: "quirk-summary-max", value: Math.max(energyDuration, machineGunRof, rotaryAcRof, amsRof) },
    { label: t("quirk.energyDuration"), className: "quirk-tone-energy", value: energyDuration },
    { label: t("quirk.mgRof"), className: "quirk-tone-default", value: machineGunRof },
    { label: t("quirk.racRof"), className: "quirk-tone-default", value: rotaryAcRof },
  ];
  if (amsRof > 0) {
    items.push({ label: t("quirk.amsRof"), className: "quirk-tone-default", value: amsRof });
  }
  return renderQuirkSummary(t("quirk.durationSummary"), "quirk-summary-duration", [
    ...items,
  ]);
}

function spreadQuirkSummary(quirks) {
  const allSpread = quirkReduction(quirks, "all_spread_multiplier");
  const missileSpread = allSpread + quirkReduction(quirks, "missile_spread_multiplier") + weaponStatMax(quirks, spreadQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "missile");
  const ballisticSpread = allSpread + quirkReduction(quirks, "ballistic_spread_multiplier") + weaponStatMax(quirks, spreadQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "ballistic");
  const maxSpread = Math.max(allSpread, missileSpread, ballisticSpread);
  return renderQuirkSummary(t("quirk.spreadSummary"), "quirk-summary-spread", [
    { label: t("quirk.maxSpread"), className: "quirk-summary-max", value: maxSpread },
    { empty: true, value: 0 },
    { label: t("quirk.missileSpread"), className: "quirk-tone-missile", value: missileSpread },
    { label: t("quirk.ballisticSpread"), className: "quirk-tone-default", value: ballisticSpread },
  ]);
}

function cooldownSummaryMax(quirks) {
  const allCooldown = quirkReduction(quirks, "all_cooldown_multiplier");
  const energyCooldown = allCooldown + quirkReduction(quirks, "energy_cooldown_multiplier") + energyWeaponCooldownMax(quirks);
  const missileCooldown = allCooldown + quirkReduction(quirks, "missile_cooldown_multiplier") + weaponStatMax(quirks, cooldownQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "missile");
  const ballisticCooldown = allCooldown + quirkReduction(quirks, "ballistic_cooldown_multiplier") + weaponStatMax(quirks, cooldownQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "ballistic");
  return Math.max(allCooldown, energyCooldown, missileCooldown, ballisticCooldown);
}

function heatSummaryMax(quirks) {
  const allHeat = quirkReduction(quirks, "all_heat_multiplier");
  const energyHeat = allHeat + quirkReduction(quirks, "energy_heat_multiplier") + energyWeaponHeatMax(quirks);
  const missileHeat = allHeat + quirkReduction(quirks, "missile_heat_multiplier") + weaponStatMax(quirks, heatQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "missile");
  const ballisticHeat = allHeat + quirkReduction(quirks, "ballistic_heat_multiplier") + weaponStatMax(quirks, heatQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "ballistic");
  return Math.max(allHeat, energyHeat, missileHeat, ballisticHeat);
}

function rangeSummaryMax(quirks) {
  const allRange = quirkIncrease(quirks, "all_range_multiplier");
  const energyRange = allRange + quirkIncrease(quirks, "energy_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "energy");
  const missileRange = allRange + quirkIncrease(quirks, "missile_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "missile");
  const ballisticRange = allRange + quirkIncrease(quirks, "ballistic_range_multiplier") + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "ballistic");
  return Math.max(allRange, energyRange, missileRange, ballisticRange);
}

function velocitySummaryMax(quirks) {
  const allVelocity = quirkIncrease(quirks, "all_velocity_multiplier");
  const energyVelocity = allVelocity + quirkIncrease(quirks, "energy_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "energy");
  const missileVelocity = allVelocity + quirkIncrease(quirks, "missile_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "missile");
  const ballisticVelocity = allVelocity + quirkIncrease(quirks, "ballistic_velocity_multiplier") + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), "ballistic");
  return Math.max(allVelocity, energyVelocity, missileVelocity, ballisticVelocity);
}

function familyCooldownSummaryMax(quirks, type) {
  const allCooldown = quirkReduction(quirks, "all_cooldown_multiplier");
  const familyCooldown = quirkReduction(quirks, `${type}_cooldown_multiplier`);
  const weaponCooldown = type === "energy"
    ? energyWeaponCooldownMax(quirks)
    : weaponStatMax(quirks, cooldownQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), type);
  return allCooldown + familyCooldown + weaponCooldown;
}

function familyHeatSummaryMax(quirks, type) {
  const allHeat = quirkReduction(quirks, "all_heat_multiplier");
  const familyHeat = quirkReduction(quirks, `${type}_heat_multiplier`);
  const weaponHeat = type === "energy"
    ? energyWeaponHeatMax(quirks)
    : weaponStatMax(quirks, heatQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), type);
  return allHeat + familyHeat + weaponHeat;
}

function heatDissipationSummaryMax(quirks) {
  return quirkIncrease(quirks, "heatdissipation_multiplier");
}

function familyRangeSummaryMax(quirks, type) {
  return quirkIncrease(quirks, "all_range_multiplier")
    + quirkIncrease(quirks, `${type}_range_multiplier`)
    + weaponStatMax(quirks, rangeQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), type);
}

function familyVelocitySummaryMax(quirks, type) {
  return quirkIncrease(quirks, "all_velocity_multiplier")
    + quirkIncrease(quirks, `${type}_velocity_multiplier`)
    + weaponStatMax(quirks, velocityQuirkPrefix, (quirk) => Math.max(0, number(quirk.value)), type);
}

function additionalSensorSummaryMax(quirks) {
  return quirks.reduce((sum, quirk) => {
    const name = String(quirk.name || "").toLowerCase();
    return name === "sensorrange_additive"
      ? sum + Math.max(0, number(quirk.value))
      : sum;
  }, 0);
}

function durationSummaryMax(quirks) {
  return quirkReduction(quirks, "all_duration_multiplier")
    + quirkReduction(quirks, "energy_duration_multiplier")
    + weaponStatMax(quirks, durationQuirkPrefix, (quirk) => Math.max(0, -number(quirk.value)), "energy");
}

function rotaryRofSummaryMax(quirks) {
  return quirkIncrease(quirks, "rotaryautocannon_rof_multiplier");
}

function machineGunRofSummaryMax(quirks) {
  return quirkIncrease(quirks, "ismachinegun_rof_multiplier") + quirkIncrease(quirks, "clanmachinegun_rof_multiplier");
}

function quirkReductionMax(quirks, predicate) {
  return quirks.reduce((maxValue, quirk) => {
    const name = String(quirk.name || "").toLowerCase();
    return predicate(name) ? Math.max(maxValue, Math.max(0, -number(quirk.value))) : maxValue;
  }, 0);
}

function jamChanceSummaryMax(quirks) {
  return quirkReductionMax(quirks, (name) => name.includes("jamchance") && name.endsWith("_multiplier"));
}

function jamDurationSummaryMax(quirks) {
  return quirkReductionMax(quirks, (name) => name.includes("jam") && name.includes("duration") && name.endsWith("_multiplier"));
}

function durabilityQuirkSummaryValues(quirks) {
  const values = {};
  for (const quirk of quirks) {
    values[quirk.name.toLowerCase()] = number(quirk.value);
  }

  const armorSuffixes = INFO_COMPONENTS.flatMap((component) => [component.suffix, component.rearSuffix].filter(Boolean));
  const totalArmor = armorSuffixes.reduce((sum, suffix) => (
    sum + number(values.armorresist_all_additive) + number(values[`armorresist_${suffix}_additive`])
  ), 0);
  const totalStructure = INFO_COMPONENTS.reduce((sum, component) => (
    sum + number(values.internalresist_all_additive) + number(values[`internalresist_${component.suffix}_additive`])
  ), 0);

  return {
    totalArmor,
    totalStructure,
    totalDurability: totalArmor + totalStructure,
    critPrevention: Math.max(0, -number(values.critchance_receiving_multiplier)),
  };
}

function quirkSummaryStats(quirks) {
  const durability = durabilityQuirkSummaryValues(quirks);
  return {
    cooldown: cooldownSummaryMax(quirks),
    heat: heatSummaryMax(quirks),
    durability: durability.totalDurability,
    durabilityArmor: durability.totalArmor,
    durabilityStructure: durability.totalStructure,
    durabilityCritPrevent: durability.critPrevention,
    range: rangeSummaryMax(quirks),
    velocity: velocitySummaryMax(quirks),
    all: cooldownSummaryMax(quirks),
    energy: familyCooldownSummaryMax(quirks, "energy"),
    missile: familyCooldownSummaryMax(quirks, "missile"),
    ballistic: familyCooldownSummaryMax(quirks, "ballistic"),
    heatAll: heatSummaryMax(quirks),
    heatEnergy: familyHeatSummaryMax(quirks, "energy"),
    heatMissile: familyHeatSummaryMax(quirks, "missile"),
    heatBallistic: familyHeatSummaryMax(quirks, "ballistic"),
    heatDissipation: heatDissipationSummaryMax(quirks),
    rangeAll: rangeSummaryMax(quirks),
    rangeEnergy: familyRangeSummaryMax(quirks, "energy"),
    rangeMissile: familyRangeSummaryMax(quirks, "missile"),
    rangeBallistic: familyRangeSummaryMax(quirks, "ballistic"),
    additionalSensor: additionalSensorSummaryMax(quirks),
    velocityAll: velocitySummaryMax(quirks),
    velocityEnergy: familyVelocitySummaryMax(quirks, "energy"),
    velocityMissile: familyVelocitySummaryMax(quirks, "missile"),
    velocityBallistic: familyVelocitySummaryMax(quirks, "ballistic"),
    duration: durationSummaryMax(quirks),
    rotaryRof: rotaryRofSummaryMax(quirks),
    machineGunRof: machineGunRofSummaryMax(quirks),
    jamChance: jamChanceSummaryMax(quirks),
    jamDuration: jamDurationSummaryMax(quirks),
  };
}

function durabilitySummaryTotal(quirks) {
  return durabilityQuirkSummaryValues(quirks).totalDurability;
}

function specialQuirkCategories(quirks) {
  const texts = quirks.map((quirk) => `${quirk.name || ""} ${quirk.display_name || ""}`.toLowerCase());
  const hasQuirk = (patterns) => texts.some((text) => patterns.some((pattern) => (
    pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern)
  )));

  return [
    hasQuirk(["ecm"]) ? "ECM" : "",
    hasQuirk(["jumpjet", "jump jet"]) ? t("special.jumpjets") : "",
    hasQuirk(["narc_duration_multiplier", "narcbeacon_narcduration_additive", "narc duration"]) ? t("special.narcDuration") : "",
  ].filter(Boolean);
}

function renderQuirkOverviewCard(quirks) {
  const specialCategories = specialQuirkCategories(quirks);
  const rows = [
    [t("info.cooldown"), formatQuirkSummaryPercent(cooldownSummaryMax(quirks))],
    [t("common.heat"), formatQuirkSummaryPercent(heatSummaryMax(quirks))],
    [t("info.durability"), formatQuirkSummaryNumber(durabilitySummaryTotal(quirks))],
    [t("info.range"), formatQuirkSummaryPercent(rangeSummaryMax(quirks))],
    [t("info.velocity"), formatQuirkSummaryPercent(velocitySummaryMax(quirks))],
  ];
  const specialTags = specialCategories.length
    ? specialCategories.map((label) => `<span class="quirk-overview-tag">${label}</span>`).join("")
    : `<span class="quirk-overview-empty-text">${t("info.noSpecialQuirks")}</span>`;

  return `
    <section class="info-card info-quirk-summary-card quirk-overview-card">
      <h3>${t("info.quirkSummary")}</h3>
      <div class="quirk-overview-table">
        <div class="quirk-overview-row quirk-overview-head">
          <span>${t("common.item")}</span>
          <span>${t("common.value")}</span>
        </div>
        ${rows.map((row) => `
          <div class="quirk-overview-row">
            <span>${row[0]}</span>
            <strong>${row[1]}</strong>
          </div>
        `).join("")}
        <div class="quirk-overview-row quirk-overview-special-row">
          <span>${t("info.specialQuirks")}</span>
          <div class="quirk-overview-tags">${specialTags}</div>
        </div>
      </div>
    </section>
  `;
}

function durabilityQuirkSummary(quirks) {
  const { totalArmor, totalStructure, totalDurability, critPrevention } = durabilityQuirkSummaryValues(quirks);

  return renderQuirkSummary(t("quirk.durabilitySummary"), "quirk-summary-durability", [
    { label: t("quirk.maxDurability"), className: "quirk-summary-max", value: totalDurability, format: "number" },
    { label: t("quirk.armor"), className: "quirk-tone-armor", value: totalArmor, format: "number" },
    { label: t("quirk.structure"), className: "quirk-tone-armor", value: totalStructure, format: "number" },
    { label: t("quirk.critPrevent"), className: "quirk-tone-default", value: critPrevention },
  ]);
}

function attackQuirkSummary(quirks) {
  return `${cooldownQuirkSummary(quirks)}${heatQuirkSummary(quirks)}${rangeQuirkSummary(quirks)}${velocityQuirkSummary(quirks)}${durationQuirkSummary(quirks)}${spreadQuirkSummary(quirks)}${durabilityQuirkSummary(quirks)}`;
}

function renderQuirkList(quirks, emptyText = "No quirks", options = {}) {
  if (!quirks.length) return `<div class="empty">${emptyText}</div>`;

  const sections = [];
  for (const quirk of sortQuirksForDisplay(quirks)) {
    const title = options.showSourceSections === false ? "QUIRKS" : quirkSectionTitle(quirk);
    let section = sections.find((entry) => entry.title === title);
    if (!section) {
      section = { title, quirks: [] };
      sections.push(section);
    }
    section.quirks.push(quirk);
  }

  const summary = options.includeSummary === false ? "" : attackQuirkSummary(quirks);
  return `${summary}${sections
    .map((section) => `
      <div class="quirk-section">
        ${section.title === "QUIRKS" ? "" : `<div class="quirk-section-title">${section.title}</div>`}
        <div class="quirk-rows">
          ${section.quirks
            .map((quirk) => {
              const tone = quirkToneClass(quirk);
              return `
                <div class="quirk ${tone}${quirk.inactive ? " inactive" : ""}" title="${quirk.source_text || quirk.name}">
                  <span class="quirk-name">${quirk.display_name}</span>
                  <span class="quirk-value">${quirk.value_text}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `)
    .join("")}`;
}

function renderInfoQuirkCard(title, quirks, options = {}) {
  if (!quirks.length && !options.showEmpty) return "";
  return `
    <section class="info-card info-quirks-card">
      <div class="section-title-row">
        <h3>${title}</h3>
      </div>
      <div class="quirks">${renderQuirkList(quirks, "No quirks", {
        includeSummary: options.includeSummary,
        showSourceSections: options.showSourceSections,
      })}</div>
    </section>
  `;
}

function renderInfoQuirkSummaryCard(quirks) {
  const summary = attackQuirkSummary(quirks);
  return `
    <section class="info-card info-quirks-card info-quirk-detail-summary-card">
      <div class="section-title-row">
        <h3>QUIRK SUMMARY</h3>
      </div>
      <div class="quirks">${summary || '<div class="empty">No quirks</div>'}</div>
    </section>
  `;
}

function renderInfoQuirks(quirks, mech = state.selectedMech, build = state.currentBuild) {
  if (hasFixedOmnipods(mech)) {
    const groups = omnipodDisplayQuirkGroups(quirks, mech, build);
    return [
      renderInfoQuirkSummaryCard(quirks),
      renderInfoQuirkCard("CT - FIXED QUIRKS", groups.fixedCt, {
        includeSummary: false,
        showSourceSections: false,
        showEmpty: true,
      }),
      renderInfoQuirkCard("QUIRKS", groups.regular, {
        includeSummary: false,
        showSourceSections: false,
        showEmpty: true,
      }),
      renderInfoQuirkCard("SO6", groups.so6, {
        includeSummary: false,
        showSourceSections: false,
      }),
      renderInfoQuirkCard("SO8", groups.so8, {
        includeSummary: false,
        showSourceSections: false,
        showEmpty: true,
      }),
      renderInfoQuirkCard("AMMO", groups.ammo, {
        includeSummary: false,
        showSourceSections: false,
      }),
    ].join("");
  }

  const displayQuirks = partitionDisplayQuirks(quirks);
  return `${renderInfoQuirkSummaryCard(quirks)}${renderInfoQuirkCard("QUIRKS", displayQuirks.regular, {
    includeSummary: false,
    showEmpty: true,
  })}${renderInfoQuirkCard(t("info.ammoQuirks"), displayQuirks.ammo, {
    includeSummary: false,
  })}`;
}

function compareMechs() {
  return state.compareMechIds.map((id) => mechById(id)).filter(Boolean);
}

function compareBuildForMech(mech) {
  if (state.selectedMech && String(state.selectedMech.id) === String(mech.id)) {
    return state.currentBuild || loadBuild(mech);
  }
  return loadBuild(mech);
}

function infoDataForMech(mech, applyQuirks = state.infoApplyQuirks) {
  const build = compareBuildForMech(mech);
  const values = applyQuirks ? effectiveQuirkValues(mech, build) : {};
  const armorRows = armorInfoRows(values, mech);
  const structureRows = structureInfoRows(values, mech);
  const combinedRows = combinedDurabilityRows(armorRows, structureRows);
  const stats = currentDefinition(mech).stats || {};

  return {
    mech,
    build,
    stats,
    quirks: effectiveQuirks(mech, build),
    armorRows,
    structureRows,
    combinedRows,
    armorTotal: armorRows.reduce((sum, row) => sum + number(row.total), 0),
    armorBaseTotal: armorRows.reduce((sum, row) => sum + number(row.totalBase), 0),
    structureTotal: structureRows.reduce((sum, row) => sum + number(row.total), 0),
    structureBaseTotal: structureRows.reduce((sum, row) => sum + number(row.base), 0),
    combinedTotal: combinedRows.reduce((sum, row) => sum + number(row.total), 0),
    combinedBaseTotal: combinedRows.reduce((sum, row) => sum + number(row.totalBase), 0),
    movement: movementInfo(values, mech),
  };
}

function compareText(value) {
  return { text: value || "-", rank: null, deltaDigits: 1, deltaUnit: "" };
}

function formatCompareNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  for (let precision = digits; precision >= 0; precision -= 1) {
    const text = fmt(value, precision);
    if (text.length <= 4) return text;
  }
  return fmt(value, 0);
}

function signedCompareNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : "-"}${formatCompareNumber(Math.abs(value), digits)}`;
}

function compareNumber(value, digits = 1, unit = "") {
  return {
    text: `${formatCompareNumber(value, digits)}${unit}`,
    rank: Number.isFinite(value) ? value : null,
    deltaDigits: digits,
    deltaUnit: unit,
  };
}

function comparePercent(value, digits = 1) {
  const percent = Number.isFinite(value) ? value * 100 : NaN;
  return {
    text: percent > 0 ? `${formatCompareNumber(percent, digits)}%` : "-",
    rank: Number.isFinite(percent) ? percent : null,
    deltaDigits: digits,
    deltaUnit: "%",
  };
}

function compareNumberList(values, digits = 1, unit = "") {
  const numericValues = values.filter((value) => Number.isFinite(value));
  return {
    text: `${values.map((value) => formatCompareNumber(value, digits)).join("/")}${unit}`,
    rank: numericValues.length ? numericValues.reduce((sum, value) => sum + value, 0) : null,
    deltaDigits: digits,
    deltaUnit: unit,
  };
}

function sameCompareRank(a, b) {
  return Math.abs(a - b) < COMPARE_RANK_EPSILON;
}

function renderCompareDelta(delta, cell) {
  if (Math.abs(delta) < COMPARE_RANK_EPSILON) return "";
  const direction = delta > 0 ? "up" : "down";
  const icon = delta > 0 ? "▲" : "▼";
  return `
    <span class="compare-delta compare-delta-${direction}">
      <span class="compare-delta-icon" aria-hidden="true">${icon}</span>
      <span>${signedCompareNumber(delta, cell.deltaDigits)}${cell.deltaUnit}</span>
    </span>
  `;
}

function compareDeltaForCell(cell, cells, entry) {
  if (!state.compareShowDeltas) return "";
  if (!Number.isFinite(cell.rank)) return "";
  const rankedCells = cells.filter((item) => Number.isFinite(item.cell.rank));
  if (rankedCells.length < 2) return "";

  if (state.compareBaselineMechId !== null) {
    const baseline = rankedCells.find((item) => String(item.entry.mech.id) === String(state.compareBaselineMechId));
    if (!baseline || String(entry.mech.id) === String(state.compareBaselineMechId)) return "";
    return renderCompareDelta(cell.rank - baseline.cell.rank, cell);
  }

  const ranks = rankedCells.map((item) => item.cell.rank);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  if (sameCompareRank(minRank, maxRank)) return "";
  const referenceRank = sameCompareRank(cell.rank, maxRank) ? minRank : maxRank;
  return renderCompareDelta(cell.rank - referenceRank, cell);
}

function compareColorClassForCell(cell, cells, entry) {
  if (!Number.isFinite(cell.rank)) return "";
  const rankedCells = cells.filter((item) => Number.isFinite(item.cell.rank));
  if (rankedCells.length < 2) return "";

  if (state.compareBaselineMechId !== null) {
    const baseline = rankedCells.find((item) => String(item.entry.mech.id) === String(state.compareBaselineMechId));
    if (!baseline || String(entry.mech.id) === String(state.compareBaselineMechId)) return "";
    if (sameCompareRank(cell.rank, baseline.cell.rank)) return "";
    return cell.rank > baseline.cell.rank ? "compare-high" : "compare-low";
  }

  const ranks = rankedCells.map((item) => item.cell.rank);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  if (sameCompareRank(minRank, maxRank)) return "";
  if (sameCompareRank(cell.rank, maxRank)) return "compare-high";
  if (sameCompareRank(cell.rank, minRank)) return "compare-low";
  return "";
}

function renderCompareCell(row, data, entry) {
  const cells = data.map((dataEntry) => ({ entry: dataEntry, cell: row.value(dataEntry) }));
  const cell = cells.find((item) => item.entry === entry)?.cell || row.value(entry);
  const isBaseline = String(state.compareBaselineMechId) === String(entry.mech.id);
  const classAttribute = isBaseline ? ` class="compare-baseline-column"` : "";
  const ranks = cells
    .map((item) => item.cell.rank)
    .filter((rank) => Number.isFinite(rank));
  if (data.length < 2 || !Number.isFinite(cell.rank) || ranks.length < 2) {
    return `<td${classAttribute}><span class="compare-cell-value">${cell.text}</span></td>`;
  }

  const className = compareColorClassForCell(cell, cells, entry);
  return `
    <td${classAttribute}>
      <span class="compare-cell-value ${className}">${cell.text}</span>
      ${compareDeltaForCell(cell, cells, entry)}
    </td>
  `;
}

function renderCompareTable(mechs) {
  if (!mechs.length) {
    return `<div class="empty compare-empty">${t("compare.empty")}</div>`;
  }

  const data = mechs.map((mech) => infoDataForMech(mech));
  const bodyRows = INFO_COMPONENTS.map((component, index) => ({
    label: component.label,
    combined: (entry) => compareNumber(entry.combinedRows[index].total, 0),
    armor: (entry) => compareNumber(entry.armorRows[index].total, 0),
    structure: (entry) => compareNumber(entry.structureRows[index].total, 0),
  }));
  const rows = [
    { group: t("info.quirkSummary") },
    { label: t("info.cooldown"), value: (entry) => comparePercent(cooldownSummaryMax(entry.quirks)) },
    { label: t("common.heat"), value: (entry) => comparePercent(heatSummaryMax(entry.quirks)) },
    { label: t("info.durability"), value: (entry) => compareNumber(durabilitySummaryTotal(entry.quirks), 1) },
    { label: t("info.range"), value: (entry) => comparePercent(rangeSummaryMax(entry.quirks)) },
    { label: t("info.velocity"), value: (entry) => comparePercent(velocitySummaryMax(entry.quirks)) },
    { label: t("info.specialQuirks"), value: (entry) => compareText(specialQuirkCategories(entry.quirks).join(", ") || "-") },
    { group: t("info.durabilitySummary") },
    { label: t("info.armorStructureTotal"), value: (entry) => compareNumber(entry.combinedTotal, 0) },
    { label: `${t("common.armor")} ${t("stats.total")}`, value: (entry) => compareNumber(entry.armorTotal, 0) },
    { label: t("info.structureTotal"), value: (entry) => compareNumber(entry.structureTotal, 0) },
    { group: t("info.mobility") },
    { label: t("info.maxSpeed"), value: (entry) => compareNumber(entry.movement.maxSpeed, 1) },
    { label: t("info.acceleration"), value: (entry) => compareNumber(entry.movement.acceleration, 1) },
    { label: t("info.deceleration"), value: (entry) => compareNumber(entry.movement.deceleration, 1) },
    { label: t("info.turnSpeed"), value: (entry) => compareNumber(entry.movement.turnSpeed, 2) },
    { label: t("info.angleX"), value: (entry) => compareNumberList(entry.movement.angleX, 1) },
    { label: t("info.angleY"), value: (entry) => compareNumberList(entry.movement.angleY, 1) },
    { label: t("info.torsoSpeed"), value: (entry) => compareNumber(entry.movement.torsoSpeed, 1) },
    { group: t("info.combinedDurability") },
    { label: t("info.armorStructureTotal"), value: (entry) => compareNumber(entry.combinedTotal, 0) },
    ...bodyRows.map((row) => ({ label: row.label, value: row.combined })),
    { group: t("info.armorInfo") },
    { label: t("info.maxArmorTotal"), value: (entry) => compareNumber(entry.armorTotal, 0) },
    ...bodyRows.map((row) => ({ label: row.label, value: row.armor })),
    { group: t("info.structureInfo") },
    { label: t("info.structureTotal"), value: (entry) => compareNumber(entry.structureTotal, 0) },
    ...bodyRows.map((row) => ({ label: row.label, value: row.structure })),
    { group: t("stats.chassisInfo") },
    { label: t("stats.tons"), value: (entry) => compareNumber(number(entry.stats.MaxTons), 0, "t") },
    { label: t("stats.faction"), value: (entry) => compareText(factionLabel(entry.mech.faction)) },
    { label: t("stats.weight"), value: (entry) => compareText(WEIGHT_CLASS_LABELS[entry.mech.weight_class] || entry.mech.weight_class || t("common.unknown")) },
    { label: t("info.minEngine"), value: (entry) => compareNumber(number(entry.stats.MinEngineRating), 0) },
    { label: t("info.maxEngine"), value: (entry) => compareNumber(number(entry.stats.MaxEngineRating), 0) },
  ];

  return `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th scope="col">${t("common.item")}</th>
            ${data
              .map((entry) => {
                const isBaseline = String(state.compareBaselineMechId) === String(entry.mech.id);
                return `
                <th
                  class="${isBaseline ? "compare-baseline-column" : ""}"
                  data-compare-baseline="${entry.mech.id}"
                  scope="col"
                  title="${t("compare.setBaseline")}"
                >
                  <span class="compare-title">
                    <label class="compare-baseline-toggle" data-compare-baseline="${entry.mech.id}" title="${t("common.baseline")}">
                      <input
                        data-compare-baseline="${entry.mech.id}"
                        name="compare-baseline"
                        type="radio"
                        ${String(state.compareBaselineMechId) === String(entry.mech.id) ? "checked" : ""}
                      >
                      <span>${t("common.baseline")}</span>
                    </label>
                    <strong>${variantCode(entry.mech)}</strong>
                    <button class="compare-remove" data-remove-compare="${entry.mech.id}" type="button" aria-label="${t("compare.removeAria", { name: entry.mech.display_name })}">x</button>
                  </span>
                  <span class="compare-meta">${factionLabel(entry.mech.faction)} - ${entry.stats.MaxTons || "?"}t</span>
                </th>
              `;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .reduce((html, row) => {
              if (row.group) {
                const collapsed = state.collapsedCompareCategories.has(row.group);
                html.currentGroupCollapsed = collapsed;
                html.rows.push(`
                  <tr class="compare-group${collapsed ? " compare-group-collapsed" : ""}">
                    <th scope="row" colspan="${data.length + 1}">
                      <button class="compare-group-toggle" data-compare-category="${row.group}" type="button" aria-expanded="${!collapsed}">
                        <span class="compare-group-icon" aria-hidden="true">${collapsed ? "+" : "-"}</span>
                        <span>${row.group}</span>
                      </button>
                    </th>
                  </tr>
                `);
                return html;
              }
              if (html.currentGroupCollapsed) return html;
              html.rows.push(`
                <tr>
                  <th scope="row">${row.label}</th>
                  ${data.map((entry) => renderCompareCell(row, data, entry)).join("")}
                </tr>
              `);
              return html;
            }, { rows: [], currentGroupCollapsed: false }).rows
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function compareSelectionText(mechs = compareMechs()) {
  return `${t("compare.selected", { count: mechs.length, max: MAX_COMPARE_MECHS })}${mechs.length ? ` - ${mechs.map(variantCode).join(", ")}` : ""}`;
}

function renderCompareOverlayCell(entry) {
  const isBaseline = String(state.compareBaselineMechId) === String(entry.mech.id);
  return `
    <div
      class="compare-header-overlay-cell ${isBaseline ? "compare-baseline-column" : ""}"
      data-compare-baseline="${entry.mech.id}"
      title="${t("compare.setBaseline")}"
    >
      <span class="compare-title">
        <label class="compare-baseline-toggle" data-compare-baseline="${entry.mech.id}" title="${t("common.baseline")}">
          <input
            data-compare-baseline="${entry.mech.id}"
            name="compare-baseline-overlay"
            type="radio"
            ${isBaseline ? "checked" : ""}
          >
          <span>${t("common.baseline")}</span>
        </label>
        <strong>${variantCode(entry.mech)}</strong>
      </span>
      <span class="compare-meta">${factionLabel(entry.mech.faction)} - ${entry.stats.MaxTons || "?"}t</span>
    </div>
  `;
}

function renderCompareOverlayHeader(mechs) {
  return `
    <div class="compare-header-overlay-cell compare-header-overlay-item">${t("common.item")}</div>
    <div class="compare-header-overlay-track">
      ${mechs.map((mech) => renderCompareOverlayCell(infoDataForMech(mech))).join("")}
    </div>
  `;
}

function shouldShowCompareOverlay() {
  if (state.activeMainTab !== "compare") return false;
  const layout = $("mech-browser-layout");
  const table = document.querySelector(".compare-table");
  const tableHead = document.querySelector(".compare-table thead");
  const tabContent = document.querySelector(".tab-content");
  if (!layout || layout.hidden || !table || !tableHead || !tabContent) return false;
  const tableRect = table.getBoundingClientRect();
  const headRect = tableHead.getBoundingClientRect();
  const contentRect = tabContent.getBoundingClientRect();
  return headRect.bottom <= contentRect.top + 6 && tableRect.bottom > contentRect.top + 56;
}

function updateCompareOverlay() {
  const overlay = $("compare-overlay");
  if (!overlay) return;
  const mechs = compareMechs();
  const shouldShow = shouldShowCompareOverlay();
  if (!shouldShow) {
    overlay.hidden = true;
    return;
  }

  const cells = $("compare-overlay-cells");
  if (cells) {
    cells.innerHTML = renderCompareOverlayHeader(mechs);
  }

  const tableWrap = document.querySelector(".compare-table-wrap");
  const tabContent = document.querySelector(".tab-content");
  const tableHead = document.querySelector(".compare-table thead");
  const headerCells = Array.from(document.querySelectorAll(".compare-table thead th"));
  if (!tableWrap || !tabContent) {
    overlay.hidden = true;
    return;
  }

  const wrapRect = tableWrap.getBoundingClientRect();
  const contentRect = tabContent.getBoundingClientRect();
  const left = Math.max(wrapRect.left, contentRect.left);
  const right = Math.min(wrapRect.right, window.innerWidth - 8);
  const top = Math.max(contentRect.top, 0);
  const width = right - left;

  if (width < 80) {
    overlay.hidden = true;
    return;
  }

  const track = cells?.querySelector(".compare-header-overlay-track");
  const overlayCells = cells ? Array.from(cells.querySelectorAll(".compare-header-overlay-cell")) : [];
  overlayCells.forEach((cell, index) => {
    const headerCell = headerCells[index];
    if (!headerCell) return;
    const width = headerCell.getBoundingClientRect().width;
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
  });
  if (track) {
    track.style.transform = `translateX(${-tableWrap.scrollLeft}px)`;
  }

  overlay.style.left = `${left}px`;
  overlay.style.top = `${top}px`;
  overlay.style.width = `${width}px`;
  overlay.style.height = tableHead ? `${tableHead.getBoundingClientRect().height}px` : "";
  overlay.hidden = false;
}

function renderInfoPanel() {
  $("info-apply-quirks").checked = state.infoApplyQuirks;

  updateCompareOverlay();
  $("mech-info").className = "info-grid";
  const mech = state.selectedMech;
  if (!mech) {
    $("info-variant-name").textContent = t("info.selectMech");
    $("info-variant-meta").textContent = t("info.selectMechHint");
    $("fit-info-mech").hidden = true;
    $("mech-info").innerHTML = "";
    updateCompareOverlay();
    return;
  }
  const stats = currentDefinition().stats || {};
  const quirks = effectiveQuirks();
  const values = state.infoApplyQuirks ? effectiveQuirkValues() : {};
  const armorRows = armorInfoRows(values);
  const structureRows = structureInfoRows(values);
  const armorTotal = armorRows.reduce((sum, row) => sum + number(row.total), 0);
  const armorBaseTotal = armorRows.reduce((sum, row) => sum + number(row.totalBase), 0);
  const structureTotal = structureRows.reduce((sum, row) => sum + number(row.total), 0);
  const structureBaseTotal = structureRows.reduce((sum, row) => sum + number(row.base), 0);
  const combinedRows = combinedDurabilityRows(armorRows, structureRows);
  const combinedTotal = combinedRows.reduce((sum, row) => sum + number(row.total), 0);
  const combinedBaseTotal = combinedRows.reduce((sum, row) => sum + number(row.totalBase), 0);
  const movement = movementInfo(values);

  $("info-variant-name").textContent = mech.display_name;
  $("info-variant-meta").textContent = `${factionLabel(mech.faction)} - ${WEIGHT_CLASS_LABELS[mech.weight_class] || mech.weight_class || t("common.unknown")} - ${stats.MaxTons || "?"} ${t("common.tons")}`;
  $("fit-info-mech").hidden = false;
  $("mech-info").innerHTML = [
    renderQuirkOverviewCard(quirks),
    renderInfoTable(t("info.combinedDurability"), [t("info.part"), t("common.value")], [
      [t("info.armorStructureTotal"), specValue(combinedBaseTotal, combinedTotal, 0)],
      ...combinedRows.map((row) => [row.label, specValue(row.totalBase, row.total, 0)]),
    ], { compact: true }),
    renderInfoTable(t("info.mobility"), [t("info.stat"), t("common.value")], [
      [t("info.maxSpeed"), specMobilitySpeed(movement.baseMaxSpeed, movement.baseReverseSpeed, movement.maxSpeed, movement.reverseSpeed, 1, " kph")],
      [t("info.acceleration"), specMobilityValue(movement.baseAcceleration, movement.acceleration, 1, " kph/s")],
      [t("info.deceleration"), specMobilityValue(movement.baseDeceleration, movement.deceleration, 1, " kph/s")],
      [t("info.turnSpeed"), specMobilityValue(movement.baseTurnSpeed, movement.turnSpeed, 2, " °/s")],
      [t("info.angleX"), specAnglePair(movement.baseAngleX[0], movement.angleX[0], movement.angleX[1], "X", 1)],
      [t("info.angleY"), specAnglePair(movement.baseAngleY[0], movement.angleY[0], movement.angleY[1], "Y", 1)],
      [t("info.torsoSpeed"), specMobilityValue(movement.baseTorsoSpeed, movement.torsoSpeed, 1, " °/s")],
    ]),
    renderInfoTable(t("info.structureInfo"), [t("info.part"), t("common.value")], [
      [t("info.structureTotal"), specValue(structureBaseTotal, structureTotal, 0)],
      ...structureRows.map((row) => [row.label, specValue(row.base, row.total, 0)]),
    ], { compact: true }),
    renderInfoTable(t("info.armorInfo"), [t("info.part"), t("common.value")], [
      [t("info.maxArmorTotal"), specValue(armorBaseTotal, armorTotal, 0)],
      ...armorRows.map((row) => [row.label, specValue(row.totalBase, row.total, 0)]),
    ], { compact: true }),
    renderInfoTable(t("info.engine"), [t("info.stat"), t("common.value")], [
      [t("info.minEngine"), formatInfoNumber(number(stats.MinEngineRating), 0)],
      [t("info.maxEngine"), formatInfoNumber(number(stats.MaxEngineRating), 0)],
    ]),
    renderInfoQuirks(quirks),
  ].join("");
}

function renderComparePanel() {
  $("compare-deltas").checked = state.compareShowDeltas;
  $("compare-apply-quirks").checked = state.infoApplyQuirks;
  const mechs = compareMechs();
  $("compare-variant-name").textContent = t("compare.title");
  $("compare-variant-meta").textContent = compareSelectionText(mechs);
  $("compare-info").innerHTML = renderCompareTable(mechs);
  document.querySelector(".compare-table-wrap")?.addEventListener("scroll", updateCompareOverlay, { passive: true });
  updateCompareOverlay();
}

function renderStatsInfoDetail(mech) {
  const applyQuirks = true;
  const data = infoDataForMech(mech, applyQuirks);
  const stats = data.stats || {};
  return [
    renderQuirkOverviewCard(data.quirks),
    renderInfoTable(t("info.combinedDurability"), [t("info.part"), t("common.value")], [
      [t("info.armorStructureTotal"), specValue(data.combinedBaseTotal, data.combinedTotal, 0, "", applyQuirks)],
      ...data.combinedRows.map((row) => [row.label, specValue(row.totalBase, row.total, 0, "", applyQuirks)]),
    ], { compact: true }),
    renderInfoTable(t("info.mobility"), [t("info.stat"), t("common.value")], [
      [t("info.maxSpeed"), specMobilitySpeed(data.movement.baseMaxSpeed, data.movement.baseReverseSpeed, data.movement.maxSpeed, data.movement.reverseSpeed, 1, " kph", applyQuirks)],
      [t("info.acceleration"), specMobilityValue(data.movement.baseAcceleration, data.movement.acceleration, 1, " kph/s", applyQuirks)],
      [t("info.deceleration"), specMobilityValue(data.movement.baseDeceleration, data.movement.deceleration, 1, " kph/s", applyQuirks)],
      [t("info.turnSpeed"), specMobilityValue(data.movement.baseTurnSpeed, data.movement.turnSpeed, 2, " °/s", applyQuirks)],
      [t("info.angleX"), specAnglePair(data.movement.baseAngleX[0], data.movement.angleX[0], data.movement.angleX[1], "X", 1, applyQuirks)],
      [t("info.angleY"), specAnglePair(data.movement.baseAngleY[0], data.movement.angleY[0], data.movement.angleY[1], "Y", 1, applyQuirks)],
      [t("info.torsoSpeed"), specMobilityValue(data.movement.baseTorsoSpeed, data.movement.torsoSpeed, 1, " °/s", applyQuirks)],
    ]),
    renderInfoTable(t("info.structureInfo"), [t("info.part"), t("common.value")], [
      [t("info.structureTotal"), specValue(data.structureBaseTotal, data.structureTotal, 0, "", applyQuirks)],
      ...data.structureRows.map((row) => [row.label, specValue(row.base, row.total, 0, "", applyQuirks)]),
    ], { compact: true }),
    renderInfoTable(t("info.armorInfo"), [t("info.part"), t("common.value")], [
      [t("info.maxArmorTotal"), specValue(data.armorBaseTotal, data.armorTotal, 0, "", applyQuirks)],
      ...data.armorRows.map((row) => [row.label, specValue(row.totalBase, row.total, 0, "", applyQuirks)]),
    ], { compact: true }),
    renderInfoTable(t("info.engine"), [t("info.stat"), t("common.value")], [
      [t("info.minEngine"), formatInfoNumber(number(stats.MinEngineRating), 0)],
      [t("info.maxEngine"), formatInfoNumber(number(stats.MaxEngineRating), 0)],
    ]),
    renderInfoQuirks(data.quirks, data.mech, data.build),
  ].join("");
}

function renderStatsDetailPanel(entries, category, valueScale) {
  const detail = $("stats-detail");
  if (!detail) return;
  const selected = entries.find((entry) => entry.key === state.selectedStatsMechId);
  if (!selected) {
    detail.innerHTML = `<div class="empty stats-detail-empty">${t("stats.noSelection")}</div>`;
    return;
  }
  const rank = entries.indexOf(selected) + 1;
  if (selected.isChassis) {
    renderStatsChassisDetail(detail, selected, rank, category, valueScale);
    return;
  }
  const mech = selected.mech;
  const stats = mech.definition?.stats || {};
  detail.innerHTML = `
    <section class="stats-detail-rank">
      <h3>${t("common.rank")}</h3>
      <div class="stats-detail-rank-grid">
        <div class="stats-detail-heading">
          <div class="stats-detail-summary">
            <div class="stats-detail-title">${omnipodIcon(mech)}<strong>${mech.display_name || variantCode(mech)}</strong></div>
            <div class="stats-detail-meta">${factionLabel(mech.faction)} - ${WEIGHT_CLASS_LABELS[mech.weight_class] || mech.weight_class || t("common.unknown")} - ${stats.MaxTons || "?"}t</div>
          </div>
          <button class="fit-mech-button stats-fit-button" type="button" data-fit-stats-mech="${mech.id}">${t("stats.fit")}</button>
        </div>
        <div class="stats-detail-rank-value">
          <span>${rank}</span>
          <strong>${category.label} ${formatInfoNumber(selected.total * valueScale, category.digits ?? 0)}${category.unit || ""}</strong>
        </div>
      </div>
    </section>
    <div class="stats-detail-section-title">${t("common.info")}</div>
    ${renderStatsInfoDetail(mech)}
  `;
}

function statsAggregateMode() {
  return STATS_CHASSIS_AGGREGATE_MODES.find((mode) => mode.key === state.statsChassisAggregateMode) || STATS_CHASSIS_AGGREGATE_MODES[0];
}

function formatStatsValue(value, category, valueScale) {
  return `${formatInfoNumber(value * valueScale, category.digits ?? 0)}${category.unit || ""}`;
}

function renderStatsChassisDetail(detail, entry, rank, category, valueScale) {
  const bestLabel = entry.maxMech?.display_name || variantCode(entry.maxMech);
  const worstLabel = entry.minMech?.display_name || variantCode(entry.minMech);
  detail.innerHTML = `
    <section class="stats-detail-rank">
      <h3>${t("common.rank")}</h3>
      <div class="stats-detail-rank-grid">
        <div class="stats-detail-summary">
          <div class="stats-detail-title"><strong>${entry.label}</strong></div>
          <div class="stats-detail-meta">${factionLabel(entry.faction)} - ${WEIGHT_CLASS_LABELS[entry.weightClass] || entry.weightClass || t("common.unknown")} - ${entry.tonsLabel} - ${entry.mechs.length} ${t("common.models")}</div>
        </div>
        <div class="stats-detail-rank-value">
          <span>${rank}</span>
          <strong>${category.label} ${formatStatsValue(entry.total, category, valueScale)}</strong>
        </div>
      </div>
    </section>
    <div class="stats-detail-section-title">${t("common.info")}</div>
    ${renderInfoTable(t("stats.specCompare"), [t("common.target"), t("common.value")], [
      [t("common.average"), formatStatsValue(entry.average, category, valueScale)],
      [t("common.max"), `${formatStatsValue(entry.max, category, valueScale)} (${bestLabel})`],
      [t("common.min"), `${formatStatsValue(entry.min, category, valueScale)} (${worstLabel})`],
    ])}
    ${renderInfoTable(t("stats.chassisInfo"), [t("common.item"), t("common.value")], [
      [t("stats.faction"), factionLabel(entry.faction)],
      [t("stats.weight"), WEIGHT_CLASS_LABELS[entry.weightClass] || entry.weightClass || t("common.unknown")],
      [t("stats.tons"), entry.tonsLabel],
      [t("stats.modelCount"), `${entry.mechs.length}`],
      [t("stats.hardpoints"), hardpointTypeBadges(entry.hardpointTypes) || "-"],
    ])}
  `;
}

function statsTonsKey(mech) {
  const tons = number(mech?.definition?.stats?.MaxTons, null);
  return tons === null ? "" : String(tons);
}

function availableStatsFactions() {
  return Array.from(new Set(state.mechs.map((mech) => mech.faction).filter(Boolean))).sort((a, b) => factionRank(a) - factionRank(b) || a.localeCompare(b));
}

function availableStatsTons() {
  return Array.from(new Set(state.mechs.map(statsTonsKey).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
}

function activeStatsDurabilityCategory() {
  return STATS_DURABILITY_CATEGORIES.find((category) => category.key === state.statsDurabilityCategory) || STATS_DURABILITY_CATEGORIES[0];
}

function activeStatsDurabilityScope() {
  return STATS_DURABILITY_SCOPES.find((scope) => scope.key === state.statsDurabilityScope) || STATS_DURABILITY_SCOPES[0];
}

function activeStatsMobilityCategory() {
  return STATS_MOBILITY_CATEGORIES.find((category) => category.key === state.statsMobilityCategory) || STATS_MOBILITY_CATEGORIES[0];
}

function activeStatsQuirkCategory() {
  return STATS_QUIRK_CATEGORIES.find((category) => category.key === state.statsQuirkCategory) || STATS_QUIRK_CATEGORIES[0];
}

function activeStatsQuirkDurabilityScope() {
  return STATS_QUIRK_DURABILITY_SCOPES.find((scope) => scope.key === state.statsQuirkDurabilityScope) || STATS_QUIRK_DURABILITY_SCOPES[0];
}

function activeStatsCooldownScope() {
  return STATS_COOLDOWN_SCOPES.find((scope) => scope.key === state.statsCooldownScope) || STATS_COOLDOWN_SCOPES[0];
}

function activeStatsHeatScope() {
  return STATS_HEAT_SCOPES.find((scope) => scope.key === state.statsHeatScope) || STATS_HEAT_SCOPES[0];
}

function activeStatsRangeScope() {
  return STATS_RANGE_SCOPES.find((scope) => scope.key === state.statsRangeScope) || STATS_RANGE_SCOPES[0];
}

function activeStatsVelocityScope() {
  return STATS_VELOCITY_SCOPES.find((scope) => scope.key === state.statsVelocityScope) || STATS_VELOCITY_SCOPES[0];
}

function activeStatsCategory() {
  if (state.activeStatsView === "mobility") return activeStatsMobilityCategory();
  if (state.activeStatsView === "quirks") {
    const category = activeStatsQuirkCategory();
    const scope = category.key === "cooldown"
      ? activeStatsCooldownScope()
      : category.key === "durability"
        ? activeStatsQuirkDurabilityScope()
        : category.key === "heat"
          ? activeStatsHeatScope()
          : category.key === "range"
            ? activeStatsRangeScope()
            : category.key === "velocity"
              ? activeStatsVelocityScope()
              : null;
    if (!scope) return category;
    return {
      ...category,
      label: `${category.label} / ${scope.label}`,
      metaLabel: `${category.metaLabel} / ${scope.label}`,
      summaryKey: scope.summaryKey,
      digits: scope.digits,
      scale: scope.scale,
      unit: scope.unit,
    };
  }
  const category = activeStatsDurabilityCategory();
  const scope = activeStatsDurabilityScope();
  return {
    ...category,
    label: `${category.label} / ${scope.label}`,
    metaLabel: `${category.metaLabel} / ${scope.label}`,
  };
}

function statsDurabilityFilterMatches(mech) {
  if (state.statsDurabilityMode !== "condition") return true;
  if (state.statsConditionFaction && mech.faction !== state.statsConditionFaction) return false;
  if (state.statsConditionAxis === "tons") {
    return !state.statsConditionTons.size || state.statsConditionTons.has(statsTonsKey(mech));
  }
  return !state.statsConditionWeightClasses.size || state.statsConditionWeightClasses.has(mech.weight_class);
}

function statsEntryValue(mech, category) {
  const summary = mechListSummary(mech, true);
  if (state.activeStatsView === "mobility") {
    return number(summary.movement?.[category.movementKey]);
  }
  if (state.activeStatsView === "quirks") {
    return number(summary.quirkStats?.[category.summaryKey]);
  }
  const scope = activeStatsDurabilityScope();
  return number(summary.durabilityByScope?.[scope.key]?.[category.key]);
}

function chassisTonsLabel(mechs) {
  const tons = Array.from(new Set(mechs.map(statsTonsKey).filter(Boolean))).sort((a, b) => Number(a) - Number(b));
  if (!tons.length) return "?t";
  if (tons.length === 1) return `${tons[0]}t`;
  return `${tons[0]}-${tons[tons.length - 1]}t`;
}

function statsChassisHardpointTypes(mechs) {
  const found = new Set();
  mechs.forEach((mech) => {
    stockHardpointTypes(mech).forEach((type) => found.add(type));
  });
  return HARDPOINT_ORDER.filter((type) => found.has(type));
}

function statsChassisSlotBadges(mechs, hardpointTypes = statsChassisHardpointTypes(mechs)) {
  const maxJumpJets = mechs.reduce((max, mech) => {
    const build = buildFromLoadout(mech);
    return Math.max(max, maximumJumpJets(mech, build));
  }, 0);
  const hasMasc = mechs.some((mech) => {
    const stats = currentDefinition(mech).stats || {};
    return number(stats.CanEquipMASC) > 0 || number(stats.CanEquipMasc) > 0;
  });
  return [
    hardpointTypeBadges(hardpointTypes),
    maxJumpJets > 0 ? mechSlotBadge("jumpjet", "JJ", maxJumpJets) : "",
    hasMasc ? mechSlotBadge("masc", "MASC") : "",
  ].join("");
}

function statsChassisEntries(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const chassis = entry.mech.chassis || "unknown";
    if (!groups.has(chassis)) groups.set(chassis, []);
    groups.get(chassis).push(entry);
  });

  return Array.from(groups.entries()).map(([chassis, groupEntries]) => {
    const mechs = groupEntries.map((entry) => entry.mech).sort(sortMechsByVariant);
    const representative = mechs[0];
    const sortedByValue = [...groupEntries].sort((a, b) => b.total - a.total || sortMechsByVariant(a.mech, b.mech));
    const maxEntry = sortedByValue[0];
    const minEntry = sortedByValue[sortedByValue.length - 1];
    const average = groupEntries.reduce((sum, entry) => sum + entry.total, 0) / groupEntries.length;
    const totals = {
      average,
      max: maxEntry.total,
      min: minEntry.total,
    };
    const hardpointTypes = statsChassisHardpointTypes(mechs);
    return {
      key: `chassis:${chassis}`,
      isChassis: true,
      mech: representative,
      mechs,
      label: chassisDisplayName(mechs),
      faction: representative?.faction || t("common.unknown"),
      weightClass: representative?.weight_class || "unknown",
      tonsLabel: chassisTonsLabel(mechs),
      hardpointTypes,
      slotBadges: statsChassisSlotBadges(mechs, hardpointTypes),
      total: totals[statsAggregateMode().key],
      average,
      max: maxEntry.total,
      min: minEntry.total,
      maxMech: maxEntry.mech,
      minMech: minEntry.mech,
    };
  });
}

function statsEntriesCacheKey(category) {
  return JSON.stringify([
    state.activeStatsView,
    category.key,
    category.summaryKey || "",
    category.movementKey || "",
    activeStatsDurabilityScope().key,
    state.statsRankMode,
    state.statsChassisAggregateMode,
    state.statsHideZeroQuirks,
    state.statsDurabilityMode,
    state.statsConditionFaction,
    state.statsConditionAxis,
    Array.from(state.statsConditionWeightClasses).sort(),
    Array.from(state.statsConditionTons).sort((left, right) => Number(left) - Number(right)),
  ]);
}

function cacheStatsEntries(key, entries) {
  if (state.statsEntriesCache.size >= 64) {
    state.statsEntriesCache.delete(state.statsEntriesCache.keys().next().value);
  }
  state.statsEntriesCache.set(key, entries);
  return entries;
}

function statsEntries(category = activeStatsCategory(), cacheKey = statsEntriesCacheKey(category)) {
  const cached = state.statsEntriesCache.get(cacheKey);
  if (cached) return cached;
  const entries = state.mechs
    .filter(statsDurabilityFilterMatches)
    .map((mech) => ({
      key: `mech:${mech.id}`,
      isChassis: false,
      mech,
      total: statsEntryValue(mech, category),
    }))
    .filter((entry) => state.activeStatsView !== "quirks" || !state.statsHideZeroQuirks || Math.abs(entry.total) >= COMPARE_RANK_EPSILON);
  const rankedEntries = state.statsRankMode === "chassis" ? statsChassisEntries(entries) : entries;
  return cacheStatsEntries(
    cacheKey,
    rankedEntries.sort((a, b) => b.total - a.total || (a.label || a.mech.display_name || "").localeCompare(b.label || b.mech.display_name || "", undefined, { numeric: true })),
  );
}

function renderStatsRows(entries, category, valueScale, cacheKey) {
  const list = $("stats-list");
  if (list.dataset.statsRowsKey === cacheKey) {
    updateStatsRowSelection();
    return;
  }
  list.innerHTML = entries.length
    ? entries
        .map((entry, index) => `
          <div class="stats-row ${factionClass(entry.faction || entry.mech.faction)} ${entry.key === state.selectedStatsMechId ? "active" : ""}" data-stats-entry="${entry.key}" role="button" tabindex="0" aria-pressed="${entry.key === state.selectedStatsMechId}">
            <span class="stats-rank">${index + 1}</span>
            <span class="stats-mech-main">
              <span class="mech-title-main">${entry.isChassis ? "" : omnipodIcon(entry.mech)}<strong>${entry.label || entry.mech.display_name || variantCode(entry.mech)}</strong></span>
              <span class="stats-subline">${entry.isChassis
                ? `${factionLabel(entry.faction)} - ${WEIGHT_CLASS_LABELS[entry.weightClass] || entry.weightClass || t("common.unknown")} - ${entry.tonsLabel} - ${entry.mechs.length} ${t("common.models")}`
                : `${factionLabel(entry.mech.faction)} - ${entry.mech.definition?.stats?.MaxTons || "?"}t`}</span>
            </span>
            <span class="stats-value-block">
              <span>${category.label}</span>
              <strong>${formatStatsValue(entry.total, category, valueScale)}</strong>
            </span>
            <span class="stats-extra ${weightClassClass(entry.weightClass || entry.mech.weight_class)}">
              <span class="badge weight-slot ${weightClassClass(entry.weightClass || entry.mech.weight_class)}">${WEIGHT_CLASS_LABELS[entry.weightClass || entry.mech.weight_class] || entry.weightClass || entry.mech.weight_class || t("common.unknown")}</span>
              <span class="stats-hardpoints mech-slot-tags">${(entry.isChassis ? entry.slotBadges : mechSlotBadges(entry.mech)) || `<span class="badge">${t("stats.noHardpoints")}</span>`}</span>
            </span>
          </div>
        `)
        .join("")
    : `<div class="empty">${t("stats.noRows")}</div>`;
  list.dataset.statsRowsKey = cacheKey;
  updateStatsRowSelection();
}

function updateStatsRowSelection() {
  const list = $("stats-list");
  const activeRow = list.querySelector(".stats-row.active");
  if (activeRow && activeRow.dataset.statsEntry !== state.selectedStatsMechId) {
    activeRow.classList.remove("active");
    activeRow.setAttribute("aria-pressed", "false");
  }
  if (!state.selectedStatsMechId) return;
  const selectedRow = list.querySelector(`[data-stats-entry="${state.selectedStatsMechId}"]`);
  if (!selectedRow) return;
  selectedRow.classList.add("active");
  selectedRow.setAttribute("aria-pressed", "true");
}

function renderCurrentStatsSelection() {
  const category = state.renderedStatsCategory || activeStatsCategory();
  const valueScale = state.renderedStatsValueScale ?? category.scale ?? 1;
  updateStatsRowSelection();
  renderStatsDetailPanel(state.renderedStatsEntries || [], category, valueScale);
}

function renderStatsConditionControls() {
  const detailToggle = $("stats-detail-toggle");
  if (detailToggle) {
    detailToggle.textContent = state.statsDetailMenusExpanded ? "▼" : "▶";
    detailToggle.setAttribute("aria-label", state.statsDetailMenusExpanded ? t("stats.collapse") : t("stats.expand"));
    detailToggle.setAttribute("aria-expanded", String(state.statsDetailMenusExpanded));
  }

  document.querySelectorAll("[data-stats-detail-menu]").forEach((element) => {
    const view = element.dataset.statsViewSection;
    element.hidden = !state.statsDetailMenusExpanded || (view && view !== state.activeStatsView);
  });

  const cooldownScopeMenu = $("stats-cooldown-scope-menu");
  if (cooldownScopeMenu) {
    cooldownScopeMenu.hidden = !state.statsDetailMenusExpanded || state.activeStatsView !== "quirks" || activeStatsQuirkCategory().key !== "cooldown";
  }

  const quirkDurabilityScopeMenu = $("stats-quirk-durability-scope-menu");
  if (quirkDurabilityScopeMenu) {
    quirkDurabilityScopeMenu.hidden = !state.statsDetailMenusExpanded || state.activeStatsView !== "quirks" || activeStatsQuirkCategory().key !== "durability";
  }

  const heatScopeMenu = $("stats-heat-scope-menu");
  if (heatScopeMenu) {
    heatScopeMenu.hidden = !state.statsDetailMenusExpanded || state.activeStatsView !== "quirks" || activeStatsQuirkCategory().key !== "heat";
  }

  const rangeScopeMenu = $("stats-range-scope-menu");
  if (rangeScopeMenu) {
    rangeScopeMenu.hidden = !state.statsDetailMenusExpanded || state.activeStatsView !== "quirks" || activeStatsQuirkCategory().key !== "range";
  }

  const velocityScopeMenu = $("stats-velocity-scope-menu");
  if (velocityScopeMenu) {
    velocityScopeMenu.hidden = !state.statsDetailMenusExpanded || state.activeStatsView !== "quirks" || activeStatsQuirkCategory().key !== "velocity";
  }

  document.querySelectorAll("[data-stats-category-view]").forEach((button) => {
    button.hidden = button.dataset.statsCategoryView !== state.activeStatsView;
  });

  document.querySelectorAll("[data-stats-durability-scope]").forEach((button) => {
    const active = button.dataset.statsDurabilityScope === state.statsDurabilityScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-durability-category]").forEach((button) => {
    const active = button.dataset.statsDurabilityCategory === state.statsDurabilityCategory;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-mobility-category]").forEach((button) => {
    const active = button.dataset.statsMobilityCategory === state.statsMobilityCategory;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-quirk-category]").forEach((button) => {
    const active = button.dataset.statsQuirkCategory === state.statsQuirkCategory;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-cooldown-scope]").forEach((button) => {
    const active = button.dataset.statsCooldownScope === state.statsCooldownScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-quirk-durability-scope]").forEach((button) => {
    const active = button.dataset.statsQuirkDurabilityScope === state.statsQuirkDurabilityScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-heat-scope]").forEach((button) => {
    const active = button.dataset.statsHeatScope === state.statsHeatScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-range-scope]").forEach((button) => {
    const active = button.dataset.statsRangeScope === state.statsRangeScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-velocity-scope]").forEach((button) => {
    const active = button.dataset.statsVelocityScope === state.statsVelocityScope;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-durability-mode]").forEach((button) => {
    const active = button.dataset.statsDurabilityMode === state.statsDurabilityMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const controls = $("stats-condition-controls");
  if (!controls) return;
  controls.hidden = !state.statsDetailMenusExpanded || state.statsDurabilityMode !== "condition";
  if (controls.hidden) return;

  $("stats-faction-filter").innerHTML = [
    `<option value="">${t("filters.allFactions")}</option>`,
    ...availableStatsFactions().map((faction) => `<option value="${faction}" ${faction === state.statsConditionFaction ? "selected" : ""}>${factionLabel(faction)}</option>`),
  ].join("");

  document.querySelectorAll("[data-stats-condition-axis]").forEach((button) => {
    const active = button.dataset.statsConditionAxis === state.statsConditionAxis;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  $("stats-weight-options").hidden = state.statsConditionAxis !== "weight";
  $("stats-weight-options").innerHTML = WEIGHT_CLASS_ORDER.map((weightClass) => {
    const active = state.statsConditionWeightClasses.has(weightClass);
    return `<button class="stats-option-button ${active ? "active" : ""}" type="button" data-stats-weight="${weightClass}" aria-pressed="${active}">${WEIGHT_CLASS_LABELS[weightClass] || weightClass}</button>`;
  }).join("");

  $("stats-ton-options").hidden = state.statsConditionAxis !== "tons";
  $("stats-ton-options").innerHTML = availableStatsTons()
    .map((tons) => {
      const active = state.statsConditionTons.has(tons);
      return `<button class="stats-option-button ${active ? "active" : ""}" type="button" data-stats-ton="${tons}" aria-pressed="${active}">${tons}t</button>`;
    })
    .join("");
}

function renderStatsPanel() {
  document.querySelectorAll("[data-stats-rank-mode]").forEach((button) => {
    const active = button.dataset.statsRankMode === state.statsRankMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const aggregateToggle = $("stats-chassis-aggregate-toggle");
  if (aggregateToggle) aggregateToggle.hidden = state.statsRankMode !== "chassis";

  document.querySelectorAll("[data-stats-chassis-aggregate]").forEach((button) => {
    const active = button.dataset.statsChassisAggregate === state.statsChassisAggregateMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  document.querySelectorAll("[data-stats-view]").forEach((button) => {
    const active = button.dataset.statsView === state.activeStatsView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const hideZeroQuirksToggle = $("stats-hide-zero-quirks-toggle");
  if (hideZeroQuirksToggle) hideZeroQuirksToggle.hidden = state.activeStatsView !== "quirks";
  const hideZeroQuirks = $("stats-hide-zero-quirks");
  if (hideZeroQuirks) hideZeroQuirks.checked = state.statsHideZeroQuirks;
  renderStatsConditionControls();

  if (!["durability", "mobility", "quirks"].includes(state.activeStatsView)) {
    state.renderedStatsEntries = [];
    state.renderedStatsCategory = null;
    state.renderedStatsValueScale = 1;
    $("stats-list").innerHTML = "";
    delete $("stats-list").dataset.statsRowsKey;
    $("stats-detail").innerHTML = "";
    return;
  }

  const category = activeStatsCategory();
  const cacheKey = statsEntriesCacheKey(category);
  const entries = statsEntries(category, cacheKey);
  const valueScale = category.scale ?? 1;
  if (entries.length && !entries.some((entry) => entry.key === state.selectedStatsMechId)) {
    state.selectedStatsMechId = null;
  }
  state.renderedStatsEntries = entries;
  state.renderedStatsCategory = category;
  state.renderedStatsValueScale = valueScale;
  renderStatsRows(entries, category, valueScale, cacheKey);
  renderStatsDetailPanel(entries, category, valueScale);
}

function calculateBuild() {
  const mech = state.selectedMech;
  const definition = effectiveDefinition(mech, state.currentBuild);
  const stats = definition.stats || {};
  const maxTons = number(stats.MaxTons);
  const fixedEngine = fixedOmniEngine(mech);
  let itemTonnage = fixedEngine ? itemTons(fixedEngine) : 0;
  let heat = 0;
  let alpha = 0;
  let ammo = 0;
  let armor = 0;
  const quirks = mechlabEffectiveQuirks(mech, state.currentBuild);
  const engine = installedEngine();
  const structureUpgrade = itemById(state.currentBuild.upgrades?.structure?.ItemID);
  const selectedGuidanceUpgrade = guidanceUpgrade();
  const guidanceTons = number(selectedGuidanceUpgrade?.stats?.extraTons);
  const requiredStructureSlots = structureUpgradeSlots(mech, state.currentBuild);
  const requiredArmorSlots = armorUpgradeSlots(mech, state.currentBuild);
  const fixedArmorSlotsByComponent = fixedArmorUpgradeSlots(mech, state.currentBuild);
  const hasFixedArmorUpgradeSlots = Object.keys(fixedArmorSlotsByComponent).length > 0;
  const structureAllocation = allocateUpgradeSlots(
    requiredStructureSlots,
    definition,
    state.currentBuild,
    engine,
    fixedEngine,
    fixedArmorSlotsByComponent,
  );
  const armorAllocation = hasFixedArmorUpgradeSlots
    ? allocateFixedUpgradeSlots(
      fixedArmorSlotsByComponent,
      definition,
      state.currentBuild,
      engine,
      fixedEngine,
    )
    : allocateUpgradeSlots(
      requiredArmorSlots,
      definition,
      state.currentBuild,
      engine,
      fixedEngine,
      structureAllocation.byComponent,
    );
  let installedHeatSinkCount = 0;
  const warnings = [];
  const componentUsage = {};

  for (const name of COMPONENT_ORDER) {
    const compDef = definition.components?.[name] || {};
    const buildComp = state.currentBuild.components[name] || { items: [] };
    const internalItems = (compDef.internals || [])
      .map((itemId) => itemById(itemId))
      .filter(Boolean);
    const internalSlots = internalItems.reduce((sum, item) => {
      const itemId = Number(item.id);
      if (!hasFixedOmnipods(mech) && MOVABLE_UPGRADE_SLOT_IDS.has(Number(itemId))) return sum;
      return sum + Math.max(1, itemSlots(item));
    }, 0);
    itemTonnage += internalItems.reduce(
      (sum, item) => sum + internalItemTonnageModifier(item),
      0,
    );
    const fixedItems = (compDef.fixed || [])
      .map((itemId, index) => ({
        item: itemById(itemId),
        source: compDef.fixedSources?.[index] || "",
      }))
      .filter(({ item }) => item && item.item_type !== "engine");
    const fixedEquipmentSlots = fixedItems.reduce(
      (sum, { item }) => sum + (
        name === "centre_torso" && isHeatSink(item)
          ? 0
          : Math.max(1, effectiveItemSlots(item))
      ),
      0,
    );
    const sideEngineSlots = ENGINE_SIDE_COMPONENTS.has(name) ? engineSideSlots(engine) : 0;
    const fixedEngineSlots = name === "centre_torso" && fixedEngine ? Math.max(1, itemSlots(fixedEngine)) : 0;
    const preferredStructureSlots = number(structureAllocation.byComponent[name]);
    const preferredArmorSlots = number(armorAllocation.byComponent[name]);
    const usage = {
      slots: internalSlots + fixedEquipmentSlots + sideEngineSlots + fixedEngineSlots,
      engineSideSlots: sideEngineSlots,
      fixedEngineSlots,
      preferredStructureSlots,
      preferredArmorSlots,
      structureSlots: 0,
      armorSlots: 0,
      occupiedStructureSlots: 0,
      occupiedArmorSlots: 0,
      movableStructureSlots: 0,
      movableArmorSlots: 0,
      fixedArmorSlots: number(fixedArmorSlotsByComponent[name]),
      occupiedUpgradeSlots: 0,
      movableUpgradeSlots: 0,
      hardpoints: {},
      warnings: [],
    };

    armor += number(buildComp.armor);
    for (const { item, source } of fixedItems) {
      itemTonnage += itemTons(item);
      heat += itemHeat(item);
      const mountType = equipmentHardpointType(item);
      if (mountType && fixedItemConsumesHardpoint(item, source, mech)) {
        usage.hardpoints[mountType] = (usage.hardpoints[mountType] || 0) + 1;
      }
      if (item.item_type === "weapon" && !isAmsWeapon(item)) {
        alpha += weaponTotalDamage(item);
      }
      if (item.item_type === "ammo") ammo += effectiveAmmoShots(item, quirks);
      if (isHeatSink(item)) installedHeatSinkCount += 1;
    }
    for (const entry of buildComp.items) {
      const item = itemById(entry.item_id);
      if (!item) {
        usage.warnings.push(t("build.missingItem", { id: entry.item_id }));
        continue;
      }
      if (!itemMatchesMechFaction(item, mech)) {
        usage.warnings.push(t("build.factionMismatch", {
          item: item.display_name || item.name,
          faction: factionLabel(mech.faction),
        }));
      }
      if (item.item_type === "engine" && !ENGINE_COMPONENTS.has(name)) {
        usage.warnings.push(t("build.engineTorsoOnly"));
      }
      if (item.item_type === "jumpjet" && !JUMP_JET_COMPONENTS.has(name)) {
        usage.warnings.push(t("build.jumpJetLocation"));
      }
      if (item.item_type !== "jumpjet" && !itemAllowedInComponent(item, name)) {
        usage.warnings.push(t("build.noAutoInstallLocation"));
      }
      const mismatch = guidanceMismatch(item);
      if (mismatch) usage.warnings.push(mismatch);
      const artemisWeapon = isArtemisWeapon(item) && artemisEquipped();
      usage.slots += effectiveItemSlots(item);
      itemTonnage += itemTons(item) + (artemisWeapon ? guidanceTons : 0);
      heat += itemHeat(item);
      const mountType = equipmentHardpointType(item);
      if (mountType) {
        const type = mountType;
        usage.hardpoints[type] = (usage.hardpoints[type] || 0) + 1;
      }
      if (item.item_type === "weapon" && !isAmsWeapon(item)) {
        alpha += weaponTotalDamage(item);
      }
      if (item.item_type === "ammo") {
        ammo += effectiveAmmoShots(item, quirks);
      }
      if (isHeatSink(item)) {
        installedHeatSinkCount += 1;
      }
    }

    for (const [type, usedHardpoints] of Object.entries(usage.hardpoints)) {
      const capacity = (compDef.hardpoints || [])
        .filter((hp) => hardpointType(hp) === type)
        .reduce((sum, hp) => sum + hardpointSlots(hp), 0);
      if (usedHardpoints > capacity) usage.warnings.push(`${type} hardpoints ${usedHardpoints}/${capacity}`);
    }

    componentUsage[name] = usage;
  }

  const installedEngineHeatSinks = engineHeatSinkEntries(state.currentBuild);
  for (const entry of installedEngineHeatSinks) {
    const item = itemById(entry.item_id);
    if (!item) {
      warnings.push(t("build.missingItem", { id: entry.item_id }));
      continue;
    }
    itemTonnage += itemTons(item);
    heat += itemHeat(item);
    installedHeatSinkCount += 1;
  }

  const totalSlotCapacity = COMPONENT_ORDER.reduce((sum, name) => {
    return sum + number(definition.components?.[name]?.slots);
  }, 0);
  const baseSlotUsage = Object.values(componentUsage).reduce((sum, usage) => sum + number(usage.slots), 0);
  const requiredUpgradeSlots = requiredStructureSlots + requiredArmorSlots;
  const reservedUpgradeUsage = baseSlotUsage + requiredUpgradeSlots;
  const upgradeFreeSlots = Math.max(0, totalSlotCapacity - reservedUpgradeUsage);
  Object.entries(componentUsage).forEach(([name, usage]) => {
    const slotLimit = number(definition.components?.[name]?.slots);
    const availableSlots = Math.max(0, slotLimit - number(usage.slots));
    usage.structureSlots = number(usage.preferredStructureSlots);
    usage.armorSlots = number(usage.preferredArmorSlots);
    const componentUpgradeSlots = usage.structureSlots + usage.armorSlots;
    const floatingUpgradeSlots = componentUpgradeSlots - usage.fixedArmorSlots;
    const occupiedFloatingSlots = Math.min(
      floatingUpgradeSlots,
      Math.max(0, availableSlots - usage.fixedArmorSlots - upgradeFreeSlots),
    );
    usage.occupiedUpgradeSlots = usage.fixedArmorSlots + occupiedFloatingSlots;
    usage.movableUpgradeSlots = componentUpgradeSlots - usage.occupiedUpgradeSlots;
    if (usage.fixedArmorSlots) {
      usage.occupiedArmorSlots = usage.fixedArmorSlots;
      usage.movableArmorSlots = 0;
      usage.occupiedStructureSlots = occupiedFloatingSlots;
      usage.movableStructureSlots = usage.structureSlots - usage.occupiedStructureSlots;
    } else {
      usage.occupiedStructureSlots = Math.min(usage.structureSlots, usage.occupiedUpgradeSlots);
      usage.occupiedArmorSlots = usage.occupiedUpgradeSlots - usage.occupiedStructureSlots;
      usage.movableStructureSlots = usage.structureSlots - usage.occupiedStructureSlots;
      usage.movableArmorSlots = usage.armorSlots - usage.occupiedArmorSlots;
    }
    usage.slots += usage.occupiedUpgradeSlots;
    if (slotLimit && usage.slots > slotLimit) {
      usage.warnings.push(`Slots ${usage.slots}/${slotLimit}`);
    }
  });
  // Armor and structure upgrades are always applied. Only the upgrade slots that
  // fit around installed equipment are rendered, while the summary reserves the
  // full required amount so an over-capacity build remains visible.
  const displayedSlotUsage = Object.values(componentUsage).reduce((sum, usage) => sum + number(usage.slots), 0);
  const allocatedStructureSlots = requiredStructureSlots - structureAllocation.unallocated;
  const allocatedArmorSlots = hasFixedArmorUpgradeSlots
    ? requiredArmorSlots
    : requiredArmorSlots - armorAllocation.unallocated;
  const allocatedUpgradeSlots = allocatedStructureSlots + allocatedArmorSlots;
  const upgradeCalculationUsage = reservedUpgradeUsage;
  const currentSlotUsage = upgradeCalculationUsage;
  const freeSlots = Math.max(0, totalSlotCapacity - currentSlotUsage);

  if (structureAllocation.unallocated) {
    warnings.push(t("build.structureSlotsUnavailable", { count: structureAllocation.unallocated }));
  }
  if (armorAllocation.unallocated) {
    warnings.push(t("build.armorSlotsUnavailable", { count: armorAllocation.unallocated }));
  }

  for (const [name, usage] of Object.entries(componentUsage)) {
    for (const warning of usage.warnings) {
      warnings.push(`${MECHLAB_COMPONENT_NAMES[name] || name}: ${warning}`);
    }
  }

  const installedJumpJetCount = installedMechItems("jumpjet").length;
  const jumpJetLimit = maximumJumpJets(mech, state.currentBuild);
  if (installedJumpJetCount > jumpJetLimit) {
    warnings.push(t("build.jumpJetFull", { used: installedJumpJetCount, limit: jumpJetLimit }));
  }
  ["target-computer", "active-probe", "case"].forEach((group) => {
    const installed = installedEquipmentLimitGroupItems(group);
    const limit = equipmentLimitGroupMaximum(group);
    if (installed.length > limit) {
      warnings.push(t("build.equipmentGroupFull", {
        group: equipmentLimitGroupLabel(group),
        used: installed.length,
        limit,
      }));
    }
  });

  armor += Object.values(state.currentBuild.rearArmor || {}).reduce((sum, value) => sum + number(value), 0);
  const armorUpgradeId = state.currentBuild.upgrades?.armor?.ItemID;
  const armorUpgrade = itemById(armorUpgradeId);
  const engineIncludedHeatSinks = engineIncludedHeatSinkCount(engine);
  const fixedEngineHeatSinkCount = fixedEngineHeatSinkItems(mech, state.currentBuild).length;
  const engineHeatSinkCapacity = engineAdditionalHeatSinkCapacity(engine);
  const engineUserHeatSinkSlots = engineUserHeatSinkCapacity(engine, mech, state.currentBuild);
  const totalHeatSinkCount = installedHeatSinkCount + engineIncludedHeatSinks;
  const structureTons = structureUpgradeTonnage(maxTons, structureUpgrade);
  const totalTons = structureTons + itemTonnage + armorTonnage(armor, armorUpgrade);
  if (maxTons && totalTons > maxTons + 0.1) {
    warnings.push(`Tonnage ${fmt(totalTons)}/${fmt(maxTons)}`);
  }
  if (engine) {
    const rating = number(engine.stats?.rating);
    const min = number(stats.MinEngineRating);
    const max = number(stats.MaxEngineRating);
    if ((min && rating < min) || (max && rating > max)) {
      warnings.push(t("build.engineOutside", { rating, min, max }));
    }
  } else {
    warnings.push(t("build.noEngine"));
  }

  return {
    maxTons,
    totalTons,
    heat,
    alpha,
    ammo,
    armor,
    engine,
    installedHeatSinkCount,
    engineIncludedHeatSinks,
    engineHeatSinkCapacity,
    engineUserHeatSinkSlots,
    engineHeatSinkCount: installedEngineHeatSinks.length,
    fixedEngineHeatSinkCount,
    totalHeatSinkCount,
    totalSlotCapacity,
    baseSlotUsage,
    displayedSlotUsage,
    structureCalculationUsage: upgradeCalculationUsage,
    upgradeCalculationUsage,
    currentSlotUsage,
    freeSlots,
    structureFreeSlots: upgradeFreeSlots,
    upgradeFreeSlots,
    structureSlots: allocatedStructureSlots,
    armorSlots: allocatedArmorSlots,
    upgradeSlots: allocatedUpgradeSlots,
    requiredStructureSlots,
    requiredArmorSlots,
    requiredUpgradeSlots,
    unallocatedStructureSlots: structureAllocation.unallocated,
    unallocatedArmorSlots: armorAllocation.unallocated,
    warnings,
    componentUsage,
  };
}

function renderSummary(calc = state.selectedMech && state.currentBuild ? calculateBuild() : null) {
  if (!calc) {
    $("summary-strip").innerHTML = "";
    return;
  }
  $("summary-strip").innerHTML = [
    [t("common.tons"), `${fmt(calc.totalTons)}/${fmt(calc.maxTons)}`],
    [t("common.alpha"), fmt(calc.alpha)],
    [t("common.heat"), fmt(calc.heat)],
    [t("common.ammo"), fmt(calc.ammo, 0)],
    [t("common.engine"), calc.engine ? number(calc.engine.stats?.rating) : "-"],
    [t("common.slots"), `${calc.currentSlotUsage}/${calc.totalSlotCapacity}`],
    [t("common.status"), calc.warnings.length ? t("common.check") : t("common.ok")],
  ]
    .map(([label, value]) => `<div class="pill"><strong>${value}</strong><span>${label}</span></div>`)
    .join("");
}

function filteredMechsForCompactList() {
  const search = String($("mechlab-compact-search")?.value || "").trim().toLowerCase();
  return state.mechs.filter((mech) => mechMatchesListFilters(mech, search));
}

function normalizedMechVariantType(mech) {
  return String(mech?.definition?.stats?.VariantType || "").trim().toLowerCase();
}

function mechTypeFilterCategory(mech) {
  const type = normalizedMechVariantType(mech);
  if (!type) return "normal";
  if (type === "hero" || type === "champion") return type;
  return "special";
}

function initializeMechTypeFilters() {
  const specialTypes = new Map();
  state.mechs.forEach((mech) => {
    if (mechTypeFilterCategory(mech) !== "special") return;
    const label = String(mech.definition?.stats?.VariantType || "").trim();
    const key = label.toLowerCase();
    if (key && !specialTypes.has(key)) specialTypes.set(key, label);
  });
  const preferredOrder = new Map(["founder", "phoenix", "sarah", "special"].map((type, index) => [type, index]));
  state.mechSpecialTypeOptions = Array.from(specialTypes, ([key, label]) => ({ key, label }))
    .sort((left, right) => (
      (preferredOrder.get(left.key) ?? Number.MAX_SAFE_INTEGER)
      - (preferredOrder.get(right.key) ?? Number.MAX_SAFE_INTEGER)
      || left.label.localeCompare(right.label)
    ));
  state.mechFilterSpecialTypes = new Set(state.mechSpecialTypeOptions.map((option) => option.key));
}

function initializeMechQuirkFilters() {
  const options = new Map();
  state.mechQuirkValuesCache.clear();
  state.mechs.forEach((mech) => {
    const quirks = effectiveQuirks(mech, buildFromLoadout(mech));
    const values = new Map();
    quirks.forEach((quirk) => {
      const key = String(quirk.name || "").trim().toLowerCase();
      if (!key) return;
      values.set(key, number(quirk.value));
      if (!options.has(key)) {
        options.set(key, {
          key,
          label: String(quirk.display_name || quirk.name).trim() || quirk.name,
          name: quirk.name,
          display_name: quirk.display_name || quirk.name,
          unit: key.endsWith("_multiplier") ? "%" : "",
        });
      }
    });
    state.mechQuirkValuesCache.set(String(mech.id), values);
  });
  state.mechQuirkFilterOptions = sortQuirksForDisplay(Array.from(options.values()));
}

function mechQuirkValues(mech) {
  const key = String(mech?.id || "");
  if (!key) return new Map();
  const cached = state.mechQuirkValuesCache.get(key);
  if (cached) return cached;
  const values = new Map();
  effectiveQuirks(mech, buildFromLoadout(mech)).forEach((quirk) => {
    const name = String(quirk.name || "").trim().toLowerCase();
    if (name) values.set(name, number(quirk.value));
  });
  state.mechQuirkValuesCache.set(key, values);
  return values;
}

function mechMatchesTypeFilter(mech) {
  if (state.mechFilterAllTypes) return true;
  const category = mechTypeFilterCategory(mech);
  if (!state.mechFilterTypeCategories.has(category)) return false;
  return category !== "special" || state.mechFilterSpecialTypes.has(normalizedMechVariantType(mech));
}

function hardpointFilterTypeLabel(type) {
  if (type === "energy" || type === "missile" || type === "ballistic") {
    return t(`stats.${type}`);
  }
  if (type === "jumpjet") return t("filters.jumpjets");
  if (type === "masc") return t("filters.masc");
  return HARDPOINT_LABELS[type] || String(type).toUpperCase();
}

function mechHardpointFilterCounts(mech) {
  const key = String(mech?.id || "");
  if (!key) return {};
  const cached = state.mechHardpointFilterCountsCache.get(key);
  if (cached) return cached;

  const counts = Object.fromEntries(MECH_HARDPOINT_FILTER_ORDER.map((type) => [
    type,
    Object.fromEntries(MECH_FILTER_HARDPOINT_LOCATIONS.map((location) => [location.key, 0])),
  ]));
  const build = buildFromLoadout(mech);
  const definition = effectiveDefinition(mech, build);
  Object.entries(definition.components || {}).forEach(([componentName, component]) => {
    (component.hardpoints || []).forEach((hardpoint) => {
      const type = hardpointType(hardpoint);
      if (!counts[type]) return;
      const slots = hardpointSlots(hardpoint);
      counts[type].total += slots;
      if (Object.hasOwn(counts[type], componentName)) {
        counts[type][componentName] += slots;
      }
    });
  });
  counts.jumpjet.total = maximumJumpJets(mech, build);
  const stats = currentDefinition(mech).stats || {};
  counts.masc.total = number(stats.CanEquipMASC) > 0 || number(stats.CanEquipMasc) > 0 ? 1 : 0;
  state.mechHardpointFilterCountsCache.set(key, counts);
  return counts;
}

function mechMatchesHardpointFilters(mech) {
  const enabledTypes = MECH_HARDPOINT_FILTER_ORDER
    .filter((type) => state.mechHardpointFilters[type].enabled);
  if (!enabledTypes.length) return true;
  const counts = mechHardpointFilterCounts(mech);
  return enabledTypes.every((type) => {
    const locations = MECH_FILTER_HARDPOINT_LOCATIONS.filter((location) => (
      location.key === "total" || !MECH_HARDPOINT_FILTER_TOTAL_ONLY_TYPES.has(type)
    ));
    return locations.every((location) => (
      number(counts[type]?.[location.key])
        >= number(state.mechHardpointFilters[type].minimums[location.key])
    ));
  });
}

function specialFeatureFixedItems(mech, build) {
  const definition = effectiveDefinition(mech, build);
  const ids = new Set();
  Object.values(definition.components || {}).forEach((component) => {
    [...(component.internals || []), ...(component.fixed || [])]
      .forEach((itemId) => ids.add(String(itemId)));
  });
  return Array.from(ids, (itemId) => itemById(itemId)).filter(Boolean);
}

function specialFeatureItemKey(item) {
  return normalizeLookupKey(`${item?.name || ""} ${item?.display_name || ""}`);
}

function improvedJumpJetChassis() {
  if (state.improvedJumpJetChassis) return state.improvedJumpJetChassis;
  const chassis = new Set();
  Object.values(state.omnipods || {}).forEach((pod) => {
    const hasImprovedJumpJets = (omnipodDefinition(pod).fixed || []).some((itemId) => (
      specialFeatureItemKey(itemById(itemId)).includes("improvedjumpjets")
    ));
    if (hasImprovedJumpJets) chassis.add(normalizeLookupKey(pod.chassis));
  });
  state.improvedJumpJetChassis = chassis;
  return chassis;
}

function mechSpecialFeatures(mech) {
  const key = String(mech?.id || "");
  if (!key) return new Set();
  const cached = state.mechSpecialFeatureCache.get(key);
  if (cached) return cached;

  const features = new Set();
  const build = buildFromLoadout(mech);
  const quirks = effectiveQuirks(mech, build);
  const fixedItems = specialFeatureFixedItems(mech, build);
  const fixedItemKeys = fixedItems.map(specialFeatureItemKey);
  const activeDefinition = effectiveDefinition(mech, build);

  if (
    state.shakeDampingMechIds.has(key)
    || state.shakeDampingMechNames.has(normalizeLookupKey(mech.name))
  ) {
    features.add("no-jump-shake");
  }
  if (jamChanceSummaryMax(quirks) >= 1) features.add("jam-immune");
  if (quirks.some((quirk) => (
    String(quirk.name || "").toLowerCase() === "falldamage_multiplier"
    && Math.max(0, -number(quirk.value)) >= 0.5
  ))) {
    features.add("fall-resistant");
  }
  if (durabilityQuirkSummaryValues(quirks).critPrevention >= 1) {
    features.add("crit-immune");
  }
  if (fixedItemKeys.some((itemKey) => itemKey.includes("compactgyro"))) {
    features.add("compact-gyro");
  }
  if (fixedItems.some((item) => (
    item.item_type === "internal"
    && String(item.loc?.desc_tag || "").toLowerCase() === "@mdf_xlgyrodesc"
  ))) {
    features.add("xl-gyro");
  }
  if (fixedItemKeys.some((itemKey) => itemKey.includes("compactcockpit"))) {
    features.add("compact-cockpit");
  }
  const hasShoulderOnlyArm = ["right_arm", "left_arm"].some((component) => {
    const internals = activeDefinition.components?.[component]?.internals || [];
    return internals.includes(SHOULDER_ID)
      && !internals.includes(UPPER_ARM_ACTUATOR_ID)
      && !internals.includes(LOWER_ARM_ACTUATOR_ID)
      && !internals.includes(HAND_ACTUATOR_ID);
  });
  if (hasShoulderOnlyArm) {
    features.add("no-arm-actuators");
  }
  if (quirks.some((quirk) => (
    String(quirk.name || "").toLowerCase() === "externalheat_multiplier"
    && Math.max(0, -number(quirk.value)) >= 1
  ))) {
    features.add("laser-heat-sinks");
  }
  if (fixedItemKeys.some((itemKey) => itemKey.includes("cyclopssensors") || itemKey.includes("tacticonb2000"))) {
    features.add("tacticon-b2000");
  }
  if (fixedItems.some((item) => item.item_type === "internal" && specialFeatureItemKey(item).includes("shield"))) {
    features.add("shield");
  }
  if (fixedItems.some((item) => {
    const itemKey = specialFeatureItemKey(item);
    return item.item_type === "masc"
      && itemKey.includes("supercharger")
      && !itemKey.includes("mascsupercharger");
  })) {
    features.add("supercharger");
  }
  if (fixedItems.some((item) => {
    const itemKey = specialFeatureItemKey(item);
    return (item.item_type === "masc" && itemKey.includes("mascsupercharger"))
      || itemKey.includes("superchargerdummy");
  })) {
    features.add("masc-supercharger");
  }
  if (fixedItems.some((item) => (
    item.item_type === "weapon" && SPECIAL_WEAPON_NAMES.has(normalizeLookupKey(item.name))
  ))) {
    features.add("special-weapon");
  }
  if (improvedJumpJetChassis().has(normalizeLookupKey(mech.chassis))) {
    features.add("improved-jump-jets");
  }
  if (fixedItems.some((item) => item.item_type === "jumpjet" && specialFeatureItemKey(item).includes("partialwing"))) {
    features.add("partial-wing");
  }
  if (fixedItemKeys.some((itemKey) => (
    itemKey.includes("baneherocomputer") || itemKey.includes("nagaherocomputer")
  ))) {
    features.add("special-target-computer");
  }

  state.mechSpecialFeatureCache.set(key, features);
  return features;
}

function mechMatchesSpecialFeatureFilters(mech) {
  const selectedFeatures = [
    ...state.mechSpecialTraitSelections,
    ...state.mechSpecialEquipmentSelections,
  ];
  if (selectedFeatures.length === 0) return true;
  const features = mechSpecialFeatures(mech);
  return selectedFeatures.some((feature) => features.has(feature));
}

function mechMatchesQuirkFilters(mech) {
  const selections = Array.from(state.mechQuirkFilterSelections.entries());
  if (selections.length === 0) return true;
  const values = mechQuirkValues(mech);
  const matches = ([quirk, minimum]) => {
    if (!values.has(quirk)) return false;
    if (minimum === null) return true;
    const magnitude = quirkFilterMagnitude(quirk, values.get(quirk));
    return magnitude !== null && magnitude >= minimum;
  };
  return state.mechQuirkFilterMode === "all"
    ? selections.every(matches)
    : selections.some(matches);
}

function mechMatchesListFilters(mech, search = "") {
  const selectedWeights = state.mechFilterWeightClasses;
  const weightFilterActive = selectedWeights.size > 0 && selectedWeights.size < 4;
  const matchesSearch = !search
    || `${mech.display_name} ${mech.name} ${mech.chassis}`.toLowerCase().includes(search);
  const matchesFaction = !state.mechFilterFaction || mech.faction === state.mechFilterFaction;
  const matchesWeight = !weightFilterActive || selectedWeights.has(mech.weight_class);
  return matchesSearch
    && matchesFaction
    && matchesWeight
    && mechMatchesTypeFilter(mech)
    && mechMatchesHardpointFilters(mech)
    && mechMatchesSpecialFeatureFilters(mech)
    && mechMatchesQuirkFilters(mech);
}

function renderMechHardpointFilterControls() {
  const rows = $("mech-hardpoint-filter-rows");
  const renderedTypes = Array.from(
    rows.querySelectorAll("[data-mech-hardpoint-filter-row]"),
    (row) => row.dataset.mechHardpointFilterRow,
  );
  if (
    renderedTypes.length !== MECH_HARDPOINT_FILTER_ORDER.length
    || renderedTypes.some((type, index) => type !== MECH_HARDPOINT_FILTER_ORDER[index])
  ) {
    rows.innerHTML = MECH_HARDPOINT_FILTER_ORDER.map((type) => {
      const typeLabel = hardpointFilterTypeLabel(type);
      return `
        <div class="mech-hardpoint-filter-row ${type}" data-mech-hardpoint-filter-row="${type}">
          <button class="mech-hardpoint-filter-enable" type="button" data-mech-hardpoint-filter-toggle="${type}" aria-label="${escapeHtml(`${typeLabel} ${t("filters.hardpoints")}`)}" aria-pressed="false"></button>
          <strong><span>${HARDPOINT_LABELS[type]}</span>${escapeHtml(typeLabel)}</strong>
          ${MECH_FILTER_HARDPOINT_LOCATIONS.map((location) => {
            if (type === "masc") {
              return location.key === "total"
                ? '<span class="mech-hardpoint-filter-fixed-value">1</span>'
                : '<span class="mech-hardpoint-filter-unavailable">-</span>';
            }
            if (
              MECH_HARDPOINT_FILTER_TOTAL_ONLY_TYPES.has(type)
              && location.key !== "total"
            ) {
              return '<span class="mech-hardpoint-filter-unavailable">-</span>';
            }
            return `
              <input
                type="number"
                min="${location.key === "total" ? 1 : 0}"
                step="1"
                inputmode="numeric"
                data-mech-hardpoint-filter-type="${type}"
                data-mech-hardpoint-filter-location="${location.key}"
                aria-label="${escapeHtml(`${typeLabel} ${t(location.labelKey)}`)}"
              >
            `;
          }).join("")}
        </div>
      `;
    }).join("");
  }

  rows.querySelectorAll("[data-mech-hardpoint-filter-row]").forEach((row) => {
    const type = row.dataset.mechHardpointFilterRow;
    const filter = state.mechHardpointFilters[type];
    row.classList.toggle("enabled", filter.enabled);
    const toggle = row.querySelector("[data-mech-hardpoint-filter-toggle]");
    toggle.classList.toggle("active", filter.enabled);
    toggle.setAttribute("aria-pressed", String(filter.enabled));
    row.querySelectorAll("[data-mech-hardpoint-filter-location]").forEach((input) => {
      const location = input.dataset.mechHardpointFilterLocation;
      const value = number(filter.minimums[location]);
      if (document.activeElement !== input || input.value !== "") input.value = String(value);
      input.disabled = !filter.enabled;
    });
  });
}

function renderMechFilterTabs() {
  document.querySelectorAll("[data-mech-filter-tab]").forEach((button) => {
    const active = button.dataset.mechFilterTab === state.activeMechFilterTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $("mech-filter-basic-content").hidden = state.activeMechFilterTab !== "basic";
  $("mech-filter-special-content").hidden = state.activeMechFilterTab !== "special";
  $("mech-filter-quirks-content").hidden = state.activeMechFilterTab !== "quirks";
}

function renderMechSpecialFeatureControls() {
  document.querySelectorAll("[data-mech-special-feature]").forEach((button) => {
    const feature = button.dataset.mechSpecialFeature;
    const group = button.dataset.mechSpecialFeatureGroup || mechSpecialFeatureGroup(feature);
    const selections = group === "traits"
      ? state.mechSpecialTraitSelections
      : state.mechSpecialEquipmentSelections;
    const active = selections.has(feature);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderMechQuirkFilterControls() {
  document.querySelectorAll("[data-mech-quirk-mode]").forEach((button) => {
    const active = button.dataset.mechQuirkMode === state.mechQuirkFilterMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const options = $("mech-filter-quirk-options");
  const searchInput = $("mech-filter-quirk-search");
  if (document.activeElement !== searchInput) {
    searchInput.value = state.mechQuirkFilterSearch;
  }
  $("clear-mech-quirk-filters").disabled = state.mechQuirkFilterSelections.size === 0;
  const search = state.mechQuirkFilterSearch.trim().toLowerCase();
  const visibleOptions = search
    ? state.mechQuirkFilterOptions.filter((option) => (
      `${option.label} ${option.display_name} ${option.name} ${option.key}`
        .toLowerCase()
        .includes(search)
    ))
    : state.mechQuirkFilterOptions;
  $("mech-filter-quirk-empty").hidden = !search || visibleOptions.length > 0;
  const renderedKeys = Array.from(
    options.querySelectorAll("[data-mech-quirk-filter]"),
    (button) => button.dataset.mechQuirkFilter,
  );
  const availableKeys = visibleOptions.map((option) => option.key);
  if (
    renderedKeys.length !== availableKeys.length
    || renderedKeys.some((key, index) => key !== availableKeys[index])
  ) {
    options.innerHTML = visibleOptions.map((option) => `
      <div class="mech-quirk-filter-row" data-mech-quirk-filter-row="${escapeHtml(option.key)}">
        <button
          type="button"
          data-mech-quirk-filter="${escapeHtml(option.key)}"
          title="${escapeHtml(option.label)}"
        ><span class="${quirkToneClass(option)}">${escapeHtml(option.label)}</span></button>
        <label class="mech-quirk-filter-value-slot">
          <span class="sr-only">${escapeHtml(`${option.label} ${t("filters.minimumQuirkValue")}${option.unit ? ` (${option.unit})` : ""}`)}</span>
          <input
            type="number"
            min="0"
            step="any"
            inputmode="decimal"
            data-mech-quirk-filter-value="${escapeHtml(option.key)}"
          >
          ${option.unit ? `<span aria-hidden="true">${option.unit}</span>` : ""}
        </label>
      </div>
    `).join("");
  }
  options.querySelectorAll("[data-mech-quirk-filter-row]").forEach((row) => {
    const key = row.dataset.mechQuirkFilterRow;
    const button = row.querySelector("[data-mech-quirk-filter]");
    const input = row.querySelector("[data-mech-quirk-filter-value]");
    const active = state.mechQuirkFilterSelections.has(key);
    const minimum = state.mechQuirkFilterSelections.get(key);
    row.classList.toggle("active", active);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    if (document.activeElement !== input) {
      input.value = minimum === null || minimum === undefined ? "" : String(minimum);
    }
  });
}

function renderMechFilterControls() {
  const overlayOpen = !$("mech-filter-overlay").hidden;
  const weightFilterActive = state.mechFilterWeightClasses.size > 0
    && state.mechFilterWeightClasses.size < 4;
  const filterActive = Boolean(state.mechFilterFaction)
    || weightFilterActive
    || !state.mechFilterAllTypes
    || MECH_HARDPOINT_FILTER_ORDER.some((type) => state.mechHardpointFilters[type].enabled)
    || state.mechSpecialTraitSelections.size > 0
    || state.mechSpecialEquipmentSelections.size > 0
    || state.mechQuirkFilterSelections.size > 0;
  document.querySelectorAll("[data-open-mech-filter]").forEach((button) => {
    button.classList.toggle("active", filterActive);
    button.setAttribute("aria-expanded", String(overlayOpen));
    button.setAttribute("aria-pressed", String(filterActive));
  });
  document.querySelectorAll("[data-mech-filter-faction]").forEach((button) => {
    const active = button.dataset.mechFilterFaction === state.mechFilterFaction;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mech-filter-weight]").forEach((button) => {
    const active = state.mechFilterWeightClasses.has(button.dataset.mechFilterWeight);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mech-filter-type]").forEach((button) => {
    const type = button.dataset.mechFilterType;
    const active = type === "all"
      ? state.mechFilterAllTypes
      : state.mechFilterTypeCategories.has(type);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const specialOptions = $("mech-filter-special-options");
  const renderedSpecialTypes = Array.from(
    specialOptions.querySelectorAll("[data-mech-filter-special-type]"),
    (button) => button.dataset.mechFilterSpecialType,
  );
  const renderedSpecialAll = specialOptions.querySelector("[data-mech-filter-special-all]");
  const availableSpecialTypes = state.mechSpecialTypeOptions.map((option) => option.key);
  if (
    !renderedSpecialAll
    || renderedSpecialTypes.length !== availableSpecialTypes.length
    || renderedSpecialTypes.some((type, index) => type !== availableSpecialTypes[index])
  ) {
    specialOptions.innerHTML = `
      <button type="button" data-mech-filter-special-all>${t("filters.all")}</button>
      ${state.mechSpecialTypeOptions.map((option) => `
        <button type="button" data-mech-filter-special-type="${escapeHtml(option.key)}">${escapeHtml(option.label)}</button>
      `).join("")}
    `;
  }
  const specialEnabled = !state.mechFilterAllTypes
    && state.mechFilterTypeCategories.has("special");
  const allSpecialTypesSelected = availableSpecialTypes.length > 0
    && availableSpecialTypes.every((type) => state.mechFilterSpecialTypes.has(type));
  const specialAll = specialOptions.querySelector("[data-mech-filter-special-all]");
  specialAll.classList.toggle("active", allSpecialTypesSelected);
  specialAll.setAttribute("aria-pressed", String(allSpecialTypesSelected));
  specialAll.disabled = !specialEnabled;
  specialOptions.querySelectorAll("[data-mech-filter-special-type]").forEach((button) => {
    const active = state.mechFilterSpecialTypes.has(button.dataset.mechFilterSpecialType);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = !specialEnabled;
  });
  renderMechHardpointFilterControls();
  renderMechFilterTabs();
  renderMechSpecialFeatureControls();
  renderMechQuirkFilterControls();
}

function renderMechSortControls() {
  document.querySelectorAll("[data-open-mech-sort]").forEach((button) => {
    const customized = state.mechSort !== "default"
      || state.mechSortDirection !== "asc"
      || !state.mechSortGroupFaction;
    button.classList.toggle("active", customized);
  });
  document.querySelectorAll("[data-mech-sort-key]").forEach((button) => {
    const active = button.dataset.mechSortKey === state.mechSort;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mech-sort-direction]").forEach((button) => {
    const active = button.dataset.mechSortDirection === state.mechSortDirection;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mech-sort-faction]").forEach((button) => {
    button.classList.toggle("active", state.mechSortGroupFaction);
    button.setAttribute("aria-checked", String(state.mechSortGroupFaction));
  });
}

function openMechSortDialog(trigger) {
  mechSortTrigger = trigger || document.activeElement;
  $("mech-sort-overlay").hidden = false;
  document.body.classList.add("mech-sort-open");
  document.querySelectorAll("[data-open-mech-sort]").forEach((button) => {
    button.setAttribute("aria-expanded", String(button === mechSortTrigger));
  });
  renderMechSortControls();
  requestAnimationFrame(() => {
    $("mech-sort-overlay").querySelector("[data-mech-sort-key].active")?.focus();
  });
}

function closeMechSortDialog() {
  if ($("mech-sort-overlay").hidden) return;
  $("mech-sort-overlay").hidden = true;
  document.body.classList.remove("mech-sort-open");
  document.querySelectorAll("[data-open-mech-sort]").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
  mechSortTrigger?.focus();
  mechSortTrigger = null;
}

function renderChassisSections(chassisGroups, activeChassis, large, compactActions = false) {
  if (state.mechSortGroupFaction) {
    return factionSectionsForChassisGroups(chassisGroups)
      .map((section) => renderFactionSection(section, activeChassis, large, compactActions))
      .join("");
  }
  const listClass = large ? "chassis-list large-chassis-list" : "chassis-list";
  return `<div class="${listClass} ungrouped-chassis-list">${chassisGroups
    .map((group) => large
      ? renderLargeChassisGroup(group, activeChassis)
      : renderSmallChassisGroup(group, activeChassis, compactActions))
    .join("")}</div>`;
}

function renderMechlabCompactList() {
  const panel = $("mechlab-compact-list-panel");
  const summary = $("mech-summary-panel");
  const showButton = $("show-mech-list");
  if (!panel || !summary || !showButton) return;
  const open = state.activeMainTab === "mechlab"
    && Boolean(state.selectedMech)
    && !state.mechlabBrowseMode
    && state.mechlabCompactListOpen;
  panel.hidden = !open;
  summary.hidden = open;
  showButton.hidden = state.activeMainTab !== "mechlab"
    || !state.selectedMech
    || state.mechlabBrowseMode
    || open;
  if (!open) return;

  const filtered = filteredMechsForCompactList();
  const list = $("mechlab-compact-list");
  if (!filtered.length) {
    list.innerHTML = `<div class="empty">${t("list.noMechs")}</div>`;
    return;
  }
  const grouped = groupMechsForList(filtered);
  const activeChassis = activeChassisForList();
  list.innerHTML = sortedClassNames(grouped)
    .map((weightClass) => {
      const chassisGroups = chassisGroupsForWeight(grouped, weightClass);
      return `
        <section class="class-section compact-class-section">
          <div class="class-heading"><strong>${WEIGHT_CLASS_LABELS[weightClass] || formatChassisName(weightClass)}</strong></div>
          ${renderChassisSections(chassisGroups, activeChassis, false, true)}
        </section>
      `;
    })
    .join("");
}

function renderMechList() {
  renderMechFilterControls();
  renderMechSortControls();
  const filtered = filteredMechsForList();
  const grouped = groupMechsForList(filtered);
  const activeChassis = activeChassisForList();
  const classNames = sortedClassNames(grouped);

  const layout = $("mech-browser-layout");
  const list = $("mech-list");
  const toggle = $("mech-list-view-toggle");
  const toolbarImport = $("mech-toolbar-import");
  const toolbarCommunity = $("mech-toolbar-community");
  const toolbarReturn = $("mech-toolbar-return");
  const isMechlab = state.activeMainTab === "mechlab";
  const mechlabBrowsing = isMechlab && state.mechlabBrowseMode;
  const mechlabFocused = isMechlab && !state.mechlabBrowseMode;
  const useLargeList = mechlabBrowsing || state.largeMechList;
  layout.classList.toggle("mechlab-browse-layout", mechlabBrowsing);
  layout.classList.toggle("mechlab-focused-layout", mechlabFocused);
  layout.classList.toggle("large-mech-list-layout", state.largeMechList && !isMechlab);
  list.classList.toggle("mech-list-large", useLargeList);
  renderMechBrowserPreview();
  if (toggle) {
    toggle.hidden = isMechlab;
    toggle.classList.toggle("active", state.largeMechList);
    toggle.setAttribute("aria-pressed", String(state.largeMechList));
    toggle.textContent = state.largeMechList ? "<<" : ">>";
    toggle.title = state.largeMechList ? t("list.smallView") : t("list.largeView");
  }
  if (toolbarImport) toolbarImport.hidden = !isMechlab;
  if (toolbarCommunity) toolbarCommunity.hidden = !mechlabBrowsing;
  if (toolbarReturn) toolbarReturn.hidden = !(mechlabBrowsing && activeMechlabTab());
  renderMechlabCompactList();

  if (!filtered.length) {
    $("mech-list").innerHTML = `<div class="empty">${t("list.noMechs")}</div>`;
    return;
  }

  if (useLargeList) {
    renderLargeMechList(classNames, grouped, activeChassis);
    return;
  }

  $("mech-list").innerHTML = classNames
    .map((weightClass) => {
      const chassisGroups = chassisGroupsForWeight(grouped, weightClass);
      const count = chassisGroups.reduce((sum, group) => sum + group.variants.length, 0);
      return `
        <section class="class-section">
          <div class="class-heading">
            <strong>${WEIGHT_CLASS_LABELS[weightClass] || formatChassisName(weightClass)}</strong>
            <span>${t("list.chassisVariants", { chassis: chassisGroups.length, variants: count })}</span>
          </div>
          ${renderChassisSections(chassisGroups, activeChassis, false)}
        </section>
      `;
    })
    .join("");
}

function rememberMechListScroll() {
  const layout = $("mech-browser-layout");
  if (layout?.hidden || (state.activeMainTab === "mechlab" && !state.mechlabBrowseMode)) return;
  const list = $("mech-list");
  if (list) state.mechListScrollTop = list.scrollTop;
}

function restoreMechListScroll() {
  const list = $("mech-list");
  if (list) list.scrollTop = state.mechListScrollTop;
}

function installedMechItems(itemType) {
  if (!state.selectedMech || !state.currentBuild) return [];
  const definition = effectiveDefinition(state.selectedMech, state.currentBuild);
  const items = [];
  for (const component of COMPONENT_ORDER) {
    const fixedIds = definition.components?.[component]?.fixed || [];
    const installedIds = (state.currentBuild.components?.[component]?.items || [])
      .map((entry) => entry.item_id);
    [...fixedIds, ...installedIds].forEach((itemId) => {
      const item = itemById(itemId);
      if (item?.item_type === itemType) items.push(item);
    });
  }
  return items;
}

function mechSummarySection(title, rows, className = "", headerAction = "") {
  return `
    <section class="mech-summary-section ${className}">
      <div class="mech-summary-section-heading">
        <h3>${title}</h3>
        ${headerAction}
      </div>
      <div class="mech-summary-metrics">
        ${rows.map(([label, value, tone = "", tooltip = ""]) => `
          <div class="mech-summary-metric ${tone}"${tooltip ? ` title="${escapeHtml(tooltip)}"` : ""}>
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function ammoGroupWeaponLabel(weapons) {
  const counts = new Map();
  weapons.forEach((weapon) => {
    const label = String(weapon.item.display_name || weapon.item.name || "WEAPON").toUpperCase();
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts, ([label, count]) => `${label}${count > 1 ? ` ×${count}` : ""}`).join(" + ");
}

function mechSummaryAmmoGroups(weapons) {
  const groups = new Map();
  const quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild);
  weapons.forEach((weapon) => {
    const ammoType = activeWeaponAmmoType(weapon.item);
    const key = normalizeLookupKey(ammoType);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, { key, weapons: [], rounds: 0 });
    groups.get(key).weapons.push(weapon);
  });
  installedMechItems("ammo").forEach((ammo) => {
    const key = normalizeLookupKey(ammo.stats?.type || ammo.name);
    if (groups.has(key)) groups.get(key).rounds += effectiveAmmoShots(ammo, quirks);
  });
  return Array.from(groups.values())
    .map((group) => {
      const roundsPerVolley = group.weapons.reduce(
        (sum, weapon) => sum + weaponAmmoPerTrigger(weapon.item),
        0,
      );
      const volleys = roundsPerVolley > 0 ? Math.floor(group.rounds / roundsPerVolley) : 0;
      const volleyDamage = group.weapons.reduce((sum, weapon) => sum + number(weapon.damage), 0);
      return {
        ...group,
        label: ammoGroupWeaponLabel(group.weapons),
        volleys,
        totalDamage: volleys * volleyDamage,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, undefined, { numeric: true }));
}

function renderMechSummaryAmmo(weapons) {
  const groups = mechSummaryAmmoGroups(weapons);
  if (!groups.length) return "";
  return `
    <section class="mech-summary-section mech-summary-ammo-section">
      <h3>AMMO</h3>
      <div class="mech-summary-ammo-head"><span>WEAPON</span><span>AMMO</span><span>VOLLEYS</span><span>DMG</span></div>
      <div class="mech-summary-ammo-rows">
        ${groups.map((group) => `
          <div class="mech-summary-ammo-row">
            <strong title="${escapeHtml(group.label)}">${escapeHtml(group.label)}</strong>
            <span>${fmt(group.rounds, 0)}</span>
            <span>${fmt(group.volleys, 0)}</span>
            <span>${fmt(group.totalDamage, 0)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMechSummaryQuirkRows(entries, showSources = true) {
  const ammoActive = state.simplifyAmmoQuirks && entries.some(isAmmoQuirk);
  const visibleEntries = ammoActive
    ? entries.filter((quirk) => !isAmmoQuirk(quirk))
    : entries;
  const rows = sortQuirksForDisplay(visibleEntries).map((quirk) => `
    <div class="mech-summary-quirk ${quirkToneClass(quirk)}${quirk.inactive ? " inactive" : ""}"${showSources ? ` title="${escapeHtml(quirk.source_text || quirk.name)}"` : ""}>
      <span>${escapeHtml(quirk.display_name)}</span>
      <strong>${escapeHtml(quirk.value_text)}</strong>
    </div>
  `);
  if (ammoActive) {
    rows.push(`
      <div class="mech-summary-quirk mech-summary-ammo-quirks-active">
        <span>${t("ui.ammoQuirksActive")}</span>
      </div>
    `);
  }
  return rows.join("");
}

function renderMechSummaryQuirks(
  quirks,
  mech = state.selectedMech,
  build = state.currentBuild,
) {
  const renderSection = (title, entries, showEmpty = false) => entries.length || showEmpty ? `
    <section class="mech-summary-section mech-summary-quirks-section">
      <h3>${title}</h3>
      <div class="mech-summary-quirks">
        ${entries.length ? renderMechSummaryQuirkRows(entries) : '<div class="empty">No quirks</div>'}
      </div>
    </section>
  ` : "";

  if (hasFixedOmnipods(mech)) {
    const groups = omnipodDisplayQuirkGroups(quirks, mech, build);
    return [
      renderSection("CT - FIXED QUIRKS", groups.fixedCt, true),
      renderSection("QUIRKS", groups.regular, true),
      renderSection("SO6", groups.so6),
      renderSection("SO8", groups.so8, true),
      renderSection("AMMO", groups.ammo),
    ].join("");
  }

  const displayQuirks = partitionDisplayQuirks(quirks);
  return `${renderSection("QUIRKS", displayQuirks.regular, true)}${renderSection(t("info.ammoQuirks"), displayQuirks.ammo)}`;
}

function renderMechSummarySkillQuirks(quirks) {
  if (state.selectedSkillGroups.size === 0) return "";
  return `
    <section class="mech-summary-section mech-summary-quirks-section mech-summary-skill-quirks-section">
      <h3>SKILL + QUIRKS</h3>
      <div class="mech-summary-quirks">
        ${renderMechSummaryQuirkRows(quirks, false)}
      </div>
    </section>
  `;
}

function renderMechBrowserHardpoints(mech, build) {
  const definition = effectiveDefinition(mech, build);
  const hardpointOrder = ["energy", "missile", "ballistic", "ams"];
  const previewLabels = {
    energy: "ENERGY",
    missile: "MISSILE",
    ballistic: "BALLISTIC",
    ams: "AMS",
  };
  const totals = hardpointCountsFromDefinition(definition);
  const maxJumpJets = maximumJumpJets(mech, build);
  const stats = currentDefinition(mech).stats || {};
  const canEquipMasc = number(stats.CanEquipMASC) > 0 || number(stats.CanEquipMasc) > 0;
  const legend = hardpointOrder
    .filter((type) => number(totals[type]) > 0)
    .map((type) => mechSlotBadge(
      type,
      HARDPOINT_LABELS[type] || type[0].toUpperCase(),
      totals[type],
    ))
    .join("");
  const specialTags = [];
  if (number(totals.ecm) > 0) {
    specialTags.push(mechSlotBadge("ecm", "ECM", totals.ecm));
  }
  if (maxJumpJets > 0) {
    specialTags.push(mechSlotBadge("jumpjet", "JJ", maxJumpJets));
  }
  if (canEquipMasc) {
    specialTags.push(mechSlotBadge("masc", "MASC"));
  }
  const locations = INFO_COMPONENTS.map((location) => {
    const counts = hardpointCountsFromHardpoints(
      definition.components?.[location.key]?.hardpoints || [],
    );
    const hardpoints = hardpointOrder
      .filter((type) => number(counts[type]) > 0)
      .map((type) => `
        <span class="mech-browser-hardpoint-callout ${type}" aria-label="${previewLabels[type]} ${number(counts[type])}">${number(counts[type])}</span>
      `)
      .join("");
    return `
      <section class="mech-browser-hardpoint-location location-${location.key}" title="${escapeHtml(location.label)}">
        <div class="mech-browser-hardpoint-values">${hardpoints}</div>
      </section>
    `;
  }).join("");
  return `
    <div class="mech-browser-hardpoint-visual">
      <div class="mech-browser-hardpoint-legend mech-slot-tags">${legend}${specialTags.join("")}</div>
      <div class="mech-browser-hardpoint-map">
        <div class="mech-browser-hardpoint-orientation" aria-hidden="true"><span>R</span><span>L</span></div>
        ${locations}
      </div>
    </div>
  `;
}

function renderMechBrowserPreview() {
  const panel = $("mech-browser-preview");
  const content = $("mech-browser-preview-content");
  if (!panel || !content) return;

  const visible = state.activeMainTab === "mechlab" && state.mechlabBrowseMode;
  panel.hidden = !visible;
  if (!visible) {
    state.mechBrowserHoverMechId = null;
    return;
  }

  const mech = mechById(state.mechBrowserHoverMechId)
    || mechById(state.mechlabBrowseSelectionId)
    || state.selectedMech;
  if (!mech) {
    content.innerHTML = `<div class="empty mech-browser-preview-empty">${t("info.selectMechHint")}</div>`;
    return;
  }

  const data = infoDataForMech(mech, true);
  const movement = data.movement;
  const stats = data.stats || {};
  content.innerHTML = `
    <header class="mech-browser-preview-header">
      <div>
        <span>${factionLabel(mech.faction)} · ${WEIGHT_CLASS_LABELS[mech.weight_class] || mech.weight_class || t("common.unknown")} · ${stats.MaxTons || "?"}t</span>
        <h2>${omnipodIcon(mech)}${escapeHtml(mech.display_name || variantCode(mech))}</h2>
      </div>
    </header>
    <section class="mech-browser-preview-section mech-browser-hardpoint-section">
      <h3>${t("stats.hardpoints")}</h3>
      ${renderMechBrowserHardpoints(mech, data.build)}
    </section>
    <div class="mech-browser-preview-fit-row">
      <button class="fit-mech-button" type="button" data-fit-browser-mech="${mech.id}">${t("stats.fit")}</button>
    </div>
    ${mechSummarySection(t("info.durability"), [
      [t("info.maxArmorTotal"), specValue(data.armorBaseTotal, data.armorTotal, 0, "", true)],
      [t("info.structureTotal"), specValue(data.structureBaseTotal, data.structureTotal, 0, "", true)],
    ], "mech-browser-preview-durability")}
    ${mechSummarySection(t("info.engine"), [
      [t("info.minEngine"), formatInfoNumber(number(stats.MinEngineRating), 0)],
      [t("info.maxEngine"), formatInfoNumber(number(stats.MaxEngineRating), 0)],
    ], "mech-browser-preview-engine")}
    ${mechSummarySection(t("info.mobility"), [
      [t("info.maxSpeed"), specMobilityValue(movement.baseMaxSpeed, movement.maxSpeed, 1, " kph", true), "full-row"],
      [t("info.acceleration"), specMobilityValue(movement.baseAcceleration, movement.acceleration, 1, " kph/s", true)],
      [t("info.deceleration"), specMobilityValue(movement.baseDeceleration, movement.deceleration, 1, " kph/s", true)],
      [t("info.turnSpeed"), specMobilityValue(movement.baseTurnSpeed, movement.turnSpeed, 2, " °/s", true)],
      [t("info.torsoSpeed"), specMobilityValue(movement.baseTorsoSpeed, movement.torsoSpeed, 1, " °/s", true)],
      [t("info.angleX"), specAnglePair(movement.baseAngleX[0], movement.angleX[0], movement.angleX[1], "X", 1, true)],
      [t("info.angleY"), specAnglePair(movement.baseAngleY[0], movement.angleY[0], movement.angleY[1], "Y", 1, true)],
    ], "mech-browser-preview-mobility")}
    <div class="mech-browser-preview-quirks">
      ${renderMechSummaryQuirks(data.quirks, mech, data.build)}
    </div>
  `;
}

function setMechBrowserPreviewHover(mechId = null) {
  const nextId = mechById(mechId) ? String(mechId) : null;
  if (state.mechBrowserHoverMechId === nextId) return;
  state.mechBrowserHoverMechId = nextId;
  renderMechBrowserPreview();
}

function mechSummaryWeaponMetrics(weapons, firepower, heatSystem) {
  const alphaHeat = weapons.reduce((sum, weapon) => sum + number(weapon.heat), 0);
  const dps = weapons.reduce(
    (sum, weapon) => sum + number(weapon.damage) / Math.max(0.016, number(weapon.cycle, 0.016)),
    0,
  );
  const hps = weapons.reduce(
    (sum, weapon) => sum + simulationWeaponHeatPerSecond(weapon),
    0,
  );
  const coolingRate = Math.max(0, number(heatSystem?.coolingRate));
  const maxHeat = Math.max(0, number(heatSystem?.maxHeat));
  const alphaCycle = weapons.reduce((longest, weapon) => Math.max(longest, number(weapon.cycle)), 0);
  const coolingBetweenAlphas = coolingRate * alphaCycle;
  const heatPercents = (shotHeat) => {
    let accumulatedHeat = 0;
    return Array.from({ length: 4 }, () => {
      accumulatedHeat = Math.max(0, accumulatedHeat - coolingBetweenAlphas) + shotHeat;
      return maxHeat > 0 ? accumulatedHeat / maxHeat * 100 : 0;
    });
  };
  const alphaHeatPercents = heatPercents(alphaHeat);
  const ghostHeat = ghostHeatForSimulationWeapons(weapons);
  return {
    alphaHeat,
    alphaHeatPercents,
    ghostAlphaHeatPercents: ghostHeat > 0 ? heatPercents(alphaHeat + ghostHeat) : null,
    ato: alphasToOverheat(maxHeat, alphaHeat, coolingRate, alphaCycle),
    ghostAto: ghostHeat > 0 ? alphasToOverheat(maxHeat, alphaHeat + ghostHeat, coolingRate, alphaCycle) : null,
    dps,
    hps,
    dph: alphaHeat > 0 ? number(firepower) / alphaHeat : null,
    heatEfficiency: hps <= coolingRate + 0.0001
      ? 100
      : Math.max(0, Math.min(100, coolingRate / hps * 100)),
    alphaHeatRecovery: coolingRate > 0 ? alphaHeat / coolingRate : null,
    alphaHeatPercent: maxHeat > 0 ? alphaHeat / maxHeat * 100 : 0,
  };
}

function mechSummaryAlphaHeatRows(metrics) {
  const row = (label, percents, tooltipKey) => [label, percents.map((percent, index) => {
    const level = percent <= 25 ? 1 : percent <= 50 ? 2 : percent <= 75 ? 3 : percent <= 100 ? 4 : 5;
    return `<span class="alpha-heat-level-${level}" title="${escapeHtml(`${t("alphaHeat.shot", { n: index + 1 })}: ${t(`${tooltipKey}.${index === 0 ? "first" : "next"}`)}`)}">${fmt(percent, 0)}%</span>`;
  }).join(""), "mech-summary-alpha-heat", t(tooltipKey)];
  return [
    row("ALPHA HEAT", metrics.alphaHeatPercents, "alphaHeat.normal"),
    ...(metrics.ghostAlphaHeatPercents ? [row("GHOST ALPHA HEAT", metrics.ghostAlphaHeatPercents, "alphaHeat.ghost")] : []),
  ];
}

function renderMechSummaryAlphaHeat(metrics) {
  const formatAto = (value) => value == null ? "-" : Number.isFinite(value) ? fmt(value, 2) : "∞";
  const headings = ["1ST", "2ND", "3RD", "4TH"].map((label, index) => (
    `<span title="${escapeHtml(t("alphaHeat.shot", { n: index + 1 }))}">${label}</span>`
  )).join("");
  return mechSummarySection("ALPHA HEAT", [
    ["", headings, "mech-summary-alpha-heat mech-summary-alpha-header"],
    ...mechSummaryAlphaHeatRows(metrics),
    ["ATO", formatAto(metrics.ato), "mech-summary-alpha-heat mech-summary-ato", t("alphaHeat.ato")],
    ...(metrics.ghostAlphaHeatPercents
      ? [["GHOST ATO", formatAto(metrics.ghostAto), "mech-summary-alpha-heat mech-summary-ato", t("alphaHeat.ghostAto")]]
      : []),
  ], "mech-summary-alpha-section");
}

function renderMechSummary(calc = null) {
  const mech = state.selectedMech;
  if (!mech || !calc) {
    $("mech-summary-content").innerHTML = "";
    return;
  }

  const baseQuirks = effectiveQuirks(mech, state.currentBuild);
  const quirks = mechlabEffectiveQuirks(mech, state.currentBuild);
  const quirkValues = mechlabQuirkValues(mech, state.currentBuild);
  const weapons = collectSimulationWeapons();
  const heatSink = simulationHeatSinkItem();
  const heatSystem = simulationHeatSystemFromSink(
    heatSink,
    calc.totalHeatSinkCount,
    quirkIncrease(quirks, "heatdissipation_multiplier"),
    quirkIncrease(quirks, "maxheat_multiplier"),
  );
  const weaponMetrics = mechSummaryWeaponMetrics(weapons, calc.alpha, heatSystem);
  const movement = movementInfo(quirkValues, mech);
  const speed = calc.engine
    ? engineTooltipMaxSpeed(calc.engine) * quirkMultiplier(quirkValues, ["mechtopspeed_multiplier"])
    : 0;
  const currentArmor = currentBuildArmorTotal(quirkValues, mech, state.currentBuild);
  const maxArmor = armorInfoRows(quirkValues, mech).reduce((sum, row) => sum + number(row.total), 0);
  const structure = structureInfoRows(quirkValues, mech).reduce((sum, row) => sum + number(row.total), 0);
  const jumpJets = installedMechItems("jumpjet");
  const jumpJetCount = jumpJets.length;
  const maxJumpJets = maximumJumpJets(mech, state.currentBuild);
  const mechMaxTons = Math.max(1, number(currentDefinition(mech).stats?.MaxTons, 1));
  const finalJumpJetHeight = jumpJetHeight(jumpJets, mechMaxTons, quirks);
  const sensorRange = mechSensorRange(quirks, mech, state.currentBuild);
  const tonsOver = calc.totalTons > calc.maxTons + 0.0001;
  const slotsOver = calc.currentSlotUsage > calc.totalSlotCapacity;

  $("mech-summary-content").innerHTML = `
    <div class="mech-summary-limits">
      <div class="mech-summary-limit ${tonsOver ? "over-limit" : ""}"><span>TONNAGE</span><strong>${fmt(calc.totalTons)} <small>/ ${fmt(calc.maxTons)}</small></strong></div>
      <div class="mech-summary-limit ${slotsOver ? "over-limit" : ""}"><span>SLOTS</span><strong>${fmt(calc.currentSlotUsage, 0)} <small>/ ${fmt(calc.totalSlotCapacity, 0)}</small></strong></div>
    </div>
    ${mechSummarySection("GENERAL", [
      ["SPEED", `${fmt(speed)} kph`],
      ["TURN SPEED", `${fmt(movement.turnSpeed)}°/s`],
      ["ACCELERATION", fmt(movement.acceleration)],
      ["DECELERATION", fmt(movement.deceleration)],
      ["ARMOR", `${fmt(currentArmor, 0)} / ${fmt(maxArmor, 0)}`],
      ["STRUCTURE", fmt(structure, 0)],
      ["SENSOR", `${fmt(sensorRange, 0)}m`],
      ["JUMP JETS", `${jumpJetCount} / ${fmt(maxJumpJets, 0)} (${fmt(finalJumpJetHeight, 1)}m)`],
    ])}
    ${mechSummarySection("HEAT", [
      ["HEAT SINKS", fmt(calc.totalHeatSinkCount, 0)],
      ["HEAT CAPACITY", fmt(heatSystem.maxHeat)],
      ["DISSIPATION", `${fmt(heatSystem.coolingRate, 2)}/s`],
      ["HEAT EFFICIENCY", `${fmt(weaponMetrics.heatEfficiency, 1)}%`],
      ["ALPHA HEAT RECOVERY", weaponMetrics.alphaHeatRecovery === null ? "-" : `${fmt(weaponMetrics.alphaHeatRecovery, 2)}s`],
    ])}
    ${mechSummarySection("WEAPON", [
      ["FIREPOWER", fmt(calc.alpha, 2)],
      ["DPS", fmt(weaponMetrics.dps, 2)],
      ["DPH", weaponMetrics.dph === null ? "-" : fmt(weaponMetrics.dph, 2)],
      ["HPS", fmt(weaponMetrics.hps, 2)],
    ], "mech-summary-weapon-section", globalThis.__MWOLAB_MOBILE__ ? "" : `
      <button id="open-weapon-detail" class="mech-summary-detail-button" type="button" aria-haspopup="dialog" aria-controls="weapon-detail-overlay">${t("weaponDetail.open")}</button>
    `)}
    ${renderMechSummaryAlphaHeat(weaponMetrics)}
    ${renderMechSummaryAmmo(weapons)}
    ${renderMechSummarySkillQuirks(quirks)}
    ${renderMechSummaryQuirks(baseQuirks)}
  `;
}

function renderMechlabActionPanel() {
  const skillsActive = state.selectedSkillGroups.size > 0;
  return `
    <section class="mechlab-action-panel" aria-label="MechLab actions">
      <div class="community-menu" data-community-ui-entry>
        <button class="community-menu-trigger" type="button" data-community-menu-trigger aria-haspopup="menu" aria-expanded="false"><span>${t("community.actions")}</span><span aria-hidden="true">▾</span></button>
        <div class="community-menu-popover" role="menu" hidden>
          <button type="button" role="menuitem" data-community-open="browse">${t("community.browse")}</button>
          <button type="button" role="menuitem" data-community-open="save">${t("community.publish")}</button>
        </div>
      </div>
      <button id="open-simulation" class="simulation-open-button" type="button" data-mechlab-action="simulation">${t("simulation.open")}</button>
      <button id="open-skills" class="skill-apply-button${skillsActive ? " active" : ""}" type="button" data-mechlab-action="skills" aria-pressed="${skillsActive}">${t("skills.open")}</button>
      <button id="open-build-actions" class="mechlab-tool-button" type="button" data-mechlab-action="tools">${t("mechlab.tools")}</button>
      <div class="loadout-code-actions">
        <button id="import-loadout-code" type="button" data-mechlab-action="import">${t("loadout.import")}</button>
        <button id="export-loadout-code" type="button" data-mechlab-action="export">${t("loadout.export")}</button>
      </div>
    </section>
  `;
}

function simulationItemKeys(item) {
  return new Set([
    item?.name,
    item?.display_name,
    item?.source_display_name,
    ...String(item?.aliases || "").split(","),
  ].map(normalizeLookupKey).filter(Boolean));
}

function isRocketLauncher(item) {
  return simulationItemKeys(item).has("rocketlauncher");
}

function isContinuousPerSecondWeapon(item) {
  const keys = simulationItemKeys(item);
  return keys.has("machinegun")
    || keys.has("ismachinegun")
    || keys.has("clanmachinegun")
    || keys.has("rotaryautocannon")
    || keys.has("clanbeamlaser")
    || keys.has("flamer");
}

function isSimulationContinuousDamagePerSecondWeapon(item) {
  return Array.from(simulationItemKeys(item))
    .some((key) => key.includes("beamlaser") || key.includes("flamer"));
}

function simulationSpecificQuirkMatchesItem(prefix, item) {
  const keys = simulationItemKeys(item);
  if (keys.has(prefix)) return true;
  return isAmsWeapon(item)
    && prefix.endsWith("antimissilesystem")
    && Array.from(keys).some((key) => key.endsWith(prefix));
}

function directWeaponQuirkNamesForSuffix(suffix) {
  if (suffix === "_cooldown_multiplier") return DIRECT_COOLDOWN_QUIRKS;
  if (suffix === "_heat_multiplier") return DIRECT_HEAT_QUIRKS;
  if (suffix === "_duration_multiplier") return DIRECT_DURATION_QUIRKS;
  if (suffix === "_range_multiplier") return DIRECT_RANGE_QUIRKS;
  if (suffix === "_velocity_multiplier") return DIRECT_VELOCITY_QUIRKS;
  if (suffix === "_spread_multiplier") return DIRECT_SPREAD_QUIRKS;
  return null;
}

function directionalQuirkValue(quirk, direction = "reduction") {
  const value = number(quirk?.value);
  if (direction === "signed") return value;
  return direction === "reduction" ? Math.max(0, -value) : Math.max(0, value);
}

function simulationSpecificQuirkValue(quirk, item, suffix, direction = "reduction") {
  const name = String(quirk?.name || "").toLowerCase();
  if (!name.endsWith(suffix)) return 0;
  if (directWeaponQuirkNamesForSuffix(suffix)?.has(name)) return 0;
  if ([
    "_cooldown_multiplier",
    "_heat_multiplier",
    "_range_multiplier",
    "_velocity_multiplier",
    "_spread_multiplier",
  ].includes(suffix)
    && name === `${equipmentHardpointType(item)}${suffix}`) return 0;
  const prefix = normalizeLookupKey(name.slice(0, -suffix.length));
  if (!prefix || !simulationSpecificQuirkMatchesItem(prefix, item)) return 0;
  return directionalQuirkValue(quirk, direction);
}

function simulationSpecificQuirkTotal(quirks, item, suffix, direction = "reduction") {
  return quirks.reduce(
    (sum, quirk) => sum + simulationSpecificQuirkValue(quirk, item, suffix, direction),
    0,
  );
}

const normalizedQuirkEntriesCache = new WeakMap();

function normalizedQuirkEntries(quirks = []) {
  if (Array.isArray(quirks) && normalizedQuirkEntriesCache.has(quirks)) {
    return normalizedQuirkEntriesCache.get(quirks);
  }
  const normalizedQuirksByName = new Map();
  for (const quirk of quirks) {
    const name = String(quirk?.name || "").toLowerCase();
    if (!name) continue;
    if (!normalizedQuirksByName.has(name)) {
      normalizedQuirksByName.set(name, {
        ...quirk,
        name,
        value: 0,
        sources: new Set(),
        contributions: [],
      });
    }
    const entry = normalizedQuirksByName.get(name);
    entry.value += number(quirk.value);
    String(quirk.source_text || "").split(",").map((source) => source.trim()).filter(Boolean)
      .forEach((source) => entry.sources.add(source));
    Array.from(quirk.sources || []).forEach((source) => entry.sources.add(source));
    (quirk.contributions || []).forEach((contribution) => {
      entry.contributions.push(contribution);
      if (contribution.source) entry.sources.add(contribution.source);
    });
  }
  const normalizedQuirks = Array.from(normalizedQuirksByName.values()).map((quirk) => ({
    ...quirk,
    value_text: quirkValueText(quirk.name, quirk.value),
    source_text: Array.from(quirk.sources).join(", "),
  }));
  if (Array.isArray(quirks)) normalizedQuirkEntriesCache.set(quirks, normalizedQuirks);
  return normalizedQuirks;
}

const weaponQuirkEffectsCache = new WeakMap();

function collectWeaponQuirkEffects(item, quirks = []) {
  if (item && Array.isArray(quirks)) {
    const cachedByItem = weaponQuirkEffectsCache.get(quirks);
    const cached = cachedByItem?.get(item);
    if (cached) return cached;
  }

  const totals = {
    cooldownReduction: 0,
    durationModifier: 0,
    rofBonus: 0,
    heatReduction: 0,
    rangeBonus: 0,
    velocityBonus: 0,
    spreadModifier: 0,
    damageAdditive: 0,
    jamChanceReduction: 0,
    jamDurationReduction: 0,
    hslBonus: 0,
  };
  const normalizedQuirks = normalizedQuirkEntries(quirks);
  const appliedByName = new Map();
  const stats = item?.stats || {};
  const type = equipmentHardpointType(item);
  const continuousTiming = isSimulationContinuousDamagePerSecondWeapon(item);
  const usesRofTiming = number(stats.rof) > 0;
  const usesStandardTiming = !continuousTiming && !usesRofTiming;
  const hasRange = (item?.ranges || []).some((range) => number(range.start) > 0);
  const hasVelocity = number(stats.speed) > 0 && !isHitscanWeapon(item);
  const hasSpread = number(stats.spread) > 0;
  const ultraAutoCannon = isUltraAutoCannon(item);
  const hasGhostHeat = Boolean(ghostHeatGroupKey(item));

  const record = (quirk, effect, value, harmful = false) => {
    if (Math.abs(value) < 0.0001) return;
    const name = String(quirk?.name || "").toLowerCase();
    if (!name) return;
    if (!appliedByName.has(name)) {
      appliedByName.set(name, {
        ...quirk,
        name,
        effects: new Set(),
        effective_value: 0,
        harmful: false,
      });
    }
    const entry = appliedByName.get(name);
    entry.effects.add(effect);
    entry.effective_value += value;
    entry.harmful ||= harmful;
  };

  for (const quirk of normalizedQuirks) {
    const name = String(quirk?.name || "").toLowerCase();
    if (!name) continue;

    if (usesStandardTiming && !isRocketLauncher(item) && number(stats.cooldown) > 0) {
      let value = 0;
      if (name === "all_cooldown_multiplier" || name === `${type}_cooldown_multiplier`) {
        value += directionalQuirkValue(quirk, "reduction");
      }
      value += simulationSpecificQuirkValue(quirk, item, "_cooldown_multiplier", "reduction");
      totals.cooldownReduction += value;
      record(quirk, "cooldown", value);
    }

    if (usesStandardTiming && number(stats.duration) > 0) {
      let value = 0;
      if (name === "all_duration_multiplier" || (type === "energy" && name === "energy_duration_multiplier")) {
        value += directionalQuirkValue(quirk, "signed");
      }
      value += simulationSpecificQuirkValue(quirk, item, "_duration_multiplier", "signed");
      totals.durationModifier += value;
      record(quirk, "duration", value, value > 0);
    }

    if (usesRofTiming) {
      const value = simulationSpecificQuirkValue(quirk, item, "_rof_multiplier", "increase");
      totals.rofBonus += value;
      record(quirk, "rof", value);
    }

    let heatValue = 0;
    if (name === "all_heat_multiplier" || name === `${type}_heat_multiplier`) {
      heatValue += directionalQuirkValue(quirk, "reduction");
    }
    heatValue += simulationSpecificQuirkValue(quirk, item, "_heat_multiplier", "reduction");
    totals.heatReduction += heatValue;
    if (itemHeat(item) > 0) record(quirk, "heat", heatValue);

    let rangeValue = 0;
    if (name === "all_range_multiplier" || name === `${type}_range_multiplier`) {
      rangeValue += directionalQuirkValue(quirk, "increase");
    }
    rangeValue += simulationSpecificQuirkValue(quirk, item, "_range_multiplier", "increase");
    totals.rangeBonus += rangeValue;
    if (hasRange) record(quirk, "range", rangeValue);

    let velocityValue = 0;
    if (name === "all_velocity_multiplier" || name === `${type}_velocity_multiplier`) {
      velocityValue += directionalQuirkValue(quirk, "increase");
    }
    velocityValue += simulationSpecificQuirkValue(quirk, item, "_velocity_multiplier", "increase");
    totals.velocityBonus += velocityValue;
    if (hasVelocity) record(quirk, "velocity", velocityValue);

    let spreadValue = 0;
    if (name === "all_spread_multiplier" || name === `${type}_spread_multiplier`) {
      spreadValue += directionalQuirkValue(quirk, "signed");
    }
    spreadValue += simulationSpecificQuirkValue(quirk, item, "_spread_multiplier", "signed");
    totals.spreadModifier += spreadValue;
    if (hasSpread) record(quirk, "spread", spreadValue, spreadValue > 0);

    if (isAmsWeapon(item)) {
      const value = simulationSpecificQuirkValue(quirk, item, "_damage_additive", "increase");
      totals.damageAdditive += value;
      record(quirk, "damage", value);
    }

    if (ultraAutoCannon && number(stats.JammingChance) > 0) {
      let value = name === "all_jamchance_multiplier"
        ? directionalQuirkValue(quirk, "reduction")
        : 0;
      value += simulationSpecificQuirkValue(quirk, item, "_jamchance_multiplier", "reduction");
      totals.jamChanceReduction += value;
      record(quirk, "jamChance", value);
    }

    if (ultraAutoCannon && number(stats.JammedTime) > 0) {
      let value = name === "all_jamduration_multiplier"
        ? directionalQuirkValue(quirk, "reduction")
        : 0;
      value += simulationSpecificQuirkValue(quirk, item, "_jamduration_multiplier", "reduction");
      totals.jamDurationReduction += value;
      record(quirk, "jamDuration", value);
    }

    if (name.endsWith("_minheatpenaltylevel_additive")) {
      const suffix = "_minheatpenaltylevel_additive";
      const prefix = normalizeLookupKey(name.slice(0, -suffix.length));
      const matches = ["all", "weapon", "weapons"].includes(prefix)
        || prefix === normalizeLookupKey(type)
        || simulationSpecificQuirkMatchesItem(prefix, item);
      const value = matches ? Math.max(0, number(quirk.value)) : 0;
      totals.hslBonus += value;
      if (hasGhostHeat) record(quirk, "hsl", value);
    }
  }

  const result = {
    totals,
    applied: sortQuirksForDisplay(Array.from(appliedByName.values())).map((quirk) => ({
      ...quirk,
      effects: Array.from(quirk.effects),
    })),
  };
  if (item && Array.isArray(quirks)) {
    let cachedByItem = weaponQuirkEffectsCache.get(quirks);
    if (!cachedByItem) {
      cachedByItem = new WeakMap();
      weaponQuirkEffectsCache.set(quirks, cachedByItem);
    }
    cachedByItem.set(item, result);
  }
  return result;
}

function collectEquipmentQuirkEffects(item, quirks = []) {
  if (item?.item_type === "weapon") return collectWeaponQuirkEffects(item, quirks);

  const appliedByName = new Map();
  const normalizedQuirks = normalizedQuirkEntries(quirks);
  const stats = item?.stats || {};
  const record = (quirk, effect, value) => {
    if (Math.abs(value) < 0.0001) return;
    const name = String(quirk?.name || "").toLowerCase();
    if (!name) return;
    if (!appliedByName.has(name)) {
      appliedByName.set(name, {
        ...quirk,
        name,
        effects: new Set(),
        effective_value: 0,
        harmful: false,
      });
    }
    const entry = appliedByName.get(name);
    entry.effects.add(effect);
    entry.effective_value += value;
  };
  const recordExact = (name, effect, direction, active) => {
    if (!active) return;
    const quirk = normalizedQuirks.find((entry) => entry.name === name);
    if (!quirk) return;
    record(quirk, effect, directionalQuirkValue(quirk, direction));
  };

  if (item?.item_type === "ammo") {
    const ammoKey = ammoCapacityQuirkKey(item);
    const baseShots = Math.max(0, number(stats.numShots));
    const finalShots = effectiveAmmoShots(item, quirks);
    if (ammoKey && finalShots !== baseShots) {
      normalizedQuirks.forEach((quirk) => {
        const name = String(quirk.name || "");
        if (!name.startsWith("ammocapacity_") || !name.endsWith("_additive")) return;
        const prefix = normalizeLookupKey(
          name.slice("ammocapacity_".length, -"_additive".length),
        );
        if (prefix !== ammoKey) return;
        const value = number(quirk.value);
        record(quirk, "ammoCapacity", value);
        const applied = appliedByName.get(name);
        if (applied) {
          applied.display_value = value * Math.max(0, itemTons(item));
          applied.display_value_text = quirkValueText(name, applied.display_value);
        }
      });
    }
  } else if (String(item?.ctype || "") === "CHeatSinkStats") {
    recordExact(
      "maxheat_multiplier",
      "heatCapacity",
      "increase",
      Math.abs(number(stats.heatbase)) > 0,
    );
    recordExact(
      "heatdissipation_multiplier",
      "heatDissipation",
      "increase",
      number(stats.cooling) !== 0 || number(stats.engineCooling) !== 0,
    );
  } else if (item?.item_type === "engine") {
    recordExact(
      "mechtopspeed_multiplier",
      "maxSpeed",
      "signed",
      engineTooltipMaxSpeed(item) > 0,
    );
  } else if (item?.item_type === "jumpjet") {
    recordExact(
      "jumpjets_burntime_multiplier",
      "duration",
      "increase",
      number(stats.duration) !== 0,
    );
    recordExact(
      "jumpjets_initialthrust_multiplier",
      "initialThrust",
      "increase",
      number(stats.boost_instant) !== 0,
    );
  } else if (item?.item_type === "masc") {
    const movement = movementInfo(quirkValues(quirks));
    const engine = installedEngine();
    recordExact(
      "mechtopspeed_multiplier",
      "mascSpeed",
      "signed",
      number(stats.BoostSpeed) !== 0 && engine && engineTooltipMaxSpeed(engine) > 0,
    );
    ["mechacceleration_multiplier", "accellerp_all_multiplier"].forEach((name) => {
      recordExact(name, "mascAcceleration", "signed", number(stats.BoostAccel) !== 0 && movement.baseAcceleration !== 0);
    });
    ["mechdeceleration_multiplier", "decellerp_all_multiplier"].forEach((name) => {
      recordExact(name, "mascDeceleration", "signed", number(stats.BoostDecel) !== 0 && movement.baseDeceleration !== 0);
    });
    ["turnrate_multiplier", "turnlerp_all_multiplier"].forEach((name) => {
      recordExact(name, "mascTurn", "signed", number(stats.BoostTurn) !== 0 && movement.baseTurnSpeed !== 0);
    });
  } else if (isEcm(item)) {
    recordExact(
      "ecmtargetrangereduction_multiplier",
      "ecmTargetRangeReduction",
      "increase",
      true,
    );
    recordExact(
      "stealtharmorcooldown_multiplier",
      "stealthArmorCooldown",
      "reduction",
      true,
    );
  }

  return {
    applied: sortQuirksForDisplay(Array.from(appliedByName.values())).map((quirk) => ({
      ...quirk,
      effects: Array.from(quirk.effects),
    })),
  };
}

function targetComputerFilterMatchesWeapon(filter, item) {
  const weaponKey = normalizeLookupKey(item?.name);
  return weaponKey && (filter?.compatible_weapons || [])
    .some((name) => normalizeLookupKey(name) === weaponKey);
}

function targetComputerEffectScope(module, filter) {
  const tag = String(filter?.tag || "WEAPONS");
  if (isAdvancedSensorPackage(module) && tag.toLowerCase() === "beamweapons") return "TAG";
  return tag.replace(/Weapons$/i, "").toUpperCase();
}

function weaponFilterFunctionMode(filter) {
  const stats = filter?.weapon_stats || [];
  const hasPositivePelletAddition = stats.some((entry) => (
    String(entry.operation || "") === "+"
    && entry.numPerShot !== undefined
    && number(entry.numPerShot) > 0
  ));
  const hasReducedPelletDamage = stats.some((entry) => (
    String(entry.operation || "") === "*"
    && entry.damage !== undefined
    && number(entry.damage) > 0
    && number(entry.damage) < 1
  ));
  if (hasPositivePelletAddition && hasReducedPelletDamage) return "shotgun";

  const hasFiringCountReduction = stats.some((entry) => (
    String(entry.operation || "") === "+"
    && entry.numFiring !== undefined
    && number(entry.numFiring) < 0
  ));
  const hasIncreasedProjectileDamage = stats.some((entry) => (
    String(entry.operation || "") === "*"
    && entry.damage !== undefined
    && number(entry.damage) > 1
  ));
  if (hasFiringCountReduction && hasIncreasedProjectileDamage) return "single-projectile";

  const hasVolleyDelayAddition = stats.some((entry) => (
    String(entry.operation || "") === "+"
    && entry.volleydelay !== undefined
    && number(entry.volleydelay) > 0
  ));
  const hasAmmoPerShotReduction = stats.some((entry) => (
    String(entry.operation || "") === "+"
    && entry.ammoPerShot !== undefined
    && number(entry.ammoPerShot) < 0
  ));
  return hasVolleyDelayAddition && hasFiringCountReduction && hasAmmoPerShotReduction
    ? "stream-fire"
    : "";
}

function weaponFunctionModeText(mode) {
  if (mode === "shotgun") return "SHOTGUN";
  return mode === "stream-fire" ? "STREAM FIRE" : "SINGLE PROJECTILE";
}

function hasWeaponFilterFunctionMode(item) {
  return (item?.weapon_stat_filters || []).some((filter) => weaponFilterFunctionMode(filter));
}

function weaponFunctionModesForItem(item, modules = installedMechItems("module")) {
  const modes = new Set();
  matchingInstalledWeaponFilters(item, modules).forEach(({ filter }) => {
    const mode = weaponFilterFunctionMode(filter);
    if (mode) modes.add(mode);
  });
  return modes;
}

const SUPPORTED_WEAPON_MODIFIER_FIELDS = new Map([
  [9031, new Set(["damage", "numFiring", "numPerShot", "spread", "volleydelay"])],
  [9032, new Set(["numFiring", "ammoPerShot", "volleydelay", "cooldown", "minReactivationTime"])],
]);

function matchingInstalledWeaponFilters(item, modules = installedMechItems("module")) {
  const records = [];
  (Array.isArray(modules) ? modules : installedMechItems("module")).forEach((module, moduleIndex) => {
    (module?.weapon_stat_filters || []).forEach((filter, filterIndex) => {
      if (!targetComputerFilterMatchesWeapon(filter, item)) return;
      records.push({ module, moduleIndex, filter, filterIndex });
    });
  });
  return records;
}

function weaponModifierFieldValue(source, field) {
  if (field === "minReactivationTime") {
    return number(source?.MinReactivationTime ?? source?.MinReactivationTIme ?? source?.minReactivationTime);
  }
  return number(source?.[field], field === "numFiring" ? 1 : 0);
}

function weaponModifierOperand(entry, field) {
  if (field === "minReactivationTime") {
    return Number(entry?.MinReactivationTime ?? entry?.MinReactivationTIme ?? entry?.minReactivationTime);
  }
  return Number(entry?.[field]);
}

function effectiveWeaponStats(item, modules = installedMechItems("module")) {
  const activeModules = Array.isArray(modules) ? modules : installedMechItems("module");
  const source = item?.stats || {};
  const values = {
    damage: weaponModifierFieldValue(source, "damage"),
    numFiring: weaponModifierFieldValue(source, "numFiring"),
    numPerShot: weaponModifierFieldValue(source, "numPerShot"),
    spread: weaponModifierFieldValue(source, "spread"),
    volleydelay: weaponModifierFieldValue(source, "volleydelay"),
    cooldown: weaponModifierFieldValue(source, "cooldown"),
    ammoPerShot: weaponModifierFieldValue(source, "ammoPerShot"),
    minReactivationTime: weaponModifierFieldValue(source, "minReactivationTime"),
  };
  const modes = new Set();
  const matchedFilterIndexes = [];
  const contributions = [];
  matchingInstalledWeaponFilters(item, activeModules).forEach((record) => {
    const supportedFields = SUPPORTED_WEAPON_MODIFIER_FIELDS.get(number(record.module?.id));
    if (!supportedFields) return;
    matchedFilterIndexes.push(record.filterIndex);
    const mode = weaponFilterFunctionMode(record.filter);
    if (mode) modes.add(mode);
    (record.filter.weapon_stats || []).forEach((entry, statIndex) => {
      const operation = String(entry.operation || "");
      if (operation !== "+" && operation !== "*") return;
      supportedFields.forEach((field) => {
        const operand = weaponModifierOperand(entry, field);
        if (!Number.isFinite(operand)) return;
        const before = values[field];
        const after = operation === "+" ? before + operand : before * operand;
        values[field] = after;
        contributions.push({
          moduleId: record.module.id,
          moduleOccurrence: record.moduleIndex,
          filterIndex: record.filterIndex,
          statIndex,
          field,
          operation,
          operand,
          before,
          after,
        });
      });
    });
  });
  return {
    ...values,
    modes,
    matchedFilterIndexes,
    contributions,
  };
}

function effectiveWeaponFiringProfile(item, modules = installedMechItems("module")) {
  const effective = effectiveWeaponStats(item, modules);
  const sourceShots = Math.max(1, Math.trunc(effective.numFiring));
  const sourceShotDelay = Math.max(0, effective.volleydelay);
  const modes = effective.modes;
  const singleProjectile = modes.has("single-projectile");
  const shotgun = modes.has("shotgun");
  const projectilesPerShot = Math.max(1, Math.trunc(effective.numPerShot));
  const volleySize = weaponVolleySize(item);
  const fullEventCount = Math.floor(sourceShots / volleySize);
  const remainderFirings = sourceShots % volleySize;
  const eventCount = fullEventCount + (remainderFirings > 0 ? 1 : 0);
  const projectilesPerFullEvent = volleySize * projectilesPerShot;
  const remainderProjectiles = remainderFirings * projectilesPerShot;
  const totalProjectiles = sourceShots * projectilesPerShot;
  const shotDelay = sourceShots > 1 ? sourceShotDelay : 0;
  const simultaneous = eventCount <= 1 || shotDelay <= 0;
  const displayShots = simultaneous
    ? `${totalProjectiles}`
    : `${projectilesPerFullEvent} X ${fullEventCount}${remainderProjectiles > 0 ? ` + ${remainderProjectiles}` : ""}`;
  return {
    modes,
    singleProjectile,
    shotgun,
    firingShots: sourceShots,
    shotDelay,
    volleySize,
    eventCount,
    fullEventCount,
    remainderFirings,
    projectilesPerFullEvent,
    remainderProjectiles,
    totalProjectiles,
    simultaneous,
    clusterCount: projectilesPerShot,
    displayShots,
  };
}

function signedEquipmentEffectText(value, digits = 1, unit = "") {
  const numeric = number(value);
  return `${numeric > 0 ? "+" : ""}${tooltipNumber(numeric, digits, unit)}`;
}

function collectTargetComputerWeaponEffects(item, modules = installedMechItems("module")) {
  const totals = {
    rangeBonus: 0,
    speedBonus: 0,
    criticalChance: [0, 0, 0],
  };
  const sources = [];
  const hasRange = (item?.ranges || []).some((range) => number(range.start) > 0);
  const hasVelocity = number(item?.stats?.speed) > 0 && !isHitscanWeapon(item);

  const activeModules = Array.isArray(modules) ? modules : installedMechItems("module");
  const matchingFilters = matchingInstalledWeaponFilters(item, activeModules);
  activeModules.forEach((module, moduleIndex) => {
    const displayValues = {
      criticalChance: new Map(),
      range: new Map(),
      velocity: new Map(),
    };
    const functionModes = new Set();
    const transformEffects = [];
    const addDisplayValue = (kind, scope, value) => {
      if (Math.abs(value) < 0.0001) return;
      displayValues[kind].set(scope, number(displayValues[kind].get(scope)) + value);
    };

    matchingFilters.filter((record) => record.moduleIndex === moduleIndex).forEach(({ filter }) => {
      const scope = targetComputerEffectScope(module, filter);
      const functionMode = weaponFilterFunctionMode(filter);
      if (functionMode) functionModes.add(functionMode);
      (filter.ranges || []).forEach((range) => {
        const multiplier = number(range.multiplier, 1);
        if (multiplier > 0) {
          const value = multiplier - 1;
          totals.rangeBonus += value;
          if (hasRange) addDisplayValue("range", scope, value);
        }
      });
      (filter.weapon_stats || []).forEach((weaponStats) => {
        const operation = String(weaponStats.operation || "");
        if (number(module?.id) === 9031 && functionMode) {
          const labels = {
            volleydelay: "C.HAG INTERVAL",
          };
          Object.entries(labels).forEach(([field, label]) => {
            if (weaponStats[field] === undefined || (operation !== "+" && operation !== "*")) return;
            const operand = Number(weaponStats[field]);
            if (!Number.isFinite(operand)) return;
            transformEffects.push({
              key: field,
              label,
              value: operand,
              value_text: operation === "+"
                ? signedEquipmentEffectText(operand, 4)
                : `×${tooltipNumber(operand, 4)}`,
            });
          });
        }
        if (operation === "*" && number(weaponStats.speed) > 0) {
          const value = number(weaponStats.speed, 1) - 1;
          totals.speedBonus += value;
          if (hasVelocity) addDisplayValue("velocity", scope, value);
        }
        if (operation === "+" && weaponStats.critChanceIncrease !== undefined) {
          String(weaponStats.critChanceIncrease).split(",").forEach((value, index) => {
            if (index < totals.criticalChance.length) {
              totals.criticalChance[index] += number(Number(value));
            }
          });
          addDisplayValue(
            "criticalChance",
            scope,
            number(Number(String(weaponStats.critChanceIncrease).split(",")[0])),
          );
        }
      });
    });

    const effects = [
      ...Array.from(functionModes, (mode) => ({
        key: "firingMode",
        label: "FIRING MODE",
        value: mode,
        value_text: weaponFunctionModeText(mode),
      })),
      ...transformEffects,
      ...Array.from(displayValues.criticalChance, ([scope, value]) => ({
        key: "criticalChance",
        label: `${scope} CRITICAL CHANCE`,
        value,
        value_text: signedEquipmentEffectText(value * 100, 2, "%"),
      })),
      ...Array.from(displayValues.range, ([scope, value]) => ({
        key: "range",
        label: `${scope} RANGE`,
        value,
        value_text: signedEquipmentEffectText(value * 100, 1, "%"),
      })),
      ...Array.from(displayValues.velocity, ([scope, value]) => ({
        key: "velocity",
        label: `${scope} VELOCITY`,
        value,
        value_text: signedEquipmentEffectText(value * 100, 1, "%"),
      })),
    ];
    if (effects.length) {
      sources.push({
        id: module.id,
        name: module.name,
        display_name: module.display_name || module.name,
        effects,
      });
    }
  });
  return { totals, sources };
}

function targetComputerWeaponModifiers(item, modules = installedMechItems("module")) {
  return collectTargetComputerWeaponEffects(item, modules).totals;
}

function collectInstalledWeaponEquipmentEffects(item, modules = installedMechItems("module")) {
  if (item?.item_type !== "weapon") return { sources: [] };
  const sources = [...collectTargetComputerWeaponEffects(item, modules).sources];
  const artemisMultiplier = artemisSpreadMultiplier();
  const artemisUpgrade = artemisUpgradeItem();
  if (artemisEquipped()
    && isArtemisWeapon(item)
    && number(item.stats?.spread) > 0
    && artemisUpgrade
    && Math.abs(artemisMultiplier - 1) >= 0.0001) {
    sources.push({
      id: artemisUpgrade.id,
      name: artemisUpgrade.name,
      display_name: artemisUpgrade.display_name || artemisUpgrade.name || "ARTEMIS",
      effects: [{
        key: "spread",
        label: "MISSILE SPREAD",
        value: artemisMultiplier - 1,
        value_text: signedEquipmentEffectText((artemisMultiplier - 1) * 100, 1, "%"),
      }],
    });
  }

  const moduleBonus = alwaysAppliedWeaponModuleBonus(item);
  if (moduleBonus.source && (moduleBonus.damage !== 0 || moduleBonus.heat !== 0)) {
    const countSuffix = moduleBonus.source.count > 1 ? ` ×${moduleBonus.source.count}` : "";
    sources.push({
      ...moduleBonus.source,
      display_name: `${moduleBonus.source.display_name}${countSuffix}`,
      effects: [
        moduleBonus.damage !== 0 ? {
          key: "damage",
          label: "DAMAGE",
          value: moduleBonus.damage,
          value_text: signedEquipmentEffectText(moduleBonus.damage, 1),
        } : null,
        moduleBonus.heat !== 0 ? {
          key: "heat",
          label: "HEAT",
          value: moduleBonus.heat,
          value_text: signedEquipmentEffectText(moduleBonus.heat, 1),
        } : null,
      ].filter(Boolean),
    });
  }

  return { sources };
}

function weaponEquipmentEffectToneClass(item) {
  const type = equipmentHardpointType(item);
  if (type === "energy") return "quirk-tone-energy";
  if (type === "missile") return "quirk-tone-missile";
  if (type === "ballistic") return "quirk-tone-ballistic";
  return "quirk-tone-default";
}

function simulationWeaponTiming(item, quirks, modules = installedMechItems("module")) {
  const stats = item?.stats || {};
  if (isSimulationContinuousDamagePerSecondWeapon(item)) {
    return {
      duration: 0,
      durationModifier: 0,
      cooldown: 0,
      cycle: 1,
    };
  }
  const rof = number(stats.rof);
  if (rof > 0) {
    const rofBonus = collectWeaponQuirkEffects(item, quirks).totals.rofBonus;
    const cycle = Math.max(0.016, 1 / (rof * (1 + rofBonus)));
    return {
      duration: 0,
      durationModifier: 0,
      cooldown: cycle,
      cycle,
    };
  }

  const effects = collectWeaponQuirkEffects(item, quirks).totals;
  const cooldownReduction = effects.cooldownReduction;
  const durationModifier = effects.durationModifier;
  const cooldown = Math.max(
    0,
    effectiveWeaponStats(item, modules).cooldown * Math.max(0, 1 - cooldownReduction),
  );
  const duration = Math.max(0, number(stats.duration) * Math.max(0, 1 + durationModifier));
  return {
    duration,
    durationModifier,
    cooldown,
    cycle: Math.max(0.016, cooldown + duration),
  };
}

function isStreakSrm(item) {
  return simulationItemKeys(item).has("streaksrm");
}

function weaponVolleySize(item) {
  if (equipmentHardpointType(item) !== "missile") return 1;
  if (isStreakSrm(item)) {
    return Math.max(1, Math.trunc(number(item?.stats?.numFiring, 1)));
  }
  return Math.max(1, Math.trunc(number(item?.stats?.volleysize, 1)));
}

function weaponFiringEventCount(item, modules = installedMechItems("module")) {
  return effectiveWeaponFiringProfile(item, modules).eventCount;
}

function weaponFiringTime(item, modules = installedMechItems("module")) {
  const profile = effectiveWeaponFiringProfile(item, modules);
  return Math.max(0, profile.eventCount - 1) * profile.shotDelay;
}

function weaponHasExpectedCooldown(item, modules = installedMechItems("module")) {
  const stats = item?.stats || {};
  return isUltraAutoCannon(item)
    || number(stats.chargeTime) > 0
    || number(stats.duration) > 0
    || weaponFiringTime(item, modules) > 0;
}

function weaponExpectedCooldown(item, quirks = [], modules = installedMechItems("module")) {
  if (!weaponHasExpectedCooldown(item, modules)) return null;
  const stats = item?.stats || {};
  const timing = simulationWeaponTiming(item, quirks, modules);
  const firingTime = weaponFiringTime(item, modules);
  if (isUltraAutoCannon(item)) {
    const jam = ultraAutoCannonJamStats(item, quirks);
    return (
      firingTime
      + (1 - jam.chance) * timing.cooldown
      + jam.chance * Math.max(timing.cooldown, jam.duration)
    ) / Math.max(1, 2 - jam.chance);
  }
  return Math.max(0.016,
    Math.max(0, number(stats.chargeTime))
    + firingTime
    + timing.duration
    + timing.cooldown);
}

function simulationWeaponCycle(item, quirks, modules = installedMechItems("module")) {
  return simulationWeaponTiming(item, quirks, modules).cycle;
}

function simulationWeaponHeat(item, quirks) {
  const heatReduction = collectWeaponQuirkEffects(item, quirks).totals.heatReduction;
  return Math.max(0, itemHeat(item) * Math.max(0, 1 - heatReduction));
}

function simulationWeaponRangeBonus(item, quirks) {
  return collectWeaponQuirkEffects(item, quirks).totals.rangeBonus;
}

function simulationWeaponRangeProfile(item, rangeBonus = 0, equipmentBonus = 0) {
  const multiplier = Math.max(0, 1 + number(rangeBonus) + number(equipmentBonus));
  const sourceRanges = (item?.ranges || [])
    .map((range) => ({
      start: number(range.start),
      modifier: Math.max(0, number(range.damageModifier)),
      interpolation: String(range.interpolationToNextRange || "linear").toLowerCase(),
      exponent: Math.max(0.0001, number(range.exponent, 1)),
    }))
    .sort((left, right) => left.start - right.start);
  if (!sourceRanges.length) return null;
  const maxModifier = Math.max(...sourceRanges.map((range) => range.modifier));
  const fullDamageRanges = sourceRanges.filter((range) => Math.abs(range.modifier - maxModifier) < 0.0001);
  const minimumRange = fullDamageRanges[0]?.start ?? sourceRanges[0].start;
  const optimalRange = fullDamageRanges.at(-1)?.start ?? sourceRanges[0].start;
  const ranges = sourceRanges.map((range) => ({
    ...range,
    start: range.start <= minimumRange ? range.start : range.start * multiplier,
  }));
  return {
    ranges,
    rangeMultiplier: multiplier,
    minimumRange,
    optimalRange: optimalRange <= minimumRange ? optimalRange : optimalRange * multiplier,
    maximumRange: ranges.at(-1).start,
  };
}

function simulationWeaponDamageMultiplier(weapon, distance = state.simulation.targetDistance) {
  const profile = weapon.rangeProfile;
  if (!profile) return 1;
  const targetDistance = Math.max(0, number(Number(distance), 180));
  if (isAtmWeapon(weapon.item)) {
    const multiplier = Math.max(0, number(profile.rangeMultiplier, 1));
    if (targetDistance < 60 || targetDistance > atmRangeBoundary(1100, multiplier)) return 0;
    if (targetDistance < atmRangeBoundary(350, multiplier)) return 1.25;
    if (targetDistance < atmRangeBoundary(650, multiplier)) return 1;
    return 0.8;
  }
  if (targetDistance > profile.maximumRange) return 0;
  const ranges = profile.ranges;
  if (!ranges.length || targetDistance < ranges[0].start) return 0;
  const index = ranges.findIndex((range) => range.start > targetDistance);
  if (index < 0) return Math.max(0, Math.min(1, ranges.at(-1).modifier));
  if (index === 0) return Math.max(0, Math.min(1, ranges[0].modifier));
  const previous = ranges[index - 1];
  const next = ranges[index];
  if (previous.interpolation === "step" || next.start <= previous.start) {
    return Math.max(0, Math.min(1, previous.modifier));
  }
  const progress = Math.max(0, Math.min(1, (targetDistance - previous.start) / (next.start - previous.start)));
  const interpolatedProgress = previous.interpolation === "exponential"
    ? progress ** previous.exponent
    : progress;
  return Math.max(0, Math.min(1, previous.modifier + (next.modifier - previous.modifier) * interpolatedProgress));
}

function simulationWeaponDamage(weapon, shotCount = 1) {
  const damage = state.simulation.applySplashDamage ? weapon.damage : weapon.directDamage;
  return number(damage) * Math.max(0, number(shotCount, 1)) * simulationWeaponDamageMultiplier(weapon);
}

function simulationWeaponDamagePerSecond(weapon) {
  const damage = state.simulation.applySplashDamage
    ? weapon.damagePerSecond
    : weapon.directDamagePerSecond;
  return number(damage) * simulationWeaponDamageMultiplier(weapon);
}

function simulationWeaponHeatPerSecond(weapon) {
  if (isContinuousPerSecondWeapon(weapon?.item)) return Math.max(0, number(weapon?.heat));
  return Math.max(0, number(weapon?.heat))
    / Math.max(0.016, number(weapon?.cycle, 0.016));
}

function simulationHeatSinkItem(build = state.currentBuild) {
  const upgrade = itemById(build?.upgrades?.heatsinks?.ItemID);
  const compatible = itemById(upgrade?.stats?.compatibleHeatSink);
  if (isHeatSink(compatible)) return compatible;
  for (const component of Object.values(build?.components || {})) {
    const installed = (component.items || [])
      .map((entry) => itemById(entry.item_id))
      .find(isHeatSink);
    if (installed) return installed;
  }
  const internal = engineHeatSinkEntries(build)
    .map((entry) => itemById(entry.item_id))
    .find(isHeatSink);
  if (internal) return internal;
  return null;
}

function simulationHeatSystemFromSink(sink, heatSinkCount, heatDissipation = 0, heatCapacity = 0) {
  const engineCapacity = Math.abs(number(sink?.stats?.engineHeatbase));
  const externalCapacity = Math.abs(number(sink?.stats?.heatbase));
  const engineCapacityCount = Math.min(10, heatSinkCount);
  const externalCapacityCount = Math.max(0, heatSinkCount - 10);
  const maxHeat = 30 * (1 + heatCapacity)
    + engineCapacityCount * engineCapacity
    + externalCapacityCount * externalCapacity * (1 + heatCapacity);
  const engineCooling = number(sink?.stats?.engineCooling);
  const externalCooling = number(sink?.stats?.cooling);
  return {
    heatSinkCount,
    maxHeat,
    coolingRate: (
      engineCapacityCount * engineCooling
      + externalCapacityCount * externalCooling
    ) * (1 + heatDissipation),
  };
}

function simulationHeatSystem() {
  const sink = simulationHeatSinkItem();
  const heatSinkCount = state.selectedMech && state.currentBuild
    ? calculateBuild().totalHeatSinkCount
    : 0;
  const quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild);
  return simulationHeatSystemFromSink(
    sink,
    heatSinkCount,
    quirkIncrease(quirks, "heatdissipation_multiplier"),
    quirkIncrease(quirks, "maxheat_multiplier"),
  );
}

function collectSimulationWeapons() {
  if (!state.selectedMech || !state.currentBuild) return [];
  const definition = effectiveDefinition(state.selectedMech, state.currentBuild);
  const quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild);
  const modules = installedMechItems("module");
  const weapons = [];

  for (const component of COMPONENT_ORDER) {
    const fixed = definition.components?.[component]?.fixed || [];
    fixed.forEach((itemId, index) => {
      const item = itemById(itemId);
      if (item?.item_type !== "weapon" || isAmsWeapon(item)) return;
      const firingProfile = effectiveWeaponFiringProfile(item, modules);
      const baseTiming = simulationWeaponTiming(item, [], []);
      const timing = simulationWeaponTiming(item, quirks, modules);
      const expectedCooldown = weaponExpectedCooldown(item, quirks, modules);
      const targetComputer = targetComputerWeaponModifiers(item, modules);
      const directDamage = weaponDirectDamage(item, modules);
      const splashDamage = weaponSplashDamage(item, modules);
      const damageRate = weaponDamageRate(item, quirks, modules);
      const cycle = expectedCooldown ?? timing.cycle;
      const directDamagePerSecond = damageRate?.final ?? directDamage / cycle;
      weapons.push({
        key: `${state.selectedMech.id}:fixed:${component}:${index}:${item.id}`,
        item,
        component,
        directDamage,
        splashDamage,
        damage: directDamage + splashDamage * 2,
        directDamagePerSecond,
        damagePerSecond: directDamagePerSecond * (
          directDamage > 0 ? (directDamage + splashDamage * 2) / directDamage : 1
        ),
        heat: simulationWeaponHeat(item, quirks),
        ghostHeatBase: itemHeat(item),
        ghostHeatBasePerSecond: isContinuousPerSecondWeapon(item)
          ? itemHeat(item)
          : itemHeat(item) / Math.max(0.016, baseTiming.cycle),
        ghostHeatHslBonus: ghostHeatHslBonus(item, quirks),
        continuous: Boolean(damageRate),
        chargeTime: Math.max(0, number(item.stats?.chargeTime)),
        firingTime: weaponFiringTime(item, modules),
        shotCount: firingProfile.firingShots,
        volleySize: firingProfile.volleySize,
        eventCount: firingProfile.eventCount,
        shotDelay: firingProfile.shotDelay,
        ultra: isUltraAutoCannon(item),
        jam: ultraAutoCannonJamStats(item, quirks),
        rangeProfile: simulationWeaponRangeProfile(
          item,
          simulationWeaponRangeBonus(item, quirks),
          targetComputer.rangeBonus,
        ),
        ...timing,
        cycle,
        entry: null,
      });
    });

    (state.currentBuild.components?.[component]?.items || []).forEach((entry, index) => {
      const item = itemById(entry.item_id);
      if (item?.item_type !== "weapon" || isAmsWeapon(item)) return;
      const firingProfile = effectiveWeaponFiringProfile(item, modules);
      const baseTiming = simulationWeaponTiming(item, [], []);
      const timing = simulationWeaponTiming(item, quirks, modules);
      const expectedCooldown = weaponExpectedCooldown(item, quirks, modules);
      const targetComputer = targetComputerWeaponModifiers(item, modules);
      const directDamage = weaponDirectDamage(item, modules);
      const splashDamage = weaponSplashDamage(item, modules);
      const damageRate = weaponDamageRate(item, quirks, modules);
      const cycle = expectedCooldown ?? timing.cycle;
      const directDamagePerSecond = damageRate?.final ?? directDamage / cycle;
      weapons.push({
        key: `${state.selectedMech.id}:installed:${component}:${index}:${item.id}`,
        item,
        component,
        directDamage,
        splashDamage,
        damage: directDamage + splashDamage * 2,
        directDamagePerSecond,
        damagePerSecond: directDamagePerSecond * (
          directDamage > 0 ? (directDamage + splashDamage * 2) / directDamage : 1
        ),
        heat: simulationWeaponHeat(item, quirks),
        ghostHeatBase: itemHeat(item),
        ghostHeatBasePerSecond: isContinuousPerSecondWeapon(item)
          ? itemHeat(item)
          : itemHeat(item) / Math.max(0.016, baseTiming.cycle),
        ghostHeatHslBonus: ghostHeatHslBonus(item, quirks),
        continuous: Boolean(damageRate),
        chargeTime: Math.max(0, number(item.stats?.chargeTime)),
        firingTime: weaponFiringTime(item, modules),
        shotCount: firingProfile.firingShots,
        volleySize: firingProfile.volleySize,
        eventCount: firingProfile.eventCount,
        shotDelay: firingProfile.shotDelay,
        ultra: isUltraAutoCannon(item),
        jam: ultraAutoCannonJamStats(item, quirks),
        rangeProfile: simulationWeaponRangeProfile(
          item,
          simulationWeaponRangeBonus(item, quirks),
          targetComputer.rangeBonus,
        ),
        ...timing,
        cycle,
        entry,
      });
    });
  }
  return weapons;
}

function weaponDetailRangeText(weapon) {
  const profile = weapon.rangeProfile;
  if (!profile) return "-";
  return `${fmt(profile.minimumRange, 0)} / ${fmt(profile.optimalRange, 0)} / ${fmt(profile.maximumRange, 0)}m`;
}

function weaponDetailRangeType(item) {
  const profile = simulationWeaponRangeProfile(item, 0, 0);
  if (!profile) return null;
  const maximumDamageRange = Math.max(0, number(profile.optimalRange));
  if (maximumDamageRange <= 350) {
    return { type: "short", maximumDamageRange };
  }
  if (maximumDamageRange <= 700) {
    return { type: "medium", maximumDamageRange };
  }
  return { type: "long", maximumDamageRange };
}

function weaponDetailVisibleRangeTypes(
  weapons,
  frequencyByWeaponKey = state.weaponDetail.frequencyByWeaponKey,
  enabledByWeaponKey = state.weaponDetail.enabledByWeaponKey,
  enabledRangeTypes = state.weaponDetail.enabledRangeTypes,
) {
  return ["short", "medium", "long"].filter((type) => {
    if (!enabledRangeTypes.has(type)) return false;
    return weapons.some((weapon) => {
    if (weaponDetailRangeType(weapon.item)?.type !== type) return false;
    if (!weaponDetailWeaponEnabled(weapon.key, enabledByWeaponKey)) return false;
    const saved = frequencyByWeaponKey.get(weapon.key);
    return Math.max(0, Math.min(100, number(saved, 100))) > 0;
    });
  });
}

function weaponDetailWeaponEnabled(
  weaponKey,
  enabledByWeaponKey = state.weaponDetail.enabledByWeaponKey,
) {
  return !enabledByWeaponKey.has(weaponKey) || enabledByWeaponKey.get(weaponKey) !== false;
}

function weaponDetailRangeTypeEnabled(
  itemOrType,
  enabledRangeTypes = state.weaponDetail.enabledRangeTypes,
) {
  const type = typeof itemOrType === "string"
    ? itemOrType
    : weaponDetailRangeType(itemOrType)?.type;
  return !type || enabledRangeTypes.has(type);
}

function weaponDetailMaximumFiringRange(weapon) {
  const profile = weapon?.rangeProfile;
  if (!profile) return Number.POSITIVE_INFINITY;
  if (isAtmWeapon(weapon.item)) {
    return atmRangeBoundary(1100, Math.max(0, number(profile.rangeMultiplier, 1)));
  }
  return Math.max(0, number(profile.maximumRange));
}

function weaponDetailEffectiveFrequency(weapon, distance) {
  if (!weaponDetailWeaponEnabled(weapon.key) || !weaponDetailRangeTypeEnabled(weapon.item)) {
    return 0;
  }
  const frequency = weaponDetailFrequency(weapon.key);
  if (number(distance) > weaponDetailMaximumFiringRange(weapon) + 0.0001) {
    return 0;
  }
  return frequency;
}

function weaponDetailFrequency(weaponKey) {
  const saved = state.weaponDetail.frequencyByWeaponKey.get(weaponKey);
  return Math.max(0, Math.min(100, number(saved, 100)));
}

function weaponDetailFrequencyRatio(frequency) {
  return Math.max(0, Math.min(100, number(frequency))) / 100;
}

function weaponDetailAdjustedRate(rate, frequency) {
  return number(rate) * weaponDetailFrequencyRatio(frequency);
}

function weaponDetailEffectiveCooldown(cycle, frequency) {
  const ratio = weaponDetailFrequencyRatio(frequency);
  return ratio > 0 ? number(cycle) / ratio : null;
}

function weaponDetailDpsAtDistance(
  weapons,
  distance,
  frequencyByWeaponKey = new Map(),
) {
  return weapons.reduce((sum, weapon) => {
    const frequency = frequencyByWeaponKey.has(weapon.key)
      ? frequencyByWeaponKey.get(weapon.key)
      : 100;
    return sum + weaponDetailAdjustedRate(
      number(weapon.damagePerSecond) * simulationWeaponDamageMultiplier(weapon, distance),
      frequency,
    );
  }, 0);
}

function weaponDetailDistanceSegments(
  weapons,
  frequencyByWeaponKey = new Map(),
  minimumDistance = 1,
  maximumDistance = 1000,
  rangeCombinationDps = false,
) {
  const start = Math.max(0, Math.trunc(number(minimumDistance, 1)));
  const end = Math.max(start, Math.trunc(number(maximumDistance, 1000)));
  const values = [];
  const availabilitySignatures = [];
  const maximumDpsBySignature = new Map();
  let maximumDps = 0;
  for (let distance = start; distance <= end; distance += 1) {
    const distanceWeapons = rangeCombinationDps
      ? weapons.filter((weapon) => (
        (frequencyByWeaponKey.has(weapon.key)
          ? number(frequencyByWeaponKey.get(weapon.key), 100)
          : 100) > 0
        && distance <= weaponDetailMaximumFiringRange(weapon) + 0.0001
      ))
      : weapons;
    const signature = rangeCombinationDps
      ? distanceWeapons.map((weapon) => weapon.key).join("\u001f")
      : "all";
    const dps = weaponDetailDpsAtDistance(
      distanceWeapons,
      distance,
      frequencyByWeaponKey,
    );
    values.push(dps);
    availabilitySignatures.push(signature);
    maximumDps = Math.max(maximumDps, dps);
    maximumDpsBySignature.set(
      signature,
      Math.max(number(maximumDpsBySignature.get(signature)), dps),
    );
  }
  const maximumTolerance = Math.max(0.000001, maximumDps * 0.000001);
  const damageRatios = values.map((value, index) => {
    const localMaximum = number(maximumDpsBySignature.get(availabilitySignatures[index]));
    return localMaximum > 0.000001 ? value / localMaximum : 0;
  });
  const collect = (sourceValues, matches) => {
    const segments = [];
    let segmentStart = null;
    sourceValues.forEach((value, index) => {
      const distance = start + index;
      if (matches(value)) {
        if (segmentStart === null) segmentStart = distance;
      } else if (segmentStart !== null) {
        segments.push({ start: segmentStart, end: distance - 1 });
        segmentStart = null;
      }
    });
    if (segmentStart !== null) segments.push({ start: segmentStart, end });
    return segments;
  };
  return {
    minimumDistance: start,
    maximumDistance: end,
    maximumDps,
    dpsValues: values,
    damageRatios,
    maximumSegments: maximumDps > maximumTolerance
      ? collect(damageRatios, (value) => value >= 1 - 0.000001)
      : [],
    zeroSegments: collect(values, (value) => value <= 0.000001),
  };
}

function alphasToOverheat(maxHeat, alphaHeat, coolingRate, alphaCycle) {
  const capacity = Math.max(0, number(maxHeat));
  const heat = Math.max(0, number(alphaHeat));
  if (!(capacity > 0) || !(heat > 0)) return null;
  if (heat >= capacity) return capacity / heat;
  const coolingBetweenAlphas = Math.max(0, number(coolingRate)) * Math.max(0, number(alphaCycle));
  const netHeat = heat - coolingBetweenAlphas;
  if (netHeat <= 0) return Number.POSITIVE_INFINITY;
  return 1 + (capacity - heat) / netHeat;
}

function weaponDetailHeatEfficiency(hps, coolingRate) {
  const heatPerSecond = Math.max(0, number(hps));
  const cooling = Math.max(0, number(coolingRate));
  return heatPerSecond <= cooling + 0.0001
    ? 100
    : Math.max(0, Math.min(100, cooling / heatPerSecond * 100));
}

function weaponDetailHeatEfficiencyColor(efficiency) {
  const value = Math.max(0, Math.min(100, number(efficiency)));
  const redColor = [223, 101, 79];
  const greenColor = [154, 201, 95];
  const blend = Math.max(0, Math.min(1, (value - 25) / 50));
  const channels = redColor.map(
    (channel, index) => Math.round(channel + (greenColor[index] - channel) * blend),
  );
  return `rgb(${channels.join(", ")})`;
}

function weaponDetailTotals() {
  const detail = state.weaponDetail;
  const calc = calculateBuild();
  const distance = Math.max(1, Math.min(1000, number(detail.distance, 180)));
  const effectiveFrequencyByWeaponKey = new Map(detail.weapons.map((weapon) => [
    weapon.key,
    weaponDetailEffectiveFrequency(weapon, distance),
  ]));
  const activeWeapons = detail.weapons.filter(
    (weapon) => number(effectiveFrequencyByWeaponKey.get(weapon.key)) > 0,
  );
  const heatSystem = simulationHeatSystem();
  const distanceSegments = weaponDetailDistanceSegments(
    detail.weapons.filter((weapon) => (
      weaponDetailFrequency(weapon.key) > 0
      && weaponDetailWeaponEnabled(weapon.key)
      && weaponDetailRangeTypeEnabled(weapon.item)
    )),
    detail.frequencyByWeaponKey,
    1,
    1000,
    detail.rangeCombinationDps,
  );
  const metricRowsForWeapons = (weapons, labelKey, rangeType = null) => {
    const alpha = weapons.reduce(
      (sum, weapon) => sum
        + number(weapon.damage) * simulationWeaponDamageMultiplier(weapon, distance),
      0,
    );
    const dps = weaponDetailDpsAtDistance(
      weapons,
      distance,
      effectiveFrequencyByWeaponKey,
    );
    const rowGhostHeat = detail.applyGhostHeat
      ? ghostHeatForSimulationWeapons(weapons)
      : 0;
    const rowAlphaHeat = weapons.reduce(
      (sum, weapon) => sum + number(weapon.heat),
      rowGhostHeat,
    );
    const rowAlphaCycle = weapons.reduce((longest, weapon) => Math.max(
      longest,
      number(weaponDetailEffectiveCooldown(
        weapon.cycle,
        effectiveFrequencyByWeaponKey.get(weapon.key),
      )),
    ), 0);
    let rowHps = weapons.reduce(
      (sum, weapon) => sum
        + simulationWeaponHeatPerSecond(weapon)
          * weaponDetailFrequencyRatio(effectiveFrequencyByWeaponKey.get(weapon.key)),
      0,
    );
    if (rowGhostHeat > 0 && rowAlphaCycle > 0) rowHps += rowGhostHeat / rowAlphaCycle;
    const rowAto = alphasToOverheat(
      heatSystem.maxHeat,
      rowAlphaHeat,
      heatSystem.coolingRate,
      rowAlphaCycle,
    );
    const rowHeatEfficiency = weaponDetailHeatEfficiency(rowHps, heatSystem.coolingRate);
    const damageMetrics = rangeType
      ? [
          [t("weaponDetail.totalDamage"), fmt(alpha, 2)],
          ["DPS", fmt(dps, 2)],
        ]
      : [
          ["FIREPOWER", fmt(alpha, 2)],
          ["DPS", fmt(dps, 2)],
          ["DPH", rowAlphaHeat > 0 ? fmt(alpha / rowAlphaHeat, 2) : "-"],
          ["DPT", calc.totalTons > 0 ? fmt(alpha / calc.totalTons, 2) : "-"],
        ];
    const heatEfficiencyMetric = [
      "HEAT EFFICIENCY",
      `${fmt(rowHeatEfficiency, 1)}%`,
      weaponDetailHeatEfficiencyColor(rowHeatEfficiency),
    ];
    const heatMetrics = rangeType
      ? [
          ["HPS", fmt(rowHps, 2)],
          ["ALPHA HEAT", `${fmt(rowAlphaHeat, 2)} (${fmt(heatSystem.maxHeat > 0 ? rowAlphaHeat / heatSystem.maxHeat * 100 : 0, 1)}%)`],
          heatEfficiencyMetric,
        ]
      : [
          ["ATO", rowAto === null ? "-" : Number.isFinite(rowAto) ? fmt(rowAto, 2) : "∞"],
          ["HPS", fmt(rowHps, 2)],
          ["ALPHA HEAT", `${fmt(rowAlphaHeat, 2)} (${fmt(heatSystem.maxHeat > 0 ? rowAlphaHeat / heatSystem.maxHeat * 100 : 0, 1)}%)`],
          heatEfficiencyMetric,
        ];
    return [
      {
        type: "damage",
        labelKey,
        rangeType,
        metricKey: "weaponDetail.metricDamage",
        metrics: damageMetrics,
      },
      {
        type: "heat",
        labelKey,
        rangeType,
        metricKey: "weaponDetail.metricHeat",
        metrics: heatMetrics,
      },
    ];
  };
  const rangeMetricRows = weaponDetailVisibleRangeTypes(
    detail.weapons,
    detail.frequencyByWeaponKey,
  ).flatMap((type) => {
    const configuredTypeWeapons = detail.weapons.filter(
      (weapon) => weaponDetailRangeType(weapon.item)?.type === type,
    );
    const activeTypeWeapons = configuredTypeWeapons.filter(
      (weapon) => number(effectiveFrequencyByWeaponKey.get(weapon.key)) > 0,
    );
    return metricRowsForWeapons(
      activeTypeWeapons,
      `weaponDetail.rangeType${type[0].toUpperCase()}${type.slice(1)}`,
      type,
    );
  });
  return {
    activeWeapons,
    distance,
    distanceSegments,
    metricRows: metricRowsForWeapons(activeWeapons, "weaponDetail.metricDamage"),
    rangeMetricRows,
  };
}

function weaponDetailSegmentPercent(distance, segments) {
  const span = Math.max(1, segments.maximumDistance - segments.minimumDistance);
  return Math.max(0, Math.min(100, (distance - segments.minimumDistance) / span * 100));
}

function weaponDetailDistanceTone(distance, segments) {
  const within = (segment) => distance >= segment.start && distance <= segment.end;
  if (segments.zeroSegments.some(within)) return "zero";
  if (segments.maximumSegments.some(within)) return "maximum";
  return "normal";
}

function weaponDetailDamageRatio(distance, segments) {
  if (!(segments.maximumDps > 0) || !segments.dpsValues?.length) return null;
  const index = Math.max(
    0,
    Math.min(
      segments.dpsValues.length - 1,
      Math.round(number(distance) - segments.minimumDistance),
    ),
  );
  const dps = number(segments.dpsValues[index]);
  if (dps <= 0.000001) return null;
  return Math.max(0, Math.min(1, number(segments.damageRatios?.[index])));
}

function weaponDetailDamageColor(ratio) {
  if (ratio === null || ratio === undefined) return "rgb(38, 52, 58)";
  const amount = Math.max(0, Math.min(1, number(ratio)));
  const redColor = [223, 101, 79];
  const greenColor = [154, 201, 95];
  const blueColor = [73, 166, 200];
  const startColor = amount >= 0.99 ? greenColor : redColor;
  const endColor = amount >= 0.99 ? blueColor : greenColor;
  const blend = amount >= 0.99 ? (amount - 0.99) / 0.01 : amount / 0.99;
  const channels = startColor.map(
    (channel, index) => Math.round(channel + (endColor[index] - channel) * blend),
  );
  return `rgb(${channels.join(", ")})`;
}

function weaponDetailDistanceGradient(segments) {
  const sampleCount = Math.min(100, Math.max(1, segments.dpsValues?.length - 1 || 1));
  const stops = [];
  for (let sample = 0; sample <= sampleCount; sample += 1) {
    const percent = sample / sampleCount * 100;
    const distance = segments.minimumDistance
      + (segments.maximumDistance - segments.minimumDistance) * sample / sampleCount;
    stops.push(`${weaponDetailDamageColor(weaponDetailDamageRatio(distance, segments))} ${fmt(percent, 2)}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

function weaponDetailDistanceBoundaries(segments) {
  if (!segments.dpsValues?.length) {
    return [segments.minimumDistance, segments.maximumDistance];
  }
  const bandAt = (index) => {
    const dps = number(segments.dpsValues[index]);
    if (dps <= 0.000001 || !(segments.maximumDps > 0)) return "out-of-range";
    const ratio = Math.max(0, Math.min(1, number(segments.damageRatios?.[index])));
    if (ratio >= 1 - 0.000001) return "maximum";
    if (ratio >= 0.99) return "near-maximum";
    return "reduced";
  };
  const boundaries = [segments.minimumDistance];
  let previousBand = bandAt(0);
  for (let index = 1; index < segments.dpsValues.length; index += 1) {
    const band = bandAt(index);
    if (band !== previousBand) {
      boundaries.push(segments.minimumDistance + index - 0.5);
      previousBand = band;
    }
  }
  boundaries.push(segments.maximumDistance);
  return boundaries;
}

function weaponDetailBoundaryLayers(segments) {
  const marker = "rgba(233, 248, 252, 0.9)";
  return weaponDetailDistanceBoundaries(segments).map((boundary) => {
    const percent = weaponDetailSegmentPercent(boundary, segments);
    if (percent <= 0) {
      return `linear-gradient(to right, ${marker} 0 1px, transparent 1px 100%)`;
    }
    if (percent >= 100) {
      return `linear-gradient(to right, transparent 0 calc(100% - 1px), ${marker} calc(100% - 1px) 100%)`;
    }
    return `linear-gradient(to right, transparent 0 calc(${percent}% - 1px), ${marker} calc(${percent}% - 1px) calc(${percent}% + 1px), transparent calc(${percent}% + 1px) 100%)`;
  }).join(", ");
}

function renderWeaponDetailDistanceScale(totals) {
  const { distance, distanceSegments } = totals;
  const tone = weaponDetailDistanceTone(distance, distanceSegments);
  const damageColor = weaponDetailDamageColor(
    weaponDetailDamageRatio(distance, distanceSegments),
  );
  const distancePercent = weaponDetailSegmentPercent(distance, distanceSegments);
  const input = $("weapon-detail-distance");
  input.style.setProperty("--weapon-distance-percent", `${distancePercent}%`);
  input.style.setProperty("--weapon-distance-tone", damageColor);
  input.style.setProperty(
    "--weapon-distance-boundaries",
    weaponDetailBoundaryLayers(distanceSegments),
  );
  input.dataset.tone = tone;
  const distanceValue = $("weapon-detail-distance-value");
  distanceValue.dataset.tone = tone;
  distanceValue.style.color = damageColor;
  const scale = $("weapon-detail-distance-scale");
  scale.style.background = weaponDetailDistanceGradient(distanceSegments);
  const renderSegments = (segments, type, label) => segments.map((segment) => {
    const left = weaponDetailSegmentPercent(segment.start, distanceSegments);
    const right = weaponDetailSegmentPercent(segment.end, distanceSegments);
    const width = Math.max(0.35, right - left);
    return `<i class="${type}" style="left:${left}%;width:${width}%" title="${escapeHtml(`${label}: ${segment.start}~${segment.end}m`)}"></i>`;
  }).join("");
  scale.innerHTML = `
    ${renderSegments(distanceSegments.zeroSegments, "zero", t("weaponDetail.zeroDamageRange"))}
    ${renderSegments(distanceSegments.maximumSegments, "maximum", t("weaponDetail.maxDpsRange"))}
  `;
}

function renderWeaponDetailMetrics(totals = weaponDetailTotals()) {
  $("weapon-detail-distance-value").textContent = `${fmt(totals.distance, 0)}m`;
  renderWeaponDetailDistanceScale(totals);
  $("weapon-detail-ghost-status").textContent = t(
    state.weaponDetail.applyGhostHeat ? "ui.on" : "ui.off",
  );
  $("weapon-detail-apply-ghost-heat").closest(".weapon-detail-ghost-toggle")
    ?.classList.toggle("active", state.weaponDetail.applyGhostHeat);
  $("weapon-detail-range-combination-dps-status").textContent = t(
    state.weaponDetail.rangeCombinationDps ? "ui.on" : "ui.off",
  );
  $("weapon-detail-range-combination-dps").closest(".weapon-detail-range-combination-toggle")
    ?.classList.toggle("active", state.weaponDetail.rangeCombinationDps);
  const metricTab = state.weaponDetail.metricTab === "range" ? "range" : "basic";
  document.querySelectorAll("[data-weapon-detail-tab]").forEach((button) => {
    const active = button.dataset.weaponDetailTab === metricTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", `${active}`);
  });
  const metrics = $("weapon-detail-metrics");
  metrics.setAttribute(
    "aria-labelledby",
    metricTab === "range" ? "weapon-detail-tab-range" : "weapon-detail-tab-basic",
  );
  const metricRows = metricTab === "range" ? totals.rangeMetricRows : totals.metricRows;
  const renderMetricRow = (row) => `
    <div class="weapon-detail-metric-row ${row.type}" style="--weapon-detail-metric-count:${row.metrics.length}">
      <strong class="weapon-detail-metric-row-label">
        <span>${t(row.metricKey || row.labelKey)}</span>
      </strong>
      ${row.metrics.map(([label, value, color]) => `
        <div>
          <span>${label}</span>
          <strong${color ? ` style="color:${color}"` : ""}>${value}</strong>
        </div>
      `).join("")}
    </div>
  `;
  const renderRangeTypeToggles = () => `
    <div class="weapon-detail-range-type-toggles" aria-label="${t("weaponDetail.rangeTypes")}">
      ${["short", "medium", "long"].map((type) => {
        const enabled = weaponDetailRangeTypeEnabled(type);
        const labelKey = `weaponDetail.rangeType${type[0].toUpperCase()}${type.slice(1)}`;
        return `
          <label class="weapon-detail-range-type-toggle range-${type}">
            <input type="checkbox" data-weapon-detail-range-type-enabled="${type}" ${enabled ? "checked" : ""}>
            <span>${t(labelKey)}</span>
            <strong>${t(enabled ? "ui.on" : "ui.off")}</strong>
          </label>
        `;
      }).join("")}
    </div>
  `;
  if (metricTab === "range") {
    metrics.innerHTML = metricRows
      .filter((row) => row.type === "damage")
      .map((damageRow) => {
        const heatRow = metricRows.find(
          (row) => row.type === "heat" && row.rangeType === damageRow.rangeType,
        );
        return `
          <section class="weapon-detail-range-metric-group range-${damageRow.rangeType}">
            <strong class="weapon-detail-range-type-label">${t(damageRow.labelKey)}</strong>
            <div class="weapon-detail-range-metric-columns">
              ${renderMetricRow(damageRow)}
              ${heatRow ? renderMetricRow(heatRow) : ""}
            </div>
          </section>
        `;
      }).join("");
  } else {
    metrics.innerHTML = `${renderRangeTypeToggles()}${metricRows.map(renderMetricRow).join("")}`;
  }
}

const weaponDetailMaximumMultiplierCache = new WeakMap();

function weaponDetailWeaponDamageRatio(weapon, distance) {
  let maximumMultiplier = weaponDetailMaximumMultiplierCache.get(weapon);
  if (maximumMultiplier === undefined) {
    maximumMultiplier = 0;
    for (let sampleDistance = 1; sampleDistance <= 1000; sampleDistance += 1) {
      maximumMultiplier = Math.max(
        maximumMultiplier,
        simulationWeaponDamageMultiplier(weapon, sampleDistance),
      );
    }
    weaponDetailMaximumMultiplierCache.set(weapon, maximumMultiplier);
  }
  if (!(maximumMultiplier > 0.000001)) return 0;
  return Math.max(
    0,
    Math.min(1, simulationWeaponDamageMultiplier(weapon, distance) / maximumMultiplier),
  );
}

function weaponDetailWeaponRangeTone(ratio) {
  const value = Math.max(0, Math.min(1, number(ratio)));
  if (value >= 0.99) return "range-high";
  if (value >= 0.5) return "range-medium";
  return "range-low";
}

function renderWeaponDetail() {
  const detail = state.weaponDetail;
  if (!detail.open) return;
  const totals = weaponDetailTotals();
  const { distance } = totals;
  $("weapon-detail-distance").value = String(distance);
  $("weapon-detail-apply-ghost-heat").checked = detail.applyGhostHeat;
  $("weapon-detail-range-combination-dps").checked = detail.rangeCombinationDps;
  renderWeaponDetailMetrics(totals);
  $("weapon-detail-list").innerHTML = detail.weapons.length ? detail.weapons.map((weapon) => {
    const frequency = weaponDetailFrequency(weapon.key);
    const enabled = weaponDetailWeaponEnabled(weapon.key);
    const rangeTypeEnabled = weaponDetailRangeTypeEnabled(weapon.item);
    const calculationFrequency = weaponDetailEffectiveFrequency(weapon, distance);
    const multiplier = simulationWeaponDamageMultiplier(weapon, distance);
    const actualDamage = number(weapon.damage) * multiplier;
    const actualDps = weaponDetailAdjustedRate(
      number(weapon.damagePerSecond) * multiplier,
      calculationFrequency,
    );
    const effectiveCooldown = weaponDetailEffectiveCooldown(
      weapon.cycle,
      calculationFrequency,
    );
    const rangeTone = weaponDetailWeaponRangeTone(
      weaponDetailWeaponDamageRatio(weapon, distance),
    );
    return `
      <div class="weapon-detail-row ${equipmentHardpointType(weapon.item)} ${rangeTone}${enabled ? "" : " disabled"}${rangeTypeEnabled ? "" : " range-type-disabled"}">
        <div class="weapon-detail-weapon">
          <div class="weapon-detail-name">
            <label class="weapon-detail-weapon-toggle">
              <input type="checkbox" data-weapon-detail-enabled="${weapon.key}" ${enabled ? "checked" : ""}>
              <span>${t(enabled ? "ui.on" : "ui.off")}</span>
              <span class="sr-only">${escapeHtml(weapon.item.display_name || weapon.item.name)}</span>
            </label>
            <strong title="${escapeHtml(weapon.item.display_name || weapon.item.name)}">${escapeHtml(weapon.item.display_name || weapon.item.name)}</strong>
          </div>
          <label class="weapon-detail-frequency-control">
            <span class="sr-only">${escapeHtml(weapon.item.display_name || weapon.item.name)} ${t("weaponDetail.frequency")}</span>
            <input type="range" min="0" max="100" step="1" value="${frequency}" style="--weapon-frequency-percent:${frequency}%" data-weapon-detail-frequency="${weapon.key}">
          </label>
          <output data-weapon-detail-frequency-value="${weapon.key}">${fmt(frequency, 0)}%</output>
        </div>
        <span>${MECHLAB_COMPONENT_NAMES[weapon.component] || weapon.component}</span>
        <span>${fmt(actualDamage, 2)} <small>/ ${fmt(weapon.damage, 2)}</small></span>
        <span data-weapon-detail-dps="${weapon.key}">${fmt(actualDps, 2)}</span>
        <span data-weapon-detail-cooldown="${weapon.key}">${effectiveCooldown === null ? "-" : `${fmt(effectiveCooldown, 2)}s`}</span>
        <span>${weaponDetailRangeText(weapon)}</span>
      </div>
    `;
  }).join("") : `<div class="empty">${t("simulation.noWeapons")}</div>`;
}

function openWeaponDetail() {
  if (!state.selectedMech || !state.currentBuild) return;
  const detail = state.weaponDetail;
  detail.weapons = collectSimulationWeapons();
  const currentKeys = new Set(detail.weapons.map((weapon) => weapon.key));
  detail.frequencyByWeaponKey = new Map(
    Array.from(detail.frequencyByWeaponKey).filter(([key]) => currentKeys.has(key)),
  );
  detail.enabledByWeaponKey = new Map(
    Array.from(detail.enabledByWeaponKey).filter(([key]) => currentKeys.has(key)),
  );
  detail.open = true;
  $("weapon-detail-overlay").hidden = false;
  document.body.classList.add("weapon-detail-open");
  renderWeaponDetail();
  $("close-weapon-detail").focus();
}

function closeWeaponDetail() {
  if (!state.weaponDetail.open) return;
  state.weaponDetail.open = false;
  $("weapon-detail-overlay").hidden = true;
  document.body.classList.remove("weapon-detail-open");
  $("open-weapon-detail")?.focus();
}

function simulationScenarioDefinition() {
  return SIMULATION_SCENARIOS[state.simulation.scenarioId] || SIMULATION_SCENARIOS.free;
}

function simulationDurationMs() {
  return simulationScenarioDefinition().durationMs;
}

function simulationElapsedMs(now = performance.now()) {
  if (state.simulation.startedAt === null) return 0;
  const elapsedMs = Math.max(0, now - state.simulation.startedAt);
  const durationMs = simulationDurationMs();
  return durationMs === null ? elapsedMs : Math.min(durationMs, elapsedMs);
}

function simulationTargetVisibleAt(now = performance.now()) {
  const simulation = state.simulation;
  if (simulation.startedAt === null) return true;
  const scenario = simulationScenarioDefinition();
  if (scenario.hiddenMs <= 0) return true;
  const cycleMs = scenario.visibleMs + scenario.hiddenMs;
  return simulationElapsedMs(now) % cycleMs < scenario.visibleMs;
}

function renderSimulationScenario(now = performance.now()) {
  const simulation = state.simulation;
  const elapsedMs = simulationElapsedMs(now);
  const durationMs = simulationDurationMs();
  const stage = $("simulation-target-stage");
  stage.classList.toggle("target-visible", simulation.targetVisible);
  stage.classList.toggle("target-hidden", !simulation.targetVisible);
  stage.classList.toggle("scenario-finished", simulation.finished);
  const status = simulation.finished
    ? t("simulation.scenarioComplete")
    : t(simulation.targetVisible ? "simulation.targetVisible" : "simulation.targetHidden");
  $("simulation-scenario-time").textContent = durationMs === null
    ? t("simulation.noTimeLimit")
    : `${(Math.max(0, durationMs - elapsedMs) / 1000).toFixed(1)}s`;
  stage.setAttribute("aria-label", status);
  document.querySelectorAll('input[name="simulation-scenario"]').forEach((input) => {
    const selected = input.value === simulation.scenarioId;
    input.checked = selected;
    input.closest(".simulation-scenario-option")?.classList.toggle("active", selected);
  });
}

function updateSimulationScenario(now = performance.now()) {
  const simulation = state.simulation;
  const elapsedMs = simulationElapsedMs(now);
  const durationMs = simulationDurationMs();
  simulation.finished = durationMs !== null
    && simulation.startedAt !== null
    && elapsedMs >= durationMs;
  simulation.targetVisible = simulationTargetVisibleAt(now);
  renderSimulationScenario(now);
}

function finishSimulationRun() {
  const simulation = state.simulation;
  simulation.finished = true;
  simulation.heldGroups.clear();
  simulation.pointerGroups.clear();
  simulation.continuousFireAt.clear();
  simulation.groupFiringUntil.clear();
  simulation.lastHitEffectAt.clear();
  simulation.pendingHitEffectDamage.clear();
  simulation.activeBurns.clear();
  simulation.pendingShots.length = 0;
  renderSimulationGroupStatus();
}

function resetSimulationRun() {
  const simulation = state.simulation;
  simulation.heldGroups.clear();
  simulation.pointerGroups.clear();
  simulation.nextFireAt.clear();
  simulation.cooldownStartAt.clear();
  simulation.jamStartsAt.clear();
  simulation.jammedUntil.clear();
  simulation.pendingShots.length = 0;
  simulation.groupFiringUntil.clear();
  simulation.lastHitEffectAt.clear();
  simulation.pendingHitEffectDamage.clear();
  simulation.activeBurns.clear();
  simulation.continuousFireAt.clear();
  simulation.totalDamage = 0;
  simulation.currentHeat = 0;
  simulation.overheated = false;
  simulation.targetVisible = true;
  simulation.finished = false;
  simulation.lastHeatUpdateAt = null;
  simulation.startedAt = null;
  if (simulation.frameId !== null) cancelAnimationFrame(simulation.frameId);
  simulation.frameId = null;
  document.querySelectorAll(".simulation-hit-effect, .simulation-damage-event").forEach((effect) => effect.remove());
  renderSimulationMetrics();
  renderSimulationScenario();
  renderSimulationGroupStatus();
}

function renderSimulationMetrics(now = performance.now()) {
  const simulation = state.simulation;
  const elapsed = simulationElapsedMs(now) / 1000;
  $("simulation-elapsed").textContent = `${elapsed.toFixed(2)}s`;
  $("simulation-damage").textContent = simulation.totalDamage.toFixed(2);
  $("simulation-dps").textContent = (elapsed > 0 ? simulation.totalDamage / elapsed : 0).toFixed(2);
  renderSimulationCooldowns(now);
  renderSimulationHeat();
  renderSimulationEnemyHud(now);
}

function renderSimulationHeat() {
  const simulation = state.simulation;
  const ratio = simulation.maxHeat > 0 ? Math.max(0, simulation.currentHeat / simulation.maxHeat) : 0;
  const fillRatio = Math.min(1, ratio);
  const percent = ratio * 100;
  const netCoolingRate = simulationNetCoolingRate();
  const heatRateText = netCoolingRate >= 0
    ? `-${fmt(netCoolingRate, 2)}/s`
    : `+${fmt(-netCoolingRate, 2)}/s`;
  $("simulation-heat-label").textContent = simulation.overheated
    ? `${t("simulation.heat")} | ${t("simulation.overheated")}`
    : t("simulation.heat");
  $("simulation-heat-value").textContent = `${simulation.currentHeat.toFixed(1)} / ${fmt(simulation.maxHeat, 1)}`;
  $("simulation-heat-rate").textContent = heatRateText;
  $("simulation-heat-percent").textContent = `${percent.toFixed(1)}%`;
  $("simulation-heat-fill").style.transform = `scaleX(${fillRatio})`;
  $("simulation-heat-gauge").classList.toggle("overheated", simulation.overheated);
  const bar = $("simulation-heat-fill").parentElement;
  bar.setAttribute("aria-valuemax", "100");
  bar.setAttribute("aria-valuenow", String(Math.round(Math.min(100, percent))));
  bar.setAttribute(
    "aria-valuetext",
    `${simulation.currentHeat.toFixed(1)} / ${fmt(simulation.maxHeat, 1)}, ${simulation.overheated ? `${t("simulation.overheated")}, ` : ""}${percent.toFixed(1)}%`,
  );
}

function addSimulationHeat(weapon, shotCount = 1) {
  state.simulation.currentHeat += number(weapon.heat) * shotCount;
}

function ghostHeatHslBonus(item, quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild)) {
  return collectWeaponQuirkEffects(item, quirks).totals.hslBonus;
}

function ghostHeatWeaponExtra(item, weaponCount, heat = itemHeat(item), hslBonus = 0) {
  const stats = item?.stats || {};
  const threshold = Math.trunc(number(stats.minheatpenaltylevel));
  const activationThreshold = threshold + Math.max(0, Math.trunc(number(hslBonus)));
  const penalty = Math.max(0, number(stats.heatpenalty)) / 100;
  const lastSupportedCount = GHOST_HEAT_LEVEL_MULTIPLIERS.length - 1;
  const cappedCount = Math.min(Math.max(0, Math.trunc(weaponCount)), lastSupportedCount);
  if (threshold < 1 || cappedCount < activationThreshold || !(penalty > 0) || !(heat > 0)) return 0;
  let scale = 0;
  // HSL delays activation only. Once active, retain every original escalation level through the current weapon count.
  for (let count = threshold; count <= cappedCount; count += 1) {
    scale += GHOST_HEAT_LEVEL_MULTIPLIERS[count] || 0;
  }
  return heat * penalty * scale;
}

function ghostHeatGroupKey(item) {
  const sharedGroupId = Math.trunc(number(item?.stats?.heatPenaltyID));
  if (sharedGroupId > 0) return `shared:${sharedGroupId}`;
  if (ghostHeatWeaponExtra(item, 12) <= 0) return "";
  const weaponKey = normalizeLookupKey(item?.name).replace(/artemis$/, "");
  return weaponKey ? `singleton:${weaponKey}` : "";
}

function ghostHeatForSimulationWeapons(weapons) {
  const groups = new Map();
  weapons.forEach((weapon) => {
    const groupKey = ghostHeatGroupKey(weapon.item);
    if (!groupKey) return;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(weapon);
  });
  let total = 0;
  for (const groupWeapons of groups.values()) {
    const weaponCount = groupWeapons.length;
    total += groupWeapons.reduce((highest, weapon) => Math.max(
      highest,
      ghostHeatWeaponExtra(
        weapon.item,
        weaponCount,
        weapon.ghostHeatBase ?? itemHeat(weapon.item),
        weapon.ghostHeatHslBonus ?? ghostHeatHslBonus(weapon.item),
      ),
    ), 0);
  }
  return total;
}

function mechlabGhostHeatWarnings() {
  const groups = new Map();
  const quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild);
  installedMechItems("weapon").forEach((item) => {
    const groupKey = ghostHeatGroupKey(item);
    if (!groupKey) return;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  });
  const warnings = [];
  for (const [groupKey, weapons] of groups) {
    const weaponCount = weapons.length;
    const extraHeat = weapons.reduce((highest, item) => Math.max(
      highest,
      ghostHeatWeaponExtra(item, weaponCount, itemHeat(item), ghostHeatHslBonus(item, quirks)),
    ), 0);
    if (!(extraHeat > 0)) continue;
    const weaponHeat = weapons.reduce(
      (sum, item) => sum + Math.max(0, simulationWeaponHeat(item, quirks)),
      0,
    );
    const counts = new Map();
    weapons.forEach((item) => {
      const name = item.display_name || item.name || "WEAPON";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    warnings.push({
      groupKey,
      extraHeat,
      weaponHeat,
      totalHeat: weaponHeat + extraHeat,
      weapons: Array.from(counts, ([name, count]) => `${name} ×${count}`).join(" + "),
    });
  }
  return warnings.sort((left, right) => left.groupKey.localeCompare(right.groupKey, undefined, { numeric: true }));
}

function renderMechlabGhostHeatWarning() {
  const warning = $("ghost-heat-warning");
  if (!warning) return;
  const warnings = state.selectedMech && state.currentBuild ? mechlabGhostHeatWarnings() : [];
  warning.hidden = !warnings.length;
  warning.setAttribute("aria-label", t("mechlab.ghostHeatWarning"));
}

function addSimulationGhostHeat(shots) {
  const simulation = state.simulation;
  const weaponByKey = new Map(simulation.weapons.map((weapon) => [weapon.key, weapon]));
  const simultaneousGroups = new Map();
  shots.filter((shot) => shot.ghostHeat).forEach((shot) => {
    const weapon = weaponByKey.get(shot.weaponKey);
    const groupKey = ghostHeatGroupKey(weapon?.item);
    if (!weapon || !groupKey) return;
    const eventKey = `${shot.at}:${groupKey}`;
    if (!simultaneousGroups.has(eventKey)) simultaneousGroups.set(eventKey, new Map());
    simultaneousGroups.get(eventKey).set(weapon.key, weapon);
  });
  for (const weaponsByKey of simultaneousGroups.values()) {
    const weapons = Array.from(weaponsByKey.values());
    const extraHeat = weapons.reduce((highest, weapon) => Math.max(
      highest,
      ghostHeatWeaponExtra(
        weapon.item,
        weapons.length,
        weapon.ghostHeatBase,
        weapon.ghostHeatHslBonus,
      ),
    ), 0);
    simulation.currentHeat += extraHeat;
  }
}

function simulationNetCoolingRate() {
  const simulation = state.simulation;
  const temperatureModifier = SIMULATION_MAP_COOLING_MODIFIERS[simulation.mapTemperature]
    ?? SIMULATION_MAP_COOLING_MODIFIERS.normal;
  const movementHeat = simulation.movementState === "moving"
    ? SIMULATION_MOVEMENT_HEAT_PER_SECOND
    : 0;
  return simulation.coolingRate + temperatureModifier - movementHeat;
}

function coolSimulationHeat(now) {
  const simulation = state.simulation;
  if (simulation.lastHeatUpdateAt === null) {
    simulation.lastHeatUpdateAt = now;
    return;
  }
  const elapsed = Math.max(0, (now - simulation.lastHeatUpdateAt) / 1000);
  simulation.currentHeat = Math.max(0, simulation.currentHeat - simulationNetCoolingRate() * elapsed);
  if (simulation.overheated && simulation.currentHeat < simulation.maxHeat) simulation.overheated = false;
  simulation.lastHeatUpdateAt = now;
}

function applySimulationOverheat() {
  const simulation = state.simulation;
  if (simulation.overheated || simulation.currentHeat < simulation.maxHeat) return;
  simulation.overheated = true;
  simulation.heldGroups.clear();
  simulation.continuousFireAt.clear();
  if (simulation.endOnOverheat) {
    finishSimulationRun();
    renderSimulationScenario();
  }
  renderSimulationHeat();
  renderSimulationGroupStatus();
}

function renderSimulationCooldowns(now = performance.now()) {
  const weaponsByKey = new Map(state.simulation.weapons.map((weapon) => [weapon.key, weapon]));
  document.querySelectorAll("[data-simulation-cooldown]").forEach((bar) => {
    const weapon = weaponsByKey.get(bar.dataset.simulationCooldown);
    if (!weapon) return;
    const nextFire = state.simulation.nextFireAt.get(weapon.key) || 0;
    const remaining = Math.max(0, nextFire - now);
    const cooldownStart = state.simulation.cooldownStartAt.get(weapon.key) ?? nextFire;
    const totalCooldown = Math.max(0, nextFire - cooldownStart);
    const jamStart = state.simulation.jamStartsAt.get(weapon.key) || 0;
    const jammedUntil = state.simulation.jammedUntil.get(weapon.key) || 0;
    const jammed = now >= jamStart && now < jammedUntil;
    const progress = !nextFire || remaining <= 0
      ? 1
      : totalCooldown > 0 && now >= cooldownStart
        ? Math.max(0, Math.min(1, (now - cooldownStart) / totalCooldown))
        : 0;
    bar.style.transform = `scaleX(${progress})`;
    bar.parentElement.classList.toggle("ready", progress >= 1 && !jammed);
    bar.parentElement.classList.toggle("jammed", jammed);
    bar.parentElement.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
    const jamLabel = bar.parentElement.querySelector("[data-simulation-jam]");
    if (jamLabel) jamLabel.hidden = !jammed;
  });
}

function renderSimulationEnemyHud(now = performance.now()) {
  const simulation = state.simulation;
  const totalDamage = $("simulation-enemy-total-damage");
  if (totalDamage) totalDamage.textContent = simulation.totalDamage.toFixed(2);

  const heatRatio = simulation.maxHeat > 0
    ? Math.max(0, Math.min(1, simulation.currentHeat / simulation.maxHeat))
    : 0;
  const heatFill = $("simulation-enemy-heat-fill");
  if (heatFill) heatFill.style.transform = `scaleY(${heatRatio})`;
  $("simulation-enemy-heat")?.classList.toggle("overheated", simulation.overheated);

  document.querySelectorAll("[data-simulation-enemy-group]").forEach((row) => {
    const group = Number(row.dataset.simulationEnemyGroup);
    const weapons = simulation.weapons.filter((weapon) => simulationWeaponInGroup(weapon, group));
    let selectedWeapon = null;
    let shortestRemaining = Number.POSITIVE_INFINITY;
    weapons.forEach((weapon) => {
      const remaining = weapon.continuous
        ? 0
        : Math.max(0, (simulation.nextFireAt.get(weapon.key) || 0) - now);
      if (remaining < shortestRemaining) {
        shortestRemaining = remaining;
        selectedWeapon = weapon;
      }
    });
    let progress = 0;
    if (selectedWeapon) {
      if (selectedWeapon.continuous || shortestRemaining <= 0) {
        progress = 1;
      } else {
        const nextFire = simulation.nextFireAt.get(selectedWeapon.key) || 0;
        const cooldownStart = simulation.cooldownStartAt.get(selectedWeapon.key) ?? nextFire;
        const totalCooldown = Math.max(0, nextFire - cooldownStart);
        progress = totalCooldown > 0 && now >= cooldownStart
          ? Math.max(0, Math.min(1, (now - cooldownStart) / totalCooldown))
          : 0;
      }
    }
    row.classList.toggle("ready", Boolean(selectedWeapon) && progress >= 1);
    row.classList.toggle("unassigned", !selectedWeapon);
    const fill = row.querySelector("b i");
    if (fill) fill.style.transform = `scaleX(${progress})`;
  });
}

function normalizeSimulationGroups(value, fallbackGroup = null) {
  const values = value instanceof Set
    ? Array.from(value)
    : Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const groups = new Set(
    values
      .map((group) => Number(group))
      .filter((group) => Number.isInteger(group) && group >= 1 && group <= 4),
  );
  if (!groups.size && fallbackGroup >= 1 && fallbackGroup <= 4) groups.add(fallbackGroup);
  return groups;
}

function simulationGroupsForWeapon(weapon) {
  if (!state.simulation.assignments.has(weapon.key)) return new Set([1]);
  return normalizeSimulationGroups(state.simulation.assignments.get(weapon.key));
}

function simulationWeaponInGroup(weapon, group) {
  return simulationGroupsForWeapon(weapon).has(group);
}

function simulationWeaponIsHeld(weapon) {
  for (const group of simulationGroupsForWeapon(weapon)) {
    if (state.simulation.heldGroups.has(group)) return true;
  }
  return false;
}

function markSimulationWeaponFiring(weapon, firedAt, durationMs = 0) {
  const simulation = state.simulation;
  const firingUntil = firedAt + Math.max(SIMULATION_GROUP_FIRE_INDICATOR_MS, durationMs);
  for (const group of simulationGroupsForWeapon(weapon)) {
    if (!simulation.heldGroups.has(group)) continue;
    simulation.groupFiringUntil.set(
      group,
      Math.max(simulation.groupFiringUntil.get(group) || 0, firingUntil),
    );
  }
}

function simulationGroupVisualState(group, now = performance.now()) {
  const simulation = state.simulation;
  const weapons = simulation.weapons.filter((weapon) => simulationWeaponInGroup(weapon, group));
  const ready = !simulation.finished
    && !simulation.overheated
    && weapons.some((weapon) => (
      weapon.continuous
        ? !simulation.continuousFireAt.has(weapon.key)
        : (simulation.nextFireAt.get(weapon.key) || 0) <= now
    ));
  if (ready) return "ready";
  if ((simulation.groupFiringUntil.get(group) || 0) > now) return "firing";
  if (simulation.heldGroups.has(group)) return "held";
  return "";
}

function updateSimulationGroupStatus(now = performance.now()) {
  document.querySelectorAll("[data-simulation-fire-group]").forEach((button) => {
    const group = Number(button.dataset.simulationFireGroup);
    const visualState = simulationGroupVisualState(group, now);
    button.classList.toggle("ready", visualState === "ready");
    button.classList.toggle("firing", visualState === "firing");
    button.classList.toggle("held", visualState === "held");
    button.setAttribute("aria-pressed", String(state.simulation.heldGroups.has(group)));
  });
}

function renderSimulationGroupStatus(now = performance.now()) {
  $("simulation-group-status").innerHTML = [1, 2, 3, 4].map((group) => {
    const count = state.simulation.weapons.filter((weapon) => simulationWeaponInGroup(weapon, group)).length;
    const visualState = simulationGroupVisualState(group, now);
    const held = state.simulation.heldGroups.has(group);
    return `
      <button
        class="simulation-group-key ${visualState}"
        type="button"
        data-simulation-fire-group="${group}"
        aria-label="${t("simulation.group")} ${group}"
        aria-pressed="${held}"
      ><strong>${group}</strong><span>${count}</span></button>
    `;
  }).join("");
}

function renderSimulationWeaponList() {
  const list = $("simulation-weapon-list");
  if (!state.simulation.weapons.length) {
    list.innerHTML = `<div class="simulation-empty">${t("simulation.noWeapons")}</div>`;
    return;
  }
  list.innerHTML = state.simulation.weapons.map((weapon) => {
    const selectedGroups = simulationGroupsForWeapon(weapon);
    const groupButtons = [1, 2, 3, 4].map((group) => `
      <label class="simulation-group-option ${selectedGroups.has(group) ? "active" : ""}">
        <input type="checkbox" name="simulation-group-${weapon.key}" value="${group}" data-simulation-weapon="${weapon.key}" ${selectedGroups.has(group) ? "checked" : ""}>
        <span>${group}</span>
      </label>
    `).join("");
    const displayedDamage = weapon.continuous
      ? (state.simulation.applySplashDamage ? weapon.damagePerSecond : weapon.directDamagePerSecond)
      : (state.simulation.applySplashDamage ? weapon.damage : weapon.directDamage);
    return `
      <div class="simulation-weapon-row">
        <div class="simulation-weapon-name ${equipmentHardpointType(weapon.item)}">
          <div class="simulation-weapon-title">
            <strong>${weapon.item.display_name || weapon.item.name}</strong>
            <span>H ${fmt(weapon.heat, 1)}</span>
          </div>
        </div>
        <div class="simulation-cooldown ready" role="progressbar" aria-label="${t("simulation.cooldown")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
          <i data-simulation-cooldown="${weapon.key}" style="transform:scaleX(1)"></i>
          <b data-simulation-jam hidden>JAM</b>
        </div>
        <span>${fmt(displayedDamage, 1)}${weapon.continuous ? "/s" : ""}</span>
        <span>${weapon.cycle.toFixed(2)}s</span>
        <div class="simulation-group-options">${groupButtons}</div>
      </div>
    `;
  }).join("");
}

function openSimulation() {
  if (!state.selectedMech || !state.currentBuild) return;
  const simulation = state.simulation;
  simulation.weapons = collectSimulationWeapons();
  const previousAssignments = new Map(simulation.assignments);
  simulation.assignments.clear();
  simulation.weapons.forEach((weapon) => {
    const savedGroups = Array.isArray(weapon.entry?.weapon_groups)
      ? normalizeSimulationGroups(weapon.entry.weapon_groups)
      : null;
    const savedGroup = Number(weapon.entry?.weapon_group);
    const previousGroups = previousAssignments.has(weapon.key)
      ? normalizeSimulationGroups(previousAssignments.get(weapon.key))
      : null;
    const groups = savedGroups
      ?? (savedGroup >= 1 && savedGroup <= 4
        ? new Set([savedGroup])
        : previousGroups ?? new Set([1]));
    simulation.assignments.set(weapon.key, groups);
  });
  const heatSystem = simulationHeatSystem();
  simulation.maxHeat = heatSystem.maxHeat;
  simulation.coolingRate = heatSystem.coolingRate;
  simulation.heatSinkCount = heatSystem.heatSinkCount;
  simulation.open = true;
  $("simulation-movement-state").value = simulation.movementState;
  $("simulation-map-temperature").value = simulation.mapTemperature;
  $("simulation-target-distance").value = String(simulation.targetDistance);
  $("simulation-apply-splash").checked = simulation.applySplashDamage;
  $("simulation-end-on-overheat").checked = simulation.endOnOverheat;
  resetSimulationRun();
  renderSimulationWeaponList();
  renderSimulationGroupStatus();
  $("simulation-overlay").hidden = false;
  document.body.classList.add("simulation-open");
  $("close-simulation").focus();
}

function closeSimulation() {
  const simulation = state.simulation;
  if (!simulation.open) return;
  simulation.open = false;
  simulation.heldGroups.clear();
  simulation.pointerGroups.clear();
  simulation.continuousFireAt.clear();
  simulation.lastHitEffectAt.clear();
  simulation.pendingHitEffectDamage.clear();
  if (simulation.frameId !== null) cancelAnimationFrame(simulation.frameId);
  simulation.frameId = null;
  $("simulation-overlay").hidden = true;
  document.body.classList.remove("simulation-open");
  $("open-simulation").focus();
}

function showSimulationDamageEvent(damage) {
  if (!(damage > 0)) return;
  const container = $("simulation-enemy-damage-events");
  if (!container) return;
  const event = document.createElement("span");
  event.className = "simulation-damage-event";
  event.textContent = `+${damage.toFixed(2)}`;
  event.style.setProperty("--damage-offset", `${(Math.random() - 0.5) * 2.4}rem`);
  container.append(event);
  event.addEventListener("animationend", () => event.remove(), { once: true });
  window.setTimeout(() => event.remove(), 900);
}

function showSimulationHitEffect(weapon, damage = 0) {
  const figure = document.querySelector(".simulation-enemy-figure");
  if (!figure) return;
  showSimulationDamageEvent(damage);
  const weaponType = equipmentHardpointType(weapon.item);
  const category = ["energy", "ballistic", "missile"].includes(weaponType)
    ? weaponType
    : "other";
  const effect = document.createElement("i");
  effect.className = `simulation-hit-effect ${category}`;
  effect.style.left = `${12 + Math.random() * 76}%`;
  effect.style.top = `${8 + Math.random() * 78}%`;
  figure.append(effect);
  effect.addEventListener("animationend", () => effect.remove(), { once: true });
  window.setTimeout(() => effect.remove(), 600);

  if (
    typeof figure.animate !== "function"
    || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) return;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const distance = 1.5 + Math.random() * 1.5;
  figure.animate([
    { transform: "translate(0, 0) rotate(0deg)" },
    { transform: `translate(${direction * distance}px, -1px) rotate(${direction * 1.2}deg)`, offset: 0.25 },
    { transform: `translate(${-direction * distance * 0.65}px, 0.6px) rotate(${-direction * 0.8}deg)`, offset: 0.55 },
    { transform: "translate(0, 0) rotate(0deg)" },
  ], {
    duration: 150,
    easing: "ease-out",
  });
}

function queueSimulationVolley(weapon, startsAt) {
  const shotCount = Math.max(1, weapon.shotCount);
  const volleySize = Math.max(1, weapon.volleySize);
  const eventCount = Math.max(1, weapon.eventCount ?? Math.ceil(shotCount / volleySize));
  for (let index = 0; index < eventCount; index += 1) {
    const eventShots = Math.min(volleySize, shotCount - index * volleySize);
    state.simulation.pendingShots.push({
      weaponKey: weapon.key,
      at: startsAt + index * weapon.shotDelay * 1000,
      shotFraction: eventShots / shotCount,
      ghostHeat: index === 0,
    });
  }
}

function scheduleSimulationWeaponCycle(weapon, triggerAt) {
  const simulation = state.simulation;
  const firesAt = triggerAt + weapon.chargeTime * 1000;
  if (weapon.duration > 0) {
    simulation.pendingShots.push({ weaponKey: weapon.key, at: firesAt, burn: true, ghostHeat: true });
    const cooldownStart = firesAt + weapon.duration * 1000;
    simulation.cooldownStartAt.set(weapon.key, cooldownStart);
    simulation.nextFireAt.set(weapon.key, cooldownStart + weapon.cooldown * 1000);
    return;
  }

  queueSimulationVolley(weapon, firesAt);
  const cooldownStart = firesAt + weapon.firingTime * 1000;
  simulation.cooldownStartAt.set(weapon.key, cooldownStart);
  let nextFireAt = cooldownStart + weapon.cooldown * 1000;

  if (weapon.ultra) {
    const jammed = Math.random() < weapon.jam.chance;
    if (jammed) {
      const jammedUntil = cooldownStart + weapon.jam.duration * 1000;
      simulation.jamStartsAt.set(weapon.key, cooldownStart);
      simulation.jammedUntil.set(weapon.key, jammedUntil);
      nextFireAt = Math.max(nextFireAt, jammedUntil);
    } else {
      simulation.jamStartsAt.delete(weapon.key);
      simulation.jammedUntil.delete(weapon.key);
      // The double-tap volley fires during the active cooldown and does not pause it.
      queueSimulationVolley(weapon, cooldownStart);
    }
  } else {
    simulation.jamStartsAt.delete(weapon.key);
    simulation.jammedUntil.delete(weapon.key);
  }
  simulation.nextFireAt.set(weapon.key, nextFireAt);
}

function processSimulationPendingShots(now) {
  const simulation = state.simulation;
  if (!simulation.pendingShots.length) return;
  const pending = [];
  const due = [];
  simulation.pendingShots
    .sort((left, right) => left.at - right.at)
    .forEach((shot) => {
      if (shot.at > now) {
        pending.push(shot);
        return;
      }
      due.push(shot);
    });
  addSimulationGhostHeat(due);
  due.forEach((shot) => {
    const weapon = simulation.weapons.find((entry) => entry.key === shot.weaponKey);
    if (!weapon) return;
    if (shot.burn) {
      startSimulationBurn(weapon, shot.at, now, simulation.targetVisible);
      return;
    }
    const damage = simulationWeaponDamage(weapon, shot.shotFraction);
    if (simulation.targetVisible && damage > 0) {
      simulation.totalDamage += damage;
      showSimulationHitEffect(weapon, damage);
    }
    addSimulationHeat(weapon, shot.shotFraction);
    markSimulationWeaponFiring(weapon, shot.at);
  });
  simulation.pendingShots = pending;
}

function startSimulationBurn(weapon, startedAt, now = startedAt, damageAllowed = state.simulation.targetVisible) {
  const durationMs = weapon.duration * 1000;
  const totalDamage = simulationWeaponDamage(weapon);
  markSimulationWeaponFiring(weapon, startedAt, durationMs);
  if (durationMs <= 0) {
    if (damageAllowed && totalDamage > 0) {
      state.simulation.totalDamage += totalDamage;
      showSimulationHitEffect(weapon, totalDamage);
    }
    addSimulationHeat(weapon);
    return;
  }
  const endsAt = startedAt + durationMs;
  const progress = Math.max(0, Math.min(1, (now - startedAt) / durationMs));
  const appliedDamage = totalDamage * progress;
  const totalHeat = number(weapon.heat);
  const appliedHeat = totalHeat * progress;
  const impactShown = damageAllowed && appliedDamage > 0;
  if (damageAllowed) {
    state.simulation.totalDamage += appliedDamage;
    if (impactShown) showSimulationHitEffect(weapon, totalDamage);
  }
  state.simulation.currentHeat += appliedHeat;
  if (progress < 1) {
    state.simulation.activeBurns.set(weapon.key, {
      startedAt,
      endsAt,
      appliedDamage,
      appliedHeat,
      totalDamage,
      totalHeat,
      impactShown,
    });
  }
}

function updateSimulationBurnDamage(now, damageAllowed = state.simulation.targetVisible) {
  for (const [weaponKey, burn] of state.simulation.activeBurns) {
    const duration = burn.endsAt - burn.startedAt;
    const progress = duration > 0
      ? Math.max(0, Math.min(1, (now - burn.startedAt) / duration))
      : 1;
    const targetDamage = burn.totalDamage * progress;
    const targetHeat = burn.totalHeat * progress;
    if (damageAllowed) {
      const appliedDamage = Math.max(0, targetDamage - burn.appliedDamage);
      state.simulation.totalDamage += appliedDamage;
      if (appliedDamage > 0 && !burn.impactShown) {
        const weapon = state.simulation.weapons.find((entry) => entry.key === weaponKey);
        if (weapon) showSimulationHitEffect(weapon, burn.totalDamage);
        burn.impactShown = true;
      }
    }
    state.simulation.currentHeat += Math.max(0, targetHeat - burn.appliedHeat);
    burn.appliedDamage = targetDamage;
    burn.appliedHeat = targetHeat;
    if (progress >= 1) state.simulation.activeBurns.delete(weaponKey);
  }
}

function updateSimulationContinuousDamage(now) {
  const simulation = state.simulation;
  const ghostHeatByGroup = new Map();
  for (const [weaponKey, lastUpdatedAt] of simulation.continuousFireAt) {
    const weapon = simulation.weapons.find((entry) => entry.key === weaponKey);
    if (!weapon || !simulationWeaponIsHeld(weapon) || simulation.finished || simulation.overheated) {
      simulation.continuousFireAt.delete(weaponKey);
      simulation.pendingHitEffectDamage.delete(weaponKey);
      continue;
    }
    const elapsed = Math.max(0, (now - lastUpdatedAt) / 1000);
    if (simulation.targetVisible) {
      const dealtDamage = simulationWeaponDamagePerSecond(weapon) * elapsed;
      simulation.totalDamage += dealtDamage;
      simulation.pendingHitEffectDamage.set(
        weapon.key,
        (simulation.pendingHitEffectDamage.get(weapon.key) || 0) + dealtDamage,
      );
      const lastImpactAt = simulation.lastHitEffectAt.get(weapon.key) || 0;
      if (elapsed > 0 && now - lastImpactAt >= SIMULATION_CONTINUOUS_HIT_EFFECT_INTERVAL_MS) {
        showSimulationHitEffect(weapon, simulation.pendingHitEffectDamage.get(weapon.key) || 0);
        simulation.pendingHitEffectDamage.set(weapon.key, 0);
        simulation.lastHitEffectAt.set(weapon.key, now);
      }
    }
    simulation.currentHeat += simulationWeaponHeatPerSecond(weapon) * elapsed;
    const ghostHeatGroup = ghostHeatGroupKey(weapon.item);
    if (ghostHeatGroup) {
      if (!ghostHeatByGroup.has(ghostHeatGroup)) ghostHeatByGroup.set(ghostHeatGroup, []);
      ghostHeatByGroup.get(ghostHeatGroup).push({ weapon, elapsed });
    }
    simulation.continuousFireAt.set(weaponKey, now);
  }
  for (const entries of ghostHeatByGroup.values()) {
    const extraHeat = entries.reduce((highest, { weapon, elapsed }) => Math.max(
      highest,
      ghostHeatWeaponExtra(
        weapon.item,
        entries.length,
        weapon.ghostHeatBasePerSecond,
        weapon.ghostHeatHslBonus,
      ) * elapsed,
    ), 0);
    simulation.currentHeat += extraHeat;
  }
}

function syncSimulationContinuousFire(now) {
  const simulation = state.simulation;
  simulation.weapons
    .filter((weapon) => weapon.continuous)
    .forEach((weapon) => {
      const shouldFire = !simulation.finished
        && !simulation.overheated
        && simulationWeaponIsHeld(weapon);
      if (shouldFire) {
        if (!simulation.continuousFireAt.has(weapon.key)) {
          simulation.continuousFireAt.set(weapon.key, now);
        }
        markSimulationWeaponFiring(weapon, now);
      } else {
        simulation.continuousFireAt.delete(weapon.key);
        simulation.pendingHitEffectDamage.delete(weapon.key);
      }
    });
}

function simulationTick(now) {
  const simulation = state.simulation;
  if (!simulation.open || simulation.startedAt === null || simulation.finished) {
    simulation.frameId = null;
    return;
  }
  const durationMs = simulationDurationMs();
  const endsAt = durationMs === null
    ? Number.POSITIVE_INFINITY
    : simulation.startedAt + durationMs;
  const tickNow = Math.min(now, endsAt);
  const targetWasVisible = simulation.targetVisible;
  coolSimulationHeat(tickNow);
  updateSimulationBurnDamage(tickNow, targetWasVisible);
  updateSimulationContinuousDamage(tickNow);
  processSimulationPendingShots(tickNow);
  applySimulationOverheat();
  if (!simulation.finished) updateSimulationScenario(tickNow);
  syncSimulationContinuousFire(tickNow);
  if (!simulation.finished && !simulation.overheated) {
    let scheduled = 0;
    while (scheduled < 100) {
      const ready = simulation.weapons
        .filter((weapon) => !weapon.continuous && simulationWeaponIsHeld(weapon))
        .map((weapon) => ({ weapon, at: simulation.nextFireAt.get(weapon.key) ?? tickNow }))
        .filter((entry) => entry.at <= tickNow);
      if (!ready.length) break;
      const earliest = Math.min(...ready.map((entry) => entry.at));
      const batch = ready.filter((entry) => Math.abs(entry.at - earliest) < 0.001);
      batch.forEach(({ weapon, at }) => scheduleSimulationWeaponCycle(weapon, at));
      scheduled += batch.length;
      processSimulationPendingShots(tickNow);
    }
  }
  applySimulationOverheat();
  if (tickNow >= endsAt) finishSimulationRun();
  renderSimulationMetrics(tickNow);
  renderSimulationScenario(tickNow);
  updateSimulationGroupStatus(tickNow);
  if (simulation.finished) {
    simulation.frameId = null;
  } else {
    simulation.frameId = requestAnimationFrame(simulationTick);
  }
}

function setSimulationGroupHeld(group, held) {
  const simulation = state.simulation;
  if (!simulation.open) return;
  if (simulation.finished) {
    simulation.heldGroups.delete(group);
    simulation.continuousFireAt.clear();
    renderSimulationGroupStatus();
    return;
  }
  if (held && simulation.overheated) return;
  const now = performance.now();
  const durationMs = simulationDurationMs();
  if (
    durationMs !== null
    && simulation.startedAt !== null
    && now >= simulation.startedAt + durationMs
  ) {
    simulationTick(now);
    return;
  }
  if (held) {
    if (simulation.heldGroups.has(group)) return;
    simulation.heldGroups.add(group);
    const groupWeapons = simulation.weapons.filter(
      (weapon) => simulationWeaponInGroup(weapon, group),
    );
    if (groupWeapons.length && simulation.startedAt === null) {
      simulation.startedAt = now;
      updateSimulationScenario(now);
    }
    coolSimulationHeat(now);
    groupWeapons.forEach((weapon) => {
      if (weapon.continuous) return;
      const nextFire = simulation.nextFireAt.get(weapon.key) || 0;
      if (nextFire <= now) {
        scheduleSimulationWeaponCycle(weapon, now);
      }
    });
    processSimulationPendingShots(now);
    syncSimulationContinuousFire(now);
    applySimulationOverheat();
    renderSimulationMetrics(now);
    renderSimulationScenario(now);
    if (simulation.startedAt !== null && simulation.frameId === null) {
      simulation.frameId = requestAnimationFrame(simulationTick);
    }
  } else {
    coolSimulationHeat(now);
    updateSimulationContinuousDamage(now);
    simulation.heldGroups.delete(group);
    syncSimulationContinuousFire(now);
    applySimulationOverheat();
    renderSimulationMetrics(now);
  }
  renderSimulationGroupStatus();
}

function filteredMechsForList() {
  const search = $("mech-search").value.trim().toLowerCase();
  return state.mechs.filter((mech) => mechMatchesListFilters(mech, search));
}

function activeChassisForList() {
  const firstCompareMech = compareMechs()[0];
  const browseMech = state.activeMainTab === "mechlab" && state.mechlabBrowseMode
    ? mechById(state.mechlabBrowseSelectionId)
    : null;
  return state.selectedChassis
    || browseMech?.chassis
    || (state.compareMode ? firstCompareMech?.chassis : state.selectedMech?.chassis)
    || "";
}

function findChassisGroupForCurrentList(chassis) {
  const grouped = groupMechsForList(filteredMechsForList());
  for (const weightClass of sortedClassNames(grouped)) {
    const group = chassisGroupsForWeight(grouped, weightClass).find((item) => item.chassis === chassis);
    if (group) return group;
  }
  return null;
}

function chassisGroupElement(chassis) {
  return Array.from($("mech-list").querySelectorAll(".chassis-group"))
    .find((element) => element.dataset.chassisGroup === chassis) || null;
}

function syncMechListActiveStates(activeChassis = activeChassisForList()) {
  const selectedMechId = state.activeMainTab === "mechlab" && state.mechlabBrowseMode
    ? state.mechlabBrowseSelectionId
    : state.selectedMech?.id;
  const compareIds = new Set(state.compareMechIds.map((id) => String(id)));
  $("mech-list").querySelectorAll(".chassis-group").forEach((group) => {
    const active = group.dataset.chassisGroup === activeChassis;
    group.classList.toggle("active", active);
    group.querySelector("[data-chassis]")?.classList.toggle("active", active);
  });
  $("mech-list").querySelectorAll("[data-mech]").forEach((button) => {
    const selected = state.compareMode
      ? compareIds.has(String(button.dataset.mech))
      : String(selectedMechId || "") === String(button.dataset.mech);
    button.classList.toggle("active", selected);
  });
}

function renderChassisGroupInPlace(chassis) {
  const element = chassisGroupElement(chassis);
  const group = findChassisGroupForCurrentList(chassis);
  if (!element || !group) return false;
  const activeChassis = activeChassisForList();
  element.outerHTML = state.largeMechList
    ? renderLargeChassisGroup(group, activeChassis)
    : renderSmallChassisGroup(group, activeChassis);
  syncMechListActiveStates(activeChassis);
  return true;
}

function renderLargeMechList(classNames, grouped, activeChassis) {
  $("mech-list").innerHTML = classNames
    .map((weightClass) => {
      const chassisGroups = chassisGroupsForWeight(grouped, weightClass);
      const count = chassisGroups.reduce((sum, group) => sum + group.variants.length, 0);
      return `
        <section class="class-section mech-card-section">
          <div class="class-heading">
            <strong>${WEIGHT_CLASS_LABELS[weightClass] || formatChassisName(weightClass)}</strong>
            <span>${t("list.chassisVariants", { chassis: chassisGroups.length, variants: count })}</span>
          </div>
          ${renderChassisSections(chassisGroups, activeChassis, true)}
        </section>
      `;
    })
    .join("");
}

function renderFactionSection(section, activeChassis, large, compactActions = false) {
  const listClass = large ? "chassis-list large-chassis-list" : "chassis-list";
  const groupHtml = section.groups.map((group) => large
    ? renderLargeChassisGroup(group, activeChassis)
    : renderSmallChassisGroup(group, activeChassis, compactActions)).join("");
  return `
    <section class="faction-section ${factionClass(section.faction)}">
      <div class="faction-heading ${factionClass(section.faction)}">
        <strong>${factionLabel(section.faction)}</strong>
        <span>${t("list.chassisVariants", { chassis: section.groups.length, variants: section.variantCount })}</span>
      </div>
      <div class="${listClass}">
        ${groupHtml}
      </div>
    </section>
  `;
}

function renderSmallChassisGroup(group, activeChassis, compactActions = false) {
  const active = group.chassis === activeChassis ? " active" : "";
  const expanded = state.expandedChassis.has(group.chassis);
  return `
    <div class="chassis-group ${factionClass(group.faction)}${active}${expanded ? " expanded" : ""}" data-chassis-group="${group.chassis}">
      <button class="chassis-row${active}" data-chassis="${group.chassis}" type="button" aria-expanded="${expanded}">
        <span class="row-title">
          <span class="chassis-title small-chassis-title"><span class="expand-indicator" aria-hidden="true">${expanded ? "-" : "+"}</span><strong>${group.label}</strong><span class="chassis-ton">${group.tons}t</span></span>
        </span>
        <span class="badge-line">
          <span class="badge">${t("list.variantCount", { count: group.variants.length })}</span>
        </span>
      </button>
      ${expanded ? `
        <div class="variant-list">
          ${group.variants.map((mech) => renderVariantRow(mech, compactActions)).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderVariantRow(mech, compactActions = false) {
  const isSelected = state.compareMode
    ? state.compareMechIds.some((id) => String(id) === String(mech.id))
    : state.selectedMech?.id === mech.id;
  const selected = isSelected ? " active" : "";
  const mechName = mech.display_name || variantCode(mech);
  const rowContent = `
    <span class="row-title">
      <span class="mech-title-main">${omnipodIcon(mech)}<strong>${escapeHtml(mechName)}</strong></span>
    </span>
    <span class="badge-line mech-slot-tags">${mechSlotBadges(mech)}</span>
  `;
  if (compactActions) {
    const atLimit = state.mechlabTabs.length >= MAX_MECHLAB_FITTING_TABS;
    return `
      <div class="mech-row variant-row compact-variant-row${selected}">
        <button class="compact-variant-select" data-mech="${mech.id}" type="button">
          ${rowContent}
        </button>
        <span class="compact-variant-actions">
          <button class="compact-variant-action compact-variant-add" data-add-compact-mech="${mech.id}" type="button" title="${escapeHtml(atLimit ? t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS }) : t("mechlab.addMechFitting", { mech: mechName }))}" aria-label="${escapeHtml(t("mechlab.addMechFitting", { mech: mechName }))}" ${atLimit ? "disabled" : ""}>+</button>
        </span>
      </div>
    `;
  }
  return `
    <button class="mech-row variant-row${selected}" data-mech="${mech.id}" type="button">
      ${rowContent}
    </button>
  `;
}

function renderLargeChassisGroup(group, activeChassis) {
  const active = group.chassis === activeChassis ? " active" : "";
  const expanded = state.expandedChassis.has(group.chassis);
  return `
    <div class="chassis-group ${factionClass(group.faction)}${active}${expanded ? " expanded" : ""}" data-chassis-group="${group.chassis}">
      <button class="chassis-row large-chassis-row${active}" data-chassis="${group.chassis}" type="button" aria-expanded="${expanded}">
        <span class="chassis-title">
          <span class="expand-indicator" aria-hidden="true">${expanded ? "-" : "+"}</span>
          <strong>${group.label}</strong>
        </span>
        <span class="large-chassis-ton">${group.tons}t</span>
        <span class="large-chassis-count">${group.variants.length}</span>
      </button>
      ${expanded ? `
        <div class="mech-card-grid">
          ${group.variants.map(renderMechCard).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderMechCard(mech) {
  const data = mechListSummary(mech);
  const selected = state.compareMode
    ? state.compareMechIds.some((id) => String(id) === String(mech.id))
    : state.selectedMech?.id === mech.id;
  const active = selected ? " active" : "";
  const durabilityBoosted = state.infoApplyQuirks && Math.abs(data.combinedTotal - data.baseCombinedTotal) >= 0.0001;
  const accelerationBoosted = state.infoApplyQuirks && Math.abs(data.movement.acceleration - data.baseMovement.acceleration) >= 0.0001;
  const decelerationBoosted = state.infoApplyQuirks && Math.abs(data.movement.deceleration - data.baseMovement.deceleration) >= 0.0001;
  const turnBoosted = state.infoApplyQuirks && Math.abs(data.movement.turnSpeed - data.baseMovement.turnSpeed) >= 0.0001;
  const iconSrc = mechIconSrc(mech);
  return `
    <button class="mech-card${active}" data-mech="${mech.id}" type="button">
      <span class="mech-card-media">
        <img src="${escapeHtml(iconSrc)}" alt="" loading="lazy" decoding="async">
      </span>
      <span class="mech-card-title">
        <strong>${omnipodIcon(mech)}<span>${escapeHtml(mech.display_name || variantCode(mech))}</span></strong>
      </span>
      <span class="mech-card-stats">
        <span><span>${t("info.durability")}</span><strong class="${durabilityBoosted ? "boosted" : ""}">${formatInfoNumber(data.combinedTotal, 0)}</strong></span>
        <span><span>${t("info.acceleration")}/${t("info.deceleration")}</span><strong><span class="${accelerationBoosted ? "boosted" : ""}">${formatInfoNumber(data.movement.acceleration, 0)}</span> / <span class="${decelerationBoosted ? "boosted" : ""}">${formatInfoNumber(data.movement.deceleration, 0)}</span></strong></span>
        <span><span>${t("info.turnSpeed")}</span><strong class="${turnBoosted ? "boosted" : ""}">${formatInfoNumber(data.movement.turnSpeed, 0)}</strong></span>
      </span>
      <span class="badge-line mech-slot-tags">${mechSlotBadges(mech)}</span>
    </button>
  `;
}

function equipmentInfoValue(value, digits = 1, suffix = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${formatInfoNumber(numeric, digits)}${suffix}`;
}

function equipmentInfoPercent(value, digits = 1) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && Math.abs(numeric) > 0.000001
    ? equipmentInfoValue(numeric * 100, digits, "%")
    : "-";
}

function equipmentInfoTable(title, columns, rows, tone = "", tableKey = tone) {
  const savedSort = state.equipmentInfoSortByTable.get(tableKey) || { key: "index", direction: "asc" };
  const activeSortKey = columns.some((column) => column.key === savedSort.key) ? savedSort.key : "index";
  const direction = savedSort.direction === "desc" ? "desc" : "asc";
  const sortedRows = [...rows].sort((left, right) => {
    const leftValue = left.values[activeSortKey];
    const rightValue = right.values[activeSortKey];
    let result;
    if (typeof leftValue === "number" || typeof rightValue === "number") {
      const leftMissing = !Number.isFinite(leftValue);
      const rightMissing = !Number.isFinite(rightValue);
      if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
      result = leftMissing ? 0 : leftValue - rightValue;
    } else {
      result = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, { numeric: true });
    }
    if (!result) return left.values.index - right.values.index;
    return direction === "desc" ? -result : result;
  });
  return `
    <section class="equipment-info-group ${tone}">
      <div class="equipment-info-group-title">
        <h3>${escapeHtml(title)}</h3>
        <span>${rows.length}</span>
      </div>
      <div class="equipment-info-table-wrap">
        <table class="equipment-info-table">
          <thead><tr>${columns.map((column) => {
            const active = column.key === activeSortKey;
            const indicator = active ? (direction === "asc" ? "▲" : "▼") : "";
            const ariaSort = active ? (direction === "asc" ? "ascending" : "descending") : "none";
            return `<th scope="col" aria-sort="${ariaSort}"><button class="equipment-info-sort-button${active ? " active" : ""}" type="button" data-equipment-info-table="${escapeHtml(tableKey)}" data-equipment-info-sort="${column.key}"><span>${escapeHtml(column.label)}</span><span class="equipment-info-sort-indicator" aria-hidden="true">${indicator}</span></button></th>`;
          }).join("")}</tr></thead>
          <tbody>${sortedRows.map((row) => `<tr>${columns.map((column, index) => `<${index === 1 ? "th scope=\"row\"" : "td"}>${row.htmlCells?.[column.key] ?? escapeHtml(row.cells[column.key])}</${index === 1 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function equipmentInfoWeaponTypeLabel(item) {
  const type = equipmentHardpointType(item);
  if (type === "ballistic") return t("stats.ballistic");
  if (type === "energy") return t("stats.energy");
  if (type === "missile") return t("stats.missile");
  if (type === "ams") return "AMS";
  return type.toUpperCase();
}

function weaponCriticalChanceValues(item) {
  if (item?.stats?.critChanceIncrease === undefined) return [];
  return String(item.stats.critChanceIncrease)
    .split(",")
    .map((value) => Number(value))
    .filter(Number.isFinite);
}

function weaponCriticalChanceText(item) {
  const values = weaponCriticalChanceValues(item);
  if (!values.some((value) => Math.abs(value) > 0.000001)) return "-";
  return values.map((value) => Math.abs(value + 1) < 0.0001 ? "X" : equipmentInfoValue(value * 100, 2, "%")).join(" / ");
}

function equipmentInfoWeaponRow(item, index) {
  const stats = item.stats || {};
  const ranges = weaponTooltipRanges(item);
  const timing = simulationWeaponTiming(item, [], []);
  const damageRate = weaponDamageRate(item, [], []);
  const usesPerSecondStats = Boolean(damageRate);
  const directDamage = weaponDirectDamage(item, []);
  const damage = usesPerSecondStats ? damageRate.base : directDamage;
  const damageRateMultiplier = usesPerSecondStats && directDamage > 0
    ? damage / directDamage
    : 1;
  const splashDamage = weaponSplashDamage(item, []) * 2 * damageRateMultiplier;
  const totalDamage = damage + splashDamage;
  const triggerTotalDamage = weaponTotalDamage(item, true, []);
  const heat = itemHeat(item);
  const expectedCooldown = weaponExpectedCooldown(item, [], []) ?? timing.cooldown;
  const cycle = weaponExpectedCooldown(item, [], []) ?? timing.cycle;
  const dph = heat > 0
    ? (isContinuousPerSecondWeapon(item) ? totalDamage : triggerTotalDamage) / heat
    : Number.NaN;
  const spread = weaponSpreadValues(item, [], [])?.final ?? Number.NaN;
  const spreadDirect = weaponSpreadValues(item, [], [], "spreadLOS")?.final ?? Number.NaN;
  const velocityDirect = weaponDirectVelocity(item) ?? Number.NaN;
  const criticalChanceValues = weaponCriticalChanceValues(item);
  const criticalChance = criticalChanceValues.find((value) => Math.abs(value) > 0.000001) ?? Number.NaN;
  const criticalDamage = Number(stats.critDamMult);
  const jam = ultraAutoCannonJamStats(item, []);
  const dps = usesPerSecondStats
    ? totalDamage
    : (expectedCooldown > 0 ? totalDamage / expectedCooldown : Number.NaN);
  const hps = heat > 0
    ? (isContinuousPerSecondWeapon(item) ? heat : heat / cycle)
    : Number.NaN;
  const perSecondUnit = usesPerSecondStats ? "/s" : "";
  const name = item.display_name || item.name || "-";
  const health = Number(stats.Health ?? stats.health);
  return {
    values: {
      index,
      name,
      weaponType: equipmentHardpointType(item),
      damage: totalDamage,
      heat,
      cooldown: timing.cooldown,
      expectedCooldown,
      duration: number(stats.duration) > 0 ? timing.duration : Number.POSITIVE_INFINITY,
      spread,
      spreadDirect,
      optimalRange: Number(ranges.optimalRange),
      maxRange: Number(ranges.maxRange),
      velocity: number(stats.speed) > 0 ? number(stats.speed) : Number.POSITIVE_INFINITY,
      velocityDirect,
      dps,
      hps,
      dph,
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      health,
      faction: equipmentInfoFactionOrder(item),
      criticalChance,
      criticalDamage,
      jamChance: jam.baseChance > 0 ? jam.baseChance : Number.NaN,
      jamDuration: jam.baseDuration > 0 ? jam.baseDuration : Number.NaN,
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      weaponType: equipmentInfoWeaponTypeLabel(item),
      damage: splashDamage > 0
        ? `${equipmentInfoValue(damage, 2, perSecondUnit)} + ${equipmentInfoValue(splashDamage, 2, perSecondUnit)}`
        : equipmentInfoValue(damage, 2, perSecondUnit),
      heat: equipmentInfoValue(heat, 2, isContinuousPerSecondWeapon(item) ? "/s" : ""),
      cooldown: equipmentInfoValue(timing.cooldown, 2, "s"),
      expectedCooldown: equipmentInfoValue(expectedCooldown, 2, "s"),
      duration: number(stats.duration) > 0 ? equipmentInfoValue(timing.duration, 2, "s") : "-",
      spread: Number.isFinite(spread) ? equipmentInfoValue(spread, 2) : "-",
      spreadDirect: Number.isFinite(spreadDirect) ? equipmentInfoValue(spreadDirect, 2) : "-",
      optimalRange: equipmentInfoValue(ranges.optimalRange, 0, "m"),
      maxRange: equipmentInfoValue(ranges.maxRange, 0, "m"),
      velocity: number(stats.speed) > 0 ? equipmentInfoValue(stats.speed, 0, "m/s") : "-",
      velocityDirect: Number.isFinite(velocityDirect)
        ? equipmentInfoValue(velocityDirect, 1, "m/s")
        : "-",
      dps: equipmentInfoValue(dps, 2),
      hps: equipmentInfoValue(hps, 2),
      dph: equipmentInfoValue(dph, 2),
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      health: equipmentInfoValue(stats.Health ?? stats.health, 1),
      faction: factionLabel(item.faction),
      criticalChance: weaponCriticalChanceText(item),
      criticalDamage: Number.isFinite(criticalDamage) ? equipmentInfoValue(criticalDamage, 2, "x") : "-",
      jamChance: jam.baseChance > 0 ? equipmentInfoValue(jam.baseChance * 100, 2, "%") : "-",
      jamDuration: jam.baseDuration > 0 ? equipmentInfoValue(jam.baseDuration, 2, "s") : "-",
    },
  };
}

function moduleInfoBonuses(item) {
  let beamRange = 0;
  let projectileVelocity = 0;
  const criticalChance = [];
  (item.weapon_stat_filters || []).forEach((filter) => {
    const tag = normalizeLookupKey(filter.tag);
    if (tag.includes("beam")) {
      (filter.ranges || []).forEach((range) => {
        beamRange = Math.max(beamRange, number(range.multiplier, 1) - 1);
      });
    }
    if (tag.includes("projectile")) {
      (filter.weapon_stats || []).forEach((weaponStats) => {
        if (String(weaponStats.operation || "") === "*") {
          projectileVelocity = Math.max(projectileVelocity, number(weaponStats.speed, 1) - 1);
        }
      });
    }
    (filter.weapon_stats || []).forEach((weaponStats) => {
      if (String(weaponStats.operation || "") !== "+" || weaponStats.critChanceIncrease === undefined) return;
      String(weaponStats.critChanceIncrease).split(",").forEach((value, index) => {
        criticalChance[index] = Math.max(criticalChance[index] || 0, number(Number(value)));
      });
    });
  });
  return { beamRange, projectileVelocity, criticalChance };
}

function equipmentInfoPercentList(values, digits = 2) {
  return values.some((value) => Math.abs(number(value)) > 0.000001)
    ? values.map((value) => equipmentInfoValue(number(value) * 100, digits, "%")).join(" / ")
    : "-";
}

function equipmentInfoModuleSensorRangeBonus(item) {
  const standardBonus = targetEquipmentSensorRangeBonus(item);
  if (standardBonus > 0 || equipmentLimitGroup(item) === "active-probe") return standardBonus;
  if (!isEquipmentInfoTargetComputer(item)) return 0;
  const mark = Math.max(0, Math.trunc(number(item.stats?.slots)));
  return number(TARGET_COMPUTER_SENSOR_RANGE_BONUSES[mark]);
}

function equipmentInfoFactionOrder(item) {
  const faction = normalizeLookupKey(item?.faction);
  if (faction === "clan") return 0;
  if (faction === "innersphere") return 1;
  return 2;
}

function sortEquipmentInfoItems(left, right) {
  const factionDifference = equipmentInfoFactionOrder(left) - equipmentInfoFactionOrder(right);
  if (factionDifference) return factionDifference;
  return String(left.display_name).localeCompare(String(right.display_name), undefined, { numeric: true });
}

function equipmentInfoWeaponAmmoType(item) {
  if (item?.item_type !== "weapon") return "";
  const ammoType = String(item.stats?.ammoType || "");
  const artemisAmmoType = String(item.stats?.artemisAmmoType || "");
  if (number(item.stats?.alwaysHasArtemis) > 0) return ammoType || artemisAmmoType;
  if (artemisAmmoType && /_artemis$/i.test(String(item.name || ""))) {
    return artemisAmmoType;
  }
  return ammoType || artemisAmmoType;
}

function equipmentInfoAmmoWeapons(ammo, weapons = []) {
  const ammoType = normalizeLookupKey(ammo?.stats?.type);
  if (ammo?.item_type !== "ammo" || !ammoType) return [];
  return weapons
    .filter((weapon) => normalizeLookupKey(equipmentInfoWeaponAmmoType(weapon)) === ammoType)
    .sort((left, right) => (
      itemTons(left) - itemTons(right)
      || sortEquipmentInfoItems(left, right)
      || number(left.id) - number(right.id)
    ));
}

function equipmentInfoAmmoFireCount(ammo, weapon) {
  const perTrigger = weaponAmmoPerTrigger(weapon, []);
  if (!(perTrigger > 0)) return Number.NaN;
  return Math.floor(Math.max(0, number(ammo?.stats?.numShots)) / perTrigger);
}

function equipmentInfoAmmoWeaponTotalDamage(ammo, weapon) {
  return equipmentInfoAmmoWeaponDamageParts(ammo, weapon).total;
}

function equipmentInfoAmmoWeaponDamageParts(ammo, weapon) {
  const perTrigger = weaponAmmoPerTrigger(weapon, []);
  if (!(perTrigger > 0)) {
    return { direct: Number.NaN, splash: Number.NaN, total: Number.NaN };
  }
  const firingRatio = Math.max(0, number(ammo?.stats?.numShots)) / perTrigger;
  const direct = firingRatio * weaponDirectDamage(weapon, []);
  const splash = firingRatio * weaponSplashDamage(weapon, []) * 2;
  return { direct, splash, total: direct + splash };
}

function equipmentInfoAmmoDamageHtml(ammo, weapon) {
  const damage = equipmentInfoAmmoWeaponDamageParts(ammo, weapon);
  if (!Number.isFinite(damage.total)) return "-";
  const direct = escapeHtml(equipmentInfoValue(damage.direct, 2));
  if (!(damage.splash > 0)) return direct;
  return `${direct} <span class="equipment-info-splash">+ ${escapeHtml(equipmentInfoValue(damage.splash, 2))}</span>`;
}

function equipmentInfoAmmoTotalDamage(ammo, weapons = []) {
  const lightestWeapon = equipmentInfoAmmoWeapons(ammo, weapons)[0];
  if (!lightestWeapon) return Number.NaN;
  return equipmentInfoAmmoWeaponTotalDamage(ammo, lightestWeapon);
}

function equipmentInfoAmmoInternalDamageText(item) {
  if (!(number(item?.stats?.internalDamage) > 0)) return "-";
  return `${equipmentInfoValue(item?.stats?.internalDamage, 2)} x ${equipmentInfoValue(item?.stats?.numShots, 0)}`;
}

function equipmentInfoAmmoRow(item, index, weapons = []) {
  const stats = item.stats || {};
  const name = item.display_name || item.name || "-";
  const lightestWeapon = equipmentInfoAmmoWeapons(item, weapons)[0];
  const totalDamage = lightestWeapon
    ? equipmentInfoAmmoWeaponTotalDamage(item, lightestWeapon)
    : Number.NaN;
  return {
    values: {
      index,
      name,
      ammoCount: Number(stats.numShots),
      health: Number(stats.health),
      totalDamage,
      internalDamage: Number(stats.internalDamage),
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      ammoCount: equipmentInfoValue(stats.numShots, 0),
      health: equipmentInfoValue(stats.health, 1),
      totalDamage: equipmentInfoValue(totalDamage, 2),
      internalDamage: equipmentInfoAmmoInternalDamageText(item),
    },
    htmlCells: {
      totalDamage: lightestWeapon ? equipmentInfoAmmoDamageHtml(item, lightestWeapon) : "-",
    },
  };
}

function isEquipmentInfoArtemisAmmo(ammo) {
  return ammo?.item_type === "ammo" && /artemis$/i.test(String(ammo.stats?.type || ""));
}

function equipmentInfoAmmoCategory(ammo, weapons = []) {
  return equipmentHardpointType(equipmentInfoAmmoWeapons(ammo, weapons)[0]);
}

function equipmentInfoSharedAmmoLabel(ammo) {
  return String(ammo?.display_name || ammo?.name || "-")
    .replace(/\s*ammo$/i, "")
    .trim();
}

function equipmentInfoSharedAmmoGroups(ammoItems, weapons = []) {
  return [...ammoItems]
    .filter((ammo) => (
      Math.abs(itemTons(ammo) - 1) < 0.000001
      && !isEquipmentInfoArtemisAmmo(ammo)
    ))
    .sort(sortEquipmentInfoItems)
    .map((ammo) => {
      const matchingWeapons = equipmentInfoAmmoWeapons(ammo, weapons);
      if (matchingWeapons.length < 2) return null;
      const rows = matchingWeapons.map((weapon, weaponIndex) => {
        const index = weaponIndex + 1;
        const weaponName = weapon.display_name || weapon.name || "-";
        const fireCount = equipmentInfoAmmoFireCount(ammo, weapon);
        const totalDamage = equipmentInfoAmmoWeaponTotalDamage(ammo, weapon);
        return {
          values: { index, weaponName, fireCount, totalDamage },
          cells: {
            index: equipmentInfoValue(index, 0),
            weaponName,
            fireCount: equipmentInfoValue(fireCount, 0),
            totalDamage: equipmentInfoValue(totalDamage, 2),
          },
          htmlCells: {
            totalDamage: equipmentInfoAmmoDamageHtml(ammo, weapon),
          },
        };
      });
      return { ammo, rows };
    })
    .filter(Boolean);
}

function equipmentInfoSharedAmmoRows(ammoItems, weapons = []) {
  return equipmentInfoSharedAmmoGroups(ammoItems, weapons).flatMap((group) => group.rows);
}

function renderEquipmentInfoAmmo(items) {
  const ammoItems = items
    .filter((item) => (
      item?.item_type === "ammo"
      && Math.abs(itemTons(item) - 1) < 0.000001
      && !isEquipmentInfoArtemisAmmo(item)
    ))
    .sort(sortEquipmentInfoItems);
  const weapons = items.filter((item) => item?.item_type === "weapon");
  const ammoColumns = [
      { key: "index", label: "#" },
      { key: "name", label: t("equipmentInfo.name") },
      { key: "totalDamage", label: t("equipmentInfo.totalDamage") },
      { key: "ammoCount", label: t("equipmentInfo.ammoCount") },
      { key: "health", label: "HP" },
      { key: "internalDamage", label: t("equipmentInfo.internalDamage") },
  ];
  const ammoTables = [
    { key: "all", title: t("equipmentInfo.allAmmo"), items: ammoItems },
    {
      key: "missile",
      title: t("equipmentInfo.missileAmmo"),
      items: ammoItems.filter((ammo) => equipmentInfoAmmoCategory(ammo, weapons) === "missile"),
    },
    {
      key: "ballistic",
      title: t("equipmentInfo.ballisticAmmo"),
      items: ammoItems.filter((ammo) => equipmentInfoAmmoCategory(ammo, weapons) === "ballistic"),
    },
  ].map(({ key, title, items: tableItems }) => equipmentInfoTable(
    title,
    ammoColumns,
    tableItems.map((item, index) => equipmentInfoAmmoRow(item, index + 1, weapons)),
    `equipment-info-ammo equipment-info-ammo-${key}${["missile", "ballistic"].includes(key) ? ` equipment-info-${key}` : ""}`,
    `ammo-${key}`,
  ));
  const sharedTables = equipmentInfoSharedAmmoGroups(ammoItems, weapons).map(({ ammo, rows }) => (
    equipmentInfoTable(t("equipmentInfo.sharedAmmoTitle", {
      ammo: equipmentInfoSharedAmmoLabel(ammo),
    }), [
      { key: "index", label: "#" },
      { key: "weaponName", label: t("equipmentInfo.sharedWeapon") },
      { key: "fireCount", label: t("equipmentInfo.fireCount") },
      { key: "totalDamage", label: t("equipmentInfo.totalDamage") },
    ], rows, "equipment-info-shared-ammo", `shared-ammo-${ammo.id}`)
  ));
  return ammoTables.concat(sharedTables).join("");
}

function equipmentInfoModuleRow(item, index) {
  const stats = item.stats || {};
  const bonuses = moduleInfoBonuses(item);
  const sensorRange = equipmentInfoModuleSensorRangeBonus(item);
  const name = item.display_name || item.name || "-";
  return {
    values: {
      index,
      name,
      faction: equipmentInfoFactionOrder(item),
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      sensorRange: sensorRange || Number.POSITIVE_INFINITY,
      targetingTime: number(stats.gaintimeboost) || Number.POSITIVE_INFINITY,
      shutdownDetection: number(stats.mechdetectionrange) || Number.POSITIVE_INFINITY,
      beamRange: bonuses.beamRange || Number.POSITIVE_INFINITY,
      projectileVelocity: bonuses.projectileVelocity || Number.POSITIVE_INFINITY,
      criticalChance: bonuses.criticalChance[0] || Number.POSITIVE_INFINITY,
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      faction: factionLabel(item.faction),
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      sensorRange: equipmentInfoPercent(sensorRange),
      targetingTime: equipmentInfoPercent(stats.gaintimeboost),
      shutdownDetection: number(stats.mechdetectionrange) > 0 ? equipmentInfoValue(stats.mechdetectionrange, 0, "m") : "-",
      beamRange: equipmentInfoPercent(bonuses.beamRange),
      projectileVelocity: equipmentInfoPercent(bonuses.projectileVelocity),
      criticalChance: equipmentInfoPercentList(bonuses.criticalChance),
    },
  };
}

function equipmentInfoMascRow(item, index) {
  const stats = item.stats || {};
  const name = item.display_name || item.name || "-";
  const tonsMin = Number(stats.TonsMin);
  const tonsMax = Number(stats.TonsMax);
  return {
    values: {
      index,
      name,
      faction: equipmentInfoFactionOrder(item),
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      tonsRange: Number.isFinite(tonsMin) ? tonsMin : Number.POSITIVE_INFINITY,
      speedBoost: number(stats.BoostSpeed) || Number.POSITIVE_INFINITY,
      accelerationBoost: number(stats.BoostAccel) || Number.POSITIVE_INFINITY,
      decelerationBoost: number(stats.BoostDecel) || Number.POSITIVE_INFINITY,
      turnBoost: number(stats.BoostTurn) || Number.POSITIVE_INFINITY,
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      faction: factionLabel(item.faction),
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      tonsRange: Number.isFinite(tonsMin) && Number.isFinite(tonsMax)
        ? `${equipmentInfoValue(tonsMin, 0)}–${equipmentInfoValue(tonsMax, 0)}t`
        : "-",
      speedBoost: equipmentInfoPercent(stats.BoostSpeed),
      accelerationBoost: equipmentInfoPercent(stats.BoostAccel),
      decelerationBoost: equipmentInfoPercent(stats.BoostDecel),
      turnBoost: equipmentInfoPercent(stats.BoostTurn),
    },
  };
}

function equipmentInfoEcmRow(item, index) {
  const stats = item.stats || {};
  const targetingReduction = Math.max(0, 1 - number(stats.targetingfactor, 1));
  const lockOnReduction = Math.max(0, 1 - number(stats.weaponlockfactor, 1));
  const name = item.display_name || item.name || "-";
  return {
    values: {
      index,
      name,
      faction: equipmentInfoFactionOrder(item),
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      ecmRange: Number(stats.range),
      targetingReduction,
      lockOnReduction,
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      faction: factionLabel(item.faction),
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      ecmRange: equipmentInfoValue(stats.range, 0, "m"),
      targetingReduction: equipmentInfoPercent(targetingReduction),
      lockOnReduction: equipmentInfoPercent(lockOnReduction),
    },
  };
}

function equipmentInfoJumpJetRow(item, index) {
  const stats = item.stats || {};
  const tonsMin = Number(stats.minTons);
  const tonsMax = Number(stats.maxTons);
  const name = item.display_name || item.name || "-";
  return {
    values: {
      index,
      name,
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      tonsRange: Number.isFinite(tonsMin) ? tonsMin : Number.POSITIVE_INFINITY,
      duration: Number(stats.duration),
      cooldown: Number(stats.cooldown),
      initialThrust: Number(stats.boost_instant),
      verticalThrust: Number(stats.boost_z),
      forwardThrust: Number(stats.boost_fwd),
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      tonsRange: Number.isFinite(tonsMin) && Number.isFinite(tonsMax)
        ? `${equipmentInfoValue(tonsMin, 0)}–${equipmentInfoValue(tonsMax, 0)}t`
        : "-",
      duration: equipmentInfoValue(stats.duration, 2, "s"),
      cooldown: equipmentInfoValue(stats.cooldown, 2, "s"),
      initialThrust: equipmentInfoValue(stats.boost_instant, 1),
      verticalThrust: equipmentInfoValue(stats.boost_z, 1),
      forwardThrust: equipmentInfoValue(stats.boost_fwd, 1),
    },
  };
}

function equipmentInfoHeatSinkRow(item, index) {
  const stats = item.stats || {};
  const heatCapacity = Math.abs(number(stats.heatbase));
  const engineHeatCapacity = Math.abs(number(stats.engineHeatbase));
  const name = item.display_name || item.name || "-";
  return {
    values: {
      index,
      name,
      faction: equipmentInfoFactionOrder(item),
      slots: Number(stats.slots),
      tons: Number(stats.tons),
      heatCapacity,
      heatDissipation: Number(stats.cooling),
      engineHeatCapacity,
      engineHeatDissipation: Number(stats.engineCooling),
    },
    cells: {
      index: equipmentInfoValue(index, 0),
      name,
      faction: factionLabel(item.faction),
      slots: equipmentInfoValue(stats.slots, 0),
      tons: equipmentInfoValue(stats.tons, 1),
      heatCapacity: equipmentInfoValue(heatCapacity, 2),
      heatDissipation: equipmentInfoValue(stats.cooling, 2),
      engineHeatCapacity: equipmentInfoValue(engineHeatCapacity, 2),
      engineHeatDissipation: equipmentInfoValue(stats.engineCooling, 2),
    },
  };
}

function equipmentInfoBaseWeaponColumns({ duration = false, spread = false, weaponType = false, special = [] } = {}) {
  return [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    ...(weaponType ? [{ key: "weaponType", label: t("equipmentInfo.weaponType") }] : []),
    ...special,
    { key: "damage", label: t("equipmentInfo.damage") },
    { key: "heat", label: t("common.heat") },
    { key: "cooldown", label: t("equipmentInfo.cooldown") },
    { key: "expectedCooldown", label: t("equipmentInfo.expectedCooldown") },
    ...(duration ? [{ key: "duration", label: t("equipmentInfo.duration") }] : []),
    ...(spread ? [{ key: "spread", label: t("equipmentInfo.spread") }] : []),
    { key: "optimalRange", label: t("equipmentInfo.optimalRange") },
    { key: "maxRange", label: t("equipmentInfo.maxRange") },
    { key: "velocity", label: t("equipmentInfo.velocity") },
    { key: "dps", label: t("equipmentInfo.dps") },
    { key: "dph", label: t("equipmentInfo.dph") },
    { key: "hps", label: t("equipmentInfo.hps") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "health", label: t("equipmentInfo.health") },
    { key: "faction", label: t("equipmentInfo.faction") },
  ];
}

function specialWeaponTypeOrder(item) {
  const type = equipmentHardpointType(item);
  return ["ballistic", "energy", "missile", "ams"].indexOf(type);
}

function sortSpecialEquipmentInfoItems(left, right) {
  const typeDifference = specialWeaponTypeOrder(left) - specialWeaponTypeOrder(right);
  return typeDifference || sortEquipmentInfoItems(left, right);
}

function equipmentInfoSpecialRows(items, predicate) {
  return items
    .filter(predicate)
    .sort(sortSpecialEquipmentInfoItems)
    .map((item, index) => equipmentInfoWeaponRow(item, index + 1));
}

function renderEquipmentInfoWeapons(items) {
  const standardTables = [
    { type: "ballistic", label: t("stats.ballistic"), columns: equipmentInfoBaseWeaponColumns() },
    { type: "energy", label: t("stats.energy"), columns: equipmentInfoBaseWeaponColumns({ duration: true }) },
    { type: "missile", label: t("stats.missile"), columns: equipmentInfoBaseWeaponColumns() },
    { type: "ams", label: "AMS", columns: equipmentInfoBaseWeaponColumns() },
  ].map(({ type, label, columns }) => {
    const rows = items
      .filter((item) => equipmentHardpointType(item) === type)
      .sort(sortEquipmentInfoItems)
      .map((item, index) => equipmentInfoWeaponRow(item, index + 1));
    return rows.length ? equipmentInfoTable(label, columns, rows, `equipment-info-${type}`, type) : "";
  }).join("");

  const spreadRows = equipmentInfoSpecialRows(items, (item) => (
    ["ballistic", "missile"].includes(equipmentHardpointType(item)) && number(item.stats?.spread) > 0
  ));
  const losRows = equipmentInfoSpecialRows(items, isLosWeapon);
  const criticalRows = equipmentInfoSpecialRows(items, (item) => {
    const chance = weaponCriticalChanceValues(item).some((value) => Math.abs(value) > 0.000001);
    const damage = Number(item.stats?.critDamMult);
    return chance || (Number.isFinite(damage) && Math.abs(damage - 1) > 0.0001);
  });
  const jamRows = equipmentInfoSpecialRows(items, (item) => (
    number(item.stats?.JammingChance) > 0 || number(item.stats?.JammedTime) > 0
  ));
  const specialTables = [
    equipmentInfoTable(t("equipmentInfo.losWeapons"), [
      { key: "index", label: "#" },
      { key: "name", label: t("equipmentInfo.name") },
      { key: "spread", label: t("equipmentInfo.spread") },
      { key: "spreadDirect", label: t("equipmentInfo.spreadDirect") },
      { key: "velocity", label: t("equipmentInfo.velocity") },
      { key: "velocityDirect", label: t("equipmentInfo.velocityDirect") },
    ], losRows, "equipment-info-special equipment-info-los-weapons", "special-los"),
    equipmentInfoTable(t("equipmentInfo.spreadWeapons"), equipmentInfoBaseWeaponColumns({
      weaponType: true,
      special: [{ key: "spread", label: t("equipmentInfo.spread") }],
    }), spreadRows, "equipment-info-special equipment-info-spread-weapons", "special-spread"),
    equipmentInfoTable(t("equipmentInfo.criticalWeapons"), equipmentInfoBaseWeaponColumns({
      weaponType: true,
      special: [
        { key: "criticalChance", label: t("equipmentInfo.criticalChance") },
        { key: "criticalDamage", label: t("equipmentInfo.criticalDamage") },
      ],
    }), criticalRows, "equipment-info-special equipment-info-critical-weapons", "special-critical"),
    equipmentInfoTable(t("equipmentInfo.jamWeapons"), equipmentInfoBaseWeaponColumns({
      weaponType: true,
      special: [
        { key: "jamChance", label: t("stats.jamChance") },
        { key: "jamDuration", label: t("stats.jamDuration") },
      ],
    }), jamRows, "equipment-info-special equipment-info-jam-weapons", "special-jam"),
  ].filter((table, index) => [losRows, spreadRows, criticalRows, jamRows][index].length).join("");
  return standardTables + specialTables;
}

function renderEquipmentInfoModules(items) {
  const moduleItems = items
    .filter(isEquipmentInfoTargetComputer);
  const targetComputerRows = moduleItems
    .filter((item) => equipmentLimitGroup(item) !== "active-probe")
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoModuleRow(item, index + 1));
  const activeProbeRows = moduleItems
    .filter((item) => equipmentLimitGroup(item) === "active-probe")
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoModuleRow(item, index + 1));
  const mascRows = items
    .filter((item) => item.item_type === "masc")
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoMascRow(item, index + 1));
  const ecmRows = items
    .filter(isEcm)
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoEcmRow(item, index + 1));
  const jumpJetRows = items
    .filter((item) => item.item_type === "jumpjet")
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoJumpJetRow(item, index + 1));
  const heatSinkRows = items
    .filter((item) => item.item_type === "module" && isHeatSink(item))
    .sort(sortEquipmentInfoItems)
    .map((item, index) => equipmentInfoHeatSinkRow(item, index + 1));
  const targetComputerTable = targetComputerRows.length ? equipmentInfoTable(t("equipmentInfo.targetComputers"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "faction", label: t("equipmentInfo.faction") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "sensorRange", label: t("equipmentInfo.sensorRange") },
    { key: "beamRange", label: t("equipmentInfo.beamRange") },
    { key: "projectileVelocity", label: t("equipmentInfo.projectileVelocity") },
    { key: "criticalChance", label: t("equipmentInfo.criticalChance") },
  ], targetComputerRows, "equipment-info-modules equipment-info-target-computers", "target-computers") : "";
  const activeProbeTable = activeProbeRows.length ? equipmentInfoTable(t("equipmentInfo.activeProbes"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "faction", label: t("equipmentInfo.faction") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "sensorRange", label: t("equipmentInfo.sensorRange") },
    { key: "targetingTime", label: t("equipmentInfo.targetingTime") },
    { key: "shutdownDetection", label: t("equipmentInfo.shutdownDetection") },
  ], activeProbeRows, "equipment-info-modules equipment-info-active-probes", "active-probes") : "";
  const mascTable = mascRows.length ? equipmentInfoTable(t("equipmentInfo.masc"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "faction", label: t("equipmentInfo.faction") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "tonsRange", label: t("equipmentInfo.tonsRange") },
    { key: "speedBoost", label: t("equipmentInfo.speedBoost") },
    { key: "accelerationBoost", label: t("equipmentInfo.accelerationBoost") },
    { key: "decelerationBoost", label: t("equipmentInfo.decelerationBoost") },
    { key: "turnBoost", label: t("equipmentInfo.turnBoost") },
  ], mascRows, "equipment-info-modules equipment-info-masc", "masc") : "";
  const ecmTable = ecmRows.length ? equipmentInfoTable(t("equipmentInfo.ecm"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "faction", label: t("equipmentInfo.faction") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "ecmRange", label: t("equipmentInfo.ecmRange") },
    { key: "targetingReduction", label: t("equipmentInfo.enemyTargetingReduction") },
    { key: "lockOnReduction", label: t("equipmentInfo.enemyLockOnReduction") },
  ], ecmRows, "equipment-info-modules equipment-info-ecm", "ecm") : "";
  const jumpJetTable = jumpJetRows.length ? equipmentInfoTable(t("equipmentInfo.jumpJets"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "tonsRange", label: t("equipmentInfo.tonsRange") },
    { key: "duration", label: t("equipmentInfo.duration") },
    { key: "cooldown", label: t("equipmentInfo.cooldown") },
    { key: "initialThrust", label: t("equipmentInfo.initialThrust") },
    { key: "verticalThrust", label: t("equipmentInfo.verticalThrust") },
    { key: "forwardThrust", label: t("equipmentInfo.forwardThrust") },
  ], jumpJetRows, "equipment-info-modules equipment-info-jump-jets", "jump-jets") : "";
  const heatSinkTable = heatSinkRows.length ? equipmentInfoTable(t("equipmentInfo.heatSinks"), [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    { key: "faction", label: t("equipmentInfo.faction") },
    { key: "slots", label: t("common.slots") },
    { key: "tons", label: t("common.tons") },
    { key: "heatCapacity", label: t("equipmentInfo.heatCapacity") },
    { key: "heatDissipation", label: t("equipmentInfo.heatDissipation") },
    { key: "engineHeatCapacity", label: t("equipmentInfo.engineHeatCapacity") },
    { key: "engineHeatDissipation", label: t("equipmentInfo.engineHeatDissipation") },
  ], heatSinkRows, "equipment-info-modules equipment-info-heat-sinks", "heat-sinks") : "";
  return targetComputerTable + activeProbeTable + ecmTable + mascTable + jumpJetTable + heatSinkTable;
}

function renderEquipmentInfoGhostHeat(items) {
  const weapons = items.filter((item) => (
    item.item_type === "weapon"
    && ghostHeatGroupKey(item)
    && !isArtemisWeapon(item)
    && !normalizeLookupKey(item.name).startsWith("dropship")
  ));
  const countColumns = Array.from({ length: 12 }, (_, index) => ({
    key: `count${index + 1}`,
    label: String(index + 1),
  }));
  const columns = [
    { key: "index", label: "#" },
    { key: "name", label: t("equipmentInfo.name") },
    ...countColumns,
  ];
  return GHOST_HEAT_GROUPS.map(([groupId, label]) => {
    const groupWeapons = weapons
      .filter((item) => groupId === "singleton"
        ? ghostHeatGroupKey(item).startsWith("singleton:")
        : ghostHeatGroupKey(item) === `shared:${groupId}`)
      .sort(sortEquipmentInfoItems);
    const rows = groupWeapons.map((item, index) => {
      const name = item.display_name || item.name || "-";
      const values = { index: index + 1, name };
      const cells = { index: String(index + 1), name };
      countColumns.forEach((column, countIndex) => {
        const extraHeat = ghostHeatWeaponExtra(item, countIndex + 1);
        values[column.key] = extraHeat > 0 ? extraHeat : Number.POSITIVE_INFINITY;
        cells[column.key] = extraHeat > 0 ? equipmentInfoValue(extraHeat, 2) : "-";
      });
      return { values, cells };
    });
    return rows.length
      ? equipmentInfoTable(
        groupId === "singleton"
          ? `${t("equipmentInfo.individualGroup")} - ${t("equipmentInfo.individualGroupNote")}`
          : label,
        columns,
        rows,
        "equipment-info-ghost-heat",
        `ghost-heat-${groupId}`,
      )
      : "";
  }).join("");
}

function ghostHeatRuleExample(items, titleKey, specifications) {
  const entries = specifications.map(({ name, quantity }) => ({
    item: items.find((item) => item.name === name),
    quantity,
  }));
  if (entries.some(({ item }) => !item)) return "";
  const weaponCount = entries.reduce((sum, { quantity }) => sum + quantity, 0);
  const candidates = entries.map(({ item, quantity }) => ({
    item,
    quantity,
    extraHeat: ghostHeatWeaponExtra(item, weaponCount),
  }));
  const baseHeat = entries.reduce((sum, { item, quantity }) => sum + itemHeat(item) * quantity, 0);
  const extraHeat = candidates.reduce((highest, candidate) => Math.max(highest, candidate.extraHeat), 0);
  const weapons = entries.map(({ item, quantity }) => (
    `${item.display_name || item.name} ×${quantity}`
  )).join(" + ");
  const candidateText = candidates.map(({ item, extraHeat: candidateHeat }) => t(
    "equipmentInfo.ghostHeatExampleCandidate",
    {
      weapon: item.display_name || item.name,
      threshold: Math.trunc(number(item.stats?.minheatpenaltylevel)),
      heat: equipmentInfoValue(candidateHeat, 2),
    },
  )).join(" / ");
  return `
    <article class="equipment-info-ghost-example">
      <h4>${escapeHtml(t(titleKey))}</h4>
      <p>${escapeHtml(t("equipmentInfo.ghostHeatExampleComposition", { weapons, count: weaponCount }))}</p>
      <p>${escapeHtml(t("equipmentInfo.ghostHeatExampleCandidates", { candidates: candidateText }))}</p>
      <strong>${escapeHtml(t("equipmentInfo.ghostHeatExampleResult", {
        baseHeat: equipmentInfoValue(baseHeat, 2),
        extraHeat: equipmentInfoValue(extraHeat, 2),
        totalHeat: equipmentInfoValue(baseHeat + extraHeat, 2),
      }))}</strong>
    </article>
  `;
}

function renderGhostHeatRules(items) {
  const examples = [
    ghostHeatRuleExample(items, "equipmentInfo.ghostHeatExampleAc20", [
      { name: "AutoCannon20", quantity: 1 },
      { name: "UltraAutoCannon20", quantity: 1 },
    ]),
    ghostHeatRuleExample(items, "equipmentInfo.ghostHeatExampleAc10", [
      { name: "AutoCannon10", quantity: 2 },
      { name: "UltraAutoCannon10", quantity: 1 },
    ]),
  ].join("");
  return `
    <section class="equipment-info-ghost-rules">
      <header>
        <span>GHOST HEAT</span>
        <h3>${escapeHtml(t("equipmentInfo.ghostHeatRules"))}</h3>
      </header>
      <div class="equipment-info-ghost-summary">
        <p>${escapeHtml(t("equipmentInfo.ghostHeatRuleSummary1"))}</p>
        <p>${escapeHtml(t("equipmentInfo.ghostHeatRuleSummary2"))}</p>
      </div>
      <div class="equipment-info-ghost-examples">${examples}</div>
    </section>
  `;
}

function renderEquipmentInfo() {
  const content = $("equipment-info-content");
  if (!content) return;
  document.querySelectorAll("[data-equipment-info-view]").forEach((button) => {
    const active = button.dataset.equipmentInfoView === state.activeEquipmentInfoView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  if (state.activeMainTab !== "equipment-info") return;
  const sortKey = Array.from(state.equipmentInfoSortByTable.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([table, sort]) => `${table}:${sort.key}:${sort.direction}`)
    .join("|");
  const cacheKey = `${state.activeEquipmentInfoView}|${sortKey}`;
  if (state.equipmentInfoHtmlCache.has(cacheKey)) {
    content.innerHTML = state.equipmentInfoHtmlCache.get(cacheKey);
    return;
  }
  const items = Object.values(state.equipment?.items || {});
  if (!items.length) {
    content.innerHTML = "";
    return;
  }
  let html = "";
  if (state.activeEquipmentInfoView === "ghostheat") {
    const tables = renderEquipmentInfoGhostHeat(items);
    html = tables
      ? renderGhostHeatRules(items) + tables
      : `<div class="empty equipment-info-empty">${t("equipmentInfo.noResults")}</div>`;
  } else {
    html = state.activeEquipmentInfoView === "modules"
      ? renderEquipmentInfoModules(items)
      : state.activeEquipmentInfoView === "ammo"
        ? renderEquipmentInfoAmmo(items)
        : renderEquipmentInfoWeapons(items.filter((item) => item.item_type === "weapon"));
    html ||= `<div class="empty equipment-info-empty">${t("equipmentInfo.noResults")}</div>`;
  }
  state.equipmentInfoHtmlCache.set(cacheKey, html);
  content.innerHTML = html;
}

function isTargetComputerEquipment(item) {
  const key = normalizeLookupKey(`${item?.name || ""} ${item?.display_name || ""}`);
  return key.includes("targetingcomp")
    || key.includes("activeprobe")
    || key.includes("advancedsensorpackage")
    || key.includes("beagleprobe");
}

function isCaseEquipment(item) {
  return [item?.name, item?.display_name]
    .map(normalizeLookupKey)
    .includes("case");
}

function itemAllowedInComponent(item, component) {
  const configured = String(item?.stats?.components || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return !configured.length || configured.includes(String(component || "").toLowerCase());
}

function isEquipmentInfoTargetComputer(item) {
  if (isTargetComputerEquipment(item)) return true;
  const filters = item?.weapon_stat_filters || [];
  const hasBeamRangeBonus = filters.some((filter) => (
    normalizeLookupKey(filter.tag).includes("beam")
    && (filter.ranges || []).some((range) => number(range.multiplier, 1) > 1)
  ));
  const hasProjectileVelocityBonus = filters.some((filter) => (
    normalizeLookupKey(filter.tag).includes("projectile")
    && (filter.weapon_stats || []).some((stats) => (
      String(stats.operation || "") === "*" && number(stats.speed, 1) > 1
    ))
  ));
  return item?.item_type === "module" && hasBeamRangeBonus && hasProjectileVelocityBonus;
}

function engineWarehouseSection(item) {
  const name = normalizeLookupKey(item?.name || item?.display_name);
  if (name.includes("light")) return "engine-light";
  if (name.includes("xl")) return "engine-xl";
  return "engine-std";
}

function engineCanBeInstalledOnSelectedMech(item, isOmniMech = hasFixedOmnipods(state.selectedMech)) {
  if (item?.item_type !== "engine" || isOmniMech) return false;
  const stats = state.selectedMech?.definition?.stats || {};
  const rating = number(item.stats?.rating);
  const minRating = number(stats.MinEngineRating);
  const maxRating = number(stats.MaxEngineRating);
  return (!minRating || rating >= minRating) && (!maxRating || rating <= maxRating);
}

function warehouseSectionLabel(section) {
  const labels = {
    heatsinks: t("equipment.section.heatsinks"),
    "target-computers": t("equipment.section.targetComputers"),
    equipment: t("equipment.section.utility"),
    "engine-xl": t("equipment.section.engineXl"),
    "engine-light": t("equipment.section.engineLight"),
    "engine-std": t("equipment.section.engineStd"),
  };
  return labels[section] || section.toUpperCase();
}

function warehouseItemSection(item, category, isOmniMech) {
  if (category !== "equipment") {
    if (item.item_type === "weapon") return HARDPOINT_ORDER.includes(item.hardpoint_type) ? item.hardpoint_type : "other";
    if (item.item_type === "ammo") return ammoHardpointType(item) || "other";
    return null;
  }
  if (isHeatSink(item)) return "heatsinks";
  if (isTargetComputerEquipment(item)) return "target-computers";
  if (isCaseEquipment(item) || isEcm(item) || item.item_type === "masc" || item.item_type === "jumpjet") return "equipment";
  if (engineCanBeInstalledOnSelectedMech(item, isOmniMech)) return engineWarehouseSection(item);
  return null;
}

function sortWarehouseItems(section, a, b) {
  if (section.startsWith("engine-")) {
    return number(a.stats?.rating) - number(b.stats?.rating);
  }
  return String(a.display_name).localeCompare(String(b.display_name), undefined, { numeric: true });
}

function installedWeaponAmmoTypes() {
  const types = new Set();
  if (!state.selectedMech || !state.currentBuild) return types;
  const definition = effectiveDefinition(state.selectedMech, state.currentBuild);
  for (const component of COMPONENT_ORDER) {
    const fixedIds = definition.components?.[component]?.fixed || [];
    const installedIds = (state.currentBuild.components?.[component]?.items || []).map((entry) => entry.item_id);
    [...fixedIds, ...installedIds].forEach((itemId) => {
      const weapon = itemById(itemId);
      if (weapon?.item_type !== "weapon") return;
      const ammoType = normalizeLookupKey(activeWeaponAmmoType(weapon));
      if (ammoType) types.add(ammoType);
    });
  }
  return types;
}

function ammoMatchesInstalledWeapons(item, ammoTypes = installedWeaponAmmoTypes()) {
  return item?.item_type === "ammo" && ammoTypes.has(normalizeLookupKey(item.stats?.type || item.name));
}

function selectedMechEquipmentCapabilities() {
  if (!state.selectedMech || !state.currentBuild) return null;
  const definition = effectiveDefinition(state.selectedMech, state.currentBuild);
  const stats = currentDefinition(state.selectedMech).stats || {};
  return {
    hardpoints: hardpointCountsFromDefinition(definition),
    isOmniMech: hasFixedOmnipods(state.selectedMech),
    tons: number(stats.MaxTons),
    maxJumpJets: number(stats.MaxJumpJets),
    canEquipMasc: number(stats.CanEquipMASC) > 0 || number(stats.CanEquipMasc) > 0,
  };
}

function equipmentMatchesSelectedMechCapabilities(item, capabilities = selectedMechEquipmentCapabilities()) {
  if (!item || !capabilities) return true;
  const hardpointTypeName = equipmentHardpointType(item);
  if (item.item_type === "weapon" && HARDPOINT_ORDER.includes(hardpointTypeName)) {
    return number(capabilities.hardpoints[hardpointTypeName]) > 0;
  }
  if (isEcm(item)) {
    return number(capabilities.hardpoints.ecm) > 0;
  }
  if (item.item_type === "jumpjet") {
    const minTons = number(item.stats?.minTons);
    const maxTons = number(item.stats?.maxTons);
    return capabilities.maxJumpJets > 0
      && (!minTons || capabilities.tons >= minTons)
      && (!maxTons || capabilities.tons <= maxTons);
  }
  if (item.item_type === "masc") {
    const minTons = number(item.stats?.TonsMin);
    const maxTons = number(item.stats?.TonsMax);
    return capabilities.canEquipMasc
      && (!minTons || capabilities.tons >= minTons)
      && (!maxTons || capabilities.tons <= maxTons);
  }
  return true;
}

function renderEquipmentList() {
  hideEquipmentTooltip();
  const isOmniMech = hasFixedOmnipods(state.selectedMech);
  document.querySelector(".equipment-category-tabs")?.classList.toggle("has-omnipods", isOmniMech);
  if (!isOmniMech && state.activeEquipmentCategory === "omnipods") {
    state.activeEquipmentCategory = "weapons";
  }
  document.querySelectorAll("[data-equipment-category]").forEach((button) => {
    const isOmnipodTab = button.dataset.equipmentCategory === "omnipods";
    button.hidden = isOmnipodTab && !isOmniMech;
    const active = button.dataset.equipmentCategory === state.activeEquipmentCategory;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  renderUpgradeControls();

  if (state.activeEquipmentCategory === "omnipods") {
    renderOmnipodList();
    return;
  }

  $("warehouse-columns").classList.remove("omnipod-columns");
  $("warehouse-columns").innerHTML = "<span>Item</span><span>Slots</span><span>Tons</span>";
  const families = state.activeEquipmentCategory === "equipment"
    ? ["equipment", "jumpjets", "masc", ...(isOmniMech ? [] : ["engines"])]
    : [state.activeEquipmentCategory];
  const ids = [...new Set(families.flatMap((family) => state.equipment.families[family] || []))];
  const ammoTypes = state.activeEquipmentCategory === "ammo" ? installedWeaponAmmoTypes() : null;
  const capabilities = selectedMechEquipmentCapabilities();
  const rows = ids
    .map((id) => itemById(id))
    .filter(Boolean)
    .filter((item) => !ammoTypes || ammoMatchesInstalledWeapons(item, ammoTypes))
    .filter((item) => !isHiddenMechlabEquipment(item))
    .filter((item) => itemMatchesMechFaction(item))
    .filter((item) => equipmentMatchesSelectedMechCapabilities(item, capabilities))
    .filter((item) => heatSinkMatchesUpgrade(item))
    .filter((item) => !guidanceMismatch(item));

  const sectionOrder = state.activeEquipmentCategory === "equipment"
    ? ["heatsinks", "target-computers", "equipment", "engine-xl", "engine-light", "engine-std"]
    : ["energy", "missile", "ballistic", "ams", "ammo", "other"];
  const grouped = new Map();
  rows.forEach((item) => {
    const section = warehouseItemSection(item, state.activeEquipmentCategory, isOmniMech);
    if (!section) return;
    if (!grouped.has(section)) grouped.set(section, []);
    grouped.get(section).push(item);
  });

  $("item-list").innerHTML = sectionOrder
    .filter((section) => grouped.has(section))
    .map((section) => {
      const sectionId = `${state.activeEquipmentCategory}:${section}`;
      const collapsed = state.collapsedWarehouseSections.has(sectionId);
      return `
      <section class="warehouse-section warehouse-${section}${state.activeEquipmentCategory === "ammo" ? " warehouse-ammo-item" : ""}${collapsed ? " collapsed" : ""}">
        <button class="warehouse-section-title warehouse-section-toggle" type="button" data-warehouse-section="${sectionId}" aria-expanded="${!collapsed}">
          <span>${warehouseSectionLabel(section)}</span><span class="warehouse-section-indicator" aria-hidden="true">${collapsed ? "+" : "−"}</span>
        </button>
        ${collapsed ? "" : grouped.get(section)
          .sort((a, b) => sortWarehouseItems(section, a, b))
          .map((item) => {
            const active = String(state.selectedItemId) === String(item.id) ? " active" : "";
            const mountType = item.item_type === "ammo" ? ammoHardpointType(item) : equipmentHardpointType(item);
            const ammoClass = item.item_type === "ammo" ? " ammo" : "";
            return `
              <button class="item-row ${mountType || item.item_type}${ammoClass}${active}" data-item="${item.id}" type="button" aria-label="${escapeHtml(item.display_name)}">
                <span class="item-row-name"><span class="item-type-mark">${HARDPOINT_LABELS[mountType] || String(item.item_type || "?")[0].toUpperCase()}</span><strong>${item.display_name}</strong></span>
                <span>${effectiveItemSlots(item)}</span>
                <span>${fmt(itemTons(item))}</span>
              </button>
            `;
          }).join("")}
      </section>
    `;
    })
    .join("");
}

function upgradeItems(category) {
  const items = (state.equipment?.families?.upgrades || [])
    .map((id) => itemById(id))
    .filter(Boolean)
    .filter((item) => itemMatchesMechFaction(item));
  return items.filter((item) => {
    if (category === "structure") return Object.hasOwn(item.stats || {}, "weightPerTon");
    if (category === "armor") return Object.hasOwn(item.stats || {}, "armorPerTon");
    if (category === "heatsinks") return Object.hasOwn(item.stats || {}, "compatibleHeatSink");
    if (category === "guidance") return Object.hasOwn(item.stats || {}, "extraSlots");
    return false;
  });
}

function upgradeOptionLabel(category, item) {
  const name = String(item?.name || "").toLowerCase();
  if (category === "structure") return name.includes("standard") ? "STANDARD" : "ENDO STEEL";
  if (category === "armor") {
    if (name.includes("lightferro")) return "LIGHT FERRO";
    if (name.includes("stealth")) return "STEALTH";
    if (name.includes("standard")) return "STANDARD";
    return "FERRO-FIBROUS";
  }
  if (category === "heatsinks") return name.includes("double") ? "DOUBLE" : "SINGLE";
  return number(item?.stats?.extraSlots) > 0 ? "ARTEMIS" : "STANDARD";
}

function activeUpgradeValue(category) {
  if (category === "guidance") return state.currentBuild?.upgrades?.artemis?.Equipped ? "1" : "0";
  const itemId = state.currentBuild?.upgrades?.[category]?.ItemID;
  if (category !== "armor") return String(itemId || "");
  const selectedArmor = itemById(itemId);
  const standardArmor = upgradeItems("armor").find((item) => (
    upgradeOptionLabel("armor", item) === "STANDARD"
  ));
  if (!selectedArmor || upgradeOptionLabel("armor", selectedArmor) === "STANDARD") {
    return String(standardArmor?.id || itemId || "");
  }
  return String(itemId || "");
}

function renderUpgradeControls() {
  const controls = $("upgrade-controls");
  if (!controls) return;
  $("upgrade-panel").hidden = !state.currentBuild;
  if (!state.currentBuild) {
    controls.innerHTML = "";
    return;
  }
  const categories = [
    { key: "structure", label: "Structure" },
    { key: "armor", label: "Armor" },
    { key: "heatsinks", label: "Heat Sinks" },
    { key: "guidance", label: "Guidance" },
  ];
  const omniLocked = hasFixedOmnipods(state.selectedMech);
  controls.innerHTML = categories.map((category) => {
    const activeValue = activeUpgradeValue(category.key);
    const options = upgradeItems(category.key)
      .map((item) => ({
        item,
        label: upgradeOptionLabel(category.key, item),
        value: category.key === "guidance" ? (number(item.stats?.extraSlots) > 0 ? "1" : "0") : String(item.id),
      }))
      .sort((a, b) => {
        const order = ["STANDARD", "SINGLE", "ENDO STEEL", "FERRO-FIBROUS", "DOUBLE", "LIGHT FERRO", "STEALTH", "ARTEMIS"];
        return order.indexOf(a.label) - order.indexOf(b.label);
      });
    return `
      <div class="upgrade-group">
        <div class="upgrade-group-label">${category.label}</div>
        <div class="upgrade-options">
          ${options.map((option) => {
            const active = option.value === activeValue;
            const fixed = omniLocked && category.key !== "guidance";
            const disabled = !state.currentBuild || fixed;
            return `<button class="upgrade-option${active ? " active" : ""}" type="button" data-upgrade-category="${category.key}" data-upgrade-value="${option.value}" aria-pressed="${active}" ${disabled ? "disabled" : ""} ${fixed ? 'title="Fixed OmniMech upgrade"' : ""}>${option.label}</button>`;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function findEquipmentByName(name) {
  const wanted = String(name || "").toLowerCase();
  return Object.values(state.equipment?.items || {}).find((item) => (
    String(item.name || "").toLowerCase() === wanted && itemMatchesMechFaction(item)
  )) || null;
}

function artemisCounterpart(item, equipped) {
  if (!item || !["weapon", "ammo"].includes(item.item_type)) return null;
  const name = String(item.name || "");
  const isArtemis = /artemis/i.test(name);
  if (equipped === isArtemis) return item;
  let targetName;
  if (equipped) {
    if (item.item_type === "weapon" && !item.stats?.artemisAmmoType) return null;
    targetName = item.item_type === "weapon"
      ? `${name}_Artemis`
      : (/Half$/i.test(name) ? name.replace(/Half$/i, "ArtemisHalf") : `${name}Artemis`);
  } else {
    targetName = name.replace(/_?Artemis/gi, "");
  }
  return findEquipmentByName(targetName);
}

function applyHeatSinkUpgrade(upgradeItem) {
  const compatibleId = number(upgradeItem?.stats?.compatibleHeatSink);
  if (!compatibleId) return;
  Object.values(state.currentBuild?.components || {}).forEach((component) => {
    (component.items || []).forEach((entry) => {
      if (isHeatSink(itemById(entry.item_id))) entry.item_id = compatibleId;
    });
  });
  engineHeatSinkEntries().forEach((entry) => {
    if (isHeatSink(itemById(entry.item_id))) entry.item_id = compatibleId;
  });
}

function applyArtemisUpgrade(equipped) {
  Object.values(state.currentBuild?.components || {}).forEach((component) => {
    (component.items || []).forEach((entry) => {
      const replacement = artemisCounterpart(itemById(entry.item_id), equipped);
      if (replacement) entry.item_id = replacement.id;
    });
  });
}

function selectUpgrade(category, value) {
  if (!state.currentBuild) return;
  state.currentBuild.upgrades ||= {};
  if (category === "guidance") {
    const equipped = value === "1";
    state.currentBuild.upgrades.artemis ||= {};
    state.currentBuild.upgrades.artemis.Equipped = equipped ? 1 : 0;
    applyArtemisUpgrade(equipped);
  } else {
    if (hasFixedOmnipods(state.selectedMech)) return;
    const item = itemById(value);
    if (!item || !upgradeItems(category).some((option) => String(option.id) === String(value))) return;
    state.currentBuild.upgrades[category] = {
      ...(state.currentBuild.upgrades[category] || {}),
      ItemID: item.id,
    };
    if (category === "heatsinks") applyHeatSinkUpgrade(item);
  }
  if (!["armor", "structure"].includes(category)) reflowInstalledEquipment();
  const selectedItem = itemById(state.selectedItemId);
  if (
    guidanceMismatch(selectedItem)
    || !heatSinkMatchesUpgrade(selectedItem)
    || (selectedItem?.item_type === "ammo" && !ammoMatchesInstalledWeapons(selectedItem))
  ) state.selectedItemId = null;
  renderEquipmentList();
  renderVariant();
}

function replaceOmnipod(component, podId) {
  const pod = podById(podId);
  const buildComponent = state.currentBuild?.components?.[component];
  if (
    !pod
    || !buildComponent
    || String(pod.component || "") !== String(component)
    || String(pod.chassis || "").toLowerCase() !== String(state.selectedMech?.chassis || "").toLowerCase()
  ) return false;
  if (String(buildComponent.omnipod || "") === String(pod.id)) return false;

  buildComponent.items = (buildComponent.items || [])
    .filter((entry) => itemById(entry.item_id)?.item_type === "engine");
  buildComponent.omnipod = Number(pod.id);
  normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
  reflowInstalledEquipment();
  return true;
}

function renderOmnipodList() {
  $("warehouse-columns").classList.add("omnipod-columns");
  $("warehouse-columns").innerHTML = `<span>Omnipod</span>${HARDPOINT_ORDER.map((type) => `<span>${HARDPOINT_LABELS[type]}</span>`).join("")}`;
  const chassis = String(state.selectedMech?.chassis || "").toLowerCase();
  const grouped = new Map();
  Object.values(state.omnipods || {})
    .filter((pod) => String(pod.chassis || "").toLowerCase() === chassis)
    .forEach((pod) => {
      if (!grouped.has(pod.component)) grouped.set(pod.component, []);
      grouped.get(pod.component).push(pod);
    });

  const omnipodComponentOrder = ["head", "right_torso", "left_torso", "right_arm", "left_arm", "right_leg", "left_leg"];
  $("item-list").innerHTML = omnipodComponentOrder
    .filter((component) => grouped.has(component))
    .map((component) => {
      const sectionId = `omnipods:${component}`;
      const collapsed = state.collapsedWarehouseSections.has(sectionId);
      return `
      <section class="warehouse-section warehouse-omnipods${collapsed ? " collapsed" : ""}">
        <button class="warehouse-section-title warehouse-section-toggle" type="button" data-warehouse-section="${sectionId}" aria-expanded="${!collapsed}">
          <span>${String(component).replaceAll("_", " ").toUpperCase()}</span><span class="warehouse-section-indicator" aria-hidden="true">${collapsed ? "+" : "−"}</span>
        </button>
        ${collapsed ? "" : grouped.get(component)
          .sort((a, b) => String(a.set).localeCompare(String(b.set), undefined, { numeric: true }))
          .map((pod) => {
            const counts = hardpointCountsFromHardpoints(omnipodDefinition(pod).hardpoints);
            const active = String(state.currentBuild?.components?.[component]?.omnipod || "") === String(pod.id) ? " active" : "";
            return `
              <button class="omnipod-row${active}" data-omnipod="${pod.id}" data-omnipod-component="${component}" type="button" draggable="true" aria-label="${String(pod.set).toUpperCase()} ${String(component).replaceAll("_", " ").toUpperCase()}">
                <strong>${String(pod.set).toUpperCase()} ${String(component).replaceAll("_", " ").toUpperCase()}</strong>
                ${HARDPOINT_ORDER.map((type) => `<span class="omnipod-hardpoint ${type}${number(counts[type]) === 0 ? " zero" : ""}">${number(counts[type])}</span>`).join("")}
              </button>
            `;
          }).join("")}
      </section>
    `;
    })
    .join("");
}

function componentArmorCapacity(name, componentDefinition) {
  if (name === "head") return 18;
  return Math.max(0, number(componentDefinition?.hp) * 2);
}

function componentDurabilityQuirkValues(name, values, componentDefinition) {
  const component = INFO_COMPONENTS.find((entry) => entry.key === name);
  if (!component) {
    return {
      frontArmor: 0,
      rearArmor: 0,
      armorSkillMultiplier: 0,
      structure: 0,
    };
  }
  const frontArmor = quirkAdd(values, "armorresist", component.suffix);
  const rearArmor = component.rearSuffix
    ? number(values.armorresist_all_additive) + number(values[`armorresist_${component.rearSuffix}_additive`])
    : 0;
  const structure = quirkAdd(values, "internalresist", component.suffix);
  const structureBeforeSkill = number(componentDefinition?.hp) + structure;
  const structureAfterSkill = durabilitySkillFinalValue(
    structureBeforeSkill,
    values.increasedstructure_multiplier,
  );
  return {
    frontArmor,
    rearArmor,
    armorSkillMultiplier: number(values.increasedarmor_multiplier),
    structure: structure + structureAfterSkill - structureBeforeSkill,
  };
}

function finalArmorAllocation(
  value,
  quirkBonus,
  skillMultiplier,
  pairedValue = 0,
  pairedQuirkBonus = 0,
  includeSkillBonus = true,
) {
  const ownValue = Math.max(0, number(value) + number(quirkBonus));
  if (!includeSkillBonus) return ownValue;

  const pairedFinalValue = Math.max(0, number(pairedValue) + number(pairedQuirkBonus));
  const armorBeforeSkill = ownValue + pairedFinalValue;
  const armorAfterSkill = durabilitySkillFinalValue(armorBeforeSkill, skillMultiplier);
  return ownValue + armorAfterSkill - armorBeforeSkill;
}

function renderArmorMaximum(finalMax, quirkBonus = 0, className = "component-armor-limit") {
  const baseMax = finalMax - quirkBonus;
  const compact = `${fmt(finalMax)}(${fmt(baseMax)}${quirkBonus >= 0 ? "+" : "-"}${fmt(Math.abs(quirkBonus))})`.length > 10;
  const detail = quirkBonus !== 0
    ? `<span class="component-armor-max-detail">(<span class="component-armor-max-base">${fmt(baseMax)}</span><span class="component-armor-max-operator">${quirkBonus > 0 ? "+" : "-"}</span><span class="component-armor-max-bonus">${fmt(Math.abs(quirkBonus))}</span>)</span>`
    : "";
  return `<strong class="${className} component-armor-maximum${quirkBonus !== 0 ? " quirk-applied" : ""}${compact ? " compact" : ""}"><span class="component-armor-max-final">${fmt(finalMax)}</span>${detail}</strong>`;
}

function renderArmorStepper(
  name,
  side,
  value,
  capacity,
  pairedValue = 0,
  showLabel = true,
  quirkBonus = 0,
  finalMax = capacity,
  maxQuirkBonus = 0,
  skillMultiplier = 0,
  pairedQuirkBonus = 0,
  includeSkillBonus = true,
) {
  const mobileArmorDisplay = Boolean(globalThis.__MWOLAB_MOBILE__);
  const available = Math.max(0, capacity - value - pairedValue);
  const label = side === "rear" ? "REAR" : "FRONT";
  const finalValue = finalArmorAllocation(
    value,
    quirkBonus,
    skillMultiplier,
    pairedValue,
    pairedQuirkBonus,
    includeSkillBonus,
  );
  const valueTone = value <= 0
    ? (finalValue !== 0 ? "quirk-only" : "empty")
    : (finalValue !== value ? "quirk-applied" : "allocated");
  const inputMin = finalArmorAllocation(
    0,
    quirkBonus,
    skillMultiplier,
    pairedValue,
    pairedQuirkBonus,
    includeSkillBonus,
  );
  const inputMax = Math.max(
    inputMin,
    finalArmorAllocation(
      capacity - pairedValue,
      quirkBonus,
      skillMultiplier,
      pairedValue,
      pairedQuirkBonus,
      includeSkillBonus,
    ),
  );
  const displayedValue = mobileArmorDisplay ? value : finalValue;
  const displayedTone = mobileArmorDisplay
    ? (value > 0 ? "allocated" : "empty")
    : valueTone;
  const displayedMin = mobileArmorDisplay ? 0 : inputMin;
  const displayedMax = mobileArmorDisplay ? Math.max(0, capacity - pairedValue) : inputMax;
  return `
    <div class="component-armor-row">
      <div class="component-armor-allocation">
        <span class="component-armor-side">${showLabel ? label : ""}</span>
        <input class="component-armor-value ${displayedTone}" type="number" inputmode="numeric" step="1" min="${displayedMin}" max="${displayedMax}" value="${displayedValue}" data-armor-input data-armor-component="${name}" data-armor-side="${side}" data-armor-quirk="${mobileArmorDisplay ? 0 : quirkBonus}" data-armor-paired-quirk="${mobileArmorDisplay ? 0 : pairedQuirkBonus}" data-armor-skill-multiplier="${mobileArmorDisplay ? 0 : skillMultiplier}" data-armor-include-skill="${mobileArmorDisplay ? false : includeSkillBonus}" aria-label="${MECHLAB_COMPONENT_NAMES[name] || name} ${side} armor value">
        <div class="component-armor-stepper" aria-label="${MECHLAB_COMPONENT_NAMES[name] || name} ${side} armor">
          <button type="button" data-armor-component="${name}" data-armor-side="${side}" data-armor-delta="1" ${available <= 0 ? "disabled" : ""} aria-label="Increase ${side} armor">+</button>
          <button type="button" data-armor-component="${name}" data-armor-side="${side}" data-armor-delta="-1" ${value <= 0 ? "disabled" : ""} aria-label="Decrease ${side} armor">-</button>
        </div>
      </div>
      <div class="component-armor-capacity">
        <span class="component-armor-limit-label">${side === "rear" ? "MAX" : "AVL"}</span>
        ${side === "rear"
          ? renderArmorMaximum(finalMax, maxQuirkBonus)
          : `<strong class="component-armor-limit">${available}</strong>`}
      </div>
    </div>
  `;
}

function renderComponent(name, calc, quirkValues, ghostHeatGroups = new Set()) {
  const buildComp = state.currentBuild.components[name] || { items: [] };
  const compDef = effectiveComponentDefinition(state.selectedMech, state.currentBuild, name);
  const usage = calc.componentUsage[name] || { slots: 0, warnings: [] };
  const slotLimit = number(compDef.slots);
  const armorCapacity = componentArmorCapacity(name, compDef);
  const frontArmor = Math.max(0, number(buildComp.armor));
  const rearArmor = Math.max(0, number(state.currentBuild.rearArmor?.[name]));
  const torso = Object.hasOwn(TORSO_REAR_COMPONENTS, name);
  const durabilityQuirks = componentDurabilityQuirkValues(name, quirkValues, compDef);
  const finalArmorMax = durabilitySkillFinalValue(
    armorCapacity + durabilityQuirks.frontArmor + durabilityQuirks.rearArmor,
    durabilityQuirks.armorSkillMultiplier,
  );
  const totalArmorQuirk = finalArmorMax - armorCapacity;
  const structure = number(compDef.hp);
  const finalStructure = structure + durabilityQuirks.structure;
  const armorControls = torso
    ? `${renderArmorStepper(
      name,
      "front",
      frontArmor,
      armorCapacity,
      rearArmor,
      true,
      durabilityQuirks.frontArmor,
      armorCapacity,
      0,
      durabilityQuirks.armorSkillMultiplier,
      durabilityQuirks.rearArmor,
      true,
    )}${renderArmorStepper(
      name,
      "rear",
      rearArmor,
      armorCapacity,
      frontArmor,
      true,
      durabilityQuirks.rearArmor,
      finalArmorMax,
      totalArmorQuirk,
      durabilityQuirks.armorSkillMultiplier,
      durabilityQuirks.frontArmor,
      false,
    )}`
    : `${renderArmorStepper(
      name,
      "front",
      frontArmor,
      armorCapacity,
      0,
      false,
      durabilityQuirks.frontArmor,
      armorCapacity,
      0,
      durabilityQuirks.armorSkillMultiplier,
      0,
      true,
    )}
      <div class="component-armor-max-row"><span></span><div><span>MAX</span>${renderArmorMaximum(finalArmorMax, totalArmorQuirk, "component-armor-max-value")}</div></div>`;
  const hardpointCapacity = hardpointCountsFromHardpoints(compDef.hardpoints || []);
  const remainingHardpoints = Object.fromEntries(Object.entries(hardpointCapacity).map(([type, capacity]) => [
    type,
    Math.max(0, number(capacity) - number(usage.hardpoints?.[type])),
  ]));
  const hps = renderHardpointBadges(remainingHardpoints, "component-hardpoint", true);
  const currentOmnipod = hasFixedOmnipods(state.selectedMech) ? podById(buildComp.omnipod) : null;
  const omnipodName = currentOmnipod
    ? String(currentOmnipod.set || "OMNIPOD").toUpperCase()
    : "";
  const fixedOmnipod = Boolean(currentOmnipod && name === "centre_torso");
  const hardpointDisplay = currentOmnipod
    ? `
      <div class="component-omnipod-card${fixedOmnipod ? " fixed" : ""}" data-tooltip-omnipod="${currentOmnipod.id}">
        <div class="component-omnipod-card-head">
          <span>OMNIPOD</span>
          <strong>${escapeHtml(omnipodName)}</strong>
        </div>
        <div class="hardpoint-line component-hardpoint-line component-omnipod-hardpoints${hps ? "" : " empty"}">${hps}</div>
      </div>
    `
    : `<div class="hardpoint-line component-hardpoint-line${hps ? "" : " empty"}">${hps}</div>`;
  const internalRows = (compDef.internals || [])
    .filter((itemId) => hasFixedOmnipods(state.selectedMech) || !MOVABLE_UPGRADE_SLOT_IDS.has(Number(itemId)))
    .map((itemId) => renderFixedSlot(itemId, ghostHeatGroups))
    .join("");
  const fixedEquipmentRows = (compDef.fixed || [])
    .filter((itemId) => {
      const item = itemById(itemId);
      return item?.item_type !== "engine" && !(name === "centre_torso" && isHeatSink(item));
    })
    .map((itemId) => renderFixedSlot(itemId, ghostHeatGroups))
    .join("");
  const fixedEngineRows = usage.fixedEngineSlots
    ? renderFixedEngine(calc.engine, usage.fixedEngineSlots, calc)
    : "";
  const structureRows = usage.structureSlots
    ? renderStructureSlots(usage.structureSlots, usage.occupiedStructureSlots)
    : "";
  const armorRows = usage.armorSlots
    ? renderArmorSlots(usage.armorSlots, usage.occupiedArmorSlots)
    : "";
  const sideEngineRows = usage.engineSideSlots ? renderEngineSideSlots(calc.engine, usage.engineSideSlots) : "";
  const installedEngineIndex = name === "centre_torso" && !usage.fixedEngineSlots
    ? buildComp.items.findIndex((entry) => itemById(entry.item_id)?.item_type === "engine")
    : -1;
  const itemRows = buildComp.items
    .map((entry, index) => index === installedEngineIndex ? "" : renderLoadoutItem(name, entry, index, null, ghostHeatGroups))
    .join("");
  const installedEngineRow = installedEngineIndex >= 0
    ? renderLoadoutItem(name, buildComp.items[installedEngineIndex], installedEngineIndex, calc, ghostHeatGroups)
    : "";
  const emptySlots = Math.max(0, slotLimit - usage.slots - number(usage.movableUpgradeSlots));
  const emptyRows = Array.from({ length: emptySlots }, () => `<div class="critical-slot empty-slot" data-empty-slot-component="${name}">-</div>`).join("");
  return `
    <article class="component component-location-${name} ${usage.warnings.length ? "invalid" : ""}" data-component-drop="${name}">
        <div class="component-head">
          <div>
            <div class="component-title">${MECHLAB_COMPONENT_NAMES[name] || name}</div>
            <div class="component-stat-title">ARMOR${globalThis.__MWOLAB_MOBILE__ ? ` <span class="mobile-component-armor-summary">${fmt(frontArmor + rearArmor)}/${fmt(armorCapacity)}</span>` : ""}</div>
            <div class="component-armor-controls">${armorControls}</div>
            <div class="component-structure-row">
              <span>STRUCTURE</span>
              <strong class="component-structure-value${durabilityQuirks.structure !== 0 ? " boosted" : ""}">
                <span>${fmt(finalStructure)}</span>${durabilityQuirks.structure !== 0 ? `<span class="component-structure-detail">(<span>${fmt(structure)}</span><span>${durabilityQuirks.structure > 0 ? "+" : "-"}</span><span class="component-structure-bonus">${fmt(Math.abs(durabilityQuirks.structure))}</span>)</span>` : ""}
              </strong>
            </div>
            ${hardpointDisplay}
            ${usage.warnings.length ? `<div class="warnings">${usage.warnings.join(" / ")}</div>` : ""}
          </div>
        </div>
        <div class="component-items">${internalRows}${fixedEquipmentRows}${itemRows}${structureRows}${armorRows}${emptyRows}${sideEngineRows}${fixedEngineRows}${installedEngineRow}</div>
    </article>
  `;
}

function communityLikeIconHtml() {
  return `<svg class="community-like-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h4V9H1v12Zm21.8-10.7A2 2 0 0 0 21 9h-6.3l.9-4.6v-.3c0-.4-.2-.8-.4-1.1L14.2 2 7.6 8.6A2 2 0 0 0 7 10v9a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.3-.8.3-1.7 0-2.5Z"/></svg>`;
}

function publicFittingHasChanges(source) {
  if (!source?.loadoutCode || !globalThis.MWOCodec) return false;
  try {
    const currentCode = MWOCodec.encode(currentBuildAsMwoLoadout());
    return currentCode !== (source.baselineLoadoutCode || source.loadoutCode);
  } catch {
    return false;
  }
}

function renderCommunitySourcePanel() {
  const source = activeMechlabTab()?.communitySource;
  if (!source) return "";
  const canRestore = publicFittingHasChanges(source);
  const likeAction = source.liked ? t("community.unlike") : t("community.like");
  return `
    <aside class="public-fitting-source" aria-label="${escapeHtml(t("community.publicInfo"))}">
      <span class="public-fitting-source-label">${t("community.publicInfo")}</span>
      <strong>${escapeHtml(source.name)}</strong>
      <span class="public-fitting-source-author">${escapeHtml(t("community.author"))}: ${escapeHtml(source.authorName || "Pilot")}</span>
      <div class="public-fitting-source-actions">
        <button type="button" data-community-source-like="${escapeHtml(source.id)}" class="${source.liked ? "liked" : ""}${source.canLike ? "" : " login-required"}" ${source.canLike ? "" : 'aria-disabled="true"'} aria-pressed="${source.liked ? "true" : "false"}" aria-label="${escapeHtml(source.canLike ? likeAction : t("community.loginToLike"))}" title="${escapeHtml(source.canLike ? likeAction : t("community.loginToLike"))}">${communityLikeIconHtml()}</button>
        <button type="button" data-community-restore ${canRestore ? "" : "disabled"}>${t("community.restore")}</button>
      </div>
    </aside>
  `;
}

function recommendationContext() {
  return {
    enabled: Boolean(
      state.showRecommendedFittings
      && !globalThis.__MWOLAB_MOBILE__
      && state.activeMainTab === "mechlab"
      && !state.mechlabBrowseMode
      && state.selectedMech
      && state.currentBuild
    ),
    mechId: state.selectedMech ? String(state.selectedMech.id) : "",
    sharedFittingRequestPending: Boolean(state.sharedFittingRequestPending),
  };
}

let lastRecommendationContextSignature = "";

function notifyRecommendationContext() {
  const context = recommendationContext();
  const signature = `${context.enabled}:${context.mechId}:${context.sharedFittingRequestPending}`;
  if (signature === lastRecommendationContextSignature) return;
  lastRecommendationContextSignature = signature;
  if (typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("mwolab:recommendation-context", { detail: context }));
  }
}

function renderRecommendedFittingsPanel() {
  const context = recommendationContext();
  if (!context.enabled || context.sharedFittingRequestPending || !context.mechId) return "";
  if (state.recommendedFittingsMechId !== context.mechId || !state.recommendedFittings.length) return "";
  return `
    <aside class="recommended-fittings-panel" aria-label="${escapeHtml(t("recommendations.title"))}">
      <h3>${t("recommendations.title")}</h3>
      <div class="recommended-fitting-list">
        ${state.recommendedFittings.slice(0, 3).map((record) => `
          <article class="recommended-fitting-card">
            <div class="recommended-fitting-card-heading">
              <strong>${escapeHtml(record.name)}</strong>
              <span aria-label="${escapeHtml(`${t("community.like")}: ${record.likeCount}`)}">${communityLikeIconHtml()} ${record.likeCount}</span>
            </div>
            <div class="community-card-tags">${(record.tags || []).map((tag) => `<span class="community-tag tag-${escapeHtml(tag.key)}">${escapeHtml(tag.label)}</span>`).join("")}</div>
            <button type="button" data-recommended-fitting-open="${escapeHtml(record.id)}">${t("recommendations.apply")}</button>
          </article>
        `).join("")}
      </div>
    </aside>
  `;
}

function renderCommunityAreaPanel() {
  return renderCommunitySourcePanel() + renderRecommendedFittingsPanel();
}

function renderComponents(calc = calculateBuild()) {
  const quirkValues = mechlabQuirkValues();
  const ghostHeatGroups = new Set(mechlabGhostHeatWarnings().map(({ groupKey }) => groupKey));
  const rendered = Object.fromEntries(
    COMPONENT_ORDER.map((name) => [name, renderComponent(name, calc, quirkValues, ghostHeatGroups)]),
  );
  const columns = [
    { className: "right-arm", components: ["right_arm"] },
    { className: "right-body", components: ["right_torso", "right_leg"] },
    { className: "center-body", components: ["head", "centre_torso"] },
    { className: "left-body", components: ["left_torso", "left_leg"] },
    { className: "left-arm", components: ["left_arm"] },
  ];
  $("components").innerHTML = columns.map((column) => `
    <div class="component-column component-column-${column.className}">
      ${column.components.map((name) => rendered[name]).join("")}
      ${column.className === "right-arm" ? renderCommunityAreaPanel() : ""}
      ${column.className === "left-arm" ? renderMechlabActionPanel() : ""}
    </div>
  `).join("");
  notifyRecommendationContext();
}

function renderFixedSlot(itemId, ghostHeatGroups = new Set()) {
  const item = itemById(itemId);
  const name = item?.display_name || item?.name || "Fixed Structure Slot";
  const slots = Math.max(1, itemSlots(item));
  const tooltipItem = item ? ` data-tooltip-item="${item.id}"` : "";
  const ghostHeatClass = item?.item_type === "weapon" && ghostHeatGroups.has(ghostHeatGroupKey(item))
    ? " ghost-heat-triggered"
    : "";
  return `<div class="critical-slot fixed-slot${ghostHeatClass}"${tooltipItem} style="--slot-span:${slots}" aria-label="${escapeHtml(name)} / ${slots} slots">${name}</div>`;
}

function renderEngineSideSlots(engine, slots) {
  const name = engine?.display_name || t("common.engine");
  const tooltipItem = engine ? ` data-tooltip-item="${engine.id}"` : "";
  return `<div class="critical-slot fixed-slot engine-side-slot"${tooltipItem} style="--slot-span:${slots}" aria-label="${escapeHtml(name)} / ${slots} slots">${t("common.engine")}</div>`;
}

function renderFixedEngine(engine, slots, calc = null) {
  const name = engine?.display_name || t("common.engine");
  const tooltipItem = engine ? ` data-tooltip-item="${engine.id}"` : "";
  return `
    <div class="critical-slot fixed-slot engine-fixed-slot"${tooltipItem} data-engine-heat-sink-engine style="--slot-span:${slots}" aria-label="${escapeHtml(name)} / ${slots} slots">
      <strong class="engine-slot-name">${name}</strong>
      ${renderEngineHeatSinkBay(engine, calc)}
    </div>
  `;
}

function renderStructureSlots(slots, occupiedSlots = 0) {
  return Array.from({ length: slots }, (_, index) => {
    const occupied = index < occupiedSlots;
    const classes = occupied
      ? "critical-slot structure-upgrade-slot structure-upgrade-slot-occupied"
      : "critical-slot empty-slot structure-upgrade-slot";
    return `<div class="${classes}" title="Endo Steel slot">${t("stats.structure")}</div>`;
  }).join("");
}

function renderArmorSlots(slots, occupiedSlots = 0) {
  return Array.from({ length: slots }, (_, index) => {
    const occupied = index < occupiedSlots;
    const classes = occupied
      ? "critical-slot armor-upgrade-slot armor-upgrade-slot-occupied"
      : "critical-slot empty-slot armor-upgrade-slot";
    return `<div class="${classes}" title="Armor upgrade slot">${t("common.armor")}</div>`;
  }).join("");
}

function renderEngineHeatSinkBay(engine, calc) {
  const capacity = Math.min(6, number(calc?.engineHeatSinkCapacity, engineAdditionalHeatSinkCapacity(engine)));
  if (!engine || capacity <= 0) return "";
  const fixedOmniBay = Boolean(fixedOmniEngine());
  const fixedEntries = fixedEngineHeatSinkEntries();
  const installedEntries = engineHeatSinkEntries();
  const used = fixedEntries.length + installedEntries.length;
  if (fixedOmniBay && used <= 0) return "";
  const fixedBoxes = fixedEntries.slice(0, capacity).map(({ item, source }) => `
    <span class="engine-heat-sink-box filled fixed-engine-heat-sink${source === "omnipod" ? " omnipod-engine-heat-sink" : ""}" data-tooltip-item="${item.id}" aria-label="${escapeHtml(item.display_name || item.name)}"></span>
  `).join("");
  const installedBoxes = installedEntries.slice(0, Math.max(0, capacity - fixedEntries.length)).map((entry, index) => {
    const item = itemById(entry.item_id);
    const name = item?.display_name || item?.name || t("build.missing", { id: entry.item_id });
    if (fixedOmniBay) {
      const tooltipItem = item ? ` data-tooltip-item="${item.id}"` : "";
      return `
        <span class="engine-heat-sink-box filled fixed-engine-heat-sink omnipod-engine-heat-sink"${tooltipItem} aria-label="${escapeHtml(name)}"></span>
      `;
    }
    if (globalThis.__MWOLAB_MOBILE__) {
      return `
        <span class="engine-heat-sink-box filled installed-engine-heat-sink" aria-label="${escapeHtml(name)}"></span>
      `;
    }
    return `
      <span class="engine-heat-sink-box filled installed-engine-heat-sink" data-engine-heat-sink-item="${index}" role="button" tabindex="0" title="${escapeHtml(name)}" aria-label="${escapeHtml(name)}"></span>
    `;
  }).join("");
  const emptyBoxes = Array.from({ length: fixedOmniBay ? 0 : Math.max(0, capacity - used) }, () => (
    `<span class="engine-heat-sink-box empty-engine-heat-sink" aria-label="${t("common.empty")}"></span>`
  )).join("");
  const dropTarget = fixedOmniBay ? "" : " data-engine-heat-sink-drop";
  const displayedCapacity = fixedOmniBay ? used : capacity;
  const bay = `
    <div class="engine-inline-heat-sinks${fixedOmniBay ? " fixed-omni-engine-heat-sinks" : ""}"${dropTarget} style="--engine-heat-sink-columns:3" aria-label="${t("build.engineHeatSinks")} ${used}/${displayedCapacity}">
      ${fixedBoxes}${installedBoxes}${emptyBoxes}
    </div>
  `;
  if (!globalThis.__MWOLAB_MOBILE__ || fixedOmniBay) return bay;
  const userCapacity = engineUserHeatSinkCapacity(engine);
  const compatibleSink = compatibleHeatSinkForUpgrade();
  const canRemove = installedEntries.length > 0;
  const canAdd = Boolean(
    compatibleSink
    && installedEntries.length < userCapacity
    && !engineHeatSinkDropValidation(compatibleSink, { source: "warehouse", itemId: compatibleSink.id }),
  );
  return `
    <div class="mobile-engine-heat-sink-layout">
      ${bay}
      <div class="mobile-engine-heat-sink-controls" aria-label="${t("build.engineHeatSinks")}">
        <button type="button" data-mobile-engine-heat-sink-delta="-1" aria-label="${t("build.removeEngineHeatSink")}" ${canRemove ? "" : "disabled"}>−</button>
        <button type="button" data-mobile-engine-heat-sink-delta="1" aria-label="${t("build.addEngineHeatSink")}" ${canAdd ? "" : "disabled"}>+</button>
      </div>
    </div>
  `;
}

function renderLoadoutItem(component, entry, index, engineBayCalc = null, ghostHeatGroups = new Set()) {
  const item = itemById(entry.item_id);
  if (!item) return `<div class="slot-item missing-item">${t("build.missing", { id: entry.item_id })}</div>`;
  const slots = Math.max(1, effectiveItemSlots(item));
  const mountType = item.item_type === "ammo" ? ammoHardpointType(item) : equipmentHardpointType(item);
  const ammoClass = item.item_type === "ammo" ? " ammo" : "";
  const ghostHeatClass = item.item_type === "weapon" && ghostHeatGroups.has(ghostHeatGroupKey(item))
    ? " ghost-heat-triggered"
    : "";
  if (item.item_type === "engine" && engineBayCalc) {
    const higherEngine = adjacentEngineRating(item, 1);
    const lowerEngine = adjacentEngineRating(item, -1);
    return `
      <div class="slot-item engine engine-main-slot" data-loadout-item="${component}:${index}" data-engine-heat-sink-engine style="--slot-span:${slots}" aria-label="${escapeHtml(item.display_name)} / ${slots} slots / ${fmt(itemTons(item))} tons">
        <span class="slot-item-mark">E</span>
        <div class="engine-slot-content">
          <strong>${item.display_name}</strong>
          ${renderEngineHeatSinkBay(item, engineBayCalc)}
        </div>
      </div>
      <div class="engine-rating-controls" aria-label="Engine rating controls">
        <button type="button" data-engine-rating-component="${component}" data-engine-rating-index="${index}" data-engine-rating-delta="-1" ${lowerEngine ? "" : "disabled"} aria-label="Decrease engine rating">−</button>
        <button type="button" data-engine-rating-component="${component}" data-engine-rating-index="${index}" data-engine-rating-delta="1" ${higherEngine ? "" : "disabled"} aria-label="Increase engine rating">+</button>
      </div>
    `;
  }
  const row = `
    <div class="slot-item ${mountType || item.item_type}${ammoClass}${ghostHeatClass}" data-loadout-item="${component}:${index}" style="--slot-span:${slots}" aria-label="${escapeHtml(item.display_name)} / ${slots} slots / ${fmt(itemTons(item))} tons">
      <span class="slot-item-mark">${HARDPOINT_LABELS[mountType] || String(item.item_type || "?")[0].toUpperCase()}</span>
      <strong>${item.display_name}</strong>
    </div>
  `;
  return row;
}

function mechlabFittingTabLabels() {
  const counts = new Map();
  return state.mechlabTabs.map((tab) => {
    const mech = mechById(tab.mechId);
    const base = mech ? (mech.display_name || variantCode(mech)) : String(tab.mechId);
    const count = (counts.get(String(tab.mechId)) || 0) + 1;
    counts.set(String(tab.mechId), count);
    return count > 1 ? `${base} ${count}` : base;
  });
}

function renderMechlabFittingTabs() {
  const rail = $("mechlab-fitting-tabs");
  const list = $("mechlab-fitting-tab-list");
  const addButton = $("add-mechlab-fitting-tab");
  if (!rail || !list || !addButton) return;
  rail.hidden = state.mechlabTabs.length === 0;
  const emptySlotFocused = hasFocusedEmptyMechlabTabSlot();
  const labels = mechlabFittingTabLabels();
  list.innerHTML = state.mechlabTabs.map((tab, index) => {
    const label = labels[index];
    const active = !emptySlotFocused && tab.id === state.activeMechlabTabId;
    const closeButton = state.mechlabTabs.length > 1
      ? `<button class="mechlab-fitting-tab-close" type="button" data-close-mechlab-fitting-tab="${escapeHtml(tab.id)}" aria-label="${escapeHtml(t("mechlab.closeFittingTab", { mech: label }))}">×</button>`
      : "";
    return `
      <div class="mechlab-fitting-tab${active ? " active" : ""}${tab.communitySource ? " public-fitting" : ""}" role="presentation">
        <button class="mechlab-fitting-tab-select" type="button" role="tab" data-mechlab-fitting-tab="${escapeHtml(tab.id)}" aria-controls="mechlab-fitting-content" aria-selected="${String(active)}" tabindex="${active ? "0" : "-1"}" title="${escapeHtml(label)}">
          <span>${escapeHtml(label)}</span>
        </button>
        ${closeButton}
      </div>
    `;
  }).join("");
  const atLimit = state.mechlabTabs.length >= MAX_MECHLAB_FITTING_TABS;
  addButton.disabled = atLimit;
  addButton.classList.toggle("active", emptySlotFocused);
  addButton.setAttribute("aria-selected", String(emptySlotFocused));
  addButton.tabIndex = emptySlotFocused ? 0 : -1;
  addButton.title = atLimit
    ? t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS })
    : t("mechlab.addFittingTab");
  addButton.setAttribute("aria-label", addButton.title);
}

function renderVariant() {
  const mech = state.selectedMech;
  if (!mech) return;
  const stats = mech.definition?.stats || {};
  $("variant-name").textContent = mech.display_name;
  $("variant-meta").textContent = `${factionLabel(mech.faction)} - ${WEIGHT_CLASS_LABELS[mech.weight_class] || mech.weight_class || t("common.unknown")} - ${stats.MaxTons || "?"} ${t("common.tons")} - ${t("common.engine")} ${stats.MinEngineRating || "?"}-${stats.MaxEngineRating || "?"}`;
  renderMechlabFittingTabs();
  const calc = calculateBuild();
  $("data-status").textContent = calc.warnings.length ? calc.warnings.join(" - ") : t("status.loadedData", { count: state.index.counts.mechs });
  renderSummary(calc);
  renderMechSummary(calc);
  renderMechlabGhostHeatWarning();
  renderComponents(calc);
  if (state.activeEquipmentCategory === "ammo") renderEquipmentList();
}

function renderSelectionPrompt() {
  $("variant-name").textContent = t("info.selectMech");
  $("variant-meta").textContent = t("info.selectMechHint");
  renderMechlabFittingTabs();
  renderSummary();
  renderMechSummary();
  renderMechlabGhostHeatWarning();
  $("components").innerHTML = `<div class="empty">${t("info.componentsPrompt")}</div>`;
}

function renderAll() {
  if (state.activeMainTab === "equipment-info") {
    renderEquipmentInfo();
    return;
  }
  if (state.activeMainTab === "stats") {
    renderStatsPanel();
    return;
  }
  if (!globalThis.__MWOLAB_MOBILE__) renderMechList();
  if (state.activeMainTab === "info") {
    renderInfoPanel();
    return;
  }
  if (state.activeMainTab === "compare") {
    renderComparePanel();
    return;
  }
  renderEquipmentList();
  if (state.selectedMech) renderVariant();
  else renderSelectionPrompt();
}

function resetSelectedEquipmentForMech() {
  const selectedItem = itemById(state.selectedItemId);
  if (
    !itemMatchesMechFaction(selectedItem, state.selectedMech)
    || !equipmentMatchesSelectedMechCapabilities(selectedItem)
    || !heatSinkMatchesUpgrade(selectedItem)
  ) {
    state.selectedItemId = null;
  }
}

function selectMechBrowserCandidate(id) {
  const mech = mechById(id);
  if (!mech) return;
  state.mechlabBrowseSelectionId = String(mech.id);
  state.mechBrowserHoverMechId = String(mech.id);
  state.selectedChassis = mech.chassis || "";
  if (state.selectedChassis) state.expandedChassis.add(state.selectedChassis);
  syncMechListActiveStates();
  renderMechBrowserPreview();
}

function setMechlabFitting(mech, build, mode = "replace") {
  const tab = assignMechlabFittingTabRecord(mech, build, mode);
  if (!tab) {
    $("data-status").textContent = t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS });
    return null;
  }
  state.mechlabBrowseMode = false;
  state.mechlabBrowseIntent = "replace";
  state.mechlabBrowseSelectionId = String(mech.id);
  state.mechlabCompactListOpen = false;
  resetSelectedEquipmentForMech();
  if (state.selectedChassis) state.expandedChassis.add(state.selectedChassis);
  return tab;
}

function openMechlabTab(tabId, historyMode = "push") {
  const tab = activateMechlabTabRecord(tabId);
  if (!tab) return;
  state.mechlabBrowseMode = false;
  state.mechlabBrowseIntent = "replace";
  state.mechlabBrowseSelectionId = String(tab.mechId);
  state.mechlabCompactListOpen = false;
  resetSelectedEquipmentForMech();
  if (historyMode !== "none") {
    updateMechNavigation("mech", tab.mechId, historyMode, tab.id);
  }
  renderAll();
  document.querySelector(".tab-content").scrollTop = 0;
  requestAnimationFrame(updateMechlabScale);
}

function closeMechlabTab(tabId) {
  const activeBefore = state.activeMechlabTabId;
  if (!closeMechlabTabRecord(tabId)) return;
  const active = activeMechlabTab();
  if (activeBefore === tabId && active) {
    resetSelectedEquipmentForMech();
    updateMechNavigation("mech", active.mechId, "replace", active.id);
    renderAll();
  } else {
    renderMechlabFittingTabs();
  }
  requestAnimationFrame(() => $("mechlab-fitting-tab-list").querySelector('[aria-selected="true"]')?.focus());
}

function selectMech(id, { historyMode = "push", enterFitting = true, mechlabMode = null } = {}) {
  const nextMech = mechById(id) || state.mechs[0];
  if (!nextMech) return;
  const wasMechlabBrowsing = state.activeMainTab === "mechlab" && state.mechlabBrowseMode;
  if (wasMechlabBrowsing) rememberMechListScroll();

  if (state.activeMainTab === "mechlab" && !enterFitting) {
    selectMechBrowserCandidate(nextMech.id);
    return;
  }

  if (state.activeMainTab === "mechlab") {
    const preserveCurrentBuild = historyMode === "none"
      && String(state.selectedMech?.id || "") === String(nextMech.id)
      && state.currentBuild;
    const mode = mechlabMode || (wasMechlabBrowsing ? state.mechlabBrowseIntent : "replace");
    const tab = setMechlabFitting(nextMech, preserveCurrentBuild ? state.currentBuild : buildForMechSelection(nextMech), mode);
    if (!tab) return;
    if (historyMode !== "none") {
      updateMechNavigation("mech", nextMech.id, historyMode, tab.id);
    }
    renderAll();
    document.querySelector(".tab-content").scrollTop = 0;
    requestAnimationFrame(updateMechlabScale);
    return;
  }

  const preserveCurrentBuild = historyMode === "none"
    && String(state.selectedMech?.id || "") === String(nextMech?.id || "")
    && state.currentBuild;
  state.selectedMech = nextMech;
  if (SINGLE_MECH_SELECTION_TABS.has(state.activeMainTab)) {
    state.selectedMechIdsByTab[state.activeMainTab] = nextMech?.id ?? null;
  }
  state.selectedChassis = state.selectedMech?.chassis || "";
  if (!preserveCurrentBuild) state.currentBuild = loadBuild(state.selectedMech);
  resetSelectedEquipmentForMech();
  if (state.selectedChassis) state.expandedChassis.add(state.selectedChassis);
  if (historyMode !== "none" && state.selectedMech) {
    updateMainTabNavigation(state.activeMainTab, historyMode, state.selectedMech.id);
  }
  syncMechListActiveStates();
  renderMechlabCompactList();
  if (state.activeMainTab === "info") {
    renderInfoPanel();
  }
}

async function applyMechNavigationFromLocation() {
  if (!mechNavigationReady) return;
  const navigationSequence = ++sharedLoadoutNavigationSequence;
  const params = new URL(window.location.href).searchParams;
  if (params.has(SHARED_PUBLIC_FITTING_QUERY_PARAM)) return;
  if (restoreMechlabHistorySnapshot(window.history.state?.mechlabSnapshot)) return;
  const sharedLoadoutCode = params.get(SHARED_LOADOUT_QUERY_PARAM);
  if (sharedLoadoutCode) {
    try {
      const decodedLoadoutCode = await decodeSharedLoadoutValue(sharedLoadoutCode);
      if (navigationSequence !== sharedLoadoutNavigationSequence) return;
      const historyTabId = window.history.state?.fittingTabId;
      importMwoCode(decodedLoadoutCode, {
        closeDialog: false,
        updateNavigation: false,
        historyTabId,
      });
      await replaceSharedLoadoutNavigation(decodedLoadoutCode, sharedLoadoutCode);
    } catch (error) {
      if (navigationSequence === sharedLoadoutNavigationSequence) {
        $("data-status").textContent = error.message;
      }
    }
    return;
  }
  const tabParam = params.get("tab");
  const requestedTab = MAIN_TAB_NAMES.has(tabParam) ? tabParam : "mechlab";
  const requestedMechId = params.get("mech");
  const requestedMech = requestedMechId ? mechById(requestedMechId) : null;
  if (requestedTab !== "mechlab") {
    if (state.activeMainTab !== requestedTab) setMainTab(requestedTab);
    if (requestedMech && String(state.selectedMech?.id || "") !== String(requestedMech.id)) {
      selectMech(requestedMech.id, { historyMode: "none", enterFitting: false });
    }
    return;
  }
  if (state.activeMainTab !== "mechlab") setMainTab("mechlab");
  if (requestedMech) {
    const historyTabId = window.history.state?.fittingTabId;
    const tab = restoreMechlabHistoryTabRecord(requestedMech, historyTabId, buildForMechSelection(requestedMech));
    if (!tab) {
      const active = activeMechlabTab();
      if (active) {
        openMechlabTab(active.id, "none");
        updateMechNavigation("mech", active.mechId, "replace", active.id);
      }
      $("data-status").textContent = t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS });
      return;
    }
    openMechlabTab(tab.id, "none");
    updateMechNavigation("mech", tab.mechId, "replace", tab.id);
    return;
  }
  state.mechlabBrowseMode = true;
  state.mechlabBrowseIntent = hasFocusedEmptyMechlabTabSlot() ? "add" : "replace";
  state.mechlabBrowseSelectionId = activeMechlabTab()?.mechId ?? null;
  state.mechlabCompactListOpen = false;
  renderAll();
  restoreMechListScroll();
  $("mech-search").focus();
}

async function initializeMechNavigation() {
  mechNavigationReady = true;
  const navigationSequence = ++sharedLoadoutNavigationSequence;
  const params = new URL(window.location.href).searchParams;
  if (params.has(SHARED_PUBLIC_FITTING_QUERY_PARAM)) {
    renderAll();
    return;
  }
  const sharedLoadoutCode = params.get(SHARED_LOADOUT_QUERY_PARAM);
  let sharedLoadoutError = "";
  if (sharedLoadoutCode) {
    try {
      const decodedLoadoutCode = await decodeSharedLoadoutValue(sharedLoadoutCode);
      if (navigationSequence !== sharedLoadoutNavigationSequence) return;
      importMwoCode(decodedLoadoutCode, { closeDialog: false, updateNavigation: false });
      try {
        await replaceSharedLoadoutNavigation(decodedLoadoutCode, sharedLoadoutCode);
      } catch (error) {
        $("data-status").textContent = error.message;
      }
      return;
    } catch (error) {
      sharedLoadoutError = error.message;
    }
  }
  const tabParam = params.get("tab");
  const requestedTab = globalThis.__MWOLAB_MOBILE__
    ? "mechlab"
    : MAIN_TAB_NAMES.has(tabParam) ? tabParam : "mechlab";
  const requestedMechId = params.get("mech");
  const requestedMech = requestedMechId ? mechById(requestedMechId) : null;
  if (requestedTab === "mechlab") {
    updateMechNavigation(requestedMech ? "mech" : "list", requestedMech?.id, "replace");
  } else {
    updateMainTabNavigation(requestedTab, "replace");
  }
  await applyMechNavigationFromLocation();
  if (sharedLoadoutError) $("data-status").textContent = sharedLoadoutError;
}

function openMechFitting(id, { mechlabMode = null } = {}) {
  if (!mechById(id)) return;
  const mode = mechlabFittingTargetMode(mechlabMode || (
    state.activeMainTab === "mechlab" && state.mechlabBrowseMode
      ? state.mechlabBrowseIntent
      : "replace"
  ));
  if (state.activeMainTab !== "mechlab") setMainTab("mechlab");
  selectMech(id, { mechlabMode: mode });
}

function setLoadoutCodeStatus(message = "", tone = "") {
  const status = $("loadout-code-status");
  status.textContent = message;
  status.classList.toggle("error", tone === "error");
  status.classList.toggle("success", tone === "success");
}

async function openLoadoutCodeDialog(mode) {
  if (!globalThis.MWOCodec) {
    $("data-status").textContent = t("loadout.codecUnavailable");
    return;
  }
  loadoutCodeTrigger = document.activeElement;
  state.loadoutCodeMode = mode;
  const importing = mode === "import";
  const textarea = $("loadout-code-text");
  const urlField = $("loadout-url-field");
  const urlText = $("loadout-url-text");
  $("loadout-code-title").textContent = t(importing ? "loadout.importTitle" : "loadout.exportTitle");
  $("loadout-code-description").textContent = t(
    importing ? "loadout.importDescription" : "loadout.exportDescription",
  );
  $("apply-loadout-code").hidden = !importing;
  $("copy-loadout-code").hidden = importing;
  $("copy-loadout-url").hidden = importing;
  const mobileExport = Boolean(globalThis.__MWOLAB_MOBILE__ && !importing);
  $("close-loadout-code").hidden = mobileExport;
  $("close-loadout-code-mobile").hidden = !mobileExport;
  $("loadout-code-overlay").querySelector(".loadout-code-dialog")?.classList.toggle("mobile-export", mobileExport);
  urlField.hidden = importing;
  textarea.readOnly = !importing;
  textarea.placeholder = importing ? t("loadout.importPlaceholder") : "";
  setLoadoutCodeStatus();

  if (importing) {
    textarea.value = "";
    urlText.value = "";
  } else {
    try {
      textarea.value = MWOCodec.encode(currentBuildAsMwoLoadout());
    } catch (error) {
      textarea.value = "";
      urlText.value = "";
      setLoadoutCodeStatus(error.message, "error");
    }
    if (textarea.value) {
      try {
        urlText.value = await sharedLoadoutUrl(textarea.value);
      } catch (error) {
        urlText.value = "";
        setLoadoutCodeStatus(error.message, "error");
      }
    }
  }

  $("loadout-code-overlay").hidden = false;
  document.body.classList.add("loadout-code-open");
  requestAnimationFrame(() => {
    textarea.focus();
    if (!importing) textarea.select();
  });
}

function closeLoadoutCodeDialog() {
  if ($("loadout-code-overlay").hidden) return;
  $("loadout-code-overlay").hidden = true;
  document.body.classList.remove("loadout-code-open");
  const focusTarget = loadoutCodeTrigger?.isConnected
    ? loadoutCodeTrigger
    : state.loadoutCodeMode === "export"
      ? $("export-loadout-code")
      : $("import-loadout-code");
  focusTarget?.focus();
  loadoutCodeTrigger = null;
}

function setLocalBuildStatus(message = "", tone = "") {
  const status = $("local-build-status");
  status.textContent = message;
  status.classList.toggle("error", tone === "error");
  status.classList.toggle("success", tone === "success");
}

function renderLocalBuildList() {
  const records = sortedLocalBuilds();
  const currentMechId = String(state.selectedMech?.id || "");
  const loading = state.localBuildMode === "load";
  const managing = state.localBuildMode === "save" && state.localBuildManaging;
  $("local-build-list").innerHTML = records.length ? records.map((record) => {
    const mech = mechById(record.mechId);
    const mechName = mech?.display_name || record.mechName || record.mechId;
    const isCurrent = String(record.mechId) === currentMechId;
    const content = `
      <span class="local-build-record-name"><strong>${escapeHtml(mechName)}</strong><i aria-hidden="true">|</i><span>${escapeHtml(record.saveName)}</span></span>
      <span class="local-build-record-actions">
        ${isCurrent ? `<small>${t("localBuild.currentMech")}</small>` : ""}
        ${managing ? `<button class="local-build-delete-button" type="button" data-local-build-delete="${escapeHtml(record.id)}">${t("localBuild.delete")}</button>` : ""}
      </span>
    `;
    if (loading) {
      return `<button class="local-build-record${isCurrent ? " current" : ""}" type="button" role="option" data-local-build-load="${escapeHtml(record.id)}">${content}</button>`;
    }
    if (managing) {
      return `<div class="local-build-record${isCurrent ? " current" : ""}" role="option">${content}</div>`;
    }
    return isCurrent
      ? `<button class="local-build-record current" type="button" role="option" data-local-build-select="${escapeHtml(record.id)}">${content}</button>`
      : `<div class="local-build-record" role="option" aria-disabled="true">${content}</div>`;
  }).join("") : `<div class="local-build-empty">${t("localBuild.empty")}</div>`;
}

function updateLocalBuildManageMode() {
  const saving = state.localBuildMode === "save";
  const managing = saving && state.localBuildManaging;
  $("toggle-local-build-manage").hidden = !saving;
  $("toggle-local-build-manage").textContent = t(managing ? "localBuild.saveMode" : "localBuild.manage");
  $("local-build-name").disabled = managing;
  $("confirm-local-build-save").disabled = managing;
  $("local-build-save-form").classList.toggle("managing", managing);
  renderLocalBuildList();
}

function openLocalBuildDialog(mode) {
  if (!state.selectedMech || !state.currentBuild) return;
  state.localBuildMode = mode === "load" ? "load" : "save";
  state.localBuildManaging = false;
  const saving = state.localBuildMode === "save";
  $("local-build-title").textContent = t(saving ? "localBuild.saveTitle" : "localBuild.loadTitle");
  $("local-build-description").textContent = t(
    saving ? "localBuild.saveDescription" : "localBuild.loadDescription",
  );
  $("local-build-save-form").hidden = !saving;
  $("local-build-name").value = "";
  setLocalBuildStatus();
  updateLocalBuildManageMode();
  $("local-build-overlay").hidden = false;
  document.body.classList.add("local-build-open");
  requestAnimationFrame(() => {
    if (saving) $("local-build-name").focus();
    else $("local-build-list").querySelector("button")?.focus();
  });
}

function selectLocalBuildForSave(recordId) {
  if (state.localBuildMode !== "save" || state.localBuildManaging) return;
  const record = readLocalBuilds().find((entry) => entry.id === recordId);
  if (!record || String(record.mechId) !== String(state.selectedMech?.id || "")) return;
  $("local-build-name").value = record.saveName;
  setLocalBuildStatus();
  $("local-build-name").focus();
  $("local-build-name").select();
}

function toggleLocalBuildManageMode() {
  if (state.localBuildMode !== "save") return;
  state.localBuildManaging = !state.localBuildManaging;
  setLocalBuildStatus();
  updateLocalBuildManageMode();
  if (!state.localBuildManaging) $("local-build-name").focus();
}

function deleteNamedLocalBuild(recordId) {
  if (state.localBuildMode !== "save" || !state.localBuildManaging) return;
  const records = readLocalBuilds();
  const record = records.find((entry) => entry.id === recordId);
  if (!record) return;
  if (!writeLocalBuilds(records.filter((entry) => entry.id !== recordId))) {
    setLocalBuildStatus(t("localBuild.storageFailed"), "error");
    return;
  }
  if (record.id.startsWith("legacy:")) {
    const mech = mechById(record.mechId);
    if (mech) {
      try {
        localStorage.removeItem(savedKey(mech));
      } catch {
        // The named record is already deleted; leave an inaccessible legacy key untouched.
      }
    }
  }
  renderLocalBuildList();
  setLocalBuildStatus(t("localBuild.deleted", {
    mech: record.mechName || mechById(record.mechId)?.display_name || record.mechId,
    name: record.saveName,
  }), "success");
}

function closeLocalBuildDialog() {
  if ($("local-build-overlay").hidden) return;
  $("local-build-overlay").hidden = true;
  document.body.classList.remove("local-build-open");
  const focusTarget = state.localBuildMode === "load" ? $("local-load-build") : $("local-save-build");
  focusTarget?.focus();
}

function saveNamedLocalBuild() {
  if (!state.selectedMech || !state.currentBuild || state.localBuildManaging) return;
  const saveName = $("local-build-name").value.trim();
  if (!saveName) {
    setLocalBuildStatus(t("localBuild.nameRequired"), "error");
    $("local-build-name").focus();
    return;
  }
  const records = readLocalBuilds();
  const mechId = String(state.selectedMech.id);
  const existing = records.find((record) => (
    String(record.mechId) === mechId
    && record.saveName.trim().toLocaleLowerCase() === saveName.toLocaleLowerCase()
  ));
  const record = existing || {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
  };
  Object.assign(record, {
    mechId: state.selectedMech.id,
    mechName: state.selectedMech.display_name || state.selectedMech.name,
    saveName,
    build: JSON.parse(JSON.stringify(state.currentBuild)),
    updatedAt: Date.now(),
  });
  if (!existing) records.push(record);
  if (!writeLocalBuilds(records)) {
    setLocalBuildStatus(t("localBuild.storageFailed"), "error");
    return;
  }
  renderLocalBuildList();
  setLocalBuildStatus(t("localBuild.saved", { mech: record.mechName, name: record.saveName }), "success");
  $("data-status").textContent = t("localBuild.saved", { mech: record.mechName, name: record.saveName });
}

function loadNamedLocalBuild(recordId) {
  const record = readLocalBuilds().find((entry) => entry.id === recordId);
  const mech = record ? mechById(record.mechId) : null;
  if (!record || !mech || !record.build) {
    setLocalBuildStatus(t("localBuild.invalid"), "error");
    return;
  }
  try {
    state.selectedItemId = null;
    const build = applyFixedOmnipods(mech, JSON.parse(JSON.stringify(record.build)));
    const tab = setMechlabFitting(mech, build, mechlabFittingTargetMode());
    if (!tab) throw new Error("Unable to open fitting tab");
    updateMechNavigation("mech", mech.id, "push", tab.id);
    closeLocalBuildDialog();
    renderAll();
    $("data-status").textContent = t("localBuild.loaded", {
      mech: mech.display_name || record.mechName,
      name: record.saveName,
    });
    document.querySelector(".tab-content").scrollTop = 0;
  } catch {
    setLocalBuildStatus(t("localBuild.invalid"), "error");
  }
}

function importMwoCode(code, {
  closeDialog = true,
  updateNavigation = true,
  historyTabId = null,
} = {}) {
  if (!globalThis.MWOCodec) throw new Error(t("loadout.codecUnavailable"));
  const decoded = MWOCodec.decode(code);
  const mech = mechById(decoded.chassisId);
  if (!mech) throw new Error(t("loadout.invalidMech", { id: decoded.chassisId }));
  if (decoded.isOmni !== hasFixedOmnipods(mech)) {
    throw new Error(t("loadout.invalidMech", { id: decoded.chassisId }));
  }
  const build = buildFromMwoCode(decoded, mech);
  state.selectedItemId = null;
  if (state.activeMainTab !== "mechlab") setMainTab("mechlab");
  const historyTab = historyTabId
    ? state.mechlabTabs.find((entry) => (
      entry.id === historyTabId && String(entry.mechId) === String(mech.id)
    ))
    : null;
  if (historyTab) activateMechlabTabRecord(historyTab.id);
  const tab = setMechlabFitting(
    mech,
    build,
    mechlabFittingTargetMode(historyTabId && !historyTab ? "add" : "replace"),
  );
  if (!tab) throw new Error(t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS }));
  if (updateNavigation) updateMechNavigation("mech", mech.id, "push", tab.id);
  if (closeDialog) closeLoadoutCodeDialog();
  renderAll();
  $("data-status").textContent = t("loadout.imported", { mech: mech.display_name });
  document.querySelector(".tab-content").scrollTop = 0;
  if (closeDialog) {
    requestAnimationFrame(() => (
      $("mechlab-fitting-tab-list").querySelector('[aria-selected="true"]')?.focus()
    ));
  }
}

function describeMwoCode(code) {
  if (!globalThis.MWOCodec) throw new Error(t("loadout.codecUnavailable"));
  const decoded = MWOCodec.decode(code);
  const mech = mechById(decoded.chassisId);
  if (!mech || decoded.isOmni !== hasFixedOmnipods(mech)) {
    throw new Error(t("loadout.invalidMech", { id: decoded.chassisId }));
  }
  buildFromMwoCode(decoded, mech);
  return {
    mechId: String(mech.id),
    chassisKey: String(mech.chassis || ""),
    mechName: mech.display_name || mech.name || String(mech.id),
  };
}

const communityFittingAnalysisCache = new Map();
const COMMUNITY_SNIPER_WEAPON_IDS = new Set([
  1005, 1006, 1021, 1079, 1208,
  1213, 1217, 1255, 1256, 1257,
]);

function communitySniperWeapon(item) {
  return COMMUNITY_SNIPER_WEAPON_IDS.has(number(item?.id));
}

function communityFittingTagMetrics(weapons, metrics = {}) {
  const rangeDps = { short: 0, medium: 0, long: 0 };
  let sniperAlpha = 0;
  weapons.forEach((weapon) => {
    const damage = Math.max(0, number(weapon?.damage));
    const dps = damage / Math.max(0.016, number(weapon?.cycle, 0.016));
    const rangeType = weaponDetailRangeType(weapon?.item)?.type;
    if (Object.hasOwn(rangeDps, rangeType)) rangeDps[rangeType] += dps;
    if (communitySniperWeapon(weapon?.item)) sniperAlpha += damage;
  });
  return {
    ...metrics,
    rangeDps,
    sniperAlpha,
    brawlerAlpha: weapons.reduce((sum, weapon) => (
      weaponDetailRangeType(weapon?.item)?.type === "short"
        ? sum + Math.max(0, number(weapon?.damage))
        : sum
    ), 0),
  };
}

function communityFittingTags(metrics) {
  const dps = Math.max(0, number(metrics?.dps));
  const alphaDamage = Math.max(0, number(metrics?.alphaDamage));
  const armorPercent = Math.max(0, Math.min(100, number(metrics?.armorPercent)));
  const rangeDps = metrics?.rangeDps || {};
  const rangeTags = [
    ["short", "shortRange"],
    ["medium", "mediumRange"],
    ["long", "longRange"],
  ].flatMap(([rangeType, tag]) => {
    const rangeValue = Math.max(0, number(rangeDps[rangeType]));
    return rangeValue > 5 && dps > 0 && rangeValue / dps >= 0.4 ? [tag] : [];
  });
  return [
    ...(dps >= 20 ? ["highPower"] : []),
    ...(number(metrics?.heatEfficiency) >= 80 ? ["cooler"] : []),
    ...(metrics?.ghostHeat ? ["ghostHeat"] : []),
    ...(metrics?.hasArmor && armorPercent >= 100 ? ["fullArmor"] : []),
    ...(metrics?.hasArmor && armorPercent <= 65 ? ["glassArmor"] : []),
    ...rangeTags,
    ...(number(metrics?.sniperAlpha) >= 20
      && alphaDamage > 0
      && number(metrics?.sniperAlpha) / alphaDamage >= 0.4 ? ["sniper"] : []),
    ...(number(metrics?.brawlerAlpha) >= 30
      && alphaDamage > 0
      && number(metrics?.brawlerAlpha) / alphaDamage >= 0.7 ? ["brawler"] : []),
  ];
}

function communityInstalledWeaponSummary(items) {
  const hardpoints = { energy: 0, ballistic: 0, missile: 0, ams: 0 };
  const weaponCounts = new Map();
  items.forEach((item) => {
    const type = equipmentHardpointType(item);
    if (Object.hasOwn(hardpoints, type)) hardpoints[type] += 1;
    const key = String(item.id);
    if (!weaponCounts.has(key)) {
      weaponCounts.set(key, {
        id: key,
        name: item.display_name || item.name || key,
        count: 0,
        type,
        unitTons: itemTons(item),
        totalTons: 0,
      });
    }
    const weapon = weaponCounts.get(key);
    weapon.count += 1;
    weapon.totalTons = weapon.unitTons * weapon.count;
  });
  return { hardpoints, weapons: Array.from(weaponCounts.values()) };
}

function communityRepresentativeWeapons(weapons, limit = 4) {
  return (weapons || [])
    .map((weapon, index) => ({ weapon, index }))
    .sort((left, right) => number(right.weapon?.totalTons) - number(left.weapon?.totalTons) || left.index - right.index)
    .slice(0, Math.max(0, Math.floor(number(limit))))
    .map(({ weapon }) => weapon);
}

function analyzeMwoCode(code) {
  const cached = communityFittingAnalysisCache.get(code);
  if (cached) return cached;
  if (!globalThis.MWOCodec) throw new Error(t("loadout.codecUnavailable"));
  const decoded = MWOCodec.decode(code);
  const mech = mechById(decoded.chassisId);
  if (!mech || decoded.isOmni !== hasFixedOmnipods(mech)) {
    throw new Error(t("loadout.invalidMech", { id: decoded.chassisId }));
  }
  const build = buildFromMwoCode(decoded, mech);
  const previous = {
    selectedMech: state.selectedMech,
    currentBuild: state.currentBuild,
    selectedSkillGroups: state.selectedSkillGroups,
  };
  try {
    state.selectedMech = mech;
    state.currentBuild = build;
    state.selectedSkillGroups = new Set();
    const calc = calculateBuild();
    const simulationWeapons = collectSimulationWeapons();
    const heatSink = simulationHeatSinkItem();
    const quirks = mechlabEffectiveQuirks(mech, build);
    const quirkValues = mechlabQuirkValues(mech, build);
    const heatSystem = simulationHeatSystemFromSink(
      heatSink,
      calc.totalHeatSinkCount,
      quirkIncrease(quirks, "heatdissipation_multiplier"),
      quirkIncrease(quirks, "maxheat_multiplier"),
    );
    const metrics = mechSummaryWeaponMetrics(simulationWeapons, calc.alpha, heatSystem);
    const weaponSummary = communityInstalledWeaponSummary(installedMechItems("weapon"));
    const movement = movementInfo(quirkValues, mech);
    const currentArmor = currentBuildArmorTotal(quirkValues, mech, build);
    const maxArmor = armorInfoRows(quirkValues, mech).reduce((sum, row) => sum + number(row.total), 0);
    const armorPercent = maxArmor > 0
      ? Math.max(0, Math.min(100, currentArmor / maxArmor * 100))
      : 0;
    const tagMetrics = communityFittingTagMetrics(simulationWeapons, {
      ...metrics,
      alphaDamage: calc.alpha,
      armorPercent,
      hasArmor: maxArmor > 0,
      ghostHeat: ghostHeatForSimulationWeapons(simulationWeapons) > 0,
    });
    const structure = structureInfoRows(quirkValues, mech).reduce((sum, row) => sum + number(row.total), 0);
    const speed = calc.engine
      ? engineTooltipMaxSpeed(calc.engine) * quirkMultiplier(quirkValues, ["mechtopspeed_multiplier"])
      : 0;
    const analysis = {
      mechId: String(mech.id),
      chassisKey: String(mech.chassis || ""),
      mechName: mech.display_name || mech.name || String(mech.id),
      chassisName: formatChassisName(mech.chassis || ""),
      variantCode: variantCode(mech),
      image: mechIconSrc(mech),
      loadoutCode: code,
      hardpoints: weaponSummary.hardpoints,
      weapons: weaponSummary.weapons,
      representativeWeapons: communityRepresentativeWeapons(weaponSummary.weapons),
      tags: communityFittingTags(tagMetrics),
      metrics: {
        dps: metrics.dps,
        alphaDamage: calc.alpha,
        heatEfficiency: metrics.heatEfficiency,
      },
      stats: {
        tons: calc.totalTons,
        maxTons: calc.maxTons,
        slots: calc.currentSlotUsage,
        maxSlots: calc.totalSlotCapacity,
        engine: number(calc.engine?.stats?.rating),
        heatSinks: calc.totalHeatSinkCount,
        jumpJets: installedMechItems("jumpjet").length,
        maxSpeed: speed,
        turnSpeed: movement.turnSpeed,
        armor: currentArmor,
        maxArmor,
        structure,
        sensor: mechSensorRange(quirks, mech, build),
      },
    };
    communityFittingAnalysisCache.set(code, analysis);
    return analysis;
  } finally {
    state.selectedMech = previous.selectedMech;
    state.currentBuild = previous.currentBuild;
    state.selectedSkillGroups = previous.selectedSkillGroups;
  }
}

function localRecordLoadoutCode(record) {
  if (typeof record?.loadoutCode === "string") return record.loadoutCode;
  const mech = record ? mechById(record.mechId) : null;
  return mech && record?.build ? MWOCodec.encode(buildAsMwoLoadout(mech, record.build)) : "";
}

function communityLocalFittings() {
  const locale = activeLanguage === "kr" ? "ko" : activeLanguage;
  return readLocalBuilds().slice().sort((left, right) => (
    Number(right.updatedAt || 0) - Number(left.updatedAt || 0)
    || String(left.name || left.saveName).localeCompare(String(right.name || right.saveName), locale, { numeric: true })
  )).flatMap((record) => {
    try {
      const loadoutCode = localRecordLoadoutCode(record);
      return loadoutCode ? [{
        id: record.id,
        mechId: String(record.mechId),
        name: record.name || record.saveName,
        loadoutCode,
        updatedAt: Number(record.updatedAt || 0),
        schemaVersion: Number(record.schemaVersion) === 2 ? 2 : 1,
      }] : [];
    } catch {
      return [];
    }
  });
}

function saveCommunityLocalFitting({ name }) {
  if (!state.selectedMech || !state.currentBuild) throw new Error(t("info.selectMech"));
  const records = readLocalBuilds();
  const mechId = String(state.selectedMech.id);
  const existing = records.find((record) => (
    String(record.mechId) === mechId
    && String(record.name || record.saveName).trim().toLocaleLowerCase() === name.toLocaleLowerCase()
  ));
  const record = existing || { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` };
  Object.assign(record, {
    mechId: state.selectedMech.id,
    mechName: state.selectedMech.display_name || state.selectedMech.name,
    name,
    saveName: name,
    loadoutCode: MWOCodec.encode(currentBuildAsMwoLoadout()),
    updatedAt: Date.now(),
    schemaVersion: 2,
  });
  delete record.description;
  delete record.build;
  if (!existing) records.push(record);
  if (!writeLocalBuilds(records)) throw new Error(t("localBuild.storageFailed"));
  const tab = activeMechlabTab();
  if (tab) delete tab.communitySource;
  renderAll();
  return { id: record.id };
}

function deleteCommunityLocalFitting(recordId) {
  const records = readLocalBuilds();
  const record = records.find((entry) => entry.id === recordId);
  if (!record) return false;
  if (!writeLocalBuilds(records.filter((entry) => entry.id !== recordId))) return false;
  if (record.id.startsWith("legacy:")) {
    const mech = mechById(record.mechId);
    if (mech) {
      try { localStorage.removeItem(savedKey(mech)); }
      catch { /* The named record is already removed. */ }
    }
  }
  return true;
}

function communityFittingMechFilterOptions() {
  const grouped = groupMechsForList(state.mechs);
  return sortedClassNames(grouped).map((weightClass) => ({
    id: weightClass,
    label: WEIGHT_CLASS_LABELS[weightClass] || formatChassisName(weightClass),
    chassis: chassisGroupsForWeight(grouped, weightClass).map((group) => ({
      id: group.chassis,
      label: group.label,
      tons: group.tons,
      variants: group.variants.map((mech) => ({
        id: String(mech.id),
        name: mech.display_name || variantCode(mech),
        badgesHtml: mechSlotBadges(mech),
      })),
    })),
  }));
}

function applyCommunityFitting(record, isShared = false) {
  if (isShared && record.navigationMode !== "replace") preserveCurrentFittingHistoryEntry();
  importMwoCode(record.loadoutCode, { closeDialog: false, updateNavigation: !isShared });
  const tab = activeMechlabTab();
  if (tab && isShared) {
    tab.communitySource = {
      id: record.id,
      ownerUid: record.ownerUid,
      name: record.name,
      authorName: record.authorName || "Pilot",
      loadoutCode: record.loadoutCode,
      baselineLoadoutCode: MWOCodec.encode(currentBuildAsMwoLoadout()),
      likeCount: Number(record.likeCount || 0),
      liked: Boolean(record.liked),
      canLike: Boolean(record.canLike),
    };
    updatePublicFittingNavigation(record.id, record.navigationMode === "replace" ? "replace" : "push");
    renderAll();
  }
}

function restoreCommunityFitting() {
  const source = activeMechlabTab()?.communitySource;
  if (!source?.loadoutCode) return false;
  const retainedSource = { ...source };
  importMwoCode(source.loadoutCode, { closeDialog: false, updateNavigation: false });
  const tab = activeMechlabTab();
  if (!tab) return false;
  retainedSource.baselineLoadoutCode = MWOCodec.encode(currentBuildAsMwoLoadout());
  tab.communitySource = retainedSource;
  renderAll();
  return true;
}

function updateMechlabTabsPublicFittingLike(id, likeCount, liked, canLike = true) {
  let changed = false;
  state.mechlabTabs.forEach((tab) => {
    const source = tab.communitySource;
    if (!source || source.id !== id) return;
    Object.assign(source, { likeCount, liked, canLike });
    changed = true;
  });
  return changed;
}

function setMechlabTabsPublicLikeCapability(canLike) {
  communityLikeCapability = Boolean(canLike);
  let changed = false;
  state.mechlabTabs.forEach((tab) => {
    const source = tab.communitySource;
    if (!source) return;
    source.canLike = communityLikeCapability;
    if (!communityLikeCapability) source.liked = false;
    changed = true;
  });
  return changed;
}

function openPublicFittingSources() {
  const sources = new Map();
  state.mechlabTabs.forEach((tab) => {
    const source = tab.communitySource;
    if (source?.id && !sources.has(source.id)) {
      sources.set(source.id, { id: source.id, likeCount: source.likeCount });
    }
  });
  return [...sources.values()];
}

globalThis.MwoLabCommunityBridge = Object.freeze({
  language: activeLanguage,
  ready: communityBridgeReady,
  getCurrentFitting() {
    const loadoutCode = MWOCodec.encode(currentBuildAsMwoLoadout());
    return { loadoutCode, ...describeMwoCode(loadoutCode) };
  },
  currentMechId() {
    return state.selectedMech ? String(state.selectedMech.id) : "";
  },
  listFittingMechFilters: communityFittingMechFilterOptions,
  describeFitting: analyzeMwoCode,
  listLocalFittings: communityLocalFittings,
  saveLocalFitting: saveCommunityLocalFitting,
  deleteLocalFitting: deleteCommunityLocalFitting,
  openLocalFitting(record) {
    applyCommunityFitting(record, false);
  },
  openPublicFitting(record) {
    applyCommunityFitting(record, false);
  },
  openSharedFitting(record) {
    applyCommunityFitting(record, true);
  },
  setSharedFittingRequestPending(pending) {
    state.sharedFittingRequestPending = Boolean(pending);
    lastRecommendationContextSignature = "";
    if (state.selectedMech && state.currentBuild) renderComponents();
  },
  recommendationContext,
  setRecommendedFittings(mechId, records) {
    const normalizedMechId = String(mechId || "");
    if (normalizedMechId !== String(state.selectedMech?.id || "")) return false;
    state.recommendedFittingsMechId = normalizedMechId;
    state.recommendedFittings = (records || []).slice(0, 3).map((record) => ({
      id: String(record.id || ""),
      name: String(record.name || ""),
      likeCount: Math.max(0, Number(record.likeCount) || 0),
      tags: (record.tags || []).map((tag) => ({ key: String(tag.key || ""), label: String(tag.label || "") })),
    })).filter((record) => record.id && record.name);
    renderComponents();
    return true;
  },
  restorePublicFitting: restoreCommunityFitting,
  updatePublicFittingLike(id, likeCount, liked, canLike = true) {
    if (updateMechlabTabsPublicFittingLike(id, likeCount, liked, canLike)) renderComponents();
  },
  updatePublicFittingAuthor(ownerUid, authorName) {
    state.mechlabTabs.forEach((tab) => {
      if (tab.communitySource?.ownerUid === ownerUid) tab.communitySource.authorName = authorName || "Pilot";
    });
    if (state.selectedMech && state.currentBuild) renderComponents();
  },
  setPublicLikeCapability(canLike) {
    if (setMechlabTabsPublicLikeCapability(canLike)) renderComponents();
  },
  getPublicFittingSource() {
    const source = activeMechlabTab()?.communitySource;
    return source ? { id: source.id, likeCount: source.likeCount } : null;
  },
  listPublicFittingSources: openPublicFittingSources,
  clearPublicFittingMode() {
    const tab = activeMechlabTab();
    if (tab) delete tab.communitySource;
    renderAll();
  },
  clearPublicFittingIfMatches(id) {
    const tab = activeMechlabTab();
    if (!tab?.communitySource || tab.communitySource.id !== id) return;
    delete tab.communitySource;
    renderAll();
  },
  openFitting: importMwoCode,
});

function applyImportedMwoCode() {
  try {
    importMwoCode($("loadout-code-text").value);
  } catch (error) {
    setLoadoutCodeStatus(error.message, "error");
  }
}

async function copyLoadoutDialogValue(textarea, successMessage) {
  const code = textarea.value.trim();
  if (!code) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(code);
    setLoadoutCodeStatus(successMessage, "success");
  } catch {
    textarea.focus();
    textarea.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    setLoadoutCodeStatus(
      copied ? successMessage : t("loadout.copyFailed"),
      copied ? "success" : "error",
    );
  }
}

function copyExportedMwoCode() {
  return copyLoadoutDialogValue($("loadout-code-text"), t("loadout.copied"));
}

function copyExportedMwoUrl() {
  return copyLoadoutDialogValue($("loadout-url-text"), t("loadout.urlCopied"));
}

function showMechlabList() {
  if (!state.selectedMech || state.activeMainTab !== "mechlab") return;
  state.mechlabBrowseMode = false;
  state.mechlabCompactListOpen = true;
  if (state.selectedChassis) state.expandedChassis.add(state.selectedChassis);
  renderMechlabCompactList();
  $("mechlab-compact-search").focus();
}

function closeMechlabCompactList() {
  state.mechlabCompactListOpen = false;
  renderMechlabCompactList();
}

function showFullMechlabList(intent = null) {
  if (state.activeMainTab !== "mechlab") return;
  const resolvedIntent = intent === "add" || (intent === null && hasFocusedEmptyMechlabTabSlot())
    ? "add"
    : "replace";
  if (resolvedIntent === "add" && !focusEmptyMechlabTabSlot()) {
    $("data-status").textContent = t("mechlab.maxFittingTabs", { max: MAX_MECHLAB_FITTING_TABS });
    return;
  }
  if (resolvedIntent === "replace") clearEmptyMechlabTabSlotFocus();
  const alreadyBrowsing = state.mechlabBrowseMode;
  rememberActiveMechlabTabBuild();
  state.mechlabBrowseMode = true;
  state.mechlabBrowseIntent = resolvedIntent;
  state.mechlabBrowseSelectionId = activeMechlabTab()?.mechId ?? null;
  state.mechBrowserHoverMechId = null;
  state.mechlabCompactListOpen = false;
  notifyRecommendationContext();
  if (!alreadyBrowsing) updateMechNavigation("list");
  renderMechlabFittingTabs();
  renderMechList();
  renderMechlabCompactList();
  restoreMechListScroll();
  $("mech-search").focus();
}

function openMechFilterDialog(trigger) {
  mechFilterTrigger = trigger || document.activeElement;
  $("mech-filter-overlay").hidden = false;
  document.body.classList.add("mech-filter-open");
  renderMechFilterControls();
  requestAnimationFrame(() => {
    $("mech-filter-overlay").querySelector("[data-mech-filter-tab].active")?.focus();
  });
}

function closeMechFilterDialog() {
  if ($("mech-filter-overlay").hidden) return;
  $("mech-filter-overlay").hidden = true;
  document.body.classList.remove("mech-filter-open");
  renderMechFilterControls();
  mechFilterTrigger?.focus();
  mechFilterTrigger = null;
}

function toggleMechWeightFilter(weightClass) {
  if (state.mechFilterWeightClasses.has(weightClass)) {
    state.mechFilterWeightClasses.delete(weightClass);
  } else {
    state.mechFilterWeightClasses.add(weightClass);
  }
  renderMechList();
}

function toggleMechTypeFilter(type) {
  if (type === "all") {
    if (state.mechFilterAllTypes) return;
    state.mechFilterAllTypes = true;
    state.mechFilterTypeCategories.clear();
  } else {
    state.mechFilterAllTypes = false;
    if (state.mechFilterTypeCategories.has(type)) {
      state.mechFilterTypeCategories.delete(type);
      if (state.mechFilterTypeCategories.size === 0) {
        state.mechFilterAllTypes = true;
      }
    } else {
      state.mechFilterTypeCategories.add(type);
    }
  }
  renderMechList();
}

function toggleMechSpecialTypeFilter(type) {
  if (state.mechFilterSpecialTypes.has(type)) {
    state.mechFilterSpecialTypes.delete(type);
    if (state.mechFilterSpecialTypes.size === 0) {
      state.mechFilterSpecialTypes = new Set(
        state.mechSpecialTypeOptions.map((option) => option.key),
      );
    }
  } else {
    state.mechFilterSpecialTypes.add(type);
  }
  renderMechList();
}

function selectAllMechSpecialTypes() {
  state.mechFilterSpecialTypes = new Set(
    state.mechSpecialTypeOptions.map((option) => option.key),
  );
  renderMechList();
}

function toggleMechHardpointFilter(type) {
  const filter = state.mechHardpointFilters[type];
  if (!filter) return;
  filter.minimums.total = normalizeMechHardpointFilterMinimum(
    "total",
    filter.minimums.total,
  );
  filter.enabled = !filter.enabled;
  renderMechList();
}

function normalizeMechHardpointFilterMinimum(location, value) {
  const lowerBound = location === "total" ? 1 : 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.max(lowerBound, Math.floor(numericValue))
    : lowerBound;
}

function setMechHardpointFilterMinimum(type, location, value) {
  const filter = state.mechHardpointFilters[type];
  if (!filter || !Object.hasOwn(filter.minimums, location)) return;
  filter.minimums[location] = normalizeMechHardpointFilterMinimum(location, value);
  renderMechList();
}

function setMechFilterTab(tab) {
  if (tab !== "basic" && tab !== "special" && tab !== "quirks") return;
  state.activeMechFilterTab = tab;
  renderMechFilterControls();
}

function setMechQuirkFilterMode(mode) {
  if ((mode !== "all" && mode !== "any") || state.mechQuirkFilterMode === mode) return;
  state.mechQuirkFilterMode = mode;
  renderMechList();
}

function toggleMechQuirkFilter(quirk) {
  if (!state.mechQuirkFilterOptions.some((option) => option.key === quirk)) return;
  if (state.mechQuirkFilterSelections.has(quirk)) {
    state.mechQuirkFilterSelections.delete(quirk);
  } else {
    state.mechQuirkFilterSelections.set(quirk, null);
  }
  renderMechList();
}

function setMechQuirkFilterMinimum(quirk, value) {
  if (!state.mechQuirkFilterOptions.some((option) => option.key === quirk)) return;
  const text = String(value ?? "").trim();
  if (!text) {
    if (!state.mechQuirkFilterSelections.has(quirk)) return;
    state.mechQuirkFilterSelections.set(quirk, null);
    renderMechList();
    return;
  }
  const minimum = Number(text);
  if (!Number.isFinite(minimum) || minimum < 0) return;
  state.mechQuirkFilterSelections.set(quirk, minimum);
  renderMechList();
}

function clearMechQuirkFilters() {
  if (state.mechQuirkFilterSelections.size === 0) return;
  state.mechQuirkFilterSelections.clear();
  renderMechList();
}

function mechSpecialFeatureGroup(feature) {
  if (MECH_SPECIAL_TRAIT_ORDER.includes(feature)) return "traits";
  if (MECH_SPECIAL_EQUIPMENT_ORDER.includes(feature)) return "equipment";
  return "";
}

function toggleMechSpecialFeature(feature, requestedGroup = "") {
  const group = requestedGroup || mechSpecialFeatureGroup(feature);
  if (group !== "traits" && group !== "equipment") return;
  const selections = group === "traits"
    ? state.mechSpecialTraitSelections
    : state.mechSpecialEquipmentSelections;
  const order = group === "traits"
    ? MECH_SPECIAL_TRAIT_ORDER
    : MECH_SPECIAL_EQUIPMENT_ORDER;

  if (selections.has(feature)) {
    selections.delete(feature);
  } else if (order.includes(feature)) {
    selections.add(feature);
  }
  renderMechList();
}

function renderSkillControls() {
  const groups = skillSelectionGroups();
  const allSelected = groups.length > 0
    && groups.every((group) => state.selectedSkillGroups.has(group.key));
  const recommendedGroups = groups.filter((group) => (
    RECOMMENDED_SKILL_GROUP_KEYS.includes(group.key)
  ));
  const recommendedSelected = recommendedGroups.length === RECOMMENDED_SKILL_GROUP_KEYS.length
    && state.selectedSkillGroups.size === recommendedGroups.length
    && recommendedGroups.every((group) => state.selectedSkillGroups.has(group.key));
  const recommendedNodeCount = recommendedGroups.reduce(
    (total, group) => total + group.nodes.length,
    0,
  );
  $("skill-category-options").innerHTML = `
    <button class="skill-category-all${allSelected ? " active" : ""}" type="button" data-skill-category-all aria-pressed="${allSelected}">
      <span class="mech-filter-option-copy">
        <strong>${t("skills.applyAll")}</strong>
        <small class="skill-node-count">${t("skills.nodeCount", { count: state.skills.node_count || 0 })}</small>
      </span>
    </button>
    <button class="skill-category-recommended${recommendedSelected ? " active" : ""}" type="button" data-skill-category-recommended aria-pressed="${recommendedSelected}">
      <span class="mech-filter-option-copy">
        <strong>${t("skills.applyRecommended")}</strong>
        <small class="skill-node-count">${t("skills.nodeCount", { count: recommendedNodeCount })}</small>
      </span>
    </button>
    ${groups.map((group) => {
      const active = state.selectedSkillGroups.has(group.key);
      return `
        <button class="${active ? "active" : ""}" type="button" data-skill-group="${escapeHtml(group.key)}" aria-pressed="${active}">
          <span class="mech-filter-option-copy">
            <strong>${escapeHtml(t(group.labelKey))}</strong>
            <small class="skill-node-count">${t("skills.nodeCount", { count: group.nodes.length })}</small>
          </span>
        </button>
      `;
    }).join("")}
  `;
}

function refreshSelectedSkills() {
  state.skillEffectsCache.clear();
  state.mechlabQuirkValuesCache.clear();
  if (state.selectedMech && state.currentBuild) renderVariant();
  renderSkillControls();
}

function toggleSkillGroup(groupKey) {
  if (!skillSelectionGroups().some((group) => group.key === groupKey)) return;
  if (state.selectedSkillGroups.has(groupKey)) {
    state.selectedSkillGroups.delete(groupKey);
  } else {
    state.selectedSkillGroups.add(groupKey);
  }
  refreshSelectedSkills();
}

function toggleAllSkillGroups() {
  const groups = skillSelectionGroups();
  const allSelected = groups.length > 0
    && groups.every((group) => state.selectedSkillGroups.has(group.key));
  state.selectedSkillGroups.clear();
  if (!allSelected) groups.forEach((group) => state.selectedSkillGroups.add(group.key));
  refreshSelectedSkills();
}

function applyRecommendedSkillGroups() {
  const availableKeys = new Set(skillSelectionGroups().map((group) => group.key));
  state.selectedSkillGroups.clear();
  RECOMMENDED_SKILL_GROUP_KEYS.forEach((groupKey) => {
    if (availableKeys.has(groupKey)) state.selectedSkillGroups.add(groupKey);
  });
  refreshSelectedSkills();
}

function openSkillDialog() {
  if (!state.selectedMech || !state.currentBuild) return;
  renderSkillControls();
  $("skill-overlay").hidden = false;
  document.body.classList.add("skill-open");
  requestAnimationFrame(() => {
    $("skill-category-options").querySelector("button")?.focus();
  });
}

function closeSkillDialog() {
  if ($("skill-overlay").hidden) return;
  $("skill-overlay").hidden = true;
  document.body.classList.remove("skill-open");
  $("open-skills")?.focus();
}

function openBuildActionsDialog() {
  if (!state.selectedMech || !state.currentBuild) return;
  $("build-actions-overlay").hidden = false;
  document.body.classList.add("build-actions-open");
  requestAnimationFrame(() => {
    $("build-actions-overlay").querySelector("[data-build-action]")?.focus();
  });
}

function closeBuildActionsDialog() {
  if ($("build-actions-overlay").hidden) return;
  $("build-actions-overlay").hidden = true;
  document.body.classList.remove("build-actions-open");
  const returnTarget = globalThis.__MWOLAB_MOBILE__
    ? document.querySelector('[data-mobile-action="tools"]')
    : $("open-build-actions");
  returnTarget?.focus();
}

let activePersonalSettingsTab = "loadout";

function setPersonalSettingsTab(tabName, focus = false) {
  const normalized = ["loadout", "values", "common"].includes(tabName) ? tabName : "loadout";
  activePersonalSettingsTab = normalized;
  document.querySelectorAll("[data-personal-settings-tab]").forEach((button) => {
    const active = button.dataset.personalSettingsTab === normalized;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  document.querySelectorAll("[data-personal-settings-panel]").forEach((panel) => {
    const active = panel.dataset.personalSettingsPanel === normalized;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

function renderUiSettingsDialog() {
  renderInitialFittingPreferences();
  setPersonalSettingsTab(activePersonalSettingsTab);
  document.querySelectorAll('[name="quirk-value-display"]').forEach((input) => {
    input.checked = input.value === state.quirkValueDisplayMode;
    input.closest(".ui-display-option")?.classList.toggle("active", input.checked);
  });
  const simplifyAmmo = $("simplify-ammo-quirks");
  simplifyAmmo.checked = state.simplifyAmmoQuirks;
  simplifyAmmo.closest(".ui-display-option")?.classList.toggle("active", simplifyAmmo.checked);
  $("simplify-ammo-quirks-state").textContent = t(simplifyAmmo.checked ? "ui.on" : "ui.off");
  const showWeaponTooltipQuirks = $("show-weapon-tooltip-quirks");
  showWeaponTooltipQuirks.checked = state.showWeaponTooltipQuirks;
  showWeaponTooltipQuirks.closest(".ui-display-option")?.classList.toggle(
    "active",
    showWeaponTooltipQuirks.checked,
  );
  $("show-weapon-tooltip-quirks-state").textContent = t(
    showWeaponTooltipQuirks.checked ? "ui.on" : "ui.off",
  );
  const showRecommendedFittings = $("show-recommended-fittings");
  showRecommendedFittings.checked = state.showRecommendedFittings;
  showRecommendedFittings.closest(".ui-display-option")?.classList.toggle(
    "active",
    showRecommendedFittings.checked,
  );
  $("show-recommended-fittings-state").textContent = t(
    showRecommendedFittings.checked ? "ui.on" : "ui.off",
  );
}

function openUiSettingsDialog() {
  renderUiSettingsDialog();
  $("ui-settings-overlay").hidden = false;
  document.body.classList.add("ui-settings-open");
  requestAnimationFrame(() => {
    document.querySelector(`[data-personal-settings-tab="${activePersonalSettingsTab}"]`)?.focus();
  });
}

function closeUiSettingsDialog() {
  if ($("ui-settings-overlay").hidden) return;
  $("ui-settings-overlay").hidden = true;
  document.body.classList.remove("ui-settings-open");
  $("open-ui-settings")?.focus();
}

function setQuirkValueDisplayMode(mode) {
  if (!QUIRK_VALUE_DISPLAY_MODES.has(mode)) return;
  state.quirkValueDisplayMode = mode;
  try {
    localStorage.setItem(QUIRK_VALUE_DISPLAY_STORAGE_KEY, mode);
  } catch {
    // Keep the selected mode for this session when storage is unavailable.
  }
  renderUiSettingsDialog();
  if (activeEquipmentTooltipTarget) showEquipmentTooltip(activeEquipmentTooltipTarget);
}

function setSimplifyAmmoQuirks(enabled) {
  state.simplifyAmmoQuirks = Boolean(enabled);
  try {
    localStorage.setItem(
      SIMPLIFY_AMMO_QUIRKS_STORAGE_KEY,
      String(state.simplifyAmmoQuirks),
    );
  } catch {
    // Keep the selected mode for this session when storage is unavailable.
  }
  renderUiSettingsDialog();
  if (state.selectedMech && state.currentBuild) {
    renderMechSummary(calculateBuild());
  }
}

function setShowWeaponTooltipQuirks(enabled) {
  state.showWeaponTooltipQuirks = Boolean(enabled);
  try {
    localStorage.setItem(
      SHOW_WEAPON_TOOLTIP_QUIRKS_STORAGE_KEY,
      String(state.showWeaponTooltipQuirks),
    );
  } catch {
    // Keep the selected mode for this session when storage is unavailable.
  }
  renderUiSettingsDialog();
  if (activeEquipmentTooltipTarget) showEquipmentTooltip(activeEquipmentTooltipTarget);
}

function stripBuildArmor(build = state.currentBuild) {
  for (const component of Object.values(build.components || {})) {
    component.armor = 0;
  }
  build.rearArmor = Object.fromEntries(
    Object.keys(TORSO_REAR_COMPONENTS).map((name) => [name, 0]),
  );
}

function stripBuildEquipment(build = state.currentBuild) {
  for (const component of Object.values(build.components || {})) {
    component.items = [];
  }
  build.engineHeatSinks = [];
}

function maximizeBuildArmor(mech = state.selectedMech, build = state.currentBuild) {
  build.rearArmor ||= {};
  for (const [name, component] of Object.entries(build.components || {})) {
    const definition = effectiveComponentDefinition(mech, build, name);
    const capacity = componentArmorCapacity(name, definition);
    const rear = Object.hasOwn(TORSO_REAR_COMPONENTS, name)
      ? Math.min(capacity, Math.max(0, number(build.rearArmor[name])))
      : 0;
    component.armor = Math.max(0, capacity - rear);
  }
}

function applyBuildAction(action) {
  if (!state.selectedMech || !state.currentBuild) return;
  if (action === "stock-loadout") {
    state.currentBuild = buildFromLoadout(state.selectedMech);
    setActiveMechlabTabBuild(state.currentBuild);
  } else if (action === "strip-armor") {
    stripBuildArmor();
  } else if (action === "strip-equipment") {
    stripBuildEquipment();
  } else if (action === "strip-all") {
    stripBuildArmor();
    stripBuildEquipment();
  } else if (action === "max-armor") {
    maximizeBuildArmor();
  } else {
    return;
  }
  closeBuildActionsDialog();
  renderUpgradeControls();
  renderVariant();
}

function toggleCompareMech(id) {
  const mech = mechById(id);
  if (!mech) return;
  const index = state.compareMechIds.findIndex((mechId) => String(mechId) === String(id));
  if (index >= 0) {
    state.compareMechIds.splice(index, 1);
    if (String(state.compareBaselineMechId) === String(id)) {
      state.compareBaselineMechId = null;
    }
    if (!state.compareMechIds.length) {
      state.selectedChassis = "";
    }
  } else if (state.compareMechIds.length < MAX_COMPARE_MECHS) {
    state.compareMechIds.push(mech.id);
    state.selectedChassis = mech.chassis || state.selectedChassis;
  } else {
    $("data-status").textContent = t("compare.maxSelected", { max: MAX_COMPARE_MECHS });
    return;
  }
  if (state.selectedChassis) state.expandedChassis.add(state.selectedChassis);
  syncMechListActiveStates();
  renderComparePanel();
}

function removeCompareMech(id) {
  const index = state.compareMechIds.findIndex((mechId) => String(mechId) === String(id));
  if (index < 0) return;
  state.compareMechIds.splice(index, 1);
  if (String(state.compareBaselineMechId) === String(id)) {
    state.compareBaselineMechId = null;
  }
  if (!state.compareMechIds.length) {
    state.selectedChassis = "";
  }
  syncMechListActiveStates();
  renderComparePanel();
}

function clearCompareMechs() {
  state.compareMechIds = [];
  state.compareBaselineMechId = null;
  if (state.compareMode) {
    state.selectedChassis = "";
  }
  syncMechListActiveStates();
  renderComparePanel();
}

function toggleCompareBaseline(id) {
  const exists = state.compareMechIds.some((mechId) => String(mechId) === String(id));
  if (!exists) return;
  state.compareBaselineMechId = String(state.compareBaselineMechId) === String(id) ? null : id;
  renderComparePanel();
}

function toggleCompareCategory(category) {
  if (!category) return;
  if (state.collapsedCompareCategories.has(category)) {
    state.collapsedCompareCategories.delete(category);
  } else {
    state.collapsedCompareCategories.add(category);
  }
  renderComparePanel();
}

function selectItem(id) {
  state.selectedItemId = id;
  document.querySelectorAll("#item-list [data-item]").forEach((row) => {
    row.classList.toggle("active", String(row.dataset.item) === String(id));
  });
}

let activeEquipmentTooltipTarget = null;

function tooltipNumber(value, digits = 2, unit = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return `${formatInfoNumber(numeric, digits)}${unit}`;
}

function tooltipQuirkValue(base, final, digits = 2, unit = "", options = {}) {
  const baseNumber = Number(base);
  const finalNumber = Number(final);
  if (!Number.isFinite(baseNumber) || !Number.isFinite(finalNumber)) return "-";
  const delta = finalNumber - baseNumber;
  if (Math.abs(delta) < 0.0001) return tooltipNumber(baseNumber, digits, unit);
  return {
    final: tooltipNumber(finalNumber, digits, unit),
    base: formatInfoNumber(baseNumber, digits),
    operator: delta >= 0 ? "+" : "-",
    quirk: formatInfoNumber(Math.abs(delta), digits),
    harmful: Boolean(options.harmful),
  };
}

function tooltipGhostHeatValue(base, final, ghostHeat, digits = 2, unit = "") {
  const baseNumber = Number(base);
  const finalNumber = Number(final);
  const ghostHeatNumber = Number(ghostHeat);
  if (!Number.isFinite(baseNumber) || !Number.isFinite(finalNumber) || !(ghostHeatNumber > 0)) return "-";
  const delta = finalNumber - baseNumber;
  return {
    final: tooltipNumber(finalNumber, digits, unit),
    base: formatInfoNumber(baseNumber, digits),
    operator: delta >= 0 ? "+" : "-",
    quirk: formatInfoNumber(Math.abs(delta), digits),
    quirkApplied: Math.abs(delta) >= 0.0001,
    ghostHeat: tooltipNumber(ghostHeatNumber, digits, unit),
  };
}

function tooltipFinalQuirkValue(base, final, digits = 2, unit = "") {
  const baseNumber = Number(base);
  const finalNumber = Number(final);
  if (!Number.isFinite(baseNumber) || !Number.isFinite(finalNumber)) return "-";
  const value = tooltipNumber(finalNumber, digits, unit);
  if (Math.abs(finalNumber - baseNumber) < 0.0001) return value;
  return {
    html: `<span class="equipment-tooltip-final quirk-applied">${escapeHtml(value)}</span>`,
  };
}

function tooltipFinalTextValue(base, final) {
  const baseText = String(base ?? "");
  const finalText = String(final ?? "");
  if (baseText === finalText) return finalText;
  return {
    html: `<span class="equipment-tooltip-final quirk-applied">${escapeHtml(finalText)}</span>`,
  };
}

function tooltipValueHtml(value) {
  if (!value || typeof value !== "object") return escapeHtml(value);
  if (typeof value.html === "string") return value.html;
  if (value.ghostHeat !== undefined) {
    const finalClass = value.quirkApplied
      ? "equipment-tooltip-final quirk-applied"
      : "equipment-tooltip-final";
    const finalValue = `<span class="${finalClass}">${escapeHtml(value.final)}</span>`;
    const ghostHeatValue = `<span class="equipment-tooltip-ghost-heat">+ ${escapeHtml(value.ghostHeat)}</span>`;
    const finalAndGhostHeat = `${finalValue}${ghostHeatValue}`;
    if (!value.quirkApplied || state.quirkValueDisplayMode === "final") return finalAndGhostHeat;
    if (state.quirkValueDisplayMode === "quirk") {
      return `${finalValue}<span class="equipment-tooltip-quirk-detail">(<span class="equipment-tooltip-quirk-value">${escapeHtml(`${value.operator}${value.quirk}`)}</span>)</span>${ghostHeatValue}`;
    }
    return `${finalValue}<span class="equipment-tooltip-quirk-detail">(<span class="equipment-tooltip-base">${escapeHtml(value.base)}</span> <span class="equipment-tooltip-operator">${escapeHtml(value.operator)}</span> <span class="equipment-tooltip-quirk-value">${escapeHtml(value.quirk)}</span>)</span>${ghostHeatValue}`;
  }
  if (state.quirkValueDisplayMode === "final") {
    return `<span class="equipment-tooltip-final quirk-applied${value.harmful ? " quirk-harmful" : ""}">${escapeHtml(value.final)}</span>`;
  }
  if (state.quirkValueDisplayMode === "quirk") {
    return `<span class="equipment-tooltip-final quirk-applied${value.harmful ? " quirk-harmful" : ""}">${escapeHtml(value.final)}</span><span class="equipment-tooltip-quirk-detail">(<span class="equipment-tooltip-quirk-value${value.harmful ? " quirk-harmful" : ""}">${escapeHtml(`${value.operator}${value.quirk}`)}</span>)</span>`;
  }
  return `<span class="equipment-tooltip-final quirk-applied${value.harmful ? " quirk-harmful" : ""}">${escapeHtml(value.final)}</span><span class="equipment-tooltip-quirk-detail">(<span class="equipment-tooltip-base">${escapeHtml(value.base)}</span> <span class="equipment-tooltip-operator">${escapeHtml(value.operator)}</span> <span class="equipment-tooltip-quirk-value${value.harmful ? " quirk-harmful" : ""}">${escapeHtml(value.quirk)}</span>)</span>`;
}

function isRofDamageWeapon(item) {
  return isContinuousPerSecondWeapon(item);
}

function weaponDamagePerSecond(item, quirks = [], modules = installedMechItems("module")) {
  const directDamage = weaponDirectDamage(item, modules);
  const rof = number(item?.stats?.rof);
  if (!(rof > 0)) return { base: directDamage, final: directDamage };
  const rofBonus = collectWeaponQuirkEffects(item, quirks).totals.rofBonus;
  return {
    base: directDamage * rof,
    final: directDamage * rof * (1 + rofBonus),
  };
}

function amsDamagePerSecond(item, quirks = []) {
  const base = Math.max(0, number(item?.stats?.damage));
  const additive = collectWeaponQuirkEffects(item, quirks).totals.damageAdditive;
  return { base, final: base + additive };
}

function weaponDamageRate(item, quirks = [], modules = installedMechItems("module")) {
  if (isAmsWeapon(item)) return amsDamagePerSecond(item, quirks);
  if (isRofDamageWeapon(item)) return weaponDamagePerSecond(item, quirks, modules);
  return null;
}

function weaponTotalDamageRate(item, quirks = [], modules = installedMechItems("module")) {
  const directRate = weaponDamageRate(item, quirks, modules);
  if (!directRate) return null;
  const directDamage = weaponDirectDamage(item, modules);
  const totalDamage = weaponTotalDamage(item, true, modules);
  const multiplier = directDamage > 0 ? totalDamage / directDamage : 1;
  return {
    base: directRate.base * multiplier,
    final: directRate.final * multiplier,
  };
}

function weaponDamageTooltipValue(item, quirks = [], modules = installedMechItems("module")) {
  const damageRate = weaponDamageRate(item, quirks, modules);
  if (damageRate) return tooltipQuirkValue(damageRate.base, damageRate.final, 1, "/s");
  const baseDirectDamage = weaponDirectDamage(item, []);
  const finalDirectDamage = weaponDirectDamage(item, modules);
  const directDamage = tooltipNumber(finalDirectDamage, 1);
  const totalSplashDamage = weaponSplashDamage(item, modules) * 2;
  if (!(totalSplashDamage > 0)) {
    return tooltipFinalQuirkValue(baseDirectDamage, finalDirectDamage, 1);
  }
  return {
    html: `${escapeHtml(directDamage)} <span class="equipment-tooltip-splash">+ ${escapeHtml(tooltipNumber(totalSplashDamage, 1))}</span>`,
  };
}

function weaponTooltipRanges(item) {
  const ranges = (item?.ranges || [])
    .map((range) => ({ start: number(range.start), modifier: number(range.damageModifier) }))
    .filter((range) => Number.isFinite(range.start))
    .sort((left, right) => left.start - right.start);
  if (!ranges.length) return {};
  const maxRange = Math.max(...ranges.map((range) => range.start));
  const maxModifier = Math.max(...ranges.map((range) => range.modifier));
  const fullDamageRanges = ranges.filter((range) => Math.abs(range.modifier - maxModifier) < 0.0001);
  const minRange = fullDamageRanges[0]?.start;
  const optimalRange = fullDamageRanges.at(-1)?.start;
  const hasMinimumRange = Number.isFinite(minRange)
    && minRange > ranges[0].start
    && ranges[0].modifier < maxModifier;
  return { maxRange, optimalRange, minRange: hasMinimumRange ? minRange : undefined };
}

function weaponTooltipSpread(
  item,
  quirks,
  modules = installedMechItems("module"),
  statField = "spread",
) {
  const spread = weaponSpreadValues(item, quirks, modules, statField);
  if (!spread) return null;
  return tooltipQuirkValue(spread.base, spread.final, 2, "", {
    harmful: spread.modifier > 0,
  });
}

function weaponTooltipCriticalChance(item, targetComputer = targetComputerWeaponModifiers(item)) {
  const baseChances = String(item?.stats?.critChanceIncrease ?? "")
    .split(",")
    .map((value) => Number(value));
  const additions = targetComputer.criticalChance || [];
  const size = Math.max(baseChances.length, additions.length);
  const chances = Array.from({ length: size }, (_, index) => {
    const baseChance = Number.isFinite(baseChances[index]) ? baseChances[index] : 0;
    return Math.abs(baseChance + 1) < 0.0001
      ? -1
      : baseChance + number(additions[index]);
  });
  if (!chances.some((value) => Number.isFinite(value) && value !== 0)) return null;
  const formatValues = (source) => source.map((chance) => {
    if (!Number.isFinite(chance) || chance === 0) return null;
    if (Math.abs(chance + 1) < 0.0001) {
      return '<span class="equipment-tooltip-negative">X</span>';
    }
    const text = escapeHtml(tooltipNumber(chance * 100, 1, "%"));
    return chance < 0 ? `<span class="equipment-tooltip-negative">${text}</span>` : text;
  });
  const finalValues = formatValues(chances);
  while (finalValues.length && finalValues.at(-1) === null) finalValues.pop();
  const hasTargetBonus = additions.some((value) => Math.abs(number(value)) >= 0.0001);
  if (!hasTargetBonus) return { html: finalValues.map((value) => value ?? "-").join(" / ") };
  return {
    html: `<span class="equipment-tooltip-final quirk-applied">${finalValues.map((value) => value ?? "-").join(" / ")}</span>`,
  };
}

function weaponTooltipCriticalDamage(item) {
  const multiplier = Number(item?.stats?.critDamMult);
  if (!Number.isFinite(multiplier) || Math.abs(multiplier - 1) < 0.0001) return null;
  const value = `${escapeHtml(String(Number(multiplier.toFixed(2))))}x`;
  return multiplier < 1
    ? { html: `<span class="equipment-tooltip-negative">${value}</span>` }
    : value;
}

function weaponTooltipTargetHeat(item) {
  const targetHeat = number(item?.stats?.heatdamage);
  if (!(targetHeat > 0)) return null;
  return tooltipNumber(targetHeat, 2, isRofDamageWeapon(item) ? "/s" : "");
}

function weaponTooltipStatistics(item, quirks = [], modules = installedMechItems("module")) {
  const stats = item?.stats || {};
  const baseTotalDamage = Math.max(0, weaponTotalDamage(item, true, []));
  const finalTotalDamage = Math.max(0, weaponTotalDamage(item, true, modules));
  const baseHeat = Math.max(0, itemHeat(item));
  const finalHeat = Math.max(0, simulationWeaponHeat(item, quirks));
  const damageRate = weaponTotalDamageRate(item, quirks, modules);
  const hasCooldown = number(stats.cooldown) > 0;
  const baseExpectedCooldown = weaponExpectedCooldown(item, [], []);
  const finalExpectedCooldown = weaponExpectedCooldown(item, quirks, modules);
  const baseCycle = baseExpectedCooldown ?? simulationWeaponTiming(item, [], []).cooldown;
  const finalCycle = finalExpectedCooldown ?? simulationWeaponTiming(item, quirks, modules).cooldown;
  const rows = [];

  if (damageRate) {
    if (damageRate.base > 0) {
      rows.push(["DPS", tooltipQuirkValue(damageRate.base, damageRate.final, 2)]);
    }
    if (baseHeat > 0 && finalHeat > 0 && damageRate.base > 0 && damageRate.final > 0) {
      rows.push(["DPH", tooltipQuirkValue(
        isContinuousPerSecondWeapon(item) ? damageRate.base / baseHeat : baseTotalDamage / baseHeat,
        isContinuousPerSecondWeapon(item) ? damageRate.final / finalHeat : finalTotalDamage / finalHeat,
        2,
      )]);
    }
    if (baseHeat > 0 && (
      isContinuousPerSecondWeapon(item)
      || (baseCycle > 0 && finalCycle > 0)
    )) {
      rows.push(["HPS", tooltipQuirkValue(
        isContinuousPerSecondWeapon(item) ? baseHeat : baseHeat / baseCycle,
        isContinuousPerSecondWeapon(item) ? finalHeat : finalHeat / finalCycle,
        2,
      )]);
    }
    return rows;
  }

  if (hasCooldown && finalTotalDamage > 0 && baseCycle > 0 && finalCycle > 0) {
    rows.push(["DPS", tooltipQuirkValue(baseTotalDamage / baseCycle, finalTotalDamage / finalCycle, 2)]);
  }
  if (baseHeat > 0 && finalHeat > 0 && finalTotalDamage > 0) {
    rows.push(["DPH", tooltipQuirkValue(baseTotalDamage / baseHeat, finalTotalDamage / finalHeat, 2)]);
  }
  if (hasCooldown && baseHeat > 0 && baseCycle > 0 && finalCycle > 0) {
    rows.push(["HPS", tooltipQuirkValue(baseHeat / baseCycle, finalHeat / finalCycle, 2)]);
  }
  return rows;
}

function isUltraAutoCannon(item) {
  return Array.from(simulationItemKeys(item)).some((key) => key.includes("ultraautocannon"));
}

function isAtmWeapon(item) {
  const keys = simulationItemKeys(item);
  return keys.has("atm") || keys.has("clanatm");
}

function atmRangeBoundary(distance, multiplier = 1) {
  return Number((number(distance) * Math.max(0, number(multiplier, 1))).toFixed(6));
}

function atmTooltipDamageBands(item, rangeBonus = 0) {
  if (!isAtmWeapon(item)) return [];
  const damage = weaponDirectDamage(item);
  const multiplier = Math.max(0, 1 + number(rangeBonus));
  const secondStart = Math.ceil(atmRangeBoundary(350, multiplier));
  const thirdStart = Math.ceil(atmRangeBoundary(650, multiplier));
  const maximumRange = Math.round(atmRangeBoundary(1100, multiplier));
  return [
    { damage: damage * 1.25, start: 60, end: secondStart - 1 },
    { damage, start: secondStart, end: thirdStart - 1 },
    { damage: damage * 0.8, start: thirdStart, end: maximumRange },
  ];
}

function ultraAutoCannonJamStats(item, quirks = []) {
  const baseChance = Math.max(0, number(item?.stats?.JammingChance));
  const baseDuration = Math.max(0, number(item?.stats?.JammedTime));
  const effects = collectWeaponQuirkEffects(item, quirks).totals;
  const chanceReduction = effects.jamChanceReduction;
  const durationReduction = effects.jamDurationReduction;
  return {
    baseChance,
    chance: Math.max(0, Math.min(1, baseChance * Math.max(0, 1 - chanceReduction))),
    baseDuration,
    duration: Math.max(0, baseDuration * Math.max(0, 1 - durationReduction)),
  };
}

function engineTooltipMaxSpeed(engine) {
  const definition = currentDefinition(state.selectedMech);
  const tons = number(definition?.stats?.MaxTons);
  if (!tons) return 0;
  return number(definition?.movement?.MaxMovementSpeed) * number(engine?.stats?.rating) / tons;
}

function mascTooltipMovementGroups(item, quirkValues = mechlabQuirkValues()) {
  const stats = item?.stats || {};
  const movement = movementInfo(quirkValues);
  const engine = installedEngine();
  const quirkFinalSpeed = engine
    ? engineTooltipMaxSpeed(engine) * quirkMultiplier(quirkValues, ["mechtopspeed_multiplier"])
    : 0;
  const definitions = [
    { label: "SPEED", boost: number(stats.BoostSpeed), value: quirkFinalSpeed, digits: 1, unit: " kph" },
    { label: "ACCEL", boost: number(stats.BoostAccel), value: movement.acceleration, digits: 1, unit: " kph/s" },
    { label: "DECEL", boost: number(stats.BoostDecel), value: movement.deceleration, digits: 1, unit: " kph/s" },
    { label: "TURN", boost: number(stats.BoostTurn), value: movement.turnSpeed, digits: 2, unit: " °/s" },
  ].filter(({ boost }) => Math.abs(boost) >= 0.0001);

  return [
    definitions.map(({ label, boost }) => [
      `${label} BOOST`,
      tooltipNumber(boost * 100, 1, "%"),
    ]),
    definitions.map(({ label, boost, value, digits, unit }) => [
      `FINAL ${label}`,
      tooltipNumber(value * (1 + boost), digits, unit),
    ]),
  ];
}

function targetComputerTooltipRows(item) {
  const rows = [];
  const advancedSensorPackage = isAdvancedSensorPackage(item);
  (item?.weapon_stat_filters || []).forEach((filter) => {
    const scope = advancedSensorPackage && String(filter.tag || "").toLowerCase() === "beamweapons"
      ? "TAG"
      : String(filter.tag || "WEAPONS").replace(/Weapons$/i, "").toUpperCase();
    (filter.ranges || []).forEach((range) => {
      const multiplier = number(range.multiplier, 1);
      if (Math.abs(multiplier - 1) >= 0.0001) {
        rows.push([`${scope} RANGE`, tooltipNumber((multiplier - 1) * 100, 1, "%")]);
      }
    });
    (filter.weapon_stats || []).forEach((weaponStats) => {
      const operation = String(weaponStats.operation || "");
      if (operation === "*" && number(weaponStats.speed) > 0) {
        rows.push([`${scope} VELOCITY`, tooltipNumber((number(weaponStats.speed) - 1) * 100, 1, "%")]);
      }
      if (operation === "+" && weaponStats.critChanceIncrease !== undefined) {
        const values = String(weaponStats.critChanceIncrease)
          .split(",")
          .map((value) => tooltipNumber(number(Number(value)) * 100, 2, "%"))
          .join(" / ");
        rows.push([`${scope} CRITICAL CHANCE`, values]);
      }
      if (number(item?.id) === 9031 && weaponFilterFunctionMode(filter)) {
        const labels = {
          volleydelay: "C.HAG INTERVAL",
        };
        Object.entries(labels).forEach(([field, label]) => {
          if (weaponStats[field] === undefined) return;
          const operand = Number(weaponStats[field]);
          if (!Number.isFinite(operand)) return;
          rows.push([
            label,
            operation === "+"
              ? signedEquipmentEffectText(operand, 4)
              : `×${tooltipNumber(operand, 4)}`,
          ]);
        });
      }
    });
  });
  const functionModes = new Set(
    (item?.weapon_stat_filters || []).map(weaponFilterFunctionMode).filter(Boolean),
  );
  return [
    ...(functionModes.has("shotgun") ? [["HAG / GAUSS FIRING MODE", "SHOTGUN"]] : []),
    ...(functionModes.has("single-projectile") ? [["AC / UAC FIRING MODE", "SINGLE PROJECTILE"]] : []),
    ...(functionModes.has("stream-fire") ? [["LRM / ATM VOLLEY", "STREAM FIRE"]] : []),
    ...rows,
  ];
}

function equipmentTooltipGroups(
  item,
  ghostHeatExtra = 0,
  quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild),
  modules = installedMechItems("module"),
) {
  const stats = item?.stats || {};
  const effectiveQuirkValues = quirkValues(quirks);
  const groups = [[
      ["TONS", tooltipNumber(itemTons(item), 2)],
      ["SLOTS", tooltipNumber(effectiveItemSlots(item), 0)],
  ]];

  if (item.item_type === "weapon") {
    const ranges = weaponTooltipRanges(item);
    const baseTiming = simulationWeaponTiming(item, [], []);
    const timing = simulationWeaponTiming(item, quirks, modules);
    const baseExpectedCooldown = weaponExpectedCooldown(item, [], []);
    const expectedCooldown = weaponExpectedCooldown(item, quirks, modules);
    const heat = simulationWeaponHeat(item, quirks);
    const rangeBonus = simulationWeaponRangeBonus(item, quirks);
    const targetComputer = targetComputerWeaponModifiers(item, modules);
    const finalRangeMultiplier = Math.max(0, 1 + rangeBonus + targetComputer.rangeBonus);
    const velocityBonus = collectWeaponQuirkEffects(item, quirks).totals.velocityBonus;
    const heatUnit = isContinuousPerSecondWeapon(item) ? "/s" : "";
    const timingRows = [
      ["DAMAGE", weaponDamageTooltipValue(item, quirks, modules)],
      ["HEAT", ghostHeatExtra > 0
        ? tooltipGhostHeatValue(itemHeat(item), heat, ghostHeatExtra, 2, heatUnit)
        : tooltipQuirkValue(itemHeat(item), heat, 2, heatUnit)],
    ];
    if (number(stats.cooldown) > 0) {
      timingRows.push([
        "COOLDOWN",
        tooltipQuirkValue(baseTiming.cooldown, timing.cooldown, 2, " s"),
      ]);
      if (baseExpectedCooldown !== null && expectedCooldown !== null) timingRows.push([
        "EXPECTED COOLDOWN",
        tooltipFinalQuirkValue(baseExpectedCooldown, expectedCooldown, 1, " s"),
      ]);
    }
    groups.push(timingRows);
    if (number(stats.duration) > 0) groups.push([
      ["DURATION", tooltipQuirkValue(stats.duration, timing.duration, 2, " s", {
        harmful: timing.durationModifier > 0,
      })],
    ]);
    const rangeRows = [];
    if (Number.isFinite(ranges.minRange)) rangeRows.push([
      "MIN RANGE",
      tooltipNumber(ranges.minRange, 0, " m"),
    ]);
    if (Number.isFinite(ranges.optimalRange)) rangeRows.push([
      "OPTIMAL RANGE",
      targetComputer.rangeBonus !== 0
        ? tooltipFinalQuirkValue(ranges.optimalRange, ranges.optimalRange * finalRangeMultiplier, 0, " m")
        : tooltipQuirkValue(ranges.optimalRange, ranges.optimalRange * finalRangeMultiplier, 0, " m"),
    ]);
    if (Number.isFinite(ranges.maxRange)) rangeRows.push([
      "MAX RANGE",
      targetComputer.rangeBonus !== 0
        ? tooltipFinalQuirkValue(ranges.maxRange, ranges.maxRange * finalRangeMultiplier, 0, " m")
        : tooltipQuirkValue(ranges.maxRange, ranges.maxRange * finalRangeMultiplier, 0, " m"),
    ]);
    if (number(stats.speed) > 0 && !isHitscanWeapon(item)) rangeRows.push([
      "VELOCITY",
      weaponTooltipVelocityValue(number(stats.speed), velocityBonus, targetComputer),
    ]);
    groups.push(rangeRows);
    const firingProfile = effectiveWeaponFiringProfile(item, modules);
    const baseFiringProfile = effectiveWeaponFiringProfile(item, []);
    const streamFire = firingProfile.modes.has("stream-fire");
    const shotInterval = firingProfile.shotDelay;
    const ammoInfoRows = [];
    const showShots = firingProfile.totalProjectiles > 1
      || firingProfile.shotgun
      || firingProfile.singleProjectile
      || streamFire;
    if (showShots) {
      ammoInfoRows.push([
        "SHOTS",
        tooltipFinalTextValue(baseFiringProfile.displayShots, firingProfile.displayShots),
      ]);
    }
    if (firingProfile.eventCount > 1 && shotInterval > 0) {
      ammoInfoRows.push([
        "SHOT INTERVAL",
        firingProfile.shotgun || streamFire
          ? tooltipFinalQuirkValue(stats.volleydelay, shotInterval, 4, " s")
          : tooltipNumber(shotInterval, 4, " s"),
      ]);
    }
    if (ammoInfoRows.length) groups.push(ammoInfoRows);
    const weaponDetailRows = [];
    atmTooltipDamageBands(item, finalRangeMultiplier - 1).forEach((band, index) => {
      weaponDetailRows.push([
        `DAMAGE BAND ${index + 1}`,
        `${tooltipNumber(band.damage, 1)} (${band.start}~${band.end} m)`,
      ]);
    });
    const spread = weaponTooltipSpread(item, quirks, modules);
    const directSpread = weaponTooltipSpread(item, quirks, modules, "spreadLOS");
    const criticalChance = weaponTooltipCriticalChance(item, targetComputer);
    const criticalDamage = weaponTooltipCriticalDamage(item);
    const targetHeat = weaponTooltipTargetHeat(item);
    if (spread) weaponDetailRows.push(["SPREAD", spread]);
    if (criticalChance) weaponDetailRows.push(["CRITICAL CHANCE", criticalChance]);
    if (criticalDamage) weaponDetailRows.push(["CRITICAL DAMAGE", criticalDamage]);
    if (targetHeat) weaponDetailRows.push(["TARGET HEAT", targetHeat]);
    if (number(stats.chargeTime) > 0) {
      weaponDetailRows.push(["CHARGE TIME", tooltipNumber(stats.chargeTime, 2, " s")]);
    }
    if (isUltraAutoCannon(item)) {
      const jam = ultraAutoCannonJamStats(item, quirks);
      weaponDetailRows.push([
        "JAM DURATION",
        tooltipQuirkValue(jam.baseDuration, jam.duration, 2, " s"),
      ]);
      weaponDetailRows.push([
        "JAM CHANCE",
        tooltipQuirkValue(jam.baseChance * 100, jam.chance * 100, 1, "%"),
      ]);
    }
    groups.push(weaponDetailRows);
    const directFireRows = [];
    if (directSpread) directFireRows.push(["SPREAD DIRECT", directSpread]);
    const directVelocity = weaponDirectVelocity(item);
    if (directVelocity !== null) directFireRows.push([
      "VELOCITY DIRECT",
      weaponTooltipVelocityValue(directVelocity, velocityBonus, targetComputer),
    ]);
    groups.push(directFireRows);
    groups.push(weaponTooltipStatistics(item, quirks, modules));
  } else if (isHeatSink(item)) {
    const dissipationBonus = quirkIncrease(quirks, "heatdissipation_multiplier");
    const capacityBonus = quirkIncrease(quirks, "maxheat_multiplier");
    const baseCapacity = Math.abs(number(stats.heatbase));
    groups.push([
      ["HEAT CAPACITY", tooltipQuirkValue(baseCapacity, baseCapacity * (1 + capacityBonus), 2)],
      ["HEAT DISSIPATION", tooltipQuirkValue(stats.cooling, number(stats.cooling) * (1 + dissipationBonus), 2, "/s")],
      ["ENGINE CAPACITY", tooltipNumber(Math.abs(number(stats.engineHeatbase)), 2)],
      ["ENGINE DISSIPATION", tooltipQuirkValue(stats.engineCooling, number(stats.engineCooling) * (1 + dissipationBonus), 2, "/s")],
    ]);
  } else if (item.item_type === "engine") {
    const baseSpeed = engineTooltipMaxSpeed(item);
    const finalSpeed = baseSpeed * quirkMultiplier(effectiveQuirkValues, ["mechtopspeed_multiplier"]);
    groups.push([
      ["ENGINE RATING", tooltipNumber(stats.rating, 0)],
      ["MAX SPEED", tooltipQuirkValue(baseSpeed, finalSpeed, 1, " kph")],
      ["INTERNAL HEAT SINKS", tooltipNumber(engineIncludedHeatSinkCount(item), 0)],
      ["ADDITIONAL HEAT SINKS", tooltipNumber(engineAdditionalHeatSinkCapacity(item), 0)],
    ]);
  } else if (item.item_type === "ammo") {
    const finalShots = effectiveAmmoShots(item, quirks);
    groups.push([
      ["AMMO", tooltipQuirkValue(stats.numShots, finalShots, 0)],
      ["INTERNAL DAMAGE", tooltipNumber(stats.internalDamage, 2)],
    ]);
  } else if (item.item_type === "jumpjet") {
    const finalStats = jumpJetFinalStats(item, quirks);
    groups.push([
      ["DURATION", tooltipQuirkValue(stats.duration, finalStats.duration, 2, " s")],
      ["COOLDOWN", tooltipNumber(stats.cooldown, 2, " s")],
      ["INITIAL THRUST", tooltipQuirkValue(stats.boost_instant, finalStats.initialThrust, 1)],
      ["VERTICAL THRUST", tooltipNumber(stats.boost_z, 1)],
      ["FORWARD THRUST", tooltipNumber(stats.boost_fwd, 1)],
    ]);
  } else if (item.item_type === "masc") {
    groups.push(...mascTooltipMovementGroups(item, effectiveQuirkValues));
  } else if (equipmentLimitGroup(item) === "target-computer"
    || (equipmentLimitGroup(item) === ""
      && (isEquipmentInfoTargetComputer(item) || hasWeaponFilterFunctionMode(item)))) {
    const advancedSensorPackage = isAdvancedSensorPackage(item);
    if (advancedSensorPackage) groups.push([
      ["ZOOM LEVEL 1 BOOST", tooltipNumber(100, 0, "%")],
      ["ZOOM LEVEL 2 BOOST", tooltipNumber(200, 0, "%")],
      ["ADV. ZOOM BOOST", tooltipNumber(260, 0, "%")],
      ["SENSOR RANGE", tooltipNumber(targetEquipmentSensorRangeBonus(item) * 100, 1, "%")],
      ["TARGETING GAIN TIME BOOST", tooltipNumber(42.5, 1, "%")],
      ...targetComputerTooltipRows(item),
    ]);
    const moduleRows = [
      ["HEALTH", tooltipNumber(stats.health, 1)],
      ["MAX EQUIPPED", tooltipNumber(stats.amountAllowed, 0)],
    ];
    if (advancedSensorPackage || isEquipmentInfoTargetComputer(item)) moduleRows.push([
      "SENSOR RANGE",
      advancedSensorPackage ? "-" : tooltipNumber(equipmentInfoModuleSensorRangeBonus(item) * 100, 2, "%"),
    ]);
    groups.push(moduleRows);
    if (!advancedSensorPackage) groups.push(targetComputerTooltipRows(item));
  } else if (equipmentLimitGroup(item) === "active-probe") {
    groups.push([
      ["DETECTION RANGE", tooltipNumber(stats.mechdetectionrange, 0, " m")],
      ["SENSOR RANGE", tooltipNumber(number(stats.rangeboost) * 100, 1, "%")],
      ["INFO GAIN TIME", tooltipNumber(number(stats.gaintimeboost) * 100, 1, "%")],
      ["MAX EQUIPPED", tooltipNumber(stats.amountAllowed, 0)],
    ]);
  } else {
    const detailRows = [];
    if (number(stats.range) > 0) detailRows.push(["RANGE", tooltipNumber(stats.range, 0, " m")]);
    if (number(stats.health) > 0) detailRows.push(["HEALTH", tooltipNumber(stats.health, 1)]);
    if (number(stats.amountAllowed) > 0) detailRows.push(["MAX EQUIPPED", tooltipNumber(stats.amountAllowed, 0)]);
    groups.push(detailRows);
  }
  return groups
    .map((rows) => rows.filter(([, value]) => value !== "-"))
    .filter((rows) => rows.length);
}

function equipmentTooltipTone(item) {
  if (item?.item_type === "weapon") return equipmentHardpointType(item) || "weapon";
  if (item?.item_type === "ammo") return ammoHardpointType(item) || "ammo";
  if (item?.item_type === "engine") return "engine";
  if (isHeatSink(item)) return "heatsink";
  if (isEcm(item)) return "ecm";
  return "equipment";
}

function equipmentTooltipItem(target) {
  if (!target) return null;
  if (target.dataset.tooltipItem) return itemById(target.dataset.tooltipItem);
  if (target.dataset.item) return itemById(target.dataset.item);
  if (target.dataset.engineHeatSinkItem !== undefined) {
    return itemById(engineHeatSinkEntries()[Number(target.dataset.engineHeatSinkItem)]?.item_id);
  }
  if (target.dataset.loadoutItem) {
    const [component, indexText] = target.dataset.loadoutItem.split(":");
    return itemById(state.currentBuild?.components?.[component]?.items?.[Number(indexText)]?.item_id);
  }
  return null;
}

function equipmentTooltipOmnipod(target) {
  if (!target) return null;
  return podById(target.dataset.tooltipOmnipod || target.dataset.omnipod);
}

function omnipodTooltipQuirkRows(quirks, inactive = false) {
  if (!quirks.length) return '<div class="omnipod-tooltip-empty">NO QUIRKS</div>';
  return sortQuirksForDisplay(quirks).map((quirk) => `
    <div class="omnipod-tooltip-quirk ${quirkToneClass(quirk)}${inactive ? " inactive" : ""}">
      <span>${escapeHtml(quirk.display_name || quirk.name)}</span>
      <strong>${escapeHtml(quirk.value_text || quirkValueText(quirk.name, quirk.value))}</strong>
    </div>
  `).join("");
}

function omnipodTooltipHtml(pod) {
  const name = `${String(pod.set || "OMNIPOD").toUpperCase()} ${String(pod.component || "").replaceAll("_", " ").toUpperCase()}`.trim();
  const hardpoints = hardpointCountsFromHardpoints(omnipodDefinition(pod).hardpoints);
  const hardpointChips = renderHardpointBadges(hardpoints, "omnipod-tooltip-hardpoint-chip")
    || '<div class="omnipod-tooltip-empty">NO HARDPOINTS</div>';
  const so8 = omnipodSetBonusInfo(pod, 8);
  const so8Quirks = aggregateQuirkContributions(so8.quirks.map((quirk) => ({
    ...quirk,
    source: `${String(pod.set || "").toUpperCase()} 8pc`,
    inactive: !so8.active,
  })));
  return `
    <div class="equipment-tooltip-card tooltip-equipment omnipod-tooltip-card">
      <div class="equipment-tooltip-title">${escapeHtml(name)}</div>
      <div class="omnipod-tooltip-section">
        <div class="omnipod-tooltip-section-title">HARDPOINTS</div>
        <div class="hardpoint-line omnipod-tooltip-hardpoints">${hardpointChips}</div>
      </div>
      <div class="omnipod-tooltip-section">
        <div class="omnipod-tooltip-section-title">QUIRKS</div>
        <div class="omnipod-tooltip-rows">${omnipodTooltipQuirkRows(pod.quirks || [])}</div>
      </div>
      <div class="omnipod-tooltip-section">
        <div class="omnipod-tooltip-section-title omnipod-tooltip-so8-title">
          <span>SO8 QUIRKS</span>
          <strong class="${so8.active ? "active" : "inactive"}">${so8.active ? "ACTIVE" : "INACTIVE"} ${so8.installedPieces}/8</strong>
        </div>
        <div class="omnipod-tooltip-rows">${omnipodTooltipQuirkRows(so8Quirks, !so8.active)}</div>
      </div>
    </div>
  `;
}

function equipmentTooltipAppliedEffectsHtml(
  item,
  quirks,
  equipmentEffects = null,
) {
  if (!state.showWeaponTooltipQuirks || !item) return "";
  const applied = collectEquipmentQuirkEffects(item, quirks).applied;
  const equipmentSources = item.item_type === "weapon"
    ? (equipmentEffects || collectInstalledWeaponEquipmentEffects(item)).sources || []
    : [];
  const equipmentToneClass = weaponEquipmentEffectToneClass(item);
  if (!applied.length && !equipmentSources.length) return "";
  return `
    <section class="equipment-tooltip-effects">
      <div class="equipment-tooltip-effects-title">${escapeHtml(t("equipmentTooltip.appliedEffects"))}</div>
      <div class="equipment-tooltip-effect-rows">
        ${applied.map((quirk) => {
          return `
            <div class="equipment-tooltip-effect ${quirkToneClass(quirk)}${quirk.harmful ? " quirk-tone-harmful" : ""}">
              <span>${escapeHtml(quirk.display_name || quirk.name)}</span>
              <strong class="quirk-value">${escapeHtml(quirk.display_value_text || quirk.value_text || quirkValueText(quirk.name, quirk.value))}</strong>
            </div>
          `;
        }).join("")}
      </div>
      ${equipmentSources.length ? `
        <div class="equipment-tooltip-equipment-sources${applied.length ? " has-quirks" : ""}">
          ${equipmentSources.map((source) => `
            <div class="equipment-tooltip-equipment-source">
              <div class="equipment-tooltip-equipment-source-title">${escapeHtml(source.display_name || source.name)}</div>
              <div class="equipment-tooltip-equipment-effect-rows">
                ${source.effects.map((effect) => `
                  <div class="equipment-tooltip-equipment-effect ${equipmentToneClass}">
                    <span>${escapeHtml(effect.label)}</span>
                    <strong class="quirk-value">${escapeHtml(effect.value_text)}</strong>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function equipmentTooltipHtml(item, ghostHeatExtra = 0) {
  const tone = equipmentTooltipTone(item);
  const quirks = mechlabEffectiveQuirks(state.selectedMech, state.currentBuild);
  const groups = equipmentTooltipGroups(item, ghostHeatExtra, quirks);
  const appliedEffects = equipmentTooltipAppliedEffectsHtml(item, quirks);
  const showDescription = item.item_type !== "weapon"
    && item.item_type !== "ammo"
    && item.item_type !== "engine"
    && !isHeatSink(item);
  const description = showDescription ? String(item?.description || "").trim() : "";
  return `
    <div class="equipment-tooltip-card tooltip-${tone}">
      <div class="equipment-tooltip-title">${escapeHtml(item.display_name || item.name)}</div>
      <div class="equipment-tooltip-stats">
        ${groups.map((rows) => `
          <div class="equipment-tooltip-group">
            ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${tooltipValueHtml(value)}</strong></div>`).join("")}
          </div>
        `).join("")}
      </div>
      ${appliedEffects}
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    </div>
  `;
}

function ghostHeatWarningTooltipHtml() {
  const warnings = mechlabGhostHeatWarnings();
  const heatCapacity = simulationHeatSystem().maxHeat;
  return `
    <div class="equipment-tooltip-card tooltip-ghost-heat">
      <div class="equipment-tooltip-title">${escapeHtml(t("mechlab.ghostHeatWarningTitle"))}</div>
      <div class="ghost-heat-warning-tooltip-lines">
        ${warnings.map((warning) => {
          const percent = heatCapacity > 0 ? warning.totalHeat / heatCapacity * 100 : 0;
          const percentMarker = "__GHOST_HEAT_PERCENT__";
          const totalMarker = "__GHOST_HEAT_TOTAL__";
          const ghostMarker = "__GHOST_HEAT_VALUE__";
          const line = escapeHtml(t("mechlab.ghostHeatWarningLine", {
            weapons: warning.weapons,
            percent: percentMarker,
            totalHeat: totalMarker,
            ghostHeat: ghostMarker,
          }))
            .replace(percentMarker, `<strong class="ghost-heat-capacity-percent">${escapeHtml(equipmentInfoValue(percent, 1, "%"))}</strong>`)
            .replace(totalMarker, `<strong class="ghost-heat-total-value">${escapeHtml(equipmentInfoValue(warning.totalHeat, 2))}</strong>`)
            .replace(ghostMarker, `<strong class="ghost-heat-extra-value">${escapeHtml(equipmentInfoValue(warning.extraHeat, 2))}</strong>`);
          return `<p>${line}</p>`;
        }).join("")}
      </div>
    </div>
  `;
}

function positionEquipmentTooltip(target = activeEquipmentTooltipTarget) {
  const tooltip = $("equipment-tooltip");
  if (!tooltip || tooltip.hidden || !target?.isConnected) return;
  const gap = 14;
  const margin = 8;
  const rect = target.getBoundingClientRect();
  tooltip.style.maxWidth = "";
  tooltip.style.maxHeight = "";
  const naturalWidth = tooltip.offsetWidth;
  const spaceRight = Math.max(0, window.innerWidth - margin - rect.right - gap);
  const spaceLeft = Math.max(0, rect.left - gap - margin);
  const placeRight = spaceRight >= naturalWidth || (spaceLeft < naturalWidth && spaceRight >= spaceLeft);
  const availableWidth = placeRight ? spaceRight : spaceLeft;
  tooltip.style.maxWidth = `${Math.max(1, availableWidth)}px`;

  const left = placeRight
    ? rect.right + gap
    : rect.left - gap - tooltip.offsetWidth;
  tooltip.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - tooltip.offsetWidth - margin))}px`;

  const availableHeight = Math.max(1, window.innerHeight - margin * 2);
  const naturalHeight = tooltip.offsetHeight;
  if (naturalHeight > availableHeight) tooltip.style.maxHeight = `${availableHeight}px`;
  const renderedHeight = Math.min(naturalHeight, availableHeight);
  const maximumTop = Math.max(margin, window.innerHeight - margin - renderedHeight);
  const top = Math.max(margin, Math.min(rect.top, maximumTop));
  tooltip.style.top = `${top}px`;
}

function showEquipmentTooltip(target) {
  if (globalThis.__MWOLAB_MOBILE__) {
    hideEquipmentTooltip();
    return;
  }
  const item = equipmentTooltipItem(target);
  const omnipod = equipmentTooltipOmnipod(target);
  const ghostHeatWarning = target?.dataset.ghostHeatWarning !== undefined;
  const tooltip = $("equipment-tooltip");
  if ((!item && !omnipod && !ghostHeatWarning) || !tooltip) return;
  activeEquipmentTooltipTarget = target;
  const ghostHeatExtra = item && target.classList.contains("ghost-heat-triggered")
    ? mechlabGhostHeatWarnings().find(({ groupKey }) => groupKey === ghostHeatGroupKey(item))?.extraHeat || 0
    : 0;
  tooltip.innerHTML = ghostHeatWarning
    ? ghostHeatWarningTooltipHtml()
    : omnipod ? omnipodTooltipHtml(omnipod) : equipmentTooltipHtml(item, ghostHeatExtra);
  tooltip.classList.toggle("ghost-heat-tooltip-open", ghostHeatWarning);
  tooltip.hidden = false;
  positionEquipmentTooltip(target);
}

function hideEquipmentTooltip() {
  const tooltip = $("equipment-tooltip");
  activeEquipmentTooltipTarget = null;
  if (tooltip) {
    tooltip.hidden = true;
    tooltip.classList.remove("ghost-heat-tooltip-open");
  }
}

function reflowInstalledEquipment() {
  if (!state.currentBuild || !state.selectedMech) return [];
  const pending = [];
  for (const component of COMPONENT_ORDER) {
    const buildComponent = state.currentBuild.components?.[component];
    if (!buildComponent) continue;
    const retained = [];
    for (const entry of buildComponent.items || []) {
      const item = itemById(entry.item_id);
      if (item?.item_type === "engine") retained.push(entry);
      else if (item) pending.push({ entry, item, preferredComponent: component });
    }
    buildComponent.items = retained;
  }

  const displaced = [];
  for (const candidate of pending) {
    if (!dropValidation(candidate.item, candidate.preferredComponent)) {
      state.currentBuild.components[candidate.preferredComponent].items.push(candidate.entry);
    } else {
      displaced.push(candidate);
    }
  }

  const dropped = [];
  for (const candidate of displaced) {
    const calc = calculateBuild();
    const destination = COMPONENT_ORDER
      .filter((component) => component !== candidate.preferredComponent)
      .filter((component) => !dropValidation(candidate.item, component))
      .map((component, order) => {
        const definition = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
        const usage = calc.componentUsage[component] || { slots: 0 };
        return {
          component,
          order,
          freeAfterInstall: number(definition.slots) - number(usage.slots) - effectiveItemSlots(candidate.item),
        };
      })
      .sort((a, b) => a.freeAfterInstall - b.freeAfterInstall || a.order - b.order)[0]?.component;
    if (destination) state.currentBuild.components[destination].items.push(candidate.entry);
    else dropped.push(candidate.entry);
  }
  return dropped;
}

function installWarehouseItemInComponent(item, component, { render = true } = {}) {
  const warning = dropValidation(item, component);
  if (warning) return false;
  if (item.item_type === "engine") {
    Object.values(state.currentBuild.components).forEach((buildComponent) => {
      buildComponent.items = (buildComponent.items || [])
        .filter((entry) => itemById(entry.item_id)?.item_type !== "engine");
    });
  }
  state.currentBuild.components[component].items.push(buildEntryForItem(item));
  normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
  if (item.item_type === "engine") reflowInstalledEquipment();
  if (render) renderVariant();
  return true;
}

function setShowRecommendedFittings(enabled) {
  state.showRecommendedFittings = Boolean(enabled);
  try {
    localStorage.setItem(
      SHOW_RECOMMENDED_FITTINGS_STORAGE_KEY,
      String(state.showRecommendedFittings),
    );
  } catch {
    // Keep the selected mode for this session when storage is unavailable.
  }
  lastRecommendationContextSignature = "";
  renderUiSettingsDialog();
  if (state.selectedMech && state.currentBuild) renderComponents();
}

function autoInstallWarehouseItem(item) {
  if (!item || !state.currentBuild) return false;
  const warehouseSource = { source: "warehouse", itemId: item.id };
  if (isHeatSink(item) && !engineHeatSinkDropValidation(item, warehouseSource)) {
    engineHeatSinkEntries().push(buildEntryForItem(item));
    renderVariant();
    return true;
  }

  const calc = calculateBuild();
  const candidates = (item.item_type === "engine" ? ["centre_torso"] : COMPONENT_ORDER)
    .filter((component) => !dropValidation(item, component))
    .map((component, order) => {
      const definition = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
      const usage = calc.componentUsage[component] || { slots: 0 };
      const freeAfterInstall = number(definition.slots) - number(usage.slots) - effectiveItemSlots(item);
      return { component, order, freeAfterInstall };
    })
    .sort((a, b) => a.freeAfterInstall - b.freeAfterInstall || a.order - b.order);

  if (candidates.length && installWarehouseItemInComponent(item, candidates[0].component)) return true;
  setDropStatus(t("build.noAutoInstallLocation"));
  return false;
}

function removeInstalledItem(component, index, { render = true } = {}) {
  const items = state.currentBuild?.components?.[component]?.items;
  if (!items?.[index]) return false;
  const [removed] = items.splice(index, 1);
  if (itemById(removed.item_id)?.item_type === "engine") {
    normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
    reflowInstalledEquipment();
  }
  if (render) {
    hideEquipmentTooltip();
    renderVariant();
  }
  return true;
}

function removeInstalledEngineHeatSink(index, { render = true } = {}) {
  const items = engineHeatSinkEntries();
  if (!items[index]) return false;
  items.splice(index, 1);
  if (render) {
    hideEquipmentTooltip();
    renderVariant();
  }
  return true;
}

function duplicateInstalledItem(itemId, preferredComponent = null) {
  const item = itemById(itemId);
  if (!item) return false;
  if (
    preferredComponent
    && item.item_type !== "engine"
    && installWarehouseItemInComponent(item, preferredComponent)
  ) {
    return true;
  }
  return autoInstallWarehouseItem(item);
}

function buildEntryForItem(item) {
  return {
    type: item.item_type === "weapon" ? "weapon" : item.item_type === "ammo" ? "ammo" : "module",
    item_id: item.id,
    weapon_group: null,
  };
}

function engineHeatSinkDropValidation(item, source = null) {
  if (!isHeatSink(item)) return t("build.engineHeatSinkOnly");
  if (!itemMatchesMechFaction(item)) {
    return t("build.factionMismatch", {
      item: item.display_name || item.name,
      faction: factionLabel(state.selectedMech?.faction),
    });
  }
  if (fixedOmniEngine()) return t("build.engineHeatSinksFixed");
  const engine = installedEngine();
  const capacity = engineUserHeatSinkCapacity(engine);
  if (!engine || capacity <= 0) return t("build.noEngineHeatSinkSlots");
  if (source?.source === "engineHeatSink") return null;
  if (engineHeatSinkEntries().length >= capacity) return t("build.engineHeatSinkFull");
  return null;
}

function dropValidation(item, component, source = null) {
  if (!item || !state.currentBuild?.components?.[component]) return "Invalid drop target";
  if (item.item_type === "engine" && fixedOmniEngine()) return t("build.engineFixed");
  if (item.item_type === "engine" && !ENGINE_COMPONENTS.has(component)) {
    return t("build.engineTorsoOnly");
  }
  if (!itemMatchesMechFaction(item)) {
    return t("build.factionMismatch", {
      item: item.display_name || item.name,
      faction: factionLabel(state.selectedMech?.faction),
    });
  }
  if (!heatSinkMatchesUpgrade(item)) {
    return t("build.heatSinkMismatch", { item: item.display_name || item.name });
  }
  const guidanceWarning = guidanceMismatch(item);
  if (guidanceWarning) return guidanceWarning;
  if (!equipmentMatchesSelectedMechCapabilities(item)) return t("build.noAutoInstallLocation");
  const movingInstalledItem = source?.source === "component";
  if (item.item_type === "jumpjet") {
    if (!JUMP_JET_COMPONENTS.has(component)) return t("build.jumpJetLocation");
    const limit = maximumJumpJets();
    const current = installedMechItems("jumpjet").length;
    const next = current - (movingInstalledItem ? 1 : 0) + 1;
    if (next > limit) return t("build.jumpJetFull", { used: next, limit });
  }
  if (!itemAllowedInComponent(item, component)) return t("build.noAutoInstallLocation");
  const limitGroup = equipmentLimitGroup(item);
  if (limitGroup) {
    const limit = equipmentLimitGroupMaximum(limitGroup, item);
    const current = installedEquipmentLimitGroupItems(limitGroup).length;
    const movingSameGroup = movingInstalledItem
      && equipmentLimitGroup(itemById(source.itemId)) === limitGroup;
    const next = current - (movingSameGroup ? 1 : 0) + 1;
    if (next > limit) {
      return t("build.equipmentGroupFull", {
        group: equipmentLimitGroupLabel(limitGroup),
        used: next,
        limit,
      });
    }
  }
  if (source?.component === component) return null;
  const compDef = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
  const calc = calculateBuild();
  const usage = calc.componentUsage[component] || { slots: 0 };
  const slotLimit = number(compDef.slots);
  const addedItemSlots = Math.max(1, effectiveItemSlots(item));
  const replacedEngineSlots = item.item_type === "engine" && source?.source !== "component"
    ? Math.max(0, itemSlots(loadoutInstalledEngine()))
    : 0;
  const reflowableOccupiedUpgradeSlots = Math.max(
    0,
    number(usage.occupiedUpgradeSlots) - number(usage.fixedArmorSlots),
  );
  const nextSlots = usage.slots
    - reflowableOccupiedUpgradeSlots
    - replacedEngineSlots
    + addedItemSlots;
  if (!slotLimit || nextSlots > slotLimit) return `Slots ${nextSlots}/${slotLimit}`;

  if (item.item_type === "engine") {
    const proposedSideSlots = engineSideSlots(item);
    for (const side of ENGINE_SIDE_COMPONENTS) {
      const sideDef = effectiveComponentDefinition(state.selectedMech, state.currentBuild, side);
      const sideLimit = number(sideDef.slots);
      const sideUsage = calc.componentUsage[side] || { slots: 0, engineSideSlots: 0 };
      const sideReflowableUpgradeSlots = Math.max(
        0,
        number(sideUsage.occupiedUpgradeSlots) - number(sideUsage.fixedArmorSlots),
      );
      const sideNextSlots = sideUsage.slots
        - number(sideUsage.engineSideSlots)
        - sideReflowableUpgradeSlots
        + proposedSideSlots;
      if (!sideLimit || sideNextSlots > sideLimit) {
        return `${COMPONENT_NAMES[side] || side}: Slots ${sideNextSlots}/${sideLimit}`;
      }
    }
  }

  const type = equipmentHardpointType(item);
  if (type) {
    const capacity = (compDef.hardpoints || [])
      .filter((hp) => hardpointType(hp) === type)
      .reduce((sum, hp) => sum + hardpointSlots(hp), 0);
    const used = state.currentBuild.components[component].items.reduce((count, entry) => {
      const installed = itemById(entry.item_id);
      return count + (equipmentHardpointType(installed) === type ? 1 : 0);
    }, (compDef.fixed || []).reduce((count, itemId, index) => (
      count + (
        equipmentHardpointType(itemById(itemId)) === type
        && fixedItemConsumesHardpoint(
          itemById(itemId),
          compDef.fixedSources?.[index] || "",
        )
          ? 1
          : 0
      )
    ), 0));
    if (used + 1 > capacity) return `${type} hardpoints ${used + 1}/${capacity}`;
  }
  return null;
}

function setDropStatus(message) {
  $("data-status").textContent = message;
}

function clearDragState() {
  state.activeDrag = null;
  document.querySelectorAll(".drop-valid, .drop-invalid, .dragging").forEach((element) => {
    element.classList.remove("drop-valid", "drop-invalid", "dragging");
  });
  document.querySelectorAll(".pointer-drag-layer").forEach((element) => element.remove());
  document.body.classList.remove("pointer-drag-active");
}

const EQUIPMENT_POINTER_DRAG_THRESHOLD = 5;
let equipmentPointerDrag = null;
let suppressEquipmentPointerClick = false;
let equipmentPointerClickReset = 0;

function equipmentPointerDragPayload(target) {
  const engineSink = target.closest("[data-engine-heat-sink-item]");
  if (engineSink) {
    const index = Number(engineSink.dataset.engineHeatSinkItem);
    const entry = engineHeatSinkEntries()[index];
    if (!entry) return null;
    return { sourceElement: engineSink, payload: { source: "engineHeatSink", index, itemId: entry.item_id } };
  }

  const installedRow = target.closest("[data-loadout-item]");
  if (installedRow) {
    const [component, indexText] = installedRow.dataset.loadoutItem.split(":");
    const index = Number(indexText);
    const entry = state.currentBuild?.components?.[component]?.items?.[index];
    if (!entry) return null;
    return {
      sourceElement: installedRow,
      payload: { source: "component", component, index, itemId: entry.item_id },
    };
  }

  const warehouseRow = target.closest("[data-item]");
  if (!warehouseRow || !$("item-list").contains(warehouseRow)) return null;
  const item = itemById(warehouseRow.dataset.item);
  if (!item) return null;
  return {
    sourceElement: warehouseRow,
    payload: { source: "warehouse", itemId: warehouseRow.dataset.item },
  };
}

function createWarehouseSlotPointerVisual(item) {
  const slots = Math.max(1, effectiveItemSlots(item));
  const mountType = item.item_type === "ammo" ? ammoHardpointType(item) : equipmentHardpointType(item);
  const ammoClass = item.item_type === "ammo" ? " ammo" : "";
  const visual = document.createElement("div");
  visual.style.setProperty("--slot-span", String(slots));
  if (item.item_type === "engine") {
    visual.className = "slot-item engine engine-main-slot";
    visual.innerHTML = `
      <span class="slot-item-mark">E</span>
      <div class="engine-slot-content"><strong>${escapeHtml(item.display_name || item.name)}</strong></div>
    `;
    return visual;
  }
  visual.className = `slot-item ${mountType || item.item_type}${ammoClass}`;
  visual.innerHTML = `
    <span class="slot-item-mark">${HARDPOINT_LABELS[mountType] || String(item.item_type || "?")[0].toUpperCase()}</span>
    <strong>${escapeHtml(item.display_name || item.name)}</strong>
  `;
  return visual;
}

function createEquipmentPointerDragLayer(session) {
  const { payload, sourceElement, sourceRect } = session;
  const layer = document.createElement("div");
  const warehouseItem = payload.source === "warehouse" ? itemById(payload.itemId) : null;
  const visual = warehouseItem ? createWarehouseSlotPointerVisual(warehouseItem) : sourceElement.cloneNode(true);

  layer.className = "pointer-drag-layer";
  visual.classList.remove("dragging");
  visual.classList.add("pointer-drag-visual");
  visual.removeAttribute("id");
  visual.removeAttribute("draggable");
  visual.setAttribute("aria-hidden", "true");

  let logicalWidth = Math.max(1, sourceElement.offsetWidth || sourceRect.width);
  let logicalHeight = Math.max(1, sourceElement.offsetHeight || sourceRect.height);
  let displayWidth = sourceRect.width;
  let displayHeight = sourceRect.height;
  let scaleX = displayWidth / logicalWidth;
  let scaleY = displayHeight / logicalHeight;
  if (warehouseItem) {
    const slotSample = document.querySelector("#components .component-items > *");
    const slotSampleRect = slotSample?.getBoundingClientRect();
    const slotScale = slotSample?.offsetWidth && slotSampleRect?.width
      ? slotSampleRect.width / slotSample.offsetWidth
      : mechlabScale;
    logicalWidth = Math.max(1, slotSample?.offsetWidth || logicalWidth);
    visual.style.width = `${logicalWidth}px`;
    layer.append(visual);
    document.body.append(layer);
    logicalHeight = Math.max(1, visual.offsetHeight);
    displayWidth = logicalWidth * slotScale;
    displayHeight = logicalHeight * slotScale;
    scaleX = slotScale;
    scaleY = slotScale;
    const sourceRatioX = Math.min(1, Math.max(0, session.grabOffsetX / Math.max(1, sourceRect.width)));
    const sourceRatioY = Math.min(1, Math.max(0, session.grabOffsetY / Math.max(1, sourceRect.height)));
    session.grabOffsetX = displayWidth * sourceRatioX;
    session.grabOffsetY = displayHeight * sourceRatioY;
  } else {
    layer.append(visual);
    document.body.append(layer);
  }

  layer.style.width = `${displayWidth}px`;
  layer.style.height = `${displayHeight}px`;
  visual.style.width = `${logicalWidth}px`;
  visual.style.height = `${logicalHeight}px`;
  visual.style.transform = `scale(${scaleX}, ${scaleY})`;
  return layer;
}

function clearEquipmentPointerDropFeedback() {
  document.querySelectorAll(".drop-valid, .drop-invalid").forEach((element) => {
    element.classList.remove("drop-valid", "drop-invalid");
  });
}

function updateEquipmentPointerDropFeedback(target) {
  const session = equipmentPointerDrag;
  const payload = state.activeDrag;
  if (!session || !payload) return;

  const engineBay = target?.closest?.("[data-engine-heat-sink-drop]")
    || (isHeatSink(itemById(payload.itemId))
      ? target?.closest?.("[data-engine-heat-sink-engine]")
      : null);
  const component = engineBay ? null : target?.closest?.("[data-component-drop]");
  const equipmentPanel = component || engineBay ? null : target?.closest?.("#equipment-panel");
  const indicator = engineBay || component || (
    equipmentPanel && ["component", "engineHeatSink"].includes(payload.source) ? equipmentPanel : null
  );
  if (indicator === session.dropIndicator) return;

  clearEquipmentPointerDropFeedback();
  session.dropIndicator = indicator;
  if (engineBay) {
    const warning = engineHeatSinkDropValidation(itemById(payload.itemId), payload);
    engineBay.classList.add(warning ? "drop-invalid" : "drop-valid");
    return;
  }
  if (component) {
    const item = itemById(payload.itemId);
    const warning = dropValidation(item, component.dataset.componentDrop, payload.source === "component" ? payload : null);
    component.classList.add(warning ? "drop-invalid" : "drop-valid");
    return;
  }
  if (indicator) indicator.classList.add("drop-valid");
}

function renderEquipmentPointerDragFrame() {
  const session = equipmentPointerDrag;
  if (!session?.started) return;
  session.frame = 0;
  const left = session.clientX - session.grabOffsetX;
  const top = session.clientY - session.grabOffsetY;
  session.layer.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  updateEquipmentPointerDropFeedback(document.elementFromPoint(session.clientX, session.clientY));
}

function scheduleEquipmentPointerDragFrame() {
  if (!equipmentPointerDrag?.started || equipmentPointerDrag.frame) return;
  equipmentPointerDrag.frame = requestAnimationFrame(renderEquipmentPointerDragFrame);
}

function startEquipmentPointerDrag(session) {
  session.started = true;
  state.activeDrag = session.payload;
  session.layer = createEquipmentPointerDragLayer(session);
  session.sourceElement.classList.add("dragging");
  document.body.classList.add("pointer-drag-active");
  hideEquipmentTooltip();
  scheduleEquipmentPointerDragFrame();
}

function beginEquipmentPointerDrag(event) {
  if (globalThis.__MWOLAB_MOBILE__) return;
  if (equipmentPointerDrag || !event.isPrimary || event.button !== 0) return;
  if (event.target.closest("input, select, textarea, [data-engine-rating-delta], [data-armor-delta]")) return;
  const dragSource = equipmentPointerDragPayload(event.target);
  if (!dragSource) return;
  const sourceRect = dragSource.sourceElement.getBoundingClientRect();
  equipmentPointerDrag = {
    ...dragSource,
    pointerId: event.pointerId,
    started: false,
    startX: event.clientX,
    startY: event.clientY,
    clientX: event.clientX,
    clientY: event.clientY,
    grabOffsetX: event.clientX - sourceRect.left,
    grabOffsetY: event.clientY - sourceRect.top,
    sourceRect,
    layer: null,
    frame: 0,
    dropIndicator: null,
  };
  try {
    dragSource.sourceElement.setPointerCapture(event.pointerId);
  } catch (_error) {
    // Pointer capture is an optimization; document-level listeners still complete the drag.
  }
}

function moveEquipmentPointerDrag(event) {
  const session = equipmentPointerDrag;
  if (!session || event.pointerId !== session.pointerId) return;
  session.clientX = event.clientX;
  session.clientY = event.clientY;
  if (!session.started) {
    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (distance < EQUIPMENT_POINTER_DRAG_THRESHOLD) return;
    startEquipmentPointerDrag(session);
  }
  event.preventDefault();
  scheduleEquipmentPointerDragFrame();
}

function suppressNextEquipmentPointerClick() {
  suppressEquipmentPointerClick = true;
  clearTimeout(equipmentPointerClickReset);
  equipmentPointerClickReset = window.setTimeout(() => {
    suppressEquipmentPointerClick = false;
  }, 0);
}

function dropEquipmentPointerDrag(target) {
  const payload = state.activeDrag;
  if (!payload) return;
  const engineBay = target?.closest?.("[data-engine-heat-sink-drop]")
    || (isHeatSink(itemById(payload.itemId))
      ? target?.closest?.("[data-engine-heat-sink-engine]")
      : null);
  if (engineBay) {
    const warning = engineHeatSinkDropValidation(itemById(payload.itemId), payload);
    if (warning) setDropStatus(warning);
    else installDraggedEngineHeatSink();
    if (state.activeDrag) clearDragState();
    return;
  }

  const component = target?.closest?.("[data-component-drop]");
  if (component) {
    const item = itemById(payload.itemId);
    const warning = dropValidation(item, component.dataset.componentDrop, payload.source === "component" ? payload : null);
    if (warning) setDropStatus(warning);
    else installDraggedItem(component.dataset.componentDrop);
    if (state.activeDrag) clearDragState();
    return;
  }

  if (["component", "engineHeatSink"].includes(payload.source)) removeDraggedItem();
  else clearDragState();
}

function finishEquipmentPointerDrag(event, cancelled = false) {
  const session = equipmentPointerDrag;
  if (!session || event.pointerId !== session.pointerId) return;
  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    session.clientX = event.clientX;
    session.clientY = event.clientY;
  }
  if (session.frame) cancelAnimationFrame(session.frame);
  const dropTarget = session.started && !cancelled
    ? document.elementFromPoint(session.clientX, session.clientY)
    : null;
  session.layer?.remove();
  session.sourceElement.classList.remove("dragging");
  document.body.classList.remove("pointer-drag-active");
  clearEquipmentPointerDropFeedback();
  equipmentPointerDrag = null;
  if (!session.started) return;

  event.preventDefault();
  suppressNextEquipmentPointerClick();
  if (cancelled) clearDragState();
  else dropEquipmentPointerDrag(dropTarget);
}

function adjustArmorAllocation(button) {
  if (!state.currentBuild) return false;
  const component = button.dataset.armorComponent;
  const side = button.dataset.armorSide;
  const delta = number(Number(button.dataset.armorDelta));
  const buildComponent = state.currentBuild.components?.[component];
  if (!buildComponent || !delta || !["front", "rear"].includes(side)) return false;

  state.currentBuild.rearArmor ||= {};
  const componentDefinition = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
  const capacity = componentArmorCapacity(component, componentDefinition);
  const current = side === "rear"
    ? number(state.currentBuild.rearArmor[component])
    : number(buildComponent.armor);
  const pairedValue = side === "rear"
    ? number(buildComponent.armor)
    : number(state.currentBuild.rearArmor[component]);
  const max = Math.max(0, capacity - pairedValue);
  const value = Math.min(max, Math.max(0, current + delta));
  if (value === current) return false;

  if (side === "rear") {
    state.currentBuild.rearArmor[component] = value;
  } else {
    buildComponent.armor = value;
  }
  renderVariant();
  return true;
}

function setArmorAllocation(input) {
  if (!state.currentBuild) return false;
  const component = input.dataset.armorComponent;
  const side = input.dataset.armorSide;
  const buildComponent = state.currentBuild.components?.[component];
  if (!buildComponent || !["front", "rear"].includes(side)) return false;

  state.currentBuild.rearArmor ||= {};
  const componentDefinition = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
  const capacity = componentArmorCapacity(component, componentDefinition);
  const pairedValue = side === "rear"
    ? number(buildComponent.armor)
    : number(state.currentBuild.rearArmor[component]);
  const max = Math.max(0, capacity - pairedValue);
  const quirkBonus = number(Number(input.dataset.armorQuirk));
  const pairedQuirkBonus = number(Number(input.dataset.armorPairedQuirk));
  const skillMultiplier = number(Number(input.dataset.armorSkillMultiplier));
  const includeSkillBonus = input.dataset.armorIncludeSkill !== "false";
  const requestedFinalValue = Number(input.value);
  let requestedBaseValue = 0;
  if (Number.isFinite(requestedFinalValue)) {
    let closestDifference = Infinity;
    for (let candidate = 0; candidate <= max; candidate += 1) {
      const difference = Math.abs(
        finalArmorAllocation(
          candidate,
          quirkBonus,
          skillMultiplier,
          pairedValue,
          pairedQuirkBonus,
          includeSkillBonus,
        ) - requestedFinalValue,
      );
      if (difference < closestDifference) {
        requestedBaseValue = candidate;
        closestDifference = difference;
      }
    }
  }
  const value = Math.min(max, Math.max(0, requestedBaseValue));

  if (side === "rear") state.currentBuild.rearArmor[component] = value;
  else buildComponent.armor = value;
  renderVariant();
  return true;
}

function changeEngineRating(button) {
  if (!state.currentBuild) return false;
  const component = button.dataset.engineRatingComponent;
  const index = Number(button.dataset.engineRatingIndex);
  const direction = Number(button.dataset.engineRatingDelta);
  const entry = state.currentBuild.components?.[component]?.items?.[index];
  const engine = itemById(entry?.item_id);
  const replacement = adjacentEngineRating(engine, direction);
  if (!entry || !replacement) return false;
  entry.item_id = replacement.id;
  normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
  reflowInstalledEquipment();
  renderVariant();
  return true;
}

let armorHoldDelay = null;
let armorHoldInterval = null;
let armorClickReset = null;
let suppressArmorClick = false;

function clearArmorHoldTimers() {
  clearTimeout(armorHoldDelay);
  clearInterval(armorHoldInterval);
  armorHoldDelay = null;
  armorHoldInterval = null;
}

function stopArmorHold() {
  clearArmorHoldTimers();
  clearTimeout(armorClickReset);
  armorClickReset = setTimeout(() => {
    suppressArmorClick = false;
  }, 0);
}

function startArmorHold(button) {
  clearArmorHoldTimers();
  clearTimeout(armorClickReset);
  suppressArmorClick = true;
  if (!adjustArmorAllocation(button)) return;
  armorHoldDelay = setTimeout(() => {
    armorHoldInterval = setInterval(() => {
      if (!adjustArmorAllocation(button)) stopArmorHold();
    }, 90);
  }, 350);
}

function installDraggedItem(component) {
  const payload = state.activeDrag;
  if (!payload) return;
  const item = itemById(payload.itemId);
  const warning = dropValidation(item, component, payload.source === "component" ? payload : null);
  if (warning) {
    setDropStatus(warning);
    return;
  }
  if (payload.source === "engineHeatSink") {
    const internal = engineHeatSinkEntries();
    if (!internal[payload.index]) return;
    const [entry] = internal.splice(payload.index, 1);
    state.currentBuild.components[component].items.push(entry);
  } else if (payload.source === "component") {
    if (payload.component === component) return;
    const sourceItems = state.currentBuild.components[payload.component]?.items;
    if (!sourceItems?.[payload.index]) return;
    const [entry] = sourceItems.splice(payload.index, 1);
    state.currentBuild.components[component].items.push(entry);
  } else {
    if (item.item_type === "engine") {
      Object.values(state.currentBuild.components).forEach((buildComponent) => {
        buildComponent.items = (buildComponent.items || [])
          .filter((entry) => itemById(entry.item_id)?.item_type !== "engine");
      });
    }
    state.currentBuild.components[component].items.push(buildEntryForItem(item));
  }
  normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
  if (item.item_type === "engine") reflowInstalledEquipment();
  clearDragState();
  renderVariant();
}

function installDraggedEngineHeatSink() {
  const payload = state.activeDrag;
  if (!payload) return;
  const item = itemById(payload.itemId);
  const warning = engineHeatSinkDropValidation(item, payload);
  if (warning) {
    setDropStatus(warning);
    return;
  }
  if (payload.source === "engineHeatSink") {
    clearDragState();
    return;
  }
  let entry;
  if (payload.source === "component") {
    const sourceItems = state.currentBuild.components[payload.component]?.items;
    if (!sourceItems?.[payload.index]) return;
    [entry] = sourceItems.splice(payload.index, 1);
  } else {
    entry = buildEntryForItem(item);
  }
  engineHeatSinkEntries().push(entry);
  clearDragState();
  renderVariant();
}

function removeDraggedItem() {
  const payload = state.activeDrag;
  if (payload?.source === "engineHeatSink") {
    const items = engineHeatSinkEntries();
    if (!items[payload.index]) return;
    items.splice(payload.index, 1);
  } else if (payload?.source === "component") {
    const items = state.currentBuild?.components?.[payload.component]?.items;
    if (!items?.[payload.index]) return;
    const [removed] = items.splice(payload.index, 1);
    if (itemById(removed.item_id)?.item_type === "engine") {
      normalizeEngineHeatSinks(state.selectedMech, state.currentBuild);
      reflowInstalledEquipment();
    }
  } else {
    return;
  }
  clearDragState();
  renderVariant();
}

function bindEvents() {
  window.addEventListener("popstate", () => { void applyMechNavigationFromLocation(); });
  const tooltipSelector = "[data-item], [data-tooltip-item], [data-loadout-item], [data-engine-heat-sink-item], [data-omnipod], [data-tooltip-omnipod], [data-ghost-heat-warning]";
  if (!globalThis.__MWOLAB_MOBILE__) {
    document.addEventListener("pointerover", (event) => {
      const target = event.target.closest(tooltipSelector);
      if (!target || target === activeEquipmentTooltipTarget) return;
      showEquipmentTooltip(target);
    });
    document.addEventListener("pointerout", (event) => {
      if (!activeEquipmentTooltipTarget || activeEquipmentTooltipTarget.contains(event.relatedTarget)) return;
      const nextTarget = event.relatedTarget?.closest?.(tooltipSelector);
      if (nextTarget) showEquipmentTooltip(nextTarget);
      else hideEquipmentTooltip();
    });
    document.addEventListener("focusin", (event) => {
      const target = event.target.closest(tooltipSelector);
      if (target) showEquipmentTooltip(target);
    });
    document.addEventListener("focusout", (event) => {
      if (activeEquipmentTooltipTarget && !activeEquipmentTooltipTarget.contains(event.relatedTarget)) hideEquipmentTooltip();
    });
  }
  document.addEventListener("scroll", () => {
    if (activeEquipmentTooltipTarget) positionEquipmentTooltip();
  }, { capture: true, passive: true });
  window.addEventListener("resize", () => {
    if (activeEquipmentTooltipTarget) positionEquipmentTooltip();
  }, { passive: true });
  $("donate-link").addEventListener("click", openDonateDialog);
  $("close-donate").addEventListener("click", closeDonateDialog);
  $("donate-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("donate-overlay")) closeDonateDialog();
  });
  $("help-link").addEventListener("click", openHelpDialog);
  $("close-help").addEventListener("click", closeHelpDialog);
  $("help-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("help-overlay")) closeHelpDialog();
  });
  $("close-loadout-code").addEventListener("click", closeLoadoutCodeDialog);
  $("close-loadout-code-mobile").addEventListener("click", closeLoadoutCodeDialog);
  $("apply-loadout-code").addEventListener("click", applyImportedMwoCode);
  $("copy-loadout-code").addEventListener("click", copyExportedMwoCode);
  $("copy-loadout-url").addEventListener("click", copyExportedMwoUrl);
  $("loadout-code-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("loadout-code-overlay")) closeLoadoutCodeDialog();
  });
  $("close-local-build").addEventListener("click", closeLocalBuildDialog);
  $("confirm-local-build-save").addEventListener("click", saveNamedLocalBuild);
  $("toggle-local-build-manage").addEventListener("click", toggleLocalBuildManageMode);
  $("local-build-name").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveNamedLocalBuild();
  });
  $("local-build-list").addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-local-build-delete]");
    if (deleteButton) {
      deleteNamedLocalBuild(deleteButton.dataset.localBuildDelete);
      return;
    }
    const saveSlot = event.target.closest("[data-local-build-select]");
    if (saveSlot) {
      selectLocalBuildForSave(saveSlot.dataset.localBuildSelect);
      return;
    }
    const loadSlot = event.target.closest("[data-local-build-load]");
    if (loadSlot) loadNamedLocalBuild(loadSlot.dataset.localBuildLoad);
  });
  $("local-build-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("local-build-overlay")) closeLocalBuildDialog();
  });
  $("mech-summary-content").addEventListener("click", (event) => {
    if (event.target.closest("#open-weapon-detail")) openWeaponDetail();
  });
  $("close-weapon-detail").addEventListener("click", closeWeaponDetail);
  $("weapon-detail-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("weapon-detail-overlay")) closeWeaponDetail();
  });
  $("weapon-detail-distance").addEventListener("input", (event) => {
    state.weaponDetail.distance = Math.max(1, Math.min(1000, number(Number(event.target.value), 180)));
    renderWeaponDetail();
  });
  $("weapon-detail-apply-ghost-heat").addEventListener("change", (event) => {
    state.weaponDetail.applyGhostHeat = event.target.checked;
    renderWeaponDetailMetrics();
  });
  $("weapon-detail-range-combination-dps").addEventListener("change", (event) => {
    state.weaponDetail.rangeCombinationDps = event.target.checked;
    renderWeaponDetail();
  });
  $("weapon-detail-metric-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-weapon-detail-tab]");
    if (!button) return;
    state.weaponDetail.metricTab = button.dataset.weaponDetailTab === "range"
      ? "range"
      : "basic";
    renderWeaponDetailMetrics();
  });
  $("weapon-detail-metrics").addEventListener("change", (event) => {
    const input = event.target.closest("[data-weapon-detail-range-type-enabled]");
    if (!input) return;
    const type = input.dataset.weaponDetailRangeTypeEnabled;
    if (!["short", "medium", "long"].includes(type)) return;
    if (input.checked) state.weaponDetail.enabledRangeTypes.add(type);
    else state.weaponDetail.enabledRangeTypes.delete(type);
    renderWeaponDetail();
  });
  $("weapon-detail-list").addEventListener("change", (event) => {
    const input = event.target.closest("[data-weapon-detail-enabled]");
    if (!input) return;
    state.weaponDetail.enabledByWeaponKey.set(
      input.dataset.weaponDetailEnabled,
      input.checked,
    );
    renderWeaponDetail();
  });
  $("weapon-detail-list").addEventListener("input", (event) => {
    const input = event.target.closest("[data-weapon-detail-frequency]");
    if (!input) return;
    const frequency = Math.max(0, Math.min(100, number(Number(input.value), 100)));
    const weaponKey = input.dataset.weaponDetailFrequency;
    state.weaponDetail.frequencyByWeaponKey.set(weaponKey, frequency);
    input.style.setProperty("--weapon-frequency-percent", `${frequency}%`);
    const weapon = state.weaponDetail.weapons.find((entry) => entry.key === weaponKey);
    const row = input.closest(".weapon-detail-row");
    const value = row?.querySelector("[data-weapon-detail-frequency-value]");
    if (value) value.textContent = `${fmt(frequency, 0)}%`;
    if (weapon) {
      const calculationFrequency = weaponDetailEffectiveFrequency(
        weapon,
        state.weaponDetail.distance,
      );
      const multiplier = simulationWeaponDamageMultiplier(weapon, state.weaponDetail.distance);
      const dps = weaponDetailAdjustedRate(
        number(weapon.damagePerSecond) * multiplier,
        calculationFrequency,
      );
      const cooldown = weaponDetailEffectiveCooldown(weapon.cycle, calculationFrequency);
      const dpsValue = row?.querySelector("[data-weapon-detail-dps]");
      const cooldownValue = row?.querySelector("[data-weapon-detail-cooldown]");
      if (dpsValue) dpsValue.textContent = fmt(dps, 2);
      if (cooldownValue) cooldownValue.textContent = cooldown === null ? "-" : `${fmt(cooldown, 2)}s`;
    }
    renderWeaponDetailMetrics();
  });
  $("close-simulation").addEventListener("click", closeSimulation);
  $("reset-simulation").addEventListener("click", resetSimulationRun);
  $("simulation-scenario-options").addEventListener("change", (event) => {
    const input = event.target.closest('input[name="simulation-scenario"]');
    if (!input || !SIMULATION_SCENARIOS[input.value]) return;
    state.simulation.scenarioId = input.value;
    resetSimulationRun();
  });
  $("simulation-movement-state").addEventListener("change", (event) => {
    const now = performance.now();
    coolSimulationHeat(now);
    state.simulation.movementState = event.target.value === "moving" ? "moving" : "stationary";
    applySimulationOverheat();
    renderSimulationMetrics(now);
  });
  $("simulation-map-temperature").addEventListener("change", (event) => {
    const temperature = Object.hasOwn(SIMULATION_MAP_COOLING_MODIFIERS, event.target.value)
      ? event.target.value
      : "normal";
    const now = performance.now();
    coolSimulationHeat(now);
    state.simulation.mapTemperature = temperature;
    applySimulationOverheat();
    renderSimulationMetrics(now);
  });
  $("simulation-target-distance").addEventListener("input", (event) => {
    const distance = Number(event.target.value);
    if (Number.isFinite(distance) && distance >= 0) state.simulation.targetDistance = distance;
  });
  $("simulation-target-distance").addEventListener("change", (event) => {
    const distance = Number(event.target.value);
    state.simulation.targetDistance = Number.isFinite(distance) && distance >= 0 ? distance : 180;
    event.target.value = String(state.simulation.targetDistance);
  });
  $("simulation-apply-splash").addEventListener("change", (event) => {
    state.simulation.applySplashDamage = event.target.checked;
    resetSimulationRun();
    renderSimulationWeaponList();
  });
  $("simulation-end-on-overheat").addEventListener("change", (event) => {
    const simulation = state.simulation;
    simulation.endOnOverheat = event.target.checked;
    if (simulation.endOnOverheat && simulation.overheated && !simulation.finished) {
      finishSimulationRun();
      renderSimulationMetrics();
      renderSimulationScenario();
    }
  });
  $("simulation-group-status").addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-simulation-fire-group]");
    if (!button || (event.pointerType === "mouse" && event.button !== 0)) return;
    const group = Number(button.dataset.simulationFireGroup);
    if (group < 1 || group > 4) return;
    event.preventDefault();
    if (state.simulation.heldGroups.has(group)) return;
    state.simulation.pointerGroups.set(event.pointerId, group);
    setSimulationGroupHeld(group, true);
  });
  const releaseSimulationPointerGroup = (event) => {
    const group = state.simulation.pointerGroups.get(event.pointerId);
    if (!group) return;
    state.simulation.pointerGroups.delete(event.pointerId);
    setSimulationGroupHeld(group, false);
  };
  document.addEventListener("pointerup", releaseSimulationPointerGroup);
  document.addEventListener("pointercancel", releaseSimulationPointerGroup);
  $("simulation-overlay").addEventListener("mousedown", (event) => {
    if (event.target === $("simulation-overlay")) closeSimulation();
  });
  $("simulation-weapon-list").addEventListener("change", (event) => {
    const input = event.target.closest("[data-simulation-weapon]");
    if (!input) return;
    const group = Number(input.value);
    const weapon = state.simulation.weapons.find((entry) => entry.key === input.dataset.simulationWeapon);
    if (!weapon || group < 1 || group > 4) return;
    const groups = new Set(simulationGroupsForWeapon(weapon));
    if (input.checked) groups.add(group);
    else groups.delete(group);
    state.simulation.assignments.set(weapon.key, groups);
    if (weapon.entry) {
      const savedGroups = Array.from(groups).sort((left, right) => left - right);
      weapon.entry.weapon_groups = savedGroups;
      weapon.entry.weapon_group = savedGroups[0] ?? null;
    }
    resetSimulationRun();
    renderSimulationWeaponList();
    renderSimulationGroupStatus();
  });
  document.addEventListener("keydown", (event) => {
    if (state.weaponDetail.open) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWeaponDetail();
      }
      return;
    }
    if (!$("help-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHelpDialog();
      }
      return;
    }
    if (!$("donate-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDonateDialog();
      }
      return;
    }
    if (!$("local-build-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLocalBuildDialog();
      }
      return;
    }
    if (!$("mech-sort-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMechSortDialog();
      }
      return;
    }
    if (!$("mech-filter-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMechFilterDialog();
      }
      return;
    }
    if (!$("skill-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSkillDialog();
      }
      return;
    }
    if (!$("ui-settings-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeUiSettingsDialog();
      }
      return;
    }
    if (!$("build-actions-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeBuildActionsDialog();
      }
      return;
    }
    if (!$("loadout-code-overlay").hidden) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLoadoutCodeDialog();
      } else if (
        state.loadoutCodeMode === "import"
        && event.key === "Enter"
        && (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        applyImportedMwoCode();
      }
      return;
    }
    if (!state.simulation.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSimulation();
      return;
    }
    if (event.target.matches("input, select, textarea") || event.target.closest(".simulation-option-help")) return;
    const group = Number(event.key);
    if (group < 1 || group > 4) return;
    event.preventDefault();
    setSimulationGroupHeld(group, true);
  });
  document.addEventListener("keyup", (event) => {
    if (!state.simulation.open) return;
    if (event.target.matches("input, select, textarea") || event.target.closest(".simulation-option-help")) return;
    const group = Number(event.key);
    if (group < 1 || group > 4) return;
    event.preventDefault();
    setSimulationGroupHeld(group, false);
  });
  window.addEventListener("blur", () => {
    if (!state.simulation.open) return;
    const now = performance.now();
    const durationMs = simulationDurationMs();
    if (
      durationMs !== null
      && state.simulation.startedAt !== null
      && now >= state.simulation.startedAt + durationMs
    ) {
      simulationTick(now);
      return;
    }
    coolSimulationHeat(now);
    updateSimulationContinuousDamage(now);
    state.simulation.heldGroups.clear();
    state.simulation.pointerGroups.clear();
    state.simulation.continuousFireAt.clear();
    applySimulationOverheat();
    renderSimulationMetrics(now);
    renderSimulationGroupStatus();
  });
  document.querySelectorAll("[data-main-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mainTab === "mechlab") {
        rememberMechListScroll();
        const changedTab = state.activeMainTab !== "mechlab";
        if (changedTab) setMainTab("mechlab");
        if (changedTab && state.mechlabBrowseMode) updateMechNavigation("list");
        showFullMechlabList();
        return;
      }
      if (state.activeMainTab === button.dataset.mainTab) return;
      const nextTab = button.dataset.mainTab;
      const nextMechId = SINGLE_MECH_SELECTION_TABS.has(nextTab)
        ? state.selectedMechIdsByTab[nextTab] || ""
        : "";
      updateMainTabNavigation(nextTab, "push", nextMechId);
      setMainTab(button.dataset.mainTab);
    });
  });
  document.querySelectorAll("[data-equipment-info-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeEquipmentInfoView = button.dataset.equipmentInfoView;
      renderEquipmentInfo();
      $("equipment-info-content").scrollTo({ top: 0, left: 0 });
    });
  });
  $("equipment-info-content").addEventListener("click", (event) => {
    const button = event.target.closest("[data-equipment-info-sort]");
    if (!button) return;
    const tableKey = button.dataset.equipmentInfoTable;
    const sortKey = button.dataset.equipmentInfoSort;
    const current = state.equipmentInfoSortByTable.get(tableKey) || { key: "index", direction: "asc" };
    state.equipmentInfoSortByTable.set(tableKey, {
      key: sortKey,
      direction: current.key === sortKey && current.direction === "asc" ? "desc" : "asc",
    });
    renderEquipmentInfo();
  });
  $("mech-search").addEventListener("input", renderMechList);
  $("mech-toolbar-import").addEventListener("click", () => openLoadoutCodeDialog("import"));
  $("mech-toolbar-return").addEventListener("click", () => {
    const tab = activeMechlabTab();
    if (tab) openMechlabTab(tab.id);
  });
  document.querySelectorAll("[data-open-mech-filter]").forEach((button) => {
    button.addEventListener("click", () => openMechFilterDialog(button));
  });
  document.querySelectorAll("[data-open-mech-sort]").forEach((button) => {
    button.addEventListener("click", () => openMechSortDialog(button));
  });
  $("close-mech-sort-x").addEventListener("click", closeMechSortDialog);
  $("mech-sort-overlay").addEventListener("click", (event) => {
    if (event.target === $("mech-sort-overlay")) {
      closeMechSortDialog();
      return;
    }
    const sortKey = event.target.closest("[data-mech-sort-key]");
    const direction = event.target.closest("[data-mech-sort-direction]");
    const faction = event.target.closest("[data-mech-sort-faction]");
    if (sortKey) state.mechSort = sortKey.dataset.mechSortKey;
    else if (direction) state.mechSortDirection = direction.dataset.mechSortDirection;
    else if (faction) state.mechSortGroupFaction = !state.mechSortGroupFaction;
    else return;
    renderMechList();
  });
  $("close-mech-filter-x").addEventListener("click", closeMechFilterDialog);
  $("close-mech-filter").addEventListener("click", closeMechFilterDialog);
  $("mech-filter-quirk-search").addEventListener("input", (event) => {
    state.mechQuirkFilterSearch = event.currentTarget.value;
    renderMechQuirkFilterControls();
  });
  $("clear-mech-quirk-filters").addEventListener("click", clearMechQuirkFilters);
  $("mech-filter-overlay").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-mech-filter-tab]");
    if (tab) {
      setMechFilterTab(tab.dataset.mechFilterTab);
      return;
    }
    const quirkMode = event.target.closest("[data-mech-quirk-mode]");
    if (quirkMode) {
      setMechQuirkFilterMode(quirkMode.dataset.mechQuirkMode);
      return;
    }
    const quirk = event.target.closest("[data-mech-quirk-filter]");
    if (quirk) {
      toggleMechQuirkFilter(quirk.dataset.mechQuirkFilter);
      return;
    }
    const faction = event.target.closest("[data-mech-filter-faction]");
    if (faction) {
      state.mechFilterFaction = faction.dataset.mechFilterFaction;
      renderMechList();
      return;
    }
    const weight = event.target.closest("[data-mech-filter-weight]");
    if (weight) {
      toggleMechWeightFilter(weight.dataset.mechFilterWeight);
      return;
    }
    const hardpoint = event.target.closest("[data-mech-hardpoint-filter-toggle]");
    if (hardpoint) {
      toggleMechHardpointFilter(hardpoint.dataset.mechHardpointFilterToggle);
      return;
    }
    const type = event.target.closest("[data-mech-filter-type]");
    if (type) {
      toggleMechTypeFilter(type.dataset.mechFilterType);
      return;
    }
    const specialAll = event.target.closest("[data-mech-filter-special-all]");
    if (specialAll) {
      selectAllMechSpecialTypes();
      return;
    }
    const specialType = event.target.closest("[data-mech-filter-special-type]");
    if (specialType) {
      toggleMechSpecialTypeFilter(specialType.dataset.mechFilterSpecialType);
      return;
    }
    const specialFeature = event.target.closest("[data-mech-special-feature]");
    if (specialFeature) {
      toggleMechSpecialFeature(
        specialFeature.dataset.mechSpecialFeature,
        specialFeature.dataset.mechSpecialFeatureGroup,
      );
      return;
    }
    if (event.target === event.currentTarget) closeMechFilterDialog();
  });
  $("mech-filter-overlay").addEventListener("input", (event) => {
    const quirkInput = event.target.closest("[data-mech-quirk-filter-value]");
    if (quirkInput) {
      setMechQuirkFilterMinimum(quirkInput.dataset.mechQuirkFilterValue, quirkInput.value);
      return;
    }
    const input = event.target.closest("[data-mech-hardpoint-filter-location]");
    if (!input) return;
    setMechHardpointFilterMinimum(
      input.dataset.mechHardpointFilterType,
      input.dataset.mechHardpointFilterLocation,
      input.value,
    );
  });
  $("mech-filter-overlay").addEventListener("focusout", (event) => {
    const quirkInput = event.target.closest("[data-mech-quirk-filter-value]");
    if (quirkInput) {
      const minimum = state.mechQuirkFilterSelections.get(quirkInput.dataset.mechQuirkFilterValue);
      quirkInput.value = minimum === null || minimum === undefined ? "" : String(minimum);
      return;
    }
    const input = event.target.closest("[data-mech-hardpoint-filter-location]");
    if (!input) return;
    const filter = state.mechHardpointFilters[input.dataset.mechHardpointFilterType];
    input.value = String(number(filter?.minimums[input.dataset.mechHardpointFilterLocation]));
  });
  $("mech-filter-overlay").addEventListener("wheel", (event) => {
    if (!event.target.closest("[data-mech-quirk-filter-value]")) return;
    event.preventDefault();
  }, { passive: false });
  document.querySelectorAll("[data-equipment-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeEquipmentCategory = button.dataset.equipmentCategory;
      renderEquipmentList();
    });
  });
  $("info-apply-quirks").addEventListener("change", (event) => {
    state.infoApplyQuirks = event.target.checked;
    renderMechList();
    renderInfoPanel();
    renderComparePanel();
  });
  $("fit-info-mech").addEventListener("click", () => {
    if (state.selectedMech) openMechFitting(state.selectedMech.id);
  });
  $("mech-browser-preview").addEventListener("click", (event) => {
    const button = event.target.closest("[data-fit-browser-mech]");
    if (button) openMechFitting(button.dataset.fitBrowserMech);
  });
  $("add-mechlab-fitting-tab").addEventListener("click", () => showFullMechlabList("add"));
  $("mechlab-fitting-tabs").addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-close-mechlab-fitting-tab]");
    if (closeButton) {
      closeMechlabTab(closeButton.dataset.closeMechlabFittingTab);
      return;
    }
    const tabButton = event.target.closest("[data-mechlab-fitting-tab]");
    if (tabButton) openMechlabTab(tabButton.dataset.mechlabFittingTab);
  });
  $("mechlab-fitting-tabs").addEventListener("keydown", (event) => {
    if (event.target.closest("#add-mechlab-fitting-tab")) {
      if (["ArrowLeft", "Home"].includes(event.key) && state.mechlabTabs.length) {
        event.preventDefault();
        openMechlabTab(state.mechlabTabs[event.key === "Home" ? 0 : state.mechlabTabs.length - 1].id);
        requestAnimationFrame(() => $("mechlab-fitting-tab-list").querySelector('[aria-selected="true"]')?.focus());
      }
      return;
    }
    const tabButton = event.target.closest("[data-mechlab-fitting-tab]");
    if (!tabButton) return;
    const index = state.mechlabTabs.findIndex((tab) => tab.id === tabButton.dataset.mechlabFittingTab);
    if (index < 0) return;
    if (event.key === "Delete") {
      event.preventDefault();
      closeMechlabTab(tabButton.dataset.mechlabFittingTab);
      return;
    }
    let nextIndex = null;
    if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    if (event.key === "ArrowRight" && index === state.mechlabTabs.length - 1 && !$("add-mechlab-fitting-tab").disabled) {
      event.preventDefault();
      $("add-mechlab-fitting-tab").focus();
      return;
    }
    if (event.key === "ArrowRight") nextIndex = Math.min(state.mechlabTabs.length - 1, index + 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = state.mechlabTabs.length - 1;
    if (nextIndex === null || nextIndex === index) return;
    event.preventDefault();
    openMechlabTab(state.mechlabTabs[nextIndex].id);
    requestAnimationFrame(() => $("mechlab-fitting-tab-list").querySelector('[aria-selected="true"]')?.focus());
  });
  $("mech-list-view-toggle").addEventListener("click", () => {
    state.largeMechList = !state.largeMechList;
    renderMechList();
    updateCompareOverlay();
  });
  $("show-mech-list").addEventListener("click", showMechlabList);
  $("close-mechlab-compact-list").addEventListener("click", closeMechlabCompactList);
  $("mechlab-compact-search").addEventListener("input", renderMechlabCompactList);
  $("open-ui-settings").addEventListener("click", openUiSettingsDialog);
  $("ui-settings-overlay").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-personal-settings-tab]");
    if (tab) setPersonalSettingsTab(tab.dataset.personalSettingsTab, true);
  });
  $("ui-settings-overlay").addEventListener("change", handleInitialFittingPreferenceChange);
  $("initial-armor-percentages").addEventListener("wheel", (event) => {
    if (event.target.matches("input[type=number]")) event.preventDefault();
  }, { passive: false });
  $("close-ui-settings-x").addEventListener("click", closeUiSettingsDialog);
  $("close-ui-settings").addEventListener("click", closeUiSettingsDialog);
  $("ui-settings-overlay").addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeUiSettingsDialog();
  });
  $("close-skill-x").addEventListener("click", closeSkillDialog);
  $("close-skill").addEventListener("click", closeSkillDialog);
  $("skill-overlay").addEventListener("click", (event) => {
    const all = event.target.closest("[data-skill-category-all]");
    if (all) {
      toggleAllSkillGroups();
      return;
    }
    const recommended = event.target.closest("[data-skill-category-recommended]");
    if (recommended) {
      applyRecommendedSkillGroups();
      return;
    }
    const group = event.target.closest("[data-skill-group]");
    if (group) {
      toggleSkillGroup(group.dataset.skillGroup);
      return;
    }
    if (event.target === event.currentTarget) closeSkillDialog();
  });
  document.querySelectorAll('[name="quirk-value-display"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) setQuirkValueDisplayMode(input.value);
    });
  });
  $("simplify-ammo-quirks").addEventListener("change", (event) => {
    setSimplifyAmmoQuirks(event.target.checked);
  });
  $("show-weapon-tooltip-quirks").addEventListener("change", (event) => {
    setShowWeaponTooltipQuirks(event.target.checked);
  });
  $("show-recommended-fittings").addEventListener("change", (event) => {
    setShowRecommendedFittings(event.target.checked);
  });
  $("close-build-actions-x").addEventListener("click", closeBuildActionsDialog);
  $("close-build-actions").addEventListener("click", closeBuildActionsDialog);
  $("build-actions-overlay").addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-build-action]");
    if (actionButton) {
      applyBuildAction(actionButton.dataset.buildAction);
      return;
    }
    if (event.target === event.currentTarget) closeBuildActionsDialog();
  });
  $("compare-clear-compare").addEventListener("click", clearCompareMechs);
  $("compare-deltas").addEventListener("change", (event) => {
    state.compareShowDeltas = event.target.checked;
    renderComparePanel();
  });
  $("compare-apply-quirks").addEventListener("change", (event) => {
    state.infoApplyQuirks = event.target.checked;
    renderMechList();
    renderInfoPanel();
    renderComparePanel();
  });
  document.querySelectorAll("[data-stats-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeStatsView = button.dataset.statsView;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-rank-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsRankMode = button.dataset.statsRankMode;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-chassis-aggregate]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsChassisAggregateMode = button.dataset.statsChassisAggregate;
      renderStatsPanel();
    });
  });
  $("stats-detail-toggle").addEventListener("click", () => {
    state.statsDetailMenusExpanded = !state.statsDetailMenusExpanded;
    renderStatsPanel();
  });
  document.querySelectorAll("[data-stats-durability-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsDurabilityScope = button.dataset.statsDurabilityScope;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-durability-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsDurabilityCategory = button.dataset.statsDurabilityCategory;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-mobility-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsMobilityCategory = button.dataset.statsMobilityCategory;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-quirk-category]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.statsQuirkCategory = button.dataset.statsQuirkCategory;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-cooldown-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.statsCooldownScope = button.dataset.statsCooldownScope;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-quirk-durability-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.statsQuirkDurabilityScope = button.dataset.statsQuirkDurabilityScope;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-heat-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      state.statsHeatScope = button.dataset.statsHeatScope;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-range-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsRangeScope = button.dataset.statsRangeScope;
      renderStatsPanel();
    });
  });
  document.querySelectorAll("[data-stats-velocity-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsVelocityScope = button.dataset.statsVelocityScope;
      renderStatsPanel();
    });
  });
  $("stats-hide-zero-quirks").addEventListener("change", (event) => {
    state.statsHideZeroQuirks = event.target.checked;
    renderStatsPanel();
  });
  document.querySelectorAll("[data-stats-durability-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.statsDurabilityMode = button.dataset.statsDurabilityMode;
      renderStatsPanel();
    });
  });
  $("stats-faction-filter").addEventListener("change", (event) => {
    state.statsConditionFaction = event.target.value;
    renderStatsPanel();
  });
  $("stats-condition-controls").addEventListener("click", (event) => {
    const axis = event.target.closest("[data-stats-condition-axis]");
    if (axis) {
      state.statsConditionAxis = axis.dataset.statsConditionAxis;
      renderStatsPanel();
      return;
    }
    const weight = event.target.closest("[data-stats-weight]");
    if (weight) {
      state.statsConditionAxis = "weight";
      const weightClass = weight.dataset.statsWeight;
      if (state.statsConditionWeightClasses.has(weightClass)) {
        state.statsConditionWeightClasses.delete(weightClass);
      } else {
        state.statsConditionWeightClasses.add(weightClass);
      }
      renderStatsPanel();
      return;
    }
    const tons = event.target.closest("[data-stats-ton]");
    if (tons) {
      state.statsConditionAxis = "tons";
      const tonsKey = tons.dataset.statsTon;
      if (state.statsConditionTons.has(tonsKey)) {
        state.statsConditionTons.delete(tonsKey);
      } else {
        state.statsConditionTons.add(tonsKey);
      }
      renderStatsPanel();
    }
  });
  $("stats-list").addEventListener("click", (event) => {
    const row = event.target.closest("[data-stats-entry]");
    if (!row) return;
    state.selectedStatsMechId = row.dataset.statsEntry;
    renderCurrentStatsSelection();
  });
  $("stats-list").addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const row = event.target.closest("[data-stats-entry]");
    if (!row) return;
    event.preventDefault();
    state.selectedStatsMechId = row.dataset.statsEntry;
    renderCurrentStatsSelection();
  });
  $("stats-detail").addEventListener("click", (event) => {
    const button = event.target.closest("[data-fit-stats-mech]");
    if (!button) return;
    openMechFitting(button.dataset.fitStatsMech);
  });
  $("compare-overlay").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-compare]");
    if (remove) {
      removeCompareMech(remove.dataset.removeCompare);
      return;
    }
    const baseline = event.target.closest("[data-compare-baseline]");
    if (baseline) {
      event.preventDefault();
      toggleCompareBaseline(baseline.dataset.compareBaseline);
    }
  });
  document.querySelector(".tab-content").addEventListener("scroll", updateCompareOverlay, { passive: true });
  window.addEventListener("resize", updateCompareOverlay, { passive: true });
  $("compare-info").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-compare]");
    if (remove) {
      removeCompareMech(remove.dataset.removeCompare);
      return;
    }
    const category = event.target.closest("[data-compare-category]");
    if (category) {
      event.preventDefault();
      toggleCompareCategory(category.dataset.compareCategory);
      return;
    }
    const baseline = event.target.closest("[data-compare-baseline]");
    if (baseline) {
      event.preventDefault();
      toggleCompareBaseline(baseline.dataset.compareBaseline);
      return;
    }
  });

  $("mech-list").addEventListener("click", (event) => {
    const chassis = event.target.closest("[data-chassis]");
    if (chassis) {
      state.selectedChassis = chassis.dataset.chassis;
      if (state.expandedChassis.has(state.selectedChassis)) {
        state.expandedChassis.delete(state.selectedChassis);
      } else {
        state.expandedChassis.add(state.selectedChassis);
      }
      if (!renderChassisGroupInPlace(state.selectedChassis)) {
        renderMechList();
      }
      updateCompareOverlay();
      return;
    }
    const button = event.target.closest("[data-mech]");
    if (button) {
      if (state.compareMode) {
        toggleCompareMech(button.dataset.mech);
      } else if (state.activeMainTab === "mechlab" && state.mechlabBrowseMode) {
        selectMech(button.dataset.mech, { historyMode: "none", enterFitting: false });
      } else {
        selectMech(button.dataset.mech);
      }
    }
  });
  $("mech-list").addEventListener("dblclick", (event) => {
    const button = event.target.closest("[data-mech]");
    if (!button || state.compareMode) return;
    event.preventDefault();
    openMechFitting(button.dataset.mech);
  });
  $("mech-list").addEventListener("pointerover", (event) => {
    const button = event.target.closest("[data-mech]");
    if (!button || button.contains(event.relatedTarget)) return;
    setMechBrowserPreviewHover(button.dataset.mech);
  });
  $("mech-list").addEventListener("pointerout", (event) => {
    const button = event.target.closest("[data-mech]");
    if (!button || button.contains(event.relatedTarget)) return;
    const nextButton = event.relatedTarget?.closest?.("[data-mech]");
    setMechBrowserPreviewHover(nextButton?.dataset.mech || null);
  });
  $("mech-list").addEventListener("focusin", (event) => {
    const button = event.target.closest("[data-mech]");
    if (button) setMechBrowserPreviewHover(button.dataset.mech);
  });
  $("mech-list").addEventListener("focusout", (event) => {
    const button = event.target.closest("[data-mech]");
    if (!button || button.contains(event.relatedTarget)) return;
    const nextButton = event.relatedTarget?.closest?.("[data-mech]");
    setMechBrowserPreviewHover(nextButton?.dataset.mech || null);
  });
  $("mech-list").addEventListener("scroll", rememberMechListScroll, { passive: true });
  $("mechlab-compact-list").addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-compact-mech]");
    if (addButton) {
      if (!addButton.disabled && state.mechlabTabs.length < MAX_MECHLAB_FITTING_TABS) {
        openMechFitting(addButton.dataset.addCompactMech, { mechlabMode: "add" });
      }
      return;
    }
    const chassis = event.target.closest("[data-chassis]");
    if (chassis) {
      state.selectedChassis = chassis.dataset.chassis;
      if (state.expandedChassis.has(state.selectedChassis)) state.expandedChassis.delete(state.selectedChassis);
      else state.expandedChassis.add(state.selectedChassis);
      renderMechlabCompactList();
      return;
    }
    const button = event.target.closest("[data-mech]");
    if (button) {
      if (String(state.selectedMech?.id || "") === String(button.dataset.mech)) closeMechlabCompactList();
      else selectMech(button.dataset.mech);
    }
  });
  $("item-list").addEventListener("click", (event) => {
    const sectionToggle = event.target.closest("[data-warehouse-section]");
    if (sectionToggle) {
      const sectionId = sectionToggle.dataset.warehouseSection;
      if (state.collapsedWarehouseSections.has(sectionId)) state.collapsedWarehouseSections.delete(sectionId);
      else state.collapsedWarehouseSections.add(sectionId);
      renderEquipmentList();
      return;
    }
    const omnipodRow = event.target.closest("[data-omnipod]");
    if (omnipodRow) {
      if (replaceOmnipod(omnipodRow.dataset.omnipodComponent, omnipodRow.dataset.omnipod)) {
        renderVariant();
        renderEquipmentList();
      }
      return;
    }
    const button = event.target.closest("[data-item]");
    if (!button) return;
    selectItem(button.dataset.item);
    autoInstallWarehouseItem(itemById(button.dataset.item));
  });
  $("upgrade-controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-upgrade-category]");
    if (!button || button.disabled) return;
    selectUpgrade(button.dataset.upgradeCategory, button.dataset.upgradeValue);
  });
  $("components").addEventListener("click", (event) => {
    if (globalThis.__MWOLAB_MOBILE__ && event.target.closest("[data-mobile-engine-heat-sink-delta], .engine-heat-sink-box")) {
      event.preventDefault();
      return;
    }
    const mechlabAction = event.target.closest("[data-mechlab-action]");
    if (mechlabAction) {
      const action = mechlabAction.dataset.mechlabAction;
      if (action === "simulation") openSimulation();
      else if (action === "skills") openSkillDialog();
      else if (action === "import") openLoadoutCodeDialog("import");
      else if (action === "export") openLoadoutCodeDialog("export");
      else if (action === "local-save") openLocalBuildDialog("save");
      else if (action === "local-load") openLocalBuildDialog("load");
      else if (action === "tools") openBuildActionsDialog();
      return;
    }
    const engineRatingButton = event.target.closest("[data-engine-rating-delta]");
    if (engineRatingButton) {
      event.preventDefault();
      changeEngineRating(engineRatingButton);
      return;
    }
    const engineSinkRow = event.target.closest("[data-engine-heat-sink-item]");
    if (engineSinkRow) {
      if (event.detail <= 0 || event.detail % 2 !== 0) return;
      event.preventDefault();
      const entry = engineHeatSinkEntries()[Number(engineSinkRow.dataset.engineHeatSinkItem)];
      duplicateInstalledItem(entry?.item_id);
      return;
    }
    if (event.target.closest("[data-engine-heat-sink-drop]")) return;
    const installedRow = event.target.closest("[data-loadout-item]");
    if (installedRow) {
      if (event.detail <= 0 || event.detail % 2 !== 0) return;
      const [component, indexText] = installedRow.dataset.loadoutItem.split(":");
      event.preventDefault();
      const entry = state.currentBuild?.components?.[component]?.items?.[Number(indexText)];
      duplicateInstalledItem(entry?.item_id, component);
      return;
    }
    const button = event.target.closest("[data-armor-delta]");
    if (!button || button.disabled) return;
    if (suppressArmorClick) {
      event.preventDefault();
      return;
    }
    adjustArmorAllocation(button);
  });
  $("components").addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (globalThis.__MWOLAB_MOBILE__ && event.target.closest(
      "[data-mobile-engine-heat-sink-delta], .engine-heat-sink-box, .engine-main-slot, .engine-fixed-slot",
    )) return;
    const engineSinkRow = event.target.closest("[data-engine-heat-sink-item]");
    if (engineSinkRow) {
      removeInstalledEngineHeatSink(Number(engineSinkRow.dataset.engineHeatSinkItem));
      return;
    }
    const installedRow = event.target.closest("[data-loadout-item]");
    if (!installedRow) return;
    const [component, indexText] = installedRow.dataset.loadoutItem.split(":");
    removeInstalledItem(component, Number(indexText));
  });
  $("components").addEventListener("keydown", (event) => {
    const armorInput = event.target.closest("[data-armor-input]");
    if (armorInput && event.key === "Enter") {
      event.preventDefault();
      armorInput.blur();
      return;
    }
    if (!["Enter", " "].includes(event.key)) return;
    const engineSinkRow = event.target.closest("[data-engine-heat-sink-item]");
    if (!engineSinkRow) return;
    event.preventDefault();
    removeInstalledEngineHeatSink(Number(engineSinkRow.dataset.engineHeatSinkItem));
  });
  $("components").addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-armor-delta]");
    if (!button || button.disabled || event.button !== 0) return;
    event.preventDefault();
    startArmorHold(button);
  });
  $("components").addEventListener("change", (event) => {
    const input = event.target.closest("[data-armor-input]");
    if (input) setArmorAllocation(input);
  });
  document.addEventListener("pointerup", stopArmorHold);
  document.addEventListener("pointercancel", stopArmorHold);
  $("item-list").addEventListener("pointerdown", beginEquipmentPointerDrag);
  $("components").addEventListener("pointerdown", beginEquipmentPointerDrag);
  document.addEventListener("pointermove", moveEquipmentPointerDrag, { passive: false });
  document.addEventListener("pointerup", (event) => finishEquipmentPointerDrag(event));
  document.addEventListener("pointercancel", (event) => finishEquipmentPointerDrag(event, true));
  document.addEventListener("click", (event) => {
    if (!suppressEquipmentPointerClick) return;
    suppressEquipmentPointerClick = false;
    clearTimeout(equipmentPointerClickReset);
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  $("item-list").addEventListener("dragstart", (event) => {
    const podRow = event.target.closest("[data-omnipod]");
    if (!podRow) return;
    state.activeDrag = {
      source: "omnipod",
      podId: podRow.dataset.omnipod,
      component: podRow.dataset.omnipodComponent,
    };
    podRow.classList.add("dragging");
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", `omnipod:${podRow.dataset.omnipod}`);
  });
  $("components").addEventListener("dragover", (event) => {
    const component = event.target.closest("[data-component-drop]");
    if (!component || state.activeDrag?.source !== "omnipod") return;
    document.querySelectorAll("[data-component-drop]").forEach((target) => target.classList.remove("drop-valid", "drop-invalid"));
    const valid = state.activeDrag.component === component.dataset.componentDrop;
    component.classList.add(valid ? "drop-valid" : "drop-invalid");
    if (valid) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  });
  $("components").addEventListener("drop", (event) => {
    const component = event.target.closest("[data-component-drop]");
    const payload = state.activeDrag;
    if (!component || payload?.source !== "omnipod") return;
    event.preventDefault();
    if (payload.component === component.dataset.componentDrop) {
      replaceOmnipod(payload.component, payload.podId);
      clearDragState();
      renderVariant();
      renderEquipmentList();
    }
  });
  document.addEventListener("dragend", clearDragState);
}

async function loadJson(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(t("status.loadPathFailed", { path }));
    return response.json();
  } catch (error) {
    if (location.protocol === "file:") {
      throw new Error(t("status.fileProtocol"));
    }
    throw error;
  }
}

async function init() {
  applyStaticTranslations();
  bindEvents();
  setupMechlabAutoScale();
  setMainTab(state.activeMainTab);
  try {
    state.index = await loadJson("data/index.json");
    const [mechs, equipment, localization, loadouts, omnipods, shakeDamping, skills] = await Promise.all([
      loadJson(state.index.files.mechs),
      loadJson(state.index.files.equipment),
      loadJson(state.index.files.localization),
      loadJson(state.index.files.loadouts),
      loadJson(state.index.files.omnipods),
      state.index.files.shake_damping_mechs
        ? loadJson(state.index.files.shake_damping_mechs)
        : Promise.resolve({ mechs: [] }),
      state.index.files.skills && !globalThis.__MWOLAB_MOBILE__
        ? loadJson(state.index.files.skills)
        : Promise.resolve({ categories: [], node_count: 0 }),
    ]);
    state.mechs = mechs.filter((mech) => mech.definition && mech.definition.components);
    initializeMechTypeFilters();
    state.equipment = applyEquipmentDisplayNameOverrides(excludeUnusedEquipment(equipment));
    state.gameLocalization = localization;
    state.gameLocalizationLookup = buildGameLocalizationLookup(localization);
    state.equipmentInfoHtmlCache.clear();
    state.loadouts = loadouts;
    state.omnipods = omnipods;
    state.skills = skills;
    initializeMechQuirkFilters();
    state.shakeDampingMechIds = new Set(
      (shakeDamping.mechs || []).map((mech) => String(mech.id)),
    );
    state.shakeDampingMechNames = new Set(
      (shakeDamping.mechs || []).map((mech) => normalizeLookupKey(mech.name)),
    );
    state.mechSpecialFeatureCache.clear();
    state.improvedJumpJetChassis = null;
    if (!globalThis.__MWOLAB_MOBILE__) scheduleStatsSummaryWarmup();
    $("data-status").textContent = t("status.loadedData", { count: state.index.counts.mechs });
    await initializeMechNavigation();
    resolveCommunityBridgeReady(true);
  } catch (error) {
    $("data-status").textContent = error.message;
    console.error(error);
    resolveCommunityBridgeReady(false);
  }
}

function mobileMechListData() {
  return (state.mechs || []).map((mech) => {
    return {
      id: String(mech.id),
      name: mech.display_name || variantCode(mech),
      chassis: String(mech.chassis || ""),
      chassisName: gameLocalizedText(mech.chassis) || formatChassisName(mech.chassis),
      faction: factionLabel(mech.faction),
      factionKey: String(mech.faction || ""),
      factionOrder: factionRank(mech.faction),
      weightClass: WEIGHT_CLASS_LABELS[mech.weight_class] || mech.weight_class || "",
      weightClassKey: String(mech.weight_class || ""),
      tons: number(mech.definition?.stats?.MaxTons),
      omnipodIcon: omnipodIcon(mech),
      slotBadges: mechSlotBadges(mech),
    };
  });
}

function weaponTooltipVelocityValue(baseSpeed, velocityBonus, targetComputer) {
  if (!(baseSpeed > 0)) return null;
  return targetComputer.speedBonus !== 0
    ? tooltipFinalQuirkValue(
      baseSpeed,
      baseSpeed * (1 + velocityBonus + targetComputer.speedBonus),
      1,
      " m/s",
    )
    : tooltipQuirkValue(
      baseSpeed,
      baseSpeed * (1 + velocityBonus),
      1,
      " m/s",
    );
}

function mobilePickerData(component, category = "weapons") {
  if (!state.selectedMech || !state.currentBuild?.components?.[component]) {
    return { component, category, hardpointCapacity: {}, remainingHardpoints: {}, items: [], omnipods: [], fixedEngine: false };
  }

  const calc = calculateBuild();
  const componentDefinition = effectiveComponentDefinition(state.selectedMech, state.currentBuild, component);
  const capacity = hardpointCountsFromHardpoints(componentDefinition.hardpoints || []);
  const used = calc.componentUsage?.[component]?.hardpoints || {};
  const hardpointCapacity = Object.fromEntries(HARDPOINT_ORDER
    .filter((type) => number(capacity[type]) > 0)
    .map((type) => [type, number(capacity[type])]));
  const remainingHardpoints = Object.fromEntries(Object.keys(hardpointCapacity).map((type) => [
    type,
    Math.max(0, number(capacity[type]) - number(used[type])),
  ]));

  if (category === "omnipods") {
    const chassis = String(state.selectedMech.chassis || "").toLowerCase();
    const omnipods = Object.values(state.omnipods || {})
      .filter((pod) => String(pod.chassis || "").toLowerCase() === chassis)
      .filter((pod) => String(pod.component || "") === String(component))
      .sort((a, b) => String(a.set).localeCompare(String(b.set), undefined, { numeric: true }))
      .map((pod) => ({
        id: String(pod.id),
        name: `${String(pod.set || "OMNIPOD").toUpperCase()} ${String(component).replaceAll("_", " ").toUpperCase()}`,
        active: String(state.currentBuild.components[component].omnipod || "") === String(pod.id),
        hardpoints: hardpointCountsFromHardpoints(omnipodDefinition(pod).hardpoints || []),
      }));
    return { component, category, hardpointCapacity, remainingHardpoints, items: [], omnipods, fixedEngine: component === "centre_torso" };
  }

  const isOmniMech = hasFixedOmnipods(state.selectedMech);
  const families = category === "weapons"
    ? ["weapons"]
    : category === "ammo"
      ? ["ammo"]
      : category === "engines"
        ? ["engines"]
        : category === "engine-heatsinks"
          ? ["equipment"]
          : ["equipment", "jumpjets", "masc", ...(ENGINE_COMPONENTS.has(component) && !isOmniMech ? ["engines"] : [])];
  const ids = [...new Set(families.flatMap((family) => state.equipment?.families?.[family] || []))];
  const ammoTypes = category === "ammo" ? installedWeaponAmmoTypes() : null;
  const items = ids
    .map((id) => itemById(id))
    .filter(Boolean)
    .filter((item) => !isHiddenMechlabEquipment(item))
    .filter((item) => itemMatchesMechFaction(item))
    .filter((item) => heatSinkMatchesUpgrade(item))
    .filter((item) => !guidanceMismatch(item))
    .filter((item) => equipmentMatchesSelectedMechCapabilities(item))
    .filter((item) => !ammoTypes || ammoMatchesInstalledWeapons(item, ammoTypes))
    .filter((item) => category !== "engine-heatsinks" || isHeatSink(item))
    .filter((item) => category !== "engines" || engineCanBeInstalledOnSelectedMech(item, isOmniMech))
    .filter((item) => category !== "engines" || component === "centre_torso")
    .filter((item) => category !== "equipment" || Boolean(warehouseItemSection(item, category, isOmniMech)))
    .filter((item) => category === "engines" || itemAllowedInComponent(item, component))
    .filter((item) => {
      if (category !== "weapons") return true;
      const type = equipmentHardpointType(item);
      return HARDPOINT_ORDER.includes(type) && number(hardpointCapacity[type]) > 0;
    })
    .map((item) => {
      const warning = category === "engine-heatsinks"
        ? engineHeatSinkDropValidation(item, { source: "warehouse", itemId: item.id }) || ""
        : dropValidation(item, component) || "";
      const type = item.item_type === "ammo" ? ammoHardpointType(item) : equipmentHardpointType(item);
      return {
        id: String(item.id),
        name: item.display_name || item.name || String(item.id),
        type: type || item.item_type || "equipment",
        slots: effectiveItemSlots(item),
        tons: itemTons(item),
        warning,
        slotShortage: /(?:^|:\s*)Slots\s+\d+\/\d+/i.test(warning),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return {
    component,
    category,
    hardpointCapacity,
    remainingHardpoints,
    items,
    omnipods: [],
    fixedEngine: Boolean(fixedOmniEngine()),
  };
}

function mobileSlotSummary() {
  if (!state.selectedMech || !state.currentBuild) return null;
  const calc = calculateBuild();
  return {
    tons: number(calc.totalTons),
    maxTons: number(calc.maxTons),
    tonsOver: number(calc.totalTons) > number(calc.maxTons) + 0.0001,
    current: number(calc.currentSlotUsage),
    total: number(calc.totalSlotCapacity),
    remaining: number(calc.freeSlots),
    slotsOver: number(calc.currentSlotUsage) > number(calc.totalSlotCapacity),
    warnings: [...(calc.warnings || [])],
  };
}

function mobileRemoveItem(component, index, { render = true } = {}) {
  const entry = state.currentBuild?.components?.[component]?.items?.[Number(index)];
  if (!entry || itemById(entry.item_id)?.item_type === "engine") return false;
  return removeInstalledItem(component, Number(index), { render });
}

function mobileInstallEngineHeatSink(itemId, { render = true } = {}) {
  const item = itemById(itemId);
  if (
    !item
    || !heatSinkMatchesUpgrade(item)
    || engineHeatSinkDropValidation(item, { source: "warehouse", itemId: item.id })
  ) return false;
  engineHeatSinkEntries().push(buildEntryForItem(item));
  if (render) renderVariant();
  return true;
}

function mobileAdjustEngineHeatSink(delta, { render = true } = {}) {
  const direction = Math.sign(number(delta));
  if (direction < 0) {
    const entries = engineHeatSinkEntries();
    return removeInstalledEngineHeatSink(entries.length - 1, { render });
  }
  if (direction > 0) {
    const item = compatibleHeatSinkForUpgrade();
    return Boolean(item && mobileInstallEngineHeatSink(item.id, { render }));
  }
  return false;
}

globalThis.MwoLabMobileBridge = Object.freeze({
  ready: () => Boolean(state.index && state.equipment && state.mechs?.length),
  language: () => activeLanguage,
  selectedMech: () => state.selectedMech ? {
    id: String(state.selectedMech.id),
    name: state.selectedMech.display_name || variantCode(state.selectedMech),
  } : null,
  mechs: mobileMechListData,
  slotSummary: mobileSlotSummary,
  picker: mobilePickerData,
  prepareMechList() {
    state.largeMechList = false;
  },
  openFitting(mechId) {
    if (!mechById(mechId)) return false;
    selectMech(mechId, { historyMode: "push", mechlabMode: "replace" });
    return true;
  },
  install(itemId, component) {
    const item = itemById(itemId);
    return Boolean(item && installWarehouseItemInComponent(item, component));
  },
  installEngineHeatSink(itemId) {
    return mobileInstallEngineHeatSink(itemId);
  },
  adjustEngineHeatSink(delta) {
    return mobileAdjustEngineHeatSink(delta);
  },
  remove(component, index) {
    return mobileRemoveItem(component, index);
  },
  removeEngineHeatSink(index) {
    return removeInstalledEngineHeatSink(Number(index));
  },
  replaceOmnipod(component, podId) {
    const changed = replaceOmnipod(component, podId);
    if (changed) {
      renderVariant();
      renderEquipmentList();
    }
    return changed;
  },
  openTools: openBuildActionsDialog,
  openLoadout: openLoadoutCodeDialog,
  openSharedFittingCode(code) {
    importMwoCode(code, { closeDialog: false, updateNavigation: false });
    void replaceSharedLoadoutNavigation(code).catch((error) => {
      $("data-status").textContent = error.message;
    });
    return true;
  },
});

if (globalThis.__MWOLAB_TEST__) {
  globalThis.__MWOLAB_TEST_API__ = Object.freeze({
    state,
    MAX_MECHLAB_FITTING_TABS,
    activeMechlabTab,
    hasFocusedEmptyMechlabTabSlot,
    focusEmptyMechlabTabSlot,
    mechlabFittingTargetMode,
    isHiddenMechlabEquipment,
    applyEquipmentDisplayNameOverrides,
    restoreMechlabMainTabViewState,
    setMechlabFitting,
    addMechlabTabRecord,
    assignMechlabFittingTabRecord,
    replaceActiveMechlabTabRecord,
    activateMechlabTabRecord,
    restoreMechlabHistoryTabRecord,
    closeMechlabTabRecord,
    setActiveMechlabTabBuild,
    mechlabFittingTabLabels,
    number,
    sortChassisGroups,
    isRocketLauncher,
    isContinuousPerSecondWeapon,
    weaponProjectilesPerFiring,
    weaponBaseDirectDamage,
    weaponBonusDirectDamage,
    weaponDirectDamage,
    weaponSplashDamage,
    weaponTotalDamage,
    jumpJetFinalStats,
    jumpJetHeight,
    itemSlots,
    itemTons,
    structureUpgradeSlots,
    armorUpgradeSlots,
    fixedArmorUpgradeSlots,
    allocateUpgradeSlots,
    allocateFixedUpgradeSlots,
    structureUpgradeTonnage,
    armorTonnage,
    internalItemTonnageModifier,
    itemHeat,
    engineIncludedHeatSinkCount,
    engineAdditionalHeatSinkCapacity,
    engineUserHeatSinkCapacity,
    engineStoredHeatSinkCapacity,
    normalizeEngineHeatSinks,
    renderEngineHeatSinkBay,
    engineSideSlots,
    activeWeaponAmmoType,
    weaponAmmoPerTrigger,
    ammoCapacityQuirkKey,
    ammoCapacityQuirkBonus,
    effectiveAmmoShots,
    equipmentInfoWeaponAmmoType,
    equipmentInfoAmmoWeapons,
    equipmentInfoAmmoFireCount,
    equipmentInfoAmmoWeaponDamageParts,
    equipmentInfoAmmoWeaponTotalDamage,
    equipmentInfoAmmoDamageHtml,
    equipmentInfoAmmoTotalDamage,
    equipmentInfoAmmoInternalDamageText,
    equipmentInfoAmmoRow,
    isEquipmentInfoArtemisAmmo,
    equipmentInfoAmmoCategory,
    equipmentInfoSharedAmmoLabel,
    equipmentInfoSharedAmmoGroups,
    equipmentInfoSharedAmmoRows,
    renderEquipmentInfoAmmo,
    hardpointSlots,
    hardpointCountsFromDefinition,
    componentCanEquipEcm,
    addEcmCapabilityHardpoint,
    effectiveComponentDefinition,
    durabilitySkillFinalValue,
    baseMaxArmor,
    armorInfoRows,
    structureInfoRows,
    currentBuildArmorTotal,
    combinedDurabilityRows,
    componentArmorCapacity,
    componentDurabilityQuirkValues,
    finalArmorAllocation,
    renderArmorStepper,
    quirkMultiplier,
    quirkReduction,
    quirkIncrease,
    quirkSignedValue,
    movementInfo,
    targetEquipmentSensorRangeBonus,
    mechSensorRange,
    isLosWeapon,
    hasLrmDirectVelocity,
    weaponDirectVelocity,
    weaponSpreadValues,
    simulationSpecificQuirkTotal,
    collectWeaponQuirkEffects,
    collectEquipmentQuirkEffects,
    collectTargetComputerWeaponEffects,
    collectInstalledWeaponEquipmentEffects,
    targetComputerWeaponModifiers,
    weaponFunctionModesForItem,
    effectiveWeaponStats,
    effectiveWeaponFiringProfile,
    simulationWeaponTiming,
    collectSimulationWeapons,
    mechSummaryAmmoGroups,
    isStreakSrm,
    weaponVolleySize,
    weaponFiringEventCount,
    weaponFiringTime,
    weaponExpectedCooldown,
    simulationWeaponHeat,
    simulationWeaponRangeBonus,
    simulationWeaponRangeProfile,
    simulationWeaponDamageMultiplier,
    simulationWeaponDamage,
    simulationWeaponDamagePerSecond,
    simulationWeaponHeatPerSecond,
    weaponDetailFrequencyRatio,
    weaponDetailAdjustedRate,
    weaponDetailEffectiveCooldown,
    weaponDetailDpsAtDistance,
    weaponDetailDistanceSegments,
    weaponDetailDamageRatio,
    weaponDetailDamageColor,
    weaponDetailDistanceBoundaries,
    weaponDetailHeatEfficiency,
    weaponDetailHeatEfficiencyColor,
    weaponDetailWeaponDamageRatio,
    weaponDetailWeaponRangeTone,
    weaponDetailRangeType,
    weaponDetailVisibleRangeTypes,
    weaponDetailWeaponEnabled,
    weaponDetailRangeTypeEnabled,
    weaponDetailMaximumFiringRange,
    weaponDetailEffectiveFrequency,
    alphasToOverheat,
    simulationHeatSystemFromSink,
    ghostHeatHslBonus,
    ghostHeatWeaponExtra,
    ghostHeatGroupKey,
    ghostHeatForSimulationWeapons,
    weaponDamagePerSecond,
    amsDamagePerSecond,
    weaponDamageRate,
    weaponTotalDamageRate,
    weaponTooltipStatistics,
    weaponDamageTooltipValue,
    weaponTooltipCriticalChance,
    renderEquipmentInfoWeapons,
    equipmentTooltipGroups,
    equipmentTooltipHtml,
    equipmentTooltipAppliedEffectsHtml,
    setShowWeaponTooltipQuirks,
    setShowRecommendedFittings,
    showEquipmentTooltip,
    weaponTooltipRanges,
    atmRangeBoundary,
    atmTooltipDamageBands,
    ultraAutoCannonJamStats,
    mechSummaryWeaponMetrics,
    mechSummaryAlphaHeatRows,
    renderMechSummaryAlphaHeat,
    communitySniperWeapon,
    communityFittingTagMetrics,
    communityFittingTags,
    communityInstalledWeaponSummary,
    communityRepresentativeWeapons,
    recommendationContext,
    normalizeInitialFittingPreferences,
    buildForMechSelection,
    setInitialFittingPreference,
    stripBuildEquipment,
    maximizeBuildArmor,
    mechSpecialFeatures,
    mechMatchesQuirkFilters,
    normalizeMechHardpointFilterMinimum,
    calculateBuild,
    mobilePickerData,
    mobileSlotSummary,
    mobileRemoveItem,
    mobileInstallEngineHeatSink,
    mobileAdjustEngineHeatSink,
    installWarehouseItemInComponent,
    removeInstalledEngineHeatSink,
    replaceOmnipod,
    sharedLoadoutUrl,
    decodeSharedLoadoutValue,
    replaceSharedLoadoutNavigation,
    publicFittingUrl,
    updateMechlabTabsPublicFittingLike,
    setMechlabTabsPublicLikeCapability,
    openPublicFittingSources,
    restoreMechlabHistorySnapshot,
    applyMechlabHistorySnapshotToTab,
  });
} else {
  init();
}
