# engine3d — 석산 동화책 세계 엔진

모든 동화책 세계가 함께 쓰는 엔진. 세계 하나 = **세계 파일(world.json)** 하나. 설계는 `38_석산메타버스/설계_3단계_세계만들기엔진.md`.

| 파일 | 하는 일 |
|---|---|
| `art3d.js` | three.js 불러오기(vendor → CDN r160), 툰 재질·잉크 테두리·종이 오림·글씨 판·곡선 |
| `objects.js` | **물건 도감** `LIB` — 나무·바위·징검돌·아치·표지판·집·종이 언덕/구름/해… |
| `actor.js` | 도트 인물(시트 64칸 3×3, 스티커 테두리, 걷기·뛰기·눕기·날기·애니) |
| `stage.js` | 무대: 책·책장 수채화(길·개울·꽃·글씨)·물건·인물·자리·카메라(45°)·고르기 · `scatter()` 나무 자동 심기 · `newWorld()` |
| `play.js` | 놀이: 대화·묻기·목표·도착·연출·읽어 주기·이어 읽기(빨리 감기)·끝 화면·기록장 저장 |
| `runtime-worker.js` | 학생 코드 실행기(Web Worker, 인터넷·저장소 잠금, 자동 await, 한국어 오류) |
| `blocks.js` | Blockly 블록 정의 · 글→블록(acorn) · 블록→글 |
| `play-page.js` · `play.css` | 놀이 화면 공용(표지·기록장 열기·손님·이어 읽기) |
| `maker.js` · `maker.css` | 세계 만들기(`../maker.html`) |
| `workshop.js` | 🎨 도트 공방(몸·모자·망토·날개 층, 기본 모델 지키기 안내·잠금 → `world.chars`에 dataURL로 저장, `acc` = 장식 층) |

## 세계 파일

```json
{ "format": "seoksan-world", "version": 1, "id": "rabbit-turtle", "title": "토끼와 거북이", "author": "",
  "book": { "w": 64, "d": 40, "cover": "#b4533f", "texts": {"tl":"","tr":"","bl":"","br":""}, "pages": [12,13], "grass": true, "seed": 7, "flowers": 380 },
  "paths":   [{ "name": "길", "kind": "dirt|water", "width": 2.6, "points": [[x,z], …] }],
  "objects": [{ "type": "tree", "x": 0, "z": 0, "s": 1, "r": 0, "color": "#…", "text": "", "name": "코드이름(선택)" }],
  "actors":  [{ "name": "토끼", "sheet": "rabbit", "x": 0, "z": 0, "dir": "오른쪽", "lift": 0 }],
  "spots":   [{ "name": "출발선", "x": 0, "z": 0 }],
  "player":  { "x": -26, "z": -12 },
  "chars":   { "my1ab2c": { "name": "왕관토끼", "src": "data:image/png;base64,…", "base": "rabbit", "foot": 62, "tagH": 4.3, "hop": 0.18, "faceTop": 0 } },
  "code": "자바스크립트(이야기·동작)" }
```
- 좌표: 책 가운데가 (0,0), x 오른쪽, z 아래(학생 쪽). 1칸 = 도트 16칸. 회전 r은 도(°).
- 인물 그림은 `../packs/characters/index.json`(픽셀엔진 `tools/storybook_chars.py`가 만듦).
- 놀이: `worlds/<id>/index.html`(그 폴더 world.json) 또는 `worlds/play.html?w=<id>`. 고치기: `maker.html?w=<id>`.

## 넣는 법

- **새 물건**: `objects.js`의 `LIB`에 `{name, icon, cat, def, props, solid, build(o)}` 하나. 도감·속성 칸·놀이에 바로 나온다.
- **새 명령**: ① `runtime-worker.js`의 `METHODS`(인물·물건 명령) 또는 `api()`(그냥 명령)에 이름 ② `play.js`의 `exec()`에 `case` ③ 빨리 감기에서 어떻게 할지(건너뛰기·순간이동) ④ 블록이 필요하면 `blocks.js`에 블록 정의·`codeToBlocks`·`stmtLines` 세 곳 ⑤ `maker.js`의 `REF`(코드 도움말)와 설계 문서 2절 표.
- **새 애니(움직임)**: `actor.js`의 `ANIMS`와 `update()`의 분기, `play.js` 애니 검사 목록, `blocks.js` rt_anim 드롭다운.

## 시험

- 놀이: `http://localhost:8838/worlds/rabbit-turtle/` (끝까지 · 5쪽 이어 읽기)
- 만들기: `http://localhost:8838/maker.html?w=rabbit-turtle` → 🧩 블록 → ⌨ 코드 왕복 시 코드가 같아야 함(빈 줄 포함)
- 숨은 브라우저 창에서는 requestAnimationFrame·타이머가 멈추거나 느려진다 → 자동 시험 때 `requestAnimationFrame = cb => setTimeout(...)`
