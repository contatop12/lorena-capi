/**
 * Enriquecimento de logs do painel: UA, e-mail mascarado, sinais opcionais do client_context.
 * Nada disso precisa ser enviado à Meta; usado só em `logMonitor`.
 */

/**
 * @param {string} ua
 */
export function parseUserAgent(ua) {
  const u = (ua || "").trim();
  let browser = "Unknown";
  let os = "Unknown";
  let mobile = /Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|webOS/i.test(u);
  let bot = /bot|crawl|spider|slurp|bingpreview|yandex|baiduspider|facebookexternalhit|embedly|quora|monitoring/i.test(
    u,
  );

  if (/Edg\//i.test(u)) browser = "Edge";
  else if (/OPR\/|Opera\//i.test(u)) browser = "Opera";
  else if (/CriOS/i.test(u)) browser = "Chrome";
  else if (/Chrome\//i.test(u) && !/Chromium|Edg/i.test(u)) browser = "Chrome";
  else if (/Safari\//i.test(u) && !/Chrome|Chromium|CriOS/i.test(u)) browser = "Safari";
  else if (/Firefox\//i.test(u)) browser = "Firefox";
  else if (/MSIE|Trident/i.test(u)) browser = "IE";

  if (/Windows NT 10/.test(u)) os = "Windows";
  else if (/Windows/i.test(u)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(u)) os = "macOS";
  else if (/iPhone|iPad|iPod/.test(u)) {
    os = "iOS";
    mobile = true;
  } else if (/Android/.test(u)) os = "Android";
  else if (/CrOS/.test(u)) os = "ChromeOS";
  else if (/Linux/.test(u)) os = "Linux";

  return { browser, os, mobile, bot, ua: u };
}

/**
 * @param {string} email
 */
export function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const t = email.trim();
  const at = t.indexOf("@");
  if (at < 1) return "";
  const local = t.slice(0, at);
  const dom = t.slice(at + 1);
  if (!dom) return "";
  return (local.charAt(0) || "?") + "***@" + dom;
}

/**
 * E-mail de monitoramento: custom_data (Lead) ou `monitor.email` (opcional, explícito).
 * @param {object | null | undefined} body
 * @returns {string}
 */
export function pickEmailForMonitor(body) {
  if (!body || typeof body !== "object") return "";
  const m = body.monitor;
  if (m && typeof m === "object" && typeof m.email === "string" && m.email.indexOf("@") > 0) {
    return m.email.trim();
  }
  const c = body.custom_data;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    if (typeof c.email === "string" && c.email.indexOf("@") > 0) return c.email.trim();
    if (typeof c.user_email === "string" && c.user_email.indexOf("@") > 0) return c.user_email.trim();
  }
  return "";
}

/**
 * @param {Request} request
 * @param {object | null} body
 * @param {Record<string, unknown>} base campos mínimos do log (ts é aplicado em logMonitor)
 */
export function buildMonitorExtras(request, body, base) {
  const ua = (request.headers.get("User-Agent") || "").trim();
  const p = parseUserAgent(ua);
  const cc =
    body && typeof body === "object" && body.client_context && typeof body.client_context === "object"
      ? body.client_context
      : {};
  const em = pickEmailForMonitor(body || /** @type {any} */ ({}));
  let pixelStatus = "unknown";
  if (cc.pixel_status === "blocked" || cc.pixel_status === "inactive") pixelStatus = cc.pixel_status;
  else if (cc.meta_pixel_loaded === true || cc.pixel_status === "active") pixelStatus = "active";
  return Object.assign({}, base, {
    browser: p.browser,
    os: p.os,
    mobile: p.mobile,
    bot: p.bot,
    browser_os: p.browser + " / " + p.os + (p.mobile ? " (M)" : ""),
    email_masked: em ? maskEmail(em) : "",
    pixel_status: pixelStatus,
    fbp_source: typeof cc.fbp_source === "string" ? cc.fbp_source : "",
    ad_block_suspected: cc.ad_block_suspected === true,
  });
}
