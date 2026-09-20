(function (root) {
  "use strict";

  function createGraph(categories, topology) {
    const nodes = new Map(), groups = new Map(), adjacent = new Map();
    for (const category of categories) for (const node of category.nodes || []) {
      if (nodes.has(node.name)) throw new Error(`Duplicate skill node: ${node.name}`);
      nodes.set(node.name, { ...node, categoryKey: category.key });
      adjacent.set(node.name, []);
      const key = `${category.key}:${node.subcategory}`;
      if (!groups.has(key)) groups.set(key, { key, category: category.key, subcategory: node.subcategory, ids: [] });
      groups.get(key).ids.push(node.name);
    }
    const parents = new Map();
    for (const [parent, child] of topology.edges) {
      if (!nodes.has(parent) || !nodes.has(child) || parents.has(child)) throw new Error("Invalid skill parent table");
      parents.set(child, parent);
      adjacent.get(parent).push(child);
      adjacent.get(child).push(parent);
    }
    const roots = new Set(topology.roots);
    if (roots.size !== topology.roots.length) throw new Error("Duplicate skill root");
    for (const id of roots) if (!nodes.has(id) || parents.has(id)) throw new Error("Invalid skill root");
    for (const id of nodes.keys()) {
      const seen = new Set();
      let at = id;
      while (parents.has(at)) {
        if (seen.has(at)) throw new Error("Cyclic skill table");
        seen.add(at); at = parents.get(at);
      }
      if (!roots.has(at)) throw new Error(`Unmapped skill root: ${at}`);
    }
    for (const id of topology.mechlabPreset) if (!nodes.has(id)) throw new Error(`Unknown preset node: ${id}`);

    function connected(selection) {
      const reachable = new Set([...roots].filter(id => selection.has(id))), queue = [...reachable];
      for (let i = 0; i < queue.length; i++) for (const next of adjacent.get(queue[i])) {
        if (selection.has(next) && !reachable.has(next)) { reachable.add(next); queue.push(next); }
      }
      return reachable;
    }
    function path(starts, target) {
      const previous = new Map(), queue = [];
      for (const id of starts) if (nodes.has(id) && !previous.has(id)) { previous.set(id, null); queue.push(id); }
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        if (id === target) {
          const result = [];
          for (let at = id; at !== null; at = previous.get(at)) result.push(at);
          return result.reverse();
        }
        for (const next of adjacent.get(id)) if (!previous.has(next)) { previous.set(next, id); queue.push(next); }
      }
      return null;
    }
    function include(selection, ids) {
      const next = connected(selection);
      for (const id of ids) {
        if (!nodes.has(id)) continue;
        for (let at = id; at; at = parents.get(at)) next.add(at);
      }
      return next;
    }
    function toggle(selection, id) {
      const next = connected(selection);
      if (!nodes.has(id)) return next;
      if (next.has(id)) { next.delete(id); return connected(next); }
      for (const at of path(next, id) || path(roots, id) || []) next.add(at);
      return next;
    }
    function toggleGroup(selection, key, enabled) {
      const group = groups.get(key);
      if (!group) return connected(selection);
      if (enabled) return include(selection, group.ids);
      const next = new Set(selection);
      group.ids.forEach(id => next.delete(id));
      return connected(next);
    }
    function preset(mode, selection) {
      if (mode === "none") return new Set();
      if (mode === "all") return new Set(nodes.keys());
      if (mode === "mechlab") return include(new Set(), topology.mechlabPreset);
      return connected(selection);
    }
    return { nodes, groups, edges: topology.edges, roots, connected, path, toggle, toggleGroup, preset };
  }

  // Layout only: node placement comes from extracted column/row fields.
  // The compact Firepower lanes preserve the approved screenshot composition.
  const firepowerLayout = {
    Cooldown: [24, 148], Range: [218, 148], HeatGen: [412, 148], Velocity: [606, 148],
    LaserDuration: [800, 148], FlamerVentilation: [994, 148], MagazineCapacity: [606, 473],
    LBXSpread: [800, 473], GaussCharge: [606, 737], UACJamChance: [800, 737],
    MissileRack: [994, 403], MissileSpread: [994, 667], HighExplosive: [994, 971],
  };
  function layout(graph, categories) {
    const sections = [
      { key: "firepower", x: 0, y: 0, w: 1200, h: 1110 },
      { key: "survival", x: 1300, y: 0, w: 1090, h: 700 },
      { key: "mobility", x: 2470, y: 0, w: 1040, h: 1100 },
      { key: "jumpjets", x: 0, y: 1210, w: 530, h: 850 },
      { key: "operations", x: 650, y: 1210, w: 790, h: 760 },
      { key: "sensors", x: 1550, y: 1210, w: 790, h: 960 },
      { key: "auxiliary", x: 2470, y: 1210, w: 890, h: 860 },
    ].filter(s => categories.some(c => c.key === s.key));
    const positions = new Map(), controls = new Map();
    for (const section of sections) {
      const category = categories.find(c => c.key === section.key);
      const minColumn = Math.min(...category.nodes.map(n => n.column));
      for (const node of category.nodes) {
        let x, y;
        if (section.key === "firepower" && firepowerLayout[node.subcategory]) {
          const group = graph.groups.get(`${section.key}:${node.subcategory}`);
          const peers = group.ids.map(id => graph.nodes.get(id));
          const minCol = Math.min(...peers.map(n => n.column)), minRow = Math.min(...peers.map(n => n.row));
          const [left, top] = firepowerLayout[node.subcategory];
          // Original grid's even columns sit half a row lower, as in the in-game reference.
          const offsets = peers.map(n => (n.row - minRow) * 86 + (n.column % 2 === 0 ? 43 : 0));
          x = left + (node.column - minCol) * 77;
          y = top + (node.row - minRow) * 86 + (node.column % 2 === 0 ? 43 : 0) - Math.min(...offsets);
          controls.set(group.key, { x: left, y: top - 32, w: 180 });
        } else {
          x = section.x + 24 + (node.column - minColumn) * 92;
          y = section.y + 106 + node.row * 96 + (node.column % 2 === 0 ? 48 : 0);
        }
        positions.set(node.name, { x, y });
      }
      if (section.key !== "firepower") {
        const bottom = Math.max(...category.nodes.map(n => positions.get(n.name).y + 72)) + 28;
        let index = 0;
        for (const group of graph.groups.values()) if (group.category === section.key) {
          const y = bottom + Math.floor(index / 2) * 34;
          controls.set(group.key, { x: section.x + 24 + (index % 2) * (section.w - 48) / 2, y, w: (section.w - 60) / 2 });
          section.h = Math.max(section.h, y - section.y + 46); index++;
        }
      }
    }
    return { sections, positions, controls, width: 3560, height: Math.max(...sections.map(s => s.y + s.h)) + 20 };
  }

  function createView(host, graph, categories, handlers) {
    const geometry = layout(graph, categories);
    host.innerHTML = `<div class="skill-tree-toolbar"><span data-tree-context></span><button type="button" data-tree-fit></button></div><div class="skill-tree-stage"><div class="skill-tree-viewport"><div class="skill-tree-world"><svg class="skill-tree-links" aria-hidden="true"></svg><div class="skill-tree-nodes"></div></div></div><aside class="skill-tree-summary"><div class="skill-tree-allocated" aria-live="polite"><span data-tree-count-label></span><strong><span data-tree-count></span> / 91</strong></div><h3 data-tree-effects-label></h3><div class="skill-tree-effects-scroll"><div class="skill-tree-effects mech-summary-quirks"></div><p data-tree-empty></p></div></aside><div class="skill-tree-hint"></div></div>`;
    const viewport = host.querySelector('.skill-tree-viewport'), world = host.querySelector('.skill-tree-world');
    const layer = host.querySelector('.skill-tree-nodes'), svg = host.querySelector('svg');
    world.style.width = geometry.width + 'px'; world.style.height = geometry.height + 'px';
    svg.setAttribute('width', geometry.width); svg.setAttribute('height', geometry.height);
    const buttons = new Map(), controls = new Map(), headings = new Map();
    const color = n => ({ 1: '#aa79db', 2: '#f0dd3f', 3: '#50c5a7', 4: '#d9884e' }[n.color_type] || '#39c5ed');
    function button(className, label) { const el = document.createElement('button'); el.type = 'button'; el.className = className; el.textContent = label; return el; }
    for (const section of geometry.sections) {
      const el = document.createElement('h3'); el.className = 'skill-tree-heading';
      Object.assign(el.style, { left: section.x + 24 + 'px', top: section.y + 8 + 'px', width: section.w - 48 + 'px' });
      layer.append(el); headings.set(section.key, el);
    }
    for (const [id, node] of graph.nodes) {
      const el = button('skill-tree-node', ''); const pos = geometry.positions.get(id);
      el.dataset.skillNode = id; el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; el.style.setProperty('--skill-color', color(node));
      const label = document.createElement('span'), reason = document.createElement('span'), value = document.createElement('b');
      label.className = 'skill-tree-node-name'; reason.className = 'skill-tree-node-reason'; reason.hidden = true;
      el.append(label, reason, value); layer.append(el); buttons.set(id, el);
    }
    const lines = graph.edges.map(([from, to]) => {
      const a = geometry.positions.get(from), b = geometry.positions.get(to), el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      for (const [key, value] of Object.entries({ x1: a.x + 41, y1: a.y + 36, x2: b.x + 41, y2: b.y + 36 })) el.setAttribute(key, value);
      el.style.setProperty('--skill-color', color(graph.nodes.get(from))); svg.append(el); return { el, from, to };
    });
    for (const [key, group] of graph.groups) {
      const pos = geometry.controls.get(key); if (!pos) continue;
      const label = document.createElement('label'), input = document.createElement('input'), text = document.createElement('span');
      label.className = 'skill-tree-group'; Object.assign(label.style, { left: pos.x + 'px', top: pos.y + 'px', width: pos.w + 'px' });
      input.type = 'checkbox'; input.dataset.skillGroup = key; label.append(input, text); layer.append(label); controls.set(key, { input, text, group });
    }
    let model = null, camera = { x: 0, y: 0, scale: 1 }, fitKey = 'firepower', fitting = true, drag = null, suppressClick = false;
    function renderCamera() { world.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`; }
    function canvasWidth() { return Math.max(100, viewport.clientWidth - host.querySelector('.skill-tree-summary').offsetWidth - 32); }
    function fit(key = fitKey) {
      if (!viewport.clientWidth || !viewport.clientHeight) return;
      fitKey = key; fitting = true;
      const bounds = geometry.sections.find(s => s.key === key) || { x: 0, y: 0, w: geometry.width, h: geometry.height };
      camera.scale = Math.max(.02, Math.min(1.2, (canvasWidth() - 32) / bounds.w, (viewport.clientHeight - 48) / bounds.h));
      camera.x = (canvasWidth() - bounds.w * camera.scale) / 2 - bounds.x * camera.scale;
      camera.y = (viewport.clientHeight - bounds.h * camera.scale) / 2 - bounds.y * camera.scale;
      renderCamera();
    }
    function zoom(factor, x, y) {
      const next = Math.max(.02, Math.min(2.5, camera.scale * factor)), ratio = next / camera.scale;
      camera.x = x - (x - camera.x) * ratio; camera.y = y - (y - camera.y) * ratio; camera.scale = next; fitting = false; renderCamera();
    }
    function update(next) {
      model = next;
      host.querySelector('[data-tree-context]').textContent = model.context;
      host.querySelector('[data-tree-fit]').textContent = model.fit;
      viewport.setAttribute('aria-label', model.hint);
      host.querySelector('.skill-tree-hint').textContent = model.hint;
      host.querySelector('[data-tree-count-label]').textContent = model.countLabel;
      host.querySelector('[data-tree-count]').textContent = model.count;
      host.querySelector('[data-tree-count]').classList.toggle('over-limit', model.count > 91);
      host.querySelector('[data-tree-effects-label]').textContent = model.effectsLabel;
      const effects = host.querySelector('.skill-tree-effects');
      // Produced by the app's existing escaped quirk-row renderer.
      effects.innerHTML = model.effectsHtml;
      const empty = host.querySelector('[data-tree-empty]'); empty.textContent = model.noEffects; empty.hidden = model.hasEffects;
      for (const [key, el] of headings) el.textContent = model.categoryLabel(key);
      for (const [id, el] of buttons) {
        const data = model.nodeInfo(id); el.querySelector('.skill-tree-node-name').textContent = data.label; el.querySelector('b').textContent = data.value;
        const reason = el.querySelector('.skill-tree-node-reason'), reasonText = data.reason || model.unavailable;
        reason.textContent = data.available ? '' : '! ' + reasonText; reason.hidden = data.available;
        el.setAttribute('aria-pressed', String(model.selected.has(id))); el.classList.toggle('skill-unavailable', !data.available);
        el.setAttribute('aria-label', data.label + ', ' + data.value + (data.available ? '' : ', ' + reasonText));
        el.title = data.description + '\n' + data.effects.join('\n') + (data.available ? '' : '\n! ' + reasonText);
      }
      for (const { el, from, to } of lines) el.classList.toggle('active', model.selected.has(from) && model.selected.has(to));
      for (const { input, text, group } of controls.values()) {
        text.textContent = model.groupLabel(group); input.setAttribute('aria-label', model.groupLabel(group) + ' · ' + model.selectGroup);
        input.checked = group.ids.every(id => model.selected.has(id)); input.indeterminate = false;
      }
    }
    host.addEventListener('click', event => {
      if (suppressClick) { suppressClick = false; return; }
      const node = event.target.closest('[data-skill-node]');
      if (node) { handlers.onNode(node.dataset.skillNode); return; }
      if (event.target.closest('[data-tree-fit]')) { fit('all'); return; }
    });
    host.addEventListener('change', event => { const input = event.target.closest('[data-skill-group]'); if (input) handlers.onGroup(input.dataset.skillGroup, input.checked); });
    layer.addEventListener('focusin', event => {
      const el = event.target.closest('[data-skill-node],label,button,input'); if (!el) return;
      const a = el.getBoundingClientRect(), b = viewport.getBoundingClientRect(), right = b.left + canvasWidth();
      if (a.left < b.left || a.right > right || a.top < b.top || a.bottom > b.bottom) {
        camera.x += (b.left + right - a.left - a.right) / 2; camera.y += (b.top + b.bottom - a.top - a.bottom) / 2; fitting = false; renderCamera();
      }
    });
    viewport.addEventListener('wheel', event => { event.preventDefault(); const box = viewport.getBoundingClientRect(); zoom(Math.exp(-event.deltaY * .0015), event.clientX - box.left, event.clientY - box.top); }, { passive: false });
    viewport.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('input,label')) return;
      suppressClick = false; drag = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y, moved: false };
    });
    viewport.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 4 && !drag.moved) { drag.moved = true; viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging'); }
      if (drag.moved) { camera.x = drag.cx + dx; camera.y = drag.cy + dy; fitting = false; renderCamera(); }
    });
    function end(event) {
      if (!drag || event.pointerId !== drag.id) return;
      suppressClick = drag.moved; drag = null; viewport.classList.remove('dragging');
      if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    }
    viewport.addEventListener('pointerup', end); viewport.addEventListener('pointercancel', end);
    viewport.addEventListener('lostpointercapture', () => { drag = null; viewport.classList.remove('dragging'); });
    const observer = new ResizeObserver(() => { if (fitting) fit(); }); observer.observe(viewport);
    return { update, fit: () => fit(), destroy: () => observer.disconnect() };
  }
  const api = Object.freeze({ createGraph, createView, layout });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MwoLabSkillTree = api;
}(globalThis));
