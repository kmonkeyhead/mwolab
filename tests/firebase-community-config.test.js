const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("로그인과 통합 핏팅 브라우저를 운영 페이지에 표시한다", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  assert.doesNotMatch(html, /<html[^>]+data-community-ui="hidden"/);
  assert.ok(html.indexOf('id="community-login"') < html.indexOf('id="donate-link"'));
  assert.match(html, /<button id="community-login"/);
  assert.match(html, /id="community-auth-status"[^>]+role="status"/);
  assert.match(app, /data-community-open="browse"/);
  assert.match(app, /data-community-open="save"/);
  assert.match(html, /id="mech-toolbar-community"[^>]+data-community-open="browse"[^>]+data-community-mech-filter="all"/);
  assert.doesNotMatch(app, /id="local-save-build"|id="local-load-build"/);
  assert.match(client, /let language = bridge\?\.language === "en" \? "en" : "kr"/);
  assert.match(client, /addEventListener\("mwolab:language-change"/);
});

test("Firebase 공개 설정에는 서버 비밀키를 포함하지 않는다", () => {
  const client = read("public/firebase-community.js");
  const config = read("public/firebase-public-config.js");
  assert.match(client, /import \{ FIREBASE_VERSION, firebaseConfig \} from "\.\/firebase-public-config\.js"/);
  assert.match(config, /projectId:\s*"mwolab-2e145"/);
  assert.match(config, /export const firebaseConfig = Object\.freeze/);
  assert.match(client, /GOOGLE_IDENTITY_CLIENT_ID\s*=\s*"743748401179-[^"]+\.apps\.googleusercontent\.com"/);
  assert.doesNotMatch(`${client}\n${config}`, /clientSecret|privateKey|serviceAccount/i);
  assert.match(client, /logout: "로그아웃"/);
  assert.match(client, /logout: "Sign out"/);
  assert.doesNotMatch(client, /currentUser\.displayName/);
});

test("기존 UI 버튼이 Google OAuth 토큰을 Firebase credential로 교환한다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /https:\/\/accounts\.google\.com\/gsi\/client/);
  assert.match(client, /oauth2\.initTokenClient/);
  assert.match(client, /requestAccessToken\(\{ prompt: "select_account" \}\)/);
  assert.match(client, /GoogleAuthProvider\.credential\(null, response\.access_token\)/);
  assert.match(client, /signInWithCredential\(auth, credential\)/);
  assert.doesNotMatch(client, /renderButton/);
  assert.doesNotMatch(client, /signInWithPopup/);
});

test("Firestore 규칙 거부는 사용자에게 배포 확인 안내와 오류 코드를 보여 준다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /"firestore\/permission-denied": copy\.firestorePermissionDenied/);
  assert.match(client, /Firebase Console의 Firestore Database > Rules에 최신 규칙이 게시되었는지 확인하세요/);
  assert.match(client, /return error\?\.code \? `\$\{message\} \(\$\{error\.code\}\)` : message/);
});

test("홈페이지는 공개 개인정보처리방침을 연결하고 실제 Firebase 데이터 범위를 고지한다", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  const privacy = read("public/privacy.html");
  assert.match(html, /href="privacy\.html"[^>]+data-i18n="privacy\.link"/);
  assert.ok(html.indexOf('class="language-switch"') < html.indexOf('class="privacy-link"'));
  assert.doesNotMatch(html, /help\.cloudflare/);
  assert.doesNotMatch(app, /help\.cloudflare/);
  assert.match(privacy, /Firebase Authentication/);
  assert.match(privacy, /Cloud Firestore/);
  assert.match(privacy, /Firebase 사용자 식별자\(UID\)|Firebase user identifier \(UID\)/);
  assert.match(privacy, /killkimno@gmail\.com/);
  assert.match(privacy, /Cloudflare Web Analytics/);
  assert.match(privacy, /Google 표시 이름을 닉네임이나 공개 핏팅 작성자명으로 사용하지 않습니다/);
  assert.match(privacy, /users\/\{uid\}[\s\S]*nicknames\/\{key\}[\s\S]*Pilot/);
  assert.match(privacy, /ownership checks[\s\S]*nickname lookup/);
});

