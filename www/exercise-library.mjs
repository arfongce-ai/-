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
    cues: ["마지막 20%에서 가속", "끝점에서 0.5초 정확히 멈추기"],
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

const EXERCISE_NAMES = {
  stance_foundation: [
    "나란히서기 정렬", "모아서기 정렬", "준비서기 10초 유지", "앞서기 정지", "앞굽이 정지",
    "뒷굽이 정지", "범서기 균형", "꼬아서기 정지", "학다리서기 정지", "주춤서기 버티기",
    "앞뒤 서기 전환", "좌우 서기 너비 전환", "거울 앞 서기 정렬", "벽 보조 무릎 정렬 서기", "바닥선 발 위치 맞추기",
    "미니밴드 서기 정렬", "낮은 중심 걷기", "한 걸음 한 번 멈춤", "발바닥 압력 확인 서기", "준비서기-마무리서기 반복"
  ],
  knee_alignment: [
    "의자 앉았다 일어나기", "미니 스쿼트", "벽 스쿼트 버티기", "밴드 스패니시 스쿼트", "낮은 박스 스텝다운",
    "라테랄 스텝다운", "리버스 스텝다운", "스플릿 스쿼트 등척성", "밴드 터미널 니 익스텐션", "미니밴드 사이드 워크",
    "클램셸", "옆으로 누워 다리 벌리기", "벽 밀기 중둔근 등척성", "지지물 잡고 한발 앉기", "런지 무릎 정렬",
    "뒤꿈치 높인 스쿼트", "3초 템포 스쿼트", "밸런스 스쿼트 리치", "스텝업 니 드라이브", "착지 무릎 정렬 멈춤"
  ],
  ankle_foot: [
    "무릎 벽 닿기 발목 가동성", "비복근 스트레칭", "가자미근 스트레칭", "양발 카프 레이즈", "한발 카프 레이즈",
    "무릎 굽힌 가자미근 레이즈", "벽 기대 전경골근 레이즈", "밴드 발목 당기기", "밴드 발목 안쪽 돌리기", "밴드 발목 바깥쪽 돌리기",
    "숏풋 아치 만들기", "토 요가", "발가락 벌리기", "수건 발가락 당기기", "뒤꿈치 걷기",
    "발끝 걷기", "발목 원그리기", "좌우 발바닥 압력 이동", "서기 뒤꿈치 고정 훈련", "포고 준비 카프 바운스"
  ],
  hip_mobility: [
    "90/90 고관절 전환", "반무릎 고관절 굴곡근 스트레칭", "소파 고관절 스트레칭", "내전근 락백", "프로그 스트레칭",
    "누운 4자 엉덩이 스트레칭", "누운 햄스트링 스트레칭", "능동 다리 곧게 올리기", "고관절 CAR 원그리기", "런지 몸통 회전",
    "깊은 스쿼트 유지", "서서 고관절 원그리기", "엎드린 고관절 안쪽 회전", "엎드린 고관절 바깥 회전", "밴드 고관절 뒤쪽 활주",
    "코사크 스쿼트 가동성", "누운 와이퍼 회전", "앞뒤 다리 스윙", "좌우 다리 스윙", "무릎 안아 고관절 열기"
  ],
  hip_strength: [
    "글루트 브리지", "한발 글루트 브리지", "벤치 힙 스러스트", "프로그 펌프", "밴드 클램셸",
    "옆으로 누워 엉덩이 벌리기", "밴드 사이드 스텝", "밴드 몬스터 워크", "파이어 하이드런트", "동키 킥",
    "박스 스텝업", "옆 방향 스텝업", "스플릿 스쿼트", "리버스 런지", "사이드 런지",
    "한발 루마니안 데드리프트", "밴드 서서 고관절 벌리기", "숏 레버 코펜하겐", "힙 에어플레인", "벽 밀기 둔근 등척성"
  ],
  balance_stability: [
    "일자 발 서기", "일자 발 걷기", "지지물 잡고 한발 서기", "한발 시계 방향 리치", "스타 익스커션 리치",
    "좌우 체중 이동", "제자리 천천히 행진", "무릎 높여 정지 행진", "뒤꿈치-발끝 걷기", "낮은 장애물 넘기",
    "뒤로 걷기", "옆으로 걷고 멈추기", "크로스오버 걷기", "스텝 탭 균형", "한발 서서 고개 돌리기",
    "지지물 잡고 눈감기", "쿠션 위 균형 잡기", "발차기 준비자세 유지", "느린 차기 펴고 접기", "회전 후 서기 정지"
  ],
  core_rotation: [
    "누워서 복식호흡", "복부 브레이싱", "누운 골반 후방 기울이기", "데드버그", "버드독",
    "무릎 사이드 플랭크", "사이드 플랭크", "프런트 플랭크", "밴드 팔로프 프레스", "반무릎 팔로프 프레스",
    "안티로테이션 워크아웃", "베어 홀드", "벽 데드버그", "브리지 마치", "한손 수트케이스 캐리",
    "양손 파머 캐리", "메디신볼 회전 정지", "느린 몸통 회전", "피벗 코어 고정", "대각선 밴드 촙"
  ],
  upper_body_guard: [
    "견갑골 세팅", "벽 천사", "밴드 풀어파트", "밴드 페이스풀", "엎드린 Y 들기",
    "엎드린 T 들기", "엎드린 W 들기", "전거근 벽 슬라이드", "푸시업 플러스", "폼롤러 등 펴기",
    "오픈북 흉추 회전", "네발기기 바늘 꿰기", "문틀 가슴 스트레칭", "벤치 광배근 스트레칭", "밴드 어깨 바깥 회전",
    "밴드 반대손 회수 유지", "밴드 지르기-회수", "느린 막기 경로 연습", "거울 반대손 회수", "가드 자세 버티기"
  ],
  speed_snap: [
    "메트로놈 완급 연결", "3카운트 기술 분해", "동작 끝 0.5초 정지", "지르기 끝점 등척성", "밴드 지르기 가속",
    "수건 스냅 지르기", "막기 스냅 반복", "연속 지르기 리듬", "한 걸음 한 기술 정지", "마지막 20% 가속",
    "밴드 당기기 스냅", "메디신볼 가슴 패스", "케이블 지르기", "그림자 품새 템포", "느림-빠름 대비 품새",
    "정지 후 폭발 동작", "구호 반응 기술", "기술 3회 클러스터", "거울 손발 타이밍", "호흡-맺음 동기화"
  ],
  kick_control: [
    "벽 짚고 무릎 접기", "앞차기 준비자세 유지", "느린 앞차기 펴기", "돌려차기 준비자세 유지", "돌려차기 회수 반복",
    "옆차기 준비자세 유지", "옆차기 펴기 등척성", "뒤차기 직선 궤적", "무릎 높이 유지", "밴드 고관절 행진",
    "밴드 발차기 회수", "서서 니 드라이브", "균형 앞차기", "낮은 표적 정확히 차기", "미트 터치 제어",
    "발차기 3단계 분해", "5초 느린 발차기", "의자 보조 발차기 경로", "발차기 착지 서기 정지", "좌우 번갈아 무릎 접기"
  ]
};

