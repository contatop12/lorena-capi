/**
 * Cloudflare Worker — Meta Conversions API (CAPI), produção.
 * Variáveis: PIXEL_ID, META_ACCESS_TOKEN, META_API_VERSION, ALLOWED_ORIGINS,
 *   WORKER_ENV (production|development), TEST_EVENT_CODE (opcional),
 *   EXPOSE_META_ERRORS (true para retornar corpo Meta em erros).
 *   MONITOR_TOKEN (opcional, recomendado) — painel GET /dashboard e GET /api/monitor/events.
 *   EVENT_LOG (KV opcional) — histórico de eventos no painel.
 * Contrato: directives/contrato_payload_capi.md
 */
import { handleMonitorRequest } from "./monitor/router.js";
import { logMonitor, truncateUrl } from "./monitor/store.js";

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
    logMonitor(ctx, env, {
      event_name: null,
      event_id: null,
      ok: false,
      error: "unsupported_media_type",
      detail: "Content-Type",
    });
    return jsonResponse(request, env, 415, { ok: false, error: "unsupported_media_type" });
  }

  const pixelId = (env.PIXEL_ID || "").trim();
  const token = (env.META_ACCESS_TOKEN || "").trim();
  const apiVersion = (env.META_API_VERSION || "v21.0").trim().replace(/^v?/, "v");

  if (!pixelId || !token) {
    logMonitor(ctx, env, {
      event_name: null,
      event_id: null,
      ok: false,
      error: "missing_env",
      detail: "PIXEL_ID ou META_ACCESS_TOKEN",
    });
    return jsonResponse(request, env, 500, {
      ok: false,
      error: "missing_env",
      detail: "Defina PIXEL_ID e META_ACCESS_TOKEN (secret) no Worker.",
    });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_BODY_BYTES) {
    logMonitor(ctx, env, {
      event_name: null,
      event_id: null,
      ok: false,
      error: "payload_too_large",
      detail: "corpo > limite",
    });
    return jsonResponse(request, env, 413, { ok: false, error: "payload_too_large" });
  }

  let body;
  try {
    body = JSON.parse(rawText || "{}");
  } catch {
    logMonitor(ctx, env, {
      event_name: null,
      event_id: null,
      ok: false,
      error: "invalid_json",
      detail: "JSON inválido",
    });
    return jsonResponse(request, env, 500, { ok: false, error: "invalid_json" });
  }

  if (!body || typeof body !== "object") {
    logMonitor(ctx, env, {
      event_name: null,
      event_id: null,
      ok: false,
      error: "empty_body",
      detail: "corpo vazio",
    });
    return jsonResponse(request, env, 500, { ok: false, error: "empty_body" });
  }

  const eventName = body.event_name;
  if (!eventName || typeof eventName !== "string") {
    logMonitor(ctx, env, {
      event_name: null,
      event_id: typeof body.event_id === "string" ? body.event_id : null,
      ok: false,
      error: "missing_event_name",
      detail: truncateUrl(body.event_source_url, 72) || "—",
    });
    return jsonResponse(request, env, 500, { ok: false, error: "missing_event_name" });
  }
  if (eventName.length > MAX_EVENT_NAME_LEN) {
    logMonitor(ctx, env, {
      event_name: eventName,
      event_id: typeof body.event_id === "string" ? body.event_id : null,
      ok: false,
      error: "event_name_too_long",
      detail: truncateUrl(body.event_source_url, 72),
    });
    return jsonResponse(request, env, 500, { ok: false, error: "event_name_too_long" });
  }

  const ip = clientIp(request);
  const ua = (request.headers.get("User-Agent") || "").trim();

  const incomingUser = body.user_data && typeof body.user_data === "object" ? body.user_data : {};

  const userData = {
    ...incomingUser,
    client_ip_address: incomingUser.client_ip_address || ip || undefined,
    client_user_agent: incomingUser.client_user_agent || ua || undefined,
  };

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

  let metaRes;
  try {
    metaRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(graphBody),
    });
  } catch (e) {
    logMonitor(ctx, env, {
      event_name: eventName,
      event_id: serverEvent.event_id || null,
      ok: false,
      error: "meta_fetch_failed",
      detail: truncateUrl(serverEvent.event_source_url, 72),
    });
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
    logMonitor(ctx, env, {
      event_name: eventName,
      event_id: serverEvent.event_id || null,
      ok: false,
      error: "meta_api_error",
      detail: "HTTP " + metaRes.status + " · " + truncateUrl(serverEvent.event_source_url, 48),
    });
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
  logMonitor(ctx, env, {
    event_name: eventName,
    event_id: serverEvent.event_id || null,
    ok: true,
    error: undefined,
    detail:
      (received != null ? "events_received=" + received + " · " : "") +
      truncateUrl(serverEvent.event_source_url, 64),
  });

  return jsonResponse(request, env, 200, {
    ok: true,
    event_id: serverEvent.event_id,
    meta: metaJson,
  });
}

/**
 * @param {Record<string, string | undefined>} env
 */
function exposeMetaErrors(env) {
  const v = (env.EXPOSE_META_ERRORS || "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