test("선택형 고유 닉네임은 UID 소유권과 분리해 예약하고 공개 핏팅 작성자로 표시한다", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const rules = read("admin/firestore.rules");
  const privacy = read("public/privacy.html");
  const styles = read("public/styles.css");

  assert.match(html, /id="community-account-menu"[\s\S]*id="community-set-nickname"[\s\S]*id="community-logout"/);
  assert.doesNotMatch(html, /id="community-account-name"/);
  assert.match(html, /id="nickname-overlay"[\s\S]*id="nickname-form"[\s\S]*id="nickname-later-notice"[\s\S]*id="nickname-input"[\s\S]*maxlength="20"/);
  assert.match(client, /const NICKNAME_MIN = 2;[\s\S]*const NICKNAME_MAX = 20;[\s\S]*const PILOT_NAME = "Pilot";[\s\S]*const PROFILE_CACHE_TTL_MS = 60_000/);
  assert.match(client, /function nicknameParts\(value\)[\s\S]*\.trim\(\)[\s\S]*\.toLowerCase\(\)[\s\S]*\^\[A-Za-z0-9\]\+\$/);
  assert.doesNotMatch(client, /A-Za-z0-9가-힣|nicknameCancel/);
  assert.match(client, /nicknameKey !== "pilot"/);
  assert.doesNotMatch(client, /currentUser\.displayName|user\.displayName/);
  assert.match(client, /onAuthStateChanged\(auth, \(user\) => \{[\s\S]*initializeCurrentProfile\(user\)/);
  assert.match(client, /nicknamePrompted: true[\s\S]*createdAt: firebaseApi\.serverTimestamp\(\)[\s\S]*updatedAt: firebaseApi\.serverTimestamp\(\)/);
  assert.match(client, /runTransaction\(db, async \(transaction\) => \{[\s\S]*transaction\.get\(userRef\)[\s\S]*transaction\.get\(nicknameRef\)[\s\S]*transaction\.set\(nicknameRef[\s\S]*transaction\.set\(userRef/);
  assert.match(client, /const profileCache = new Map\(\);[\s\S]*const profileDataCache = new Map\(\);[\s\S]*const profileRequests = new Map\(\)/);
  assert.match(client, /function getProfileData\(uid\)[\s\S]*profileDataCache\.has[\s\S]*profileRequests\.has/);
  assert.match(client, /cacheAge < PROFILE_CACHE_TTL_MS[\s\S]*profileDataCache\.delete\(normalizedUid\)/);
  assert.match(client, /skipNicknamePrompt[\s\S]*if \(currentUser\?\.uid !== user\.uid\) return;[\s\S]*closeNicknameDialog\(\)/);
  assert.match(client, /const buttonLabel = signedIn \? copy\.profile : copy\.login;[\s\S]*elements\.login\.textContent = buttonLabel/);
  assert.match(client, /elements\.login\.setAttribute\("aria-label", signedIn \? copy\.account : buttonLabel\)/);
  assert.doesNotMatch(client, /elements\.accountName|accountName: document\.getElementById/);
  assert.match(client, /setNickname\.textContent = currentProfile\?\.nickname \? copy\.nicknameChangeTitle : copy\.nicknameTitle;[\s\S]*setNickname\.hidden = !signedIn/);
  assert.match(client, /nicknameLaterNotice\.hidden = nicknamePromptMode !== "first"[\s\S]*nicknameLater\.hidden = nicknamePromptMode !== "first"/);
  assert.match(client, /const changingNickname = nicknamePromptMode === "account"[\s\S]*nicknameInput\.value = changingNickname \? currentProfile\.nickname : ""/);
  assert.match(client, /if \(!profile \|\| \(!currentProfile\?\.nickname && currentProfile\?\.nicknamePrompted !== true\)\) \{\s*openNicknameDialog\("first"\)/);
  const initializeProfile = client.match(/async function initializeCurrentProfile\(user\) \{[\s\S]*?(?=\nasync function signIn)/)?.[0] || "";
  assert.doesNotMatch(initializeProfile, /setAuthStatus|copy\.nicknameCheckFailed/);
  assert.match(client, /async function registerNickname[\s\S]*catch \(error\) \{\s*if \(currentUser\?\.uid !== user\.uid\) return;[\s\S]*nicknameAvailableKey = ""/);
  assert.match(client, /previousNicknameRef[\s\S]*transaction\.get\(previousNicknameRef\)[\s\S]*transaction\.set\(nicknameRef[\s\S]*transaction\.delete\(previousNicknameRef\)[\s\S]*transaction\.set\(userRef/);
  assert.match(client, /new Set\(remoteRecords\.map\(\(record\) => String\(record\.ownerUid/);
  assert.match(client, /await hydrateRecordAuthors\(nextRecords\)/);
  assert.match(client, /normalizeSnapshot\(snapshot, "shared"\)[\s\S]*await hydrateRecordAuthors\(\[record\]\)[\s\S]*bridge\.openSharedFitting/);
  assert.match(client, /community-author[^\n]+record\.authorName \|\| PILOT_NAME/);
  assert.match(app, /ownerUid: record\.ownerUid[\s\S]*authorName: record\.authorName \|\| "Pilot"/);
  assert.match(app, /public-fitting-source-author[\s\S]*source\.authorName \|\| "Pilot"/);
  assert.doesNotMatch(client, /transaction\.set\(fittingRef, \{[^}]*nickname/s);
  assert.match(rules, /function validNickname\(nickname, nicknameKey\)[\s\S]*nickname\.matches\('\^\[A-Za-z0-9\]\{2,20\}\$'\)[\s\S]*nicknameKey == nickname\.lower\(\)[\s\S]*nicknameKey != 'pilot'/);
  assert.match(rules, /match \/users\/\{uid\}[\s\S]*allow get: if true;[\s\S]*allow list: if false;/);
  assert.match(rules, /match \/nicknames\/\{nicknameKey\}[\s\S]*validNicknameReservationCreate\(nicknameKey\)[\s\S]*allow update: if false;[\s\S]*validNicknameReservationDelete\(nicknameKey\)/);
  assert.match(rules, /validNicknameProfileCreate\(\)[\s\S]*getAfter\(nicknamePath\(request\.resource\.data\.nicknameKey\)\)/);
  assert.match(rules, /validNicknameProfileUpdate\(\)[\s\S]*request\.resource\.data\.nicknameKey != resource\.data\.nicknameKey[\s\S]*!existsAfter\(nicknamePath\(resource\.data\.nicknameKey\)\)/);
  assert.match(rules, /function validNicknameReservationCreate\(nicknameKey\)[\s\S]*let profileBefore = get\(profilePath\)[\s\S]*let profileAfter = getAfter\(profilePath\)[\s\S]*!existsAfter\(oldNicknamePath\)/);
  assert.match(rules, /function validNicknameReservationDelete\(nicknameKey\)[\s\S]*profileBefore\.data\.nicknameKey == nicknameKey[\s\S]*nextNicknameKey != nicknameKey[\s\S]*getAfter\(nextNicknamePath\)\.data\.ownerUid/);
  assert.match(privacy, /닉네임은 핏팅 문서에 복제하지 않으며/);
  assert.match(styles, /\.community-account-menu[\s\S]*\.nickname-overlay[\s\S]*\.nickname-dialog/);
});

test("통합 브라우저는 공개·로컬·내 업로드 탭과 chassisKey가 있는 v3 저장 스키마를 사용한다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /data-community-tab="public"/);
  assert.match(client, /data-community-tab="local"/);
  assert.match(client, /data-community-tab="mine"/);
  assert.match(client, /collection\(db, "fittings"\)/);
  assert.match(client, /ownerUid: user\.uid/);
  assert.match(client, /mechId: fitting\.mechId, chassisKey: fitting\.chassisKey, name, loadoutCode: fitting\.loadoutCode/);
  assert.match(client, /schemaVersion: 3/);
  assert.doesNotMatch(client, /name, description, loadoutCode/);
  assert.doesNotMatch(client, /name="description"/);
  assert.doesNotMatch(client, /userMechUsage/);
  assert.doesNotMatch(client, /publicFittings|fittingOwners/);
});

test("공유 문서 URL과 브라우저 적용은 공유 출처 경로를 제공한다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const html = read("public/index.html");
  const rules = read("admin/firestore.rules");
  const styles = read("public/styles.css");

  assert.match(client, /share: "URL로 공유하기"/);
  assert.match(client, /share: "Share URL"/);
  assert.match(client, /const canShare = activeBrowserTab !== "local"/);
  assert.match(client, /data-community-share="\$\{escapeHtml\(record\.id\)\}"/);
  assert.doesNotMatch(client, /navigator\.share/);
  assert.match(html, /id="community-share-url-overlay"[\s\S]*id="community-share-url-text"[\s\S]*readonly[\s\S]*id="copy-community-share-url"/);
  assert.match(client, /function shareFitting\(id, trigger[\s\S]*elements\.shareUrl\.value = sharedFittingUrl\(record\.id\)[\s\S]*elements\.shareUrl\.focus\(\)[\s\S]*elements\.shareUrl\.select\(\)/);
  assert.match(client, /async function copyShareUrl\(\)[\s\S]*navigator\.clipboard\.writeText\(url\)[\s\S]*document\.execCommand\("copy"\)/);
  assert.match(client, /value\.length >= 1[\s\S]*value\.length <= 128[\s\S]*!value\.includes\("\/"\)/);
  assert.match(client, /function sharedFittingUrl\(fittingId\)[\s\S]*const languageParam[\s\S]*url\.search = ""[\s\S]*url\.searchParams\.set\("fitting", fittingId\)/);
  assert.match(client, /function loadSharedFitting\(fittingId\)[\s\S]*Promise\.all\([\s\S]*firebaseReady[\s\S]*bridge\?\.ready/);
  assert.match(client, /getDoc\(firebaseApi\.doc\(db, "fittings", fittingId\)\)/);
  assert.match(client, /normalizeSnapshot\(snapshot, "shared"\)[\s\S]*bridge\.openSharedFitting/);
  assert.match(client, /if \(currentUser\) await syncActiveSourceLikeState\(\)/);
  assert.match(client, /async function syncOpenSourceLikeStates\(\)[\s\S]*bridge\.listPublicFittingSources\?\.\(\)[\s\S]*Promise\.all\(sources\.map\(syncSourceLikeState\)\)/);
  assert.match(client, /if \(user\) \{[\s\S]*initializeCurrentProfile\(user\);[\s\S]*syncOpenSourceLikeStates\(\)/);
  assert.match(client, /if \(!shared\.present\) \{[\s\S]*syncActiveSourceLikeState\(\)/);
  assert.doesNotMatch(
    client.match(/async function loadSharedFitting\(fittingId\) \{[\s\S]*?\n\}/)?.[0] || "",
    /getDocs|loadRemoteFittings|switchBrowserTab/,
  );
  assert.match(app, /const SHARED_PUBLIC_FITTING_QUERY_PARAM = "fitting"/);
  assert.match(app, /if \(params\.has\(SHARED_PUBLIC_FITTING_QUERY_PARAM\)\) return/);
  assert.match(app, /ready: communityBridgeReady/);
  assert.match(app, /updatePublicFittingNavigation\(record\.id, record\.navigationMode === "replace" \? "replace" : "push"\)/);
  assert.match(app, /if \(isShared && record\.navigationMode !== "replace"\) preserveCurrentFittingHistoryEntry\(\)/);
  assert.match(app, /openPublicFitting\(record\) \{\s*applyCommunityFitting\(record, false\)/);
  assert.match(app, /openSharedFitting\(record\) \{\s*applyCommunityFitting\(record, true\)/);
  assert.match(app, /mechlabSnapshot: snapshot/);
  assert.match(app, /restoreMechlabHistorySnapshot\(window\.history\.state\?\.mechlabSnapshot\)/);
  assert.match(app, /rememberActiveMechlabTabBuild\(\);[\s\S]*applyMechlabHistorySnapshotToTab\(tab, snapshot, communityLikeCapability\);[\s\S]*applyActiveMechlabTabSelection\(\)/);
  assert.match(app, /importMwoCode\(source\.loadoutCode, \{ closeDialog: false, updateNavigation: false \}\)/);
  assert.doesNotMatch(app, /public-fitting-source-like-count/);
  assert.match(app, /data-community-source-like="\$\{escapeHtml\(source\.id\)\}"[\s\S]*class="\$\{source\.liked \? "liked" : ""\}\$\{source\.canLike \? "" : " login-required"\}"/);
  assert.match(rules, /match \/fittings\/\{fittingId\} \{[\s\S]*allow get: if true;[\s\S]*allow list: if request\.query\.limit/);
  assert.match(styles, /\.community-share-button/);
  assert.match(styles, /\.community-share-url-overlay \{ z-index: 1750; \}/);
});

test("브라우저 공개·내 게시물 적용은 출처를 생성해 작성자·좋아요와 추천을 렌더하고 로컬 적용은 출처를 제거한다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const applySource = client.match(/function applyFitting\(id\) \{[\s\S]*?\n\}/)[0];
  const communityApply = app.match(/function applyCommunityFitting\(record, isShared = false\) \{[\s\S]*?\n\}/)[0];
  const bridgeMethods = app.slice(app.indexOf("  openLocalFitting(record) {"), app.indexOf("  setSharedFittingRequestPending(pending) {"));
  const renderSource = app.slice(app.indexOf("function communityLikeIconHtml()"), app.indexOf("function renderComponents("));
  const factory = new Function("activeBrowserTab", "currentUser", `
    const record = { id: "document", valid: true, name: "Shared", authorName: "Author", ownerUid: "owner", loadoutCode: "original", liked: true };
    const records = [record];
    const tab = {};
    const state = { showRecommendedFittings: true, activeMainTab: "mechlab", selectedMech: { id: 100 }, currentBuild: {}, recommendedFittingsMechId: "100", recommendedFittings: [{ id: "recommended", name: "Recommended", likeCount: 5 }] };
    let html = "";
    const navigation = [];
    const likes = [];
    let closed = false;
    const activeMechlabTab = () => tab;
    const importMwoCode = () => { delete tab.communitySource; renderAll(); };
    const currentBuildAsMwoLoadout = () => "baseline";
    const MWOCodec = { encode: (value) => value };
    const preserveCurrentFittingHistoryEntry = () => {};
    const updatePublicFittingNavigation = (id, mode) => navigation.push({ id, mode });
    const t = (key) => key;
    const escapeHtml = (value) => String(value);
    const renderAll = () => { html = renderCommunityAreaPanel(); };
    const closeCommunity = () => { closed = true; };
    const ensureLikeState = (id) => likes.push(id);
    ${renderSource}
    ${communityApply}
    const bridge = { ${bridgeMethods} };
    ${applySource}
    return { applyFitting, tab, navigation, likes, rendered: () => html, closed: () => closed };
  `);
  for (const browserTab of ["public", "mine"]) {
    for (const user of [null, { uid: "viewer" }]) {
      const api = factory(browserTab, user);
      api.applyFitting("document");
      assert.equal(api.tab.communitySource?.id, "document", `${browserTab} 적용에서 공유 출처를 만들어야 한다`);
      assert.equal(api.tab.communitySource.canLike, Boolean(user));
      assert.deepEqual(api.navigation, [{ id: "document", mode: "push" }]);
      assert.deepEqual(api.likes, ["document"]);
      assert.match(api.rendered(), /public-fitting-source-author[^>]*>community.author: Author/);
      assert.match(api.rendered(), /data-community-source-like="document"/);
      assert.match(api.rendered(), /data-recommended-fitting-open="recommended"/);
      assert.ok(api.rendered().indexOf("public-fitting-source-author") < api.rendered().indexOf("recommended-fittings-panel"));
      assert.equal(api.closed(), true);
    }
  }
  const local = factory("local", { uid: "viewer" });
  local.tab.communitySource = { id: "old-document" };
  local.applyFitting("document");
  assert.equal(local.tab.communitySource, undefined);
  assert.doesNotMatch(local.rendered(), /public-fitting-source/);
  assert.deepEqual(local.likes, []);
  assert.deepEqual(local.navigation, []);
});

test("추천 핏팅은 현재 mechId의 좋아요 상위 3개를 날짜별 캐시하고 공용 상세 섹션으로 미리 본다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const html = read("public/index.html");
  const styles = read("public/styles.css");
  const indexes = JSON.parse(read("firestore.indexes.json"));

  assert.match(html, /id="show-recommended-fittings"[\s\S]*추천 핏팅 보이기/);
  assert.match(html, /id="recommended-fitting-overlay"[\s\S]*id="recommended-fitting-content"[\s\S]*id="apply-recommended-fitting"/);
  assert.match(app, /const SHOW_RECOMMENDED_FITTINGS_STORAGE_KEY = "mwolab:show-recommended-fittings"/);
  assert.match(app, /return localStorage\.getItem\(SHOW_RECOMMENDED_FITTINGS_STORAGE_KEY\) !== "false"/);
  assert.match(app, /sharedFittingRequestPending: new URL\(window\.location\.href\)\.searchParams\.has\(SHARED_PUBLIC_FITTING_QUERY_PARAM\)/);
  assert.match(app, /function recommendationContext\(\)[\s\S]*state\.activeMainTab === "mechlab"[\s\S]*!state\.mechlabBrowseMode[\s\S]*state\.currentBuild[\s\S]*sharedFittingRequestPending: Boolean\(state\.sharedFittingRequestPending\)/);
  assert.match(app, /setSharedFittingRequestPending\(pending\)[\s\S]*state\.sharedFittingRequestPending = Boolean\(pending\)/);
  assert.match(app, /function setMainTab\(tabName\)[\s\S]*notifyRecommendationContext\(\)/);
  assert.match(app, /function showFullMechlabList\(intent = null\)[\s\S]*state\.mechlabBrowseMode = true;[\s\S]*notifyRecommendationContext\(\)/);
  assert.match(app, /function cancelSharedFittingRequest\(\)[\s\S]*mwolab:shared-fitting-navigation-cleared/);
  assert.match(app, /state\.recommendedFittings\.slice\(0, 3\)/);
  assert.match(app, /data-recommended-fitting-open="\$\{escapeHtml\(record\.id\)\}"[^>]*>\$\{t\("recommendations\.apply"\)\}/);

  assert.match(client, /const RECOMMENDATION_LIMIT = 3/);
  assert.match(client, /const RECOMMENDATION_CACHE_STORAGE_KEY = "mwolab:recommended-fittings:v1"/);
  assert.match(client, /function recommendationCacheDay\(date = new Date\(\)\)[\s\S]*getFullYear\(\)[\s\S]*getMonth\(\)[\s\S]*getDate\(\)/);
  assert.match(client, /function readRecommendationStorage\(\)[\s\S]*localStorage\.getItem\(RECOMMENDATION_CACHE_STORAGE_KEY\)/);
  assert.match(client, /function storedRecommendations\(mechId\)[\s\S]*readRecommendationStorage\(\)/);
  assert.match(client, /String\(record\.analysis\?\.mechId \|\| ""\) !== String\(mechId\)/);
  assert.match(client, /function persistRecommendations\(mechId, recordList\)[\s\S]*localStorage\.setItem\(RECOMMENDATION_CACHE_STORAGE_KEY/);
  assert.match(client, /const recommendationCache = new Map\(\);[\s\S]*const recommendationRequests = new Map\(\);[\s\S]*const recommendationGenerations = new Map\(\)/);
  assert.match(client, /where\("mechId", "==", mechId\)[\s\S]*orderBy\("likeCount", "desc"\)[\s\S]*limit\(RECOMMENDATION_LIMIT\)/);
  assert.match(client, /recommendationCache\.has\(mechId\)[\s\S]*recommendationCache\.get\(mechId\)/);
  assert.match(client, /function openRecommendationDialog[\s\S]*fittingDetailSectionsHtml\(record\.analysis\)/);
  assert.match(client, /function fittingDetailHtml[\s\S]*\$\{fittingDetailSectionsHtml\(analysis\)\}/);
  assert.match(client, /function applyRecommendation[\s\S]*bridge\.openSharedFitting/);
  assert.match(client, /function loadSharedFittingFromLocation\(\)[\s\S]*setSharedFittingRequestPending\?\.\(true\)/);
  assert.match(client, /mwolab:shared-fitting-navigation-cleared[\s\S]*sharedLoadGeneration \+= 1/);
  assert.match(client, /if \(!snapshot\.exists\(\)\) \{[\s\S]*setSharedFittingRequestPending\?\.\(false\)/);
  assert.match(client, /function invalidateRecommendations\(mechId\)[\s\S]*recommendationGenerations\.set[\s\S]*recommendationCache\.delete\(normalizedMechId\)[\s\S]*recommendationRequests\.delete\(normalizedMechId\)[\s\S]*removeStoredRecommendations\(normalizedMechId\)[\s\S]*loadRecommendations\(context\)/);
  assert.match(client, /requestEntry = \{ generation, request \}[\s\S]*recommendationGenerations\.get\(mechId\)[\s\S]*requestEntry\.generation/);
  assert.match(client, /function updateLikeViews\(id, count, liked, mechId = ""\)[\s\S]*affectedMechIds\.add\(String\(mechId\)\)[\s\S]*affectedMechIds\.forEach\(invalidateRecommendations\)/);
  assert.match(client, /return \{ count: next, liked: false, mechId: String\(fittingData\.mechId \|\| ""\) \}/);
  assert.match(client, /updateLikeViews\(id, result\.count, result\.liked, result\.mechId\)/);
  assert.match(client, /function deleteFitting[\s\S]*invalidateRecommendations\(record\.mechId\)/);
  const loadRecommendationSource = client.match(/async function loadRecommendations\(context = activeRecommendationContext\(\)\) \{[\s\S]*?(?=\nfunction sharedFittingParameter)/)?.[0] || "";
  assert.doesNotMatch(loadRecommendationSource, /hydrateRecordAuthors|onSnapshot|likes/);

  assert.match(styles, /\.recommended-fittings-panel/);
  assert.match(styles, /\.recommended-fitting-dialog \{[\s\S]*grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(styles, /body\.recommended-fitting-open[\s\S]*overflow: hidden/);
  const signatures = indexes.indexes.map(({ fields }) => fields.map(({ fieldPath, order }) => `${fieldPath}:${order}`).join(","));
  assert.ok(signatures.includes("mechId:ASCENDING,likeCount:DESCENDING"));
});

test("추천 적용은 공유 출처를 즉시 만들고 작성자·좋아요를 보충하며 늦은 응답으로 피팅을 다시 적용하지 않는다", async () => {
  const client = read("public/firebase-community.js");
  const source = client.match(/async function applyRecommendation\(\) \{[\s\S]*?\n\}/)[0];
  for (const currentUser of [null, { uid: "viewer" }]) {
    const applied = [];
    const authors = [];
    let likeSyncs = 0;
    let resolveAuthor;
    const authorReady = new Promise((resolve) => { resolveAuthor = resolve; });
    const record = { id: "recommended", ownerUid: "owner", source: "recommendation", valid: true, loadoutCode: "code" };
    const api = new Function("dependencies", `
      const { currentUser, record, bridge, hydrateRecordAuthors, syncActiveSourceLikeState } = dependencies;
      let recommendationDialogRecord = record;
      function closeRecommendationDialog() { recommendationDialogRecord = null; }
      ${source}
      return { applyRecommendation, closed: () => recommendationDialogRecord === null };
    `)({
      currentUser, record,
      bridge: {
        openSharedFitting: (payload) => applied.push(payload),
        updatePublicFittingAuthor: (uid, name) => authors.push({ uid, name }),
      },
      hydrateRecordAuthors: async ([target]) => {
        assert.equal(target, record);
        await authorReady;
        target.authorName = "Author";
      },
      syncActiveSourceLikeState: async () => { likeSyncs += 1; },
    });
    const pending = api.applyRecommendation();
    assert.equal(applied.length, 1);
    assert.equal(applied[0].id, "recommended");
    assert.equal(applied[0].canLike, Boolean(currentUser));
    assert.equal(api.closed(), true);
    assert.equal(likeSyncs, 1);
    await api.applyRecommendation();
    resolveAuthor();
    await pending;
    assert.deepEqual(authors, [{ uid: "owner", name: "Author" }]);
    assert.equal(applied.length, 1, "메타데이터 조회 완료는 피팅을 재적용하지 않아야 한다");
  }
});

test("공유 정보의 작성자·좋아요는 추천 설정과 무관하게 유지하고 추천 목록을 그 아래에 표시한다", () => {
  const app = read("public/app.js");
  const source = app.slice(app.indexOf("function communityLikeIconHtml()"), app.indexOf("function renderComponents("));
  const state = {
    showRecommendedFittings: true,
    activeMainTab: "mechlab",
    mechlabBrowseMode: false,
    selectedMech: { id: 100 },
    currentBuild: {},
    sharedFittingRequestPending: false,
    recommendedFittingsMechId: "100",
    recommendedFittings: [{ id: "recommended", name: "Recommended", likeCount: 5, tags: [] }],
  };
  const tab = { communitySource: { id: "shared", name: "Shared", authorName: "Author", liked: false, canLike: false } };
  const api = new Function("state", "activeMechlabTab", "t", "escapeHtml", `${source}\nreturn { renderCommunityAreaPanel, recommendationContext };`)(
    state, () => tab, (key) => key, (value) => String(value),
  );
  const assertSource = (html) => {
    assert.match(html, /public-fitting-source-author[^>]*>community.author: Author/);
    assert.match(html, /data-community-source-like="shared"/);
  };
  let html = api.renderCommunityAreaPanel();
  assertSource(html);
  assert.match(html, /login-required/);
  assert.ok(html.indexOf('data-community-source-like="shared"') < html.indexOf('class="recommended-fittings-panel"'));
  assert.match(html, /data-recommended-fitting-open="recommended"/);
  state.showRecommendedFittings = false;
  html = api.renderCommunityAreaPanel();
  assertSource(html);
  assert.doesNotMatch(html, /recommended-fittings-panel/);
  state.showRecommendedFittings = true;
  state.sharedFittingRequestPending = true;
  html = api.renderCommunityAreaPanel();
  assertSource(html);
  assert.doesNotMatch(html, /recommended-fittings-panel/);
  state.sharedFittingRequestPending = false;
  tab.communitySource.canLike = true;
  tab.communitySource.liked = true;
  html = api.renderCommunityAreaPanel();
  assertSource(html);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /recommended-fittings-panel/);
  delete tab.communitySource;
  html = api.renderCommunityAreaPanel();
  assert.doesNotMatch(html, /public-fitting-source/);
  assert.match(html, /recommended-fittings-panel/);
});

test("추천 핏팅 날짜 캐시는 재접속·빈 결과·손상 데이터·오래된 요청을 실제 상태로 처리한다", async () => {
  const client = read("public/firebase-community.js");
  const recommendationSource = client.match(/function activeRecommendationContext\(\) \{[\s\S]*?(?=\nfunction sharedFittingParameter)/)?.[0] || "";
  assert.ok(recommendationSource);

  const store = new Map();
  const localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
  };
  const RealDate = Date;
  let now = new RealDate(2026, 8, 7, 12).valueOf();
  class FakeDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
  }
  let context = { enabled: true, sharedFittingRequestPending: false, mechId: "100" };
  const published = [];
  const bridge = {
    ready: Promise.resolve(true),
    recommendationContext: () => context,
    setRecommendedFittings: (mechId, records) => published.push({ mechId, records }),
  };
  const remote = new Map([
    ["100", [{ id: "fit-100", mechId: "100", name: "Daily", loadoutCode: "100:daily", likeCount: 7, schemaVersion: 3 }]],
    ["empty", []],
  ]);
  const pending = [];
  let queryCount = 0;
  const firebaseApi = {
    collection: () => ({ kind: "collection" }),
    where: (_field, _operator, value) => ({ kind: "where", value }),
    orderBy: () => ({ kind: "orderBy" }),
    limit: () => ({ kind: "limit" }),
    query: (...constraints) => constraints,
    getDocs: (constraints) => {
      queryCount += 1;
      if (pending.length) return pending.shift().promise;
      const mechId = constraints.find((entry) => entry.kind === "where").value;
      return Promise.resolve({ docs: (remote.get(mechId) || []).map((data) => ({ id: data.id, data: () => data })) });
    },
  };
  const analyzeRecord = (record) => ({
    ...record,
    valid: typeof record.loadoutCode === "string" && record.loadoutCode.includes(":"),
    analysis: {
      mechId: String(record.loadoutCode || "").split(":")[0],
      tags: [],
    },
  });
  const normalizeSnapshot = (snapshot, source) => analyzeRecord({ ...snapshot.data(), id: snapshot.id, source });
  const factory = new Function("dependencies", `
    const { bridge, firebaseApi, localStorage, Date, analyzeRecord, normalizeSnapshot } = dependencies;
    const firebaseReady = Promise.resolve(true);
    const db = {};
    const copy = { tags: {} };
    const RECOMMENDATION_LIMIT = 3;
    const RECOMMENDATION_CACHE_STORAGE_KEY = "mwolab:recommended-fittings:v1";
    const RECOMMENDATION_CACHE_VERSION = 1;
    const recommendationCache = new Map();
    const recommendationRequests = new Map();
    const recommendationGenerations = new Map();
    let activeRecommendationCacheDay = recommendationCacheDay();
    ${recommendationSource}
    return { loadRecommendations, invalidateRecommendations, recommendationCache };
  `);
  const api = factory({ bridge, firebaseApi, localStorage, Date: FakeDate, analyzeRecord, normalizeSnapshot });
  const deferred = () => {
    let resolve;
    const promise = new Promise((done) => { resolve = done; });
    return { promise, resolve };
  };
  const waitFor = async (predicate) => {
    for (let attempt = 0; attempt < 20 && !predicate(); attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(predicate());
  };

  context.sharedFittingRequestPending = true;
  await api.loadRecommendations(context);
  assert.equal(queryCount, 0, "공유 문서 로딩 중에는 추천을 조회하지 않아야 한다");
  assert.equal(published.length, 0);
  context.sharedFittingRequestPending = false;
  await api.loadRecommendations(context);
  assert.equal(queryCount, 1);
  assert.equal(published.at(-1).records[0].id, "fit-100", "공유 문서 로딩 완료 후 추천을 표시해야 한다");
  api.recommendationCache.clear();
  await api.loadRecommendations(context);
  assert.equal(queryCount, 1, "같은 로컬 날짜의 재접속은 저장 캐시를 사용해야 한다");

  context = { ...context, mechId: "empty" };
  await api.loadRecommendations(context);
  api.recommendationCache.clear();
  await api.loadRecommendations(context);
  assert.equal(queryCount, 2, "성공한 빈 결과도 같은 날짜에는 다시 조회하지 않아야 한다");

  const cached = JSON.parse(store.get("mwolab:recommended-fittings:v1"));
  cached.entries["100"][0].loadoutCode = "200:wrong-mech";
  store.set("mwolab:recommended-fittings:v1", JSON.stringify(cached));
  context = { ...context, mechId: "100" };
  api.recommendationCache.clear();
  await api.loadRecommendations(context);
  assert.equal(queryCount, 3, "분석된 멕이 다른 손상 캐시는 폐기하고 다시 조회해야 한다");

  now = new RealDate(2026, 8, 8, 12).valueOf();
  await api.loadRecommendations(context);
  assert.equal(queryCount, 4, "로컬 날짜가 바뀐 뒤에는 해당 멕을 다시 조회해야 한다");

  context = { ...context, mechId: "300" };
  const oldDayRequest = deferred();
  pending.push(oldDayRequest);
  const oldDayLoad = api.loadRecommendations(context);
  await waitFor(() => queryCount === 5);
  now = new RealDate(2026, 8, 9, 12).valueOf();
  const newDayRequest = deferred();
  pending.push(newDayRequest);
  const newDayLoad = api.loadRecommendations(context);
  await waitFor(() => queryCount === 6);
  published.length = 0;
  oldDayRequest.resolve({ docs: [{ id: "old", data: () => ({ id: "old", mechId: "300", name: "Old", loadoutCode: "300:old", schemaVersion: 3 }) }] });
  await oldDayLoad;
  assert.equal(published.length, 0, "이전 날짜에 시작한 응답은 화면과 캐시를 갱신하면 안 된다");
  newDayRequest.resolve({ docs: [{ id: "new", data: () => ({ id: "new", mechId: "300", name: "New", loadoutCode: "300:new", schemaVersion: 3 }) }] });
  await newDayLoad;
  assert.equal(published.at(-1).records[0].id, "new");

  const oldGenerationRequest = deferred();
  const newGenerationRequest = deferred();
  context = { ...context, mechId: "400" };
  pending.push(oldGenerationRequest, newGenerationRequest);
  const oldGenerationLoad = api.loadRecommendations(context);
  await waitFor(() => queryCount === 7);
  api.invalidateRecommendations("400");
  await waitFor(() => queryCount === 8);
  published.length = 0;
  oldGenerationRequest.resolve({ docs: [{ id: "stale", data: () => ({ id: "stale", mechId: "400", name: "Stale", loadoutCode: "400:stale", schemaVersion: 3 }) }] });
  await oldGenerationLoad;
  assert.equal(published.length, 0, "무효화 전 세대의 응답은 표시하면 안 된다");
  newGenerationRequest.resolve({ docs: [{ id: "fresh", data: () => ({ id: "fresh", mechId: "400", name: "Fresh", loadoutCode: "400:fresh", schemaVersion: 3 }) }] });
  await waitFor(() => published.some((entry) => entry.records[0]?.id === "fresh"));
});

test("공개 핏팅은 사용자별 원자적 카운터로 100개를 제한하고 탭에는 수량을 표시하지 않는다", () => {
  const client = read("public/firebase-community.js");
  const rules = read("admin/firestore.rules");
  const admin = read("admin/server.mjs");
  const sync = read("admin/sync-publisher-usage.mjs");
  const maintenanceRules = read("admin/firestore.maintenance.rules");
  const adminPackage = read("admin/package.json");
  const adminReadme = read("admin/README.md");
  assert.match(client, /const MAX_PUBLIC_FITTINGS = 100/);
  assert.doesNotMatch(client, /community-tab-count|mineUploadCount|refreshMineUploadCount/);
  assert.match(client, /runTransaction\(db, async \(transaction\) => \{[\s\S]*transaction\.get\(usageRef\)[\s\S]*count >= MAX_PUBLIC_FITTINGS[\s\S]*operation: "create"/);
  assert.match(client, /deleteRemoteFitting[\s\S]*transaction\.get\(usageRef\)[\s\S]*operation: "delete"/);
  assert.match(rules, /function usagePath\(uid\)/);
  assert.match(rules, /getAfter\(usagePath\(request\.auth\.uid\)\)\.data\.count <= 100/);
  assert.match(rules, /validUsageCreateAdvance\(fittingId\)/);
  assert.match(rules, /validUsageDeleteAdvance\(fittingId\)/);
  assert.match(rules, /allow create: if signedInWithGoogle\(\)[\s\S]*request\.resource\.data\.count == 1/);
  assert.match(rules, /allow update: if signedInWithGoogle\(\)[\s\S]*request\.resource\.data\.operation == 'create'[\s\S]*request\.resource\.data\.operation == 'delete'/);
  assert.match(rules, /match \/publisherUsage\/\{uid\}/);
  assert.match(admin, /collection\("publisherUsage"\)[\s\S]*operation: "admin-delete"/);
  assert.match(admin, /publisher-usage-invalid/);
  assert.doesNotMatch(admin, /where\("ownerUid", "==", usageResult\.ownerUid\)/);
  assert.ok(
    admin.indexOf("await db.runTransaction") < admin.indexOf("const deletedLikes = await purgeLikes(fittingId)"),
    "관리자 삭제는 핏팅·카운터 트랜잭션이 성공한 뒤에만 좋아요를 정리해야 한다",
  );
  assert.match(admin, /transaction\.delete\(fittingRef\);[\s\S]*transaction\.set\(deletionRequestRef,[\s\S]*const deletedLikes = await purgeLikes\(fittingId\);[\s\S]*await deletionRequestRef\.delete\(\)/);
  assert.match(sync, /collection\("fittings"\)\.get\(\)[\s\S]*collection\("publisherUsage"\)\.get\(\)/);
  assert.match(sync, /Publisher usage verification failed/);
  assert.match(maintenanceRules, /match \/fittings\/\{fittingId\}[\s\S]*allow write: if false/);
  assert.match(adminPackage, /deploy-maintenance-rules[\s\S]*sync-usage[\s\S]*deploy-rules/);
  assert.match(adminReadme, /관리자 서버[\s\S]*deploy-maintenance-rules[\s\S]*sync-usage[\s\S]*deploy-rules/);
});

test("핏팅 제목은 영문·숫자·ASCII 특수문자만 허용하고 https를 차단한다", () => {
  const client = read("public/firebase-community.js");
  const rules = read("admin/firestore.rules");
  const styles = read("public/styles.css");
  assert.match(client, /function fittingTitleParts\(value\)[\s\S]*validCharacters: \/\^\[\\x20-\\x7E\]\+\$\/[\s\S]*httpsBlocked: title\.toLocaleLowerCase\(\)\.includes\("https"\)/);
  assert.match(client, /titleCharactersOnly: "영문, 숫자, 특수문자만 사용할 수 있습니다\."/);
  assert.match(client, /titleCharactersOnly: "Use only English letters, numbers, and special characters\."/);
  assert.match(client, /disabled = !title \|\| invalidCharacters \|\| httpsBlocked/);
  assert.match(client, /titleHttpsBlocked: "제목에 https를 사용할 수 없습니다\."/);
  assert.match(rules, /request\.resource\.data\.name == request\.resource\.data\.name\.trim\(\)/);
  assert.match(rules, /request\.resource\.data\.name\.matches\('\^\[ -~\]\{1,20\}\$'\)/);
  assert.match(rules, /!request\.resource\.data\.name\.matches\('\.\*\[hH\]\[tT\]\[tT\]\[pP\]\[sS\]\.\*'\)/);
});

test("상세 좋아요는 상태별 헤더 컨트롤과 공용 메뉴형 정렬을 사용한다", () => {
  const client = read("public/firebase-community.js");
  const styles = read("public/styles.css");
  assert.match(client, /const detailLike = activeBrowserTab === "public"[\s\S]*data-community-like/);
  assert.match(client, /activeBrowserTab === "mine"[\s\S]*community-detail-like-readonly/);
  assert.doesNotMatch(client, /<footer>[^`]*data-community-like/);
  assert.match(client, /if \(selected && activeBrowserTab === "public" && currentUser\) ensureLikeState/);
  assert.match(client, /community-menu community-sort-menu[\s\S]*data-community-menu-trigger[\s\S]*data-community-sort="newest"[\s\S]*data-community-sort="likes"/);
  assert.doesNotMatch(client, /<select data-community-sort/);
  assert.match(styles, /\.community-sort-menu \.community-menu-popover button\[aria-checked="true"\]/);
  assert.match(client, /await loadRemoteFittings\(true, \{ focusSort: true \}\)/);
  assert.match(client, /function renderBrowser\(\{[^}]*focusSort = false[^}]*\}[\s\S]*if \(focusSort && !elements\.overlay\.hidden\)[^\n]*data-community-sort-trigger/);
  assert.match(client, /openSortMenu[\s\S]*closeAllMenus\(\);[\s\S]*trigger\?\.focus\(\);[\s\S]*return;/);
});

test("비로그인 좋아요 버튼은 어두운 상태로 클릭 안내를 제공한다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const styles = read("public/styles.css");
  assert.match(client, /likeLoginRequired: "좋아요를 사용하려면 Google 로그인이 필요합니다\."/);
  assert.match(client, /class="community-detail-like[^`]*login-required[^`]*aria-disabled="true"/);
  assert.match(client, /function requestLike\(id\) \{[\s\S]*if \(!currentUser\) \{[\s\S]*setAuthStatus\(copy\.likeLoginRequired\)[\s\S]*toggleLike\(id\)/);
  assert.match(client, /if \(like\) return requestLike\(like\.dataset\.communityLike\)/);
  assert.match(app, /data-community-source-like[^`]*login-required[^`]*aria-disabled="true"/);
  assert.match(styles, /\.community-detail-like\.login-required,[\s\S]*background: #080c0e;[\s\S]*opacity: 1/);
});

test("좋아요 상태 캐시는 좋아요한 핏팅만 보관하고 재조회 레코드에 복원한다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /const likedFittingKeys = new Set\(\);/);
  assert.match(client, /liked: likedFittingKeys\.has\(likeKey\)/);
  assert.match(client, /if \(liked\) likedFittingKeys\.add\(key\);[\s\S]*else likedFittingKeys\.delete\(key\)/);
  assert.match(client, /if \(result\.liked\) likedFittingKeys\.add\(key\);[\s\S]*else likedFittingKeys\.delete\(key\)/);
  assert.doesNotMatch(client, /loadedLikeStates/);
});

test("자동 태그와 하드포인트 배지는 DB 필드가 아닌 현재 피팅 계산에서 파생한다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  assert.match(app, /function communityFittingTags/);
  assert.match(app, /dps >= 20/);
  assert.match(app, /number\(metrics\?\.heatEfficiency\) >= 80/);
  assert.match(app, /rangeValue > 5 && dps > 0 && rangeValue \/ dps >= 0\.4/);
  assert.match(app, /number\(metrics\?\.sniperAlpha\) >= 20[\s\S]*\/ alphaDamage >= 0\.4/);
  assert.match(app, /number\(metrics\?\.brawlerAlpha\) >= 30[\s\S]*\/ alphaDamage >= 0\.7/);
  assert.match(app, /ghostHeatForSimulationWeapons\(simulationWeapons\) > 0/);
  assert.match(app, /COMMUNITY_SNIPER_WEAPON_IDS = new Set\(\[[\s\S]*1005[\s\S]*1079[\s\S]*1257/);
  assert.match(app, /COMMUNITY_SNIPER_WEAPON_IDS\.has\(number\(item\?\.id\)\)/);
  assert.doesNotMatch(app, /function communitySniperWeapon\(item\) \{\s*[^}]*item\?\.(?:aliases|name|display_name)/);
  assert.match(app, /installedMechItems\("weapon"\)/);
  assert.match(app, /equipmentHardpointType\(item\)/);
  assert.match(client, /ghostHeat: "고스트 힛"[\s\S]*fullArmor: "풀아머"[\s\S]*glassArmor: "유리장갑"/);
  assert.doesNotMatch(client, /transaction\.set\(fittingRef, \{[^}]*tags/s);
});

test("공개 핏팅 클라이언트는 100개를 미리 읽고 페이지당 25개씩 표시한다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /const PAGE_SIZE = 25;[\s\S]*const FETCH_LIMIT = 100;[\s\S]*const PAGE_GROUP_SIZE = 5;/);
  assert.match(client, /if \(requestedMechFilterId\) constraints\.push\(firebaseApi\.where\("mechId", "==", requestedMechFilterId\)\)/);
  assert.match(client, /else if \(requestedChassisFilterKey\) constraints\.push\(firebaseApi\.where\("chassisKey", "==", requestedChassisFilterKey\)\)/);
  assert.match(client, /let requestLastDocument = reset \? null : lastDocument/);
  assert.match(client, /constraints\.push\(firebaseApi\.limit\(FETCH_LIMIT \+ 1\)\)/);
  assert.match(client, /const batchDocuments = snapshot\.docs\.slice\(0, FETCH_LIMIT\)[\s\S]*requestHasMore = snapshot\.size > FETCH_LIMIT/);
  assert.match(client, /selectedMechFilterId = trigger\?\.dataset\.communityMechFilter === "all"[\s\S]*bridge\.currentMechId/);
  assert.doesNotMatch(client, /requestPriority|requestGeneral|priorityLastDocument|generalLastDocument/);
  assert.match(client, /generation !== loadRequestGeneration/);
});

test("핏팅 브라우저 검색은 제목만 사용하고 제목 옆 멕 선택 목록을 제공한다", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  assert.match(html, /id="community-title"[\s\S]*id="community-mech-filter-trigger"/);
  assert.match(html, /id="community-mech-filter-trigger"[^>]+aria-controls="community-mech-filter-menu"/);
  assert.match(client, /search: "제목 검색"/);
  assert.match(client, /return !query \|\| String\(record\.name \|\| ""\)\.toLocaleLowerCase\(\)\.includes\(query\)/);
  assert.doesNotMatch(client, /record\.analysis\?\.mechName, record\.analysis\?\.chassisName/);
  assert.match(client, /data-community-mech-filter-option/);
  assert.match(client, /data-community-mech-filter-expand/);
  assert.match(client, /data-community-mech-filter-chassis/);
  assert.match(client, /async function selectChassisFilter\(chassisKey\)/);
  assert.match(client, /community-mech-filter-list mech-list compact-mech-list/);
  assert.match(app, /listFittingMechFilters: communityFittingMechFilterOptions/);
  assert.match(client, /if \(elements\.mechFilterMenu && !elements\.mechFilterMenu\.hidden\) \{[\s\S]*closeMechFilterMenu\(\);[\s\S]*elements\.mechFilterTrigger\.focus\(\);[\s\S]*return;/);
  assert.match(client, /const chassisGroups = mechFilterSections\(\)\.flatMap\(\(section\) => section\.chassis \|\| \[\]\)/);
  assert.match(client, /class="mech-row variant-row community-mech-filter-all/);
  assert.doesNotMatch(client, /class="class-heading"><strong>\$\{escapeHtml\(section\.label\)\}/);
  assert.doesNotMatch(client, /class="badge">\$\{\(chassis\.variants \|\| \[\]\)\.length\}/);
  assert.match(client, /const previousScrollTop = preserveScroll[\s\S]*scrollTop = previousScrollTop/);
  assert.match(client, /renderMechFilterMenu\(\{ preserveScroll: true \}\)/);
  assert.match(client, /selectedMechFilterId = "";[\s\S]*selectedChassisFilterKey = String\(chassisKey \|\| ""\)/);
  assert.match(client, /selectedMechFilterId = String\(mechId \|\| ""\);[\s\S]*selectedChassisFilterKey = ""/);
});

test("핏팅 관련 드롭다운은 같은 아래 삼각형 화살표를 사용한다", () => {
  const html = read("public/index.html");
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  assert.match(html, /id="community-mech-filter-trigger"[^>]*>전체 ▾<\/button>/);
  assert.match(app, /data-community-menu-trigger[^>]*>[\s\S]*?<span aria-hidden="true">▾<\/span>/);
  assert.match(client, /data-community-sort-trigger[^>]*>[\s\S]*?<span aria-hidden="true">▾<\/span>/);
  assert.doesNotMatch(`${app}\n${client}`, /<span aria-hidden="true">⌄<\/span>/);
});

test("원격 핏팅 로드 실패와 로그인 요구 상태에서도 브라우저 탭과 로컬 기능을 유지한다", () => {
  const client = read("public/firebase-community.js");
  assert.match(client, /publicLoadUnavailable: "현재 공개 핏팅을 불러올 수 없습니다\. 로컬 핏팅은 계속 사용할 수 있습니다\."/);
  assert.match(client, /browserNotice = \{ message: requestedTab === "mine" \? copy\.mineLoadUnavailable : copy\.publicLoadUnavailable, tone: "error" \}/);
  assert.match(client, /function renderLoginRequired\([^)]*\) \{[\s\S]*browserNotice = \{ message: copy\.loginRequired, action: "sign-in" \};[\s\S]*renderBrowser\(/);
  assert.match(client, /if \(!reset && records\.length\) \{[\s\S]*browserFooterNotice = \{ message: requestedTab === "mine" \? copy\.mineLoadUnavailable : copy\.publicLoadUnavailable, tone: "error" \};[\s\S]*renderBrowser\(\)/);
  assert.match(client, /function closeCommunity\(\) \{[\s\S]*loadRequestGeneration \+= 1/);
  assert.match(client, /async function openCommunity\(mode, trigger\) \{[\s\S]*loadRequestGeneration \+= 1/);
  assert.match(client, /elements\.close\.focus\(\);[\s\S]*if \(activeMode === "save"\) renderSaveForm\(\);[\s\S]*else await switchBrowserTab/);
  assert.match(client, /let requestLastDocument = reset \? null : lastDocument/);
  assert.match(client, /lastDocument = requestLastDocument;[\s\S]*remoteHasMore = requestHasMore/);
  assert.match(client, /user && !elements\.overlay\.hidden && activeMode === "browse" && activeBrowserTab === "mine"/);
  assert.doesNotMatch(client, /elements\.content\.innerHTML = `<div class="community-empty">\$\{escapeHtml\(message\)\}<\/div>`/);
});

test("핏팅 브라우저는 확장 크기·25개 페이지·5개 번호 그룹과 단일 상세 스크롤을 사용한다", () => {
  const client = read("public/firebase-community.js");
  const styles = read("public/styles.css");
  assert.match(styles, /\.community-dialog\.browser-mode \{[\s\S]*height: min\(64rem, calc\(100vh - 2rem\)\)/);
  assert.match(styles, /\.community-dialog\.browser-mode \.community-content \{ overflow: hidden; \}/);
  assert.match(styles, /\.community-browser \{[\s\S]*height: 100%;[\s\S]*min-height: 0/);
  assert.match(styles, /@media \(max-width: 900px\) \{[\s\S]*\.community-browser-body \{[\s\S]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*\.community-detail-pane \{ min-height: 0; \}/);
  assert.match(client, /visible\.slice\(\(currentPage - 1\) \* PAGE_SIZE, currentPage \* PAGE_SIZE\)/);
  assert.match(client, /data-community-page/);
  assert.match(client, /const groupStart = Math\.floor\(\(currentPage - 1\) \/ PAGE_GROUP_SIZE\) \* PAGE_GROUP_SIZE \+ 1/);
  assert.match(client, /const groupEnd = Math\.min\(pageCount, groupStart \+ PAGE_GROUP_SIZE - 1\)/);
  assert.doesNotMatch(client, /community-page-ellipsis/);
  assert.match(client, /const rows = \[[\s\S]*copy\.stat\.armor[\s\S]*copy\.stat\.tons[\s\S]*copy\.stat\.engine[\s\S]*copy\.stat\.maxSpeed[\s\S]*copy\.stat\.dps[\s\S]*copy\.stat\.alphaDamage[\s\S]*copy\.stat\.heatEfficiency[\s\S]*copy\.stat\.heatSinks[\s\S]*\];/);
  assert.match(styles, /\.community-detail-pane \{ overflow: hidden; \}/);
  assert.match(styles, /\.community-detail-scroll \{[\s\S]*overflow: auto/);
  assert.match(styles, /\.community-fitting-detail \{[\s\S]*grid-template-rows: auto minmax\(0, 1fr\) auto/);
  assert.match(styles, /\.community-fitting-detail > header \.community-card-tags \{[\s\S]*margin-top: 0\.7rem/);
  assert.match(client, /const armorLevel = Math\.max\(1, Math\.min\(5, Math\.ceil\(armorPercent \/ 20\)\)\)/);
  [1, 2, 3, 4, 5].forEach((level) => {
    assert.match(styles, new RegExp(`\\.community-stat-grid \\.community-armor-level-${level} strong`));
  });
  assert.match(client, /statRowsHtml\(analysis\)/);
});

test("설명 없는 v3 Firestore 생성 규칙과 기존 v1·v2 읽기 호환을 유지한다", () => {
  const client = read("public/firebase-community.js");
  const rules = read("admin/firestore.rules");
  assert.match(client, /\[1, 2, 3\]\.includes\(record\.schemaVersion\)/);
  assert.match(rules, /request\.resource\.data\.schemaVersion == 3/);
  assert.match(rules, /request\.resource\.data\.chassisKey\.matches\('\^\[a-z0-9_-\]\+\$'\)/);
  assert.match(rules, /request\.query\.limit <= 101/);
  assert.match(client, /const TITLE_LIMIT = 20;/);
  assert.match(rules, /request\.resource\.data\.name\.size\(\) <= 20/);
  assert.doesNotMatch(rules, /request\.resource\.data\.description/);
  assert.doesNotMatch(rules, /'description'/);
});

test("통합 액션 드롭다운과 3초 상태 메시지 제거를 사용한다", () => {
  const app = read("public/app.js");
  const styles = read("public/styles.css");
  const client = read("public/firebase-community.js");
  assert.match(app, /<div class="community-menu" data-community-ui-entry>/);
  assert.match(app, /data-community-menu-trigger/);
  assert.match(app, /class="community-menu-popover" role="menu" hidden/);
  assert.match(app, /community\.actions/);
  assert.match(app, /data-community-open="browse"/);
  assert.match(app, /data-community-open="save"/);
  assert.match(app, /"community\.publish": "저장하기\/공유하기"/);
  assert.match(styles, /\.mechlab-action-panel \.community-menu-trigger \{[\s\S]*justify-content: center;[\s\S]*text-align: center/);
  assert.match(client, /setTimeout\(\(\) => \{[\s\S]*elements\.authStatus\.hidden = true;[\s\S]*\}, 3000\)/);
  assert.match(client, /function closeAllMenus/);
  assert.match(client, /const returnTarget = opener\.closest\("\.community-menu"\)\?\.querySelector\("\[data-community-menu-trigger\]"\) \|\| opener/);
});

test("공개 핏팅 원상복귀는 불러온 코드를 다시 적용하고 목록 표시는 공용 하드포인트 규약을 따른다", () => {
  const app = read("public/app.js");
  const client = read("public/firebase-community.js");
  const styles = read("public/styles.css");
  assert.match(app, /tab\.communitySource = \{[\s\S]*loadoutCode: record\.loadoutCode/);
  assert.match(app, /function restoreCommunityFitting\(\) \{[\s\S]*importMwoCode\(source\.loadoutCode, \{ closeDialog: false, updateNavigation: false \}\)/);
  assert.match(client, /\[\["energy", "E"\], \["missile", "M"\], \["ballistic", "B"\], \["ams", "AMS"\]\]/);
  assert.match(client, /class="hardpoint-chip \$\{type\}"/);
  assert.match(client, /community-card-title"><em>\$\{escapeHtml\(analysis\?\.mechName[\s\S]*<strong>\$\{escapeHtml\(record\.name/);
  assert.match(client, /community-detail-title"><span>\$\{escapeHtml\(analysis\.mechName[\s\S]*<h3>\$\{escapeHtml\(record\.name/);
  assert.match(client, /community-card-thumbnail[\s\S]*community-card-weapons[\s\S]*community-card-meta[\s\S]*community-card-hardpoints/);
  assert.match(client, /function likeIconHtml\(\)[\s\S]*community-like-icon/);
  assert.doesNotMatch(client, /community-card-bottom/);
  assert.match(styles, /\.community-card-meta \{[\s\S]*justify-content: flex-start/);
  assert.match(styles, /\.community-card-meta \{[\s\S]*font-size: 0\.82rem/);
  assert.match(styles, /\.community-card-hardpoints \{[\s\S]*justify-content: flex-end/);
  assert.match(styles, /\.community-like-icon \{[\s\S]*fill: currentColor/);
  assert.doesNotMatch(client, /[♡♥]/);
  assert.doesNotMatch(app, /[♡♥]/);
  assert.match(styles, /\.community-card-like-count \{[\s\S]*justify-content: center/);
  assert.match(client, /community-card-like-count" aria-label="\$\{escapeHtml\(`\$\{copy\.like\}: \$\{likeCount\}`\)\}"/);
  assert.match(client, /representativeWeaponsHtml\(analysis\?\.representativeWeapons\)/);
  assert.match(client, /representativeWeaponsHtml\(weapons = \[\]\) \{[\s\S]*weapons\.slice\(0, 4\)/);
  assert.doesNotMatch(client, /representativeWeapons: "대표무기"|representativeWeapons: "Representative weapons"|community-card-weapons-label/);
  assert.doesNotMatch(client, /community-representative-more|more installed|추가 장착 무기|\[\+\]/i);
  assert.match(styles, /\.community-weapon-list li\.energy span \{ color: var\(--yellow\); \}/);
  assert.match(styles, /\.community-weapon-list li\.ams span \{ color: var\(--ams\); \}/);
  assert.match(client, /data-community-like="\$\{escapeHtml\(record\.id\)\}"[\s\S]*aria-pressed="\$\{record\.liked \? "true" : "false"\}"[\s\S]*\$\{likeIconHtml\(\)\}<strong>\$\{likeCount\}<\/strong><\/button>/);
  assert.doesNotMatch(client, /\$\{likeIconHtml\(\)\}<span>\$\{escapeHtml\(likeAction\)\}<\/span>/);
  assert.match(styles, /\.community-detail-like \{[\s\S]*min-width: 5\.25rem;[\s\S]*min-height: 3rem;[\s\S]*padding: 0\.6rem 1rem/);
  assert.match(app, /const likeAction = source\.liked \? t\("community\.unlike"\) : t\("community\.like"\)/);
  assert.match(app, /data-community-source-like="\$\{escapeHtml\(source\.id\)\}"[\s\S]*aria-pressed="\$\{source\.liked \? "true" : "false"\}"[\s\S]*aria-label="\$\{escapeHtml\(source\.canLike \? likeAction : t\("community\.loginToLike"\)\)\}"[\s\S]*>\$\{communityLikeIconHtml\(\)\}<\/button>/);
  assert.match(styles, /\.community-detail-like,[\s\S]*\.public-fitting-source-actions \[data-community-source-like\] \{[\s\S]*justify-content: center/);
  assert.match(app, /function publicFittingHasChanges\(source\) \{[\s\S]*currentCode !== \(source\.baselineLoadoutCode \|\| source\.loadoutCode\)/);
  assert.match(app, /baselineLoadoutCode: MWOCodec\.encode\(currentBuildAsMwoLoadout\(\)\)/);
  assert.match(app, /data-community-restore \$\{canRestore \? "" : "disabled"\}/);
});

test("공개 핏팅 상태는 새 탭에서는 유지하고 같은 탭 교체에서만 해제한다", () => {
  const app = read("public/app.js");
  const styles = read("public/styles.css");
  assert.match(app, /function replaceActiveMechlabTabRecord\(mech, build\) \{[\s\S]*delete tab\.communitySource/);
  assert.doesNotMatch(app, /function setMechlabFitting\(mech, build, mode = "replace"\) \{\s*const previousTab[\s\S]*delete previousTab\.communitySource/);
  assert.match(styles, /\.mechlab-fitting-tab\.public-fitting:not\(\.active\)/);
  assert.match(styles, /\.mechlab-fitting-tab\.public-fitting\.active/);
});

test("빌드 저장 대화상자는 로그인 상태에 맞는 기본 위치와 20자 제목 제한을 사용한다", () => {
  const client = read("public/firebase-community.js");
  const styles = read("public/styles.css");
  assert.match(client, /dialog\?\.classList\.toggle\("save-mode", activeMode === "save"\)/);
  assert.match(styles, /\.community-dialog\.save-mode \{[\s\S]*width: min\(34rem, 100%\);[\s\S]*max-height: min\(32rem, calc\(100vh - 3rem\)\)/);
  assert.match(client, /maxlength="\$\{TITLE_LIMIT\}"/);
  assert.match(client, /const savePublicByDefault = Boolean\(currentUser\)/);
  assert.match(client, /value="public" \$\{savePublicByDefault \? "checked" : "disabled"\}/);
  assert.match(client, /value="local" \$\{savePublicByDefault \? "" : "checked"\}/);
});

test("내 업로드 삭제는 비공개 좋아요 정리 요청과 필요한 복합 인덱스를 함께 사용한다", () => {
  const client = read("public/firebase-community.js");
  const indexes = JSON.parse(read("firestore.indexes.json"));
  assert.match(client, /doc\(db, "deletionRequests", record\.id\)/);
  assert.match(client, /transaction\.set\(deletionRequestRef/);
  const signatures = indexes.indexes.map(({ fields }) => fields.map(({ fieldPath, order }) => `${fieldPath}:${order}`).join(","));
  assert.ok(signatures.includes("ownerUid:ASCENDING,mechId:ASCENDING,createdAt:DESCENDING"));
  assert.ok(signatures.includes("ownerUid:ASCENDING,mechId:ASCENDING,likeCount:DESCENDING"));
  assert.ok(signatures.includes("chassisKey:ASCENDING,createdAt:DESCENDING"));
  assert.ok(signatures.includes("chassisKey:ASCENDING,likeCount:DESCENDING"));
  assert.ok(signatures.includes("ownerUid:ASCENDING,chassisKey:ASCENDING,createdAt:DESCENDING"));
  assert.ok(signatures.includes("ownerUid:ASCENDING,chassisKey:ASCENDING,likeCount:DESCENDING"));
});

test("Firestore의 로드아웃 문자열 형태는 MWO 코덱 출력과 일치한다", () => {
  const codec = require("../public/mwo-codec.js");
  const components = Object.fromEntries(codec.COMPONENTS.map(({ name }) => [name, {
    armor: 0,
    omnipod: null,
    itemIds: [],
  }]));
  const code = codec.encode({
    chassisId: 1,
    isOmni: false,
    actuatorState: 0,
    upgrades: {},
    components,
    rearArmor: {},
  });
  const storedCodePattern = /^A[0-o|]+p[0-o|]+q[0-o|]+r[0-o|]+s[0-o|]+t[0-o|]+u[0-o|]+v[0-o|]+w[0-o]+$/;
  assert.ok(code.length >= 36);
  assert.match(code, storedCodePattern);
  assert.equal(codec.decode(code).chassisId, 1);
});
