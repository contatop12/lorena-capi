/** HTML do painel — servido em GET /dashboard (mesmo host do Worker). */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Meta CAPI — monitor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #060607;
      --panel: #0e0e11;
      --line: rgba(255, 107, 44, 0.22);
      --accent: #ff6b2c;
      --text: #e8e6e3;
      --muted: #7a778c;
      --ok: #3ddc84;
      --err: #ff4d6d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      background: var(--bg);
      color: var(--text);
      background-image:
        radial-gradient(ellipse 120% 80% at 20% -20%, rgba(255,107,44,0.12), transparent 50%),
        radial-gradient(ellipse 80% 60% at 100% 10%, rgba(120,80,255,0.08), transparent 45%);
    }
    body::after {
      content: "";
      pointer-events: none;
      position: fixed;
      inset: 0;
      opacity: 0.04;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }
    header {
      padding: 2rem 1.5rem 1rem;
      border-bottom: 1px solid var(--line);
      position: relative;
    }
    h1 {
      font-family: "Syne", system-ui, sans-serif;
      font-weight: 700;
      font-size: clamp(1.4rem, 4vw, 2rem);
      margin: 0 0 0.35rem;
      letter-spacing: -0.02em;
    }
    .sub {
      color: var(--muted);
      font-size: 0.8rem;
      max-width: 52rem;
      line-height: 1.5;
    }
    main { padding: 1.25rem 1.5rem 3rem; position: relative; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .pill {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      padding: 0.35rem 0.65rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
    }
    .pill.live {
      border-color: var(--accent);
      color: var(--accent);
      animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
    button {
      font-family: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      border: 1px solid var(--line);
      background: var(--panel);
      color: var(--text);
      padding: 0.5rem 0.9rem;
      border-radius: 6px;
      transition: border-color 0.2s, transform 0.15s;
    }
    button:hover { border-color: var(--accent); transform: translateY(-1px); }
    button.primary {
      background: linear-gradient(135deg, var(--accent), #c2410c);
      border: none;
      color: #0a0a0b;
      font-weight: 600;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.35);
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    th, td { padding: 0.65rem 0.85rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
    th {
      font-family: "Syne", sans-serif;
      font-weight: 600;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      background: rgba(0,0,0,0.25);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,107,44,0.04); }
    .status-ok { color: var(--ok); font-weight: 600; }
    .status-err { color: var(--err); font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .banner {
      margin-bottom: 1rem;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--line);
      font-size: 0.75rem;
      line-height: 1.5;
      color: var(--muted);
    }
    .banner.warn { border-color: rgba(255, 180, 60, 0.45); color: #fbbf77; }
    .banner.err { border-color: rgba(255, 77, 109, 0.45); color: #fda4b4; }
    .empty { padding: 2rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
    dialog { border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 10px; padding: 1.25rem; max-width: 22rem; }
    dialog::backdrop { background: rgba(0,0,0,0.65); }
    dialog input {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.5rem;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: var(--bg);
      color: var(--text);
      font-family: inherit;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>Tráfego CAPI</h1>
    <p class="sub">Painel interno para acompanhar envios ao Meta (PageView, Lead, etc.). Os dados vêm do Worker; o histórico persistente exige KV <code>EVENT_LOG</code> no Wrangler.</p>
  </header>
  <main>
    <div id="banners"></div>
    <div class="toolbar">
      <span class="pill live" id="livePill">ao vivo</span>
      <button type="button" class="primary" id="btnToken">Definir token de acesso</button>
      <button type="button" id="btnRefresh">Atualizar agora</button>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th>Evento</th>
            <th>event_id</th>
            <th>Status</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody id="rows">
          <tr><td colspan="5" class="empty">Carregando…</td></tr>
        </tbody>
      </table>
    </div>
  </main>
  <dialog id="dlg">
    <form method="dialog" id="dlgForm">
      <strong style="font-family:Syne,sans-serif">Token do monitor</strong>
      <p style="font-size:0.75rem;color:var(--muted);margin:0.5rem 0 0">Mesmo valor da variável <code>MONITOR_TOKEN</code> no Worker (secret recomendado).</p>
      <input type="password" id="tokInput" autocomplete="off" placeholder="cole o token" />
      <menu style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;padding:0">
        <button type="button" id="dlgCancel" value="cancel">Cancelar</button>
        <button type="submit" class="primary" value="default">Salvar</button>
      </menu>
    </form>
  </dialog>
  <script>
(function () {
  var KEY = "meta_capi_monitor_token";
  var rows = document.getElementById("rows");
  var banners = document.getElementById("banners");
  var dlg = document.getElementById("dlg");
  var tokInput = document.getElementById("tokInput");

  function token() {
    try { return sessionStorage.getItem(KEY) || ""; } catch (_) { return ""; }
  }
  function setToken(t) {
    try { sessionStorage.setItem(KEY, t); } catch (_) {}
  }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderBanners(data, err) {
    banners.innerHTML = "";
    if (err) {
      var d = document.createElement("div");
      d.className = "banner err";
      d.textContent = err;
      banners.appendChild(d);
      return;
    }
    if (!data.kv_configured) {
      var w = document.createElement("div");
      w.className = "banner warn";
      w.innerHTML = "KV <strong>EVENT_LOG</strong> não configurado — o painel só mostra avisos de API; sem fila persistida entre invocações. Veja <code>wrangler.toml</code> e a diretiva <code>directives/monitor_painel.md</code>.";
      banners.appendChild(w);
    }
    var m = (window.__META_MONITOR__ && window.__META_MONITOR__.worker_env) || "";
    if (m) {
      var p = document.createElement("div");
      p.className = "banner";
      p.textContent = "Worker env: " + m;
      banners.appendChild(p);
    }
  }

  async function load() {
    try {
      var hr = await fetch("/health");
      var hj = await hr.json();
      window.__META_MONITOR__ = { worker_env: hj.worker_env || "" };
    } catch (_) {
      window.__META_MONITOR__ = { worker_env: "" };
    }
    var h = { Accept: "application/json" };
    var t = token();
    if (t) h["Authorization"] = "Bearer " + t;
    try {
      var res = await fetch("/api/monitor/events", { headers: h, credentials: "same-origin" });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 401) {
        rows.innerHTML = '<tr><td colspan="5" class="empty">Não autorizado — defina o token (botão acima).</td></tr>';
        renderBanners(null, "401: configure MONITOR_TOKEN no Worker e informe-o aqui.");
        return;
      }
      if (!res.ok) {
        rows.innerHTML = '<tr><td colspan="5" class="empty">Erro HTTP ' + res.status + "</td></tr>";
        renderBanners(null, data.error || "Erro ao carregar");
        return;
      }
      renderBanners(data, null);
      var items = data.items || [];
      if (!items.length) {
        rows.innerHTML = '<tr><td colspan="5" class="empty">Nenhum evento registrado ainda. Navegue no site com o tracker ou aguarde novos POST /event.</td></tr>';
        return;
      }
      rows.innerHTML = items.map(function (e) {
        var dt = new Date(e.ts || Date.now());
        var time = dt.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" });
        var ok = e.ok === true;
        return (
          "<tr>" +
          '<td class="mono">' + esc(time) + "</td>" +
          "<td>" + esc(e.event_name || "—") + "</td>" +
          '<td class="mono" style="max-width:12rem;overflow:hidden;text-overflow:ellipsis">' +
          esc(e.event_id || "—") +
          "</td>" +
          '<td class="' + (ok ? "status-ok" : "status-err") + '">' + (ok ? "OK" : "Falha") + "</td>" +
          '<td style="max-width:18rem;overflow:hidden;text-overflow:ellipsis">' +
          esc(e.detail || e.error || "—") +
          "</td>" +
          "</tr>"
        );
      }).join("");
    } catch (x) {
      rows.innerHTML = '<tr><td colspan="5" class="empty">Falha de rede</td></tr>';
      renderBanners(null, String(x && x.message ? x.message : x));
    }
  }

  document.getElementById("btnToken").onclick = function () {
    tokInput.value = token();
    dlg.showModal();
  };
  document.getElementById("dlgCancel").onclick = function () { dlg.close(); };
  document.getElementById("dlgForm").onsubmit = function () {
    setToken(tokInput.value.trim());
    dlg.close();
    load();
  };
  document.getElementById("btnRefresh").onclick = function () { load(); };
  setInterval(load, 3500);
  load();
})();
  </script>
</body>
</html>`;
