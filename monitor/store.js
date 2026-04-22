const RING_KEY = "meta_capi_monitor_ring_v1";
const RING_MAX = 120;
const memoryRing = [];

/**
 * @param {string | undefined} url
 * @param {number} max
 */
function truncateUrl(url, max) {
  if (!url || typeof url !== "string") return "";
  return url.length <= max ? url : url.slice(0, max) + "…";
}

/**
 * @param {KVNamespace | undefined} kv
 * @param {object} entry
 */
export async function appendMonitorEvent(kv, entry) {
  memoryRing.unshift(entry);
  if (memoryRing.length > RING_MAX) memoryRing.length = RING_MAX;
  if (!kv) return;
  try {
    const raw = await kv.get(RING_KEY);
    const data = raw ? JSON.parse(raw) : { items: [] };
    if (!Array.isArray(data.items)) data.items = [];
    data.items.unshift(entry);
    data.items = data.items.slice(0, RING_MAX);
    await kv.put(RING_KEY, JSON.stringify(data));
  } catch (_) {
    /* ignore ring falhas em alta concorrência */
  }
}

/**
 * @param {ExecutionContext} ctx
 * @param {KVNamespace | undefined} kv
 * @param {object} entry
 */
export function scheduleMonitorLog(ctx, kv, entry) {
  if (!ctx) return;
  ctx.waitUntil(appendMonitorEvent(kv, entry));
}

/**
 * Registro padronizado no anel de monitoramento (evita repetir `ts` e binding).
 * @param {ExecutionContext} ctx
 * @param {Record<string, unknown>} env
 * @param {Record<string, unknown>} partial campos do evento (event_name, event_id, ok, error, detail, …)
 */
export function logMonitor(ctx, env, partial) {
  if (!ctx) return;
  scheduleMonitorLog(ctx, env.EVENT_LOG, Object.assign({}, partial, { ts: Date.now() }));
}

/**
 * @param {KVNamespace | undefined} kv
 */
export async function listMonitorEvents(kv) {
  if (!kv) {
    return { ok: true, kv_configured: false, items: memoryRing.slice() };
  }
  const raw = await kv.get(RING_KEY);
  if (!raw) return { ok: true, kv_configured: true, items: [] };
  const data = JSON.parse(raw);
  return { ok: true, kv_configured: true, items: Array.isArray(data.items) ? data.items : [] };
}

export { truncateUrl };
