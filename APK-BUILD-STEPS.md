# APK 빌드 순서

## 1. 준비

필요 프로그램:

- Node.js LTS
- Android Studio
- Android SDK
- 실제 Android 폰 또는 에뮬레이터

## 2. 의존성 설치

```powershell
cd path\to\poomsae-coach-apk
npm install
```

## 3. 오프라인 MediaPipe 파일 다운로드

```powershell
npm run assets:download
npm run assets:check
```

## 4. Android 프로젝트 생성

```powershell
npm run android:add
npm run android:sync
```

## 5. Android Studio 열기

```powershell
npm run android:open
```

## 6. APK 빌드

Android Studio 메뉴:

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 7. 폰 설치 테스트

빌드된 APK를 Android 폰에 설치한다.

테스트:

1. 인터넷 끄기
2. 앱 실행
3. 품새 선택
4. 저장된 품새 영상 선택
5. 자동 분석 확인
6. 리플레이 확인
7. JPG 결과지 확인

## 현재 한계

- 태극 2~8장과 고단자 품새는 동작 수/기술 계열 기반 MVP 데이터가 먼저 들어간다.
- 실제 심사용 세부 동작명과 감점 기준은 지도자 검수 후 보정해야 한다.
- 현재는 서버 기록 저장 기능이 없다. 의도적으로 제외했다.
