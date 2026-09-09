import { FIREBASE_VERSION, firebaseConfig } from "./firebase-public-config.js";

const PAGE_SIZE = 25;
const FETCH_LIMIT = 100;
const PAGE_GROUP_SIZE = 5;
const TITLE_LIMIT = 20;
const MAX_PUBLIC_FITTINGS = 100;
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 20;
const PILOT_NAME = "Pilot";
const PROFILE_CACHE_TTL_MS = 60_000;
const RECOMMENDATION_LIMIT = 3;
const RECOMMENDATION_CACHE_STORAGE_KEY = "mwolab:recommended-fittings:v1";
const RECOMMENDATION_CACHE_VERSION = 1;
const GOOGLE_IDENTITY_CLIENT_ID = "743748401179-u7uf1svvj8cbs64987om4969jq6eu0jo.apps.googleusercontent.com";
const bridge = globalThis.MwoLabCommunityBridge;
let language = bridge?.language === "en" ? "en" : "kr";
const COPY = {
  kr: {
    login: "Google 로그인", logout: "로그아웃", account: "계정 메뉴", profile: "프로필", author: "작성자", browserTitle: "핏팅 브라우저", saveTitle: "빌드 저장하기", browserEyebrow: "FITTING BROWSER", saveEyebrow: "SAVE BUILD",
    nicknameTitle: "닉네임 설정", nicknameChangeTitle: "닉네임 변경", nicknameDescription: "공개 핏팅에서 사용할 고유 닉네임을 설정할 수 있습니다.", nicknameLaterNotice: "지금 설정하지 않아도 나중에 프로필 메뉴에서 다시 설정할 수 있습니다.", nicknameLabel: "닉네임",
    nicknameRules: "2~20자의 영문과 숫자만 사용할 수 있습니다. Pilot은 사용할 수 없습니다.", nicknameLater: "나중에 설정", nicknameSubmit: "설정하기", nicknameChangeSubmit: "변경하기",
    nicknameInvalid: "사용할 수 없는 닉네임입니다.", nicknameReserved: "이 닉네임은 사용할 수 없습니다.", nicknameUnchanged: "현재 닉네임과 같습니다.", nicknameChecking: "중복을 확인하는 중입니다...", nicknameAvailable: "사용할 수 있는 닉네임입니다.", nicknameTaken: "이미 사용 중인 닉네임입니다.", nicknameCheckFailed: "닉네임을 확인할 수 없습니다. 잠시 후 다시 시도하세요.", nicknameRace: "방금 다른 사용자가 이 닉네임을 사용했습니다. 다른 닉네임을 선택해주세요.", nicknameSaved: "닉네임이 설정되었습니다.", nicknameChanged: "닉네임이 변경되었습니다.", nicknameSkipFailed: "닉네임 안내 상태를 저장하지 못했습니다. 로그인 상태는 유지됩니다.",
    publicTab: "공개", localTab: "로컬", mineTab: "내가 올린 핏팅", search: "제목 검색", allMechs: "전체", selectMech: "멕 선택", expandChassis: "기종 펼치기", collapseChassis: "기종 접기",
    newest: "최신순", likesSort: "좋아요순", loading: "핏팅을 불러오는 중입니다...",
    publicEmpty: "등록된 공개 핏팅이 없습니다.", localEmpty: "이 PC에 저장된 핏팅이 없습니다.",
    mineEmpty: "내가 올린 핏팅이 없습니다.", searchEmpty: "검색 조건에 맞는 핏팅이 없습니다.",
    publicLoadUnavailable: "현재 공개 핏팅을 불러올 수 없습니다. 로컬 핏팅은 계속 사용할 수 있습니다.",
    mineLoadUnavailable: "현재 내가 올린 핏팅을 불러올 수 없습니다. 로컬 핏팅은 계속 사용할 수 있습니다.",
    select: "목록에서 핏팅을 선택하세요.", invalid: "현재 데이터에서 열 수 없는 핏팅",
    apply: "이 핏팅 적용", like: "좋아요", unlike: "좋아요 취소", share: "URL로 공유하기", delete: "삭제", deleteConfirm: "이 핏팅을 삭제하시겠습니까?",
    shareDialogTitle: "공유 URL", shareUrlLabel: "공유 URL", shareCopy: "URL 복사", shareClose: "닫기",
    shareCopied: "공유 URL이 복사되었습니다.", shareFailed: "공유 URL을 복사하지 못했습니다.",
    sharedLoaded: "공유 핏팅을 불러왔습니다.", sharedMissing: "이 공유 핏팅은 삭제되었거나 존재하지 않습니다.",
    sharedInvalid: "올바르지 않은 공유 핏팅 링크입니다.", sharedLoadFailed: "공유 핏팅을 불러오지 못했습니다.",
    previousPage: "이전", nextPage: "다음", weapons: "장착 무기", details: "상세 정보", updated: "업데이트",
    recommendationTitle: "추천 핏팅", recommendationApply: "이 핏팅 적용",
    tags: {
      highPower: "고화력", cooler: "쿨러", ghostHeat: "고스트 힛", fullArmor: "풀아머", glassArmor: "유리장갑",
      shortRange: "근거리", mediumRange: "중거리", longRange: "장거리", sniper: "스나이퍼", brawler: "브롤러",
    }, saveLocation: "1. 저장 위치 선택",
    publicLocation: "공개", publicHelp: "다른 사용자들이 볼 수 있습니다.", pcLocation: "내 PC", pcHelp: "이 PC에만 저장됩니다.",
    titleLabel: "2. 제목 (필수)", titlePlaceholder: "빌드 제목을 입력하세요.", titleCharactersOnly: "영문, 숫자, 특수문자만 사용할 수 있습니다.", titleHttpsBlocked: "제목에 https를 사용할 수 없습니다.",
    cancel: "취소", save: "저장하기", saving: "저장 중...", localSaved: "내 PC에 저장되었습니다.", publicSaved: "공개 핏팅으로 저장되었습니다.",
    loginRequired: "공개 저장, 내가 올린 핏팅과 좋아요는 Google 로그인이 필요합니다.", likeLoginRequired: "좋아요를 사용하려면 Google 로그인이 필요합니다.", signInAction: "로그인하기",
    unavailable: "Firebase 연결을 사용할 수 없습니다. 잠시 후 다시 시도하세요.",
    httpRequired: "Firebase 연동은 localhost 또는 배포된 웹사이트에서 사용할 수 있습니다.", noFitting: "먼저 멕과 핏팅을 선택하세요.",
    loadFailed: "핏팅 목록을 불러오지 못했습니다.", saveFailed: "핏팅을 저장하지 못했습니다.", localSaveFailed: "이 PC에 핏팅을 저장할 수 없습니다.",
    deleteFailed: "핏팅을 삭제하지 못했습니다.", uploadLimit: "공개 핏팅은 계정당 최대 100개까지 올릴 수 있습니다.",
    firestorePermissionDenied: "Firestore 보안 규칙이 이 작업을 허용하지 않습니다. Firebase Console의 Firestore Database > Rules에 최신 규칙이 게시되었는지 확인하세요.",
    firestoreUnavailable: "Firestore에 연결하지 못했습니다. 잠시 후 다시 시도하세요.", likeFailed: "좋아요를 변경하지 못했습니다.",
    loginFailed: "Google 로그인에 실패했습니다.", unauthorizedDomain: "현재 주소({host})가 Firebase 승인된 도메인이 아닙니다.",
    popupClosed: "Google 로그인 창이 인증 완료 전에 닫혔습니다.", popupBlocked: "브라우저가 Google 로그인 팝업을 차단했습니다.",
    providerDisabled: "Firebase Authentication에서 Google 로그인 제공업체가 활성화되어 있지 않습니다.", networkFailed: "Google 로그인 서버에 연결하지 못했습니다.",
    stat: { armor: "아머", tons: "톤수", engine: "엔진", maxSpeed: "최대 속도", dps: "DPS", alphaDamage: "알파샷 데미지", heatEfficiency: "열 효율", heatSinks: "히트싱크 수" },
  },
  en: {
    login: "Google Sign in", logout: "Sign out", account: "Account menu", profile: "Profile", author: "Author", browserTitle: "Fitting Browser", saveTitle: "Save Build", browserEyebrow: "FITTING BROWSER", saveEyebrow: "SAVE BUILD",
    nicknameTitle: "Set nickname", nicknameChangeTitle: "Change nickname", nicknameDescription: "Choose a unique nickname to show with public fittings.", nicknameLaterNotice: "You can skip this now and set it later from the Profile menu.", nicknameLabel: "Nickname",
    nicknameRules: "Use 2–20 English letters or numbers. Pilot is reserved.", nicknameLater: "Set later", nicknameSubmit: "Set nickname", nicknameChangeSubmit: "Change nickname",
    nicknameInvalid: "This nickname cannot be used.", nicknameReserved: "This nickname is reserved.", nicknameUnchanged: "This is your current nickname.", nicknameChecking: "Checking availability...", nicknameAvailable: "This nickname is available.", nicknameTaken: "This nickname is already in use.", nicknameCheckFailed: "Could not check the nickname. Try again shortly.", nicknameRace: "Someone just claimed this nickname. Choose another one.", nicknameSaved: "Nickname set.", nicknameChanged: "Nickname changed.", nicknameSkipFailed: "Could not save the nickname prompt state. You remain signed in.",
    publicTab: "Public", localTab: "Local", mineTab: "My Uploads", search: "Search titles", allMechs: "All", selectMech: "Select mech", expandChassis: "Expand chassis", collapseChassis: "Collapse chassis",
    newest: "Newest", likesSort: "Most liked", loading: "Loading fittings...", publicEmpty: "No public fittings yet.",
    localEmpty: "No fittings are saved on this PC.", mineEmpty: "You have not uploaded a fitting.", searchEmpty: "No fitting matches the search.",
    publicLoadUnavailable: "Public fittings are currently unavailable. Local fittings remain available.",
    mineLoadUnavailable: "Your uploaded fittings are currently unavailable. Local fittings remain available.",
    select: "Select a fitting from the list.", invalid: "Fitting unavailable with current data", apply: "Apply fitting", like: "Like", unlike: "Unlike", share: "Share URL", delete: "Delete",
    shareDialogTitle: "Share URL", shareUrlLabel: "Share URL", shareCopy: "Copy URL", shareClose: "Close",
    shareCopied: "Share URL copied.", shareFailed: "Could not copy the share URL.", sharedLoaded: "Shared fitting loaded.",
    sharedMissing: "This shared fitting no longer exists.", sharedInvalid: "This shared fitting link is invalid.", sharedLoadFailed: "Could not load the shared fitting.",
    deleteConfirm: "Delete this fitting?", previousPage: "Previous", nextPage: "Next", weapons: "Installed weapons", details: "Details", updated: "Updated",
    recommendationTitle: "Recommended fitting", recommendationApply: "Apply this fitting",
    tags: {
      highPower: "High Power", cooler: "Cooler", ghostHeat: "Ghost Heat", fullArmor: "Full Armor", glassArmor: "Glass Armor",
      shortRange: "Short Range", mediumRange: "Medium Range", longRange: "Long Range", sniper: "Sniper", brawler: "Brawler",
    }, saveLocation: "1. Save location", publicLocation: "Public",
    publicHelp: "Other users can view this fitting.", pcLocation: "My PC", pcHelp: "Saved only on this PC.", titleLabel: "2. Title (required)",
    titlePlaceholder: "Enter a build title.", titleCharactersOnly: "Use only English letters, numbers, and special characters.", titleHttpsBlocked: "Titles cannot contain https.",
    cancel: "Cancel", save: "Save", saving: "Saving...", localSaved: "Saved on this PC.", publicSaved: "Saved as a public fitting.",
    loginRequired: "Google sign-in is required for public saves, uploads, and likes.", likeLoginRequired: "Google sign-in is required to like this fitting.", signInAction: "Sign in", unavailable: "Firebase is unavailable. Try again shortly.",
    httpRequired: "Firebase is available on localhost or the deployed website.", noFitting: "Select a mech and fitting first.", loadFailed: "Could not load fittings.",
    saveFailed: "Could not save the fitting.", localSaveFailed: "Could not save the fitting on this PC.", deleteFailed: "Could not delete the fitting.",
    uploadLimit: "Each account can upload up to 100 public fittings.",
    firestorePermissionDenied: "Firestore rules denied this action. Check that the latest rules are published in Firebase Console under Firestore Database > Rules.",
    firestoreUnavailable: "Could not connect to Firestore. Try again shortly.", likeFailed: "Could not update the like.", loginFailed: "Google sign-in failed.",
    unauthorizedDomain: "The current host ({host}) is not authorized.", popupClosed: "The Google sign-in window closed before authentication completed.",
    popupBlocked: "The browser blocked the Google sign-in popup.", providerDisabled: "The Google provider is not enabled in Firebase Authentication.", networkFailed: "Could not reach Google sign-in.",
    stat: { armor: "Armor", tons: "Tonnage", engine: "Engine", maxSpeed: "Max speed", dps: "DPS", alphaDamage: "Alpha damage", heatEfficiency: "Heat efficiency", heatSinks: "Heat sinks" },
  },
};
let copy = COPY[language];
const elements = {
  login: document.getElementById("community-login"), authStatus: document.getElementById("community-auth-status"),
  accountMenu: document.getElementById("community-account-menu"),
  setNickname: document.getElementById("community-set-nickname"), logout: document.getElementById("community-logout"),
  overlay: document.getElementById("community-overlay"), title: document.getElementById("community-title"), eyebrow: document.getElementById("community-eyebrow"),
  mechFilterTrigger: document.getElementById("community-mech-filter-trigger"), mechFilterMenu: document.getElementById("community-mech-filter-menu"),
  close: document.getElementById("close-community"), content: document.getElementById("community-content"), status: document.getElementById("community-status"),
  nicknameOverlay: document.getElementById("nickname-overlay"), nicknameForm: document.getElementById("nickname-form"), nicknameInput: document.getElementById("nickname-input"),
  nicknameTitle: document.getElementById("nickname-title"), nicknameDescription: document.getElementById("nickname-description"), nicknameLaterNotice: document.getElementById("nickname-later-notice"), nicknameStatus: document.getElementById("nickname-check-status"),
  nicknameCount: document.getElementById("nickname-count"), nicknameRules: document.getElementById("nickname-rules"), nicknameLater: document.getElementById("nickname-later"),
  nicknameSubmit: document.getElementById("nickname-submit"), closeNickname: document.getElementById("close-nickname"),
  shareOverlay: document.getElementById("community-share-url-overlay"), shareTitle: document.getElementById("community-share-url-title"),
  shareLabel: document.getElementById("community-share-url-label"), shareUrl: document.getElementById("community-share-url-text"),
  shareStatus: document.getElementById("community-share-url-status"), shareCopy: document.getElementById("copy-community-share-url"),
  closeShare: document.getElementById("close-community-share-url"),
  recommendationOverlay: document.getElementById("recommended-fitting-overlay"), recommendationTitle: document.getElementById("recommended-fitting-title"),
  recommendationContent: document.getElementById("recommended-fitting-content"), recommendationClose: document.getElementById("close-recommended-fitting"),
  recommendationApply: document.getElementById("apply-recommended-fitting"),
};

