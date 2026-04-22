const RING_KEY = "meta_capi_monitor_ring_v1";
const RING_MAX = 120;
const memoryRing = [];

/**
 * @param {unknown} n
 */
function asNum(n) {
  return typeof n === "number" && Number.isFinite(n) ? n : Date.now();
}

/**
 * @param {Record<string, unknown>} item
 */
function normalizeItem(item) {
  const kind =
    typeof item.kind === "string"
      ? item.kind
      : item.webhook_received
        ? "lead_capture"
        : "capi_event";
  return Object.assign({}, item, {
    kind,
    ts: asNum(item.ts),
  });
}

/**
 * @param {Record<string, unknown>[]} items
 */
function buildMonitorView(items) {
  const normalized = items.map((i) => normalizeItem(i)).sort((a, b) => asNum(b.ts) - asNum(a.ts));
  const leads = normalized.filter((i) => i.kind === "lead_capture");
  const events = normalized.filter((i) => i.kind !== "lead_capture");

  /** @type {Map<string, Record<string, unknown>>} */
  const eventById = new Map();
  for (const ev of events) {
    const id = typeof ev.event_id === "string" ? ev.event_id : "";
    if (!id || eventById.has(id)) continue;
    eventById.set(id, ev);
  }

  const correlations = leads.map((lead) => {
    const id = typeof lead.event_id === "string" ? lead.event_id : "";
    const ev = id ? eventById.get(id) : undefined;
    let status = "pending";
    if (ev && ev.ok === true) status = "confirmed";
    else if (ev && ev.ok === false) status = "failed";
    return {
      event_id: id || null,
      lead_ts: asNum(lead.ts),
      capi_ts: ev ? asNum(ev.ts) : null,
      lead_name: lead.lead_name || "",
      email_masked: lead.email_masked || "",
      phone_masked: lead.phone_masked || "",
      lead_source: lead.lead_source || "",
      event_name: (ev && ev.event_name) || lead.event_name || "Lead",
      capi_ok: ev ? ev.ok === true : null,
      capi_error: ev ? ev.error || null : null,
      status,
    };
  });

  const eventTotal = events.length;
  const eventOk = events.filter((e) => e.ok === true).length;
  const leadTotal = leads.length;
  const corrConfirmed = correlations.filter((c) => c.status === "confirmed").length;
  const corrPending = correlations.filter((c) => c.status === "pending").length;
  const corrFailed = correlations.filter((c) => c.status === "failed").length;

  return {
    items: normalized,
    events,
    leads,
    correlations,
    metrics: {
      event_total: eventTotal,
      event_ok: eventOk,
      event_error: Math.max(0, eventTotal - eventOk),
      lead_total: leadTotal,
      correlation_confirmed: corrConfirmed,
      correlation_pending: corrPending,
      correlation_failed: corrFailed,
      capi_success_rate: eventTotal ? Math.round((eventOk / eventTotal) * 100) : 0,
    },
  };
}

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
  const normalized = normalizeItem(entry);
  memoryRing.unshift(normalized);
  if (memoryRing.length > RING_MAX) memoryRing.length = RING_MAX;
  if (!kv) return;
  try {
    const raw = await kv.get(RING_KEY);
    const data = raw ? JSON.parse(raw) : { items: [] };
    if (!Array.isArray(data.items)) data.items = [];
    data.items.unshift(normalized);
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
  const kind =
    typeof partial.kind === "string"
      ? partial.kind
      : partial.webhook_received
        ? "lead_capture"
        : "capi_event";
  scheduleMonitorLog(
    ctx,
    env.EVENT_LOG,
    Object.assign({}, partial, { kind, ts: Date.now() }),
  );
}

/**
 * @param {KVNamespace | undefined} kv
 */
export async function listMonitorEvents(kv) {
  if (!kv) {
    return Object.assign(
      { ok: true, kv_configured: false },
      buildMonitorView(memoryRing.slice()),
    );
  }
  const raw = await kv.get(RING_KEY);
  if (!raw)
    return Object.assign({ ok: true, kv_configured: true }, buildMonitorView([]));
  const data = JSON.parse(raw);
  const items = Array.isArray(data.items) ? data.items : [];
  return Object.assign({ ok: true, kv_configured: true }, buildMonitorView(items));
}

export { truncateUrl };
