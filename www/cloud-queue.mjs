// Local outbox: re-read after every acknowledgement so new records cannot be lost.
// Internal IDs are kept locally and never added to the learning payload.
export function createPersistentCloudQueue({ key, storage, getTransport, onStatus = () => {}, max = Infinity }) {
  let fallback = [];
  let dirty = false;
  let durable = true;
  let lastError = '';
  let flight = null;
  let sent = 0;
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const errorCode = error => String(error?.code || error?.name || 'unknown');
  function read() {
    if (dirty) return fallback;
    try {
      const parsed = JSON.parse(storage.getItem(key) || '[]');
      if (!Array.isArray(parsed)) throw new Error('Invalid outbox');
      const rows = parsed.filter(row => row && typeof row === 'object');
      let migrated = rows.length !== parsed.length;
      const normalized = rows.map(row => {
        if (row.__queue_id) return row;
        migrated = true;
        return { ...row, __queue_id: id() };
      });
      fallback = normalized;
      if (migrated) write(normalized);
      return normalized;
    } catch (error) {
      durable = false;
      lastError = `storage:${errorCode(error)}`;
      dirty = true;
      return fallback;
    }
  }
  function write(rows) {
    fallback = rows;
    try {
      storage.setItem(key, JSON.stringify(rows));
      dirty = false;
      durable = true;
      if (lastError.startsWith('storage:')) lastError = '';
      return true;
    } catch (error) {
      dirty = true;
      durable = false;
      lastError = `storage:${errorCode(error)}`;
      return false;
    }
  }
  function status() {
    const pending = read().length;
    return { pending, durable, lastError, sent, overCapacity: pending > max };
  }
  function notify() { onStatus(status()); }
  function pending() {
    return read().map(({ __queue_id, ...payload }) => payload);
  }
  function enqueue(payload) {
    // Snapshot the payload: later UI edits must not mutate an already queued record.
    const row = { ...JSON.parse(JSON.stringify(payload)), __queue_id: id() };
    // Never trim unacknowledged records. A quota failure keeps them in memory and is visible.
    write([...read(), row]);
    notify();
    return row.__queue_id;
  }
  function has(recordId) { return read().some(row => row.__queue_id === recordId); }
  function flush() {
    if (flight) return flight;
    flight = Promise.resolve().then(async () => {
      let count = 0;
      const attempted = new Set();
      let failure = '';
      while (true) {
        const transport = getTransport();
        if (!transport) break;
        const row = read().find(item => !attempted.has(item.__queue_id));
        if (!row) break;
        attempted.add(row.__queue_id);
        const { __queue_id, ...payload } = row;
        try {
          await transport(payload);
          write(read().filter(item => item.__queue_id !== __queue_id));
          count++;
          sent++;
        } catch (error) {
          failure = errorCode(error);
          // An invalid legacy record must not block every later valid record.
          if (!/permission-denied|invalid-argument/.test(failure)) break;
        }
      }
      if (durable) lastError = failure;
      notify();
      return count;
    }).finally(() => { flight = null; });
    return flight;
  }
  return { enqueue, flush, pending, has, status };
}
