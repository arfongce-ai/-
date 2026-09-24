// 품새 보강운동 데이터베이스: 원형 운동 200개 × 수행 변형 5개 = 1,000개.
//
// 2026-09-23 개정
// - 변형은 운동 '종류(kind)'별로 따로 정의한다. 예전에는 범주별 변형 5개를 모든 운동에 붙여
//   "지지물 잡고 눈감기 · 시선 이동", "클램셸 · 서기 전환", "일자 발 걷기 · 30초 정지" 같은
//   모순된 조합이 섞였다.
// - 난이도는 목록 순서가 아니라 운동마다 직접 정한다. 예전에는 20개 중 뒤쪽 5개가 무조건
//   '심화'가 되어 '발목 원그리기', '거울 반대손 회수' 같은 쉬운 운동이 심화로 표시되고
//   점수가 낮은 수련생에게서 빠졌다.
// - 추천은 해시값 무작위 선택이 아니라, 분석에서 약했던 기술(지르기·막기·차기)과 서기,
//   측정 항목(맺음·정지·서기·속도·리듬·대칭)에 맞춰 결정적으로 고른다.

const CATEGORY_DEFINITIONS = {
  stance_foundation: {
    label: "서기·중심",
    purpose: "발 위치와 중심 높이를 일정하게 만드는 기초 훈련",
    prescription: "좌우 각 20초 또는 6회 × 2세트",
    cues: ["발끝과 무릎 방향 맞추기", "머리 높이와 골반 높이 유지"],
    caution: "무릎이 안쪽으로 모이거나 통증이 나면 범위를 줄이세요."
  },
  knee_alignment: {
    label: "무릎 정렬",
    purpose: "앞굽이·뒷굽이에서 무릎과 발의 정렬을 안정시키는 훈련",
    prescription: "천천히 8회 × 2세트",
    cues: ["무릎은 두 번째 발가락 방향", "발바닥 세 점으로 바닥 누르기"],
    caution: "통증 없는 깊이까지만 실시하세요."
  },
  ankle_foot: {
    label: "발목·발바닥",
    purpose: "이동과 정지 때 발목 가동성과 발바닥 지지력을 높이는 훈련",
    prescription: "좌우 각 10회 또는 30초 × 2세트",
    cues: ["엄지볼·새끼볼·뒤꿈치 유지", "발목이 안팎으로 무너지지 않기"],
    caution: "발목이 붓거나 날카로운 통증이 있으면 중단하세요."
  },
  hip_mobility: {
    label: "고관절 가동성",
    purpose: "서기 폭과 발차기 궤적에 필요한 고관절 움직임을 확보하는 훈련",
    prescription: "좌우 각 30초 또는 8회 × 2세트",
    cues: ["허리 대신 고관절에서 움직이기", "반동 없이 천천히 호흡"],
    caution: "사타구니나 허리에 통증이 느껴지면 범위를 줄이세요."
  },
  hip_strength: {
    label: "엉덩이·하체 힘",
    purpose: "낮은 서기와 방향 전환을 지지하는 둔근·하체 근력 훈련",
    prescription: "좌우 각 8~12회 × 2세트",
    cues: ["골반이 기울지 않게 유지", "지지발 전체로 바닥 밀기"],
    caution: "허리가 꺾이지 않도록 복부에 힘을 유지하세요."
  },
  balance_stability: {
    label: "균형·정지",
    purpose: "동작 끝과 발차기 회수 뒤 흔들림을 줄이는 균형 훈련",
    prescription: "좌우 각 20초 또는 6회 × 2세트",
    cues: ["시선은 한 점에 고정", "발가락으로 바닥을 움켜쥐지 않기"],
    caution: "벽이나 의자 가까이에서 넘어지지 않게 실시하세요."
  },
  core_rotation: {
    label: "코어·회전",
    purpose: "몸통 회전과 팔다리 기술 사이의 힘 전달을 안정시키는 훈련",
    prescription: "좌우 각 8회 또는 20초 × 2세트",
    cues: ["갈비뼈와 골반을 겹쳐 유지", "호흡을 참지 않고 복부 긴장"],
    caution: "허리 통증이 있으면 회전 범위와 저항을 줄이세요."
  },
  upper_body_guard: {
    label: "상체·반대손",
    purpose: "막기·지르기의 경로와 반대손 회수 위치를 정돈하는 훈련",
    prescription: "천천히 8~10회 × 2세트",
    cues: ["어깨를 귀에서 멀리 두기", "기술 끝과 반대손 회수를 동시에"],
    caution: "어깨 앞쪽이 아프면 가동 범위와 밴드 강도를 줄이세요."
  },
  speed_snap: {
    label: "속도·맺음",
    purpose: "준비와 발력의 속도 차이, 기술 끝의 맺음을 선명하게 만드는 훈련",
    prescription: "3~5회 × 3세트, 세트 사이 30초 휴식",
    cues: ["마지막 20%에서 가속", "끝점에서 0.3~0.5초 정확히 멈추기"],
    caution: "정확한 자세가 무너지면 속도를 낮추세요."
  },
  kick_control: {
    label: "발차기 제어",
    purpose: "차기·회수·착지까지 한 흐름으로 제어하는 품새 발차기 훈련",
    prescription: "좌우 각 5~8회 × 2세트",
    cues: ["무릎 접기부터 먼저", "찬 뒤 같은 길로 회수하고 서기 고정"],
    caution: "지지물을 잡고 낮은 높이부터 시작하세요."
  }
};

