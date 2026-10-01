/* 블록 ↔ 자바스크립트 — 세계 만들기의 🧩 블록 탭.
 * 진짜 자료는 글(world.code). 블록 탭을 열면 글을 읽어(acorn) 블록을 만들고, 블록을 고치면 글을 다시 쓴다.
 * 아는 모양은 블록으로, 모르는 줄은 "코드" 블록으로(지워지지 않음), 주석은 "메모" 블록으로.
 * 필요: window.Blockly(blockly_compressed + msg/ko), window.acorn
 */
const B = () => window.Blockly;
export const ctx = { actors: [], targets: [], paths: [], extra: new Set() };   // 드롭다운에 보일 이름들

const C = { say: '#e2a03a', move: '#5d8fc4', look: '#9a6fcf', obj: '#6f9d52', flow: '#d9634f', fx: '#d6739b', calc: '#4f9d98', vars: '#c47f2e', func: '#8a6a4a', raw: '#8c8c8c' };
const uniq = a => [...new Set(a.filter(Boolean))];
function opts(list, fallback) { const l = uniq(list); return (l.length ? l : [fallback]).map(n => [n, n]); }
const actorOpts = () => opts([...ctx.actors, '나', ...ctx.extra], '나');
const sayOpts = () => opts(['이야기', ...ctx.actors, '나', ...ctx.extra], '이야기');
const targetOpts = () => opts([...ctx.targets, '나', ...ctx.extra], '나');
const pathOpts = () => opts([...ctx.paths, ...ctx.extra], '길');
const dd = (name, gen) => ({ type: 'field_dropdown', name, options: gen });

