const RING_KEY = "meta_capi_monitor_ring_v1";
const ITEM_KEY_PREFIX = "meta_capi_monitor_item_v1:";
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
  const eventsWithoutId = events.filter((ev) => {
    const id = typeof ev.event_id === "string" ? ev.event_id : "";
    return !id;
  });
  const latestEvents = Array.from(eventById.values()).concat(eventsWithoutId);
  const usedFallbackEvents = new Set();

  const correlations = leads.map((lead) => {
    const id = typeof lead.event_id === "string" ? lead.event_id : "";
    let ev = id ? eventById.get(id) : undefined;
    let matchedBy = "event_id";

    if (!ev) {
      const leadTs = asNum(lead.ts);
      const leadEmail = typeof lead.email_masked === "string" ? lead.email_masked : "";
      const leadPhone = typeof lead.phone_masked === "string" ? lead.phone_masked : "";
      const candidate = latestEvents.find((item) => {
        if (!item || item.ok !== true) return false;
        const itemId = typeof item.event_id === "string" ? item.event_id : "";
        if (itemId && usedFallbackEvents.has(itemId)) return false;
        const sameEmail = !!leadEmail && item.email_masked === leadEmail;
        const samePhone = !!leadPhone && item.phone_masked === leadPhone;
        if (!sameEmail && !samePhone) return false;
        return Math.abs(asNum(item.ts) - leadTs) <= 5 * 60 * 1000;
      });
      if (candidate) {
        ev = candidate;
        matchedBy = "contact";
        const candidateId =
          typeof candidate.event_id === "string" ? candidate.event_id : "";
        if (candidateId) usedFallbackEvents.add(candidateId);
      }
    }

    let status = "pending";
    if (ev && ev.ok === false) status = "failed";
    else if (ev && ev.ok === true) {
      const pixelActive =
        ev.pixel_status === "active" ||
        ev.meta_pixel_loaded === true ||
        ev.fbp_source === "cookie_antes" ||
        ev.fbp_source === "tracker_novo";
      status = matchedBy === "event_id" && pixelActive ? "deduplicated" : "validated_capi";
    }
    return {
      event_id: id || null,
      lead_ts: asNum(lead.ts),
      capi_ts: ev ? asNum(ev.ts) : null,
      lead_name: lead.lead_name || "",
      lead_email: lead.lead_email || "",
      email_masked: lead.email_masked || "",
      phone_masked: lead.phone_masked || "",
      lead_source: lead.lead_source || "",
      event_name: (ev && ev.event_name) || lead.event_name || "Lead",
      capi_ok: ev ? ev.ok === true : null,
      capi_error: ev ? ev.error || null : null,
      matched_by: matchedBy,
      status,
    };
  });

  const eventTotal = latestEvents.length;
  const eventOk = latestEvents.filter((e) => e.ok === true).length;
  const leadTotal = leads.length;
  const corrConfirmed = correlations.filter((c) => c.status === "deduplicated").length;
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
    const ts = asNum(normalized.ts);
    const reverseTs = String(9999999999999 - ts).padStart(13, "0");
    const rand =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    const key = ITEM_KEY_PREFIX + reverseTs + "-" + rand;
    await kv.put(key, JSON.stringify(normalized), { expirationTtl: 60 * 60 * 24 * 14 });
  } catch (_) {
    /* ignore falhas de persistência em alta concorrência */
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
  try {
    const listed = await kv.list({ prefix: ITEM_KEY_PREFIX, limit: RING_MAX });
    if (listed && Array.isArray(listed.keys) && listed.keys.length) {
      const rows = await Promise.all(
        listed.keys.map(async (k) => {
          try {
            const raw = await kv.get(k.name);
            return raw ? JSON.parse(raw) : null;
          } catch (_) {
            return null;
          }
        }),
      );
      const items = rows.filter(Boolean);
      return Object.assign({ ok: true, kv_configured: true }, buildMonitorView(items));
    }
  } catch (_) {
    // fallback legado abaixo
  }

  const raw = await kv.get(RING_KEY);
  if (!raw) return Object.assign({ ok: true, kv_configured: true }, buildMonitorView([]));
  const data = JSON.parse(raw);
  const items = Array.isArray(data.items) ? data.items : [];
  return Object.assign({ ok: true, kv_configured: true }, buildMonitorView(items));
}

export { truncateUrl };
