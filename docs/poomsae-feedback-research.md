# 품새 영상 피드백 보완 기준

## 적용한 평가 관점

- 경기품새 리포트는 정확성의 공식 판정을 대신하지 않고, 단일 영상에서 비교적 확인 가능한 속도·완급, 맺음, 정지 안정성, 서기·중심, 촬영 구도를 훈련 지표로 사용합니다.
- 경기품새의 공식 평가 구조인 정확성 4.0점과 표현성 6.0점, 표현성의 속도와 힘·리듬과 템포·기의 표현을 피드백 문구에 반영합니다.
- 균형은 정적 자세뿐 아니라 동작 연결 중 중심 유지까지 포함해 보며, 학다리서기와 착지 후 흔들림을 중요한 확인 대상으로 봅니다.
- 기술 관찰은 단순 육안 판단만으로 확정하지 않고, 촬영 시점·카메라 방향·관절 감지율의 영향을 함께 표시합니다.

## 동작명과 영상이 다를 수 있는 이유

현재 앱은 품새별 기술명 순서와 영상에서 찾은 움직임 정지점을 결합해 구간명을 자동 추정합니다. 다음 상황에서는 한 구간 정도 어긋날 수 있습니다.

- 영상 시작 전후의 긴 준비 자세
- 준비서기와 마무리 자세를 동작 수에 포함한 데이터
- 차기 후 지르기처럼 한 구간에 여러 기술이 연결된 복합동작
- 몸 일부가 화면 밖으로 나가 관절 감지가 끊긴 장면
- 촬영 각도 때문에 서로 다른 기술의 2D 관절 모양이 비슷하게 보이는 장면

이를 줄이기 위해 대표 이미지는 구간 중앙이 아니라 동작 완료 자세에 가까운 프레임을 사용하고, 리포트에는 `동작명 자동 추정` 안내를 표시합니다. 동작명과 영상이 다르면 해당 카드를 재생해 지도자가 최종 검수해야 합니다.

## 추가 개발 권장사항

1. 지도자가 구간 경계를 앞뒤로 조절하고 동작명을 직접 수정하는 기능
2. 품새별 검수 완료 기준 영상과 2D/3D 관절 궤적 비교
3. 정면과 측면 동시 촬영 또는 여러 시점으로 학습된 동작 인식 모델
4. 품새별 서기 폭, 목표 높이, 발 방향, 손 위치의 정량 기준 데이터
5. 지도자 평가와 앱 평가의 일치도를 반복 측정하는 검증 데이터셋

## 참고 자료

- World Taekwondo, Poomsae Competition Rules 및 Para Taekwondo Poomsae Competition Rules
- Yoo et al. (2018), Comparison of Proprioceptive Training and Muscular Strength Training to Improve Balance Ability of Taekwondo Poomsae Athletes
- Viewpoint-Agnostic Taekwondo Action Recognition Using Synthesized Two-Dimensional Skeletal Datasets (2023)
- Design and Validation of an Instrument for Technical Performance Indicators of the Kick Technique in Taekwondo (2022)
- Evaluation of Taekwondo Poomsae Movements Using Skeleton Points (2024)

## 주의

영상 관절 좌표만으로 실제 타격 힘, 정확한 목표점, 손목·발목 세부 각도, 공식 감점 또는 경기 판정을 확정할 수 없습니다. 앱 결과는 우선 확인할 문제와 반복 수련 방향을 빠르게 찾기 위한 보조 자료입니다.
