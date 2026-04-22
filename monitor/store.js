const RING_KEY = "meta_capi_monitor_ring_v1";
const RING_MAX = 120;

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
  if (!kv || !ctx) return;
  ctx.waitUntil(appendMonitorEvent(kv, entry));
}

/**
 * @param {KVNamespace | undefined} kv
 */
export async function listMonitorEvents(kv) {
  if (!kv) {
    return { ok: true, kv_configured: false, items: [] };
  }
  const raw = await kv.get(RING_KEY);
  if (!raw) return { ok: true, kv_configured: true, items: [] };
  const data = JSON.parse(raw);
  return { ok: true, kv_configured: true, items: Array.isArray(data.items) ? data.items : [] };
}

export { truncateUrl };