let auth = null;
let db = null;
let currentUser = null;
let firebaseApi = null;
let firebaseReady = null;
let googleTokenClient = null;
let pendingSignInResolve = null;
let activeMode = "browse";
let activeBrowserTab = "public";
let sortMode = "newest";
let searchText = "";
let records = [];
let selectedId = null;
let currentPage = 1;
let selectedMechFilterId = "";
let selectedChassisFilterKey = "";
let lastDocument = null;
let remoteHasMore = true;
let hasMore = false;
let browserNotice = null;
let browserFooterNotice = null;
let returnFocus = null;
let loadRequestGeneration = 0;
let sharedLoadGeneration = 0;
let currentProfile = null;
let profileLoadGeneration = 0;
let nicknameCheckGeneration = 0;
let nicknameCheckTimer = 0;
let nicknameAvailableKey = "";
let nicknamePromptMode = "account";
let shareDialogTrigger = null;
const profileCache = new Map();
const profileCacheTimes = new Map();
const profileDataCache = new Map();
const profileRequests = new Map();
const likedFittingKeys = new Set();
const pendingLikeStateRequests = new Set();
const expandedMechFilterChassis = new Set();
let authStatusTimer = null;
let recommendationDialogRecord = null;
let recommendationDialogTrigger = null;
const recommendationCache = new Map();
const recommendationRequests = new Map();
const recommendationGenerations = new Map();
let activeRecommendationCacheDay = recommendationCacheDay();

function format(text, values = {}) { return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
function setStatus(message = "", tone = "") {
  elements.status.textContent = message;
  elements.status.className = `community-status${tone ? ` ${tone}` : ""}`;
}
function setAuthStatus(message = "") {
  clearTimeout(authStatusTimer);
  elements.authStatus.textContent = message;
  elements.authStatus.hidden = !message;
  if (message) {
    authStatusTimer = setTimeout(() => {
      elements.authStatus.textContent = "";
      elements.authStatus.hidden = true;
    }, 3000);
  }
}
function firebaseErrorMessage(error, fallback) {
  const messages = {
    "auth/unauthorized-domain": format(copy.unauthorizedDomain, { host: location.hostname || location.host }),
    "auth/popup-closed-by-user": copy.popupClosed, "auth/popup-blocked": copy.popupBlocked,
    "auth/operation-not-allowed": copy.providerDisabled, "auth/network-request-failed": copy.networkFailed,
    "permission-denied": copy.firestorePermissionDenied, "firestore/permission-denied": copy.firestorePermissionDenied,
    unavailable: copy.firestoreUnavailable, "firestore/unavailable": copy.firestoreUnavailable,
    "upload-limit": copy.uploadLimit,
  };
  const message = messages[error?.code] || fallback;
  return error?.code ? `${message} (${error.code})` : message;
}

function nicknameParts(value) {
  const nickname = String(value || "").trim();
  const nicknameKey = nickname.toLowerCase();
  const validCharacters = /^[A-Za-z0-9]+$/.test(nickname);
  return {
    nickname,
    nicknameKey,
    valid: nickname.length >= NICKNAME_MIN && nickname.length <= NICKNAME_MAX && validCharacters && nicknameKey !== "pilot",
    reserved: nicknameKey === "pilot",
  };
}

function profileDisplayName(data) {
  const parts = nicknameParts(data?.nickname);
  return parts.valid && parts.nicknameKey === data?.nicknameKey ? parts.nickname : PILOT_NAME;
}

function fittingTitleParts(value) {
  const title = String(value || "").trim();
  return {
    title,
    validCharacters: /^[\x20-\x7E]+$/.test(title),
    httpsBlocked: title.toLocaleLowerCase().includes("https"),
  };
}

function currentDisplayName() {
  return profileDisplayName(currentProfile);
}

function closeAccountMenu() {
  if (elements.accountMenu) elements.accountMenu.hidden = true;
  elements.login?.setAttribute("aria-expanded", "false");
}

function updateAccountUi() {
  if (!elements.login) return;
  const signedIn = Boolean(currentUser);
  const buttonLabel = signedIn ? copy.profile : copy.login;
  elements.login.textContent = buttonLabel;
  elements.login.title = signedIn ? copy.account : buttonLabel;
  elements.login.setAttribute("aria-label", signedIn ? copy.account : buttonLabel);
  elements.login.setAttribute("aria-haspopup", signedIn ? "menu" : "false");
  elements.login.classList.toggle("signed-in", signedIn);
  elements.login.disabled = signedIn ? false : !googleTokenClient;
  if (elements.setNickname) {
    elements.setNickname.textContent = currentProfile?.nickname ? copy.nicknameChangeTitle : copy.nicknameTitle;
    elements.setNickname.hidden = !signedIn;
  }
  if (elements.logout) elements.logout.textContent = copy.logout;
  if (!signedIn) closeAccountMenu();
}

function updateLoginButton() {
  updateAccountUi();
}

async function getProfileData(uid) {
  const normalizedUid = String(uid || "");
  if (!normalizedUid || !firebaseApi || !db) return null;
  if (profileDataCache.has(normalizedUid)) return profileDataCache.get(normalizedUid);
  if (profileRequests.has(normalizedUid)) return profileRequests.get(normalizedUid);
  const request = firebaseApi.getDoc(firebaseApi.doc(db, "users", normalizedUid))
    .then((snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      profileDataCache.set(normalizedUid, data);
      return data;
    })
    .finally(() => profileRequests.delete(normalizedUid));
  profileRequests.set(normalizedUid, request);
  return request;
}

async function getProfileName(uid) {
  const normalizedUid = String(uid || "");
  if (!normalizedUid) return PILOT_NAME;
  if (profileCache.has(normalizedUid)) {
    const cachedName = profileCache.get(normalizedUid);
    const cacheAge = Date.now() - Number(profileCacheTimes.get(normalizedUid) || 0);
    if (cacheAge < PROFILE_CACHE_TTL_MS) return cachedName;
    profileCache.delete(normalizedUid);
    profileCacheTimes.delete(normalizedUid);
    profileDataCache.delete(normalizedUid);
  }
  try {
    const name = profileDisplayName(await getProfileData(normalizedUid));
    profileCache.set(normalizedUid, name);
    profileCacheTimes.set(normalizedUid, Date.now());
    return name;
  } catch {
    return PILOT_NAME;
  }
}

async function hydrateRecordAuthors(recordList) {
  const remoteRecords = (recordList || []).filter((record) => record?.source !== "local");
  const ownerUids = [...new Set(remoteRecords.map((record) => String(record.ownerUid || "")).filter(Boolean))];
  const names = new Map(await Promise.all(ownerUids.map(async (uid) => [uid, await getProfileName(uid)])));
  remoteRecords.forEach((record) => { record.authorName = names.get(String(record.ownerUid || "")) || PILOT_NAME; });
  return recordList;
}

function updateOwnAuthorViews(name) {
  if (!currentUser) return;
  profileCache.set(currentUser.uid, name);
  profileCacheTimes.set(currentUser.uid, Date.now());
  records.filter((record) => record.ownerUid === currentUser.uid).forEach((record) => { record.authorName = name; });
  bridge.updatePublicFittingAuthor?.(currentUser.uid, name);
  if (!elements.overlay.hidden && activeMode === "browse") renderBrowser();
}

function setNicknameStatus(message = "", tone = "") {
  elements.nicknameStatus.textContent = message;
  elements.nicknameStatus.className = tone;
}

function closeNicknameDialog() {
  if (!elements.nicknameOverlay || elements.nicknameOverlay.hidden) return;
  nicknameCheckGeneration += 1;
  clearTimeout(nicknameCheckTimer);
  elements.nicknameOverlay.hidden = true;
  document.body.classList.remove("nickname-open");
  setNicknameStatus();
  elements.login?.focus();
}

function openNicknameDialog(mode = "account") {
  if (!currentUser || !elements.nicknameOverlay) return;
  nicknamePromptMode = mode === "first" ? "first" : "account";
  const changingNickname = nicknamePromptMode === "account" && Boolean(currentProfile?.nickname);
  closeAccountMenu();
  elements.nicknameTitle.textContent = changingNickname ? copy.nicknameChangeTitle : copy.nicknameTitle;
  elements.nicknameDescription.textContent = copy.nicknameDescription;
  elements.nicknameLaterNotice.textContent = copy.nicknameLaterNotice;
  elements.nicknameLaterNotice.hidden = nicknamePromptMode !== "first";
  elements.nicknameRules.textContent = copy.nicknameRules;
  elements.nicknameLater.textContent = copy.nicknameLater;
  elements.nicknameLater.hidden = nicknamePromptMode !== "first";
  elements.nicknameSubmit.textContent = changingNickname ? copy.nicknameChangeSubmit : copy.nicknameSubmit;
  elements.closeNickname.hidden = nicknamePromptMode === "first";
  elements.nicknameInput.value = changingNickname ? currentProfile.nickname : "";
  elements.nicknameCount.textContent = `${elements.nicknameInput.value.length} / ${NICKNAME_MAX}`;
  elements.nicknameSubmit.disabled = true;
  nicknameAvailableKey = "";
  setNicknameStatus();
  elements.nicknameOverlay.hidden = false;
  document.body.classList.add("nickname-open");
  elements.nicknameInput.focus();
  if (changingNickname) elements.nicknameInput.select();
}

async function checkNicknameAvailability(value) {
  const generation = ++nicknameCheckGeneration;
  const parts = nicknameParts(value);
  nicknameAvailableKey = "";
  elements.nicknameSubmit.disabled = true;
  if (!parts.nickname) return setNicknameStatus();
  if (parts.reserved) return setNicknameStatus(copy.nicknameReserved, "error");
  if (!parts.valid) return setNicknameStatus(copy.nicknameInvalid, "error");
  if (parts.nicknameKey === currentProfile?.nicknameKey) return setNicknameStatus(copy.nicknameUnchanged, "error");
  setNicknameStatus(copy.nicknameChecking);
  try {
    const snapshot = await firebaseApi.getDoc(firebaseApi.doc(db, "nicknames", parts.nicknameKey));
    if (generation !== nicknameCheckGeneration) return;
    if (snapshot.exists()) return setNicknameStatus(copy.nicknameTaken, "error");
    nicknameAvailableKey = parts.nicknameKey;
    elements.nicknameSubmit.disabled = false;
    setNicknameStatus(copy.nicknameAvailable, "success");
  } catch {
    if (generation === nicknameCheckGeneration) setNicknameStatus(copy.nicknameCheckFailed, "error");
  }
}

async function skipNicknamePrompt() {
  if (!currentUser || !firebaseApi || !db) return closeNicknameDialog();
  const user = currentUser;
  try {
    const userRef = firebaseApi.doc(db, "users", user.uid);
    const profile = await firebaseApi.runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (snapshot.exists()) return snapshot.data();
      const data = { nicknamePrompted: true, createdAt: firebaseApi.serverTimestamp(), updatedAt: firebaseApi.serverTimestamp() };
      transaction.set(userRef, data);
      return data;
    });
    if (currentUser?.uid !== user.uid) return;
    currentProfile = { ...profile, nicknamePrompted: true };
    profileDataCache.set(user.uid, currentProfile);
  } catch (error) {
    if (currentUser?.uid !== user.uid) return;
    setAuthStatus(firebaseErrorMessage(error, copy.nicknameSkipFailed));
  }
  updateAccountUi();
  updateOwnAuthorViews(currentDisplayName());
  closeNicknameDialog();
}

