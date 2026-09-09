(function initializeMobileMechLab() {
  const bridge = globalThis.MwoLabMobileBridge;
  if (!bridge) return;

  const COMPONENT_LABELS = {
    head: "HEAD",
    centre_torso: "CENTER TORSO",
    right_torso: "RIGHT TORSO",
    left_torso: "LEFT TORSO",
    right_arm: "RIGHT ARM",
    left_arm: "LEFT ARM",
    right_leg: "RIGHT LEG",
    left_leg: "LEFT LEG",
  };
  const HARDPOINT_LABELS = { energy: "E", missile: "M", ballistic: "B", ams: "AMS", ecm: "ECM" };
  const HARDPOINT_NAMES = {
    kr: { energy: "에너지", missile: "미사일", ballistic: "발리스틱", ams: "AMS" },
    en: { energy: "Energy", missile: "Missile", ballistic: "Ballistic", ams: "AMS" },
  };
  const WEAPON_GROUP_ORDER = ["energy", "missile", "ballistic", "ams"];
  const REMEMBERED_PICKER_CATEGORIES = ["weapons", "ammo", "equipment", "omnipods"];
  const copy = {
    kr: {
      menu: "메뉴",
      mechList: "멕 리스트 보기",
      language: "언어",
      donate: "후원하기",
      overview: "오버뷰",
      tools: "툴즈",
      upgrades: "업그레이드",
      saveLoad: "저장/불러오기",
      close: "닫기",
      search: "멕 검색",
      weapons: "무기",
      ammo: "탄약",
      equipment: "장비",
      omnipods: "옵니포드",
      engines: "엔진",
      "engine-heatsinks": "엔진 히트싱크",
      remainingHardpoints: "남은 하드포인트",
      noItems: "이 부위에 장착할 수 있는 항목이 없습니다.",
      currentSlots: "현재 슬롯",
      remainingSlots: "남은 슬롯",
      tons: "톤수",
      slots: "슬롯",
      free: "남음",
      import: "IMPORT",
      export: "EXPORT",
    },
    en: {
      menu: "Menu",
      mechList: "Mech list",
      language: "Language",
      donate: "Donate",
      overview: "Overview",
      tools: "Tools",
      upgrades: "Upgrades",
      saveLoad: "Import/Export",
      close: "Close",
      search: "Search mechs",
      weapons: "Weapons",
      ammo: "Ammo",
      equipment: "Equipment",
      omnipods: "Omnipods",
      engines: "Engines",
      "engine-heatsinks": "Engine heat sinks",
      remainingHardpoints: "Remaining hardpoints",
      noItems: "No compatible items are available for this component.",
      currentSlots: "Current slots",
      remainingSlots: "Free slots",
      tons: "Tons",
      slots: "Slots",
      free: "Free",
      import: "IMPORT",
      export: "EXPORT",
    },
  };
  let language = bridge.language() === "en" ? "en" : "kr";
  const t = (key) => copy[language][key] || copy.kr[key] || key;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  let activePickerComponent = "";
  let activePickerCategory = "weapons";
  let lastPickerCategory = "weapons";
  const expandedMechCategories = new Set();
  let detached = null;
  let suppressCanvasClickUntil = 0;
  let pendingRemovalTap = null;
  const DOUBLE_TAP_WINDOW_MS = 450;
  const MAX_CANVAS_SCALE = 2.5;
  const canvasState = { scale: 0.5, x: 0, y: 0, initializedForMech: "", pointers: new Map(), gesture: null };

  function element(tag, className = "", attributes = {}) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    Object.entries(attributes).forEach(([name, value]) => {
      if (name === "text") node.textContent = value;
      else if (value !== null && value !== undefined) node.setAttribute(name, value);
    });
    return node;
  }

  function createOverlay(id, title, closeable = true) {
    const overlay = element("section", "mobile-overlay", { id, hidden: "" });
    const header = element("header");
    header.appendChild(element("h2", "", { text: title }));
    overlay.appendChild(header);
    overlay.appendChild(element("div", "mobile-overlay-body"));
    if (closeable) {
      const close = element("button", "mobile-overlay-close", { type: "button", text: t("close"), "data-mobile-close": id });
      overlay.appendChild(close);
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  const menuButton = element("button", "mobile-menu-button", {
    type: "button",
    text: "☰",
    "aria-label": t("menu"),
    "aria-controls": "mobile-drawer",
    "aria-expanded": "false",
  });
  document.body.appendChild(menuButton);

  const fittingStatus = element("aside", "mobile-fitting-status", { "aria-label": "Fitting status", hidden: "" });
  document.body.appendChild(fittingStatus);

  const bottomNav = element("nav", "mobile-bottom-nav", { "aria-label": "Mobile MechLab" });
  [
    ["overview", t("overview")],
    ["tools", t("tools")],
    ["upgrades", t("upgrades")],
    ["save", t("saveLoad")],
  ].forEach(([action, label]) => {
    bottomNav.appendChild(element("button", "", { type: "button", text: label, "data-mobile-action": action }));
  });
  document.body.appendChild(bottomNav);

  const drawer = createOverlay("mobile-drawer", t("menu"), false);
  drawer.classList.add("mobile-drawer");
  const drawerClose = element("button", "build-actions-close", {
    type: "button",
    text: "×",
    "aria-label": t("close"),
    "data-mobile-close": "mobile-drawer",
  });
  drawer.querySelector("header").appendChild(drawerClose);
  const drawerBody = drawer.querySelector(".mobile-overlay-body");
  const drawerMechListButton = element("button", "", { type: "button", text: t("mechList"), "data-mobile-open-list": "" });
  drawerBody.appendChild(drawerMechListButton);
  const languageBox = element("div", "mobile-drawer-language");
  [
    ["kr", "한국어"],
    ["en", "English"],
  ].forEach(([value, label]) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", value);
    languageBox.appendChild(element("a", "", {
      href: `${url.pathname}${url.search}${url.hash}`,
      text: label,
      "data-lang-link": value,
    }));
  });
  drawerBody.appendChild(languageBox);
  drawerBody.appendChild(element("a", "", {
    href: "https://ko-fi.com/killkimno",
    target: "_blank",
    rel: "noopener noreferrer",
    text: t("donate"),
  }));

  const mechListOverlay = createOverlay("mobile-mech-list-overlay", t("mechList"));
  const mechListBody = mechListOverlay.querySelector(".mobile-overlay-body");
  const mechListControls = element("div", "mobile-mech-list-controls");
  const mechSearch = element("input", "mobile-mech-search", { type: "search", placeholder: t("search"), "aria-label": t("search") });
  const sharedFittingStatus = element("p", "mobile-shared-fitting-status", { role: "status" });
  sharedFittingStatus.hidden = true;
  const mechList = element("div", "mobile-mech-list");
  mechListControls.append(mechSearch, sharedFittingStatus);
  mechListBody.append(mechListControls, mechList);

  const toolsCloseX = document.getElementById("close-build-actions-x");
  const toolsClose = document.getElementById("close-build-actions");
  if (toolsCloseX) toolsCloseX.hidden = true;
  if (toolsClose) {
    toolsClose.textContent = t("close");
    toolsClose.classList.add("mobile-overlay-close");
  }

  const pickerOverlay = createOverlay("mobile-picker-overlay", t("weapons"));
  const pickerBody = pickerOverlay.querySelector(".mobile-overlay-body");
  const pickerControls = element("div", "mobile-picker-controls");
  const pickerTabs = element("div", "mobile-picker-tabs");
  const pickerHardpoints = element("div", "mobile-picker-hardpoints");
  const pickerStatus = element("p", "mobile-picker-status", { role: "status" });
  const pickerList = element("div", "mobile-picker-list");
  pickerControls.append(pickerTabs, pickerHardpoints, pickerStatus);
  pickerBody.append(pickerControls, pickerList);

  const overviewOverlay = createOverlay("mobile-overview-overlay", t("overview"));
  const upgradeOverlay = createOverlay("mobile-upgrade-overlay", t("upgrades"));
  const upgradeSlots = element("div", "mobile-upgrade-slots");
  upgradeOverlay.querySelector(".mobile-overlay-body").appendChild(upgradeSlots);

  const saveOverlay = createOverlay("mobile-save-overlay", t("saveLoad"));
  const saveOptions = element("div", "mobile-save-options");
  saveOptions.append(
    element("button", "", { type: "button", text: t("import"), "data-mobile-loadout": "import" }),
    element("button", "", { type: "button", text: t("export"), "data-mobile-loadout": "export" }),
  );
  saveOverlay.querySelector(".mobile-overlay-body").appendChild(saveOptions);

  const compactNumber = (value) => Number(value).toFixed(1).replace(/\.0$/, "");

  function renderFittingStatus() {
    const summary = bridge.slotSummary();
    fittingStatus.hidden = !summary;
    if (!summary) {
      fittingStatus.replaceChildren();
      return;
    }
    fittingStatus.innerHTML = `
      <span class="${summary.tonsOver ? "over-limit" : ""}">${t("tons")} <strong>${compactNumber(summary.tons)} / ${compactNumber(summary.maxTons)}</strong></span>
      <span class="${summary.slotsOver ? "over-limit" : ""}">${t("slots")} <strong>${summary.current} / ${summary.total}</strong></span>
    `;
  }

  function confirmRemovalDoubleTap(key, remove) {
    const now = Date.now();
    if (now < suppressCanvasClickUntil) {
      pendingRemovalTap = null;
      return false;
    }
    if (
      pendingRemovalTap?.key === key
      && now - pendingRemovalTap.at <= DOUBLE_TAP_WINDOW_MS
    ) {
      pendingRemovalTap = null;
      remove();
      return true;
    }
    pendingRemovalTap = { key, at: now };
    return false;
  }

  function showOverlay(overlay) {
    overlay.hidden = false;
    document.body.classList.add("mobile-overlay-open");
  }

  function closeOverlay(overlay) {
    if (!overlay) return;
    overlay.hidden = true;
    if (detached?.overlay === overlay) restoreDetachedPanel();
    if (![...document.querySelectorAll(".mobile-overlay")].some((entry) => !entry.hidden)) {
      document.body.classList.remove("mobile-overlay-open");
    }
  }

  function toggleDrawer(open = drawer.hidden) {
    drawer.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
  }

  function hardpointTags(hardpoints, includeZero = false) {
    return Object.entries(hardpoints || {})
      .filter(([, count]) => includeZero ? Number(count) >= 0 : Number(count) > 0)
      .map(([type, count]) => `<span class="mobile-hardpoint-tag ${type}">${HARDPOINT_LABELS[type] || type} ${count}</span>`)
      .join("");
  }

  function renderMechList() {
    const query = mechSearch.value.trim().toLocaleLowerCase();
    const mechs = bridge.mechs()
      .filter((mech) => !query || `${mech.name} ${mech.chassis} ${mech.chassisName} ${mech.faction}`.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.tons - b.tons || a.name.localeCompare(b.name, undefined, { numeric: true }));
    const weightGroups = new Map();
    mechs.forEach((mech) => {
      const weight = mech.weightClass || "-";
      if (!weightGroups.has(weight)) weightGroups.set(weight, new Map());
      const factions = weightGroups.get(weight);
      const factionKey = mech.factionKey || mech.faction || "-";
      if (!factions.has(factionKey)) {
        factions.set(factionKey, {
          key: factionKey,
          label: mech.faction || factionKey,
          order: Number(mech.factionOrder),
          categories: new Map(),
        });
      }
      const categories = factions.get(factionKey).categories;
      if (!categories.has(mech.chassis)) categories.set(mech.chassis, []);
      categories.get(mech.chassis).push(mech);
    });
    mechList.innerHTML = [...weightGroups.entries()].map(([weight, factions]) => `
      <section class="mobile-mech-weight-group">
        <h3 class="mobile-mech-group-title">${escapeHtml(weight)}</h3>
        ${[...factions.values()]
          .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
          .map((faction) => `
            <section class="mobile-mech-faction-group">
              <h4 class="mobile-mech-faction-title" data-faction="${escapeHtml(faction.key)}">${escapeHtml(faction.label)}</h4>
              ${[...faction.categories.entries()].map(([chassis, entries]) => {
                const expanded = Boolean(query) || expandedMechCategories.has(chassis);
                const representative = entries[0];
                return `
                  <div class="mobile-mech-category${expanded ? " expanded" : ""}">
                    <button class="mobile-mech-category-button" type="button" data-mobile-mech-category="${escapeHtml(chassis)}" aria-expanded="${expanded}" ${query ? "disabled" : ""}>
                      <span><span class="mobile-mech-category-indicator">${expanded ? "−" : "+"}</span><strong>${escapeHtml(representative.chassisName || chassis)}</strong></span>
                      <span>${escapeHtml(representative.tons)}T · ${entries.length}</span>
                    </button>
                    ${expanded ? `<div class="mobile-mech-category-items">${entries.map((mech) => `
                      <button class="mobile-mech-row" type="button" data-mobile-mech="${escapeHtml(mech.id)}">
                        <span class="mech-title-main">${mech.omnipodIcon || ""}<strong>${escapeHtml(mech.name)}</strong></span>
                        <span class="badge-line mech-slot-tags">${mech.slotBadges || ""}</span>
                      </button>
                    `).join("")}</div>` : ""}
                  </div>
                `;
              }).join("")}
            </section>
          `).join("")}
      </section>
    `).join("");
  }

  function showMechList() {
    toggleDrawer(false);
    renderMechList();
    showOverlay(mechListOverlay);
    requestAnimationFrame(() => mechSearch.focus());
  }

  function pickerCategories(component) {
    const categories = ["weapons", "ammo", "equipment"];
    const hasOmnipod = document.querySelector(`[data-component-drop="${component}"] .component-omnipod-card`);
    if (hasOmnipod && component !== "centre_torso") categories.push("omnipods");
    return categories;
  }

  function renderPicker() {
    const data = bridge.picker(activePickerComponent, activePickerCategory);
    const title = `${COMPONENT_LABELS[activePickerComponent] || activePickerComponent} · ${t(activePickerCategory)}`;
    pickerOverlay.querySelector("h2").textContent = title;
    const categories = ["engines", "engine-heatsinks"].includes(activePickerCategory)
      ? [activePickerCategory]
      : pickerCategories(activePickerComponent);
    pickerTabs.innerHTML = categories.map((category) => `
      <button type="button" class="${category === activePickerCategory ? "active" : ""}" data-mobile-picker-category="${category}">${t(category)}</button>
    `).join("");
    pickerTabs.style.gridTemplateColumns = `repeat(${Math.max(1, categories.length)}, minmax(0, 1fr))`;

    const remaining = hardpointTags(data.remainingHardpoints, true);
    const summary = bridge.slotSummary();
    pickerHardpoints.hidden = ["engines", "engine-heatsinks", "omnipods"].includes(activePickerCategory);
    pickerHardpoints.innerHTML = `
      <span class="mobile-picker-summary-item">
        <small>${t("remainingHardpoints")}</small>
        <strong class="mobile-hardpoints">${remaining || "-"}</strong>
      </span>
      <span class="mobile-picker-summary-item${summary?.tonsOver ? " over-limit" : ""}">
        <small>${t("tons")}</small>
        <strong>${summary ? `${compactNumber(summary.tons)} / ${compactNumber(summary.maxTons)}` : "-"}</strong>
      </span>
      <span class="mobile-picker-summary-item${summary?.slotsOver ? " over-limit" : ""}">
        <small>${t("slots")}</small>
        <strong>${summary ? `${summary.current} / ${summary.total}` : "-"}</strong>
      </span>
    `;
    pickerStatus.textContent = data.fixedEngine && activePickerCategory === "engines"
      ? (language === "en" ? "This OmniMech engine is fixed." : "이 옴니멕의 엔진은 고정되어 있습니다.")
      : "";

    if (activePickerCategory === "omnipods") {
      pickerList.innerHTML = data.omnipods.length ? data.omnipods.map((pod) => `
        <button class="mobile-picker-item${pod.active ? " active" : ""}" type="button" data-mobile-omnipod="${escapeHtml(pod.id)}">
          <strong>${escapeHtml(pod.name)}</strong><span></span><span class="mobile-hardpoints">${hardpointTags(pod.hardpoints)}</span>
        </button>
      `).join("") : `<p class="mobile-empty-message">${t("noItems")}</p>`;
      return;
    }

    const pickerItemHtml = (item) => {
      const tone = WEAPON_GROUP_ORDER.includes(item.type) ? ` ${item.type}` : "";
      return `
      <button class="mobile-picker-item${tone}${item.warning ? " invalid" : ""}" type="button" data-mobile-picker-item="${escapeHtml(item.id)}" data-mobile-picker-warning="${encodeURIComponent(item.warning || "")}">
        <strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.slots)} SLOT</small><small>${Number(item.tons).toFixed(1)} T</small>
      </button>
    `;
    };
    if (activePickerCategory === "weapons") {
      pickerList.innerHTML = data.items.length ? WEAPON_GROUP_ORDER
        .map((type) => {
          const items = data.items.filter((item) => item.type === type);
          if (!items.length) return "";
          return `
            <section class="mobile-weapon-group ${type}">
              <h3><span>${HARDPOINT_LABELS[type]}</span>${HARDPOINT_NAMES[language][type]}</h3>
              <div>${items.map(pickerItemHtml).join("")}</div>
            </section>
          `;
        })
        .join("") : `<p class="mobile-empty-message">${t("noItems")}</p>`;
      return;
    }
    pickerList.innerHTML = data.items.length
      ? data.items.map(pickerItemHtml).join("")
      : `<p class="mobile-empty-message">${t("noItems")}</p>`;
  }

  function openPicker(component, category = "") {
    if (!bridge.selectedMech()) return showMechList();
    activePickerComponent = component;
    if (["engines", "engine-heatsinks"].includes(category)) {
      activePickerCategory = category;
    } else {
      const categories = pickerCategories(component);
      const preferredCategory = category || lastPickerCategory;
      activePickerCategory = categories.includes(preferredCategory) ? preferredCategory : "weapons";
      if (category && categories.includes(category)) lastPickerCategory = category;
    }
    renderPicker();
    showOverlay(pickerOverlay);
  }

  function detachPanel(panel, overlay) {
    if (!panel) return;
    restoreDetachedPanel();
    detached = { panel, parent: panel.parentNode, next: panel.nextSibling, overlay };
    panel.classList.add("mobile-detached-panel");
    panel.hidden = false;
    overlay.querySelector(".mobile-overlay-body").appendChild(panel);
    showOverlay(overlay);
  }

  function restoreDetachedPanel() {
    if (!detached) return;
    const { panel, parent, next } = detached;
    panel.classList.remove("mobile-detached-panel");
    if (next?.parentNode === parent) parent.insertBefore(panel, next);
    else parent.appendChild(panel);
    detached = null;
  }

  function openOverview() {
    if (!bridge.selectedMech()) return showMechList();
    detachPanel(document.getElementById("mech-summary-panel"), overviewOverlay);
  }

  function renderUpgradeSlotStatus() {
    const summary = bridge.slotSummary();
    upgradeSlots.innerHTML = summary
      ? `<span>${t("currentSlots")} <strong>${summary.current} / ${summary.total}</strong></span><span>${t("remainingSlots")} <strong>${summary.remaining}</strong></span>`
      : "";
  }

  function openUpgrades() {
    if (!bridge.selectedMech()) return showMechList();
    renderUpgradeSlotStatus();
    detachPanel(document.getElementById("upgrade-panel"), upgradeOverlay);
    upgradeOverlay.querySelector(".mobile-overlay-body").prepend(upgradeSlots);
  }

  function applyCanvasTransform() {
    const canvas = document.getElementById("components");
    const panel = document.querySelector(".components-panel");
    if (!canvas || !panel) return;
    const scaledWidth = canvas.scrollWidth * canvasState.scale;
    const scaledHeight = canvas.scrollHeight * canvasState.scale;
    if (scaledWidth <= panel.clientWidth) {
      canvasState.x = (panel.clientWidth - scaledWidth) / 2;
    } else {
      canvasState.x = Math.max(panel.clientWidth - scaledWidth - 8, Math.min(8, canvasState.x));
    }
    if (scaledHeight <= panel.clientHeight) {
      canvasState.y = (panel.clientHeight - scaledHeight) / 2;
    } else {
      canvasState.y = Math.max(panel.clientHeight - scaledHeight - 8, Math.min(8, canvasState.y));
    }
    canvas.style.transform = `translate(${canvasState.x}px, ${canvasState.y}px) scale(${canvasState.scale})`;
  }

  function resetCanvasForSelectedMech(force = false) {
    const selected = bridge.selectedMech();
    const canvas = document.getElementById("components");
    const panel = document.querySelector(".components-panel");
    if (!selected || !canvas || !panel) return;
    if (!force && canvasState.initializedForMech === selected.id) return applyCanvasTransform();
    canvasState.initializedForMech = selected.id;
    const fitScale = Math.min(MAX_CANVAS_SCALE, Math.max(0.32, (panel.clientHeight - 12) / Math.max(1, canvas.scrollHeight)));
    canvasState.scale = fitScale;
    canvasState.x = (panel.clientWidth - canvas.scrollWidth * fitScale) / 2;
    canvasState.y = 6;
    applyCanvasTransform();
  }

  function setupCanvasGestures() {
    const panel = document.querySelector(".components-panel");
    if (!panel || panel.dataset.mobileGesturesBound) return;
    panel.dataset.mobileGesturesBound = "true";
    panel.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      canvasState.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
      if (canvasState.pointers.size === 1) {
        canvasState.gesture = { type: "pan", startX: canvasState.x, startY: canvasState.y, moved: false };
      } else if (canvasState.pointers.size === 2) {
        const [a, b] = [...canvasState.pointers.values()];
        canvasState.gesture = {
          type: "pinch",
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          scale: canvasState.scale,
          midpointX: (a.x + b.x) / 2,
          midpointY: (a.y + b.y) / 2,
          originX: canvasState.x,
          originY: canvasState.y,
          moved: true,
        };
      }
    });
    panel.addEventListener("pointermove", (event) => {
      const pointer = canvasState.pointers.get(event.pointerId);
      if (!pointer || !canvasState.gesture) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (canvasState.gesture.type === "pinch" && canvasState.pointers.size >= 2) {
        for (const pointerId of canvasState.pointers.keys()) {
          if (!panel.hasPointerCapture?.(pointerId)) panel.setPointerCapture?.(pointerId);
        }
        const [a, b] = [...canvasState.pointers.values()];
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const nextScale = Math.max(0.28, Math.min(MAX_CANVAS_SCALE, canvasState.gesture.scale * distance / Math.max(1, canvasState.gesture.distance)));
        const midpointX = (a.x + b.x) / 2;
        const midpointY = (a.y + b.y) / 2;
        const ratio = nextScale / canvasState.gesture.scale;
        canvasState.x = midpointX - (canvasState.gesture.midpointX - canvasState.gesture.originX) * ratio;
        canvasState.y = midpointY - (canvasState.gesture.midpointY - canvasState.gesture.originY) * ratio;
        canvasState.scale = nextScale;
        panel.classList.add("mobile-panning");
        event.preventDefault();
        applyCanvasTransform();
        return;
      }
      const dx = pointer.x - pointer.startX;
      const dy = pointer.y - pointer.startY;
      if (Math.hypot(dx, dy) < 6 && !canvasState.gesture.moved) return;
      if (!panel.hasPointerCapture?.(event.pointerId)) panel.setPointerCapture?.(event.pointerId);
      canvasState.gesture.moved = true;
      canvasState.x = canvasState.gesture.startX + dx;
      canvasState.y = canvasState.gesture.startY + dy;
      panel.classList.add("mobile-panning");
      event.preventDefault();
      applyCanvasTransform();
    }, { passive: false });
    const finishPointer = (event) => {
      if (canvasState.gesture?.moved) {
        suppressCanvasClickUntil = Date.now() + 180;
      }
      canvasState.pointers.delete(event.pointerId);
      if (canvasState.pointers.size === 0) {
        canvasState.gesture = null;
        panel.classList.remove("mobile-panning");
      } else if (canvasState.pointers.size === 1) {
        const pointer = [...canvasState.pointers.values()][0];
        pointer.startX = pointer.x;
        pointer.startY = pointer.y;
        canvasState.gesture = { type: "pan", startX: canvasState.x, startY: canvasState.y, moved: true };
      }
    };
    panel.addEventListener("pointerup", finishPointer);
    panel.addEventListener("pointercancel", finishPointer);
    panel.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = panel.getBoundingClientRect();
      const pointX = event.clientX - rect.left;
      const pointY = event.clientY - rect.top;
      const nextScale = Math.max(0.28, Math.min(MAX_CANVAS_SCALE, canvasState.scale * (event.deltaY < 0 ? 1.1 : 0.9)));
      const ratio = nextScale / canvasState.scale;
      canvasState.x = pointX - (pointX - canvasState.x) * ratio;
      canvasState.y = pointY - (pointY - canvasState.y) * ratio;
      canvasState.scale = nextScale;
      applyCanvasTransform();
    }, { passive: false });
  }

  document.addEventListener("click", (event) => {
    if (Date.now() < suppressCanvasClickUntil && event.target.closest("#components")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const closeButton = event.target.closest("[data-mobile-close]");
    if (closeButton) {
      if (closeButton.dataset.mobileClose === "mobile-drawer") return toggleDrawer(false);
      return closeOverlay(document.getElementById(closeButton.dataset.mobileClose));
    }
    const action = event.target.closest("[data-mobile-action]")?.dataset.mobileAction;
    if (action === "overview") return openOverview();
    if (action === "tools") return bridge.selectedMech() ? bridge.openTools() : showMechList();
    if (action === "upgrades") return openUpgrades();
    if (action === "save") return showOverlay(saveOverlay);
    if (event.target.closest("[data-mobile-open-list]")) return showMechList();
    const mechCategory = event.target.closest("[data-mobile-mech-category]");
    if (mechCategory) {
      const category = mechCategory.dataset.mobileMechCategory;
      if (expandedMechCategories.has(category)) expandedMechCategories.delete(category);
      else expandedMechCategories.add(category);
      renderMechList();
      requestAnimationFrame(() => {
        [...mechList.querySelectorAll("[data-mobile-mech-category]")]
          .find((button) => button.dataset.mobileMechCategory === category)
          ?.focus();
      });
      return;
    }
    const mechButton = event.target.closest("[data-mobile-mech]");
    if (mechButton) {
      bridge.openFitting(mechButton.dataset.mobileMech);
      closeOverlay(mechListOverlay);
      requestAnimationFrame(() => resetCanvasForSelectedMech(true));
      return;
    }
    const categoryButton = event.target.closest("[data-mobile-picker-category]");
    if (categoryButton) {
      activePickerCategory = categoryButton.dataset.mobilePickerCategory;
      if (REMEMBERED_PICKER_CATEGORIES.includes(activePickerCategory)) {
        lastPickerCategory = activePickerCategory;
      }
      renderPicker();
      return;
    }
    const podButton = event.target.closest("[data-mobile-omnipod]");
    if (podButton) {
      bridge.replaceOmnipod(activePickerComponent, podButton.dataset.mobileOmnipod);
      closeOverlay(pickerOverlay);
      requestAnimationFrame(() => resetCanvasForSelectedMech(false));
      return;
    }
    const pickerItem = event.target.closest("[data-mobile-picker-item]");
    if (pickerItem) {
      const warning = decodeURIComponent(pickerItem.dataset.mobilePickerWarning || "");
      if (warning) {
        pickerStatus.textContent = warning;
        return;
      }
      const installed = activePickerCategory === "engine-heatsinks"
        ? bridge.installEngineHeatSink(pickerItem.dataset.mobilePickerItem)
        : bridge.install(pickerItem.dataset.mobilePickerItem, activePickerComponent);
      if (installed) {
        closeOverlay(pickerOverlay);
        requestAnimationFrame(() => resetCanvasForSelectedMech(false));
      }
      return;
    }
    const loadout = event.target.closest("[data-mobile-loadout]")?.dataset.mobileLoadout;
    if (loadout) {
      closeOverlay(saveOverlay);
      bridge.openLoadout(loadout);
    }
  });

  menuButton.addEventListener("click", () => toggleDrawer());
  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) toggleDrawer(false);
  });
  mechSearch.addEventListener("input", renderMechList);

  const components = document.getElementById("components");
  components?.addEventListener("click", (event) => {
    const engineHeatSinkControl = event.target.closest("[data-mobile-engine-heat-sink-delta]");
    if (engineHeatSinkControl) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (bridge.adjustEngineHeatSink(Number(engineHeatSinkControl.dataset.mobileEngineHeatSinkDelta))) {
        requestAnimationFrame(() => resetCanvasForSelectedMech(false));
      }
      return;
    }
    if (event.target.closest(".engine-heat-sink-box")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const emptyEngineSlot = event.target.closest("[data-empty-engine-slot]");
    if (emptyEngineSlot) {
      event.preventDefault();
      event.stopImmediatePropagation();
      pendingRemovalTap = null;
      openPicker("centre_torso", "engines");
      return;
    }
    const installed = event.target.closest("[data-loadout-item]");
    if (installed) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const [component, index] = installed.dataset.loadoutItem.split(":");
      if (installed.classList.contains("engine") || installed.classList.contains("engine-main-slot")) {
        pendingRemovalTap = null;
        openPicker(component, "engines");
      } else {
        confirmRemovalDoubleTap(`loadout:${component}:${index}`, () => {
          bridge.remove(component, Number(index));
          requestAnimationFrame(() => resetCanvasForSelectedMech(false));
        });
      }
      return;
    }
    const fixedEngine = event.target.closest(".engine-fixed-slot");
    if (fixedEngine) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPicker("centre_torso", "engines");
      return;
    }
    const omnipod = event.target.closest(".component-omnipod-card");
    if (omnipod) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const component = omnipod.closest("[data-component-drop]")?.dataset.componentDrop;
      if (component && component !== "centre_torso") openPicker(component, "omnipods");
      return;
    }
    const emptySlot = event.target.closest(
      "[data-empty-slot-component], .structure-upgrade-slot.empty-slot, .armor-upgrade-slot.empty-slot",
    );
    if (emptySlot) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const component = emptySlot.dataset.emptySlotComponent
        || emptySlot.closest("[data-component-drop]")?.dataset.componentDrop;
      if (component) openPicker(component);
    }
  }, true);

  components?.addEventListener("contextmenu", (event) => {
    if (!event.target.closest(
      "[data-mobile-engine-heat-sink-delta], .engine-heat-sink-box, .engine-main-slot, .engine-fixed-slot",
    )) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  components?.addEventListener("dragstart", (event) => event.preventDefault(), true);
  window.addEventListener("resize", () => resetCanvasForSelectedMech(true), { passive: true });
  window.addEventListener("mwolab:mobile-shared-fitting-status", (event) => {
    const message = String(event.detail?.message || "");
    sharedFittingStatus.textContent = message;
    sharedFittingStatus.hidden = !message;
    sharedFittingStatus.classList.toggle("error", event.detail?.tone === "error");
    if (message) showOverlay(mechListOverlay);
  });
  window.addEventListener("mwolab:mobile-shared-fitting-loaded", () => {
    closeOverlay(mechListOverlay);
    resetCanvasForSelectedMech(true);
    renderFittingStatus();
  });
  window.addEventListener("mwolab:language-change", (event) => {
    const nextLanguage = event.detail?.language === "en" ? "en" : "kr";
    if (nextLanguage === language) return;
    language = nextLanguage;
    document.documentElement.lang = language === "en" ? "en" : "ko";
    menuButton.setAttribute("aria-label", t("menu"));
    bottomNav.querySelector('[data-mobile-action="overview"]').textContent = t("overview");
    bottomNav.querySelector('[data-mobile-action="tools"]').textContent = t("tools");
    bottomNav.querySelector('[data-mobile-action="upgrades"]').textContent = t("upgrades");
    bottomNav.querySelector('[data-mobile-action="save"]').textContent = t("saveLoad");
    drawer.querySelector("h2").textContent = t("menu");
    drawerClose.setAttribute("aria-label", t("close"));
    drawerMechListButton.textContent = t("mechList");
    mechListOverlay.querySelector("h2").textContent = t("mechList");
    mechSearch.placeholder = t("search");
    mechSearch.setAttribute("aria-label", t("search"));
    overviewOverlay.querySelector("h2").textContent = t("overview");
    upgradeOverlay.querySelector("h2").textContent = t("upgrades");
    saveOverlay.querySelector("h2").textContent = t("saveLoad");
    [mechListOverlay, pickerOverlay, overviewOverlay, upgradeOverlay, saveOverlay].forEach((overlay) => {
      const close = overlay.querySelector(".mobile-overlay-close");
      if (close) close.textContent = t("close");
    });
    if (toolsClose) toolsClose.textContent = t("close");
    if (!mechListOverlay.hidden) renderMechList();
    if (!pickerOverlay.hidden) renderPicker();
    if (!upgradeOverlay.hidden) renderUpgradeSlotStatus();
    renderFittingStatus();
  });

  const observer = new MutationObserver(() => {
    setupCanvasGestures();
    resetCanvasForSelectedMech(false);
    renderFittingStatus();
  });
  if (components) observer.observe(components, { childList: true, subtree: true });
  const upgradeControls = document.getElementById("upgrade-controls");
  const upgradeObserver = new MutationObserver(() => {
    if (!upgradeOverlay.hidden) renderUpgradeSlotStatus();
  });
  if (upgradeControls) upgradeObserver.observe(upgradeControls, { childList: true });

  function waitForData() {
    if (!bridge.ready()) return setTimeout(waitForData, 60);
    bridge.prepareMechList();
    setupCanvasGestures();
    if (bridge.selectedMech()) resetCanvasForSelectedMech(true);
    else showMechList();
    renderFittingStatus();
  }
  waitForData();
}());
