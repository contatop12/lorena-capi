/**
 * Cloudflare Worker — Meta Conversions API (CAPI), produção.
 * Variáveis: PIXEL_ID, META_ACCESS_TOKEN, META_API_VERSION, ALLOWED_ORIGINS,
 *   WORKER_ENV (production|development), TEST_EVENT_CODE (opcional para debug),
 *   EXPOSE_META_ERRORS (true para retornar corpo Meta em erros).
 *   MONITOR_TOKEN (opcional, recomendado) — painel GET /dashboard e GET /api/monitor/events.
 *   WEBHOOK_TOKEN (opcional, recomendado) — POST /webhook/lead
 *   EVENT_LOG (KV opcional) — histórico de eventos no painel.
 * Contrato: directives/contrato_payload_capi.md
 */
import { handleMonitorRequest } from "./monitor/router.js";
import { webhookTokenOk } from "./monitor/auth.js";
import {
  buildMonitorExtras,
  maskEmail,
  maskPhone,
} from "./monitor/telemetry.js";
import { logMonitor, truncateUrl } from "./monitor/store.js";

const TRACKER_JS = `(function (global) {
  "use strict";
  var ENDPOINT_ATTR = "data-endpoint";
  var PIXEL_ID_ATTR = "data-pixel-id";
  var FBQ_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
  var COOKIE_MAX_AGE = 90 * 24 * 60 * 60;
  var FETCH_TIMEOUT_MS = 8000;
  var QUEUE = [];
  function uuidV4() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") return global.crypto.randomUUID();
    function rnd(n) { var s = ""; for (var i = 0; i < n; i++) s += ((Math.random() * 16) | 0).toString(16); return s; }
    return rnd(8) + "-" + rnd(4) + "-4" + rnd(3) + "-" + ("89ab"[(Math.random() * 4) | 0] + rnd(3)) + "-" + rnd(12);
  }
  function getCookie(name) {
    var parts = ("; " + (document.cookie || "")).split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift() || "";
    return "";
  }
  function setCookie(name, value, maxAgeSec) {
    var secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + "; Path=/; Max-Age=" + maxAgeSec + "; SameSite=Lax" + secure;
  }
  function newFbp() { return "fb.1." + String(Date.now()) + "." + String((Math.random() * 1e10) | 0); }
  function newFbcFromClid(fbclid) { return "fb.1." + String(Date.now()) + "." + String(fbclid); }
  function getFbclidFromUrl() { try { return new URL(location.href).searchParams.get("fbclid") || ""; } catch (_) { return ""; } }
  function ensureFbpFbc() {
    var hadFbp = !!getCookie("_fbp");
    var fbp = getCookie("_fbp");
    if (!fbp) { fbp = newFbp(); setCookie("_fbp", fbp, COOKIE_MAX_AGE); }
    var fbc = getCookie("_fbc");
    var clid = getFbclidFromUrl();
    if (clid && (!fbc || fbc.indexOf(clid) === -1)) { fbc = newFbcFromClid(clid); setCookie("_fbc", fbc, COOKIE_MAX_AGE); }
    return { fbp: fbp, fbc: fbc || "", fbp_source: hadFbp ? "cookie_antes" : "tracker_novo" };
  }
  function pickAttr(attr) {
    var cur = document.currentScript;
    if (cur && cur.getAttribute(attr)) return String(cur.getAttribute(attr));
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s && s.getAttribute(attr)) return String(s.getAttribute(attr));
    }
    return "";
  }
  function resolveEndpoint() { return global.__META_TRACKER_ENDPOINT__ ? String(global.__META_TRACKER_ENDPOINT__) : pickAttr(ENDPOINT_ATTR); }
  function resolvePixelId() { return global.__META_PIXEL_ID__ ? String(global.__META_PIXEL_ID__) : pickAttr(PIXEL_ID_ATTR); }
  function ensureBrowserPixel(pixelId) {
    if (!pixelId) return false;
    if (typeof global.fbq !== "function") {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(global, document, "script", FBQ_SCRIPT_URL);
    }
    if (!global.__META_TRACKER_FBQ_INIT_DONE) {
      global.fbq("init", pixelId);
      global.__META_TRACKER_FBQ_INIT_DONE = true;
    }
    return typeof global.fbq === "function";
  }
  function sendBrowserEvent(payload) {
    if (typeof global.fbq !== "function") return;
    var custom = payload.custom_data && typeof payload.custom_data === "object" ? payload.custom_data : {};
    try { global.fbq("track", payload.event_name, custom, { eventID: payload.event_id }); } catch (_) {}
  }
  function nowUnixSec() { return Math.floor(Date.now() / 1000); }
  function postJson(url, body) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer;
    var p = fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      mode: "cors",
      credentials: "omit",
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (ctrl) timer = setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, FETCH_TIMEOUT_MS);
    return Promise.resolve(p).then(
      function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () { return { ok: false, error: "invalid_json_response" }; });
      },
      function (err) {
        if (timer) clearTimeout(timer);
        return { ok: false, error: err && err.name === "AbortError" ? "timeout" : "network" };
      },
    );
  }
  function buildPayload(eventName, eventData) {
    eventData = eventData || {};
    var ids = ensureFbpFbc();
    var custom = eventData.custom_data || eventData.customData || {};
    var extraUser = eventData.user_data || eventData.userData || {};
    var hasFbq = typeof global.fbq === "function";
    var clientCtx = { fbp_source: ids.fbp_source, meta_pixel_loaded: hasFbq, pixel_status: hasFbq ? "active" : "unknown" };
    var exCtx = eventData.client_context;
    if (exCtx && typeof exCtx === "object") for (var ck in exCtx) if (Object.prototype.hasOwnProperty.call(exCtx, ck)) clientCtx[ck] = exCtx[ck];
    return {
      schema: "meta-capi-v1",
      event_name: String(eventName || "PageView"),
      event_id: uuidV4(),
      event_time: typeof eventData.event_time === "number" ? eventData.event_time : nowUnixSec(),
      event_source_url: String(location.href),
      referrer_url: String(document.referrer || ""),
      action_source: "website",
      custom_data: typeof custom === "object" && custom ? custom : {},
      user_data: Object.assign({ client_user_agent: String(navigator.userAgent || ""), fbp: ids.fbp, fbc: ids.fbc || undefined }, typeof extraUser === "object" && extraUser ? extraUser : {}),
      client_context: clientCtx,
    };
  }
  var endpoint = "";
  var pixelId = "";
  var ready = false;
  function flushQueue() { if (!endpoint) return; while (QUEUE.length) { var job = QUEUE.shift(); sendInternal(job.name, job.data, job.resolve, job.reject); } }
  function sendInternal(eventName, eventData, resolve, reject) {
    var payload = buildPayload(eventName, eventData);
    sendBrowserEvent(payload);
    postJson(endpoint, payload).then(function (r) { if (r && r.ok) { if (resolve) resolve(r); } else if (reject) reject(r); });
  }
  function track(eventName, eventData) {
    return new Promise(function (resolve, reject) {
      if (!endpoint) { QUEUE.push({ name: eventName, data: eventData, resolve: resolve, reject: reject }); return; }
      sendInternal(eventName, eventData, resolve, reject);
    });
  }
  function schedulePageView() {
    var run = function () { track("PageView", {}).catch(function () {}); };
    if (global.requestIdleCallback) global.requestIdleCallback(run, { timeout: 3000 });
    else global.setTimeout(run, 0);
  }
  function init() {
    endpoint = resolveEndpoint();
    pixelId = resolvePixelId();
    if (!endpoint) return;
    if (pixelId) ensureBrowserPixel(pixelId);
    ready = true;
    flushQueue();
    schedulePageView();
  }
  global.MetaTracker = {
    track: track,
    uuid: uuidV4,
    _getEndpoint: function () { return endpoint; },
    _getPixelId: function () { return pixelId; },
    _isReady: function () { return ready; },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(typeof window !== "undefined" ? window : this);
`;
const HEX64_RE = /^[a-f0-9]{64}$/i;
const HASH_USER_KEYS = ["em", "ph", "fn", "ln", "ct", "st", "zp", "country", "external_id"];