async function registerNickname(value) {
  if (!currentUser || !firebaseApi || !db) return;
  const user = currentUser;
  const parts = nicknameParts(value);
  const changingNickname = Boolean(currentProfile?.nicknameKey);
  if (parts.nicknameKey === currentProfile?.nicknameKey) {
    setNicknameStatus(copy.nicknameUnchanged, "error");
    return;
  }
  if (!parts.valid || parts.nicknameKey !== nicknameAvailableKey) {
    setNicknameStatus(parts.reserved ? copy.nicknameReserved : copy.nicknameInvalid, "error");
    return;
  }
  elements.nicknameSubmit.disabled = true;
  try {
    const userRef = firebaseApi.doc(db, "users", user.uid);
    const nicknameRef = firebaseApi.doc(db, "nicknames", parts.nicknameKey);
    await firebaseApi.runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const nicknameSnapshot = await transaction.get(nicknameRef);
      const previousNicknameKey = userSnapshot.exists() ? String(userSnapshot.data().nicknameKey || "") : "";
      const previousNicknameRef = previousNicknameKey && previousNicknameKey !== parts.nicknameKey
        ? firebaseApi.doc(db, "nicknames", previousNicknameKey)
        : null;
      const previousNicknameSnapshot = previousNicknameRef ? await transaction.get(previousNicknameRef) : null;
      if (nicknameSnapshot.exists()) {
        const error = new Error("Nickname already exists");
        error.code = "nickname-taken";
        throw error;
      }
      if (previousNicknameKey === parts.nicknameKey) {
        const error = new Error("Nickname unchanged");
        error.code = "nickname-unchanged";
        throw error;
      }
      if (previousNicknameRef && (!previousNicknameSnapshot?.exists() || previousNicknameSnapshot.data().ownerUid !== user.uid)) {
        const error = new Error("Previous nickname reservation mismatch");
        error.code = "nickname-change-conflict";
        throw error;
      }
      const profile = {
        ...(userSnapshot.exists() ? { createdAt: userSnapshot.data().createdAt } : { createdAt: firebaseApi.serverTimestamp() }),
        nickname: parts.nickname,
        nicknameKey: parts.nicknameKey,
        nicknamePrompted: true,
        updatedAt: firebaseApi.serverTimestamp(),
      };
      transaction.set(nicknameRef, { ownerUid: user.uid, createdAt: firebaseApi.serverTimestamp() });
      if (previousNicknameRef) transaction.delete(previousNicknameRef);
      transaction.set(userRef, profile);
    });
    if (currentUser?.uid !== user.uid) return;
    currentProfile = { nickname: parts.nickname, nicknameKey: parts.nicknameKey, nicknamePrompted: true };
    profileDataCache.set(user.uid, currentProfile);
    updateOwnAuthorViews(parts.nickname);
    updateAccountUi();
    setAuthStatus(changingNickname ? copy.nicknameChanged : copy.nicknameSaved);
    closeNicknameDialog();
  } catch (error) {
    if (currentUser?.uid !== user.uid) return;
    nicknameAvailableKey = "";
    elements.nicknameSubmit.disabled = true;
    setNicknameStatus(error?.code === "nickname-taken" ? copy.nicknameRace : firebaseErrorMessage(error, copy.nicknameCheckFailed), "error");
  }
}

