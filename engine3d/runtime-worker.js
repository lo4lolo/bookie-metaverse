/* 학생 코드 실행기 (Web Worker) — 화면·기록장·인터넷에 손대지 못하는 따로 떨어진 곳에서 돈다.
 * 1) acorn으로 읽고  2) 모든 함수 호출 앞에 await, 모든 함수를 async, 반복마다 쉼표(__틱), 줄마다 줄 번호(__L)
 * 3) 세계 이름(토끼·출발선…)을 변수로 넣어 실행. 명령은 postMessage로 화면(play.js)에 부탁하고 대답을 기다린다.
 */
'use strict';
(function load() {
  const libs = [['../vendor/acorn.js', 'https://cdn.jsdelivr.net/npm/acorn@8.11.3/dist/acorn.js'], ['../vendor/astring.min.js', 'https://cdn.jsdelivr.net/npm/astring@1.8.6/dist/astring.min.js']];
  for (const [local, cdn] of libs) { try { importScripts(local); } catch (e) { importScripts(cdn); } }
})();

const send = self.postMessage.bind(self);
// 잠그기: 학생 코드는 인터넷·저장소·다른 일꾼을 쓸 수 없다
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'postMessage', 'onmessage']) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (e) { /* 이미 잠김 */ }
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let line = 0, seq = 0, ticks = 0;
const waiting = new Map(), handlers = new Map();

function call(fn, who, args) {
  const id = ++seq;
  send({ t: 'call', id, fn, who, args: args.map(pack), line });
  return new Promise((ok, bad) => waiting.set(id, { ok, bad }));
}
function pack(v) {
  if (v instanceof Target) return { ref: v.이름 };
  if (Array.isArray(v)) return v.map(pack);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = pack(x); return o; }
  if (typeof v === 'function') return null;
  return v;
}

// ───── 세계 안의 것(인물·자리·물건) ─────
class Target {
  constructor(name) { this.이름 = name; }
  toString() { return this.이름; }
}
const METHODS = ['말하기', '묻기', '걷기', '길따라', '순간이동', '날기', '뛰기', '보기', '멈출때까지', '눕기', '일어나기', '숨기기', '보이기', '크기', '표정', '애니', '프레임', '색', '이름표'];
for (const m of METHODS) Target.prototype[m] = function (...a) { return call(m, this.이름, a); };

function api() {
  const g = {};
  for (const f of ['쪽', '목표', '도착', '누를때까지', '기다리기', '번쩍', '꽃가루', '카메라', '다짐', '끝내기', '고른말', '무작위', '카메라돌리기']) g[f] = (...a) => call(f, null, a);
  g.찾기 = name => new Target(String(name));
  g.따로 = fn => { if (typeof fn === 'function') run(fn); };
  g.누르면 = (t, fn) => { const key = 'click:' + t; handlers.set(key, fn); return call('누르면', null, [t]); };
  g.가까이가면 = (t, fn) => { const key = 'near:' + t; handlers.set(key, fn); return call('가까이가면', null, [t]); };
  g.__L = n => { line = n; };
  g.__틱 = () => (++ticks % 500 ? undefined : new Promise(r => setTimeout(r, 0)));   // 끝없는 반복에도 멈춤 단추가 듣게
  return g;
}

let running = 0;
function run(fn) {
  running++;
  Promise.resolve().then(fn).catch(report).finally(() => { if (--running === 0) send({ t: 'idle' }); });
}
function report(e) {
  if (e && e.__stop) return;
  send({ t: 'error', msg: korean(e), line });
}
function korean(e) {
  const m = String(e && e.message || e);
  let r;
  if ((r = m.match(/^(.+) is not defined$/))) return `'${r[1]}'(을)를 찾을 수 없어요. 이름이 맞는지, 세계에 있는지 봐 주세요.`;
  if ((r = m.match(/(\S+) is not a function/))) return `'${r[1].split('.').pop()}'(이)라는 명령은 없어요. 블록 목록에서 이름을 확인해 주세요.`;
  if ((r = m.match(/Cannot read propert(?:y|ies) of (undefined|null)/))) return '아직 없는 것의 값을 읽으려고 했어요.';
  if ((r = m.match(/Assignment to constant variable/))) return 'const로 만든 값은 바꿀 수 없어요. let을 써 보세요.';
  return m;
}

