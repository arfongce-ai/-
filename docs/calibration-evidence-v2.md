# 17개 품새 신뢰도·시간 보정 데이터 규칙

## 입력 근거

- 국기원 교본: 동작 순서, 기술명, 서기, 완성 자세와 복합동작 순서
- 공식 규칙 PDF 3종: 심사 및 경기 평가축과 자동 판정 한계
- 실제 영상: 시간 경계, 움직임 변화, 관절 좌표와 촬영 방향
- GPT 검수: 교본과 영상이 함께 확인된 경계 검토
- 앱 검수: 사용자가 직접 확인하거나 수정한 경계

자동 분석 결과나 화면 이탈은 정답으로 저장하지 않는다. 모든 전역 보정 기록은 `explicit_review: true`여야 한다.

## 검수 가중치

| 상태 | 가중치 | 조건 |
|---|---:|---|
| `expert_approved` | 1.00 | 지도자 승인 |
| `gpt_reviewed` | 0.60 | `textbook_aligned`와 `video_evidence`가 모두 참 |
| `user_corrected` | 0.55 | 앱에서 경계를 직접 수정 |
| `user_confirmed` | 0.35 | 앱에서 “구간이 정확합니다”를 명시적으로 누름 |

한 영상에서 여러 번 수정한 기록은 마지막 수정본 하나만 사용한다. 서로 다른 시간 길이는 전체 수행 구간을 0~1 비율로 정규화하고, 품새·경계별 가중 중앙값을 사용한다.

## 자동 반영 안전장치

- 서로 독립적인 검수 세션 3개 이상
- 유효 표본 가중치 합계 2.5 이상
- 가장 많이 확인된 경계 개수 형식이 전체의 67% 이상
- 시작·끝 경계는 현재 영상의 값을 유지
- 누적 프로필은 내부 경계에 최대 35%만 혼합
- 출처가 없거나 자동 생성된 과거 확인 기록은 전역 보정에서 제외

## GPT 검수 JSON 최소 형식

```json
{
  "records": [{
    "action": "confirm_all",
    "poomsae": "taegeuk_1",
    "review_session_id": "독립적인-영상-검수-ID",
    "correction_revision": 1,
    "result_boundary_ratios": [0, 0.05, 0.11, 1],
    "review_source": "gpt",
    "review_status": "gpt_reviewed",
    "explicit_review": true,
    "textbook_aligned": true,
    "video_evidence": true,
    "camera_view": "front",
    "pose_detection_rate": 0.98
  }]
}
```

관리자 모드의 학습 리포트에서 이 JSON을 가져오면 기존 앱 검수 기록과 같은 보정 엔진으로 합쳐진다.
