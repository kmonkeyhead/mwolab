import { firebaseConfig } from "../firebase-public-config.js";

const SHARED_FITTING_PARAM = "fitting";

const COPY = {
  kr: {
    loading: "공유 핏팅을 불러오는 중입니다.",
    missing: "이 공유 핏팅은 삭제되었거나 존재하지 않습니다.",
    invalid: "올바르지 않은 공유 핏팅 링크입니다.",
    failed: "공유 핏팅을 불러오지 못했습니다.",
  },
  en: {
    loading: "Loading shared fitting.",
    missing: "This shared fitting no longer exists.",
    invalid: "This shared fitting link is invalid.",
    failed: "Could not load the shared fitting.",
  },
};

let language = new URL(window.location.href).searchParams.get("lang") === "en" ? "en" : "kr";
let copy = COPY[language];

function setStatus(message, tone = "") {
  const status = document.getElementById("data-status");
  if (status) status.textContent = message;
  window.dispatchEvent(new CustomEvent("mwolab:mobile-shared-fitting-status", {
    detail: { message, tone },
  }));
}

function validSharedFittingId(value) {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= 128
    && !value.includes("/");
}

function waitForMobileBridge() {
  return new Promise((resolve) => {
    const check = () => {
      const bridge = globalThis.MwoLabMobileBridge;
      if (bridge?.ready?.()) resolve(bridge);
      else setTimeout(check, 60);
    };
    check();
  });
}

async function fetchSharedFittingCode(fittingId) {
  const endpoint = new URL(
    `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/fittings/${encodeURIComponent(fittingId)}`,
  );
  endpoint.searchParams.set("key", firebaseConfig.apiKey);
  const response = await fetch(endpoint);
  if (response.status === 404) throw new Error("missing");
  if (!response.ok) throw new Error("failed");
  const documentRecord = await response.json();
  const schemaVersion = Number(documentRecord?.fields?.schemaVersion?.integerValue);
  const loadoutCode = documentRecord?.fields?.loadoutCode?.stringValue;
  if (![1, 2, 3].includes(schemaVersion) || typeof loadoutCode !== "string" || !loadoutCode) {
    throw new Error("invalid");
  }
  return loadoutCode;
}

let loadGeneration = 0;

async function loadSharedFittingForMobile() {
  const generation = ++loadGeneration;
  const params = new URL(window.location.href).searchParams;
  if (!params.has(SHARED_FITTING_PARAM)) {
    setStatus("");
    return;
  }
  const fittingId = params.get(SHARED_FITTING_PARAM) || "";
  setStatus(copy.loading);

  let loadoutCode = "";
  let failure = "";
  if (!validSharedFittingId(fittingId)) {
    failure = "invalid";
  } else {
    try {
      loadoutCode = await fetchSharedFittingCode(fittingId);
    } catch (error) {
      failure = ["missing", "invalid"].includes(error?.message) ? error.message : "failed";
    }
  }

  const bridge = await waitForMobileBridge();
  if (generation !== loadGeneration) return;
  const currentFittingId = new URL(window.location.href).searchParams.get(SHARED_FITTING_PARAM);
  if (currentFittingId !== fittingId) return;
  if (failure) {
    setStatus(copy[failure], "error");
    return;
  }
  try {
    bridge.openSharedFittingCode(loadoutCode);
    setStatus("");
    window.dispatchEvent(new CustomEvent("mwolab:mobile-shared-fitting-loaded"));
  } catch {
    setStatus(copy.invalid, "error");
  }
}

loadSharedFittingForMobile();
window.addEventListener("mwolab:language-change", (event) => {
  const nextLanguage = event.detail?.language === "en" ? "en" : "kr";
  if (nextLanguage === language) return;
  const previousCopy = copy;
  language = nextLanguage;
  copy = COPY[language];
  const status = document.getElementById("data-status");
  const statusKey = Object.keys(previousCopy).find((key) => previousCopy[key] === status?.textContent);
  if (statusKey) setStatus(copy[statusKey], statusKey === "loading" ? "" : "error");
});
window.addEventListener("popstate", loadSharedFittingForMobile);
