/**
 * Acesso ao painel / API de monitoramento.
 * Defina MONITOR_TOKEN (secret ou var) em produção.
 */

/**
 * @param {Record<string, string | undefined>} env
 */
function isDevelopment(env) {
  const m = (env.WORKER_ENV || "").toLowerCase();
  return m === "development" || m === "dev";
}

/**
 * Comparação em tempo ~constante para strings curtas.
 * @param {string} a
 * @param {string} b
 */
function secureCompare(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export function monitorTokenOk(request, env) {
  const tok = (env.MONITOR_TOKEN || "").trim();
  if (!tok) return isDevelopment(env);
  const auth = request.headers.get("Authorization") || "";
  let bearer = "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) bearer = m[1].trim();
  const header = request.headers.get("X-Monitor-Token") || "";
  const q = new URL(request.url).searchParams.get("token") || "";
  return (
    secureCompare(tok, bearer) || secureCompare(tok, header) || secureCompare(tok, q)
  );
}
