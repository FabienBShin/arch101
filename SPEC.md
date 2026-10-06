# ARCH 101 진도관리 웹앱 — 설계서

사용자 1명(범식). iPhone / iPad / MacBook 모두에서 쓰는 12주 건축 커리큘럼 진도관리 앱.
콘텐츠는 `data/curriculum.json`이 단일 출처다. UI 문구는 한국어.

## 제약
- 빌드 도구·프레임워크·npm 의존성 없음. 순수 HTML/CSS/ES modules, 정적 파일만.
- 서버·로그인·외부 API 없음. 저장은 localStorage(키 `arch101.v1`). 기기 간 이전은 JSON 내보내기/가져오기.
- 터치 우선: 버튼 최소 44px, iPhone(세로)·iPad·Mac 창 크기에서 레이아웃이 자연스러울 것. safe-area 반영.
- 다크/라이트는 prefers-color-scheme 따름. 외부 CDN·폰트 금지(오프라인 동작).
- localStorage 접근은 try/catch로 감싸고 실패해도 앱이 뜰 것.
- XSS 방지: 사용자 입력은 textContent로만 렌더링(innerHTML 금지).

## 데이터 모델 (localStorage)
{ "weeks": { "1": { "done": {"study": bool, "assignment": bool, "site": bool}, "card": {place, feel, people, boundary, movement, light, material, city, sentence}, "notes": "", "updatedAt": ISO } }, "finalVerdict": "" }

## 화면
1. 홈: 진행률(완료 주/12), 현재 주차 바로가기, 12주 목록(완료 표시)
2. 주차 상세: 이번 주 질문, 공부/과제/(답사) 체크리스트, 관찰 카드(9필드, 자동저장), 자유 메모
3. 정보: 교재·링크, 추가 답사지, 12주 후 진로 판정표(선택 저장)
4. 설정: JSON 내보내기/가져오기, 전체 초기화(확인 대화상자)

## 작업 단위 (순서대로)
- U1 골격: index.html, styles.css, js/app.js(해시 라우터), js/store.js, curriculum.json 로딩, 홈 화면
- U2 주차 상세: 체크리스트 + 진행률
- U3 관찰 카드 + 메모 자동저장, 정보 화면
- U4 PWA: manifest.webmanifest, sw.js(오프라인 캐시), 아이콘(SVG→PNG 180/192/512), apple-touch-icon, 메타태그
- U5 내보내기/가져오기/초기화 + 스키마 검증
- U6 점검: 로컬 서버로 기동, 콘솔 에러, 레이아웃 폭별 확인
