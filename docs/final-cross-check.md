# 최종 교차검증 결과

검증일: 2026-06-03

## 결론

최종 교차검증 결과, 1차 MVP 테스트 기준으로 데이터 일관성 및 주요 확정 버그 재발 검사를 통과했습니다.

## 수정 완료

- 1차 MVP 선택 품새를 태극 1장~8장으로 제한했습니다.
- 고려, 금강, 태백 등 2차 품새 임시 데이터는 테스트 혼선을 막기 위해 현재 앱 데이터에서 제거했습니다.
- 결과는 기존 긴 출력 영역이 아니라 별도 결과지 페이지에서 확인하도록 정리했습니다.
- 리플레이 영상은 스크롤 중에도 바로 확인할 수 있도록 고정 패널 구조를 적용했습니다.

## 자동 검증 항목

다음 명령으로 재검증할 수 있습니다.

```bash
npm run verify:cross
```

검증 항목:

- `www/index.html`과 Android assets의 `index.html` 일치 여부
- inline JavaScript 문법 파싱 성공 여부
- 선택창에 태극 1장~8장만 노출되는지 여부
- 태극 1장~8장의 `count`와 실제 `movements`/`pattern` 수량 일치 여부
- `waitForSeek` 무한 대기 방지 타임아웃 존재 여부
- `loadModel` 동시 호출 경합 방지 플래그 존재 여부
- GPU 실패 시 CPU 폴백 구조 존재 여부
- 리포트의 구간 수가 고정값이 아니라 실제 결과 수로 계산되는지 여부
- 결과지 별도 페이지, 리플레이 고정 패널, 작업 패널 구조 존재 여부
- `18개 구간` 고정 문구 제거 여부
- 배포 코드/문서에 개인 PC 샘플 경로가 남아 있지 않은지 여부

## 최종 APK

테스트용 APK:

```text
C:\Users\MOMGAGYM\Documents\Codex\2026-06-02\https-www-youtube-com-watch-v\outputs\poomsae-coach-apk\AI-poomsae-coach-test.apk
```

Android Studio 빌드 APK:

```text
C:\Users\MOMGAGYM\Documents\Codex\2026-06-02\https-www-youtube-com-watch-v\outputs\poomsae-coach-apk\android\app\build\outputs\apk\debug\app-debug.apk
```

## 실기기 테스트 우선순위

1. 앱 설치 후 태극 1장~8장만 선택되는지 확인합니다.
2. 영상 파일 선택 후 리플레이 영상이 화면 위/좌측 고정 패널에서 바로 보이는지 확인합니다.
3. 분석 시작 후 결과가 별도 결과지 페이지로 이동되는지 확인합니다.
4. 결과지에서 뒤로 가기 버튼으로 훈련 화면에 복귀되는지 확인합니다.
5. 태극 3장, 6장, 7장처럼 동작 수가 다른 품새에서 결과 구간 수가 올바르게 표시되는지 확인합니다.
6. JPG 결과지 저장 버튼이 동작하는지 확인합니다.

## 주의

현재 APK는 디버그 APK이므로 일부 Android 기기에서 Google Play 프로텍트 경고가 표시될 수 있습니다. 이 경고는 정식 배포 서명 및 Play Console 검수 전 디버그 앱에서 발생할 수 있는 정상 범위입니다.