async function initializeCurrentProfile(user) {
  const generation = ++profileLoadGeneration;
  if (!user || !firebaseApi || !db) return;
  try {
    const profile = await getProfileData(user.uid);
    if (generation !== profileLoadGeneration || currentUser?.uid !== user.uid) return;
    currentProfile = profile;
    const displayName = currentDisplayName();
    profileCache.set(user.uid, displayName);
    profileCacheTimes.set(user.uid, Date.now());
    updateOwnAuthorViews(displayName);
    updateAccountUi();
    if (!profile || (!currentProfile?.nickname && currentProfile?.nicknamePrompted !== true)) {
      openNicknameDialog("first");
    }
  } catch {
    if (generation !== profileLoadGeneration || currentUser?.uid !== user.uid) return;
    currentProfile = null;
    updateAccountUi();
    // Nicknames are optional, so a profile read failure must not look like a login failure.
  }
}
async function signIn() {
  await firebaseReady;
  if (!firebaseApi || !auth || !googleTokenClient) {
    setAuthStatus(location.protocol === "file:" ? copy.httpRequired : copy.unavailable);
    return null;
  }
  setAuthStatus();
  return new Promise((resolve) => {
    pendingSignInResolve?.(null);
    pendingSignInResolve = resolve;
    try { googleTokenClient.requestAccessToken({ prompt: "select_account" }); }
    catch (error) {
      pendingSignInResolve = null;
      console.error("Google sign-in popup failed", error);
      setAuthStatus(copy.loginFailed);
      resolve(null);
    }
  });
}
function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve(globalThis.google.accounts);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => resolve(globalThis.google?.accounts), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity Services failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `https://accounts.google.com/gsi/client?hl=${language === "en" ? "en" : "ko"}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "";
    script.addEventListener("load", () => globalThis.google?.accounts?.oauth2 ? resolve(globalThis.google.accounts) : reject(new Error("Google Identity Services is unavailable")), { once: true });
    script.addEventListener("error", () => reject(new Error("Google Identity Services failed to load")), { once: true });
    document.head.append(script);
  });
}
function finishPendingSignIn(user = null) {
  const resolve = pendingSignInResolve;
  pendingSignInResolve = null;
  resolve?.(user);
}
function handleGooglePopupError(error) {
  setAuthStatus(error?.type === "popup_closed" ? copy.popupClosed : error?.type === "popup_failed_to_open" ? copy.popupBlocked : copy.loginFailed);
  finishPendingSignIn();
}
async function handleGoogleAccessToken(response) {
  if (response?.error || !response?.access_token || !firebaseApi || !auth) {
    setAuthStatus(response?.error ? `${copy.loginFailed} (${response.error})` : copy.loginFailed);
    finishPendingSignIn();
    return;
  }
  try {
    const credential = firebaseApi.GoogleAuthProvider.credential(null, response.access_token);
    const result = await firebaseApi.signInWithCredential(auth, credential);
    setAuthStatus();
    finishPendingSignIn(result.user);
  } catch (error) {
    setAuthStatus(firebaseErrorMessage(error, copy.loginFailed));
    finishPendingSignIn();
  }
}
function closeCommunity() {
  if (elements.overlay.hidden) return;
  loadRequestGeneration += 1;
  closeMechFilterMenu();
  elements.overlay.hidden = true;
  document.body.classList.remove("community-open");
  returnFocus?.focus?.();
  returnFocus = null;
}
function recommendationRecord(id) {
  for (const recordList of recommendationCache.values()) {
    const record = recordList.find((entry) => entry.id === id);
    if (record) return record;
  }
  return null;
}
function closeRecommendationDialog() {
  if (!elements.recommendationOverlay || elements.recommendationOverlay.hidden) return;
  elements.recommendationOverlay.hidden = true;
  document.body.classList.remove("recommended-fitting-open");
  recommendationDialogRecord = null;
  recommendationDialogTrigger?.focus?.();
  recommendationDialogTrigger = null;
}
function openRecommendationDialog(id, trigger) {
  const record = recommendationRecord(id);
  if (!record?.valid || !record.analysis || !elements.recommendationOverlay) return;
  recommendationDialogRecord = record;
  recommendationDialogTrigger = trigger || document.activeElement;
  elements.recommendationTitle.textContent = `${copy.recommendationTitle} · ${record.name}`;
  elements.recommendationContent.innerHTML = fittingDetailSectionsHtml(record.analysis);
  elements.recommendationApply.textContent = copy.recommendationApply;
  elements.recommendationOverlay.hidden = false;
  document.body.classList.add("recommended-fitting-open");
  elements.recommendationClose.focus();
}
async function applyRecommendation() {
  if (!recommendationDialogRecord?.valid) return;
  const record = recommendationDialogRecord;
  bridge.openSharedFitting({ ...record, canLike: Boolean(currentUser) });
  closeRecommendationDialog();
  const likeState = syncActiveSourceLikeState();
  await hydrateRecordAuthors([record]);
  bridge.updatePublicFittingAuthor?.(record.ownerUid, record.authorName || "Pilot");
  await likeState;
}
async function openCommunity(mode, trigger) {
  loadRequestGeneration += 1;
  const requestedMode = mode === "save" ? "save" : "browse";
  activeMode = requestedMode;
  returnFocus = trigger || document.activeElement;
  elements.overlay.hidden = false;
  document.body.classList.add("community-open");
  elements.title.textContent = activeMode === "save" ? copy.saveTitle : copy.browserTitle;
  elements.eyebrow.textContent = activeMode === "save" ? copy.saveEyebrow : copy.browserEyebrow;
  elements.mechFilterTrigger.hidden = activeMode !== "browse";
  closeMechFilterMenu();
  if (activeMode === "browse") {
    selectedMechFilterId = trigger?.dataset.communityMechFilter === "all"
      ? ""
      : String(bridge.currentMechId?.() || "");
    selectedChassisFilterKey = "";
    expandSelectedMechFilterChassis();
    renderMechFilterControl();
  }
  const dialog = elements.overlay.querySelector(".community-dialog");
  dialog?.classList.toggle("browser-mode", activeMode === "browse");
  dialog?.classList.toggle("save-mode", activeMode === "save");
  setStatus();
  elements.close.focus();
  if (activeMode === "save") renderSaveForm();
  else await switchBrowserTab(activeBrowserTab, true);
}
function timestampMillis(value) {
  if (Number.isFinite(value)) return Number(value);
  const date = value?.toDate?.();
  return date instanceof Date ? date.getTime() : 0;
}
function fittingDate(value) {
  const millis = timestampMillis(value);
  return millis ? new Intl.DateTimeFormat(language === "en" ? "en" : "ko-KR", { dateStyle: "medium" }).format(new Date(millis)) : "";
}
function analyzeRecord(record) {
  try {
    if (![1, 2, 3].includes(record.schemaVersion) || typeof record.loadoutCode !== "string") throw new Error("Invalid record");
    return { ...record, analysis: bridge.describeFitting(record.loadoutCode), valid: true };
  } catch { return { ...record, analysis: null, valid: false }; }
}
function normalizeSnapshot(snapshot, source) {
  const data = snapshot.data();
  const likeKey = currentUser ? `${currentUser.uid}:${snapshot.id}` : "";
  return analyzeRecord({
    id: snapshot.id, ownerUid: data.ownerUid, mechId: String(data.mechId ?? ""), chassisKey: String(data.chassisKey ?? ""), name: data.name,
    loadoutCode: data.loadoutCode, likeCount: Number.isInteger(data.likeCount) ? data.likeCount : 0,
    createdAt: data.createdAt, schemaVersion: data.schemaVersion, source, liked: likedFittingKeys.has(likeKey),
  });
}

function activeRecommendationContext() {
  return bridge?.recommendationContext?.() || { enabled: false, mechId: "", sharedFittingRequestPending: false };
}

function recommendationRecordData(record) {
  return {
    id: record.id,
    name: record.name,
    likeCount: Math.max(0, Number(record.likeCount) || 0),
    tags: (record.analysis?.tags || []).map((tag) => ({ key: tag, label: copy.tags[tag] || tag })),
  };
}

function publishRecommendations(mechId, recordList) {
  const context = activeRecommendationContext();
  if (!context.enabled || context.sharedFittingRequestPending || String(context.mechId) !== String(mechId)) return;
  bridge.setRecommendedFittings?.(mechId, recordList.filter((record) => record.valid).map(recommendationRecordData));
}

function recommendationCacheDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rollRecommendationCacheDay() {
  const today = recommendationCacheDay();
  if (today === activeRecommendationCacheDay) return today;
  activeRecommendationCacheDay = today;
  recommendationCache.clear();
  recommendationRequests.clear();
  recommendationGenerations.clear();
  return today;
}

function readRecommendationStorage() {
  const empty = { version: RECOMMENDATION_CACHE_VERSION, day: activeRecommendationCacheDay, entries: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(RECOMMENDATION_CACHE_STORAGE_KEY) || "null");
    if (
      parsed?.version !== RECOMMENDATION_CACHE_VERSION
      || parsed.day !== activeRecommendationCacheDay
      || !parsed.entries
      || typeof parsed.entries !== "object"
      || Array.isArray(parsed.entries)
    ) return empty;
    return parsed;
  } catch {
    return empty;
  }
}

function storedRecommendations(mechId) {
  const stored = readRecommendationStorage();
  if (!Object.hasOwn(stored.entries, mechId) || !Array.isArray(stored.entries[mechId])) return null;
  const rawRecords = stored.entries[mechId].slice(0, RECOMMENDATION_LIMIT);
  const records = rawRecords.map((record) => analyzeRecord({
    id: String(record?.id || ""),
    ownerUid: String(record?.ownerUid || ""),
    mechId: String(record?.mechId || ""),
    chassisKey: String(record?.chassisKey || ""),
    name: String(record?.name || ""),
    loadoutCode: record?.loadoutCode,
    likeCount: Math.max(0, Number(record?.likeCount) || 0),
    schemaVersion: Number(record?.schemaVersion),
    source: "recommendation",
    liked: false,
  }));
  if (records.some((record) => (
    !record.valid
    || !record.id
    || !record.name
    || String(record.mechId) !== String(mechId)
    || String(record.analysis?.mechId || "") !== String(mechId)
  ))) {
    removeStoredRecommendations(mechId);
    return null;
  }
  return records;
}

function persistRecommendations(mechId, recordList) {
  const stored = readRecommendationStorage();
  stored.entries[mechId] = recordList.slice(0, RECOMMENDATION_LIMIT).map((record) => ({
    id: record.id,
    ownerUid: record.ownerUid,
    mechId: record.mechId,
    chassisKey: record.chassisKey,
    name: record.name,
    loadoutCode: record.loadoutCode,
    likeCount: record.likeCount,
    schemaVersion: record.schemaVersion,
  }));
  try {
    localStorage.setItem(RECOMMENDATION_CACHE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // The in-memory cache remains available when persistent storage is unavailable or full.
  }
}

function removeStoredRecommendations(mechId) {
  const stored = readRecommendationStorage();
  if (!Object.hasOwn(stored.entries, mechId)) return;
  delete stored.entries[mechId];
  try {
    localStorage.setItem(RECOMMENDATION_CACHE_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // The current session cache is still invalidated below.
  }
}

function invalidateRecommendations(mechId) {
  const normalizedMechId = String(mechId || "");
  if (!normalizedMechId) return;
  rollRecommendationCacheDay();
  recommendationGenerations.set(normalizedMechId, (recommendationGenerations.get(normalizedMechId) || 0) + 1);
  recommendationCache.delete(normalizedMechId);
  recommendationRequests.delete(normalizedMechId);
  removeStoredRecommendations(normalizedMechId);
  const context = activeRecommendationContext();
  if (!context.enabled || context.sharedFittingRequestPending || String(context.mechId) !== normalizedMechId) return;
  bridge.setRecommendedFittings?.(normalizedMechId, []);
  void loadRecommendations(context);
}

async function loadRecommendations(context = activeRecommendationContext()) {
  const mechId = String(context?.mechId || "");
  const cacheDay = rollRecommendationCacheDay();
  const generation = recommendationGenerations.get(mechId) || 0;
  if (!context?.enabled || context.sharedFittingRequestPending || !mechId) return;
  if (recommendationCache.has(mechId)) {
    publishRecommendations(mechId, recommendationCache.get(mechId));
    return;
  }
  const [firebaseAvailable, appReady] = await Promise.all([
    firebaseReady,
    bridge?.ready || Promise.resolve(false),
  ]);
  const current = activeRecommendationContext();
  if (!firebaseAvailable || !appReady || !firebaseApi || !db || !current.enabled || current.sharedFittingRequestPending || String(current.mechId) !== mechId) return;
  if (
    rollRecommendationCacheDay() !== cacheDay
    || (recommendationGenerations.get(mechId) || 0) !== generation
  ) {
    void loadRecommendations(current);
    return;
  }
  const stored = storedRecommendations(mechId);
  if (stored) {
    recommendationCache.set(mechId, stored);
    publishRecommendations(mechId, stored);
    return;
  }
  let requestEntry = recommendationRequests.get(mechId);
  if (!requestEntry || requestEntry.generation !== generation) {
    const request = firebaseApi.getDocs(firebaseApi.query(
      firebaseApi.collection(db, "fittings"),
      firebaseApi.where("mechId", "==", mechId),
      firebaseApi.orderBy("likeCount", "desc"),
      firebaseApi.limit(RECOMMENDATION_LIMIT),
    )).then((snapshot) => {
      const next = snapshot.docs.map((entry) => normalizeSnapshot(entry, "recommendation"));
      if (
        activeRecommendationCacheDay === cacheDay
        && (recommendationGenerations.get(mechId) || 0) === generation
      ) {
        recommendationCache.set(mechId, next);
        persistRecommendations(mechId, next);
      }
      return next;
    }).finally(() => {
      if (recommendationRequests.get(mechId)?.request === request) recommendationRequests.delete(mechId);
    });
    requestEntry = { generation, request };
    recommendationRequests.set(mechId, requestEntry);
  }
  try {
    const next = await requestEntry.request;
    if (
      activeRecommendationCacheDay !== cacheDay
      || (recommendationGenerations.get(mechId) || 0) !== requestEntry.generation
    ) return;
    publishRecommendations(mechId, next);
  } catch {
    if (
      activeRecommendationCacheDay !== cacheDay
      || (recommendationGenerations.get(mechId) || 0) !== requestEntry.generation
    ) return;
    publishRecommendations(mechId, []);
  }
}

function sharedFittingParameter() {
  const params = new URL(window.location.href).searchParams;
  return { present: params.has("fitting"), id: params.get("fitting") || "" };
}

function validSharedFittingId(value) {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 128
    && !value.includes("/");
}

function sharedFittingUrl(fittingId) {
  if (!validSharedFittingId(fittingId)) throw new Error("Invalid shared fitting id");
  const url = new URL(window.location.href);
  const languageParam = url.searchParams.get("lang");
  url.search = "";
  url.hash = "";
  if (languageParam) url.searchParams.set("lang", languageParam);
  url.searchParams.set("fitting", fittingId);
  return url.href;
}

function setShareStatus(message = "", tone = "") {
  elements.shareStatus.textContent = message;
  elements.shareStatus.classList.toggle("error", tone === "error");
  elements.shareStatus.classList.toggle("success", tone === "success");
}

function closeShareDialog() {
  if (!elements.shareOverlay || elements.shareOverlay.hidden) return;
  elements.shareOverlay.hidden = true;
  document.body.classList.remove("community-share-url-open");
  shareDialogTrigger?.focus?.();
  shareDialogTrigger = null;
}

function shareFitting(id, trigger = document.activeElement) {
  const record = records.find((entry) => entry.id === id);
  if (!record || activeBrowserTab === "local" || !validSharedFittingId(record.id)) return;
  shareDialogTrigger = trigger;
  elements.shareTitle.textContent = copy.shareDialogTitle;
  elements.shareLabel.textContent = copy.shareUrlLabel;
  elements.shareCopy.textContent = copy.shareCopy;
  elements.closeShare.setAttribute("aria-label", copy.shareClose);
  elements.shareUrl.value = sharedFittingUrl(record.id);
  setShareStatus();
  elements.shareOverlay.hidden = false;
  document.body.classList.add("community-share-url-open");
  requestAnimationFrame(() => {
    elements.shareUrl.focus();
    elements.shareUrl.select();
  });
}

async function copyShareUrl() {
  const url = elements.shareUrl.value.trim();
  if (!url) return;
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(url);
    setShareStatus(copy.shareCopied, "success");
  } catch {
    elements.shareUrl.focus();
    elements.shareUrl.select();
    const copied = typeof document.execCommand === "function" && document.execCommand("copy");
    setShareStatus(copied ? copy.shareCopied : copy.shareFailed, copied ? "success" : "error");
  }
}

async function loadSharedFitting(fittingId) {
  const generation = ++sharedLoadGeneration;
  if (!validSharedFittingId(fittingId)) {
    bridge.setSharedFittingRequestPending?.(false);
    setAuthStatus(copy.sharedInvalid);
    return false;
  }
  const [firebaseAvailable, appReady] = await Promise.all([
    firebaseReady,
    bridge?.ready || Promise.resolve(false),
  ]);
  if (generation !== sharedLoadGeneration) return false;
  if (!firebaseAvailable || !appReady || !firebaseApi || !db) {
    bridge.setSharedFittingRequestPending?.(false);
    setAuthStatus(copy.sharedLoadFailed);
    return false;
  }
  try {
    const snapshot = await firebaseApi.getDoc(firebaseApi.doc(db, "fittings", fittingId));
    if (generation !== sharedLoadGeneration) return false;
    if (!snapshot.exists()) {
      bridge.setSharedFittingRequestPending?.(false);
      setAuthStatus(copy.sharedMissing);
      return false;
    }
    const record = normalizeSnapshot(snapshot, "shared");
    if (!record.valid) {
      bridge.setSharedFittingRequestPending?.(false);
      setAuthStatus(copy.sharedInvalid);
      return false;
    }
    await hydrateRecordAuthors([record]);
    if (generation !== sharedLoadGeneration) return false;
    bridge.openSharedFitting({ ...record, canLike: Boolean(currentUser), navigationMode: "replace" });
    bridge.setSharedFittingRequestPending?.(false);
    if (currentUser) await syncActiveSourceLikeState();
    if (generation === sharedLoadGeneration) setAuthStatus(copy.sharedLoaded);
    return true;
  } catch (error) {
    if (generation === sharedLoadGeneration) {
      bridge.setSharedFittingRequestPending?.(false);
      setAuthStatus(firebaseErrorMessage(error, copy.sharedLoadFailed));
    }
    return false;
  }
}

function loadSharedFittingFromLocation() {
  const shared = sharedFittingParameter();
  if (!shared.present) {
    sharedLoadGeneration += 1;
    bridge.setSharedFittingRequestPending?.(false);
    syncActiveSourceLikeState();
    return;
  }
  bridge.setSharedFittingRequestPending?.(true);
  loadSharedFitting(shared.id);
}
function tagHtml(tags = []) {
  return tags.map((tag) => `<span class="community-tag tag-${escapeHtml(tag)}">${escapeHtml(copy.tags[tag] || tag)}</span>`).join("");
}
function likeIconHtml() {
  return `<svg class="community-like-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M1 21h4V9H1v12Zm21.8-10.7A2 2 0 0 0 21 9h-6.3l.9-4.6v-.3c0-.4-.2-.8-.4-1.1L14.2 2 7.6 8.6A2 2 0 0 0 7 10v9a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.3-.8.3-1.7 0-2.5Z"/></svg>`;
}
function hardpointsHtml(hardpoints = {}) {
  return [["energy", "E"], ["missile", "M"], ["ballistic", "B"], ["ams", "AMS"]]
    .filter(([type]) => Number(hardpoints[type]) > 0)
    .map(([type, label]) => `<span class="hardpoint-chip ${type}" title="${type}"><span class="hardpoint-icon">${label}</span><span class="hardpoint-count">${Number(hardpoints[type])}</span></span>`).join("");
}
function representativeWeaponsHtml(weapons = []) {
  return weapons.slice(0, 4)
    .map((weapon) => `<span class="community-representative-weapon ${escapeHtml(weapon.type || "")}" title="${escapeHtml(weapon.name)}">${escapeHtml(weapon.name)}</span>`)
    .join("");
}
function mechFilterSections() {
  return bridge.listFittingMechFilters?.() || [];
}
function selectedMechFilterOption() {
  for (const section of mechFilterSections()) {
    for (const chassis of section.chassis || []) {
      const option = (chassis.variants || []).find((variant) => String(variant.id) === selectedMechFilterId);
      if (option) return { ...option, chassisId: chassis.id };
    }
  }
  return null;
}
function selectedChassisFilterOption() {
  if (!selectedChassisFilterKey) return null;
  for (const section of mechFilterSections()) {
    const chassis = (section.chassis || []).find((entry) => String(entry.id) === selectedChassisFilterKey);
    if (chassis) return chassis;
  }
  return null;
}
function expandSelectedMechFilterChassis() {
  const selected = selectedMechFilterOption();
  if (selected?.chassisId) expandedMechFilterChassis.add(String(selected.chassisId));
}
function closeMechFilterMenu() {
  if (!elements.mechFilterMenu || !elements.mechFilterTrigger) return;
  elements.mechFilterMenu.hidden = true;
  elements.mechFilterTrigger.setAttribute("aria-expanded", "false");
}
function renderMechFilterMenu({ preserveScroll = false } = {}) {
  if (!elements.mechFilterMenu) return;
  const previousScrollTop = preserveScroll
    ? elements.mechFilterMenu.querySelector(".community-mech-filter-list")?.scrollTop || 0
    : 0;
  const chassisGroups = mechFilterSections().flatMap((section) => section.chassis || []);
  const chassisHtml = chassisGroups.map((chassis) => {
    const chassisKey = String(chassis.id);
    const expanded = expandedMechFilterChassis.has(String(chassis.id));
    const active = chassisKey === selectedChassisFilterKey;
    return `<div class="chassis-group${expanded ? " expanded" : ""}${active ? " active" : ""}">
      <div class="chassis-row${active ? " active" : ""}">
        <button class="chassis-expand-button" type="button" data-community-mech-filter-expand="${escapeHtml(chassisKey)}" aria-expanded="${expanded}" aria-label="${escapeHtml(`${expanded ? copy.collapseChassis : copy.expandChassis}: ${chassis.label}`)}"><span class="expand-indicator" aria-hidden="true">${expanded ? "-" : "+"}</span></button>
        <button class="chassis-filter-button" type="button" data-community-mech-filter-chassis="${escapeHtml(chassisKey)}"><strong>${escapeHtml(chassis.label)}</strong><span class="chassis-ton">${escapeHtml(chassis.tons)}t</span></button>
      </div>
      ${expanded ? `<div class="variant-list">${(chassis.variants || []).map((variant) => `
        <button class="mech-row variant-row${String(variant.id) === selectedMechFilterId ? " active" : ""}" type="button" data-community-mech-filter-option="${escapeHtml(variant.id)}">
          <span class="row-title"><span class="mech-title-main"><strong>${escapeHtml(variant.name)}</strong></span></span>
          <span class="badge-line mech-slot-tags">${variant.badgesHtml || ""}</span>
        </button>`).join("")}</div>` : ""}
    </div>`;
  }).join("");
  elements.mechFilterMenu.innerHTML = `<div class="community-mech-filter-list mech-list compact-mech-list"><button class="mech-row variant-row community-mech-filter-all${selectedMechFilterId || selectedChassisFilterKey ? "" : " active"}" type="button" data-community-mech-filter-option=""><span class="row-title"><span class="mech-title-main"><strong>${escapeHtml(copy.allMechs)}</strong></span></span></button>${chassisHtml}</div>`;
  if (preserveScroll) elements.mechFilterMenu.querySelector(".community-mech-filter-list").scrollTop = previousScrollTop;
}
function renderMechFilterControl() {
  if (!elements.mechFilterTrigger) return;
  const selected = selectedMechFilterOption();
  const selectedChassis = selectedChassisFilterOption();
  elements.mechFilterTrigger.textContent = `${selected?.name || selectedChassis?.label || copy.allMechs} ▾`;
  elements.mechFilterTrigger.title = copy.selectMech;
  renderMechFilterMenu();
}
async function selectMechFilter(mechId) {
  selectedMechFilterId = String(mechId || "");
  selectedChassisFilterKey = "";
  expandSelectedMechFilterChassis();
  selectedId = null;
  currentPage = 1;
  closeMechFilterMenu();
  renderMechFilterControl();
  if (activeBrowserTab === "local") {
    renderBrowser({ resetListScroll: true, resetDetailScroll: true });
    return;
  }
  await loadRemoteFittings(true);
}
async function selectChassisFilter(chassisKey) {
  selectedMechFilterId = "";
  selectedChassisFilterKey = String(chassisKey || "");
  selectedId = null;
  currentPage = 1;
  closeMechFilterMenu();
  renderMechFilterControl();
  if (activeBrowserTab === "local") {
    renderBrowser({ resetListScroll: true, resetDetailScroll: true });
    return;
  }
  await loadRemoteFittings(true);
}
function filteredRecords() {
  const query = searchText.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (selectedMechFilterId && String(record.mechId) !== selectedMechFilterId) return false;
    const recordChassisKey = String(record.chassisKey || record.analysis?.chassisKey || "");
    if (selectedChassisFilterKey && recordChassisKey !== selectedChassisFilterKey) return false;
    return !query || String(record.name || "").toLocaleLowerCase().includes(query);
  });
}
function fittingCardHtml(record) {
  const analysis = record.analysis;
  const likeCount = Math.max(0, Number(record.likeCount) || 0);
  return `
    <button class="community-fitting-card${record.id === selectedId ? " selected" : ""}${record.valid ? "" : " invalid"}" type="button" data-community-select="${escapeHtml(record.id)}">
      <span class="community-card-thumbnail"><img src="${escapeHtml(analysis?.image || "")}" alt="" loading="lazy">${activeBrowserTab === "local" ? "" : `<span class="community-card-like-count" aria-label="${escapeHtml(`${copy.like}: ${likeCount}`)}">${likeIconHtml()} ${likeCount}</span>`}</span>
      <span class="community-card-main">
        <span class="community-card-title"><em>${escapeHtml(analysis?.mechName || "")}</em><strong>${escapeHtml(record.name || copy.invalid)}</strong></span>
        <span class="community-card-tags">${tagHtml(analysis?.tags)}</span>
        <span class="community-card-weapons"><span class="community-card-weapon-list">${representativeWeaponsHtml(analysis?.representativeWeapons)}</span></span>
        <span class="community-card-meta">${activeBrowserTab === "local" ? "" : `<span class="community-author">${escapeHtml(copy.author)}: ${escapeHtml(record.authorName || PILOT_NAME)}</span>`}<span>${escapeHtml(fittingDate(record.createdAt ?? record.updatedAt))}</span></span>
      </span>
      <span class="community-card-hardpoints mech-slot-tags">${hardpointsHtml(analysis?.hardpoints)}</span>
    </button>`;
}
function statRowsHtml(analysis = {}) {
  const stats = analysis.stats || {};
  const metrics = analysis.metrics || {};
  const armorPercent = Number(stats.maxArmor) > 0 ? Math.max(0, Math.min(100, Number(stats.armor || 0) / Number(stats.maxArmor) * 100)) : 0;
  const armorLevel = Math.max(1, Math.min(5, Math.ceil(armorPercent / 20)));
  const rows = [
    [copy.stat.armor, `${armorPercent.toFixed(0)}%`, `community-armor-level-${armorLevel}`, `${Number(stats.armor || 0).toFixed(0)} / ${Number(stats.maxArmor || 0).toFixed(0)}`],
    [copy.stat.tons, `${Number(stats.tons || 0).toFixed(1)} / ${stats.maxTons ?? 0}`],
    [copy.stat.engine, stats.engine || "-"],
    [copy.stat.maxSpeed, `${Number(stats.maxSpeed || 0).toFixed(1)} kph`],
    [copy.stat.dps, Number(metrics.dps || 0).toFixed(1)],
    [copy.stat.alphaDamage, Number(metrics.alphaDamage || 0).toFixed(1)],
    [copy.stat.heatEfficiency, `${Number(metrics.heatEfficiency || 0).toFixed(1)}%`],
    [copy.stat.heatSinks, Number(stats.heatSinks || 0).toFixed(0)],
  ];
  return rows.map(([label, value, className = "", title = ""]) => `<div${className ? ` class="${className}"` : ""}${title ? ` title="${escapeHtml(title)}"` : ""}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}