let defined = false;
export function defineBlocks() {
  if (defined) return; defined = true;
  const defs = [
    { type: 'rt_start', message0: '▶ 시작하면', nextStatement: null, colour: C.flow, deletable: false, tooltip: '여기 아래에 붙인 블록이 차례대로 실행돼요' },
    // 말
    { type: 'rt_say', message0: '%1 말하기 %2', args0: [dd('WHO', sayOpts), { type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.say },
    { type: 'rt_ask_s', message0: '%1 묻기 %2 보기 %3 %4 %5 %6', args0: [dd('WHO', sayOpts), { type: 'input_value', name: 'Q' }, { type: 'field_input', name: 'O1', text: '네' }, { type: 'field_input', name: 'O2', text: '' }, { type: 'field_input', name: 'O3', text: '' }, { type: 'field_input', name: 'O4', text: '' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.say, tooltip: '보기는 비워 두면 안 나와요' },
    { type: 'v_ask', message0: '%1 묻기 %2 보기 %3 %4 %5 %6', args0: [dd('WHO', sayOpts), { type: 'input_value', name: 'Q' }, { type: 'field_input', name: 'O1', text: '네' }, { type: 'field_input', name: 'O2', text: '아니요' }, { type: 'field_input', name: 'O3', text: '' }, { type: 'field_input', name: 'O4', text: '' }], inputsInline: true, output: null, colour: C.say, tooltip: '고른 보기의 번호(1, 2, 3…)가 돼요' },
    { type: 'v_chosen', message0: '고른 말', output: null, colour: C.say },
    { type: 'rt_promise', message0: '다짐 %1', args0: [{ type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.say },
    // 움직임
    { type: 'rt_walk', message0: '%1 %2 까지 걷기 빠르기 %3', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'T' }, { type: 'input_value', name: 'SPEED' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.move },
    { type: 'rt_path', message0: '%1 %2 따라 %3 %%에서 %4 %%까지 빠르기 %5', args0: [dd('WHO', actorOpts), dd('PATH', pathOpts), { type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }, { type: 'input_value', name: 'SPEED' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.move, tooltip: '길의 처음이 0%, 끝이 100%' },
    { type: 'rt_tmove', message0: '%1 %2 %3', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'T' }, dd('CMD', () => [['(으)로 순간이동', '순간이동'], ['(으)로 날아가기', '날기']])], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.move },
    { type: 'rt_jump', message0: '%1 %2 만큼 뛰기', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'N' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.move },
    { type: 'rt_wait_actor', message0: '%1 멈출 때까지 기다리기', args0: [dd('WHO', actorOpts)], previousStatement: null, nextStatement: null, colour: C.move },
    // 모습
    { type: 'rt_look', message0: '%1 %2 보기', args0: [dd('WHO', actorOpts), dd('DIR', () => [['앞', '앞'], ['뒤', '뒤'], ['왼쪽', '왼쪽'], ['오른쪽', '오른쪽']])], previousStatement: null, nextStatement: null, colour: C.look },
    { type: 'rt_simple', message0: '%1 %2', args0: [dd('WHO', actorOpts), dd('CMD', () => [['눕기', '눕기'], ['일어나기', '일어나기'], ['숨기', '숨기기'], ['보이기', '보이기']])], previousStatement: null, nextStatement: null, colour: C.look },
    { type: 'rt_size', message0: '%1 크기를 %2 배로', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'N' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.look },
    { type: 'rt_emote', message0: '%1 머리 위에 %2 띄우기', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.look },
    { type: 'rt_anim', message0: '%1 움직임 %2', args0: [dd('WHO', actorOpts), dd('ANIM', () => ['자동', '서기', '걷기', '깡충', '빙글', '흔들'].map(n => [n, n]))], previousStatement: null, nextStatement: null, colour: C.look, tooltip: '자동 = 걸을 때만 걷는 그림' },
    { type: 'rt_frame', message0: '%1 그림을 %2 번으로', args0: [dd('WHO', actorOpts), { type: 'input_value', name: 'N' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.look, tooltip: '0 서기 · 1 걷기1 · 2 걷기2 (움직임은 멈춤)' },
    // 물건
    { type: 'rt_ocolor', message0: '%1 색을 %2 로', args0: [{ type: 'input_value', name: 'T' }, { type: 'field_colour', name: 'COLOR', colour: '#ffe27a' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.obj },
    { type: 'rt_olabel', message0: '%1 이름표 %2', args0: [{ type: 'input_value', name: 'T' }, { type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.obj },
    { type: 'rt_oshow', message0: '%1 %2', args0: [{ type: 'input_value', name: 'T' }, dd('CMD', () => [['숨기기', '숨기기'], ['보이기', '보이기']])], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.obj },
    { type: 'v_find', message0: '이름이 %1 인 것', args0: [{ type: 'input_value', name: 'NAME' }], inputsInline: true, output: null, colour: C.obj },
    // 흐름
    { type: 'rt_page', message0: '📖 새 쪽 %1', args0: [{ type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow, tooltip: '이어 읽기는 쪽 단위로 저장돼요' },
    { type: 'rt_goal', message0: '🎯 목표 %1 표시할 곳 %2', args0: [{ type: 'input_value', name: 'TEXT' }, { type: 'input_value', name: 'T' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_arrive', message0: '%1 에 도착할 때까지 기다리기 (거리 %2)', args0: [{ type: 'input_value', name: 'T' }, { type: 'input_value', name: 'N' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_waitclick', message0: '%1 을(를) 누를 때까지 기다리기', args0: [{ type: 'input_value', name: 'T' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_wait', message0: '%1 초 기다리기', args0: [{ type: 'input_value', name: 'N' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_apart', message0: '따로 하기 (기다리지 않고 함께)', message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_onclick', message0: '👆 %1 을(를) 누르면', args0: [{ type: 'input_value', name: 'T' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], inputsInline: true, colour: C.flow },
    { type: 'rt_onnear', message0: '🚶 %1 에 가까이 가면', args0: [{ type: 'input_value', name: 'T' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], inputsInline: true, colour: C.flow },
    { type: 'rt_repeat', message0: '반복 %1 를 %2 부터 %3 까지', args0: [{ type: 'field_input', name: 'VAR', text: 'i' }, { type: 'input_value', name: 'FROM' }, { type: 'input_value', name: 'TO' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_forof', message0: '%1 의 하나하나를 %2 (이)라 하고 반복', args0: [{ type: 'input_value', name: 'LIST' }, { type: 'field_input', name: 'VAR', text: '것' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_forever', message0: '계속 반복', message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_if', message0: '만약 %1 이면', args0: [{ type: 'input_value', name: 'COND' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: C.flow },
    { type: 'rt_ifelse', message0: '만약 %1 이면', args0: [{ type: 'input_value', name: 'COND' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], message2: '아니면 %1', args2: [{ type: 'input_statement', name: 'ELSE' }], previousStatement: null, nextStatement: null, colour: C.flow },
    // 연출
    { type: 'rt_flash', message0: '번쩍 글자 %1', args0: [{ type: 'input_value', name: 'TEXT' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.fx },
    { type: 'rt_confetti', message0: '%1 에 꽃가루', args0: [{ type: 'input_value', name: 'T' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.fx },
    { type: 'rt_camera', message0: '카메라가 %1 비추기', args0: [{ type: 'input_value', name: 'T' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.fx },
    { type: 'rt_end', message0: '🏁 이야기 끝 · 포인트 %1 돌 %2 스티커 %3', args0: [{ type: 'field_number', name: 'P', value: 10, min: 0, max: 100 }, { type: 'field_input', name: 'STONES', text: '' }, { type: 'field_input', name: 'STICKERS', text: '' }], previousStatement: null, nextStatement: null, colour: C.fx, tooltip: '돌·스티커가 여러 개면 쉼표로' },
    // 계산
    { type: 'v_text', message0: '%1', args0: [{ type: 'field_input', name: 'T', text: '' }], output: null, colour: C.calc },
    { type: 'v_num', message0: '%1', args0: [{ type: 'field_number', name: 'N', value: 0 }], output: null, colour: C.calc },
    { type: 'v_target', message0: '%1', args0: [dd('NAME', targetOpts)], output: null, colour: C.obj },
    { type: 'v_math', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, dd('OP', () => [['+', '+'], ['-', '-'], ['×', '*'], ['÷', '/'], ['나머지', '%']]), { type: 'input_value', name: 'B' }], inputsInline: true, output: null, colour: C.calc },
    { type: 'v_compare', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, dd('OP', () => [['=', '=='], ['≠', '!='], ['<', '<'], ['>', '>'], ['≤', '<='], ['≥', '>='], ['===', '==='], ['!==', '!==']]), { type: 'input_value', name: 'B' }], inputsInline: true, output: null, colour: C.calc },
    { type: 'v_logic', message0: '%1 %2 %3', args0: [{ type: 'input_value', name: 'A' }, dd('OP', () => [['그리고', '&&'], ['또는', '||']]), { type: 'input_value', name: 'B' }], inputsInline: true, output: null, colour: C.calc },
    { type: 'v_not', message0: '%1 아님', args0: [{ type: 'input_value', name: 'A' }], inputsInline: true, output: null, colour: C.calc },
    { type: 'v_random', message0: '무작위 %1 ~ %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], inputsInline: true, output: null, colour: C.calc },
    { type: 'v_raw', message0: '식 %1', args0: [{ type: 'field_input', name: 'CODE', text: '' }], output: null, colour: C.raw },
    // 변수·동작
    { type: 'rt_let', message0: '%1 %2 = %3', args0: [dd('KIND', () => [['변수', 'let'], ['고정값', 'const']]), { type: 'field_input', name: 'NAME', text: '점수' }, { type: 'input_value', name: 'V' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.vars },
    { type: 'rt_set', message0: '%1 을(를) %2 (으)로 바꾸기', args0: [{ type: 'field_input', name: 'NAME', text: '점수' }, { type: 'input_value', name: 'V' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.vars },
    { type: 'v_var', message0: '%1', args0: [{ type: 'field_input', name: 'NAME', text: '점수' }], output: null, colour: C.vars },
    { type: 'rt_func', message0: '🧩 동작 만들기 %1 ( %2 )', args0: [{ type: 'field_input', name: 'NAME', text: '깡충깡충' }, { type: 'field_input', name: 'PARAMS', text: '' }], message1: '%1', args1: [{ type: 'input_statement', name: 'DO' }], colour: C.func, tooltip: '괄호 안에는 받을 이름(쉼표로). 예: 누가' },
    { type: 'rt_call', message0: '동작 %1 하기 %2 %3', args0: [{ type: 'field_input', name: 'NAME', text: '깡충깡충' }, { type: 'input_value', name: 'A0' }, { type: 'input_value', name: 'A1' }], inputsInline: true, previousStatement: null, nextStatement: null, colour: C.func },
    { type: 'rt_raw', message0: '코드 %1', args0: [{ type: 'field_multilinetext', name: 'CODE', text: '' }], previousStatement: null, nextStatement: null, colour: C.raw, tooltip: '블록으로 바꾸지 못한 코드예요. 그대로 실행돼요' },
    { type: 'rt_memo', message0: '💬 %1', args0: [{ type: 'field_input', name: 'T', text: '메모' }], previousStatement: null, nextStatement: null, colour: '#bfb39c', tooltip: '설명 글(실행 안 됨)' },
  ];
  B().defineBlocksWithJsonArray(defs);
}

// ───── 도구 상자 ─────
const sh = (type, field, value) => ({ shadow: { type, fields: { [field]: value } } });
const T_ = v => sh('v_text', 'T', v), N_ = v => sh('v_num', 'N', v), G_ = v => sh('v_target', 'NAME', v);
export function toolbox() {
  const a = ctx.actors[0] || '나', t = ctx.targets[0] || '나';
  const cat = (name, colour, contents) => ({ kind: 'category', name, colour, contents: contents.map(c => ({ kind: 'block', ...c })) });
  return {
    kind: 'categoryToolbox', contents: [
      cat('말', C.say, [{ type: 'rt_say', fields: { WHO: '이야기' }, inputs: { TEXT: T_('안녕!') } }, { type: 'rt_let', fields: { NAME: '대답' }, inputs: { V: { block: { type: 'v_ask', fields: { WHO: '이야기' }, inputs: { Q: T_('어떻게 할까요?') } } } } }, { type: 'rt_ask_s', fields: { WHO: '이야기' }, inputs: { Q: T_('준비됐나요?') } }, { type: 'v_chosen' }, { type: 'rt_promise', inputs: { TEXT: T_('나는 ...') } }]),
      cat('움직임', C.move, [{ type: 'rt_walk', fields: { WHO: a }, inputs: { T: G_(t), SPEED: N_(3) } }, { type: 'rt_path', fields: { WHO: a }, inputs: { A: N_(0), B: N_(100), SPEED: N_(3) } }, { type: 'rt_tmove', fields: { WHO: a }, inputs: { T: G_(t) } }, { type: 'rt_jump', fields: { WHO: a }, inputs: { N: N_(1) } }, { type: 'rt_wait_actor', fields: { WHO: a } }]),
      cat('모습·애니', C.look, [{ type: 'rt_anim', fields: { WHO: a, ANIM: '깡충' } }, { type: 'rt_frame', fields: { WHO: a }, inputs: { N: N_(1) } }, { type: 'rt_look', fields: { WHO: a } }, { type: 'rt_simple', fields: { WHO: a } }, { type: 'rt_size', fields: { WHO: a }, inputs: { N: N_(1.5) } }, { type: 'rt_emote', fields: { WHO: a }, inputs: { TEXT: T_('😊') } }]),
      cat('물건', C.obj, [{ type: 'rt_ocolor', inputs: { T: G_(t) } }, { type: 'rt_olabel', inputs: { T: G_(t), TEXT: T_('1') } }, { type: 'rt_oshow', inputs: { T: G_(t) } }, { type: 'v_target' }, { type: 'v_find', inputs: { NAME: T_('징검돌1') } }]),
      cat('흐름', C.flow, [{ type: 'rt_page', inputs: { TEXT: T_('첫째 쪽') } }, { type: 'rt_goal', inputs: { TEXT: T_('여기로 가요'), T: G_(t) } }, { type: 'rt_arrive', inputs: { T: G_(t), N: N_(3) } }, { type: 'rt_waitclick', inputs: { T: G_(t) } }, { type: 'rt_wait', inputs: { N: N_(1) } }, { type: 'rt_apart' }, { type: 'rt_onclick', inputs: { T: G_(t) } }, { type: 'rt_onnear', inputs: { T: G_(t) } }, { type: 'rt_repeat', inputs: { FROM: N_(1), TO: N_(3) } }, { type: 'rt_forever' }, { type: 'rt_if', inputs: { COND: { block: { type: 'v_compare', inputs: { A: { block: { type: 'v_var', fields: { NAME: '대답' } } }, B: N_(1) } } } } }, { type: 'rt_ifelse' }]),
      cat('연출', C.fx, [{ type: 'rt_flash', inputs: { TEXT: T_('짜잔!') } }, { type: 'rt_confetti', inputs: { T: G_(t) } }, { type: 'rt_camera', inputs: { T: G_(a) } }, { type: 'rt_end', fields: { STONES: '꾸준함의 돌' } }]),
      cat('계산', C.calc, [{ type: 'v_text' }, { type: 'v_num' }, { type: 'v_math', inputs: { A: N_(1), B: N_(1) } }, { type: 'v_compare', inputs: { B: N_(1) } }, { type: 'v_logic' }, { type: 'v_not' }, { type: 'v_random', inputs: { A: N_(1), B: N_(6) } }, { type: 'v_raw', fields: { CODE: '["가", "나"]' } }]),
      cat('변수', C.vars, [{ type: 'rt_let', inputs: { V: N_(0) } }, { type: 'rt_set', inputs: { V: { block: { type: 'v_math', inputs: { A: { block: { type: 'v_var' } }, B: N_(1) } } } } }, { type: 'v_var' }]),
      cat('동작 만들기', C.func, [{ type: 'rt_func' }, { type: 'rt_call' }, { type: 'rt_memo' }, { type: 'rt_raw', fields: { CODE: '// 자바스크립트를 바로 써요' } }]),
    ],
  };
}

// ───── 글 → 블록 ─────
const ACTOR_M = { 걷기: 'rt_walk', 길따라: 'rt_path', 순간이동: 'rt_tmove', 날기: 'rt_tmove', 뛰기: 'rt_jump', 멈출때까지: 'rt_wait_actor', 보기: 'rt_look', 눕기: 'rt_simple', 일어나기: 'rt_simple', 크기: 'rt_size', 표정: 'rt_emote', 애니: 'rt_anim', 프레임: 'rt_frame' };
export function codeToBlocks(src) {
  const comments = [];
  const ast = window.acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true, allowReturnOutsideFunction: true, onComment: comments });
  const S = n => src.slice(n.start, n.end);
  const raw = n => ({ type: 'rt_raw', fields: { CODE: S(n) } });
  const vraw = n => ({ type: 'v_raw', fields: { CODE: S(n) } });
  const isStr = n => n && n.type === 'Literal' && typeof n.value === 'string';
  const isNum = n => n && ((n.type === 'Literal' && typeof n.value === 'number') || (n.type === 'UnaryExpression' && n.operator === '-' && n.argument.type === 'Literal' && typeof n.argument.value === 'number'));
  const numOf = n => n.type === 'Literal' ? n.value : -n.argument.value;
  const known = new Set([...ctx.targets, ...ctx.actors, ...ctx.paths, '나', '이야기']);

  function val(e) {
    if (!e) return null;
    if (isStr(e)) return { type: 'v_text', fields: { T: e.value } };
    if (isNum(e)) return { type: 'v_num', fields: { N: numOf(e) } };
    if (e.type === 'Identifier') return known.has(e.name) ? { type: 'v_target', fields: { NAME: e.name } } : { type: 'v_var', fields: { NAME: e.name } };
    if (e.type === 'BinaryExpression') {
      if (['+', '-', '*', '/', '%'].includes(e.operator)) return { type: 'v_math', fields: { OP: e.operator }, inputs: { A: inp(e.left), B: inp(e.right) } };
      if (['==', '!=', '<', '>', '<=', '>=', '===', '!=='].includes(e.operator)) return { type: 'v_compare', fields: { OP: e.operator }, inputs: { A: inp(e.left), B: inp(e.right) } };
    }
    if (e.type === 'LogicalExpression' && ['&&', '||'].includes(e.operator)) return { type: 'v_logic', fields: { OP: e.operator }, inputs: { A: inp(e.left), B: inp(e.right) } };
    if (e.type === 'UnaryExpression' && e.operator === '!') return { type: 'v_not', inputs: { A: inp(e.argument) } };
    if (e.type === 'CallExpression') {
      const c = e.callee, a = e.arguments;
      if (c.type === 'Identifier') {
        if (c.name === '찾기' && a.length === 1) return { type: 'v_find', inputs: { NAME: inp(a[0]) } };
        if (c.name === '무작위' && a.length === 2) return { type: 'v_random', inputs: { A: inp(a[0]), B: inp(a[1]) } };
        if (c.name === '고른말' && !a.length) return { type: 'v_chosen' };
      }
      if (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && c.property.name === '묻기') { const b = askBlock('v_ask', c.object.name, a); if (b) return b; }
    }
    return vraw(e);
  }
  /** 입력칸: 글자·숫자·이름은 그림자(바로 고칠 수 있는 칸), 나머지는 블록 */
  function inp(e) {
    const b = val(e); if (!b) return undefined;
    if (b.type === 'v_text' || b.type === 'v_num' || b.type === 'v_target') return { shadow: b };
    return { block: b };
  }
  function askBlock(type, who, a) {
    if (a.length !== 2 || a[1].type !== 'ArrayExpression' || a[1].elements.length > 4 || !a[1].elements.every(isStr)) return null;
    ctx.extra.add(who);
    const f = { WHO: who }; for (let i = 0; i < 4; i++) f['O' + (i + 1)] = a[1].elements[i] ? a[1].elements[i].value : '';
    return { type, fields: f, inputs: { Q: inp(a[0]) } };
  }
  function body(n) { return n.type === 'BlockStatement' ? n.body : [n]; }
  function arrowBody(f) { return f.body.type === 'BlockStatement' ? { list: f.body.body, start: f.body.start, end: f.body.end } : { list: [{ type: 'ExpressionStatement', expression: f.body, start: f.body.start, end: f.body.end }], start: f.body.start, end: f.body.end }; }
  const isFn = f => f && (f.type === 'ArrowFunctionExpression' || f.type === 'FunctionExpression') && !f.params.length;

  function stmt(s) {
    if (s.type === 'ExpressionStatement') {
      const e = s.expression;
      if (e.type === 'AssignmentExpression' && e.operator === '=' && e.left.type === 'Identifier') return { type: 'rt_set', fields: { NAME: e.left.name }, inputs: { V: inp(e.right) } };
      if (e.type === 'CallExpression') return call(e, s) || raw(s);
      return raw(s);
    }
    if (s.type === 'VariableDeclaration' && s.declarations.length === 1 && s.declarations[0].id.type === 'Identifier' && s.declarations[0].init && s.kind !== 'var')
      return { type: 'rt_let', fields: { KIND: s.kind, NAME: s.declarations[0].id.name }, inputs: { V: inp(s.declarations[0].init) } };
    if (s.type === 'IfStatement') {
      const b = { type: s.alternate ? 'rt_ifelse' : 'rt_if', inputs: { COND: inp(s.test) } };
      const d = chain(body(s.consequent), s.consequent.start, s.consequent.end); if (d) b.inputs.DO = { block: d };
      if (s.alternate) { const el = chain(body(s.alternate), s.alternate.start, s.alternate.end); if (el) b.inputs.ELSE = { block: el }; }
      return b;
    }
    if (s.type === 'ForStatement') {
      const i = s.init, t = s.test, u = s.update;
      if (i && i.type === 'VariableDeclaration' && i.kind === 'let' && i.declarations.length === 1 && i.declarations[0].id.type === 'Identifier' && i.declarations[0].init) {
        const v = i.declarations[0].id.name;
        const testOk = t && t.type === 'BinaryExpression' && t.operator === '<=' && t.left.type === 'Identifier' && t.left.name === v;
        const updOk = u && ((u.type === 'UpdateExpression' && u.operator === '++' && u.argument.name === v) || (u.type === 'AssignmentExpression' && u.operator === '+=' && u.left.name === v && u.right.value === 1));
        if (testOk && updOk) { const b = { type: 'rt_repeat', fields: { VAR: v }, inputs: { FROM: inp(i.declarations[0].init), TO: inp(t.right) } }; const d = chain(body(s.body), s.body.start, s.body.end); if (d) b.inputs.DO = { block: d }; return b; }
      }
      return raw(s);
    }
    if (s.type === 'ForOfStatement' && s.left.type === 'VariableDeclaration' && s.left.declarations[0].id.type === 'Identifier') {
      const b = { type: 'rt_forof', fields: { VAR: s.left.declarations[0].id.name }, inputs: { LIST: inp(s.right) } };
      const d = chain(body(s.body), s.body.start, s.body.end); if (d) b.inputs.DO = { block: d }; return b;
    }
    if (s.type === 'WhileStatement' && s.test.type === 'Literal' && s.test.value === true) { const b = { type: 'rt_forever', inputs: {} }; const d = chain(body(s.body), s.body.start, s.body.end); if (d) b.inputs.DO = { block: d }; return b; }
    return raw(s);
  }
  function call(e, s) {
    const c = e.callee, a = e.arguments;
    if (c.type === 'MemberExpression' && !c.computed) {
      const m = c.property.name, objIsName = c.object.type === 'Identifier', who = objIsName ? c.object.name : null;
      if (who && (m === '말하기') && a.length === 1) { ctx.extra.add(who); return { type: 'rt_say', fields: { WHO: who }, inputs: { TEXT: inp(a[0]) } }; }
      if (who && m === '묻기') return askBlock('rt_ask_s', who, a);
      if (who && ACTOR_M[m]) {
        ctx.extra.add(who);
        const t = ACTOR_M[m], f = { WHO: who };
        if (t === 'rt_walk' && a.length >= 1 && a.length <= 2) return { type: t, fields: f, inputs: { T: inp(a[0]), SPEED: inp(a[1] || { type: 'Literal', value: 3 }) } };
        if (t === 'rt_path' && a.length >= 3 && a.length <= 4 && a[0].type === 'Identifier') { ctx.extra.add(a[0].name); return { type: t, fields: { ...f, PATH: a[0].name }, inputs: { A: inp(a[1]), B: inp(a[2]), SPEED: inp(a[3] || { type: 'Literal', value: 3 }) } }; }
        if (t === 'rt_tmove' && a.length === 1) return { type: t, fields: { ...f, CMD: m }, inputs: { T: inp(a[0]) } };
        if (t === 'rt_jump' && a.length <= 1) return { type: t, fields: f, inputs: { N: inp(a[0] || { type: 'Literal', value: 1 }) } };
        if (t === 'rt_wait_actor' && !a.length) return { type: t, fields: f };
        if (t === 'rt_look' && a.length === 1 && isStr(a[0]) && ['앞', '뒤', '왼쪽', '오른쪽'].includes(a[0].value)) return { type: t, fields: { ...f, DIR: a[0].value } };
        if (t === 'rt_simple' && !a.length) return { type: t, fields: { ...f, CMD: m } };
        if (t === 'rt_size' && a.length === 1) return { type: t, fields: f, inputs: { N: inp(a[0]) } };
        if (t === 'rt_emote' && a.length === 1) return { type: t, fields: f, inputs: { TEXT: inp(a[0]) } };
        if (t === 'rt_anim' && a.length === 1 && isStr(a[0]) && ['자동', '서기', '걷기', '깡충', '빙글', '흔들'].includes(a[0].value)) return { type: t, fields: { ...f, ANIM: a[0].value } };
        if (t === 'rt_frame' && a.length === 1) return { type: t, fields: f, inputs: { N: inp(a[0]) } };
        return null;
      }
      if ((m === '숨기기' || m === '보이기') && !a.length) return objIsName && ctx.actors.includes(who) ? { type: 'rt_simple', fields: { WHO: who, CMD: m } } : { type: 'rt_oshow', fields: { CMD: m }, inputs: { T: inp(c.object) } };
      if (m === '색' && a.length === 1 && isStr(a[0]) && /^#[0-9a-fA-F]{6}$/.test(a[0].value)) return { type: 'rt_ocolor', fields: { COLOR: a[0].value.toLowerCase() }, inputs: { T: inp(c.object) } };
      if (m === '이름표' && a.length === 1) return { type: 'rt_olabel', inputs: { T: inp(c.object), TEXT: inp(a[0]) } };
      return null;
    }
    if (c.type !== 'Identifier') return null;
    const n = c.name, one = (type, key) => (a.length === 1 ? { type, inputs: { [key]: inp(a[0]) } } : null);
    switch (n) {
      case '쪽': return one('rt_page', 'TEXT');
      case '다짐': return one('rt_promise', 'TEXT');
      case '번쩍': return one('rt_flash', 'TEXT');
      case '꽃가루': return one('rt_confetti', 'T');
      case '카메라': return one('rt_camera', 'T');
      case '누를때까지': return one('rt_waitclick', 'T');
      case '기다리기': return one('rt_wait', 'N');
      case '목표': if (a.length >= 1 && a.length <= 2) { const b = { type: 'rt_goal', inputs: { TEXT: inp(a[0]) } }; if (a[1] && !(a[1].type === 'Literal' && a[1].value === null)) b.inputs.T = inp(a[1]); return b; } return null;
      case '도착': if (a.length >= 1 && a.length <= 2) return { type: 'rt_arrive', inputs: { T: inp(a[0]), N: inp(a[1] || { type: 'Literal', value: 3 }) } }; return null;
      case '따로': if (a.length === 1 && isFn(a[0])) { const ab = arrowBody(a[0]); const b = { type: 'rt_apart', inputs: {} }; const d = chain(ab.list, ab.start, ab.end); if (d) b.inputs.DO = { block: d }; return b; } return null;
      case '끝내기': {
        if (a.length !== 1 || a[0].type !== 'ObjectExpression') return null;
        const f = { P: 0, STONES: '', STICKERS: '' };
        for (const p of a[0].properties) {
          const k = p.key && (p.key.name || p.key.value), v = p.value;
          const list = v.type === 'ArrayExpression' && v.elements.every(isStr) ? v.elements.map(x => x.value).join(', ') : isStr(v) ? v.value : null;
          if (k === '포인트' && isNum(v)) f.P = numOf(v); else if (k === '돌' && list !== null) f.STONES = list; else if (k === '스티커' && list !== null) f.STICKERS = list; else return null;
        }
        return { type: 'rt_end', fields: f };
      }
    }
    if (!['누르면', '가까이가면'].includes(n) && a.length <= 2) { const b = { type: 'rt_call', fields: { NAME: n }, inputs: {} }; if (a[0]) b.inputs.A0 = inp(a[0]); if (a[1]) b.inputs.A1 = inp(a[1]); return b; }
    return null;
  }
  /** 문장 목록 → 이어 붙은 블록 하나(+next). 범위 안 주석은 메모 블록으로 */
  function chain(list, start, end, all = list) {
    const items = list.map(s => ({ pos: s.start, s }));
    for (const c of comments) if (c.start >= start && c.end <= end && !all.some(s => c.start >= s.start && c.end <= s.end)) items.push({ pos: c.start, c });
    items.sort((x, y) => x.pos - y.pos);
    let first = null, last = null;
    for (const it of items) {
      const b = it.c ? { type: 'rt_memo', fields: { T: it.c.value.trim() } } : stmt(it.s);
      if (!first) first = b; else last.next = { block: b };
      last = b;
    }
    return first;
  }
  // 맨 위: 동작 만들기·누르면/가까이가면은 따로 떨어진 묶음, 나머지는 ▶ 시작하면 아래
  const main = [], stacks = [];
  for (const s of ast.body) {
    if (s.type === 'FunctionDeclaration' && s.id) {
      const b = { type: 'rt_func', fields: { NAME: s.id.name, PARAMS: s.params.map(p => p.type === 'Identifier' ? p.name : S(p)).join(', ') }, inputs: {} };
      s.params.forEach(p => p.type === 'Identifier' && ctx.extra.add(p.name));
      const d = chain(s.body.body, s.body.start, s.body.end); if (d) b.inputs.DO = { block: d };
      stacks.push(b); continue;
    }
    const e = s.type === 'ExpressionStatement' && s.expression;
    if (e && e.type === 'CallExpression' && e.callee.type === 'Identifier' && ['누르면', '가까이가면'].includes(e.callee.name) && e.arguments.length === 2 && isFn(e.arguments[1])) {
      const ab = arrowBody(e.arguments[1]);
      const b = { type: e.callee.name === '누르면' ? 'rt_onclick' : 'rt_onnear', inputs: { T: inp(e.arguments[0]) } };
      const d = chain(ab.list, ab.start, ab.end); if (d) b.inputs.DO = { block: d };
      stacks.push(b); continue;
    }
    main.push(s);
  }
  const startBlock = { type: 'rt_start', x: 20, y: 20, deletable: false };
  const m = chain(main, 0, src.length, ast.body); if (m) startBlock.next = { block: m };   // 함수·이벤트 안의 주석은 그쪽 묶음에
  const blocks = [startBlock];
  stacks.forEach((b, i) => { b.x = 560; b.y = 20 + i * 260; blocks.push(b); });
  return { blocks: { languageVersion: 0, blocks } };
}

// ───── 블록 → 글 ─────
const IND = '  ';
export function blocksToCode(ws) {
  const tops = ws.getTopBlocks(true);
  const out = [], funcs = [], events = [], loose = [];
  let start = null;
  for (const b of tops) {
    if (b.type === 'rt_start') start = b;
    else if (b.type === 'rt_func') funcs.push(b);
    else if (b.type === 'rt_onclick' || b.type === 'rt_onnear') events.push(b);
    else if (b.previousConnection || b.outputConnection) loose.push(b);
  }
  for (const f of funcs) out.push(...stmtLines(f, ''), '');
  for (const e of events) out.push(...stmtLines(e, ''), '');
  if (start) { let b = start.getNextBlock(); while (b) { out.push(...stmtLines(b, '')); b = b.getNextBlock(); } }
  loose.forEach((b, i) => {
    if (b.outputConnection) return;                 // 떨어진 값 블록은 버림
    out.push('', `// (▶ 시작하면에 붙지 않은 블록 — 실행되지 않아요)`, `function 붙지않은블록${i + 1}() {`);
    let x = b; while (x) { out.push(...stmtLines(x, IND)); x = x.getNextBlock(); }
    out.push('}');
  });
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
function q(s) { return JSON.stringify(String(s ?? '')); }
function v(b, name, def = '""') {
  const c = b.getInputTargetBlock(name);
  if (!c) return def;
  return expr(c);
}
const BIN = new Set(['v_math', 'v_compare', 'v_logic']);
function sub(b, name, def) { const c = b.getInputTargetBlock(name); if (!c) return def; const s = expr(c); return BIN.has(c.type) ? `(${s})` : s; }
function expr(b) {
  const f = n => b.getFieldValue(n);
  switch (b.type) {
    case 'v_text': return q(f('T'));
    case 'v_num': return String(f('N'));
    case 'v_target': case 'v_var': return f('NAME') || 'null';
    case 'v_math': case 'v_compare': case 'v_logic': return `${sub(b, 'A', '0')} ${f('OP')} ${sub(b, 'B', '0')}`;
    case 'v_not': return `!${sub(b, 'A', 'false')}`;
    case 'v_random': return `무작위(${v(b, 'A', '1')}, ${v(b, 'B', '6')})`;
    case 'v_find': return `찾기(${v(b, 'NAME')})`;
    case 'v_chosen': return '고른말()';
    case 'v_ask': return askCode(b);
    case 'v_raw': return f('CODE') || 'null';
  }
  return 'null';
}
function askCode(b) {
  const o = ['O1', 'O2', 'O3', 'O4'].map(n => b.getFieldValue(n)).filter(s => s !== '' && s != null);
  return `${b.getFieldValue('WHO')}.묻기(${v(b, 'Q')}, [${o.map(q).join(', ')}])`;
}
function inner(b, name, ind) { const out = []; let x = b.getInputTargetBlock(name); while (x) { out.push(...stmtLines(x, ind + IND)); x = x.getNextBlock(); } return out; }
function stmtLines(b, ind) {
  const f = n => b.getFieldValue(n), W = () => f('WHO'), L = s => [ind + s];
  switch (b.type) {
    case 'rt_say': return L(`${W()}.말하기(${v(b, 'TEXT')});`);
    case 'rt_ask_s': return L(askCode(b) + ';');
    case 'rt_promise': return L(`다짐(${v(b, 'TEXT')});`);
    case 'rt_walk': return L(`${W()}.걷기(${v(b, 'T', '나')}, ${v(b, 'SPEED', '3')});`);
    case 'rt_path': return L(`${W()}.길따라(${f('PATH')}, ${v(b, 'A', '0')}, ${v(b, 'B', '100')}, ${v(b, 'SPEED', '3')});`);
    case 'rt_tmove': return L(`${W()}.${f('CMD')}(${v(b, 'T', '나')});`);
    case 'rt_jump': return L(`${W()}.뛰기(${v(b, 'N', '1')});`);
    case 'rt_wait_actor': return L(`${W()}.멈출때까지();`);
    case 'rt_look': return L(`${W()}.보기(${q(f('DIR'))});`);
    case 'rt_simple': return L(`${W()}.${f('CMD')}();`);
    case 'rt_size': return L(`${W()}.크기(${v(b, 'N', '1')});`);
    case 'rt_emote': return L(`${W()}.표정(${v(b, 'TEXT')});`);
    case 'rt_anim': return L(`${W()}.애니(${q(f('ANIM'))});`);
    case 'rt_frame': return L(`${W()}.프레임(${v(b, 'N', '0')});`);
    case 'rt_ocolor': return L(`${v(b, 'T', '나')}.색(${q(f('COLOR'))});`);
    case 'rt_olabel': return L(`${v(b, 'T', '나')}.이름표(${v(b, 'TEXT')});`);
    case 'rt_oshow': return L(`${v(b, 'T', '나')}.${f('CMD')}();`);
    case 'rt_page': return L(`쪽(${v(b, 'TEXT')});`);
    case 'rt_goal': { const t = b.getInputTargetBlock('T'); return L(`목표(${v(b, 'TEXT')}${t ? ', ' + expr(t) : ''});`); }
    case 'rt_arrive': return L(`도착(${v(b, 'T', '나')}, ${v(b, 'N', '3')});`);
    case 'rt_waitclick': return L(`누를때까지(${v(b, 'T', '나')});`);
    case 'rt_wait': return L(`기다리기(${v(b, 'N', '1')});`);
    case 'rt_apart': return [ind + '따로(() => {', ...inner(b, 'DO', ind), ind + '});'];
    case 'rt_onclick': return [ind + `누르면(${v(b, 'T', '나')}, () => {`, ...inner(b, 'DO', ind), ind + '});'];
    case 'rt_onnear': return [ind + `가까이가면(${v(b, 'T', '나')}, () => {`, ...inner(b, 'DO', ind), ind + '});'];
    case 'rt_repeat': { const n = f('VAR') || 'i'; return [ind + `for (let ${n} = ${v(b, 'FROM', '1')}; ${n} <= ${v(b, 'TO', '3')}; ${n}++) {`, ...inner(b, 'DO', ind), ind + '}']; }
    case 'rt_forof': return [ind + `for (const ${f('VAR') || '것'} of ${v(b, 'LIST', '[]')}) {`, ...inner(b, 'DO', ind), ind + '}'];
    case 'rt_forever': return [ind + 'while (true) {', ...inner(b, 'DO', ind), ind + '}'];
    case 'rt_if': return [ind + `if (${v(b, 'COND', 'false')}) {`, ...inner(b, 'DO', ind), ind + '}'];
    case 'rt_ifelse': {
      const el = b.getInputTargetBlock('ELSE');
      if (el && !el.getNextBlock() && (el.type === 'rt_if' || el.type === 'rt_ifelse')) {     // 아니면 만약 → else if
        const rest = stmtLines(el, ind); rest[0] = rest[0].trimStart();
        return [ind + `if (${v(b, 'COND', 'false')}) {`, ...inner(b, 'DO', ind), ind + '} else ' + rest[0], ...rest.slice(1)];
      }
      return [ind + `if (${v(b, 'COND', 'false')}) {`, ...inner(b, 'DO', ind), ind + '} else {', ...inner(b, 'ELSE', ind), ind + '}'];
    }
    case 'rt_flash': return L(`번쩍(${v(b, 'TEXT')});`);
    case 'rt_confetti': return L(`꽃가루(${v(b, 'T', '나')});`);
    case 'rt_camera': return L(`카메라(${v(b, 'T', '나')});`);
    case 'rt_end': { const list = s => '[' + String(s || '').split(',').map(x => x.trim()).filter(Boolean).map(q).join(', ') + ']'; return L(`끝내기({ 포인트: ${f('P') || 0}, 돌: ${list(f('STONES'))}, 스티커: ${list(f('STICKERS'))} });`); }
    case 'rt_let': return L(`${f('KIND') || 'let'} ${f('NAME') || '값'} = ${v(b, 'V', '0')};`);
    case 'rt_set': return L(`${f('NAME') || '값'} = ${v(b, 'V', '0')};`);
    case 'rt_func': return [ind + `function ${f('NAME') || '동작'}(${f('PARAMS') || ''}) {`, ...inner(b, 'DO', ind), ind + '}'];
    case 'rt_call': { const a = ['A0', 'A1'].map(n => b.getInputTargetBlock(n)).filter(Boolean).map(expr); return L(`${f('NAME')}(${a.join(', ')});`); }
    case 'rt_raw': return String(f('CODE') || '').split('\n').map(s => ind + s);
    case 'rt_memo': return L(`// ${f('T') || ''}`);
  }
  return [];
}
