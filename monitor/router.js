import { monitorTokenOk } from "./auth.js";
import { listMonitorEvents } from "./store.js";
import { DASHBOARD_HTML } from "./page.js";

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {(req: Request, env: Record<string, string | undefined>, status: number, body: object) => Response} jsonResponse
 * @returns {Promise<Response | null>}
 */
export async function handleMonitorRequest(request, env, jsonResponse) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "GET" && path === "/dashboard") {
    return new Response(DASHBOARD_HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  if (request.method === "GET" && path === "/api/monitor/events") {
    if (!monitorTokenOk(request, env)) {
      return jsonResponse(request, env, 401, { ok: false, error: "unauthorized_monitor" });
    }
    const data = await listMonitorEvents(env.EVENT_LOG);
    return jsonResponse(request, env, 200, data);
  }

  return null;
}
