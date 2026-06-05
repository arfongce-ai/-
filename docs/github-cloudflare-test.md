# GitHub + Cloudflare Pages 테스트 가이드

APK 최종 테스트 전, GitHub와 Cloudflare Pages로 웹/PWA 테스트를 먼저 진행하기 위한 절차입니다.

## 목적

- APK 설치 전 UI/UX, 품새 데이터, 분석 흐름을 빠르게 확인합니다.
- Android/iOS 휴대폰에서 HTTPS 주소로 접속해 영상 업로드, 리플레이, 결과지 생성을 검증합니다.
- 서버 저장 없이 브라우저 안에서 로컬 처리되는지 확인합니다.

## 현재 배포 구조

Cloudflare Pages 설정값:

```text
Framework preset: None
Build command: 비움
Build output directory: www
Root directory: 프로젝트 루트
```

프로젝트 루트:

```text
업로드 폴더 최상단 (이 README가 있는 위치)
```

배포 대상 폴더:

```text
www
```

## GitHub 업로드 전 로컬 검증

프로젝트 루트에서 아래 명령을 실행합니다.

```bash
npm run assets:check
npm run verify:cross
```

둘 다 통과해야 GitHub에 올립니다.

## GitHub 업로드 순서

1. GitHub에서 새 저장소를 만듭니다.
2. 저장소 이름 예:

```text
ai-poomsae-coach-mvp
```

3. 프로젝트 폴더 전체를 GitHub 저장소로 업로드합니다.
4. APK 파일은 GitHub에 올리지 않는 것을 권장합니다. 웹 테스트에는 `www` 폴더만 필요합니다.

## Cloudflare Pages 연결 순서

1. Cloudflare Dashboard로 이동합니다.
2. Workers & Pages 또는 Pages 메뉴를 엽니다.
3. Create application 또는 Create project를 누릅니다.
4. GitHub 저장소를 연결합니다.
5. 아래 설정을 입력합니다.

```text
Project name: ai-poomsae-coach-mvp
Production branch: main
Framework preset: None
Build command: 
Build output directory: www
```

6. Deploy를 누릅니다.
7. 배포 완료 후 제공되는 `https://...pages.dev` 주소로 접속합니다.

## 휴대폰 테스트

Android Chrome:

1. Cloudflare Pages 주소 접속
2. 태극 1장~8장만 보이는지 확인
3. 영상 파일 선택
4. 리플레이 영상이 고정 패널에서 보이는지 확인
5. 분석 시작
6. 결과가 별도 결과지 페이지로 열리는지 확인
7. JPG 결과지 저장 테스트

iPhone Safari:

1. Cloudflare Pages 주소 접속
2. 공유 버튼 선택
3. 홈 화면에 추가
4. 홈 화면 아이콘으로 실행
5. 영상 선택 및 분석 테스트
6. 앱 종료/재실행 시 영상 세션 유실 가능성 안내가 필요한지 확인

## Cloudflare Pages용 파일

`www/_headers`

- HTML은 `no-store`로 설정해 최신 수정사항이 바로 반영되게 합니다.
- 모델과 MediaPipe vendor 파일은 장기 캐시로 설정합니다.
- 카메라/마이크/전체화면 권한 정책을 같은 출처 기준으로 제한합니다.

`www/_redirects`

- 새로고침이나 직접 경로 접속 시 `index.html`로 연결합니다.

## Cloudflare 웹 테스트에서 확인 가능한 것

- UI/UX
- 품새 선택 데이터 일관성
- 영상 파일 업로드
- 영상 속도 조절 재생
- 분석 결과 페이지
- JPG 결과지 생성
- iOS Safari/PWA 기본 동작

## Cloudflare 웹 테스트에서 완전히 검증되지 않는 것

- Android APK 내부 WebView 동작
- APK 설치 권한 문제
- Capacitor Android 앱 샌드박스 저장소
- Play Protect 경고 여부

이 항목들은 마지막 APK 실기기 테스트에서 확인합니다.

## 테스트 기준

Cloudflare 테스트에서 다음이 통과하면 APK 테스트로 넘어갑니다.

- 태극 1장~8장만 선택 가능
- 품새별 동작 수가 결과지 구간 수와 일치
- 리플레이 영상을 스크롤 없이 확인 가능
- 결과지가 별도 페이지로 표시
- 결과지 뒤로 가기 동작
- JPG 결과지 저장 가능
- 휴대폰 브라우저에서 화면 깨짐 없음
