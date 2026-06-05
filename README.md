# 태권도 품새 수련 훈련 APK 프로젝트

이 폴더는 `poomsae-coach-power-prototype.html`을 APK로 감싸기 위한 Capacitor 프로젝트다.

앱 목표:

- 폰 기본 카메라로 촬영한 저장 영상 파일 사용
- 오프라인 분석
- 태극 1장~8장 및 고단자 품새 선택 지원
- 기록 관리 없이 훈련 보조 피드백 제공
- 속도, 맺음, 정지 안정성 평가
- 구간 리플레이
- JPG 결과지 생성

## 지원 품새

- 태극 1장~8장
- 고려
- 금강
- 태백
- 평원
- 십진
- 지태
- 천권
- 한수
- 일여

태극 1장은 상세 MVP 데이터가 들어가 있고, 태극 2장~8장 및 고단자 품새는 동작 수와 기술 계열 기반 MVP 데이터로 시작한다.

정확한 심사용 세부 동작명과 감점 기준은 지도자 검수 후 보정한다.

## 현재 구성

```text
www/index.html
www/models/
www/vendor/mediapipe/tasks-vision/
```

`www/index.html`은 최신 테스트 앱이다.

## 설치

Node.js LTS 설치 후 이 폴더에서 실행:

```powershell
npm install
```

## 오프라인 자산 받기

인터넷이 되는 상태에서:

```powershell
npm run assets:download
npm run assets:check
```

이 단계가 끝나야 APK가 인터넷 없이 MediaPipe 모델을 로딩할 수 있다.

## Android 프로젝트 생성

```powershell
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio에서:

```text
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 오프라인 테스트

1. APK 설치
2. 휴대폰 인터넷 끄기
3. 앱 실행
4. 폰 기본 카메라로 촬영해 저장한 MP4 선택
5. 자동 분석 시작 확인
6. JPG 결과지 생성 확인
