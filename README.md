# 수학 게임 모음 - 설치 및 Firebase 설정 가이드

## 파일 구성
```
math-games/
├── index.html   ← 첫 페이지 (이름 입력 → 게임 선택)
├── game1.html   ← 이쪽저쪽 : 유리수 무리수
├── game2.html   ← 수 카드 미션: 목표를 잡아라!
└── shared.js    ← Firebase 설정 + 공용 함수 (이름 저장, 점수 저장/조회)
```
4개 파일을 **같은 폴더**에 넣어두세요. `index.html`을 열면 시작됩니다.

## 1) Firebase 프로젝트 만들기
1. https://console.firebase.google.com 접속 → "프로젝트 추가"
2. 프로젝트 생성 후 왼쪽 메뉴에서 **Firestore Database** → "데이터베이스 만들기" → (처음엔) **테스트 모드**로 시작
3. 프로젝트 설정(⚙ 아이콘) → 일반 탭 → 하단 "내 앱"에서 웹 앱(</>) 추가
4. 나오는 `firebaseConfig` 객체 값을 복사

## 2) shared.js에 설정값 붙여넣기
`shared.js` 상단의 아래 부분을 본인 값으로 교체하세요.
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 3) Firestore 보안 규칙 (테스트 모드 만료 후 필요)
테스트 모드는 보통 30일 후 만료됩니다. 누구나 점수를 쓰고 랭킹만 읽을 수 있게 하려면
Firestore → 규칙(Rules) 탭에 아래처럼 설정하세요.
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores_game1/{doc} {
      allow read: if true;
      allow create: if request.resource.data.name is string
                    && request.resource.data.score is int;
      allow update, delete: if false;
    }
    match /scores_game2/{doc} {
      allow read: if true;
      allow create: if request.resource.data.name is string
                    && request.resource.data.score is int;
      allow update, delete: if false;
    }
  }
}
```

## 4) 실행 방법
- `file://`로 더블클릭해서 열어도 대부분 동작하지만, 브라우저에 따라 로컬 저장/네트워크 제한이 있을 수 있어
  간단한 로컬 서버로 여는 것을 권장합니다.
  ```
  cd math-games
  python3 -m http.server 8000
  ```
  그 다음 브라우저에서 `http://localhost:8000` 접속
- 또는 **Firebase Hosting**, GitHub Pages 등에 폴더 그대로 올려서 배포해도 됩니다.
  (Firebase Hosting을 쓸 경우 별도 authorized domain 설정 없이 바로 됩니다)

## 구현된 기능 요약
1. `index.html`에서 이름을 입력하면 `localStorage`에 저장되고, 게임 선택 화면에서 두 게임 중 하나를 골라 입장합니다.
2. 각 게임 종료 시 `scores_game1`, `scores_game2` 컬렉션에 이름/점수가 Firestore로 저장되고,
   시작 화면의 "🏆 랭킹 보기" 버튼과 게임 종료 화면에서 TOP 10 랭킹을 불러와 보여줍니다. 내 기록은 노란색으로 강조됩니다.
3. 게임 화면 좌측 상단의 ◀ 버튼을 누르면 (진행 중이면 확인창 후) `index.html`로 돌아갑니다.
4. 게임2도 게임1과 동일하게 시작 화면에 랭킹 버튼이 있고, 게임 종료 화면에도 랭킹이 표시됩니다.
   (게임2의 이름 입력창은 제거되었고, 첫 페이지에서 입력한 이름을 그대로 사용합니다.)