// 운동 종류별 수행 변형(각 5개). suffix가 운동 이름 뒤에 붙는다.
const KIND_VARIANTS = {
  stance_hold: [
    { key: "standard", suffix: "", prescription: null, cue: "기본 정렬을 먼저 정확히 익히기", level_up: 0 },
    { key: "hold3", suffix: " · 3초 정지 반복", prescription: "3초 유지 후 풀기 6회 × 2세트", cue: "정지하는 동안 머리·골반 높이 고정", level_up: 0 },
    { key: "mirror", suffix: " · 거울 확인", prescription: "거울로 발·무릎 방향을 확인하며 5회 × 2세트", cue: "좌우 모양을 눈으로 즉시 교정", level_up: 0 },
    { key: "slow_entry", suffix: " · 5초에 걸쳐 들어가기", prescription: "5초에 걸쳐 자세로 들어가 2초 정지, 5회 × 2세트", cue: "들어가는 동안 머리 높이가 튀지 않기", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 동작 연결", prescription: "해당 서기의 앞뒤 기술과 연결해 3회 × 3세트", cue: "기술이 끝날 때 서기도 동시에 완성", level_up: 1 }
  ],
  stance_move: [
    { key: "standard", suffix: "", prescription: null, cue: "발을 옮긴 뒤 중심 높이 먼저 확인", level_up: 0 },
    { key: "slow", suffix: " · 천천히 5초", prescription: "한 번 전환에 5초, 5회 × 2세트", cue: "머리 높이가 위아래로 튀지 않기", level_up: 0 },
    { key: "mirror", suffix: " · 거울 확인", prescription: "거울 앞에서 전환 후 멈춰 6회 × 2세트", cue: "멈춘 순간 발끝·무릎 방향 확인", level_up: 0 },
    { key: "turn", suffix: " · 방향 전환 포함", prescription: "90도 돌며 전환하고 2초 멈춤, 좌우 각 4회 × 2세트", cue: "돌고 난 직후 골반이 흔들리지 않기", level_up: 1 },
    { key: "line", suffix: " · 품새선 따라", prescription: "품새선 모양대로 이동하며 3회", cue: "선 위에서 발 위치가 벗어나지 않기", level_up: 1 }
  ],
  strength_bilateral: [
    { key: "standard", suffix: "", prescription: null, cue: "양발에 체중을 고르게", level_up: 0 },
    { key: "eccentric", suffix: " · 3초 내려가기", prescription: "3초 내려가고 1초 올라오기 6회 × 2세트", cue: "내려가는 동안 무릎이 안쪽으로 모이지 않기", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 정지", prescription: "가장 힘든 지점에서 2초 멈춤 6회 × 2세트", cue: "멈춘 동안 골반 높이 유지", level_up: 0 },
    { key: "tempo", suffix: " · 3-1-3 템포", prescription: "3초 이동·1초 정지·3초 복귀 5회 × 2세트", cue: "반동 없이 일정한 속도", level_up: 1 },
    { key: "stance", suffix: " · 서기 연결", prescription: "운동 직후 앞굽이 10초 유지 × 3세트", cue: "하체 힘을 서기 안정으로 연결", level_up: 1 }
  ],
  strength_unilateral: [
    { key: "standard", suffix: "", prescription: null, cue: "지지발 전체로 바닥 밀기", level_up: 0 },
    { key: "eccentric", suffix: " · 3초 되돌리기", prescription: "3초에 걸쳐 되돌리기, 좌우 각 6회 × 2세트", cue: "되돌리는 동안 골반이 돌지 않기", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 정지", prescription: "끝 위치에서 2초 멈춤, 좌우 각 6회 × 2세트", cue: "멈춘 동안 무릎·발끝 방향 유지", level_up: 0 },
    { key: "weak_first", suffix: " · 약한 쪽 먼저", prescription: "약한 쪽 먼저 8회, 반대쪽 6회 × 2세트", cue: "양쪽 흔들림 차이를 비교", level_up: 1 },
    { key: "stance", suffix: " · 서기 연결", prescription: "운동 직후 해당 쪽 서기 10초 유지 × 3세트", cue: "힘을 서기 안정으로 연결", level_up: 1 }
  ],
  iso_hold: [
    { key: "standard", suffix: "", prescription: null, cue: "통증 없는 깊이에서 버티기", level_up: 0 },
    { key: "hold20", suffix: " · 20초 유지", prescription: "20초 유지 × 3세트", cue: "무릎과 발끝 방향 고정", level_up: 0 },
    { key: "breath", suffix: " · 5호흡 유지", prescription: "천천히 5호흡 유지 × 3세트", cue: "호흡 중에도 자세 높이 유지", level_up: 0 },
    { key: "shift", suffix: " · 좌우 체중 이동", prescription: "버틴 채 좌우로 천천히 체중 이동 6회 × 2세트", cue: "이동해도 무릎 정렬 유지", level_up: 1 },
    { key: "stance", suffix: " · 서기 연결", prescription: "운동 직후 품새 서기 10초 유지 × 3세트", cue: "버틴 힘을 서기로 연결", level_up: 1 }
  ],
  band_walk: [
    { key: "standard", suffix: "", prescription: null, cue: "무릎이 안쪽으로 모이지 않기", level_up: 0 },
    { key: "low", suffix: " · 낮은 자세 유지", prescription: "낮은 자세로 10걸음 × 3세트", cue: "머리 높이 일정하게", level_up: 0 },
    { key: "stop", suffix: " · 3걸음마다 정지", prescription: "3걸음마다 2초 멈춤, 12걸음 × 2세트", cue: "멈출 때 골반 흔들림 없이", level_up: 0 },
    { key: "slow", suffix: " · 천천히 5초 걸음", prescription: "한 걸음에 5초, 8걸음 × 2세트", cue: "발을 끌지 않고 들어서 옮기기", level_up: 1 },
    { key: "stance", suffix: " · 서기 연결", prescription: "걷기 직후 주춤서기 10초 × 3세트", cue: "엉덩이 힘을 서기 폭 유지로 연결", level_up: 1 }
  ],
  stretch: [
    { key: "standard", suffix: "", prescription: null, cue: "반동 없이 편안한 끝범위", level_up: 0 },
    { key: "breath", suffix: " · 5호흡 유지", prescription: "끝범위에서 5호흡 × 좌우 2세트", cue: "내쉴 때 긴장을 조금씩 풀기", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 30초, 뻣뻣한 쪽 1세트 추가", cue: "좌우 범위 차이 확인", level_up: 0 },
    { key: "gentle", suffix: " · 부드럽게 들어갔다 나오기", prescription: "통증 없는 범위로 8회 × 2세트", cue: "끝범위에서 튕기지 않기", level_up: 0 },
    { key: "kick", suffix: " · 발차기 연결", prescription: "스트레칭 후 낮은 발차기 5회 × 3세트", cue: "늘어난 범위를 차기·회수까지 유지", level_up: 1 }
  ],
  mobility_dynamic: [
    { key: "standard", suffix: "", prescription: null, cue: "허리 보상 없이 관절에서 움직이기", level_up: 0 },
    { key: "slow", suffix: " · 천천히 끝범위", prescription: "끝범위까지 천천히 좌우 각 6회 × 2세트", cue: "반동보다 부드러운 연속 움직임", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 8회, 덜 움직이는 쪽 4회 추가", cue: "좌우 범위 차이 확인", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 멈춤", prescription: "끝범위 2초 유지 6회 × 2세트", cue: "가동 범위를 스스로 제어", level_up: 1 },
    { key: "kick", suffix: " · 발차기 연결", prescription: "가동성 동작 후 낮은 발차기 5회 × 3세트", cue: "확보한 범위를 차기·회수까지 유지", level_up: 1 }
  ],
  foot_control: [
    { key: "standard", suffix: "", prescription: null, cue: "발바닥 세 점을 바닥에 유지", level_up: 0 },
    { key: "hold5", suffix: " · 5초 유지", prescription: "5초 유지 8회 × 2세트", cue: "발목이 안팎으로 꺾이지 않기", level_up: 0 },
    { key: "single", suffix: " · 한 발씩", prescription: "한 발씩 번갈아 좌우 각 8회 × 2세트", cue: "좌우 차이 확인", level_up: 0 },
    { key: "standing", suffix: " · 서서 하기", prescription: "선 자세에서 8회 × 2세트", cue: "서 있어도 아치 모양 유지", level_up: 1 },
    { key: "stance", suffix: " · 서기 연결", prescription: "운동 직후 앞굽이 10초 유지 × 3세트", cue: "발바닥 지지를 서기로 연결", level_up: 1 }
  ],
  balance_static: [
    { key: "standard", suffix: "", prescription: null, cue: "시선을 한 점에 두고 호흡 유지", level_up: 0 },
    { key: "hold30", suffix: " · 30초 유지", prescription: "지지물 가까이에서 좌우 각 30초 × 2세트", cue: "발가락을 과하게 움켜쥐지 않기", level_up: 0 },
    { key: "gaze", suffix: " · 시선 이동", prescription: "균형을 잡고 시선을 좌우로 5회 × 2세트", cue: "시선이 움직여도 골반은 정면", level_up: 1 },
    { key: "arm_tech", suffix: " · 팔 기술 추가", prescription: "균형 중 막기·지르기 좌우 각 5회 × 2세트", cue: "팔을 움직여도 지지 무릎 고정", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 동작 끝 정지", prescription: "품새 기술 후 3초 멈춤 5회 × 3세트", cue: "기술 끝과 전신 정지를 동시에", level_up: 1 }
  ],
  balance_moving: [
    { key: "standard", suffix: "", prescription: null, cue: "시선은 앞, 발은 선 위에", level_up: 0 },
    { key: "stop", suffix: " · 한 걸음 한 정지", prescription: "한 걸음마다 2초 멈춤, 8걸음 × 2세트", cue: "멈춘 순간 흔들림 없이", level_up: 0 },
    { key: "slow", suffix: " · 천천히 5초", prescription: "한 걸음에 5초, 8걸음 × 2세트", cue: "발을 내려놓는 순간 체중 이동 제어", level_up: 0 },
    { key: "turn", suffix: " · 방향 전환", prescription: "4걸음마다 90도 돌기, 3회 × 2세트", cue: "돈 직후 1초 멈춤", level_up: 1 },
    { key: "line", suffix: " · 품새선 걷기", prescription: "품새선 모양대로 걸으며 3회", cue: "방향이 바뀌어도 속도 일정", level_up: 1 }
  ],
  balance_reach: [
    { key: "standard", suffix: "", prescription: null, cue: "지지 무릎은 두 번째 발가락 방향", level_up: 0 },
    { key: "three", suffix: " · 천천히 3방향", prescription: "앞·옆·뒤 3방향 각 4회 × 2세트", cue: "뻗는 동안 골반이 돌지 않기", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 멈춤", prescription: "뻗은 끝에서 2초 멈춤, 좌우 각 5회 × 2세트", cue: "멈춘 동안 지지발 고정", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 6회, 흔들리는 쪽 1세트 추가", cue: "양쪽 도달 거리 비교", level_up: 1 },
    { key: "arm_tech", suffix: " · 팔 기술 추가", prescription: "뻗은 뒤 돌아와 막기 1회, 좌우 각 5회 × 2세트", cue: "기술 끝에서 전신 정지", level_up: 1 }
  ],
  balance_eyes_closed: [
    { key: "standard", suffix: "", prescription: null, cue: "반드시 지지물 옆에서 실시", level_up: 0 },
    { key: "sets", suffix: " · 10초씩 3회", prescription: "10초 × 3회, 사이 20초 휴식", cue: "눈을 뜨면 바로 자세 확인", level_up: 0 },
    { key: "feet_together", suffix: " · 발 모아", prescription: "발을 모으고 10초 × 3회", cue: "발목 흔들림을 작게", level_up: 0 },
    { key: "tandem", suffix: " · 일자 발", prescription: "일자 발로 10초 × 3회", cue: "넘어질 것 같으면 즉시 지지물 잡기", level_up: 1 },
    { key: "cushion", suffix: " · 쿠션 위", prescription: "쿠션 위에서 10초 × 3회", cue: "보호자·지도자 옆에서만", level_up: 1 }
  ],
  march: [
    { key: "standard", suffix: "", prescription: null, cue: "지지발 무릎 살짝 풀기", level_up: 0 },
    { key: "hold3", suffix: " · 3초 멈춤", prescription: "무릎 든 자세 3초 멈춤, 좌우 각 6회 × 2세트", cue: "골반이 한쪽으로 빠지지 않기", level_up: 0 },
    { key: "slow", suffix: " · 천천히 5초", prescription: "한 번 들고 내리는 데 5초, 좌우 각 5회 × 2세트", cue: "발을 소리 없이 내려놓기", level_up: 0 },
    { key: "arm_tech", suffix: " · 팔 기술 추가", prescription: "무릎 들 때 막기 1회, 좌우 각 6회 × 2세트", cue: "팔을 움직여도 몸통 고정", level_up: 1 },
    { key: "turn", suffix: " · 방향 바꾸기", prescription: "4회마다 90도 돌기, 3바퀴", cue: "돈 직후 1초 멈춤", level_up: 1 }
  ],
  turn_stop: [
    { key: "standard", suffix: "", prescription: null, cue: "돌기 전에 시선이 먼저", level_up: 0 },
    { key: "quarter", suffix: " · 90도", prescription: "90도 돌고 2초 멈춤, 좌우 각 5회", cue: "도착한 서기에서 골반 고정", level_up: 0 },
    { key: "half", suffix: " · 180도", prescription: "180도 돌고 2초 멈춤, 좌우 각 5회", cue: "돌 때 머리 높이 유지", level_up: 1 },
    { key: "tech", suffix: " · 기술 추가", prescription: "돌면서 막기 1회 후 멈춤, 좌우 각 5회 × 2세트", cue: "기술 끝과 서기 완성을 동시에", level_up: 1 },
    { key: "line", suffix: " · 품새선 따라", prescription: "품새선의 방향 전환 구간만 3회", cue: "전환마다 끝 자세 확인", level_up: 1 }
  ],
  landing: [
    { key: "standard", suffix: "", prescription: null, cue: "무릎은 발끝 방향으로 부드럽게", level_up: 0 },
    { key: "hold3", suffix: " · 3초 멈춤", prescription: "착지 후 3초 멈춤 6회 × 2세트", cue: "착지 소리를 작게", level_up: 0 },
    { key: "single", suffix: " · 한발 착지", prescription: "한발 착지 후 2초 멈춤, 좌우 각 5회", cue: "지지 무릎이 안쪽으로 모이지 않기", level_up: 1 },
    { key: "turn", suffix: " · 방향 바꿔 착지", prescription: "90도 돌며 착지 후 멈춤, 좌우 각 4회", cue: "돈 뒤에도 골반 정면", level_up: 1 },
    { key: "kick", suffix: " · 발차기 착지 연결", prescription: "앞차기 후 착지 서기 3초 멈춤, 좌우 각 5회", cue: "찬 발을 내리는 순간 서기 완성", level_up: 1 }
  ],
  plyo: [
    { key: "standard", suffix: "", prescription: null, cue: "낮고 가볍게, 착지는 조용히", level_up: 0 },
    { key: "short", suffix: " · 10초 연속", prescription: "10초 연속 × 3세트, 사이 30초 휴식", cue: "뒤꿈치가 바닥에 쿵 닿지 않기", level_up: 0 },
    { key: "stick", suffix: " · 착지 멈춤", prescription: "3번 뛰고 착지 2초 멈춤 × 5회", cue: "착지 순간 무릎 정렬", level_up: 0 },
    { key: "single", suffix: " · 한발", prescription: "한발 10회, 좌우 × 2세트", cue: "지지발 아치 유지", level_up: 1 },
    { key: "lateral", suffix: " · 좌우 이동", prescription: "좌우로 작게 이동하며 10회 × 2세트", cue: "이동해도 상체는 세운 채", level_up: 1 }
  ],
  breathing: [
    { key: "standard", suffix: "", prescription: null, cue: "배가 부풀고 가라앉는 것을 느끼기", level_up: 0 },
    { key: "long_exhale", suffix: " · 5초 내쉬기", prescription: "3초 들이쉬고 5초 내쉬기 8회", cue: "내쉴 때 갈비뼈를 아래로", level_up: 0 },
    { key: "knees", suffix: " · 무릎 세우고", prescription: "무릎 세운 자세로 8회 × 2세트", cue: "허리가 뜨지 않게", level_up: 0 },
    { key: "seated", suffix: " · 앉아서", prescription: "바르게 앉아 8회 × 2세트", cue: "어깨가 올라가지 않게", level_up: 0 },
    { key: "kihap", suffix: " · 기합 호흡 연결", prescription: "짧게 내쉬며 기합 5회 × 2세트", cue: "기합 뒤에도 자세 유지", level_up: 1 }
  ],
  iso_core: [
    { key: "standard", suffix: "", prescription: null, cue: "머리부터 골반까지 일직선", level_up: 0 },
    { key: "hold20", suffix: " · 20초 유지", prescription: "20초 × 3세트", cue: "허리가 처지지 않게", level_up: 0 },
    { key: "breath", suffix: " · 호흡하며 유지", prescription: "5호흡 유지 × 3세트", cue: "호흡 중에도 복부 긴장 유지", level_up: 0 },
    { key: "standing", suffix: " · 서서 하기", prescription: "선 자세로 같은 긴장 10초 × 5회", cue: "서기에서도 갈비뼈·골반 정렬", level_up: 1 },
    { key: "tech", suffix: " · 기술 연결", prescription: "버티기 후 막기·지르기 5회 × 3세트", cue: "발-골반-손 순서로 힘 전달", level_up: 1 }
  ],
  core_floor: [
    { key: "standard", suffix: "", prescription: null, cue: "허리가 바닥에서 뜨지 않게", level_up: 0 },
    { key: "breath", suffix: " · 호흡 고정", prescription: "내쉬며 복부 긴장 5호흡 × 2세트", cue: "호흡 중에도 허리 모양 유지", level_up: 0 },
    { key: "slow", suffix: " · 느린 팔다리", prescription: "팔다리를 4초에 걸쳐 움직여 좌우 각 6회 × 2세트", cue: "몸통이 따라 흔들리지 않기", level_up: 0 },
    { key: "longer", suffix: " · 버티기 늘리기", prescription: "끝 자세 5초 유지, 좌우 각 6회 × 2세트", cue: "골반이 기울지 않게", level_up: 1 },
    { key: "tech", suffix: " · 기술 연결", prescription: "코어 운동 후 막기·지르기 5회 × 3세트", cue: "발-골반-손 순서로 힘 전달", level_up: 1 }
  ],
  core_standing: [
    { key: "standard", suffix: "", prescription: null, cue: "갈비뼈와 골반을 겹쳐 유지", level_up: 0 },
    { key: "breath", suffix: " · 호흡 고정", prescription: "내쉬며 복부 긴장 5호흡 × 2세트", cue: "호흡 중에도 허리 모양 유지", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 정지", prescription: "끝 위치 2초 멈춤, 좌우 각 6회 × 2세트", cue: "골반과 어깨 회전을 구분", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 8회, 흔들리는 쪽 1세트 추가", cue: "양쪽 버티는 힘 비교", level_up: 1 },
    { key: "tech", suffix: " · 기술 발력 연결", prescription: "코어 동작 후 막기·지르기 5회 × 3세트", cue: "발-골반-손 순서로 힘 전달", level_up: 1 }
  ],
  carry: [
    { key: "standard", suffix: "", prescription: null, cue: "몸통이 옆으로 기울지 않게", level_up: 0 },
    { key: "steps20", suffix: " · 20걸음", prescription: "20걸음 × 3세트", cue: "어깨 높이 수평 유지", level_up: 0 },
    { key: "slow", suffix: " · 천천히 걷기", prescription: "한 걸음 3초로 10걸음 × 2세트", cue: "발을 내려놓을 때 흔들림 없이", level_up: 0 },
    { key: "stop", suffix: " · 멈춤 포함", prescription: "4걸음마다 2초 멈춤, 16걸음 × 2세트", cue: "멈춘 순간 골반 고정", level_up: 1 },
    { key: "turn", suffix: " · 방향 전환", prescription: "8걸음마다 90도 돌기 × 2세트", cue: "돌 때 몸통 회전 조절", level_up: 1 }
  ],
  upper_activation: [
    { key: "standard", suffix: "", prescription: null, cue: "어깨를 귀에서 멀리", level_up: 0 },
    { key: "hold5", suffix: " · 5초 유지", prescription: "5초 유지 8회 × 2세트", cue: "목에 힘이 들어가지 않게", level_up: 0 },
    { key: "wall", suffix: " · 벽에 기대", prescription: "벽에 등을 대고 8회 × 2세트", cue: "허리가 벽에서 뜨지 않게", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "한쪽씩 8회, 약한 쪽 1세트 추가", cue: "양쪽 날개뼈 움직임 비교", level_up: 1 },
    { key: "guard", suffix: " · 가드 자세 연결", prescription: "운동 직후 가드 자세 20초 × 3세트", cue: "가드에서도 어깨 내리기", level_up: 1 }
  ],
  upper_mobility: [
    { key: "standard", suffix: "", prescription: null, cue: "허리 대신 등과 어깨에서 움직이기", level_up: 0 },
    { key: "breath", suffix: " · 5호흡 유지", prescription: "끝범위에서 5호흡 × 2세트", cue: "내쉴 때 조금 더 열기", level_up: 0 },
    { key: "slow", suffix: " · 천천히 5초", prescription: "한 번에 5초로 6회 × 2세트", cue: "끝범위에서 튕기지 않기", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 6회, 뻣뻣한 쪽 3회 추가", cue: "양쪽 범위 차이 확인", level_up: 0 },
    { key: "guard", suffix: " · 가드 자세 연결", prescription: "운동 직후 가드 자세에서 막기 5회 × 2세트", cue: "넓어진 범위를 기술 경로에 사용", level_up: 1 }
  ],
  upper_strength: [
    { key: "standard", suffix: "", prescription: null, cue: "어깨를 내리고 날개뼈 모으기", level_up: 0 },
    { key: "pause", suffix: " · 끝에서 2초 정지", prescription: "끝 위치 2초 멈춤 8회 × 2세트", cue: "멈춘 동안 목에 힘 빼기", level_up: 0 },
    { key: "tempo", suffix: " · 3-1-3 템포", prescription: "3초 당기고·1초 정지·3초 복귀 6회 × 2세트", cue: "반동 없이", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 따로 8회, 약한 쪽 1세트 추가", cue: "양쪽 힘 차이 확인", level_up: 1 },
    { key: "tech", suffix: " · 기술 경로 연결", prescription: "운동 직후 막기·지르기 경로 5회 × 2세트", cue: "기술 끝에서 어깨 들리지 않기", level_up: 1 }
  ],
  guard_hold: [
    { key: "standard", suffix: "", prescription: null, cue: "주먹 높이와 팔꿈치 간격 유지", level_up: 0 },
    { key: "hold30", suffix: " · 30초 유지", prescription: "30초 × 3세트", cue: "어깨가 올라가지 않게", level_up: 0 },
    { key: "mirror", suffix: " · 거울 확인", prescription: "거울 앞 20초 × 3세트", cue: "좌우 주먹 높이 같게", level_up: 0 },
    { key: "moving", suffix: " · 이동하며", prescription: "앞서기로 8걸음 이동하며 유지 × 3세트", cue: "걸어도 손 위치 고정", level_up: 1 },
    { key: "return", suffix: " · 기술 후 복귀", prescription: "기술 1회 후 가드로 복귀해 2초, 8회 × 2세트", cue: "복귀 위치가 매번 같게", level_up: 1 }
  ],
  technique_hand: [
    { key: "standard", suffix: "", prescription: null, cue: "경로를 정확히 먼저, 속도는 나중에", level_up: 0 },
    { key: "end_hold", suffix: " · 끝점 3초", prescription: "기술 끝 위치에서 3초 유지 6회 × 2세트", cue: "손목·팔꿈치·어깨 선 확인", level_up: 0 },
    { key: "slow_path", suffix: " · 5초 경로", prescription: "시작부터 끝까지 5초로 6회 × 2세트", cue: "불필요한 우회 없이 정확한 경로", level_up: 0 },
    { key: "mirror", suffix: " · 거울 확인", prescription: "거울로 양손을 보며 8회 × 2세트", cue: "기술 손과 반대손이 동시에 도착", level_up: 0 },
    { key: "poomsae", suffix: " · 품새 동작 연결", prescription: "앞뒤 기술을 포함해 3동작 연결 5회 × 3세트", cue: "연결 중에도 끝 위치와 회수 유지", level_up: 1 }
  ],
  technique_iso: [
    { key: "standard", suffix: "", prescription: null, cue: "끝 위치에서 주먹·손목 고정", level_up: 0 },
    { key: "hold10", suffix: " · 10초 유지", prescription: "끝 위치 10초 × 좌우 3회", cue: "어깨가 들리지 않게", level_up: 0 },
    { key: "both", suffix: " · 반대손 함께", prescription: "반대손을 허리에 붙인 채 8회 × 2세트", cue: "두 손이 동시에 도착", level_up: 0 },
    { key: "alternate", suffix: " · 좌우 번갈아", prescription: "좌우 번갈아 각 6회 × 2세트", cue: "양쪽 끝 위치가 같게", level_up: 0 },
    { key: "band", suffix: " · 밴드 저항", prescription: "밴드를 걸고 끝 위치 5초 × 6회", cue: "밴드에 끌려가지 않게", level_up: 1 }
  ],
  finish_drill: [
    { key: "standard", suffix: "", prescription: null, cue: "끝에서 속도를 한 번에 줄이기", level_up: 0 },
    { key: "rotate", suffix: " · 기술 3종 순환", prescription: "막기·지르기·치기를 차례로 5회 × 2세트", cue: "기술이 바뀌어도 끝 멈춤은 같게", level_up: 0 },
    { key: "beat", suffix: " · 박자 맞춰", prescription: "'하나'에 기술, '둘'에 멈춤 8회 × 2세트", cue: "멈춤을 박자로 기억", level_up: 0 },
    { key: "opposite", suffix: " · 반대손 강조", prescription: "반대손이 허리에 닿는 순간 멈추기 8회 × 2세트", cue: "두 손이 동시에 끝나게", level_up: 0 },
    { key: "poomsae", suffix: " · 품새 구간 연결", prescription: "약한 품새 구간 3동작을 끝마다 멈추며 4회 × 3세트", cue: "연결해도 끝 멈춤 생략 금지", level_up: 1 }
  ],
  speed_drill: [
    { key: "standard", suffix: "", prescription: null, cue: "정확한 경로가 확보된 속도부터", level_up: 0 },
    { key: "mirror", suffix: " · 거울 확인", prescription: "거울 앞에서 5회 × 3세트", cue: "빨라져도 끝 위치는 같게", level_up: 0 },
    { key: "alternate", suffix: " · 좌우 번갈아", prescription: "좌우 번갈아 각 4회 × 3세트", cue: "양쪽 속도 차이 줄이기", level_up: 0 },
    { key: "tempo", suffix: " · 박자 변화", prescription: "60bpm 4회 후 90bpm 4회 × 2세트", cue: "박자가 빨라도 맺음 생략 금지", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 구간 연결", prescription: "약한 품새 구간 3동작을 완급 대비로 4회 × 3세트", cue: "준비는 부드럽게, 끝은 짧고 분명하게", level_up: 1 }
  ],
  kick_drill: [
    { key: "standard", suffix: "", prescription: null, cue: "낮은 높이에서 차기와 회수 경로 일치", level_up: 0 },
    { key: "hold3", suffix: " · 3초 멈춤", prescription: "핵심 자세에서 3초 멈춤, 좌우 각 5회 × 2세트", cue: "지지 무릎과 골반 정렬 유지", level_up: 0 },
    { key: "slow", suffix: " · 5초 천천히", prescription: "펴기 2초·정지 1초·회수 2초, 좌우 각 5회 × 2세트", cue: "찬 길과 같은 길로 회수", level_up: 0 },
    { key: "compare", suffix: " · 좌우 비교", prescription: "좌우 각 6회, 흔들리는 쪽 1세트 추가", cue: "양쪽 무릎 높이 비교", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 동작 연결", prescription: "차기-회수-착지 서기와 다음 기술까지 5회 × 3세트", cue: "착지 후 서기와 시선 먼저 고정", level_up: 1 }
  ]
};

// [이름, 종류, 기본 난이도(0 기초·1 중급·2 심화), 도움 되는 항목]
// 도움 항목: snap·stillness·stance·velocity(+ :punch|block|strike|kick 또는 서기 이름), rhythm, symmetry, kick, turn, general
const EXERCISE_BASES = {
  stance_foundation: [
    ["나란히서기 정렬", "stance_hold", 0, ["stance:나란히서기", "stance:any"]],
    ["모아서기 정렬", "stance_hold", 0, ["stance:모아서기", "stance:any"]],
    ["준비서기 유지", "stance_hold", 0, ["stance:준비", "stance:any", "general"]],
    ["앞서기 정지", "stance_hold", 0, ["stance:앞서기", "stillness:any"]],
    ["앞굽이 정지", "stance_hold", 0, ["stance:앞굽이", "stillness:any"]],
    ["뒷굽이 정지", "stance_hold", 1, ["stance:뒷굽이"]],
    ["범서기 균형", "stance_hold", 1, ["stance:범서기"]],
    ["꼬아서기 정지", "stance_hold", 1, ["stance:꼬아서기"]],
    ["학다리서기 정지", "stance_hold", 1, ["stance:학다리서기"]],
    ["주춤서기 버티기", "stance_hold", 1, ["stance:주춤서기"]],
    ["앞뒤 서기 전환", "stance_move", 1, ["stance:any", "turn"]],
    ["좌우 서기 너비 전환", "stance_move", 1, ["stance:any"]],
    ["서기 5종 순서 정렬", "stance_hold", 1, ["stance:any", "general"]],
    ["벽 보조 무릎 정렬 서기", "stance_hold", 0, ["stance:앞굽이", "stance:any"]],
    ["바닥선 발 위치 맞추기", "stance_hold", 0, ["stance:any", "general"]],
    ["미니밴드 서기 정렬", "stance_hold", 1, ["stance:앞굽이", "stance:any"]],
    ["낮은 중심 걷기", "stance_move", 1, ["stance:앞굽이", "stance:any"]],
    ["한 걸음 한 번 멈춤", "stance_move", 0, ["stillness:any", "stance:any", "snap:any"]],
    ["발바닥 압력 확인 서기", "stance_hold", 0, ["stance:any", "stillness:any"]],
    ["준비서기-마무리서기 반복", "stance_move", 0, ["stance:준비", "general"]]
  ],
  knee_alignment: [
    ["의자 앉았다 일어나기", "strength_bilateral", 0, ["stance:any"]],
    ["미니 스쿼트", "strength_bilateral", 0, ["stance:any"]],
    ["벽 스쿼트 버티기", "iso_hold", 0, ["stance:주춤서기", "stance:any"]],
    ["밴드 스패니시 스쿼트", "strength_bilateral", 1, ["stance:any"]],
    ["낮은 박스 스텝다운", "strength_unilateral", 1, ["stance:앞굽이", "symmetry"]],
    ["라테랄 스텝다운", "strength_unilateral", 1, ["stance:any", "symmetry"]],
    ["리버스 스텝다운", "strength_unilateral", 2, ["stance:뒷굽이", "symmetry"]],
    ["스플릿 스쿼트 등척성", "iso_hold", 1, ["stance:앞굽이"]],
    ["밴드 터미널 니 익스텐션", "strength_unilateral", 0, ["stance:any"]],
    ["미니밴드 무릎 벌려 버티기", "iso_hold", 0, ["stance:주춤서기", "stance:any"]],
    ["클램셸", "strength_unilateral", 0, ["stance:any", "symmetry"]],
    ["옆으로 누워 다리 벌리기", "strength_unilateral", 0, ["stance:any", "symmetry"]],
    ["벽 밀기 중둔근 등척성", "iso_hold", 0, ["stance:any", "stillness:kick"]],
    ["지지물 잡고 한발 앉기", "strength_unilateral", 1, ["stance:any", "symmetry"]],
    ["런지 무릎 정렬", "strength_unilateral", 1, ["stance:앞굽이", "symmetry"]],
    ["뒤꿈치 높인 스쿼트", "strength_bilateral", 1, ["stance:any"]],
    ["무릎 정렬 스쿼트", "strength_bilateral", 1, ["stance:any"]],
    ["밸런스 스쿼트 리치", "strength_unilateral", 2, ["stance:any", "stillness:any"]],
    ["스텝업 니 드라이브", "strength_unilateral", 2, ["kick", "stance:any"]],
    ["착지 무릎 정렬 멈춤", "landing", 1, ["stillness:kick", "stance:any"]]
  ],
  ankle_foot: [
    ["무릎 벽 닿기 발목 가동성", "mobility_dynamic", 0, ["stance:앞굽이", "stance:any"]],
    ["비복근 스트레칭", "stretch", 0, ["stance:any"]],
    ["가자미근 스트레칭", "stretch", 0, ["stance:앞굽이", "stance:any"]],
    ["양발 카프 레이즈", "strength_bilateral", 0, ["stance:any", "stillness:any"]],
    ["한발 카프 레이즈", "strength_unilateral", 1, ["stillness:kick", "symmetry"]],
    ["무릎 굽힌 가자미근 레이즈", "strength_bilateral", 1, ["stance:앞굽이"]],
    ["벽 기대 전경골근 레이즈", "strength_bilateral", 0, ["stance:any"]],
    ["밴드 발목 당기기", "strength_unilateral", 0, ["stance:any"]],
    ["밴드 발목 안쪽 돌리기", "strength_unilateral", 0, ["stance:any", "stillness:any"]],
    ["밴드 발목 바깥쪽 돌리기", "strength_unilateral", 0, ["stance:any", "stillness:any"]],
    ["숏풋 아치 만들기", "foot_control", 0, ["stance:any", "stillness:any"]],
    ["토 요가", "foot_control", 0, ["stance:any"]],
    ["발가락 벌리기", "foot_control", 0, ["stance:any"]],
    ["수건 발가락 당기기", "foot_control", 0, ["stance:any"]],
    ["뒤꿈치 걷기", "balance_moving", 0, ["stance:any"]],
    ["발끝 걷기", "balance_moving", 0, ["stance:any", "stillness:any"]],
    ["발목 원그리기", "mobility_dynamic", 0, ["stance:any", "general"]],
    ["좌우 발바닥 압력 이동", "foot_control", 0, ["stance:any", "stillness:any"]],
    ["서기 뒤꿈치 고정 훈련", "stance_hold", 0, ["stance:앞굽이", "stance:any"]],
    ["포고 준비 카프 바운스", "plyo", 2, ["velocity:kick", "kick"]]
  ],
  hip_mobility: [
    ["90/90 고관절 전환", "mobility_dynamic", 1, ["kick", "stance:any"]],
    ["반무릎 고관절 굴곡근 스트레칭", "stretch", 0, ["stance:앞굽이", "kick"]],
    ["소파 고관절 스트레칭", "stretch", 1, ["stance:앞굽이", "kick"]],
    ["내전근 락백", "mobility_dynamic", 0, ["stance:주춤서기", "kick"]],
    ["프로그 스트레칭", "stretch", 1, ["stance:주춤서기", "kick"]],
    ["누운 4자 엉덩이 스트레칭", "stretch", 0, ["kick", "general"]],
    ["누운 햄스트링 스트레칭", "stretch", 0, ["kick"]],
    ["능동 다리 곧게 올리기", "mobility_dynamic", 0, ["kick", "velocity:kick"]],
    ["고관절 CAR 원그리기", "mobility_dynamic", 1, ["kick"]],
    ["런지 몸통 회전", "mobility_dynamic", 1, ["turn", "stance:앞굽이"]],
    ["깊은 스쿼트 유지", "stretch", 1, ["stance:any"]],
    ["서서 고관절 원그리기", "mobility_dynamic", 0, ["kick", "general"]],
    ["엎드린 고관절 안쪽 회전", "mobility_dynamic", 0, ["kick"]],
    ["엎드린 고관절 바깥 회전", "mobility_dynamic", 0, ["kick"]],
    ["밴드 고관절 뒤쪽 활주", "mobility_dynamic", 1, ["stance:뒷굽이", "kick"]],
    ["코사크 스쿼트 가동성", "mobility_dynamic", 2, ["stance:주춤서기", "kick"]],
    ["누운 와이퍼 회전", "mobility_dynamic", 0, ["turn", "general"]],
    ["앞뒤 다리 스윙", "mobility_dynamic", 0, ["kick", "velocity:kick"]],
    ["좌우 다리 스윙", "mobility_dynamic", 0, ["kick"]],
    ["무릎 안아 고관절 열기", "mobility_dynamic", 0, ["kick", "general"]]
  ],
  hip_strength: [
    ["글루트 브리지", "strength_bilateral", 0, ["stance:any", "general"]],
    ["한발 글루트 브리지", "strength_unilateral", 1, ["stance:any", "symmetry"]],
    ["벤치 힙 스러스트", "strength_bilateral", 1, ["stance:any", "velocity:any"]],
    ["프로그 펌프", "strength_bilateral", 0, ["stance:주춤서기"]],
    ["밴드 클램셸", "strength_unilateral", 0, ["stance:any", "symmetry"]],
    ["옆으로 누워 다리 원그리기", "strength_unilateral", 0, ["stance:any", "kick"]],
    ["밴드 사이드 스텝", "band_walk", 0, ["stance:any", "stillness:any"]],
    ["밴드 몬스터 워크", "band_walk", 1, ["stance:앞굽이", "stance:any"]],
    ["파이어 하이드런트", "strength_unilateral", 0, ["kick", "symmetry"]],
    ["동키 킥", "strength_unilateral", 0, ["kick", "symmetry"]],
    ["박스 스텝업", "strength_unilateral", 1, ["stance:앞굽이", "symmetry"]],
    ["옆 방향 스텝업", "strength_unilateral", 1, ["stance:주춤서기", "symmetry"]],
    ["스플릿 스쿼트", "strength_unilateral", 1, ["stance:앞굽이", "symmetry"]],
    ["리버스 런지", "strength_unilateral", 1, ["stance:앞굽이", "stance:뒷굽이", "symmetry"]],
    ["사이드 런지", "strength_unilateral", 1, ["stance:주춤서기", "symmetry"]],
    ["한발 루마니안 데드리프트", "strength_unilateral", 2, ["stillness:kick", "symmetry"]],
    ["밴드 서서 고관절 벌리기", "strength_unilateral", 0, ["kick", "stillness:kick"]],
    ["숏 레버 코펜하겐", "iso_hold", 2, ["stance:주춤서기", "kick"]],
    ["힙 에어플레인", "balance_static", 2, ["turn", "stillness:kick"]],
    ["벽 밀기 둔근 등척성", "iso_hold", 0, ["stance:any", "stillness:kick"]]
  ],
  balance_stability: [
    ["일자 발 서기", "balance_static", 0, ["stillness:any", "general"]],
    ["일자 발 걷기", "balance_moving", 0, ["stillness:any", "stance:any"]],
    ["지지물 잡고 한발 서기", "balance_static", 0, ["stillness:kick", "symmetry"]],
    ["한발 시계 방향 리치", "balance_reach", 1, ["stillness:kick", "symmetry"]],
    ["스타 익스커션 리치", "balance_reach", 1, ["stillness:kick", "stance:any"]],
    ["좌우 체중 이동", "foot_control", 0, ["stance:any", "stillness:any"]],
    ["제자리 천천히 행진", "march", 0, ["stillness:any", "kick"]],
    ["무릎 높여 정지 행진", "march", 0, ["stillness:kick", "kick"]],
    ["품새선 방향 전환 걷기", "balance_moving", 1, ["turn", "stance:any"]],
    ["낮은 장애물 넘기", "balance_moving", 1, ["kick", "stillness:kick"]],
    ["뒤로 걷기", "balance_moving", 0, ["stance:뒷굽이", "stillness:any"]],
    ["옆으로 걷기", "balance_moving", 0, ["stance:주춤서기", "stillness:any"]],
    ["크로스오버 걷기", "balance_moving", 1, ["stance:꼬아서기", "turn"]],
    ["스텝 탭 균형", "balance_reach", 0, ["stillness:kick", "kick"]],
    ["한발 서서 팔 벌리기", "balance_static", 0, ["stillness:kick", "symmetry"]],
    ["지지물 잡고 눈감기", "balance_eyes_closed", 1, ["stillness:any"]],
    ["쿠션 위 균형 잡기", "balance_static", 1, ["stillness:any", "stillness:kick"]],
    ["발차기 준비자세 유지", "kick_drill", 0, ["kick", "stillness:kick"]],
    ["차기 펴고 접기 균형", "kick_drill", 1, ["kick", "snap:kick", "stillness:kick"]],
    ["회전 후 서기 정지", "turn_stop", 1, ["turn", "stillness:any", "stance:any"]]
  ],
  core_rotation: [
    ["누워서 복식호흡", "breathing", 0, ["rhythm", "general"]],
    ["복부 브레이싱", "iso_core", 0, ["stillness:any", "general"]],
    ["누운 골반 후방 기울이기", "core_floor", 0, ["stance:any"]],
    ["데드버그", "core_floor", 0, ["stillness:any", "velocity:any"]],
    ["버드독", "core_floor", 0, ["stillness:any", "symmetry"]],
    ["무릎 사이드 플랭크", "iso_core", 0, ["stillness:any", "symmetry"]],
    ["사이드 플랭크", "iso_core", 1, ["stillness:any", "symmetry"]],
    ["프런트 플랭크", "iso_core", 0, ["stillness:any"]],
    ["밴드 팔로프 프레스", "core_standing", 1, ["stillness:hand", "velocity:any"]],
    ["반무릎 팔로프 프레스", "core_standing", 1, ["stillness:any", "stance:앞굽이"]],
    ["안티로테이션 워크아웃", "core_standing", 2, ["stillness:any"]],
    ["베어 홀드", "iso_core", 1, ["stillness:any"]],
    ["벽 데드버그", "core_floor", 1, ["stillness:any"]],
    ["브리지 마치", "core_floor", 1, ["stillness:kick", "kick"]],
    ["한손 수트케이스 캐리", "carry", 1, ["stillness:any", "symmetry"]],
    ["양손 파머 캐리", "carry", 0, ["stillness:any", "stance:any"]],
    ["메디신볼 회전 정지", "core_standing", 2, ["snap:any", "turn"]],
    ["느린 몸통 회전", "core_standing", 0, ["turn", "velocity:any"]],
    ["피벗 코어 고정", "core_standing", 1, ["turn", "stillness:any"]],
    ["대각선 밴드 촙", "core_standing", 1, ["velocity:any", "snap:strike"]]
  ],
  upper_body_guard: [
    ["견갑골 세팅", "upper_activation", 0, ["stillness:hand", "general"]],
    ["벽 천사", "upper_mobility", 0, ["general", "snap:block"]],
    ["밴드 풀어파트", "upper_strength", 0, ["stillness:hand", "snap:block"]],
    ["밴드 페이스풀", "upper_strength", 1, ["stillness:hand"]],
    ["엎드린 Y 들기", "upper_strength", 0, ["snap:block"]],
    ["엎드린 T 들기", "upper_strength", 0, ["snap:block", "stillness:hand"]],
    ["엎드린 W 들기", "upper_strength", 0, ["stillness:hand"]],
    ["전거근 벽 슬라이드", "upper_mobility", 0, ["snap:punch"]],
    ["푸시업 플러스", "upper_strength", 1, ["snap:punch", "velocity:punch"]],
    ["폼롤러 등 펴기", "upper_mobility", 1, ["general"]],
    ["오픈북 흉추 회전", "upper_mobility", 0, ["turn", "snap:punch"]],
    ["네발기기 바늘 꿰기", "upper_mobility", 0, ["turn"]],
    ["문틀 가슴 스트레칭", "stretch", 0, ["snap:block"]],
    ["벤치 광배근 스트레칭", "stretch", 1, ["snap:block"]],
    ["밴드 어깨 바깥 회전", "upper_strength", 0, ["stillness:hand", "snap:block"]],
    ["밴드 반대손 회수 유지", "technique_hand", 0, ["snap:punch", "snap:block", "stillness:hand"]],
    ["밴드 지르기-회수", "technique_hand", 1, ["snap:punch", "velocity:punch"]],
    ["느린 막기 경로 연습", "technique_hand", 0, ["snap:block", "stillness:hand"]],
    ["반대손 허리 회수 연습", "technique_hand", 0, ["snap:punch", "snap:block", "stillness:hand"]],
    ["가드 자세 버티기", "guard_hold", 0, ["stillness:hand"]]
  ],
  speed_snap: [
    ["메트로놈 완급 연결", "speed_drill", 0, ["rhythm", "velocity:any"]],
    ["3카운트 기술 분해", "speed_drill", 0, ["snap:any", "rhythm"]],
    ["동작 끝 0.5초 정지", "finish_drill", 0, ["snap:any", "stillness:hand", "stillness:any", "general"]],
    ["지르기 끝점 등척성", "technique_iso", 0, ["snap:punch", "stillness:hand"]],
    ["밴드 지르기 가속", "speed_drill", 1, ["velocity:punch", "snap:punch"]],
    ["수건 스냅 지르기", "speed_drill", 0, ["snap:punch", "velocity:punch"]],
    ["막기 스냅 반복", "speed_drill", 0, ["snap:block", "velocity:block"]],
    ["연속 지르기 리듬", "speed_drill", 1, ["rhythm", "velocity:punch"]],
    ["한 걸음 한 기술 정지", "finish_drill", 0, ["snap:any", "stillness:any", "stance:any"]],
    ["마지막 20% 가속", "speed_drill", 1, ["velocity:any", "snap:any"]],
    ["밴드 당기기 스냅", "speed_drill", 1, ["snap:strike", "snap:block"]],
    ["메디신볼 가슴 패스", "speed_drill", 2, ["velocity:punch"]],
    ["케이블 지르기", "speed_drill", 2, ["velocity:punch"]],
    ["그림자 품새 템포", "speed_drill", 1, ["rhythm", "velocity:any", "general"]],
    ["느림-빠름 대비 품새", "speed_drill", 1, ["rhythm", "velocity:any"]],
    ["정지 후 폭발 동작", "speed_drill", 1, ["velocity:any", "snap:any"]],
    ["구호 반응 기술", "speed_drill", 1, ["velocity:any"]],
    ["기술 3회 클러스터", "speed_drill", 1, ["snap:any", "velocity:any"]],
    ["거울 손발 타이밍", "finish_drill", 0, ["snap:any", "stance:any"]],
    ["호흡-맺음 동기화", "finish_drill", 0, ["snap:any", "rhythm"]]
  ],
  kick_control: [
    ["벽 짚고 무릎 접기", "kick_drill", 0, ["kick", "snap:kick"]],
    ["앞차기 준비자세 유지", "kick_drill", 0, ["kick:앞차기", "kick", "stillness:kick"]],
    ["앞차기 펴기 제어", "kick_drill", 0, ["kick:앞차기", "kick", "snap:kick"]],
    ["돌려차기 준비자세 유지", "kick_drill", 1, ["kick:돌려차기", "kick"]],
    ["돌려차기 회수 반복", "kick_drill", 1, ["kick:돌려차기", "snap:kick"]],
    ["옆차기 준비자세 유지", "kick_drill", 1, ["kick:옆차기", "kick", "stillness:kick"]],
    ["옆차기 펴기 등척성", "kick_drill", 1, ["kick:옆차기", "snap:kick"]],
    ["뒤차기 직선 궤적", "kick_drill", 2, ["kick:뒤차기", "kick"]],
    ["무릎 높이 유지", "kick_drill", 0, ["kick", "stillness:kick"]],
    ["밴드 고관절 행진", "march", 1, ["kick", "velocity:kick"]],
    ["밴드 발차기 회수", "kick_drill", 1, ["snap:kick", "velocity:kick"]],
    ["서서 니 드라이브", "kick_drill", 0, ["kick", "velocity:kick"]],
    ["균형 앞차기", "kick_drill", 1, ["kick:앞차기", "stillness:kick"]],
    ["낮은 표적 정확히 차기", "kick_drill", 1, ["kick", "snap:kick"]],
    ["미트 터치 제어", "kick_drill", 1, ["kick", "snap:kick"]],
    ["발차기 3단계 분해", "kick_drill", 0, ["kick", "snap:kick", "rhythm"]],
    ["발차기 궤적 따라 그리기", "kick_drill", 1, ["kick", "snap:kick"]],
    ["의자 보조 발차기 경로", "kick_drill", 0, ["kick", "stillness:kick"]],
    ["발차기 착지 서기 정지", "kick_drill", 0, ["stillness:kick", "stance:any", "kick"]],
    ["좌우 번갈아 무릎 접기", "kick_drill", 0, ["kick", "symmetry"]]
  ]
};

// 집·도장에서 흔히 없는 기구. 수련(어린이) 모드 기본 추천에서는 제외하고, 대안이 없을 때만 쓴다.
const SPECIAL_EQUIPMENT = /메디신볼|케이블|폼롤러|미트/;

function inferEquipment(name) {
  if (name.includes("캐리")) return "물병 또는 가벼운 가방";
  if (name.includes("밴드")) return "미니밴드 또는 탄력밴드";
  if (name.includes("메디신볼")) return "메디신볼";
  if (name.includes("폼롤러")) return "폼롤러";
  if (name.includes("케이블")) return "케이블 머신";
  if (name.includes("박스") || name.includes("스텝")) return "낮은 스텝 또는 박스";
  if (name.includes("벽") || name.includes("문틀")) return "벽 또는 문틀";
  if (name.includes("의자") || name.includes("벤치")) return "의자 또는 벤치";
  if (name.includes("미트")) return "미트";
  if (name.includes("쿠션")) return "쿠션 또는 밸런스 패드";
  if (name.includes("수건")) return "수건";
  if (name.includes("메트로놈")) return "메트로놈 앱";
  if (name.includes("지지물")) return "의자 또는 벽";
  return "맨몸";
}

const LEVELS = ["기초", "중급", "심화"];

export const POOMSAE_EXERCISE_LIBRARY = Object.entries(EXERCISE_BASES).flatMap(([categoryKey, bases]) => {
  const meta = CATEGORY_DEFINITIONS[categoryKey];
  return bases.flatMap(([name, kind, baseLevel, focus], index) => {
    const baseId = `${categoryKey}-${String(index + 1).padStart(2, "0")}`;
    const variants = KIND_VARIANTS[kind];
    if (!variants || variants.length !== 5) throw new Error(`운동 종류 변형 정의 오류: ${kind}`);
    return variants.map((variant) => ({
      id: `${baseId}-${variant.key}`,
      base_id: baseId,
      base_name: name,
      kind,
      variant: variant.key,
      variant_label: variant.suffix ? variant.suffix.replace(/^ · /, "") : "기본",
      name: `${name}${variant.suffix}`,
      category_key: categoryKey,
      category: meta.label,
      purpose: meta.purpose,
      prescription: variant.prescription || meta.prescription,
      cues: [...meta.cues, variant.cue],
      caution: meta.caution,
      equipment: inferEquipment(name),
      special_equipment: SPECIAL_EQUIPMENT.test(name),
      level: LEVELS[Math.min(2, baseLevel + variant.level_up)],
      level_index: Math.min(2, baseLevel + variant.level_up),
      focus: focus.slice()
    }));
  });
});

export const POOMSAE_EXERCISE_LIBRARY_COUNT = POOMSAE_EXERCISE_LIBRARY.length;

function numberOr(value, fallback = 0) {
  // Number(null) === 0 이라서, 판정 불가(null)인 대칭 점수가 0점으로 읽혀 "좌우 대칭 점수가 낮아요"가 1순위로 나오던 문제.
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ── 분석 결과 → 보강이 필요한 항목(need) ──
const STANCE_NAMES = ["앞굽이", "뒷굽이", "앞서기", "범서기", "주춤서기", "학다리서기", "꼬아서기", "모아서기", "나란히서기"];
function lastTechniqueFamily(name, movementType) {
  const text = String(name || "");
  const patterns = [["kick", /차기|차고/g], ["block", /막기|막고/g], ["punch", /지르기|찌르기/g], ["strike", /치기/g]];
  let last = null;
  for (const [family, re] of patterns) {
    for (const match of text.matchAll(re)) if (!last || match.index > last.index) last = { family, index: match.index };
  }
  if (last) return last.family;
  return { block: "block", punch: "punch", strike: "strike", kick: "kick", kick_punch: "kick" }[movementType] || "";
}
function stanceOf(name) {
  const text = String(name || "");
  if (/준비/.test(text) && !/굽이|서기/.test(text.replace(/준비서기/g, ""))) return "준비";
  let found = null;
  for (const stance of STANCE_NAMES) {
    const index = text.lastIndexOf(stance);
    if (index >= 0 && (!found || index > found.index)) found = { stance, index };
  }
  return found ? found.stance : "";
}
function kickNameOf(name) {
  const match = String(name || "").match(/(앞|옆|돌려|뒤)차/);
  return match ? `${match[1]}차기` : "";
}
function segmentLabel(segment) {
  return String(segment?.orderLabel ?? segment?.order ?? "");
}
const NEED_PHRASE = {
  snap: "끝 멈춤(맺음)이 약해요",
  stillness: "멈춘 뒤 손·팔이 흔들려요",
  stance: "멈춘 뒤 발·골반이 흔들려요",
  velocity: "기술 끝 속도가 느려요",
  finish_check: "끝 멈춤을 영상에서 확인하지 못했어요",
  rhythm: "동작 사이 흐름이 끊겨요",
  symmetry: "좌우 대칭 점수가 낮아요",
  kick: "발차기 제어가 불안해요"
};
const FAMILY_TEXT = { punch: "지르기", block: "막기", strike: "치기", kick: "차기" };
function collectNeeds(report) {
  const segments = Array.isArray(report?.segments) ? report.segments : [];
  const needs = new Map();
  const add = (key, weight, segment, reasonKey, detail) => {
    if (!(weight > 0)) return;
    const need = needs.get(key) || { key, weight: 0, labels: [], reasonKey, detail };
    need.weight += weight;
    const label = segment ? segmentLabel(segment) : "";
    if (label && !need.labels.includes(label)) need.labels.push(label);
    needs.set(key, need);
  };
  segments.forEach((segment) => {
    const type = String(segment?.movementType || "");
    if (type === "hold" || type === "kihap" || /준비|기합/.test(String(segment?.name || "")) && !lastTechniqueFamily(segment?.name, type)) return;
    const family = lastTechniqueFamily(segment?.name, type);
    const stance = stanceOf(segment?.name);
    const finish = segment?.finishMetrics;
    const uncertain = !!(finish && finish.available && !finish.clearStop);
    const hasKick = /차기|차고|kick/.test(`${segment?.name || ""} ${(segment?.kickStages || []).join(" ")} ${type}`);
    const severity = (score) => Number.isFinite(Number(score)) ? Math.max(0, 72 - Number(score)) / 72 : 0;
    const snap = severity(segment?.snapScore);
    const still = severity(segment?.stillnessScore);
    const stanceSeverity = severity(segment?.stanceScore);
    const velocity = severity(segment?.velocityScore);
    if (uncertain) {
      // 끝 멈춤을 확인하지 못한 구간은 선수 약점으로 단정하지 않는다(가중치를 크게 낮춤).
      add("finish_check", Math.max(snap, still) * 0.3, segment, "finish_check");
    } else {
      if (snap > 0) add(`snap:${family || "any"}`, snap * 1.2, segment, "snap", family);
      if (still > 0) add(hasKick ? "stillness:kick" : "stillness:hand", still, segment, "stillness", family);
      if (stanceSeverity > 0) add(`stance:${stance || "any"}`, stanceSeverity, segment, "stance", stance);
    }
    // 손목·발목이 가려져 속도를 재지 못한 구간은 속도 약점으로 보지 않는다.
    if (velocity > 0 && !finish?.speedUncertain) {
      const key = `velocity:${family || "any"}`;
      add(key, velocity * 0.8, segment, "velocity", family);
      // 앱의 속도 점수 기준과 같은 목표값(발차기 포함 구간 1.8, 그 외 1.4)을 성공 기준에 쓴다.
      const need = needs.get(key);
      if (need) need.speedTarget = Math.max(need.speedTarget || 0, type === "kick_punch" ? 1.8 : 1.4);
    }
    // 끝 멈춤을 확인하지 못한 차기 구간은 점수가 측정 한계로 낮아진 것일 수 있어 차기 약점으로 보지 않는다.
    if (hasKick && !uncertain && numberOr(segment?.powerScore, 100) < 72) add(`kick:${kickNameOf(segment?.name) || "any"}`, severity(segment?.powerScore) + 0.2, segment, "kick", kickNameOf(segment?.name));
  });
  // 앱과 같은 조건(신뢰도 0.6 이상)에서, 앱이 '좋음'으로 보는 기준(박자 70·대칭 75) 미만일 때만 보강한다.
  const axes = report?.summary?.extra_axes || {};
  const trusted = (axis) => numberOr(axis?.confidence, 0) >= 0.6;
  const rhythm = trusted(axes.rhythm) ? numberOr(axes.rhythm?.score, 100) : 100;
  const symmetry = trusted(axes.symmetry) ? numberOr(axes.symmetry?.score, 100) : 100;
  const hesitations = Array.isArray(axes.rhythm?.hesitations) ? axes.rhythm.hesitations : [];
  if (rhythm < 70 || hesitations.length) {
    add("rhythm", Math.max((70 - rhythm) / 40, hesitations.length * 0.3), null, "rhythm");
    const need = needs.get("rhythm");
    hesitations.forEach((item) => { if (item?.after && !need.labels.includes(String(item.after))) need.labels.push(String(item.after)); });
  }
  if (symmetry < 75) add("symmetry", (75 - symmetry) / 40, null, "symmetry");
  // 예전 형식 리포트(구간 점수 없이 issue_counts만 있는 경우)도 지원한다.
  const issueCounts = Array.isArray(report?.summary?.issue_counts) ? report.summary.issue_counts : [];
  issueCounts.forEach((issue) => {
    const key = String(issue?.key || "");
    const count = Math.max(1, numberOr(issue?.count, 1));
    if (["snap", "stillness", "stance", "velocity"].includes(key)) {
      const specific = [...needs.keys()].some((k) => k.startsWith(`${key}:`));
      if (!specific) add(`${key}:any`, Math.min(2, count * 0.25), null, key);
    }
  });
  return [...needs.values()].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
}

// need 키와 운동의 도움 항목(focus)이 얼마나 맞는지. 정확한 기술·서기 일치를 가장 높게 본다.
function focusMatch(focus, needKey) {
  const [area, target = ""] = needKey.split(":");
  let best = 0;
  for (const item of focus) {
    const [fArea, fTarget = ""] = item.split(":");
    if (needKey === "finish_check") {
      if (item === "snap:any" || item === "stillness:any") best = Math.max(best, 0.5);
      continue;
    }
    if (fArea !== area) continue;
    if (!target || target === "any") best = Math.max(best, fTarget === "any" || !fTarget ? 0.9 : 0.6);
    else if (fTarget === target) best = Math.max(best, 1);
    else if (fTarget === "any" || !fTarget) best = Math.max(best, 0.6);
  }
  return best;
}

// 같은 일치도라면 need 성격에 더 가까운 범주·운동 종류를 조금 더 우선한다.
const NEED_CATEGORY_AFFINITY = {
  snap: { speed_snap: 0.1, upper_body_guard: 0.05, kick_control: 0.05 },
  stillness: { speed_snap: 0.08, balance_stability: 0.08, upper_body_guard: 0.05, kick_control: 0.05 },
  stance: { stance_foundation: 0.1, knee_alignment: 0.05 },
  velocity: { speed_snap: 0.1 },
  finish_check: { speed_snap: 0.1 },
  rhythm: { speed_snap: 0.1 },
  symmetry: { hip_strength: 0.05, balance_stability: 0.05 },
  kick: { kick_control: 0.1 },
  general: { speed_snap: 0.1, stance_foundation: 0.05 }
};
const NEED_KIND_AFFINITY = {
  snap: { finish_drill: 0.1, technique_hand: 0.08, technique_iso: 0.08, speed_drill: 0.05 },
  stillness: { finish_drill: 0.08, guard_hold: 0.06, technique_iso: 0.05, balance_static: 0.05, landing: 0.05 },
  stance: { stance_hold: 0.08, iso_hold: 0.03 },
  velocity: { speed_drill: 0.08 },
  kick: { kick_drill: 0.05 }
};

// need별로 가장 알맞은 수행 변형
const VARIANT_PREFERENCE = {
  snap: ["end_hold", "beat", "opposite", "hold3", "pause", "hold10", "standard"],
  stillness: ["hold3", "hold30", "end_hold", "pause", "stop", "hold10", "return", "hold20", "standard"],
  stance: ["hold3", "mirror", "pause", "stance", "hold20", "stop", "standard"],
  velocity: ["mirror", "alternate", "standard", "tempo"],
  finish_check: ["beat", "end_hold", "hold3", "standard"],
  rhythm: ["tempo", "beat", "standard"],
  symmetry: ["weak_first", "compare", "alternate", "single", "standard"],
  kick: ["hold3", "slow", "standard", "compare"],
  general: ["standard", "mirror", "hold3"]
};
const CHECK_TEXT = {
  snap: "다시 촬영했을 때 이 동작들의 '끝에서 속도 감소'가 80% 이상이면 성공",
  stillness: "다시 촬영했을 때 '멈춘 뒤 손·팔 움직임'이 '거의 없음'이면 성공",
  stance: "다시 촬영했을 때 '멈춘 뒤 발·골반 흔들림'이 '거의 없음'이면 성공",
  velocity: "다시 촬영했을 때 '기술 끝으로 들어가는 속도'가 1.4 이상이면 성공",
  finish_check: "구간 경계를 동작 끝에 맞춘 뒤 다시 분석해 끝 멈춤이 확인되면 성공",
  rhythm: "다시 촬영했을 때 박자 70점 이상이고 '흐름이 끊겼습니다' 안내가 없으면 성공",
  symmetry: "다시 촬영했을 때 좌우 대칭 75점 이상이면 성공",
  kick: "차고 난 뒤 착지 서기가 흔들림 없이 1초 이상 유지되면 성공",
  general: "같은 조건으로 다시 촬영해 이번 결과와 비교"
};

function whyText(need) {
  const labels = need.labels.slice(0, 4);
  const where = labels.length ? `${labels.join("·")}번${need.labels.length > 4 ? " 등" : ""}` : "";
  const [area, target = ""] = need.key.split(":");
  let subject = "";
  if (area === "stance" && target && target !== "any") subject = target === "준비" ? "준비서기에서" : `${target}에서`;
  else if ((area === "snap" || area === "velocity" || area === "stillness") && FAMILY_TEXT[target]) subject = FAMILY_TEXT[target];
  if (area === "kick" && target && target !== "any") return `${[where, target].filter(Boolean).join(" ")} 제어가 불안해요`;
  if (area === "stillness" && target === "kick") return [where, "차고 난 뒤 몸이 흔들려요"].filter(Boolean).join(" ");
  if (area === "rhythm" && where) return `${where} 뒤에 흐름이 끊겨요`;
  return [where, subject, NEED_PHRASE[area] || "보강이 필요해요"].filter(Boolean).join(" ");
}

export function buildPoomsaeExerciseRecommendations(report, options = {}) {
  const issueCounts = Array.isArray(report?.summary?.issue_counts) ? report.summary.issue_counts : [];
  const score100 = numberOr(report?.summary?.score_100, numberOr(report?.summary?.average_power_finish_score, 75));
  const movementIssueTotal = issueCounts.filter((issue) => issue?.key !== "visibility" && issue?.key !== "finish_check").reduce((sum, issue) => sum + Math.max(0, numberOr(issue?.count, 0)), 0);
  const automaticLimit = score100 < 60 || movementIssueTotal >= 5 ? 4 : score100 < 82 || movementIssueTotal > 0 ? 3 : 2;
  const requestedLimit = Number(options.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.max(2, Math.min(4, Math.round(requestedLimit))) : automaticLimit;
  const examMode = (report?.training_mode || options.trainingMode) !== "competition";
  const maxLevel = score100 < 60 ? 1 : score100 < 82 ? 1 : 2;

  const needs = collectNeeds(report);
  if (!needs.length) needs.push({ key: "general", weight: 0.1, labels: [], reasonKey: "general" });
  const allowed = (exercise) => exercise.level_index <= maxLevel && (!examMode || !exercise.special_equipment);
  const bases = new Map();
  POOMSAE_EXERCISE_LIBRARY.forEach((exercise) => {
    if (!bases.has(exercise.base_id)) bases.set(exercise.base_id, []);
    bases.get(exercise.base_id).push(exercise);
  });

  const picks = [];
  const usedCategories = new Map();
  const usedBases = new Set();
  // 각 need에 가장 잘 맞는 운동을 우선순위대로 하나씩 고르고, 남으면 다음 need로 넘어간다.
  const needQueue = needs.slice(0, 6);
  for (let round = 0; picks.length < limit && round < 3; round += 1) {
    for (const need of needQueue) {
      if (picks.length >= limit) break;
      if (round === 0 && picks.some((pick) => pick.needKey === need.key)) continue;
      let best = null;
      for (const [baseId, variants] of bases) {
        if (usedBases.has(baseId)) continue;
        const base = variants[0];
        const match = need.key === "general"
          ? (base.focus.includes("general") ? 1 : 0)
          : focusMatch(base.focus, need.key);
        if (!(match > 0)) continue;
        const needArea = need.key.split(":")[0];
        const affinity = (NEED_CATEGORY_AFFINITY[needArea]?.[base.category_key] || 0) + (NEED_KIND_AFFINITY[needArea]?.[base.kind] || 0);
        const categoryPenalty = (usedCategories.get(base.category_key) || 0) * 0.35;
        const levelBias = base.level_index * 0.04;
        const equipmentBias = base.equipment === "맨몸" ? 0.02 : 0;
        const value = match + affinity - categoryPenalty - levelBias + equipmentBias;
        if (!best || value > best.value + 1e-9) best = { value, baseId, variants };
      }
      if (!best) continue;
      const area = need.key.split(":")[0];
      const preference = VARIANT_PREFERENCE[area] || VARIANT_PREFERENCE.general;
      const usable = best.variants.filter(allowed);
      if (!usable.length) continue;
      const chosen = preference.map((key) => usable.find((variant) => variant.variant === key)).find(Boolean) || usable[0];
      usedBases.add(best.baseId);
      usedCategories.set(chosen.category_key, (usedCategories.get(chosen.category_key) || 0) + 1);
      picks.push({ exercise: chosen, need, needKey: need.key });
    }
  }
  return picks.slice(0, limit).map(({ exercise, need }, rank) => {
    const area = need.key.split(":")[0];
    const { focus, level_index, special_equipment, ...visible } = exercise;
    return {
      ...visible,
      why: need.key === "general" ? "큰 약점이 없어 품새 기본 정렬 유지용으로 추천" : whyText(need),
      focus_need: need.key,
      target_movements: need.labels.slice(0, 6),
      check: need.key === "stillness:kick"
        ? CHECK_TEXT.kick
        : area === "velocity" && need.speedTarget
          ? CHECK_TEXT.velocity.replace("1.4", need.speedTarget.toFixed(1))
          : (CHECK_TEXT[area] || CHECK_TEXT.general),
      priority: rank + 1
    };
  });
}