// ───── 바꾸기(await 붙이기) ─────
function stmt(expr) { return { type: 'ExpressionStatement', expression: expr }; }
function callNode(name, args) { return { type: 'CallExpression', callee: { type: 'Identifier', name }, arguments: args, optional: false }; }
function tx(node) {
  if (!node || typeof node.type !== 'string') return node;
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'type') continue;
    const v = node[k];
    if (Array.isArray(v)) node[k] = v.map(x => (x && typeof x.type === 'string' ? tx(x) : x));
    else if (v && typeof v.type === 'string') node[k] = tx(v);
  }
  switch (node.type) {
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
      node.async = true; node.generator = false; break;
    case 'CallExpression':
      return { type: 'AwaitExpression', argument: node };
    case 'ForStatement': case 'WhileStatement': case 'DoWhileStatement': case 'ForOfStatement': case 'ForInStatement': {
      const body = node.body.type === 'BlockStatement' ? node.body : { type: 'BlockStatement', body: [node.body] };
      body.body.unshift(stmt({ type: 'AwaitExpression', argument: callNode('__틱', []) }));
      node.body = body; break;
    }
    case 'BlockStatement': case 'Program': {
      const out = [];
      for (const s of node.body) {
        if (s.loc && s.type !== 'FunctionDeclaration') out.push(stmt(callNode('__L', [{ type: 'Literal', value: s.loc.start.line }])));
        out.push(s);
      }
      node.body = out; break;
    }
  }
  return node;
}
function syntaxKorean(m) {
  const map = [[/Unterminated string constant/, '따옴표(")를 닫지 않았어요'], [/Unterminated template/, '` 따옴표를 닫지 않았어요'],
    [/Unexpected token/, '여기에 생각하지 못한 글자가 있어요(괄호·쉼표·따옴표를 확인)'], [/Unexpected character/, '코드에 쓸 수 없는 글자예요'],
    [/Identifier '(.+)' has already been declared/, "'$1'(을)를 두 번 만들었어요"], [/Unexpected keyword/, '이 자리에 쓸 수 없는 낱말이에요'],
    [/Assigning to rvalue/, '값을 넣을 수 없는 곳에 = 를 썼어요']];
  for (const [re, k] of map) if (re.test(m)) return m.replace(/\s*\(\d+:\d+\)$/, '').replace(re, k);
  return m;
}

addEventListener('message', async ev => {
  const d = ev.data;
  if (d.t === 'ret') {
    const w = waiting.get(d.id); if (!w) return; waiting.delete(d.id);
    if (d.error) w.bad(new Error(d.error)); else w.ok(d.value);
    return;
  }
  if (d.t === 'event') {
    const fn = handlers.get(d.key); if (fn) run(fn);
    return;
  }
  if (d.t === 'run') {
    let code;
    try {
      const ast = acorn.parse(d.code, { ecmaVersion: 2022, sourceType: 'script', locations: true, allowReturnOutsideFunction: true });
      code = astring.generate(tx(ast));
    } catch (e) {
      send({ t: 'syntax', msg: syntaxKorean(e.message), line: e.loc ? e.loc.line : 0, col: e.loc ? e.loc.column : 0 });
      return;
    }
    const g = api();
    const valid = n => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(n) && !(n in g);
    const names = [...new Set(d.names.filter(valid))];
    const params = [...Object.keys(g), ...names], values = [...Object.values(g), ...names.map(n => new Target(n))];
    let fn;
    try { fn = new AsyncFunction(...params, code); }
    catch (e) { send({ t: 'syntax', msg: syntaxKorean(e.message), line: 0 }); return; }
    send({ t: 'started' });
    run(() => fn(...values).then(() => send({ t: 'main-done' })));
  }
});
