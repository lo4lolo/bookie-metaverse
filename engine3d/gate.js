/* 책 문 — 부기에서 다 읽은 책만 그 책의 세계로 들어갈 수 있다.
 *
 * ▶ 부기 웹앱과 붙일 때 바꿀 곳은 이 파일의 hasFinished() 한 군데뿐이다.
 *   지금(임시): 학생에게 "다 읽었나요?"를 묻고 「네」면 통과.
 *   나중: 부기 앱의 로그인·독서 기록(완독 여부)을 물어 true/false — 묻지 않고 바로 판단.
 * 통과한 책은 이 브라우저에 적어 둔다(readList) — 부기 기록과 맞춰 볼 때 쓰려고.
 */
const READ_KEY = 'bookie-read-books';

export function readList() { try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch (e) { return []; } }
function markRead(book) { try { const l = readList(); if (!l.includes(book)) { l.push(book); localStorage.setItem(READ_KEY, JSON.stringify(l)); } } catch (e) { /* 저장 불가 */ } }

/** 받침이 있으면 a, 없으면 b (을/를, 이/가, 은/는) */
export function josa(word, a, b) {
  const ch = String(word).trim().slice(-1), code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return a + '(' + b + ')';
  return code % 28 ? a : b;
}

/** 완독 확인. player = 대화 칸을 가진 Player, who = 말하는 사람(사서). true면 들어간다 */
export async function hasFinished(player, who, book) {
  // TODO(부기 연동): const rec = await bookie.readingRecord(book); return rec.finished;
  const k = await player.choose(who, `『${book}』${josa(book, '을', '를')} 부기에서 끝까지 다 읽었나요?`, ['네, 다 읽었어요', '아직 안 읽었어요']);
  if (k === 1) markRead(book);
  return k === 1;
}
