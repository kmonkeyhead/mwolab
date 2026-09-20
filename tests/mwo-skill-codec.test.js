const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const codec = require('../public/mwo-skill-codec.js');
const skills = require('../public/data/skills.json');
const source = fs.readFileSync(path.join(__dirname, 'fixtures/mwoskill2-skill-map.js'));
const oracle = vm.runInNewContext(source.toString() + ';({mapping:MwoSkillMapping_A, codec:MwoSkillImporter})');
const html = fs.readFileSync(path.join(__dirname, 'fixtures/mwoskill2-index.html'), 'utf8');
const localization = require('../public/data/localization.json');
const localized = new Map(Object.entries(localization).map(([k,v]) => [k.toLowerCase(),v]));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const localNames = skills.categories.flatMap(c => c.nodes.map(n => n.name));
const labels = new Map(localNames.map(name => [norm(localized.get(('EMechTreeNode_'+name).toLowerCase())),name]));
const externalNames = new Map([...html.matchAll(/<div class="node[^\"]*" id="([^"]+)"([^>]*)>\s*<div class="label">([\s\S]*?)<\/div>(?:\s*<div class="enum">([^<]+)<\/div>)?/g)]
  .map(m => [m[1],labels.get(norm(m[3].replace(/<[^>]*>/g,' ')+' '+(m[4]||'')))]));

test('게임 스킬 비트 매핑은 원문의 명시 인덱스와 239개 현지화 이름을 대조한다', () => {
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),codec.sourceSha256);
  assert.equal(externalNames.size,239);
  assert.equal(new Set(codec.nodes.filter(Boolean)).size,239);
  assert.deepEqual(codec.nodes.filter(Boolean).sort(),localNames.sort());
  assert.equal(codec.nodes[232],null);
  for(const [index,id] of Object.entries(oracle.mapping)) {
    const name=externalNames.get(id);
    assert.ok(name,id);
    assert.equal(codec.nodes[Number(index)],name);
    const expected=oracle.codec.serialize(new Set([id]));
    assert.equal(codec.encode(new Set([name])),expected,name);
    assert.deepEqual([...codec.decode(expected)],[name]);
  }
});

test('빈 선택·전체·혼합 코드는 공개 게임 호환 serializer와 가역 대응한다', () => {
  const selections=[[],Object.keys(oracle.mapping),Object.keys(oracle.mapping).filter((_,i)=>i%3===0)];
  for(const indices of selections) {
    const ids=indices.map(i=>oracle.mapping[i]), names=ids.map(id=>externalNames.get(id));
    const code=oracle.codec.serialize(ids);
    assert.equal(codec.encode(new Set(names)),code);
    assert.deepEqual([...codec.decode(code)].sort(),names.sort());
    assert.deepEqual([...codec.decode(' '+code[0]+code.slice(1).toUpperCase()+'\n')].sort(),names.sort());
  }
  assert.equal(codec.encode(new Set(localNames)),'a'+'f'.repeat(58)+'7f');
});

test('형식·버전·길이·미지원 비트 오류를 거부하고 노드를 조용히 버리지 않는다', () => {
  const zero='a'+'0'.repeat(60);
  for(const code of ['',zero.slice(1),zero+'0','A'+zero.slice(1),'b'+zero.slice(1),zero.slice(0,-1)+'g',zero.slice(0,4)+' '+zero.slice(5)]) {
    assert.throws(()=>codec.decode(code),/format/);
  }
  assert.throws(()=>codec.decode('a'+'0'.repeat(58)+'80'),/unsupported-bit/);
  assert.throws(()=>codec.encode(new Set(['not-a-node'])),/unknown-node/);
});