export default {
  /**
   * @param {Request} request
   * @param {Record<string, string | undefined>} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (request.method === "OPTIONS") {
      return handleOptions(request, env, path);
    }

    const monitorRes = await handleMonitorRequest(request, env, jsonResponse);
    if (monitorRes) return monitorRes;

    if (request.method === "GET" && (path === "/" || path === "/health")) {
      return healthResponse(request, env);
    }

    if (
      request.method === "GET" &&
      (path === "/tracker.js" || path === "/trackerjs" || path === "/meta-tracker.js")
    ) {
      return trackerJsResponse(request, env);
    }

    if (request.method === "POST" && path === "/webhook/lead") {
      return handleWebhookLead(request, env, ctx);
    }

    const collectPaths = ["/collect", "/event", "/"];
    const isPostCollect =
      request.method === "POST" && collectPaths.includes(path);

    if (!isPostCollect) {
      return jsonResponse(request, env, 404, { ok: false, error: "not_found" });
    }

    const originBlock = checkBrowserOriginPolicy(request, env);
    if (originBlock) return originBlock;

    return handleCollect(request, env, ctx);
  },
};

/** @param {string} pathname */
function normalizePath(pathname) {
  const p = pathname.replace(/\/$/, "") || "/";
  return p;
}

/**
 * @param {string | undefined} raw
 * @returns {string[]}
 */
function parseAllowedOrigins(raw) {
  if (!raw || String(raw).trim() === "") return [];
  const s = String(raw).trim();
  if (s === "*") return ["*"];
  return s
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function isProduction(env) {
  const m = (env.WORKER_ENV || "production").toLowerCase();
  return m !== "development" && m !== "dev";
}

function corsConfigInvalidForProduction(env) {
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  return allowed.length === 0 || allowed.includes("*");
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
function corsHeadersFor(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
  const prod = isProduction(env);
  const badProd = prod && corsConfigInvalidForProduction(env);

  let allowOrigin = "";
  if (badProd) {
    allowOrigin = "";
  } else if (allowed.includes("*")) {
    allowOrigin = "*";
  } else if (origin && allowed.some((o) => o === origin)) {
    allowOrigin = origin;
  } else if (allowed.length === 0 && !prod) {
    allowOrigin = "*";
  }

  const h = new Headers();
  if (allowOrigin) h.set("Access-Control-Allow-Origin", allowOrigin);
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  h.set("Access-Control-Allow-Headers", "Content-Type, X-Monitor-Token, Authorization");
  h.set("Access-Control-Max-Age", "86400");
  return h;
}

/**
 * Bloqueia POST cross-origin mal configurado em produção antes de chamar a Meta.
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @returns {Response | null}
 */
function checkBrowserOriginPolicy(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  const prod = isProduction(env);
  const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);

  if (prod && corsConfigInvalidForProduction(env)) {
    return jsonResponse(request, env, 403, {
      ok: false,
      error: "cors_not_configured",
      detail: "Em WORKER_ENV=production defina ALLOWED_ORIGINS com origens explícitas (não use * nem vazio).",
    });
  }

  if (prod && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return jsonResponse(request, env, 403, {
      ok: false,
      error: "origin_not_allowed",
    });
  }

  return null;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} _path
 */
function handleOptions(request, env, _path) {
  const h = corsHeadersFor(request, env);
  return new Response(null, { status: 204, headers: h });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
function trackerJsResponse(request, env) {
  const h = corsHeadersFor(request, env);
  h.set("Content-Type", "application/javascript; charset=utf-8");
  h.set("Cache-Control", "public, max-age=300");
  h.set("X-Content-Type-Options", "nosniff");
  return new Response(TRACKER_JS, { status: 200, headers: h });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
function healthResponse(request, env) {
  const h = corsHeadersFor(request, env);
  h.set("Content-Type", "application/json; charset=utf-8");
  const body = {
    ok: true,
    service: "meta-capi-worker",
    worker_env: (env.WORKER_ENV || "production").toLowerCase(),
    dashboard: "/dashboard",
  };
  return new Response(JSON.stringify(body), { status: 200, headers: h });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {number} status
 * @param {object} body
 */
function jsonResponse(request, env, status, body) {
  const h = corsHeadersFor(request, env);
  h.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: h });
}

/**
 * @param {Request} request
 */
function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("True-Client-IP") ||
    request.headers.get("X-Real-IP") ||
    ""
  ).trim();
}

const MAX_BODY_BYTES = 256 * 1024;
const MAX_EVENT_NAME_LEN = 128;

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {ExecutionContext} ctx
 */
async function handleCollect(request, env, ctx) {
  const ct = request.headers.get("Content-Type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, null, {
        event_name: null,
        event_id: null,
        ok: false,
        error: "unsupported_media_type",
        detail: "Content-Type",
      }),
    );
    return jsonResponse(request, env, 415, { ok: false, error: "unsupported_media_type" });
  }

  const pixelId = (env.PIXEL_ID || "").trim();
  const token = (env.META_ACCESS_TOKEN || "").trim();
  const apiVersion = (env.META_API_VERSION || "v25.0").trim().replace(/^v?/, "v");

  if (!pixelId || !token) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, null, {
        event_name: null,
        event_id: null,
        ok: false,
        error: "missing_env",
        detail: "PIXEL_ID ou META_ACCESS_TOKEN",
      }),
    );
    return jsonResponse(request, env, 500, {
      ok: false,
      error: "missing_env",
      detail: "Defina PIXEL_ID e META_ACCESS_TOKEN (secret) no Worker.",
    });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY_BYTES) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, null, {
        event_name: null,
        event_id: null,
        ok: false,
        error: "payload_too_large",
        detail: "corpo > limite",
      }),
    );
    return jsonResponse(request, env, 413, { ok: false, error: "payload_too_large" });
  }

  let body;
  try {
    body = JSON.parse(rawText || "{}");
  } catch {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, null, {
        event_name: null,
        event_id: null,
        ok: false,
        error: "invalid_json",
        detail: "JSON inválido",
      }),
    );
    return jsonResponse(request, env, 500, { ok: false, error: "invalid_json" });
  }

  if (!body || typeof body !== "object") {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, null, {
        event_name: null,
        event_id: null,
        ok: false,
        error: "empty_body",
        detail: "corpo vazio",
      }),
    );
    return jsonResponse(request, env, 500, { ok: false, error: "empty_body" });
  }

  const eventName = body.event_name;
  if (!eventName || typeof eventName !== "string") {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, body, {
        event_name: null,
        event_id: typeof body.event_id === "string" ? body.event_id : null,
        ok: false,
        error: "missing_event_name",
        detail: truncateUrl(body.event_source_url, 72) || "—",
      }),
    );
    return jsonResponse(request, env, 500, { ok: false, error: "missing_event_name" });
  }
  if (eventName.length > MAX_EVENT_NAME_LEN) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, body, {
        event_name: eventName,
        event_id: typeof body.event_id === "string" ? body.event_id : null,
        ok: false,
        error: "event_name_too_long",
        detail: truncateUrl(body.event_source_url, 72),
      }),
    );
    return jsonResponse(request, env, 500, { ok: false, error: "event_name_too_long" });
  }

  const ip = clientIp(request);
  const ua = (request.headers.get("User-Agent") || "").trim();

  const incomingUser = body.user_data && typeof body.user_data === "object" ? body.user_data : {};
  const userData = await prepareUserData(incomingUser, ip, ua);

  const serverEvent = {
    event_name: eventName,
    event_time: typeof body.event_time === "number" ? body.event_time : Math.floor(Date.now() / 1000),
    event_id: typeof body.event_id === "string" ? body.event_id : undefined,
    event_source_url: typeof body.event_source_url === "string" ? body.event_source_url : undefined,
    referrer_url: typeof body.referrer_url === "string" ? body.referrer_url : undefined,
    action_source: "website",
    user_data: userData,
    custom_data:
      body.custom_data && typeof body.custom_data === "object" && !Array.isArray(body.custom_data)
        ? body.custom_data
        : {},
  };

  const graphUrl = `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;

  const graphBody = { data: [serverEvent] };
  const testCode = (env.TEST_EVENT_CODE || "").trim();
  if (testCode) graphBody.test_event_code = testCode;

  // Marca a entrada no pipeline CAPI antes da validação da Meta.
  logMonitor(
    ctx,
    env,
    buildMonitorExtras(request, body, {
      event_name: eventName,
      event_id: serverEvent.event_id || null,
      ok: null,
      error: undefined,
      detail: "capi_received",
    }),
  );

  let metaRes;
  try {
    metaRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphBody),
    });
  } catch (e) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, body, {
        event_name: eventName,
        event_id: serverEvent.event_id || null,
        ok: false,
        error: "meta_fetch_failed",
        detail: "meta_fetch_failed",
      }),
    );
    return jsonResponse(request, env, 500, {
      ok: false,
      error: "meta_fetch_failed",
      detail: exposeMetaErrors(env) ? String(e && e.message ? e.message : e) : undefined,
    });
  }

  const metaText = await metaRes.text();
  let metaJson;
  try {
    metaJson = JSON.parse(metaText);
  } catch {
    metaJson = { raw: metaText };
  }

  if (!metaRes.ok) {
    logMonitor(
      ctx,
      env,
      buildMonitorExtras(request, body, {
        event_name: eventName,
        event_id: serverEvent.event_id || null,
        ok: false,
        error: "meta_api_error",
        detail: "meta_api_error_http_" + metaRes.status,
      }),
    );
    const payload = {
      ok: false,
      error: "meta_api_error",
      status: metaRes.status,
    };
    if (exposeMetaErrors(env)) payload.meta = metaJson;
    return jsonResponse(request, env, 500, payload);
  }

  const received =
    metaJson && typeof metaJson.events_received === "number" ? metaJson.events_received : undefined;
  logMonitor(
    ctx,
    env,
    buildMonitorExtras(request, body, {
      event_name: eventName,
      event_id: serverEvent.event_id || null,
      ok: true,
      error: undefined,
      detail: "meta_api_ok" + (received != null ? " events_received=" + received : ""),
    }),
  );

  return jsonResponse(request, env, 200, {
    ok: true,
    event_id: serverEvent.event_id,
    meta: metaJson,
  });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {ExecutionContext} ctx
 */
async function handleWebhookLead(request, env, ctx) {
  if (!webhookTokenOk(request, env)) {
    return jsonResponse(request, env, 401, {
      ok: false,
      error: "unauthorized_webhook",
      detail: "Defina WEBHOOK_TOKEN e envie via Authorization: Bearer.",
    });
  }

  const ct = request.headers.get("Content-Type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    return jsonResponse(request, env, 415, {
      ok: false,
      error: "unsupported_media_type",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(request, env, 400, {
      ok: false,
      error: "invalid_json",
    });
  }

  const lead = body && typeof body.lead === "object" ? body.lead : body;
  if (!lead || typeof lead !== "object") {
    return jsonResponse(request, env, 400, { ok: false, error: "invalid_lead_body" });
  }

  const eventIdRaw = typeof lead.event_id === "string" ? lead.event_id.trim() : "";
  const eventId = eventIdRaw || (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "lead-" + Date.now());
  const eventName = typeof lead.event_name === "string" && lead.event_name.trim() ? lead.event_name.trim() : "Lead";
  const leadSource =
    (typeof lead.source === "string" && lead.source.trim()) ||
    (typeof lead.channel === "string" && lead.channel.trim()) ||
    "webhook";
  const leadName =
    (typeof lead.name === "string" && lead.name.trim()) ||
    (typeof lead.full_name === "string" && lead.full_name.trim()) ||
    "";
  const email =
    (typeof lead.email === "string" && lead.email.trim()) ||
    (typeof lead.user_email === "string" && lead.user_email.trim()) ||
    "";
  const phone =
    (typeof lead.phone === "string" && lead.phone.trim()) ||
    (typeof lead.telefone === "string" && lead.telefone.trim()) ||
    (typeof lead.whatsapp === "string" && lead.whatsapp.trim()) ||
    "";
  const pageUrl =
    (typeof lead.page_url === "string" && lead.page_url.trim()) ||
    (typeof lead.url === "string" && lead.url.trim()) ||
    "";

  logMonitor(ctx, env, {
    kind: "lead_capture",
    webhook_received: true,
    event_name: eventName,
    event_id: eventId,
    ok: true,
    error: undefined,
    detail: "lead_webhook",
    lead_source: leadSource,
    lead_name: leadName,
    lead_email: email,
    email_masked: email ? maskEmail(email) : "",
    phone_masked: phone ? maskPhone(phone) : "",
    page_url: truncateUrl(pageUrl, 120),
  });

  return jsonResponse(request, env, 200, {
    ok: true,
    event_id: eventId,
    event_name: eventName,
    lead_source: leadSource,
  });
}

/**
 * @param {Record<string, string | undefined>} env
 */
function exposeMetaErrors(env) {
  const v = (env.EXPOSE_META_ERRORS || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function normalizeForHash(key, value) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  if (key === "em") return raw.toLowerCase();
  if (key === "ph") return raw.replace(/[^\d]/g, "");
  if (key === "country") return raw.toLowerCase();
  if (key === "zp") return raw.replace(/\s+/g, "");
  return raw.toLowerCase();
}

/**
 * @param {string} value
 */
async function sha256Hex(value) {
  const msg = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", msg);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Normaliza e hasheia user_data avançado (EMQ), preservando fbp/fbc/ip/ua.
 * @param {Record<string, unknown>} incomingUser
 * @param {string} ip
 * @param {string} ua
 */
async function prepareUserData(incomingUser, ip, ua) {
  const out = {};

  // Chaves que não devem ser hash.
  const direct = ["fbp", "fbc", "fb_login_id", "client_ip_address", "client_user_agent"];
  for (const k of direct) {
    if (typeof incomingUser[k] === "string" && incomingUser[k].trim()) {
      out[k] = incomingUser[k].trim();
    }
  }

  out.client_ip_address = out.client_ip_address || ip || undefined;
  out.client_user_agent = out.client_user_agent || ua || undefined;

  // Chaves que melhoram EMQ e devem estar em hash SHA-256.
  for (const k of HASH_USER_KEYS) {
    const v = incomingUser[k];
    if (typeof v !== "string" || !v.trim()) continue;
    if (HEX64_RE.test(v.trim())) {
      out[k] = v.trim().toLowerCase();
      continue;
    }
    const normalized = normalizeForHash(k, v);
    if (!normalized) continue;
    out[k] = await sha256Hex(normalized);
  }

  return out;
}
