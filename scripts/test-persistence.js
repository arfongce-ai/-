const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'www/index.html'), 'utf8');
function extractFunction(name) {
  const match = new RegExp(`      (?:async )?function ${name}\\(`).exec(html);
  assert.ok(match, `Missing ${name}`);
  const end = html.indexOf('\n      }', match.index);
  return html.slice(match.index, end + '\n      }'.length);
}
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
async function queueHarness(write) {
  let createPersistentCloudQueue;
  if (fs.existsSync(path.join(root, 'www/cloud-queue.mjs'))) {
    ({ createPersistentCloudQueue } = await import(pathToFileURL(path.join(root, 'www/cloud-queue.mjs'))));
  }
  const localStorage = storage();
  const context = vm.createContext({ localStorage, createPersistentCloudQueue,
    updateCloudSyncStatus() {}, console, setTimeout, clearTimeout,
    _fbReady: true, _fbDB: {}, _fbAddDoc: write, _fbCollection: (_, name) => name,
    _fbServerTs: () => 'server-time' });
  const start = html.indexOf('      const CLOUD_CORRECTION_QUEUE_KEY');
  const end = html.indexOf('      function buildEventDataQuality', start);
  vm.runInContext(html.slice(start, end), context);
  for (const name of ['loadPendingCompareReports', 'savePendingCompareReports', 'queueCompareReportForCloud',
    'flushPendingCompareReports', 'sendCompareReportToCloud']) {
    if (html.includes(`function ${name}(`)) vm.runInContext(extractFunction(name), context);
  }
  return { context, localStorage };
}

for (const [label, enqueue, flush, load] of [
  ['corrections', 'queueCorrectionForCloud', 'flushPendingCloudCorrections', 'loadPendingCloudCorrections'],
  ['analysis', 'queueLearningReportForCloud', 'flushPendingCloudReports', 'loadPendingCloudReports'],
  ['comparison', 'queueCompareReportForCloud', 'flushPendingCompareReports', 'loadPendingCompareReports']
]) {
  test(`${label}: preserve records added during an in-flight upload`, async () => {
    const sent = [];
    let acknowledge;
    const { context } = await queueHarness(async (_, record) => {
      sent.push(record.ts);
      if (sent.length === 1) await new Promise(resolve => { acknowledge = resolve; });
    });
    context[enqueue]({ ts: 'first', file: 'private-video.mp4' });
    const flight = context[flush]();
    await new Promise(resolve => setImmediate(resolve));
    context[enqueue]({ ts: 'second' });
    acknowledge();
    await flight;
    assert.deepEqual(sent, ['first', 'second']);
    assert.equal(context[load]().length, 0);
  });
}

test('cached remote learning rebases local learning after restart', async () => {
  const localStorage = storage();
  localStorage.setItem('bias', JSON.stringify({ savedAt: Date.now(), data: { 'taegeuk_1#2': 0.4 } }));
  const context = vm.createContext({ localStorage, Date, _remoteBoundaryBias: null,
    BOUNDARY_BIAS_CACHE_KEY: 'bias', FIREBASE_READ_CACHE_TTL_MS: 86400000,
    _fbReady: false, loadCorrectionLog: () => [], refreshCount: 0,
    refreshLocalBoundaryBias() { context.refreshCount++; } });
  vm.runInContext(extractFunction('loadBoundaryBias'), context);
  await context.loadBoundaryBias();
  assert.equal(context._remoteBoundaryBias['taegeuk_1#2'], 0.4);
  assert.ok(context.refreshCount > 0, 'Fresh cache must also recalculate the local residual');
});

test('every statically imported module is available on the first offline restart', () => {
  const worker = fs.readFileSync(path.join(root, 'www/service-worker.js'), 'utf8');
  const rootWorker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
  for (const match of html.matchAll(/^\s*import .* from "(\.\/[^\"]+)";/gm)) {
    assert.ok(worker.includes(`"${match[1]}"`), `Not precached: ${match[1]}`);
    assert.ok(rootWorker.includes(`"${match[1].replace('./', './www/')}"`), `Not precached at root: ${match[1]}`);
  }
});