function fittingDetailSectionsHtml(analysis = {}) {
  const weapons = analysis.weapons?.length
    ? analysis.weapons.map((weapon) => `<li class="${escapeHtml(weapon.type || "")}"><span>${escapeHtml(weapon.name)}</span><strong>×${weapon.count}</strong></li>`).join("")
    : `<li><span>-</span></li>`;
  return `
    <div class="community-detail-scroll">
      <section><h4>${copy.weapons}</h4><ul class="community-weapon-list">${weapons}</ul></section>
      <section><h4>${copy.details}</h4><div class="community-stat-grid">${statRowsHtml(analysis)}</div></section>
    </div>
  `;
}
function fittingDetailHtml(record) {
  if (!record) return `<div class="community-detail-empty">${copy.select}</div>`;
  const analysis = record.analysis;
  if (!record.valid || !analysis) {
    const canDelete = activeBrowserTab === "local" || activeBrowserTab === "mine";
    return `<article class="community-fitting-detail community-invalid-detail"><div class="community-detail-empty">${copy.invalid}</div>${canDelete ? `<footer><button type="button" data-community-delete="${escapeHtml(record.id)}" class="community-delete-button">${copy.delete}</button></footer>` : ""}</article>`;
  }
  const canLike = activeBrowserTab === "public" && Boolean(currentUser);
  const canDelete = activeBrowserTab === "local" || activeBrowserTab === "mine";
  const canShare = activeBrowserTab !== "local";
  const likeCount = Math.max(0, Number(record.likeCount) || 0);
  const likeAction = record.liked ? copy.unlike : copy.like;
  const detailLike = activeBrowserTab === "public"
    ? `<button type="button" data-community-like="${escapeHtml(record.id)}" class="community-detail-like${record.liked ? " liked" : ""}${canLike ? "" : " login-required"}" ${canLike ? "" : 'aria-disabled="true"'} aria-pressed="${record.liked ? "true" : "false"}" aria-label="${escapeHtml(`${canLike ? likeAction : copy.likeLoginRequired}: ${likeCount}`)}" title="${escapeHtml(canLike ? likeAction : copy.likeLoginRequired)}">${likeIconHtml()}<strong>${likeCount}</strong></button>`
    : activeBrowserTab === "mine"
      ? `<span class="community-detail-like community-detail-like-readonly" aria-label="${escapeHtml(`${copy.like}: ${likeCount}`)}">${likeIconHtml()}<strong>${likeCount}</strong></span>`
      : "";
  return `
    <article class="community-fitting-detail" data-community-detail-id="${escapeHtml(record.id)}">
      <header><div class="community-detail-heading-main"><div class="community-detail-title"><span>${escapeHtml(analysis.mechName)}</span><h3>${escapeHtml(record.name)}</h3></div>
        <div class="community-card-tags">${tagHtml(analysis.tags)}</div>
        <div class="community-detail-meta">${activeBrowserTab === "local" ? "" : `<span class="community-detail-author"><span>${escapeHtml(copy.author)}</span><strong>${escapeHtml(record.authorName || PILOT_NAME)}</strong></span><span class="community-detail-meta-separator" aria-hidden="true">·</span>`}<span><span>${escapeHtml(copy.updated)}</span><time>${escapeHtml(fittingDate(record.createdAt ?? record.updatedAt))}</time></span></div></div>
        ${detailLike ? `<div class="community-detail-like-area">${detailLike}</div>` : ""}
      </header>
      ${fittingDetailSectionsHtml(analysis)}
      <footer>${canDelete ? `<button type="button" data-community-delete="${escapeHtml(record.id)}" class="community-delete-button">${copy.delete}</button>` : ""}
        ${canShare ? `<button type="button" data-community-share="${escapeHtml(record.id)}" class="community-share-button">${copy.share}</button>` : ""}
        <button type="button" data-community-apply="${escapeHtml(record.id)}" class="community-apply-button">${copy.apply}</button></footer>
    </article>`;
}
function paginationHtml(visible) {
  const loadedPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const canDiscoverNext = activeBrowserTab !== "local" && hasMore;
  const pageCount = loadedPages + (canDiscoverNext ? 1 : 0);
  if (pageCount <= 1) return "";
  const groupStart = Math.floor((currentPage - 1) / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE + 1;
  const groupEnd = Math.min(pageCount, groupStart + PAGE_GROUP_SIZE - 1);
  const pages = Array.from({ length: groupEnd - groupStart + 1 }, (_, index) => groupStart + index)
    .map((page) => `<button type="button" data-community-page="${page}" aria-current="${page === currentPage ? "page" : "false"}">${page}</button>`)
    .join("");
  return `<nav class="community-pagination" aria-label="Pagination"><button type="button" data-community-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""} aria-label="${copy.previousPage}">‹</button>${pages}<button type="button" data-community-page="${currentPage + 1}" ${currentPage >= pageCount ? "disabled" : ""} aria-label="${copy.nextPage}">›</button></nav>`;
}
function renderBrowser({ resetListScroll = false, resetDetailScroll = false, focusSort = false } = {}) {
  const previousListScroll = resetListScroll ? 0 : elements.content.querySelector(".community-list-scroll")?.scrollTop || 0;
  const previousDetailScroll = resetDetailScroll ? 0 : elements.content.querySelector(".community-detail-scroll")?.scrollTop || 0;
  const visible = filteredRecords();
  const loadedPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  currentPage = Math.max(1, Math.min(currentPage, loadedPages));
  const pageRecords = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  if (!selectedId || !pageRecords.some((record) => record.id === selectedId)) selectedId = pageRecords[0]?.id || null;
  const selected = records.find((record) => record.id === selectedId) || null;
  const emptyText = searchText ? copy.searchEmpty : activeBrowserTab === "local" ? copy.localEmpty : activeBrowserTab === "mine" ? copy.mineEmpty : copy.publicEmpty;
  const listContent = browserNotice
    ? `<div class="community-empty${browserNotice.tone ? ` ${escapeHtml(browserNotice.tone)}` : ""}"><p>${escapeHtml(browserNotice.message)}</p>${browserNotice.action === "sign-in" ? `<button type="button" data-community-sign-in>${copy.signInAction}</button>` : ""}</div>`
    : pageRecords.length ? pageRecords.map(fittingCardHtml).join("") : `<div class="community-empty">${emptyText}</div>`;
  const sortLabel = sortMode === "likes" ? copy.likesSort : copy.newest;
  elements.content.innerHTML = `
    <div class="community-browser">
      <nav class="community-tabs" role="tablist">
        <button type="button" role="tab" data-community-tab="public" aria-selected="${activeBrowserTab === "public"}">${copy.publicTab}</button>
        <button type="button" role="tab" data-community-tab="local" aria-selected="${activeBrowserTab === "local"}">${copy.localTab}</button>
        <button type="button" role="tab" data-community-tab="mine" aria-selected="${activeBrowserTab === "mine"}">${copy.mineTab}</button>
      </nav>
      <div class="community-browser-body"><div class="community-list-pane">
        <div class="community-toolbar"><input type="search" data-community-search value="${escapeHtml(searchText)}" placeholder="${escapeHtml(copy.search)}">
          <div class="community-menu community-sort-menu"><button class="community-menu-trigger community-sort-trigger" type="button" data-community-menu-trigger data-community-sort-trigger aria-haspopup="menu" aria-expanded="false" ${activeBrowserTab === "local" ? "disabled" : ""}><span>${escapeHtml(sortLabel)}</span><span aria-hidden="true">▾</span></button><div class="community-menu-popover" role="menu" hidden><button type="button" role="menuitemradio" data-community-sort="newest" aria-checked="${sortMode === "newest"}">${copy.newest}</button><button type="button" role="menuitemradio" data-community-sort="likes" aria-checked="${sortMode === "likes"}">${copy.likesSort}</button></div></div></div>
        <div class="community-list-scroll"><div class="community-fitting-cards">${listContent}</div>
          ${browserFooterNotice ? `<div class="community-empty ${escapeHtml(browserFooterNotice.tone || "")}">${escapeHtml(browserFooterNotice.message)}</div>` : ""}</div>
        ${browserNotice ? "" : paginationHtml(visible)}
      </div><div class="community-detail-pane">${fittingDetailHtml(selected)}</div></div>
    </div>`;
  const listScroll = elements.content.querySelector(".community-list-scroll");
  const detailScroll = elements.content.querySelector(".community-detail-scroll");
  if (listScroll) listScroll.scrollTop = previousListScroll;
  if (detailScroll) detailScroll.scrollTop = previousDetailScroll;
  if (focusSort && !elements.overlay.hidden) elements.content.querySelector("[data-community-sort-trigger]")?.focus();
  if (selected && activeBrowserTab === "public" && currentUser) ensureLikeState(selected.id);
}
function renderLoginRequired({ focusSort = false } = {}) {
  records = [];
  hasMore = false;
  browserNotice = { message: copy.loginRequired, action: "sign-in" };
  renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
}
async function loadRemoteFittings(reset = true, { focusSort = false } = {}) {
  const generation = ++loadRequestGeneration;
  const requestedTab = activeBrowserTab;
  const requestedSort = sortMode;
  const requestedMechFilterId = selectedMechFilterId;
  const requestedChassisFilterKey = selectedChassisFilterKey;
  let requestLastDocument = reset ? null : lastDocument;
  let requestHasMore = reset ? true : remoteHasMore;
  if (reset) {
    records = [];
    currentPage = 1;
    hasMore = false;
    browserNotice = { message: copy.loading, tone: "loading" };
    browserFooterNotice = null;
    renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
  }
  await firebaseReady;
  if (generation !== loadRequestGeneration || requestedTab !== activeBrowserTab) return;
  if (requestedTab === "mine" && !currentUser) {
    records = [];
    renderLoginRequired({ focusSort });
    return;
  }
  if (!firebaseApi || !db) {
    records = [];
    hasMore = false;
    browserNotice = { message: requestedTab === "mine" ? copy.mineLoadUnavailable : copy.publicLoadUnavailable, tone: "error" };
    renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
    setStatus(location.protocol === "file:" ? copy.httpRequired : copy.unavailable, "error");
    return;
  }
  try {
    const constraints = [];
    if (requestedTab === "mine") constraints.push(firebaseApi.where("ownerUid", "==", currentUser.uid));
    if (requestedMechFilterId) constraints.push(firebaseApi.where("mechId", "==", requestedMechFilterId));
    else if (requestedChassisFilterKey) constraints.push(firebaseApi.where("chassisKey", "==", requestedChassisFilterKey));
    constraints.push(firebaseApi.orderBy(requestedSort === "likes" ? "likeCount" : "createdAt", "desc"));
    if (requestLastDocument) constraints.push(firebaseApi.startAfter(requestLastDocument));
    constraints.push(firebaseApi.limit(FETCH_LIMIT + 1));
    const snapshot = await firebaseApi.getDocs(firebaseApi.query(firebaseApi.collection(db, "fittings"), ...constraints));
    if (generation !== loadRequestGeneration || requestedTab !== activeBrowserTab || requestedMechFilterId !== selectedMechFilterId || requestedChassisFilterKey !== selectedChassisFilterKey) return;
    const batchDocuments = snapshot.docs.slice(0, FETCH_LIMIT);
    requestLastDocument = batchDocuments.at(-1) || requestLastDocument;
    requestHasMore = snapshot.size > FETCH_LIMIT;
    const nextRecords = batchDocuments.map((documentSnapshot) => normalizeSnapshot(documentSnapshot, requestedTab));
    await hydrateRecordAuthors(nextRecords);
    if (generation !== loadRequestGeneration || requestedTab !== activeBrowserTab || requestedMechFilterId !== selectedMechFilterId || requestedChassisFilterKey !== selectedChassisFilterKey) return;
    const merged = reset ? nextRecords : [...records, ...nextRecords];
    records = Array.from(new Map(merged.map((record) => [record.id, record])).values());
    lastDocument = requestLastDocument;
    remoteHasMore = requestHasMore;
    hasMore = requestHasMore;
    selectedId ||= records[0]?.id || null;
    browserNotice = null;
    browserFooterNotice = null;
    renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
  } catch (error) {
    if (generation !== loadRequestGeneration || requestedTab !== activeBrowserTab) return;
    const message = firebaseErrorMessage(error, copy.loadFailed);
    if (!reset && records.length) {
      browserFooterNotice = { message: requestedTab === "mine" ? copy.mineLoadUnavailable : copy.publicLoadUnavailable, tone: "error" };
      renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
      setStatus(message, "error");
      return;
    }
    records = [];
    hasMore = false;
    selectedId = null;
    browserNotice = { message: requestedTab === "mine" ? copy.mineLoadUnavailable : copy.publicLoadUnavailable, tone: "error" };
    renderBrowser({ resetListScroll: true, resetDetailScroll: true, focusSort });
    setStatus(message, "error");
  }
}
async function switchBrowserTab(tab, reset = true) {
  loadRequestGeneration += 1;
  activeBrowserTab = ["public", "local", "mine"].includes(tab) ? tab : "public";
  selectedId = null;
  currentPage = 1;
  searchText = "";
  browserNotice = null;
  browserFooterNotice = null;
  setStatus();
  if (activeBrowserTab === "local") {
    records = (bridge.listLocalFittings?.() || []).map((record) => analyzeRecord({ ...record, source: "local", likeCount: 0 }));
    hasMore = false;
    renderBrowser({ resetListScroll: true, resetDetailScroll: true });
    return;
  }
  await loadRemoteFittings(reset);
}
function renderSaveForm() {
  let fitting;
  try { fitting = bridge.getCurrentFitting(); }
  catch {
    elements.content.innerHTML = `<div class="community-empty">${copy.noFitting}</div>`;
    return;
  }
  const savePublicByDefault = Boolean(currentUser);
  elements.content.innerHTML = `
    <form class="community-save-form" data-community-save-form data-mech-id="${escapeHtml(fitting.mechId)}">
      <fieldset><legend>${copy.saveLocation}</legend><div class="community-save-locations">
        <label class="community-save-location${savePublicByDefault ? " selected" : " disabled"}"><input type="radio" name="save-location" value="public" ${savePublicByDefault ? "checked" : "disabled"}><i aria-hidden="true"></i><span><strong>${copy.publicLocation}</strong><small>${copy.publicHelp}</small></span></label>
        <label class="community-save-location${savePublicByDefault ? "" : " selected"}"><input type="radio" name="save-location" value="local" ${savePublicByDefault ? "" : "checked"}><i aria-hidden="true"></i><span><strong>${copy.pcLocation}</strong><small>${copy.pcHelp}</small></span></label>
      </div>${currentUser ? "" : `<p class="community-save-login-note">${copy.loginRequired}</p>`}</fieldset>
      <label class="community-save-field"><span>${copy.titleLabel}</span><input type="text" name="title" maxlength="${TITLE_LIMIT}" placeholder="${escapeHtml(copy.titlePlaceholder)}" required><small data-title-count>0 / ${TITLE_LIMIT}</small></label>
      <div class="community-save-actions"><button type="button" data-community-cancel>${copy.cancel}</button><button type="submit" data-community-save disabled>${copy.save}</button></div>
    </form>`;
}
function updateSaveForm(form) {
  form.querySelectorAll(".community-save-location").forEach((label) => label.classList.toggle("selected", label.querySelector("input")?.checked));
  const { title, validCharacters, httpsBlocked } = fittingTitleParts(form.elements.title.value);
  const invalidCharacters = Boolean(title) && !validCharacters;
  const titleStatus = form.querySelector("[data-title-count]");
  titleStatus.textContent = invalidCharacters
    ? copy.titleCharactersOnly
    : httpsBlocked
      ? copy.titleHttpsBlocked
      : `${form.elements.title.value.length} / ${TITLE_LIMIT}`;
  titleStatus.classList.toggle("error", invalidCharacters || httpsBlocked);
  form.querySelector("[data-community-save]").disabled = !title || invalidCharacters || httpsBlocked;
}
async function savePublicFitting(name) {
  const user = currentUser || await signIn();
  if (!user) throw new Error("login-required");
  const fitting = bridge.getCurrentFitting();
  const fittingRef = firebaseApi.doc(firebaseApi.collection(db, "fittings"));
  const usageRef = firebaseApi.doc(db, "publisherUsage", user.uid);
  await firebaseApi.runTransaction(db, async (transaction) => {
    const usageSnapshot = await transaction.get(usageRef);
    const count = usageSnapshot.exists() ? usageSnapshot.data().count : 0;
    if (!Number.isInteger(count) || count < 0) throw new Error("Invalid publisher usage");
    if (count >= MAX_PUBLIC_FITTINGS) {
      const error = new Error("Public fitting upload limit reached");
      error.code = "upload-limit";
      throw error;
    }
    const nextCount = count + 1;
    transaction.set(fittingRef, { ownerUid: user.uid, mechId: fitting.mechId, chassisKey: fitting.chassisKey, name, loadoutCode: fitting.loadoutCode, likeCount: 0, createdAt: firebaseApi.serverTimestamp(), schemaVersion: 3 });
    transaction.set(usageRef, { count: nextCount, lastFittingId: fittingRef.id, operation: "create", updatedAt: firebaseApi.serverTimestamp() });
  });
  invalidateRecommendations(fitting.mechId);
}
async function submitSaveForm(form) {
  const button = form.querySelector("[data-community-save]");
  const location = form.elements["save-location"].value;
  const { title: name, validCharacters, httpsBlocked } = fittingTitleParts(form.elements.title.value);
  if (!name) return;
  if (!validCharacters || httpsBlocked) {
    updateSaveForm(form);
    setStatus(validCharacters ? copy.titleHttpsBlocked : copy.titleCharactersOnly, "error");
    return;
  }
  button.disabled = true;
  button.textContent = copy.saving;
  try {
    if (location === "public") await savePublicFitting(name);
    else bridge.saveLocalFitting({ name });
    bridge.clearPublicFittingMode?.();
    setAuthStatus(location === "public" ? copy.publicSaved : copy.localSaved);
    closeCommunity();
  } catch (error) {
    const message = location === "local" ? copy.localSaveFailed : firebaseErrorMessage(error, copy.saveFailed);
    setStatus(message, "error");
    button.disabled = false;
    button.textContent = copy.save;
  }
}
function updateLikeViews(id, count, liked, mechId = "") {
  records.filter((record) => record.id === id).forEach((record) => Object.assign(record, { likeCount: count, liked }));
  const affectedMechIds = new Set(records.filter((record) => record.id === id).map((record) => record.mechId));
  if (mechId) affectedMechIds.add(String(mechId));
  recommendationCache.forEach((recordList) => {
    recordList.filter((record) => record.id === id).forEach((record) => affectedMechIds.add(record.mechId));
  });
  bridge.updatePublicFittingLike?.(id, count, liked, Boolean(currentUser));
  affectedMechIds.forEach(invalidateRecommendations);
  if (!elements.overlay.hidden && activeMode === "browse") renderBrowser();
}
async function ensureLikeState(id) {
  if (!currentUser || !firebaseApi || !db) return;
  const key = `${currentUser.uid}:${id}`;
  const record = records.find((entry) => entry.id === id);
  if (likedFittingKeys.has(key)) {
    if (record && !record.liked) {
      record.liked = true;
      bridge.updatePublicFittingLike?.(id, record.likeCount, true, true);
      if (!elements.overlay.hidden && activeMode === "browse" && selectedId === id) renderBrowser();
    }
    return;
  }
  if (pendingLikeStateRequests.has(key)) return;
  pendingLikeStateRequests.add(key);
  try {
    const snapshot = await firebaseApi.getDoc(firebaseApi.doc(db, "fittings", id, "likes", currentUser.uid));
    const liked = snapshot.exists();
    if (liked) likedFittingKeys.add(key);
    const currentRecord = records.find((entry) => entry.id === id);
    if (!currentRecord) return;
    const changed = currentRecord.liked !== liked;
    currentRecord.liked = liked;
    bridge.updatePublicFittingLike?.(id, currentRecord.likeCount, liked, true);
    if (changed && !elements.overlay.hidden && activeMode === "browse" && selectedId === id) renderBrowser();
  } catch {
    // The transaction will resolve the current state if the user clicks the button.
  } finally {
    pendingLikeStateRequests.delete(key);
  }
}
async function syncSourceLikeState(source) {
  const user = currentUser;
  if (!user || !source || !firebaseApi || !db) return;
  try {
    const snapshot = await firebaseApi.getDoc(firebaseApi.doc(db, "fittings", source.id, "likes", user.uid));
    if (currentUser?.uid !== user.uid) return;
    const key = `${user.uid}:${source.id}`;
    const liked = snapshot.exists();
    if (liked) likedFittingKeys.add(key);
    else likedFittingKeys.delete(key);
    bridge.updatePublicFittingLike?.(source.id, source.likeCount, liked, true);
  } catch {
    // The source panel remains usable and the transaction will resolve the state on click.
  }
}

async function syncActiveSourceLikeState() {
  return syncSourceLikeState(bridge.getPublicFittingSource?.());
}

async function syncOpenSourceLikeStates() {
  const sources = bridge.listPublicFittingSources?.() || [];
  await Promise.all(sources.map(syncSourceLikeState));
}
async function toggleLike(id) {
  if (!currentUser || !firebaseApi || !db) return;
  try {
    const fittingRef = firebaseApi.doc(db, "fittings", id);
    const likeRef = firebaseApi.doc(db, "fittings", id, "likes", currentUser.uid);
    const result = await firebaseApi.runTransaction(db, async (transaction) => {
      const fittingSnapshot = await transaction.get(fittingRef);
      const likeSnapshot = await transaction.get(likeRef);
      if (!fittingSnapshot.exists()) throw new Error("Missing fitting");
      const fittingData = fittingSnapshot.data();
      const count = fittingData.likeCount;
      if (!Number.isInteger(count) || count < 0) throw new Error("Invalid like count");
      if (likeSnapshot.exists()) {
        const next = Math.max(0, count - 1);
        transaction.delete(likeRef);
        transaction.update(fittingRef, { likeCount: next });
        return { count: next, liked: false, mechId: String(fittingData.mechId || "") };
      }
      transaction.set(likeRef, { createdAt: firebaseApi.serverTimestamp() });
      transaction.update(fittingRef, { likeCount: count + 1 });
      return { count: count + 1, liked: true, mechId: String(fittingData.mechId || "") };
    });
    const key = `${currentUser.uid}:${id}`;
    if (result.liked) likedFittingKeys.add(key);
    else likedFittingKeys.delete(key);
    updateLikeViews(id, result.count, result.liked, result.mechId);
  } catch (error) { setStatus(firebaseErrorMessage(error, copy.likeFailed), "error"); }
}
function requestLike(id) {
  if (!currentUser) {
    setAuthStatus(copy.likeLoginRequired);
    return;
  }
  toggleLike(id);
}
async function deleteRemoteFitting(record) {
  const user = currentUser;
  if (!user || record.ownerUid !== user.uid) throw new Error("Not fitting owner");
  const fittingRef = firebaseApi.doc(db, "fittings", record.id);
  const deletionRequestRef = firebaseApi.doc(db, "deletionRequests", record.id);
  const usageRef = firebaseApi.doc(db, "publisherUsage", user.uid);
  await firebaseApi.runTransaction(db, async (transaction) => {
    const fittingSnapshot = await transaction.get(fittingRef);
    const usageSnapshot = await transaction.get(usageRef);
    if (!fittingSnapshot.exists()) throw new Error("Missing fitting");
    const fitting = fittingSnapshot.data();
    const count = usageSnapshot.exists() ? usageSnapshot.data().count : null;
    if (fitting.ownerUid !== user.uid || !Number.isInteger(count) || count < 1) {
      throw new Error("Invalid publisher usage");
    }
    const nextCount = count - 1;
    transaction.set(deletionRequestRef, {
      ownerUid: user.uid,
      mechId: fitting.mechId,
      createdAt: firebaseApi.serverTimestamp(),
    });
    transaction.delete(fittingRef);
    transaction.set(usageRef, { count: nextCount, lastFittingId: record.id, operation: "delete", updatedAt: firebaseApi.serverTimestamp() });
  });
}
async function deleteFitting(id) {
  const record = records.find((entry) => entry.id === id);
  if (!record || !globalThis.confirm(copy.deleteConfirm)) return;
  try {
    if (activeBrowserTab === "local") {
      if (!bridge.deleteLocalFitting(id)) throw new Error("Local delete failed");
    } else {
      await deleteRemoteFitting(record);
      bridge.clearPublicFittingIfMatches?.(id);
      invalidateRecommendations(record.mechId);
    }
    records = records.filter((entry) => entry.id !== id);
    selectedId = records[0]?.id || null;
    renderBrowser({ resetDetailScroll: true });
  } catch (error) { setStatus(firebaseErrorMessage(error, copy.deleteFailed), "error"); }
}
function applyFitting(id) {
  const record = records.find((entry) => entry.id === id);
  if (!record?.valid) return;
  const payload = { ...record, canLike: Boolean(currentUser) };
  if (activeBrowserTab === "local") bridge.openLocalFitting(payload);
  else {
    bridge.openSharedFitting(payload);
    ensureLikeState(id);
  }
  closeCommunity();
}
function closeAllMenus(except = null) {
  document.querySelectorAll(".community-menu-popover").forEach((menu) => {
    if (menu === except) return;
    menu.hidden = true;
    menu.closest(".community-menu")?.querySelector("[data-community-menu-trigger]")?.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("click", (event) => {
  const recommendation = event.target.closest("[data-recommended-fitting-open]");
  if (recommendation) {
    openRecommendationDialog(recommendation.dataset.recommendedFittingOpen, recommendation);
    return;
  }
  if (!event.target.closest(".topbar-account-actions")) closeAccountMenu();
  const mechFilterTrigger = event.target.closest("#community-mech-filter-trigger");
  if (mechFilterTrigger) {
    const opening = Boolean(elements.mechFilterMenu?.hidden);
    if (opening) renderMechFilterMenu();
    elements.mechFilterMenu.hidden = !opening;
    mechFilterTrigger.setAttribute("aria-expanded", String(opening));
    return;
  }
  const mechFilterOption = event.target.closest("[data-community-mech-filter-option]");
  if (mechFilterOption) {
    selectMechFilter(mechFilterOption.dataset.communityMechFilterOption);
    return;
  }
  const mechFilterExpand = event.target.closest("[data-community-mech-filter-expand]");
  if (mechFilterExpand) {
    const chassisId = String(mechFilterExpand.dataset.communityMechFilterExpand);
    if (expandedMechFilterChassis.has(chassisId)) expandedMechFilterChassis.delete(chassisId);
    else expandedMechFilterChassis.add(chassisId);
    renderMechFilterMenu({ preserveScroll: true });
    elements.mechFilterMenu.hidden = false;
    elements.mechFilterTrigger.setAttribute("aria-expanded", "true");
    return;
  }
  const mechFilterChassis = event.target.closest("[data-community-mech-filter-chassis]");
  if (mechFilterChassis) {
    selectChassisFilter(mechFilterChassis.dataset.communityMechFilterChassis);
    return;
  }
  if (!event.target.closest(".community-dialog-heading")) closeMechFilterMenu();
  const menuTrigger = event.target.closest("[data-community-menu-trigger]");
  if (menuTrigger) {
    const menu = menuTrigger.closest(".community-menu")?.querySelector(".community-menu-popover");
    const opening = Boolean(menu?.hidden);
    closeAllMenus(opening ? menu : null);
    if (menu) menu.hidden = !opening;
    menuTrigger.setAttribute("aria-expanded", String(opening));
    return;
  }
  const opener = event.target.closest("[data-community-open]");
  if (opener) {
    const returnTarget = opener.closest(".community-menu")?.querySelector("[data-community-menu-trigger]") || opener;
    closeAllMenus();
    openCommunity(opener.dataset.communityOpen, returnTarget);
    return;
  }
  if (!event.target.closest(".community-menu")) closeAllMenus();
  const sourceLike = event.target.closest("[data-community-source-like]");
  if (sourceLike) { requestLike(sourceLike.dataset.communitySourceLike); return; }
  if (event.target.closest("[data-community-restore]")) bridge.restorePublicFitting?.();
});
elements.content.addEventListener("click", async (event) => {
  const tab = event.target.closest("[data-community-tab]");
  if (tab) return switchBrowserTab(tab.dataset.communityTab, true);
  const sort = event.target.closest("[data-community-sort]");
  if (sort) {
    sortMode = sort.dataset.communitySort === "likes" ? "likes" : "newest";
    closeAllMenus();
    await loadRemoteFittings(true, { focusSort: true });
    return;
  }
  if (event.target.closest("[data-community-sign-in]")) {
    const user = await signIn();
    if (user && !elements.overlay.hidden && activeMode === "browse" && activeBrowserTab === "mine") switchBrowserTab("mine", true);
    return;
  }
  const select = event.target.closest("[data-community-select]");
  if (select) { selectedId = select.dataset.communitySelect; renderBrowser({ resetDetailScroll: true }); return; }
  const like = event.target.closest("[data-community-like]");
  if (like) return requestLike(like.dataset.communityLike);
  const remove = event.target.closest("[data-community-delete]");
  if (remove) return deleteFitting(remove.dataset.communityDelete);
  const share = event.target.closest("[data-community-share]");
  if (share) return shareFitting(share.dataset.communityShare, share);
  const apply = event.target.closest("[data-community-apply]");
  if (apply) return applyFitting(apply.dataset.communityApply);
  const pageButton = event.target.closest("[data-community-page]");
  if (pageButton) {
    const requestedPage = Number(pageButton.dataset.communityPage);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) return;
    const loadedPages = Math.max(1, Math.ceil(filteredRecords().length / PAGE_SIZE));
    if (requestedPage > loadedPages && activeBrowserTab !== "local" && hasMore) {
      return loadRemoteFittings(false).then(() => {
        currentPage = Math.min(requestedPage, Math.max(1, Math.ceil(filteredRecords().length / PAGE_SIZE)));
        selectedId = null;
        renderBrowser({ resetListScroll: true, resetDetailScroll: true });
      });
    }
    currentPage = Math.min(requestedPage, loadedPages);
    selectedId = null;
    renderBrowser({ resetListScroll: true, resetDetailScroll: true });
    return;
  }
  if (event.target.closest("[data-community-cancel]")) closeCommunity();
});
elements.content.addEventListener("input", (event) => {
  const form = event.target.closest("[data-community-save-form]");
  if (form) return updateSaveForm(form);
  if (event.target.matches("[data-community-search]")) {
    searchText = event.target.value;
    currentPage = 1;
    renderBrowser({ resetListScroll: true, resetDetailScroll: true });
    const search = elements.content.querySelector("[data-community-search]");
    search?.focus();
    search?.setSelectionRange(search.value.length, search.value.length);
  }
});
elements.content.addEventListener("change", (event) => {
  const form = event.target.closest("[data-community-save-form]");
  if (form) return updateSaveForm(form);
});
elements.content.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-community-save-form]");
  if (!form) return;
  event.preventDefault();
  submitSaveForm(form);
});
elements.login.addEventListener("click", async (event) => {
  event.stopPropagation();
  if (!currentUser) return signIn();
  const opening = Boolean(elements.accountMenu.hidden);
  elements.accountMenu.hidden = !opening;
  elements.login.setAttribute("aria-expanded", String(opening));
});
elements.setNickname.addEventListener("click", () => openNicknameDialog("account"));
elements.logout.addEventListener("click", () => firebaseApi?.signOut(auth));
elements.nicknameInput.addEventListener("input", () => {
  clearTimeout(nicknameCheckTimer);
  nicknameCheckGeneration += 1;
  nicknameAvailableKey = "";
  elements.nicknameSubmit.disabled = true;
  elements.nicknameCount.textContent = `${elements.nicknameInput.value.length} / ${NICKNAME_MAX}`;
  const parts = nicknameParts(elements.nicknameInput.value);
  if (!parts.nickname) return setNicknameStatus();
  if (parts.reserved) return setNicknameStatus(copy.nicknameReserved, "error");
  if (!parts.valid) return setNicknameStatus(copy.nicknameInvalid, "error");
  if (parts.nicknameKey === currentProfile?.nicknameKey) return setNicknameStatus(copy.nicknameUnchanged, "error");
  setNicknameStatus(copy.nicknameChecking);
  nicknameCheckTimer = setTimeout(() => checkNicknameAvailability(elements.nicknameInput.value), 350);
});
elements.nicknameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  registerNickname(elements.nicknameInput.value);
});
elements.nicknameLater.addEventListener("click", () => nicknamePromptMode === "first" ? skipNicknamePrompt() : closeNicknameDialog());
elements.closeNickname.addEventListener("click", closeNicknameDialog);
elements.closeShare.addEventListener("click", closeShareDialog);
elements.shareCopy.addEventListener("click", copyShareUrl);
elements.shareOverlay.addEventListener("mousedown", (event) => { if (event.target === elements.shareOverlay) closeShareDialog(); });
elements.nicknameOverlay.addEventListener("mousedown", (event) => {
  if (event.target === elements.nicknameOverlay && nicknamePromptMode !== "first") closeNicknameDialog();
});
elements.close.addEventListener("click", closeCommunity);
elements.overlay.addEventListener("mousedown", (event) => { if (event.target === elements.overlay) closeCommunity(); });
elements.recommendationClose.addEventListener("click", closeRecommendationDialog);
elements.recommendationApply.addEventListener("click", applyRecommendation);
elements.recommendationOverlay.addEventListener("mousedown", (event) => {
  if (event.target === elements.recommendationOverlay) closeRecommendationDialog();
});
document.addEventListener("keydown", (event) => {
  if (!elements.recommendationOverlay.hidden && event.key === "Tab") {
    const focusable = [elements.recommendationClose, elements.recommendationApply]
      .filter((element) => element && !element.disabled);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.key !== "Escape") return;
  if (!elements.recommendationOverlay.hidden) {
    closeRecommendationDialog();
    return;
  }
  if (!elements.shareOverlay.hidden) {
    closeShareDialog();
    return;
  }
  if (!elements.nicknameOverlay.hidden) {
    if (nicknamePromptMode !== "first") closeNicknameDialog();
    return;
  }
  if (!elements.accountMenu.hidden) {
    closeAccountMenu();
    elements.login.focus();
    return;
  }
  if (elements.mechFilterMenu && !elements.mechFilterMenu.hidden) {
    closeMechFilterMenu();
    elements.mechFilterTrigger.focus();
    return;
  }
  const openSortMenu = elements.content.querySelector(".community-sort-menu .community-menu-popover:not([hidden])");
  if (openSortMenu) {
    const trigger = openSortMenu.closest(".community-sort-menu")?.querySelector("[data-community-sort-trigger]");
    closeAllMenus();
    trigger?.focus();
    return;
  }
  closeAllMenus();
  closeCommunity();
});

