/* ============================================================
   shared.js
   - Firebase 초기화 + 공용 헬퍼 (이름 저장/불러오기, 점수 저장, 랭킹 불러오기)
   - index.html, game1.html, game2.html 에서 공통으로 사용합니다.
   ============================================================ */

/* ------------------------------------------------------------
   1) Firebase 프로젝트 설정
   아래 값을 반드시 "본인의" Firebase 프로젝트 설정으로 교체하세요.
   Firebase 콘솔(https://console.firebase.google.com) >
   프로젝트 설정(⚙) > 일반 > "내 앱" > SDK 설정 및 구성 에서 확인할 수 있습니다.
------------------------------------------------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyAcQmT4f8zP1L153PojICdiuZ-d-N2aL6U",
  authDomain: "math-fly-catch.firebaseapp.com",
  projectId: "math-fly-catch",
  storageBucket: "math-fly-catch.firebasestorage.app",
  messagingSenderId: "748954569516",
  appId: "1:748954569516:web:c474da7f087530f39b7a89"
};

/* Firestore 데이터베이스 ID.
   (default) 가 아닌 이름 있는 데이터베이스를 만들었다면 그 ID를 여기 적어주세요.
   기본 (default) 데이터베이스를 쓴다면 '(default)' 그대로 두면 됩니다. */
const FIRESTORE_DATABASE_ID = "(default)";

let _fbReady = false;
let db = null;

function initFirebase(){
  if(_fbReady) return true;
  try{
    if(typeof firebase === 'undefined'){
      console.error('Firebase SDK가 로드되지 않았습니다.');
      return false;
    }
    firebase.initializeApp(firebaseConfig);
    // 두 번째 인자로 데이터베이스 ID를 지정해야 (default)가 아닌 named database에 연결됩니다.
    db = (FIRESTORE_DATABASE_ID && FIRESTORE_DATABASE_ID !== '(default)')
      ? firebase.firestore(firebase.app(), FIRESTORE_DATABASE_ID)
      : firebase.firestore();
    _fbReady = true;
    return true;
  }catch(e){
    console.error('Firebase 초기화 실패:', e);
    return false;
  }
}
initFirebase();

/* ------------------------------------------------------------
   2) 플레이어 이름 (localStorage 공유)
------------------------------------------------------------ */
const PLAYER_NAME_KEY = 'mm_playerName';

function getPlayerName(){
  try{ return (localStorage.getItem(PLAYER_NAME_KEY) || '').trim(); }
  catch(e){ return ''; }
}
function setPlayerName(name){
  try{ localStorage.setItem(PLAYER_NAME_KEY, (name||'').trim()); }
  catch(e){}
}

/* 이름이 없으면 첫 페이지(메인)로 돌려보낸다. 각 게임 페이지 진입 시 호출 */
function requirePlayerNameOrRedirect(){
  const name = getPlayerName();
  if(!name){
    location.href = 'index.html';
    return null;
  }
  return name;
}

/* ------------------------------------------------------------
   3) 점수 저장 / 랭킹 조회
   게임별로 컬렉션을 분리해서 복합 색인(composite index) 없이 바로 동작합니다.
   gameId 는 'game1' 또는 'game2' 를 사용합니다.

   ★ 플레이어 이름을 문서 ID로 사용합니다 (같은 이름 = 같은 플레이어).
     새 점수가 기존에 저장된 최고 점수보다 높을 때만 문서를 갱신하므로,
     랭킹에는 항상 각 플레이어의 "최고 기록"만 남습니다.
------------------------------------------------------------ */
function scoreCollection(gameId){
  if(!_fbReady && !initFirebase()) return null;
  return db.collection('scores_' + gameId);
}

function safeDocId(name){
  // Firestore 문서 ID에 쓸 수 없는 문자를 정리하고 길이를 제한한다
  const cleaned = (name || '익명').trim().replace(/[\/]/g, '_').slice(0, 20);
  return cleaned || '익명';
}

async function saveScore(gameId, name, score, extra){
  const col = scoreCollection(gameId);
  if(!col) return { ok:false, error:'firebase-not-ready' };
  const safeName = safeDocId(name);
  const newScore = Math.round(score) || 0;
  const ref = col.doc(safeName);
  try{
    const outcome = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prevScore = snap.exists ? (snap.data().score || 0) : -Infinity;
      if(newScore > prevScore){
        tx.set(ref, {
          name: safeName,
          score: newScore,
          extra: extra || {},
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { updated:true, best:newScore };
      }
      return { updated:false, best:prevScore };
    });
    return { ok:true, updated:outcome.updated, best:outcome.best };
  }catch(e){
    console.error('saveScore 실패:', e);
    return { ok:false, error:e.message };
  }
}

async function fetchTopScores(gameId, limitN){
  const col = scoreCollection(gameId);
  if(!col) return [];
  try{
    const snap = await col.orderBy('score','desc').limit(limitN || 10).get();
    return snap.docs.map(d => d.data());
  }catch(e){
    console.error('fetchTopScores 실패:', e);
    return [];
  }
}

/* ------------------------------------------------------------
   4) 랭킹 목록을 HTML 문자열로 렌더링하는 공용 함수
   containerEl 안에 표를 그려준다. highlightName/highlightScore 로
   방금 세운 기록을 강조 표시할 수 있다.
------------------------------------------------------------ */
function renderRankingList(containerEl, rows, opts){
  opts = opts || {};
  if(!rows || rows.length === 0){
    containerEl.innerHTML = '<div class="rankEmpty">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</div>';
    return;
  }
  let html = '<ol class="rankList">';
  rows.forEach((r, i) => {
    const isMine = opts.highlightName && r.name === opts.highlightName && r.score === opts.highlightScore;
    html += `<li class="${isMine ? 'me' : ''}"><span class="rk">${i+1}</span><span class="rn">${escapeHtml(r.name)}</span><span class="rs">${r.score}</span></li>`;
  });
  html += '</ol>';
  containerEl.innerHTML = html;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