async function newQueue(options = {}) {
  const { createPersistentCloudQueue } = await import(pathToFileURL(path.join(root, 'www/cloud-queue.mjs')));
  return createPersistentCloudQueue({ key: 'test-outbox', storage: storage(), getTransport: () => null, ...options });
}
test('offline records survive a restart and legacy records migrate without leaking queue IDs', async () => {
  const disk = storage();
  disk.setItem('test-outbox', JSON.stringify([{ value: 'legacy' }]));
  const first = await newQueue({ storage: disk });
  first.enqueue({ value: 'offline' });
  await first.flush();
  const sent = [];
  const restarted = await newQueue({ storage: disk, getTransport: () => async payload => { sent.push(payload); } });
  assert.equal(await restarted.flush(), 2);
  assert.deepEqual(sent, [{ value: 'legacy' }, { value: 'offline' }]);
  assert.equal(restarted.status().pending, 0);
});
test('transient failure retains records and subsequent retry sends them', async () => {
  let fail = true;
  const queue = await newQueue({ getTransport: () => async () => {
    if (fail) throw Object.assign(new Error('offline'), { code: 'unavailable' });
  } });
  const id = queue.enqueue({ value: 1 });
  assert.equal(await queue.flush(), 0);
  assert.equal(queue.has(id), true);
  assert.equal(queue.status().lastError, 'unavailable');
  fail = false;
  assert.equal(await queue.flush(), 1);
  assert.equal(queue.has(id), false);
  assert.equal(queue.status().lastError, '');
});
test('one rejected legacy report does not block valid reports', async () => {
  const queue = await newQueue({ getTransport: () => async payload => {
    if (payload.invalid) throw Object.assign(new Error('schema'), { code: 'permission-denied' });
  } });
  const rejected = queue.enqueue({ invalid: true });
  const valid = queue.enqueue({ invalid: false });
  assert.equal(await queue.flush(), 1);
  assert.equal(queue.has(rejected), true);
  assert.equal(queue.has(valid), false);
  assert.equal(queue.status().lastError, 'permission-denied');
});
test('storage quota failure is visible and retains the current session record for upload', async () => {
  const queue = await newQueue({ storage: { getItem: () => null,
    setItem() { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); } },
    getTransport: () => async () => {} });
  const id = queue.enqueue({ value: 'retained' });
  assert.equal(queue.status().durable, false);
  assert.equal(queue.has(id), true);
  assert.equal(await queue.flush(), 1);
  assert.equal(queue.has(id), false);
});
test('outbox capacity does not silently discard unacknowledged records', async () => {
  const queue = await newQueue({ max: 2 });
  for (let i = 0; i < 5; i++) queue.enqueue({ value: i });
  assert.equal(queue.status().pending, 5);
  assert.equal(queue.status().overCapacity, true);
});
test('correction uploads exclude the source video filename', async () => {
  const sent = [];
  const { context } = await queueHarness(async (_, payload) => { sent.push(payload); });
  await context.sendCorrectionToCloud({ file: 'private-name.mp4', poomsae: 'taegeuk_1', action: 'adjust' });
  assert.equal(sent[0].file, undefined);
  assert.equal(sent[0].__queue_id, undefined);
});
test('Firebase initialization can be retried after an offline first start without duplicate initialization', async () => {
  let attempts = 0;
  let finish;
  const context = vm.createContext({ _fbReady: false, _firebaseInitPromise: null,
    initFirebase: () => { attempts++; return new Promise(resolve => { finish = resolve; }); } });
  vm.runInContext(extractFunction('initializeCloudConnection'), context);
  const first = context.initializeCloudConnection();
  const duplicate = context.initializeCloudConnection();
  assert.equal(attempts, 1);
  finish();
  await Promise.all([first, duplicate]);
  const retry = context.initializeCloudConnection();
  assert.equal(attempts, 2);
  finish();
  await retry;
  assert.ok(html.includes('window.addEventListener("online", retryCloudSync)'));
});
test('reports show the real queue state rather than claiming every save succeeded', () => {
  const render = extractFunction('renderResultPage');
  assert.ok(!render.includes('기록 저장됨'));
  assert.ok(render.includes('reportCloudSyncStatus'));
  const elements = {
    cloudSyncStatus: { textContent: '' }, reportCloudSyncStatus: { textContent: '' }
  };
  const state = { pending: 2, durable: false, lastError: 'storage:QuotaExceededError' };
  const context = vm.createContext({ document: { getElementById: id => elements[id] },
    _fbReady: true, cloudSharingEnabled: () => true, correctionCloudQueue: { status: () => state },
    learningCloudQueue: { status: () => ({ pending: 0, durable: true }) },
    compareCloudQueue: { status: () => ({ pending: 0, durable: true }) } });
  vm.runInContext(extractFunction('updateCloudSyncStatus'), context);
  context.updateCloudSyncStatus();
  assert.match(elements.cloudSyncStatus.textContent, /기기 저장 실패/);
  assert.equal(elements.reportCloudSyncStatus.textContent, elements.cloudSyncStatus.textContent);
  // 사용자가 익명 숫자 기록 보내기를 끄면 대기·오류 대신 '꺼짐'을 보여 준다.
  context.cloudSharingEnabled = () => false;
  context.updateCloudSyncStatus();
  assert.match(elements.cloudSyncStatus.textContent, /꺼짐/);
});
