import { monitorTokenOk } from "./auth.js";
import { listMonitorEvents } from "./store.js";
import { DASHBOARD_HTML } from "./page.js";

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {(req: Request, env: Record<string, string | undefined>, status: number, body: object) => Response} jsonResponse
 * @returns {Promise<Response | null>}
 */
export async function handleMonitorRequest(request, env, ctx, jsonResponse) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "GET" && path === "/dashboard") {
    const tok = (env.MONITOR_TOKEN || "").trim();
    const cookie = tok
      ? "meta_monitor_token=" +
        encodeURIComponent(tok) +
        "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800"
      : "meta_monitor_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
    const clientName = (env.CLIENT_NAME || "CAPI Monitor").trim();
    const html = DASHBOARD_HTML.replace(/\{\{CLIENT_NAME\}\}/g, clientName);
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Set-Cookie": cookie,
      },
    });
  }

  if (request.method === "GET" && path === "/api/monitor/stream") {
    if (!monitorTokenOk(request, env)) {
      return jsonResponse(request, env, 401, { ok: false, error: "unauthorized_monitor" });
    }
    var transform = new TransformStream();
    var writer = transform.writable.getWriter();
    var encoder = new TextEncoder();

    function sseWrite(payload) {
      return writer.write(encoder.encode("data: " + payload + "\n\n"));
    }

    async function pump() {
      var lastPayload = "";
      var deadline = Date.now() + 25000;
      try {
        while (Date.now() < deadline) {
          var data = await listMonitorEvents(env.EVENT_LOG);
          var payload = JSON.stringify(data);
          if (payload !== lastPayload) {
            lastPayload = payload;
            await sseWrite(payload);
          }
          await new Promise(function (resolve) { setTimeout(resolve, 2000); });
        }
        await writer.write(encoder.encode("event: reconnect\ndata: {}\n\n"));
      } catch (_) {
        // cliente desconectou
      } finally {
        await writer.close().catch(function () {});
      }
    }

    pump();

    return new Response(transform.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
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