function refreshCommunityLanguage(nextLanguage) {
  const normalizedLanguage = nextLanguage === "en" ? "en" : "kr";
  if (normalizedLanguage === language) return;
  language = normalizedLanguage;
  copy = COPY[language];
  updateAccountUi();
  elements.close.setAttribute("aria-label", language === "en" ? "Close" : "닫기");
  elements.recommendationClose.setAttribute("aria-label", language === "en" ? "Close" : "닫기");
  elements.shareTitle.textContent = copy.shareDialogTitle;
  elements.shareLabel.textContent = copy.shareUrlLabel;
  elements.shareCopy.textContent = copy.shareCopy;
  elements.closeShare.textContent = copy.shareClose;

  if (!elements.nicknameOverlay.hidden) {
    const changingNickname = nicknamePromptMode === "account" && Boolean(currentProfile?.nickname);
    elements.nicknameTitle.textContent = changingNickname ? copy.nicknameChangeTitle : copy.nicknameTitle;
    elements.nicknameDescription.textContent = copy.nicknameDescription;
    elements.nicknameLaterNotice.textContent = copy.nicknameLaterNotice;
    elements.nicknameRules.textContent = copy.nicknameRules;
    elements.nicknameLater.textContent = copy.nicknameLater;
    elements.nicknameSubmit.textContent = changingNickname ? copy.nicknameChangeSubmit : copy.nicknameSubmit;
  }
  if (!elements.recommendationOverlay.hidden && recommendationDialogRecord) {
    elements.recommendationTitle.textContent = `${copy.recommendationTitle} · ${recommendationDialogRecord.name}`;
    elements.recommendationContent.innerHTML = fittingDetailSectionsHtml(recommendationDialogRecord.analysis);
    elements.recommendationApply.textContent = copy.recommendationApply;
  }
  if (elements.overlay.hidden) return;

  elements.title.textContent = activeMode === "save" ? copy.saveTitle : copy.browserTitle;
  elements.eyebrow.textContent = activeMode === "save" ? copy.saveEyebrow : copy.browserEyebrow;
  if (activeMode === "browse") {
    renderMechFilterControl();
    renderBrowser();
    return;
  }

  const previousForm = elements.content.querySelector("[data-community-save-form]");
  const title = previousForm?.elements.title.value || "";
  const locationValue = previousForm?.elements["save-location"].value || "";
  renderSaveForm();
  const nextForm = elements.content.querySelector("[data-community-save-form]");
  if (!nextForm) return;
  nextForm.elements.title.value = title;
  const locationInput = nextForm.querySelector(`[name="save-location"][value="${locationValue}"]:not(:disabled)`);
  if (locationInput) locationInput.checked = true;
  updateSaveForm(nextForm);
}