// 200개 원형 운동마다 목적에 맞는 수행 방식을 5개씩 제공한다.
// 단순히 번호만 늘리는 대신 시간·피드백·리듬·품새 연결 조건을 바꿔
// 실제 수련에서 난이도와 과제를 구분할 수 있는 1,000개 변형으로 만든다.
const CATEGORY_VARIANTS = {
  stance_foundation: [
    { key: "standard", suffix: "", prescription: null, cue: "기본 정렬을 먼저 정확히 익히기", level_up: 0 },
    { key: "hold", suffix: " · 끝자세 3초", prescription: "끝자세 3초 유지 5회 × 2세트", cue: "정지하는 동안 중심 높이 고정", level_up: 0 },
    { key: "mirror", suffix: " · 거울 피드백", prescription: "거울로 발·무릎을 확인하며 6회 × 2세트", cue: "좌우 모양을 눈으로 즉시 교정", level_up: 0 },
    { key: "slow", suffix: " · 5초 전환", prescription: "5초에 걸쳐 이동하고 2초 정지 5회 × 2세트", cue: "머리 높이가 위아래로 튀지 않기", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 연결", prescription: "해당 서기 앞뒤 기술을 연결해 3회 × 3세트", cue: "기술이 끝날 때 서기도 동시에 완성", level_up: 1 }
  ],
  knee_alignment: [
    { key: "standard", suffix: "", prescription: null, cue: "무릎과 두 번째 발가락 방향 일치", level_up: 0 },
    { key: "eccentric", suffix: " · 3초 내려가기", prescription: "3초 내려가고 1초 올라오기 6회 × 2세트", cue: "내려가는 동안 무릎 안쪽 붕괴 방지", level_up: 0 },
    { key: "hold", suffix: " · 중간지점 정지", prescription: "중간 깊이에서 3초 유지 5회 × 2세트", cue: "발바닥 세 점 압력 유지", level_up: 0 },
    { key: "alternating", suffix: " · 좌우 교대", prescription: "좌우 번갈아 각 6회 × 2세트", cue: "양쪽 무릎 궤적 차이 확인", level_up: 1 },
    { key: "stance", suffix: " · 서기 전환", prescription: "앞굽이·뒷굽이 전환과 연결해 5회 × 3세트", cue: "전환 직후 무릎 정렬 고정", level_up: 1 }
  ],
  ankle_foot: [
    { key: "standard", suffix: "", prescription: null, cue: "발바닥 세 점을 바닥에 유지", level_up: 0 },
    { key: "hold", suffix: " · 끝범위 3초", prescription: "끝범위에서 3초 유지 6회 × 2세트", cue: "발목이 안팎으로 꺾이지 않기", level_up: 0 },
    { key: "slow", suffix: " · 느린 제어", prescription: "3초 이동·1초 정지·3초 복귀 6회 × 2세트", cue: "반동 없이 발목으로 제어", level_up: 0 },
    { key: "single_side", suffix: " · 한쪽 집중", prescription: "약한 쪽 8회, 반대쪽 6회 × 2세트", cue: "좌우 가동 범위와 흔들림 비교", level_up: 1 },
    { key: "landing", suffix: " · 이동 후 고정", prescription: "한 걸음 이동 후 발바닥을 고정해 6회 × 3세트", cue: "착지와 동시에 뒤꿈치·아치 안정", level_up: 1 }
  ],
  hip_mobility: [
    { key: "standard", suffix: "", prescription: null, cue: "허리 보상 없이 고관절에서 움직이기", level_up: 0 },
    { key: "breathing", suffix: " · 5호흡 유지", prescription: "편안한 끝범위에서 5호흡 × 좌우 2세트", cue: "내쉴 때 긴장을 조금씩 낮추기", level_up: 0 },
    { key: "dynamic", suffix: " · 동적 가동", prescription: "통증 없는 범위로 좌우 각 8회 × 2세트", cue: "반동보다 부드러운 연속 움직임", level_up: 0 },
    { key: "active", suffix: " · 능동 끝범위", prescription: "도움 없이 끝범위 2초 유지 6회 × 2세트", cue: "가동 범위를 스스로 제어", level_up: 1 },
    { key: "kick_range", suffix: " · 발차기 연결", prescription: "가동성 동작 후 낮은 발차기 5회 × 3세트", cue: "확보한 범위를 차기·회수까지 유지", level_up: 1 }
  ],
  hip_strength: [
    { key: "standard", suffix: "", prescription: null, cue: "지지발 전체로 바닥 밀기", level_up: 0 },
    { key: "hold", suffix: " · 수축 3초", prescription: "힘이 가장 필요한 지점에서 3초 유지 6회 × 2세트", cue: "골반이 돌아가거나 떨어지지 않기", level_up: 0 },
    { key: "tempo", suffix: " · 3-1-3 템포", prescription: "3초 이동·1초 정지·3초 복귀 6회 × 2세트", cue: "허리 대신 엉덩이로 힘내기", level_up: 0 },
    { key: "unilateral", suffix: " · 좌우 비대칭 보완", prescription: "약한 쪽 2회 추가, 좌우 각 8회 × 2세트", cue: "양쪽 골반 높이 차이 확인", level_up: 1 },
    { key: "stance", suffix: " · 낮은 서기 연결", prescription: "운동 직후 낮은 서기 10초 유지 × 3세트", cue: "둔근 힘을 서기 안정성으로 연결", level_up: 1 }
  ],
  balance_stability: [
    { key: "standard", suffix: "", prescription: null, cue: "시선을 한 점에 두고 호흡 유지", level_up: 0 },
    { key: "hold", suffix: " · 30초 정지", prescription: "지지물 가까이에서 좌우 각 30초 × 2세트", cue: "발가락을 과하게 움켜쥐지 않기", level_up: 0 },
    { key: "head_turn", suffix: " · 시선 이동", prescription: "균형을 잡고 시선을 좌우로 5회 × 2세트", cue: "시선 이동 중 골반은 정면 유지", level_up: 1 },
    { key: "reach", suffix: " · 방향 리치", prescription: "균형을 유지하며 3방향 리치 각 4회 × 2세트", cue: "지지 무릎 정렬을 끝까지 유지", level_up: 1 },
    { key: "poomsae", suffix: " · 동작 끝 정지", prescription: "품새 기술 후 3초 멈춤 5회 × 3세트", cue: "기술 끝과 전신 정지를 동시에 완성", level_up: 1 }
  ],
  core_rotation: [
    { key: "standard", suffix: "", prescription: null, cue: "갈비뼈와 골반을 겹쳐 유지", level_up: 0 },
    { key: "breathing", suffix: " · 호흡 고정", prescription: "내쉬며 복부 긴장 5호흡 × 2세트", cue: "호흡 중에도 허리 모양 유지", level_up: 0 },
    { key: "slow", suffix: " · 느린 팔다리", prescription: "팔다리를 4초에 걸쳐 움직여 좌우 각 6회 × 2세트", cue: "몸통이 따라 돌아가지 않기", level_up: 0 },
    { key: "pause", suffix: " · 회전 끝 정지", prescription: "회전 끝에서 2초 멈춰 좌우 각 6회 × 2세트", cue: "골반과 어깨 회전을 구분", level_up: 1 },
    { key: "technique", suffix: " · 기술 발력 연결", prescription: "코어 동작 후 막기·지르기 5회 × 3세트", cue: "발-골반-손 순서로 힘 전달", level_up: 1 }
  ],
  upper_body_guard: [
    { key: "standard", suffix: "", prescription: null, cue: "어깨를 귀에서 멀리 유지", level_up: 0 },
    { key: "hold", suffix: " · 끝점 3초", prescription: "기술 끝 위치에서 3초 유지 6회 × 2세트", cue: "손목·팔꿈치·어깨 선 확인", level_up: 0 },
    { key: "slow", suffix: " · 5초 경로", prescription: "시작부터 끝까지 5초로 움직여 6회 × 2세트", cue: "불필요한 우회 없이 정확한 경로", level_up: 0 },
    { key: "mirror", suffix: " · 반대손 거울 확인", prescription: "거울로 양손을 보며 8회 × 2세트", cue: "기술 손과 반대손이 동시에 도착", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 기술 연결", prescription: "앞뒤 기술을 포함해 3동작 연결 5회 × 3세트", cue: "연결 중에도 가드와 회수 위치 유지", level_up: 1 }
  ],
  speed_snap: [
    { key: "standard", suffix: "", prescription: null, cue: "정확한 경로가 확보된 속도부터 시작", level_up: 0 },
    { key: "pause_burst", suffix: " · 정지 후 가속", prescription: "준비 자세 2초 정지 후 1회 빠르게, 5회 × 3세트", cue: "예비 동작 없이 마지막 구간 가속", level_up: 0 },
    { key: "contrast", suffix: " · 느림-빠름 대비", prescription: "느린 1회와 빠른 1회를 묶어 4세트", cue: "두 속도에서도 끝 위치는 동일", level_up: 1 },
    { key: "metronome", suffix: " · 박자 변화", prescription: "60bpm 4회 후 90bpm 4회 × 2세트", cue: "박자가 빨라도 맺음 생략 금지", level_up: 1 },
    { key: "poomsae", suffix: " · 품새 구간 완급", prescription: "약한 품새 구간 3동작을 완급 대비로 4회 × 3세트", cue: "준비는 부드럽게, 끝은 짧고 분명하게", level_up: 1 }
  ],
  kick_control: [
    { key: "standard", suffix: "", prescription: null, cue: "낮은 높이에서 차기와 회수 경로 일치", level_up: 0 },
    { key: "chamber_hold", suffix: " · 무릎 접기 3초", prescription: "무릎 접은 자세 3초 유지 후 복귀 5회 × 2세트", cue: "지지 무릎과 골반 정렬 유지", level_up: 0 },
    { key: "slow", suffix: " · 5초 차기", prescription: "펴기 2초·정지 1초·회수 2초, 좌우 각 5회 × 2세트", cue: "찬 길과 같은 길로 회수", level_up: 0 },
    { key: "target", suffix: " · 표적 정확도", prescription: "낮은 표적을 흔들지 않게 좌우 각 6회 × 2세트", cue: "세기보다 발끝 도착 위치 우선", level_up: 1 },
    { key: "landing", suffix: " · 착지 서기 연결", prescription: "차기-회수-착지 서기를 5회 × 3세트", cue: "착지 후 3초 동안 중심과 시선 고정", level_up: 1 }
  ]
};

function inferEquipment(name) {
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
  return "맨몸";
}

export const POOMSAE_EXERCISE_LIBRARY = Object.entries(EXERCISE_NAMES).flatMap(([categoryKey, names]) => {
  const meta = CATEGORY_DEFINITIONS[categoryKey];
  return names.flatMap((name, index) => {
    const baseLevel = index < 7 ? 0 : index < 15 ? 1 : 2;
    const baseId = `${categoryKey}-${String(index + 1).padStart(2, "0")}`;
    return CATEGORY_VARIANTS[categoryKey].map((variant) => ({
      id: `${baseId}-${variant.key}`,
      base_id: baseId,
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
      level: ["기초", "중급", "심화"][Math.min(2, baseLevel + variant.level_up)]
    }));
  });
});

export const POOMSAE_EXERCISE_LIBRARY_COUNT = POOMSAE_EXERCISE_LIBRARY.length;

const ISSUE_CATEGORY_WEIGHTS = {
  stance: { stance_foundation: 56, knee_alignment: 46, ankle_foot: 28, hip_strength: 22, balance_stability: 18 },
  stillness: { balance_stability: 56, core_rotation: 38, stance_foundation: 30, ankle_foot: 18 },
  velocity: { speed_snap: 58, core_rotation: 20, hip_strength: 16 },
  snap: { speed_snap: 58, upper_body_guard: 42, core_rotation: 22 },
  visibility: {}
};

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const ch of String(value || "")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function averageMetric(segments, key) {
  const values = segments.map((segment) => Number(segment?.[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function addWeight(scores, reasons, categoryKey, weight, reason) {
  if (!CATEGORY_DEFINITIONS[categoryKey] || !(weight > 0)) return;
  scores[categoryKey] += weight;
  if (reason && !reasons[categoryKey].includes(reason)) reasons[categoryKey].push(reason);
}

function applyWeights(scores, reasons, weights, multiplier, reason) {
  Object.entries(weights || {}).forEach(([categoryKey, weight]) => addWeight(scores, reasons, categoryKey, weight * multiplier, reason));
}

function movementText(segment) {
  return `${segment?.name || ""} ${segment?.feedback || ""} ${(segment?.kickStages || []).join(" ")}`;
}

export function buildPoomsaeExerciseRecommendations(report, options = {}) {
  const segments = Array.isArray(report?.segments) ? report.segments : [];
  const issueCounts = Array.isArray(report?.summary?.issue_counts) ? report.summary.issue_counts : [];
  const scores = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map((key) => [key, 0]));
  const reasons = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map((key) => [key, []]));

  issueCounts.forEach((issue, index) => {
    const count = Math.max(1, numberOr(issue?.count, 1));
    const label = issue?.label || issue?.key || "반복 문제";
    applyWeights(scores, reasons, ISSUE_CATEGORY_WEIGHTS[issue?.key], Math.min(2.5, 1 + count * 0.18) * (1 - index * 0.08), `${label}이 반복되어 우선 보강`);
  });

  const weakSegments = segments.slice().sort((a, b) => numberOr(a?.powerScore, 100) - numberOr(b?.powerScore, 100)).slice(0, 5);
  weakSegments.forEach((segment) => {
    const text = movementText(segment);
    const name = segment?.name || `${segment?.order || ""}번 동작`;
    if (/차기|kick/i.test(text)) {
      addWeight(scores, reasons, "kick_control", 62, `${name}의 차기·회수 제어를 보완`);
      addWeight(scores, reasons, "balance_stability", 32, `${name} 착지 뒤 흔들림을 보완`);
      addWeight(scores, reasons, "hip_mobility", 20, `${name}의 발차기 가동 범위를 보조`);
    }
    if (/막기|지르기|찌르기|치기|block|punch/i.test(text)) {
      addWeight(scores, reasons, "upper_body_guard", 42, `${name}의 기술 경로와 반대손을 정돈`);
      addWeight(scores, reasons, "speed_snap", 24, `${name}의 끝 맺음을 선명하게 보완`);
    }
    if (/회전|돌아|돌기|turn/i.test(text)) {
      addWeight(scores, reasons, "balance_stability", 36, `${name}의 회전 뒤 중심을 보완`);
      addWeight(scores, reasons, "core_rotation", 30, `${name}의 몸통 회전 연결을 보완`);
    }
    if (/서기|굽이|stance/i.test(text)) {
      addWeight(scores, reasons, "stance_foundation", 42, `${name}의 서기 폭과 중심을 보완`);
      addWeight(scores, reasons, "knee_alignment", 28, `${name}의 무릎·발끝 정렬을 보완`);
      addWeight(scores, reasons, "hip_strength", 20, `${name}의 낮은 자세 유지를 보조`);
    }
  });

  const metricRules = [
    ["stanceScore", "stance_foundation", "서기 안정성", 48],
    ["stillnessScore", "balance_stability", "정지 안정성", 48],
    ["snapScore", "speed_snap", "맺음", 48],
    ["velocityScore", "speed_snap", "속도 표현", 34]
  ];
  metricRules.forEach(([metric, categoryKey, label, maxWeight]) => {
    const value = averageMetric(segments, metric);
    if (value != null && value < 78) addWeight(scores, reasons, categoryKey, Math.max(8, (78 - value) / 28 * maxWeight), `${label} 평균 ${Math.round(value)}점을 보완`);
  });

  const rhythm = numberOr(report?.summary?.extra_axes?.rhythm?.score, 100);
  const symmetry = numberOr(report?.summary?.extra_axes?.symmetry?.score, 100);
  if (rhythm < 72) addWeight(scores, reasons, "speed_snap", (72 - rhythm) * 1.2, `리듬 점수 ${Math.round(rhythm)}점을 보완`);
  if (symmetry < 74) {
    addWeight(scores, reasons, "balance_stability", (74 - symmetry) * 0.8, `좌우 대칭 점수 ${Math.round(symmetry)}점을 보완`);
    addWeight(scores, reasons, "knee_alignment", (74 - symmetry) * 0.55, "좌우 정렬 차이를 줄이기 위한 보강");
  }

  addWeight(scores, reasons, "stance_foundation", 8, "품새 기본 서기 정렬 유지");
  addWeight(scores, reasons, "balance_stability", 7, "동작 끝의 중심 유지");
  addWeight(scores, reasons, "upper_body_guard", 5, "기술 경로와 반대손 정돈");

  const score100 = numberOr(report?.summary?.score_100, numberOr(report?.summary?.average_power_finish_score, 75));
  const movementIssueTotal = issueCounts.filter((issue) => issue?.key !== "visibility").reduce((sum, issue) => sum + Math.max(0, numberOr(issue?.count, 0)), 0);
  const automaticLimit = score100 < 60 || movementIssueTotal >= 5 ? 4 : score100 < 82 || movementIssueTotal > 0 ? 3 : 2;
  const requestedLimit = Number(options.limit);
  const limit = Number.isFinite(requestedLimit) ? Math.max(2, Math.min(4, Math.round(requestedLimit))) : automaticLimit;
  const seed = `${report?.analysis_link_id || report?.created_at || "poomsae"}:${report?.poomsae?.id || "general"}`;

  return Object.keys(scores)
    .sort((a, b) => scores[b] - scores[a] || a.localeCompare(b))
    .slice(0, limit)
    .map((categoryKey, rank) => {
      const candidates = POOMSAE_EXERCISE_LIBRARY.filter((exercise) => exercise.category_key === categoryKey && (score100 >= 60 || exercise.level !== "심화"));
      const selected = candidates[stableHash(`${seed}:${categoryKey}:${rank}`) % candidates.length];
      return {
        ...selected,
        why: reasons[categoryKey][0] || CATEGORY_DEFINITIONS[categoryKey].purpose,
        priority: rank + 1
      };
    });
}
