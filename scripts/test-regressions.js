// 2026-09-23 전체 점검에서 발견한 버그들의 회귀 테스트.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
function extractFunction(name) {
  const match = new RegExp(`      (?:async )?function ${name}\\(`).exec(html);
  assert.ok(match, `Missing ${name}`);
  const end = html.indexOf('\n      }', match.index);
  return html.slice(match.index, end + '\n      }'.length);
}
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

function bannerHarness(cache) {
  const reads = [];
  const applied = [];
  const context = vm.createContext({
    localStorage: storage(cache ? { banner: JSON.stringify(cache) } : {}),
    BANNER_CACHE_KEY: 'banner', FIREBASE_READ_CACHE_TTL_MS: 7 * 86400000, Date, JSON, Number,
    _fbReady: true, _fbDB: {}, _fbDoc: (_, col, id) => `${col}/${id}`,
    _fbGetDoc: async (ref) => { reads.push(ref); return { exists: () => true, data: () => ({ enabled: true, imageUrl: 'remote' }) }; },
    applyBannerToDom: (config) => applied.push(config),
    _bannerConfigCache: null, _bannerCheckTimer: null,
    setInterval: () => 1, clearInterval: () => {}
  });
  vm.runInContext(extractFunction('initPartnerBanner'), context);
  return { context, reads, applied };
}

test('banner: public devices read Firestore when there is no cache (was cache-only forever)', async () => {
  const { context, reads, applied } = bannerHarness(null);
  await context.initPartnerBanner();
  assert.deepEqual(reads, ['app_config/banner']);
  assert.equal(applied.at(-1).imageUrl, 'remote');
});

test('banner: public devices read Firestore again once the 7-day cache expires', async () => {
  const { context, reads } = bannerHarness({ savedAt: Date.now() - 8 * 86400000, data: { imageUrl: 'old' } });
  await context.initPartnerBanner();
  assert.equal(reads.length, 1);
});

test('banner: a fresh cache is used without a Firestore read', async () => {
  const { context, reads, applied } = bannerHarness({ savedAt: Date.now(), data: { imageUrl: 'cached' } });
  await context.initPartnerBanner();
  assert.equal(reads.length, 0);
  assert.equal(applied.at(-1).imageUrl, 'cached');
});

test('banner: admin login always reloads so a stale cache cannot overwrite newer campaigns', async () => {
  const { context, reads } = bannerHarness({ savedAt: Date.now(), data: { imageUrl: 'cached' } });
  await context.initPartnerBanner({ forceRemoteRead: true });
  assert.equal(reads.length, 1);
  assert.match(html, /if \(user\) initPartnerBanner\(\{ forceRemoteRead: true \}\)/);
});

function decodeHarness(overrides = {}) {
  const shown = [];
  const file = { name: 'taegeuk1.mp4', size: 123 };
  const context = vm.createContext({
    selectedFile: file, video: {}, isAnalyzing: false, decodedFrameFileKey: '', lastHevcWarnKey: '',
    videoDecodeReady: () => false,
    setProgress: (_, text) => shown.push(text), renderReport: () => {}, updateAnalyzeButtonState: () => {},
    setTimeout: (fn) => fn(),
    ...overrides
  });
  vm.runInContext(extractFunction('scheduleDecodeReadinessCheck'), context);
  return { context, shown, file };
}

test('HEVC warning: not shown while an analysis is seeking the video', () => {
  const { context, shown, file } = decodeHarness({ isAnalyzing: true });
  context.scheduleDecodeReadinessCheck(file);
  assert.equal(shown.length, 0);
});

test('HEVC warning: not shown once a real frame of the same file was decoded', () => {
  const { context, shown, file } = decodeHarness({ decodedFrameFileKey: 'taegeuk1.mp4|123' });
  context.scheduleDecodeReadinessCheck(file);
  assert.equal(shown.length, 0);
  assert.match(html, /if \(isSelectedMainSource && selectedFile\) decodedFrameFileKey = /);
});

test('HEVC warning: still shown for a file whose frames never decoded', () => {
  const { context, shown, file } = decodeHarness();
  context.scheduleDecodeReadinessCheck(file);
  assert.equal(shown.length, 1);
  assert.match(shown[0], /HEVC/);
});

