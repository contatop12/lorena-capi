/**
 * Meta CAPI — tracker leve (Vanilla JS).
 * Contrato de payload: ver directives/contrato_payload_capi.md
 *
 * Snippet unificado (Browser Pixel + CAPI):
 *   <script
 *     src="tracker.js"
 *     data-endpoint="https://seu-worker.workers.dev/event"
 *     data-pixel-id="993975279878737"
 *   ></script>
 *
 * Configuração de endpoint (um dos dois):
 *   data-endpoint="https://seu-worker.workers.dev/event"
 *   Rotas no Worker: POST /event (recomendado), POST /collect ou POST /
 *   window.__META_TRACKER_ENDPOINT__ = "https://.../event"; // antes de carregar o script
 *
 * Configuração de pixel browser (opcional):
 *   data-pixel-id="993975279878737"
 *   window.__META_PIXEL_ID__ = "993975279878737"; // fallback
 *
 * Debug opcional: window.__META_TRACKER_DEBUG__ = true;
 */
(function (global) {
  "use strict";

  var ENDPOINT_ATTR = "data-endpoint";
  var PIXEL_ID_ATTR = "data-pixel-id";
  var FBQ_SCRIPT_URL = "https://connect.facebook.net/en_US/fbevents.js";
  var COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 dias (padrão comum _fbp)
  var FETCH_TIMEOUT_MS = 8000;
  var QUEUE = [];

  function debug() {
    if (global.__META_TRACKER_DEBUG__) {
      var a = [].slice.call(arguments);
      a.unshift("[MetaTracker]");
      try {
        console.log.apply(console, a);
      } catch (_) {}
    }
  }

  /** UUID v4 (RFC4122) sem dependências externas. */
  function uuidV4() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    var rnd = function (n) {
      var s = "";
      for (var i = 0; i < n; i++) {
        s += ((Math.random() * 16) | 0).toString(16);
      }
      return s;
    };
    return rnd(8) + "-" + rnd(4) + "-4" + rnd(3) + "-" + ("89ab"[(Math.random() * 4) | 0] + rnd(3)) + "-" + rnd(12);
  }

  function getCookie(name) {
    var parts = ("; " + (document.cookie || "")).split("; " + name + "=");
    if (parts.length === 2) {
      return parts.pop().split(";").shift() || "";
    }
    return "";
  }

  function setCookie(name, value, maxAgeSec) {
    var secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      encodeURIComponent(name) +
      "=" +
      encodeURIComponent(value) +
      "; Path=/; Max-Age=" +
      maxAgeSec +
      "; SameSite=Lax" +
      secure;
  }

  /** Formato Meta: fb.1.{ms}.{número aleatório} */
  function newFbp() {
    return "fb.1." + String(Date.now()) + "." + String((Math.random() * 1e10) | 0);
  }

  /** Formato Meta: fb.1.{ms}.{fbclid} */
  function newFbcFromClid(fbclid) {
    return "fb.1." + String(Date.now()) + "." + String(fbclid);
  }

  function getFbclidFromUrl() {
    try {
      var p = new URL(location.href).searchParams;
      return p.get("fbclid") || "";
    } catch (_) {
      return "";
    }
  }

  function ensureFbpFbc() {
    var hadFbp = !!getCookie("_fbp");
    var fbp = getCookie("_fbp");
    if (!fbp) {
      fbp = newFbp();
      setCookie("_fbp", fbp, COOKIE_MAX_AGE);
      debug("_fbp criado");
    }
    var fbc = getCookie("_fbc");
    var clid = getFbclidFromUrl();
    if (clid && (!fbc || fbc.indexOf(clid) === -1)) {
      fbc = newFbcFromClid(clid);
      setCookie("_fbc", fbc, COOKIE_MAX_AGE);
      debug("_fbc atualizado a partir de fbclid");
    }
    /* fbp_source: aprox. — "cookie_antes" = já existia (p.ex. pixel Meta); "tracker_novo" = cookie criado aqui */
    var fbpSource = hadFbp ? "cookie_antes" : "tracker_novo";
    return { fbp: fbp, fbc: fbc || "", fbp_source: fbpSource };
  }

  function resolveEndpoint() {
    if (global.__META_TRACKER_ENDPOINT__) {
      return String(global.__META_TRACKER_ENDPOINT__);
    }
    var cur = document.currentScript;
    if (cur && cur.getAttribute(ENDPOINT_ATTR)) {
      return String(cur.getAttribute(ENDPOINT_ATTR));
    }
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s && s.getAttribute(ENDPOINT_ATTR)) {
        return String(s.getAttribute(ENDPOINT_ATTR));
      }
    }
    return "";
  }

  function resolvePixelId() {
    if (global.__META_PIXEL_ID__) {
      return String(global.__META_PIXEL_ID__);
    }
    var cur = document.currentScript;
    if (cur && cur.getAttribute(PIXEL_ID_ATTR)) {
      return String(cur.getAttribute(PIXEL_ID_ATTR));
    }
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s && s.getAttribute(PIXEL_ID_ATTR)) {
        return String(s.getAttribute(PIXEL_ID_ATTR));
      }
    }
    return "";
  }

  function ensureBrowserPixel(pixelId) {
    if (!pixelId) return false;
    var hadFbq = typeof global.fbq === "function";
    if (!hadFbq) {
      !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(global, document, "script", FBQ_SCRIPT_URL);
    }
    if (!global.__META_TRACKER_FBQ_INIT_DONE) {
      try {
        global.fbq("init", pixelId);
        global.__META_TRACKER_FBQ_INIT_DONE = true;
      } catch (_) {
        return false;
      }
    }
    return typeof global.fbq === "function";
  }

  function sendBrowserEvent(payload) {
    if (typeof global.fbq !== "function") return;
    var custom = payload.custom_data && typeof payload.custom_data === "object" ? payload.custom_data : {};
    try {
      global.fbq("track", payload.event_name, custom, { eventID: payload.event_id });
    } catch (_) {}
  }

  function nowUnixSec() {
    return Math.floor(Date.now() / 1000);
  }

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
    if (ctrl) {
      timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (_) {}
      }, FETCH_TIMEOUT_MS);
    }
    return Promise.resolve(p).then(
      function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () {
          return { ok: false, error: "invalid_json_response" };
        });
      },
      function (err) {
        if (timer) clearTimeout(timer);
        return { ok: false, error: err && err.name === "AbortError" ? "timeout" : "network" };
      }
    );
  }

  function buildPayload(eventName, eventData) {
    eventData = eventData || {};
    var ids = ensureFbpFbc();
    var custom = eventData.custom_data || eventData.customData || {};
    var extraUser = eventData.user_data || eventData.userData || {};

    var hasFbq = typeof global.fbq === "function";
    var clientCtx = {
      fbp_source: ids.fbp_source,
      meta_pixel_loaded: hasFbq,
      pixel_status: hasFbq ? "active" : "unknown",
    };
    var exCtx = eventData.client_context;
    if (exCtx && typeof exCtx === "object") {
      for (var ck in exCtx) {
        if (Object.prototype.hasOwnProperty.call(exCtx, ck)) {
          clientCtx[ck] = exCtx[ck];
        }
      }
    }
    return {
      schema: "meta-capi-v1",
      event_name: String(eventName || "PageView"),
      event_id: uuidV4(),
      event_time: typeof eventData.event_time === "number" ? eventData.event_time : nowUnixSec(),
      event_source_url: String(location.href),
      referrer_url: String(document.referrer || ""),
      action_source: "website",
      custom_data: typeof custom === "object" && custom ? custom : {},
      user_data: Object.assign(
        {
          client_user_agent: String(navigator.userAgent || ""),
          fbp: ids.fbp,
          fbc: ids.fbc || undefined,
        },
        typeof extraUser === "object" && extraUser ? extraUser : {}
      ),
      client_context: clientCtx,
    };
  }

  var endpoint = "";
  var pixelId = "";
  var ready = false;

  function flushQueue() {
    if (!endpoint) return;
    while (QUEUE.length) {
      var job = QUEUE.shift();
      sendInternal(job.name, job.data, job.resolve, job.reject);
    }
  }

  function sendInternal(eventName, eventData, resolve, reject) {
    var payload = buildPayload(eventName, eventData);
    sendBrowserEvent(payload);
    debug("send", payload.event_name, payload.event_id);
    postJson(endpoint, payload).then(function (r) {
      if (r && r.ok) {
        if (resolve) resolve(r);
      } else {
        if (reject) reject(r);
        else debug("erro", r);
      }
    });
  }

  function track(eventName, eventData) {
    return new Promise(function (resolve, reject) {
      if (!endpoint) {
        QUEUE.push({ name: eventName, data: eventData, resolve: resolve, reject: reject });
        return;
      }
      sendInternal(eventName, eventData, resolve, reject);
    });
  }

  /** PageView após pintura: reduz impacto no caminho crítico. */
  function schedulePageView() {
    var run = function () {
      track("PageView", {}).catch(function () {});
    };
    if (global.requestIdleCallback) {
      global.requestIdleCallback(run, { timeout: 3000 });
    } else {
      global.setTimeout(run, 0);
    }
  }

  function init() {
    endpoint = resolveEndpoint();
    pixelId = resolvePixelId();
    if (!endpoint) {
      debug("endpoint não configurado: use data-endpoint no <script> ou __META_TRACKER_ENDPOINT__");
      return;
    }
    if (pixelId) {
      ensureBrowserPixel(pixelId);
    }
    ready = true;
    flushQueue();
    schedulePageView();
  }

  global.MetaTracker = {
    track: track,
    /** UUID para uso manual se precisar correlacionar com backend (opcional). */
    uuid: uuidV4,
    _getEndpoint: function () {
      return endpoint;
    },
    _getPixelId: function () {
      return pixelId;
    },
    _isReady: function () {
      return ready;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : this);