async function initializeFirebase() {
  updateLoginButton();
  if (!bridge || location.protocol === "file:") return false;
  try {
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
    ]);
    firebaseApi = { ...appModule, ...authModule, ...firestoreModule };
    const app = appModule.initializeApp(firebaseConfig);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    const googleAccounts = await loadGoogleIdentity();
    googleTokenClient = googleAccounts.oauth2.initTokenClient({ client_id: GOOGLE_IDENTITY_CLIENT_ID, scope: "openid email profile", callback: handleGoogleAccessToken, error_callback: handleGooglePopupError });
    authModule.onAuthStateChanged(auth, (user) => {
      currentUser = user;
      currentProfile = null;
      profileLoadGeneration += 1;
      updateLoginButton();
      bridge.setPublicLikeCapability?.(Boolean(user));
      if (user) {
        initializeCurrentProfile(user);
        syncOpenSourceLikeStates();
        if (!elements.overlay.hidden && activeMode === "browse" && activeBrowserTab !== "mine") renderBrowser();
      } else {
        profileCache.clear();
        profileCacheTimes.clear();
        profileDataCache.clear();
        profileRequests.clear();
        closeAccountMenu();
        closeNicknameDialog();
        likedFittingKeys.clear();
        pendingLikeStateRequests.clear();
        records.forEach((record) => { record.liked = false; });
        const source = bridge.getPublicFittingSource?.();
        if (source) bridge.updatePublicFittingLike?.(source.id, source.likeCount, false, false);
        if (!elements.overlay.hidden && activeMode === "browse" && activeBrowserTab !== "mine") renderBrowser();
      }
      if (user) setAuthStatus();
      if (!elements.overlay.hidden && activeMode === "browse" && activeBrowserTab === "mine") switchBrowserTab("mine", true);
    });
    await auth.authStateReady();
    currentUser = auth.currentUser;
    updateLoginButton();
    return true;
  } catch (error) {
    console.error("Firebase initialization failed", error);
    setAuthStatus(firebaseErrorMessage(error, copy.unavailable));
    updateLoginButton();
    return false;
  }
}

elements.close.setAttribute("aria-label", language === "en" ? "Close" : "닫기");
elements.recommendationClose.setAttribute("aria-label", language === "en" ? "Close" : "닫기");
firebaseReady = initializeFirebase();
window.addEventListener("mwolab:recommendation-context", (event) => loadRecommendations(event.detail));
window.addEventListener("mwolab:language-change", (event) => refreshCommunityLanguage(event.detail?.language));
window.addEventListener("mwolab:shared-fitting-navigation-cleared", () => {
  sharedLoadGeneration += 1;
  bridge.setSharedFittingRequestPending?.(false);
});
firebaseReady.then(() => loadRecommendations());
loadSharedFittingFromLocation();
window.addEventListener("popstate", loadSharedFittingFromLocation);