function issueHarness() {
  const context = vm.createContext({ Number, String, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  vm.runInContext(`var ISSUE_SCORE_THRESHOLD = ${/const ISSUE_SCORE_THRESHOLD = (\d+);/.exec(html)[1]};`, context);
  for (const name of ['tempoSkipsSpeed', 'segmentFinishTechnique', 'segmentTechniqueCopy', 'finishLevelText', 'finishEvidence', 'segmentIssueDetails']) {
    vm.runInContext(extractFunction(name), context);
  }
  return (segment, limit = 2) => context.segmentIssueDetails({
    visibilityScore: 95, velocityScore: 40, snapScore: 10, stillnessScore: 95, stanceScore: 95, ...segment
  }, limit);
}

test('coaching copy: blocks, kicks and punches get their own finish cue', () => {
  const details = issueHarness();
  const block = details({ name: '왼 앞서기 아래막기', movementType: 'block' });
  assert.equal(block[0].label, '맺음');
  assert.doesNotMatch(block[0].kidFix + block[0].fix, /지르는/);
  assert.match(block[0].kidFix, /막는 팔/);
  assert.match(block[1].kidFix, /막을 때/);

  const punch = details({ name: '오른 앞서기 몸통바로지르기', movementType: 'punch' });
  assert.match(punch[0].kidFix, /지르는 손/);

  const kickPunch = details({ name: '오른발 앞차고 오른 앞서기 몸통바로지르기', movementType: 'kick_punch' });
  assert.match(kickPunch[0].kidFix, /찬 발/);

  const merged = details({ name: '왼 앞굽이 아래막기 + 왼 앞굽이 반대지르기', movementType: 'block' });
  assert.match(merged[0].kidFix, /지르는 손/, 'merged segment finishes with the punch');

  const ready = details({ name: '준비서기', movementType: 'hold' });
  assert.doesNotMatch(ready[0].kidFix + ready[1].kidFix, /지르|막는|찬 발/);
});

test('capture page: the camera panel drops the section card padding so the preview is full-bleed', () => {
  const rule = /body\[data-app-page="capture"\] #capturePanel \{([^}]*)\}/.exec(html);
  assert.ok(rule, 'capture panel rule missing');
  assert.match(rule[1], /padding:\s*0;/);
  assert.match(rule[1], /border:\s*0;/);
});

test('PC launcher: finds 32-bit / per-user Chrome and falls back to Edge', () => {
  const { appBrowserPath } = require('./start-pc.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'poomsae-launcher-'));
  const saved = { pf: process.env.ProgramFiles, pf86: process.env['ProgramFiles(x86)'], local: process.env.LOCALAPPDATA };
  const touch = (file) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, ''); };
  try {
    process.env.ProgramFiles = path.join(tmp, 'pf');
    process.env['ProgramFiles(x86)'] = path.join(tmp, 'pf86');
    process.env.LOCALAPPDATA = path.join(tmp, 'local');
    const edge = path.join(tmp, 'pf86', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    touch(edge);
    assert.equal(appBrowserPath(), edge);
    const chrome86 = path.join(tmp, 'pf86', 'Google', 'Chrome', 'Application', 'chrome.exe');
    touch(chrome86);
    assert.equal(appBrowserPath(), chrome86);
  } finally {
    for (const [key, value] of [['ProgramFiles', saved.pf], ['ProgramFiles(x86)', saved.pf86], ['LOCALAPPDATA', saved.local]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── 동작 끝(맺음·정지) 정밀 측정 ──
function extractConstBlock(name) {
  const start = html.indexOf(`const ${name} = {`);
  assert.ok(start >= 0, `Missing const ${name}`);
  const brace = html.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) return `var ${name} = ${html.slice(brace, i + 1)};`;
  }
  throw new Error(`Incomplete const ${name}`);
}
function extractStatement(name) {
  const start = html.indexOf(`const ${name} =`);
  assert.ok(start >= 0, `Missing const ${name}`);
  const open = html.slice(start).search(/[({\[]/) + start;
  let depth = 0;
  for (let i = open; i < html.length; i += 1) {
    if ('({['.includes(html[i])) depth += 1;
    if (')}]'.includes(html[i])) depth -= 1;
    if (depth === 0) return `var ${html.slice(start + 'const '.length, i + 1)};`;
  }
  throw new Error(`Incomplete const ${name}`);
}
function finishHarness() {
  const context = vm.createContext({
    Math, Number, Array,
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    stableRound: (v, step = 5) => Math.round(v / step) * step
  });
  vm.runInContext(extractConstBlock('keyIndexesByType'), context);
  const legsDrift = /const FINISH_LEGS_MOVING_DRIFT = ([\d.]+);/.exec(html);
  assert.ok(legsDrift, 'Missing FINISH_LEGS_MOVING_DRIFT');
  vm.runInContext(`var FINISH_LEGS_MOVING_DRIFT = ${legsDrift[1]};`, context);
  vm.runInContext(extractConstBlock('FINISH_EFFECTOR_INDEXES'), context);
  for (const name of ['getPoint', 'finishBodyScale', 'finishJointSpeed', 'finishLowerBodyDrift', 'measureFinishWindow',
    'finishIsClear', 'finishReliabilityAdjust', 'scoreFinishSnap', 'scoreFinishStillness', 'scoreFinishStance', 'scoreFinishVelocity']) {
    vm.runInContext(extractFunction(name), context);
  }
  return context;
}
// 몸통 길이 0.2(세로 좌표)인 정면 자세. 오른손목·팔꿈치만 가로로 움직인다.
function pose(wristX, hipShift = 0) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.99 }));
  const set = (i, x, y) => { lm[i] = { x, y, z: 0, visibility: 0.99 }; };
  set(11, 0.46, 0.40); set(12, 0.54, 0.40);
  set(23, 0.47 + hipShift, 0.60); set(24, 0.53 + hipShift, 0.60);
  set(13, 0.44, 0.48); set(15, 0.44, 0.55);
  set(14, wristX - 0.05, 0.45); set(16, wristX, 0.45);
  set(25, 0.47 + hipShift, 0.72); set(26, 0.53 + hipShift, 0.72);
  set(27, 0.46 + hipShift, 0.84); set(28, 0.54 + hipShift, 0.84);
  return lm;
}
const OFFSETS = [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45, 0.6];
function frames(wristAt, hipAt = () => 0) {
  return OFFSETS.map((offset) => ({ time: 10 + offset, landmarks: pose(wristAt(offset), hipAt(offset)), finishSample: true }));
}

test('finish: a fast technique that stops is a clear stop with high snap and stillness', () => {
  const c = finishHarness();
  const stop = frames((o) => 0.55 + Math.min(o, 0) * 0.8 + 0.36);
  const finish = c.measureFinishWindow(stop, 'strike', 16 / 9, 10);
  assert.equal(finish.available, true);
  assert.equal(c.finishIsClear(finish), true);
  assert.ok(c.scoreFinishSnap(finish) >= 90, `snap ${c.scoreFinishSnap(finish)}`);
  assert.ok(c.scoreFinishStillness(finish) >= 90, `stillness ${c.scoreFinishStillness(finish)}`);
  assert.ok(c.scoreFinishStance(finish) >= 90, `stance ${c.scoreFinishStance(finish)}`);
});

test('finish: motion that never stops is not credited as a clear stop and is not scored as "good"', () => {
  const c = finishHarness();
  const flowing = frames((o) => 0.3 + (o + 0.45) * 0.5);
  const finish = c.measureFinishWindow(flowing, 'strike', 16 / 9, 10);
  assert.equal(c.finishIsClear(finish), false);
  assert.ok(c.scoreFinishSnap(finish) < 55, `snap ${c.scoreFinishSnap(finish)}`);
  assert.ok(c.scoreFinishStillness(finish) < 55, `stillness ${c.scoreFinishStillness(finish)}`);
});

test('finish: hips/feet drifting after the stop lowers the stance score only', () => {
  const c = finishHarness();
  const steady = c.measureFinishWindow(frames((o) => 0.55 + Math.min(o, 0) * 0.8 + 0.36), 'strike', 16 / 9, 10);
  const drifting = c.measureFinishWindow(frames((o) => 0.55 + Math.min(o, 0) * 0.8 + 0.36, (o) => (o > 0 ? o * 0.12 : 0)), 'strike', 16 / 9, 10);
  assert.ok(c.scoreFinishStance(drifting) < c.scoreFinishStance(steady));
});

test('finish: horizontal speed is corrected for the 16:9 frame aspect', () => {
  const c = finishHarness();
  const a = { time: 0, landmarks: pose(0.5) };
  const b = { time: 0.15, landmarks: pose(0.56) };
  const square = c.finishJointSpeed(a, b, [16], 1);
  const wide = c.finishJointSpeed(a, b, [16], 16 / 9);
  assert.ok(Math.abs(wide / square - 16 / 9) < 0.01, `${wide} / ${square}`);
});

test('coaching copy: an unconfirmed stop becomes one "끝 멈춤 확인" item with measured evidence', () => {
  const details = issueHarness();
  const finishMetrics = { available: true, clearStop: false, contrast: 0.3, holdSpeed: 0.8, lowerBodyDrift: 0.2, holdStart: 12.3, approachSpeed: 1.2 };
  const uncertain = details({ name: '왼 앞서기 아래막기', movementType: 'block', snapScore: 25, stillnessScore: 30, stanceScore: 35, velocityScore: 90, finishMetrics }, 4);
  assert.equal(uncertain.filter((issue) => issue.finishMetric).length, 1);
  assert.equal(uncertain[0].label, '끝 멈춤 확인');
  assert.match(uncertain[0].evidence, /끝 멈춤 미확인/);
  const clear = details({ name: '왼 앞서기 아래막기', movementType: 'block', snapScore: 40, velocityScore: 90, finishMetrics: { ...finishMetrics, clearStop: true, contrast: 0.62, holdSpeed: 0.25, lowerBodyDrift: 0.04 } });
  assert.equal(clear[0].label, '맺음');
  assert.match(clear[0].evidence, /62%/);
});

test('analysis wiring: finish burst feeds evaluation, manual re-evaluation and the boundary cache', () => {
  assert.match(html, /await collectFinishFrames\(FINISH_BURST_OFFSETS\)/);
  assert.match(html, /evaluateCompetitionEventSegment\(primary, frames, \{\s*view: viewForRun,\s*aspect: analysisAspect,\s*finishFrames,/);
  assert.match(html, /finishFrames: manualFinishFrames/);
  assert.match(html, /boundaryDetection\.finishFrames = allFinishFrames/);
  assert.match(html, /armRom: angle\.armRom != null/, 'ROM values must reach the report');
});

test('reference ids: every Taegeuk/Koryo textbook and video reference is reachable from analysis movements', () => {
  const context = vm.createContext({ Math, Number, String, Array, Object });
  vm.runInContext(extractStatement('SLOW_MOVEMENT_NUMBERS'), context);
  for (const name of ['inferMovementType', 'isReadyStance', 'isReadyEntry', 'movementTempo', 'isMemoTechnique', 'isKihapName', 'makeMvpPattern', 'buildGenericMovements']) {
    vm.runInContext(extractFunction(name), context);
  }
  vm.runInContext(extractConstBlock('OFFICIAL_MOVE_COUNT'), context);
  vm.runInContext(extractStatement('KORYO_KICK_STAGES'), context);
  vm.runInContext(extractConstBlock('poomsaeData'), context);
  const assignStart = html.indexOf('Object.assign(poomsaeData, {');
  const brace = html.indexOf('{', assignStart);
  let depth = 0; let end = brace;
  for (let i = brace; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) { end = i; break; }
  }
  vm.runInContext(`Object.assign(poomsaeData, ${html.slice(brace, end + 1)});`, context);
  const modelDir = path.join(root, 'www', 'models');
  const files = fs.readdirSync(modelDir).filter((file) => /-(textbook|video)-reference\.json$/.test(file));
  assert.ok(files.length >= 7);
  for (const file of files) {
    const reference = JSON.parse(fs.readFileSync(path.join(modelDir, file), 'utf8'));
    const movements = context.buildGenericMovements(reference.poomsae_id);
    const techniques = movements.filter((m) => !m.isKihap && !m.needsVerification);
    const missing = techniques.filter((m) => !reference.movements[m.referenceId || m.id]);
    assert.equal(missing.length, 0, `${file}: movements without a reference entry: ${missing.map((m) => `${m.id}→${m.referenceId}`).join(', ')}`);
  }
  assert.match(html, /const referenceMovementId = movement\.referenceId \|\| movement\.id;/);
});

// ── 감점(정확성) 참고값 ──
test('deduction: a slow-measured technique gets a presentation note, never an accuracy deduction', () => {
  const context = vm.createContext({ Math, Number });
  vm.runInContext(extractFunction('referenceDeductionFor'), context);
  // 시범 영상 태극 1장 #18 지르기: 속도만 25로 잡혀 "큰 오류 -0.3 가능성"이 붙었다.
  const slowPunch = context.referenceDeductionFor({ visibilityScore: 95, velocityScore: 25, snapScore: 100, stillnessScore: 100, stanceScore: 100 });
  assert.equal(slowPunch.amount, 0);
  assert.match(slowPunch.label, /표현력/);
  const wobble = context.referenceDeductionFor({ visibilityScore: 95, velocityScore: 100, snapScore: 100, stillnessScore: 100, stanceScore: 20 });
  assert.equal(wobble.amount, 0.3);
  assert.match(wobble.reason, /발·골반/);
});

test('multi-view: an unconfirmed stop in any camera keeps the fused deduction on hold', () => {
  const context = vm.createContext({ Math, Number, Array, Object, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  for (const name of ['fusionReliability', 'strongestEvidence', 'competitionScoreFromMetrics', 'evidenceScopeFor', 'referenceDeductionFor', 'applyFusedAccuracyAndConfidence']) {
    vm.runInContext(extractFunction(name), context);
  }
  const view = (clearStop) => ({
    name: '왼 앞굽이 몸통지르기', visibilityScore: 95, velocityScore: 90, snapScore: 45, stillnessScore: 40, stanceScore: 90,
    detectionRate: 1, viewConfidence: 0.9, finishMetrics: { available: true, source: 'finish_burst', clearStop }
  });
  const front = view(true);
  const oneUnclear = { ...front };
  context.applyFusedAccuracyAndConfidence(oneUnclear, [front, view(false)]);
  assert.equal(oneUnclear.referenceDeduction.amount, null);
  const bothClear = { ...front };
  context.applyFusedAccuracyAndConfidence(bothClear, [front, view(true)]);
  assert.equal(bothClear.referenceDeduction.amount, 0.1);
});

test('finish burst: a low entry speed also widens the burst (fast technique may sit between samples)', () => {
  assert.match(html, /\.some\(\(finish\) => !finishIsClear\(finish\) \|\| !\(finish\.approachSpeed >= 1\.0\)\)/);
});

test('finish: arms still while a leg lifts for the next kick is not a finished stance (no stance 0 / "큰 오류")', () => {
  const c = finishHarness();
  // 고려 #17 주춤서기 표적지르기 → #18 옆차기: 지르기 뒤 팔은 멈췄지만 왼무릎이 올라간다.
  const lifted = frames((o) => 0.55 + Math.min(o, 0) * 0.8 + 0.36).map((frame) => {
    const lift = frame.time - 10 > 0 ? Math.min(0.3, (frame.time - 10) * 1.2) : 0;
    const lm = frame.landmarks.map((p) => ({ ...p }));
    lm[25] = { ...lm[25], y: lm[25].y - lift * 0.8 };
    lm[27] = { ...lm[27], y: lm[27].y - lift };
    return { ...frame, landmarks: lm };
  });
  const finish = c.measureFinishWindow(lifted, 'punch', 16 / 9, 10);
  assert.equal(finish.legsMoving, true, `drift ${finish.lowerBodyDrift}`);
  assert.equal(c.finishIsClear(finish), false);
  assert.ok(c.scoreFinishStance(finish) >= 20, `unclear finishes are blended toward 60, got ${c.scoreFinishStance(finish)}`);
  const d = vm.createContext({ Math, Number });
  vm.runInContext(extractFunction('referenceDeductionFor'), d);
  const deduction = d.referenceDeductionFor({ visibilityScore: 95, velocityScore: 90, snapScore: c.scoreFinishSnap(finish), stillnessScore: c.scoreFinishStillness(finish), stanceScore: c.scoreFinishStance(finish), finishUncertain: true });
  assert.notEqual(deduction.amount, 0.3);
});

// ── 박자·좌우 대칭 축 ──
function axesHarness() {
  const context = vm.createContext({ Math, Number, String, Array, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  vm.runInContext(extractFunction('tempoSkipsSpeed'), context);
  vm.runInContext(extractFunction('computeRhythm'), context);
  vm.runInContext(extractFunction('computeSymmetry'), context);
  return context;
}
test('rhythm: the ready-stance wait is not counted, so an even expert flow is not marked as bad rhythm', () => {
  const c = axesHarness();
  const segments = [{ name: '준비 자세', movementType: 'hold', startTime: 0, detectionRate: 1 }];
  for (let i = 0; i < 16; i += 1) segments.push({ name: `동작 ${i + 1}`, order: i + 1, movementType: 'block', startTime: 5 + i * 1.2 + (i % 3 === 0 ? 0.39 : 0), detectionRate: 1 });
  const rhythm = c.computeRhythm(segments);
  assert.equal(rhythm.score, 100);
  assert.equal(rhythm.hesitations.length, 0);
});
test('rhythm: a long pause between moves is named by movement number', () => {
  const c = axesHarness();
  const segments = [];
  for (let i = 0; i < 16; i += 1) segments.push({ name: `동작 ${i + 1}`, order: i + 1, orderLabel: String(i + 1), movementType: 'strike', startTime: i * 1.2 + (i >= 8 ? 4.5 : 0), detectionRate: 1 });
  const rhythm = c.computeRhythm(segments);
  assert.deepEqual(Array.from(rhythm.hesitations, (item) => item.after), ['8']);
  assert.match(rhythm.note, /8번 뒤/);
});
test('symmetry: unconfirmed stops are left out and "왼발 … 왼앞굽이" pairs with "오른발 … 오른앞굽이"', () => {
  const c = axesHarness();
  const clear = { available: true, source: 'finish_burst', clearStop: true };
  const unclear = { ...clear, clearStop: false };
  const results = [
    { name: '왼발 앞차고 왼앞굽이 두번지르기', powerScore: 90, finishMetrics: clear, detectionRate: 1 },
    { name: '오른발 앞차고 오른앞굽이 두번지르기', powerScore: 88, finishMetrics: clear, detectionRate: 1 },
    { name: '왼앞서기 아래막기', powerScore: 92, finishMetrics: clear, detectionRate: 1 },
    { name: '오른앞서기 아래막기', powerScore: 91, finishMetrics: clear, detectionRate: 1 },
    { name: '왼앞굽이 반대지르기', powerScore: 95, finishMetrics: clear, detectionRate: 1 },
    { name: '오른앞굽이 반대지르기', powerScore: 55, finishMetrics: unclear, detectionRate: 1 }
  ];
  const symmetry = c.computeSymmetry(results, 'front');
  assert.ok(symmetry.score >= 90, `score ${symmetry.score}`);
});
test('score axes: rhythm and symmetry only lower the score when a problem is seen (no bonus for evenness)', () => {
  assert.match(html, /presentationAdj = clamp\(\(\(rhythm\.score - 70\) \/ 70\) \* 0\.3, -0\.3, 0\);/);
  assert.match(html, /accuracyAdj = clamp\(\(\(symmetry\.score - 75\) \/ 75\) \* 0\.2, -0\.2, 0\);/);
});

test('finish: hidden wrists make the speed "uncertain" instead of "slow" (no false 속도 약점)', () => {
  const c = finishHarness();
  const visible = frames((o) => 0.55 + Math.min(o, 0) * 0.8 + 0.36);
  assert.equal(c.measureFinishWindow(visible, 'punch', 16 / 9, 10).effectorsVisible, true);
  const hidden = visible.map((frame) => {
    const lm = frame.landmarks.map((p) => ({ ...p }));
    for (const index of [13, 14, 15, 16]) lm[index] = { ...lm[index], visibility: 0.1 };
    return { ...frame, landmarks: lm };
  });
  assert.equal(c.measureFinishWindow(hidden, 'punch', 16 / 9, 10).effectorsVisible, false);
  assert.match(html, /if \(finish\.effectorsVisible === false\) \{\s*\/\/[^\n]*\n\s*finish\.speedUncertain = true;\s*velocityScore = stableRound\(60 \+ \(velocityScore - 60\) \* 0\.6\);/);
});

// ── 2026-10-28 3차 점검 수정 ──
function movementHarness() {
  const context = vm.createContext({ Math, Number, String, Array, Object, console: { warn() {} } });
  vm.runInContext(extractStatement('SLOW_MOVEMENT_NUMBERS'), context);
  for (const name of ['inferMovementType', 'isReadyStance', 'isReadyEntry', 'movementTempo', 'isMemoTechnique', 'isKihapName', 'makeMvpPattern', 'buildGenericMovements', 'coreMovementNames']) {
    vm.runInContext(extractFunction(name), context);
  }
  vm.runInContext(extractConstBlock('OFFICIAL_MOVE_COUNT'), context);
  vm.runInContext(extractStatement('KORYO_KICK_STAGES'), context);
  vm.runInContext(extractConstBlock('poomsaeData'), context);
  const assignStart = html.indexOf('Object.assign(poomsaeData, {');
  const brace = html.indexOf('{', assignStart);
  let depth = 0; let end = brace;
  for (let i = brace; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) { end = i; break; }
  }
  vm.runInContext(`Object.assign(poomsaeData, ${html.slice(brace, end + 1)});`, context);
  return context;
}

test('second video: a new file clears the previous boundary cache and re-checks the button once a frame is ready', () => {
  // 영상 A 분석 후 B를 고르면 A의 시작점 잠금이 남아 "분석 시작을 누르세요"인데 버튼이 꺼져 있었다.
  assert.match(html, /latestReport = null;\n(?:\s*\/\/[^\n]*\n)*\s*lastBoundaryCache = null;\n\s*lastMovementsCache = null;/);
  assert.match(html, /\["canplay", "seeked"\]\.forEach\(\(eventName\) => \{\s*video\.addEventListener\(eventName, \(\) => \{\s*if \(!isAnalyzing && seekProbeChecked\) updateAnalyzeButtonState\(\);/);
});

test('ready stance: 겹손·통밀기·보주먹 준비 are the ready stance, so 평원 keeps its official 21 moves', () => {
  const c = movementHarness();
  for (const name of ['겹손준비', '모아서기 겹손준비', '통밀기준비', '보주먹준비', '기본준비서기']) assert.ok(c.isReadyStance(name), name);
  assert.ok(!c.isReadyStance('모아서기 보주먹'), 'the 7장 slow technique is not a ready stance');
  for (const key of ['pyongwon', 'cheonkwon', 'hansu', 'ilyeo', 'koryo', 'sipjin']) {
    assert.equal(c.coreMovementNames(key).length, c.OFFICIAL_MOVE_COUNT[key], key);
  }
  assert.doesNotMatch(html, /이미지1처럼 두 주먹을 모아 쥐고/);
});

test('movement types: 돌쩌귀·날개펴기·보주먹 are techniques with a measured finish, and slow moves are tagged', () => {
  const c = movementHarness();
  for (const key of ['keumgang', 'taebaek', 'jitae', 'hansu', 'pyongwon', 'cheonkwon', 'taegeuk_7']) {
    const holds = Array.from(c.buildGenericMovements(key).filter((m) => !m.isPrep && m.type === 'hold'), (m) => m.name);
    assert.deepEqual(holds, [], `${key}: ${holds.join(', ')}`);
  }
  const slow = (key) => Array.from(c.buildGenericMovements(key).filter((m) => m.tempo === 'slow'), (m) => m.moveNo);
  assert.deepEqual(slow('taegeuk_6'), [10]);
  assert.deepEqual(slow('taegeuk_7'), [11]);
  assert.deepEqual(slow('cheonkwon'), [1, 23, 24, 25, 26]);
  assert.deepEqual(slow('taegeuk_1'), []);
});

function tempoSegmentationHarness() {
  const context = vm.createContext({ Math, Number, Array, Object, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) });
  vm.runInContext(extractFunction('refineSegmentBoundaries'), context);
  vm.runInContext(extractFunction('refineSegmentBoundariesWithTempo'), context);
  return context;
}
// 20동작: 3개마다 복합동작(가운데 짧은 정지), slowIndex 동작은 1.3초 이동 뒤 5초 넘게 천천히.
function tempoTrack(slowIndex) {
  const segs = Array.from({ length: 20 }, (_, i) => (i === slowIndex ? { kind: 'slow', dur: 6.5 } : { kind: i % 3 === 1 ? 'compound' : 'normal', dur: i % 3 === 1 ? 2.2 : 1.5 }));
  const bounds = [3];
  for (const seg of segs) bounds.push(bounds[bounds.length - 1] + seg.dur);
  const motionAt = (x) => {
    for (let i = 0; i < segs.length; i += 1) {
      const a = bounds[i];
      const b = bounds[i + 1];
      if (x < a || x >= b) continue;
      const u = (x - a) / (b - a);
      if (segs[i].kind === 'slow') return x - a < 1.3 ? 0.05 + 0.6 * Math.sin(Math.PI * (x - a) / 1.3) : 0.07;
      if (segs[i].kind === 'compound') return 0.05 + 0.8 * Math.sin(Math.PI * u) * (1 - 0.75 * Math.exp(-((u - 0.5) ** 2) / 0.004));
      return 0.05 + 0.8 * Math.sin(Math.PI * u);
    }
    return 0.03;
  };
  const duration = bounds[bounds.length - 1] + 3;
  const n = Math.round(duration * 2.6);
  const samples = Array.from({ length: n }, (_, k) => {
    const time = duration * k / (n - 1);
    return { time, motion: motionAt(time), valid: true };
  });
  return { duration, samples, truth: bounds, movements: segs.map((seg) => ({ tempo: seg.kind === 'slow' ? 'slow' : 'normal' })) };
}
test('segmentation: a slow move is anchored first, so later moves keep their numbers (태극6장 10번이 13번으로 밀리던 문제)', () => {
  const c = tempoSegmentationHarness();
  const { duration, samples, truth, movements } = tempoTrack(9);
  const before = c.refineSegmentBoundaries(duration, 20, samples, 0.95, truth[0], truth[20]);
  const after = c.refineSegmentBoundariesWithTempo(duration, movements, samples, 0.95, truth[0], truth[20]);
  const worst = (bounds) => Math.max(...bounds.map((value, i) => Math.abs(value - truth[i])));
  assert.ok(worst(before) > 2, `old method should fail on this track (worst ${worst(before).toFixed(2)}s)`);
  assert.ok(worst(after) < 0.6, `worst boundary error ${worst(after).toFixed(2)}s`);
  assert.equal(c.refineSegmentBoundaries.lastConfidence.tempoAnchors[0].index, 9);
});
test('segmentation: poomsae without slow moves get exactly the old boundaries', () => {
  const c = tempoSegmentationHarness();
  const { duration, samples, truth, movements } = tempoTrack(-1);
  assert.deepEqual(
    Array.from(c.refineSegmentBoundariesWithTempo(duration, movements, samples, 0.95, truth[0], truth[20])),
    Array.from(c.refineSegmentBoundaries(duration, 20, samples, 0.95, truth[0], truth[20]))
  );
  assert.match(html, /refineSegmentBoundariesWithTempo\(duration, movements\.slice\(1\), motionSamples, sensitivity, onset, activeRange\.end\)/);
});

test('slow moves: speed and finish-speed are not listed as weaknesses, and their long gap is not a hesitation', () => {
  const details = issueHarness();
  const labels = details({ name: '모아서기 보주먹', movementType: 'block', tempo: 'slow', stanceScore: 60 }, 4).map((issue) => issue.label);
  assert.ok(!labels.includes('속도·완급') && !labels.includes('맺음'), labels.join(','));
  const c = axesHarness();
  const segments = [];
  for (let i = 0; i < 16; i += 1) segments.push({ name: `동작 ${i + 1}`, order: i + 1, orderLabel: String(i + 1), movementType: 'block', tempo: i === 8 ? 'slow' : 'normal', startTime: i * 1.2 + (i > 8 ? 5.5 : 0), detectionRate: 1 });
  assert.equal(c.computeRhythm(segments).hesitations.length, 0);
});

test('issue list: items scoring 80 or more are not listed as "아쉬운 점" (95~100점 동작에도 2개씩 나오던 문제)', () => {
  const details = issueHarness();
  assert.equal(details({ name: '왼앞굽이 아래막기', movementType: 'block', velocityScore: 92, snapScore: 88 }).length, 0);
  assert.deepEqual(Array.from(details({ name: '왼앞굽이 아래막기', movementType: 'block', velocityScore: 92, snapScore: 70 }), (issue) => issue.label), ['맺음']);
  assert.match(html, /scene-praise/);
});

test('privacy: video file names never leave the device', () => {
  assert.doesNotMatch(html, /(before_file|after_file|source_file): String\(/);
  const context = vm.createContext({});
  vm.runInContext(extractFunction('sanitizeCloudPayload'), context);
  const legacy = context.sanitizeCloudPayload('compare_reports', {
    schema: 'poomsae-compare-report-v1', before_file: '홍길동_8살.mp4', after_file: 'b.mp4',
    before_analysis: { analysis_id: 'a', source_file: '홍길동_8살.mp4' }, after_analysis: null
  });
  assert.equal(JSON.stringify(legacy).includes('홍길동'), false);
  assert.equal(legacy.before_analysis.analysis_id, 'a');
  assert.equal('file' in context.sanitizeCloudPayload('corrections', { file: 'x.mp4', action: 'adjust' }), false);
});
test('privacy: turning sharing off stops new cloud records', () => {
  const queued = [];
  const queue = { enqueue: (row) => { queued.push(row); return 'id'; }, has: () => false, flush: async () => 0 };
  let enabled = false;
  const context = vm.createContext({ cloudSharingEnabled: () => enabled, correctionCloudQueue: queue, learningCloudQueue: queue, compareCloudQueue: queue });
  for (const name of ['queueCorrectionForCloud', 'queueLearningReportForCloud', 'queueCompareReportForCloud']) vm.runInContext(extractFunction(name), context);
  assert.equal(context.queueCorrectionForCloud({ action: 'adjust', file: 'a.mp4' }), null);
  assert.equal(context.queueLearningReportForCloud({ schema: 'x' }), null);
  assert.equal(context.queueCompareReportForCloud({ schema: 'x' }), null);
  assert.equal(queued.length, 0);
  enabled = true;
  context.queueCorrectionForCloud({ action: 'adjust', file: 'a.mp4' });
  assert.deepEqual(queued.map((row) => Array.from(Object.keys(row))), [['action']]);
  assert.match(html, /id="cloudShareToggle"/);
  assert.match(html, /id="clearLocalRecordsBtn"/);
});

test('firestore rules: every field the app writes to corrections is allowed, and file names are refused', () => {
  const rules = fs.readFileSync(path.join(root, 'firebase', 'firestore.rules'), 'utf8');
  const allowed = new Set([...(/d\.keys\(\)\.hasOnly\(\[([^\]]+)\]\)/.exec(rules)[1].matchAll(/'([a-z_]+)'/g))].map((m) => m[1]));
  const recordBody = extractFunction('recordCorrection');
  const base = /const record = \{([\s\S]*?)\.\.\.details/.exec(recordBody)[1];
  const keys = new Set([...base.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1]));
  for (const call of html.matchAll(/recordCorrection\("[a-z_]+", \{([\s\S]*?)\n\s*\}\);/g)) {
    for (const m of call[1].matchAll(/^\s*([a-z_]+):/gm)) keys.add(m[1]);
  }
  keys.delete('file'); // queueCorrectionForCloud가 빼고 보낸다
  keys.add('created'); // 전송 시 서버 시각
  assert.ok(keys.size >= 20, `parsed ${keys.size} keys`);
  const missing = [...keys].filter((key) => !allowed.has(key));
  assert.deepEqual(missing, []);
  assert.ok(!allowed.has('file'));
  assert.match(rules, /!\('before_file' in d\) && !\('after_file' in d\)/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  const firebaseJson = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
  assert.equal(firebaseJson.storage.rules, 'firebase/storage.rules');
});

test('copy: no doubled "쉽게 말하면", tips follow the weakest point, and no "준비서기: 준비서기:"', () => {
  const context = vm.createContext({ escapeHtml: (v) => String(v) });
  for (const name of ['easyExplainReportText', 'reportItemHtml', 'easyExplainFeedbackText']) vm.runInContext(extractFunction(name), context);
  const item = context.reportItemHtml('관절 데이터 감지율이 낮습니다.');
  assert.equal((item.match(/쉽게 말하면/g) || []).length, 1);
  const tip = (weak) => context.easyExplainFeedbackText(`왼앞서기 아래막기: 앞서기: 무릎과 발끝을 맞추세요 우선 연습 포인트: ${weak}`);
  assert.match(tip('맺음이 약합니다. 기술 끝에서 속도를 한 번에 줄이세요.'), /멈추/);
  assert.match(tip('속도 변화가 약합니다.'), /짧고 분명하게/);
  assert.match(tip('멈춘 뒤 발·골반이 흔들립니다. 무릎과 발끝 방향을 맞추세요.'), /무릎 방향/);
  assert.match(html, /cue\.label === movement\.name \? cue\.text : `\$\{cue\.label\}: \$\{cue\.text\}`/);
});

test('result screens: scene photos are drawn (black since 09-02), JPG opens via blob:, back can leave the app', () => {
  assert.doesNotMatch(html, /drawImage\(video, rect\.x, rect\.y, rect\.width, rect\.height\)/);
  assert.match(html, /ctx\.drawImage\(video, rect\.offX, rect\.offY, rect\.drawW, rect\.drawH\);/);
  assert.match(html, /const snapshotTime = await waitForSeek\(completionTime\);/);
  assert.doesNotMatch(html, /jpgOpenLink\.href = dataUrl/);
  assert.match(html, /URL\.createObjectURL\(blob\);\s*jpgOpenLink\.href = jpgOpenObjectUrl;/);
  const guard = extractFunction('setupBackNavigationGuard');
  assert.match(guard, /history\.back\(\);/);
  assert.match(html, /\.upload-slot\[hidden\], \.control-grid\[hidden\] \{ display: none !important; \}/);
  assert.match(html, /let capturePoseMode = "single";/);
  assert.match(html, /if \(latestReport && latestReport !== reportBeforeRun && !isAnalyzing\) showResultPage\(\);/);
});

test('segmentation: consecutive slow moves with tense, jittery motion (천권 23~26번) each get their own segment', () => {
  const c = tempoSegmentationHarness();
  const kinds = Array.from({ length: 20 }, (_, i) => (i === 16 || i === 17 ? 'tense' : i === 18 ? 'slow' : i % 3 === 1 ? 'compound' : 'normal'));
  const dur = { tense: 6.5, slow: 7, compound: 2.2, normal: 1.5 };
  const truth = [3];
  for (const kind of kinds) truth.push(truth[truth.length - 1] + dur[kind]);
  const jitter = (t) => 0.06 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
  const motionAt = (x) => {
    for (let i = 0; i < kinds.length; i += 1) {
      const a = truth[i];
      const b = truth[i + 1];
      if (x < a || x >= b) continue;
      const u = (x - a) / (b - a);
      const tt = x - a;
      if (kinds[i] === 'tense') return tt < 1.2 ? 0.05 + 0.55 * Math.sin(Math.PI * tt / 1.2) : 0.15 + jitter(x);
      if (kinds[i] === 'slow') return tt < 1.3 ? 0.05 + 0.6 * Math.sin(Math.PI * tt / 1.3) : 0.07;
      if (kinds[i] === 'compound') return 0.05 + 0.8 * Math.sin(Math.PI * u) * (1 - 0.75 * Math.exp(-((u - 0.5) ** 2) / 0.004));
      return 0.05 + 0.8 * Math.sin(Math.PI * u);
    }
    return 0.03;
  };
  const duration = truth[20] + 3;
  const n = Math.round(duration * 2.6);
  const samples = Array.from({ length: n }, (_, k) => {
    const time = duration * k / (n - 1);
    return { time, motion: motionAt(time), valid: true };
  });
  const movements = kinds.map((kind) => ({ tempo: kind === 'tense' || kind === 'slow' ? 'slow' : 'normal' }));
  const worst = (bounds) => Math.max(...bounds.map((value, i) => Math.abs(value - truth[i])));
  assert.ok(worst(c.refineSegmentBoundaries(duration, 20, samples, 0.95, truth[0], truth[20])) > 5);
  const after = c.refineSegmentBoundariesWithTempo(duration, movements, samples, 0.95, truth[0], truth[20]);
  assert.ok(worst(after) < 0.8, `worst boundary error ${worst(after).toFixed(2)}s`);
  assert.deepEqual(Array.from(c.refineSegmentBoundaries.lastConfidence.tempoAnchors, (a) => a.index), [16, 17, 18]);
});

// 구간 경계 "뒤 전체 이동": 끝 경계가 영상 끝에 닿은 영상에서도 입력한 시간이 그대로 반영돼야 한다.
// (예전에는 이동량이 0으로 줄어 "+0.00초"로 아무것도 바뀌지 않았다.)
function cascadeHarness(boundaries, duration) {
  const calls = [];
  const corrections = [];
  const context = vm.createContext({
    canManualEdit: () => true,
    lastBoundaryCache: { boundaries: boundaries.slice() },
    video: { duration },
    selectedPoomsaeKey: 'taegeuk_2',
    getBoundaryBias: () => 0,
    recordCorrection: (kind, payload) => corrections.push({ kind, payload }),
    normalizeBoundaryShape: (list) => list.slice(),
    rebuildSegmentsFromBoundaries: async (b, index, message) => calls.push({ b: Array.from(b), index, message }),
    Number, Math
  });
  vm.runInContext(extractFunction('cascadeAdjustBoundary'), context);
  return { context, calls, corrections };
}

test('cascade adjust: honors the typed time even when the last boundary sits at the video end', async () => {
  const { context, calls, corrections } = cascadeHarness([0.5, 3, 6, 9, 12, 20], 20);
  await context.cascadeAdjustBoundary(2, 6.4);
  assert.equal(calls.length, 1);
  const b = calls[0].b;
  assert.equal(b[2], 6.4);
  assert.equal(b[5], 20, 'end boundary stays inside the video');
  assert.ok(b.every((v, i) => i === 0 || v > b[i - 1]), 'boundaries stay strictly increasing');
  assert.match(calls[0].message, /영상 끝에 닿아/);
  assert.equal(corrections[0].payload.delta_seconds, 0.4);
});

test('cascade adjust: shifts every later boundary together when there is room', async () => {
  const { context, calls } = cascadeHarness([0.5, 3, 6, 9, 12, 18], 25);
  await context.cascadeAdjustBoundary(2, 6.5);
  assert.deepEqual(calls[0].b.map((v) => Number(v.toFixed(2))), [0.5, 3, 6.5, 9.5, 12.5, 18.5]);
  assert.doesNotMatch(calls[0].message, /영상 끝에 닿아/);
});

test('cascade adjust: pushing far past the end keeps minimum gaps and never exceeds the duration', async () => {
  const { context, calls } = cascadeHarness([0.5, 3, 6, 9, 12, 19.5], 20);
  await context.cascadeAdjustBoundary(2, 99);
  const b = calls[0].b;
  assert.ok(b.at(-1) <= 20);
  assert.ok(b.every((v, i) => i === 0 || v - b[i - 1] >= 0.099), 'at least 0.1 s between boundaries');
});

test('cascade adjust: no change means no rebuild and no learning record', async () => {
  const { context, calls, corrections } = cascadeHarness([0.5, 3, 6, 9, 12, 18], 25);
  await context.cascadeAdjustBoundary(2, 6);
  assert.equal(calls.length, 0);
  assert.equal(corrections.length, 0);
});
