# 품새 영상 피드백 보완 및 교차검증 기준

## 2026 공식 기준 교차검증

- 대한태권도협회 `2026 태권도 품새 경기규칙`은 정확도를 국기원이 규정한 기본동작과 각 품새 동작의 수행기준에 맞는지 평가하며, 개별 동작과 연결 과정의 중심 이동 안정성 및 균형도 평가 대상으로 설명합니다.
- 표현력은 속도와 힘, 조화(강유·완급·리듬), 기의 표현을 전체 수행에서 평가합니다.
- 경미한 오류 `-0.1`, 큰 오류 `-0.3`은 공인 규칙의 감점 체계이지만, 이 앱에서는 실제 심판 판정으로 확정하지 않고 `참고 감점 가능성`으로만 표시합니다.
- 국기원 태권도 교본은 기본과 품새를 별도 권으로 체계화한 공식 기준 자료입니다. 앱의 기술명과 수행 기준은 지도자가 교본 원문과 대조해 최종 검수해야 합니다.

## 앱 판정 범위

| 구분 | 앱에서 다루는 범위 |
|---|---|
| 확인 가능 | 관절 감지율, 구간 내 관절 이동 속도, 동작 완료 후 잔여 움직임 |
| 추정 | 몸 중심 이동, 서기 폭·높이의 일관성, 속도와 완급 대비, 차기 후 회수·착지 안정성 |
| 지도자 확인 필요 | 동작명과 순서, 시선 선행, 품새선, 시작·종료 위치, 정확한 목표 높이, 손·주먹·발 모양, 공식 감점 |

관절 감지율이 낮으면 오류 크기를 분류하지 않고 `판정 보류`로 처리합니다. 정면 단일 영상으로는 무릎과 발끝의 전후 관계를 확정할 수 없으므로, 통증이나 무릎 안쪽 붕괴가 의심되면 측면 촬영과 지도자 또는 의료 전문가 확인이 필요합니다.

## 적용한 평가 관점

- 경기품새 리포트는 정확성의 공식 판정을 대신하지 않고, 단일 영상에서 비교적 확인 가능한 속도·완급, 맺음, 정지 안정성, 서기·중심, 촬영 구도를 훈련 지표로 사용합니다.
- 경기품새의 평가 구조인 정확성 4.0점과 표현력 6.0점, 표현력의 속도와 힘·조화·기의 표현을 피드백 문구에 반영합니다.
- 균형은 정적 자세뿐 아니라 동작 연결 중 중심 유지까지 포함해 보며, 학다리서기와 착지 후 흔들림을 중요한 확인 대상으로 봅니다.
- 기술 관찰은 단순 육안 판단만으로 확정하지 않고, 촬영 시점·카메라 방향·관절 감지율의 영향을 함께 표시합니다.

## 동작명과 영상이 다를 수 있는 이유

현재 앱은 품새별 기술명 순서와 영상에서 찾은 움직임 정지점을 결합해 구간명을 자동 추정합니다. 영상 앞뒤의 대기 시간을 먼저 제외하고, 전신 관절 이동 속도만 사용하던 방식에서 벗어나 관절 각도 변화, 몸 중심 이동, 손발 이동을 함께 계산하며 초당 약 5회의 스켈레톤 표본으로 전환점을 찾습니다. 다음 상황에서는 여전히 한 구간 정도 어긋날 수 있습니다.

- 영상 시작 전후의 긴 준비 자세
- 준비서기와 마무리 자세를 동작 수에 포함한 데이터
- 차기 후 지르기처럼 한 구간에 여러 기술이 연결된 복합동작
- 몸 일부가 화면 밖으로 나가 관절 감지가 끊긴 장면
- 촬영 각도 때문에 서로 다른 기술의 2D 관절 모양이 비슷하게 보이는 장면

이를 줄이기 위해 대표 이미지는 구간 중앙이나 고정 위치가 아니라 구간 후반에서 스켈레톤 움직임이 가장 낮은 완료 자세를 사용하고, 리포트에는 `동작명 자동 추정` 안내를 표시합니다. 동작명과 영상이 다르면 해당 카드를 재생해 지도자가 최종 검수해야 합니다.

## 추가 개발 권장사항

1. 지도자가 구간 경계를 앞뒤로 조절하고 동작명을 직접 수정하는 기능
2. 품새별 검수 완료 기준 영상과 2D/3D 관절 궤적 비교
3. 정면과 측면 동시 촬영 또는 여러 시점으로 학습된 동작 인식 모델
4. 품새별 서기 폭, 목표 높이, 발 방향, 손 위치의 정량 기준 데이터
5. 지도자 평가와 앱 평가의 일치도를 반복 측정하는 검증 데이터셋

## 참고 자료

- 대한태권도협회, 2026 태권도 품새 경기규칙: https://www.koreataekwondo.co.kr/ebook/2026/p_2026.pdf
- 대한태권도협회, 품새 경기규칙 목록: https://www.koreataekwondo.co.kr/d008
- 국기원, 품새 소개 및 품새선·수련 의미: https://www.kukkiwon.or.kr/base/menu/baseView?menuLevel=2&menuNo=66
- 국기원, 2021 태권도 교본 발간 안내: https://www.kukkiwon.or.kr/base/board/read?boardManagementNo=6&boardNo=699&menuLevel=2&menuNo=21
- World Taekwondo, Poomsae Competition Rules 및 Para Taekwondo Poomsae Competition Rules
- Yoo et al. (2018), Comparison of Proprioceptive Training and Muscular Strength Training to Improve Balance Ability of Taekwondo Poomsae Athletes
- Viewpoint-Agnostic Taekwondo Action Recognition Using Synthesized Two-Dimensional Skeletal Datasets (2023)
- TUHAD: Taekwondo Unit Technique Human Action Dataset with Key Frame-Based CNN Action Recognition (2020)
- Action Recognition of Taekwondo Unit Actions Using Action Images Constructed with Time-Warped Motion Profiles (2024)
- A Survey of Vision-Based Human Action Evaluation Methods (2019)
- Design and Validation of an Instrument for Technical Performance Indicators of the Kick Technique in Taekwondo (2022)
- Evaluation of Taekwondo Poomsae Movements Using Skeleton Points (2024)

## 주의

영상 관절 좌표만으로 실제 타격 힘, 정확한 목표점, 손목·발목 세부 각도, 공식 감점 또는 경기 판정을 확정할 수 없습니다. 앱 결과는 우선 확인할 문제와 반복 수련 방향을 빠르게 찾기 위한 보조 자료입니다.

공개 웹 자료 전체 또는 저작권이 있는 모든 교본·책의 본문을 전수 검토했다는 의미는 아닙니다. 공식 공개 규칙과 확인 가능한 연구를 중심으로 교차검증했으며, 품새별 세부 정형은 국기원 교본 원문 및 자격을 갖춘 지도자의 검수가 우선합니다.
