const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGraph } = require('../public/skill-tree.js');
const topology = require('../public/skill-tree-topology.js');
const skills = require('../public/data/skills.json');
const graph = createGraph(skills.categories, topology);

test('연결표는 저장된 외부 parent 속성과 게임 현지화의 일대일 대응만 사용한다', () => {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures/mwoskill2-index.html'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), topology.sourceSha256);
  const localization = require('../public/data/localization.json');
  const lookup = new Map(Object.entries(localization).map(([key, value]) => [key.toLowerCase(), value]));
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const labels = new Map([...graph.nodes].map(([id]) => [norm(lookup.get(('EMechTreeNode_' + id).toLowerCase())), id]));
  const external = [...source.toString().matchAll(/<div class="node[^\"]*" id="([^"]+)"([^>]*)>\s*<div class="label">([\s\S]*?)<\/div>(?:\s*<div class="enum">([^<]+)<\/div>)?/g)]
    .map(m => ({ id: m[1], parent: m[2].match(/parent="([^"]+)"/)?.[1], label: m[3].replace(/<[^>]*>/g, ' ') + ' ' + (m[4] || '') }));
  const names = new Map(external.map(n => [n.id, labels.get(norm(n.label))]));
  assert.equal(external.length, skills.node_count);
  assert.equal(new Set(names.values()).size, graph.nodes.size);
  assert.ok([...names.values()].every(Boolean));
  assert.deepEqual(topology.edges, external.filter(n => n.parent).map(n => [names.get(n.parent), names.get(n.id)]));
  assert.deepEqual(topology.roots, external.filter(n => !n.parent).map(n => names.get(n.id)));
});

test('모든 노드 경로와 중간 연결 단절을 명시 parent 표로 검증한다', () => {
  const parents = new Map(topology.edges.map(([a, b]) => [b, a]));
  const chain = id => { const result = []; for (let at = id; at; at = parents.get(at)) result.push(at); return result; };
  for (const id of graph.nodes.keys()) {
    const selected = graph.toggle(new Set(), id);
    assert.deepEqual([...selected].sort(), chain(id).sort(), id);
    for (const cut of chain(id)) {
      assert.deepEqual([...graph.toggle(selected, cut)].sort(), chain(cut).filter(n => n !== cut).sort(), `${id}/${cut}`);
    }
  }
});

test('Range 마지막 노드와 교차 묶음 분기의 최단경로를 선택한다', () => {
  const range = graph.toggle(new Set(), 'Range15');
  assert.equal(range.size, 15);
  const cut = graph.toggle(range, 'Range8');
  assert.equal(cut.size, 7);
  assert.equal(graph.toggle(cut, 'Range15').size, 15);
  let selected = graph.toggle(new Set(), 'SpeedTweak5');
  assert.equal(selected.size, 8);
  selected = graph.toggle(selected, 'SpeedTweak1');
  assert.equal(selected.size, 9);
  assert.ok(selected.has('KineticBurst4'));
  selected = graph.toggle(selected, 'KineticBurst4');
  assert.equal(selected.size, 3);
});

test('묶음 토글은 선행 경로를 포함하고 해제 후 고립 노드를 제거한다', () => {
  assert.equal(graph.groups.size, 55);
  for (const group of graph.groups.values()) {
    const selected = graph.toggleGroup(new Set(), group.key, true);
    assert.ok(group.ids.every(id => selected.has(id)), group.key);
    assert.deepEqual(graph.connected(selected), selected);
    const cleared = graph.toggleGroup(selected, group.key, false);
    assert.ok(group.ids.every(id => !cleared.has(id)), group.key);
    assert.deepEqual(graph.connected(cleared), cleared);
  }
  const ecm = graph.toggleGroup(new Set(), 'sensors:EnhancedECM', true);
  assert.ok(ecm.has('SensorRange5'));
  assert.equal(graph.toggleGroup(ecm, 'sensors:SensorRange', false).size, 0);
});

test('계산용 프리셋은 91개 상한 없이 전체와 기존 추천 노드를 보존한다', () => {
  const all = graph.preset('all', new Set()), recommended = graph.preset('mechlab', all);
  assert.equal(all.size, 239); assert.equal(recommended.size, 95);
  assert.deepEqual(new Set(topology.mechlabPreset), recommended);
  assert.equal(graph.toggle(all, 'Range15').size, 238);
  assert.deepEqual(graph.preset('custom', all), all);
});

test('연결 누락이나 순환은 좌표로 복원하지 않고 오류로 거부한다', () => {
  assert.throws(() => createGraph(skills.categories, { ...topology, roots: [] }), /Unmapped/);
  assert.throws(() => createGraph(skills.categories, { ...topology, edges: [...topology.edges, ['Range15', 'Range1']] }), /root/);
});
