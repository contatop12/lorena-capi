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
      --info: #5b9fd4;
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
    header { padding: 2rem 1.5rem 1rem; border-bottom: 1px solid var(--line); position: relative; }
    h1 {
      font-family: "Syne", system-ui, sans-serif;
      font-weight: 700;
      font-size: clamp(1.4rem, 4vw, 2rem);
      margin: 0 0 0.35rem;
      letter-spacing: -0.02em;
    }
    .sub { color: var(--muted); font-size: 0.8rem; max-width: 56rem; line-height: 1.5; }
    main { padding: 1.25rem 1.5rem 3rem; position: relative; }
    .grid2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .stat-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 1.1rem 1.2rem;
      position: relative;
      overflow: hidden;
    }
    .stat-card h2 {
      font-family: "Syne", sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0 0 0.4rem;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .stat-icon { font-size: 1rem; opacity: 0.9; }
    .stat-metric { font-size: 1.75rem; font-weight: 600; color: var(--ok); line-height: 1.1; }
    .stat-metric.mutedn { color: var(--muted); font-size: 0.9rem; font-weight: 400; }
    .stat-desc { font-size: 0.7rem; color: var(--muted); margin: 0.4rem 0; line-height: 1.4; }
    .stat-fine { font-size: 0.65rem; color: var(--muted); line-height: 1.45; opacity: 0.95; }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.35);
      margin-bottom: 1rem;
    }
    .card h3 {
      font-family: "Syne", sans-serif;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted);
      margin: 0;
      padding: 0.75rem 0.9rem;
      background: rgba(0,0,0,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
    th {
      font-family: "Syne", sans-serif;
      font-weight: 600;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      background: rgba(0,0,0,0.2);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,107,44,0.04); }
    .status-ok { color: var(--ok); font-weight: 600; }
    .status-err { color: var(--err); font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .micro {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 3.5rem;
    }
    .microbar {
      height: 5px;
      width: 48px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .microbar > i {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #c2410c);
      border-radius: 3px;
    }
    .microbar.ok > i { background: var(--ok); }
    .evt-pill {
      display: inline-block;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      background: rgba(91, 159, 212, 0.15);
      color: var(--info);
      font-size: 0.68rem;
      font-weight: 600;
    }
    .row-dot { display: inline-flex; align-items: center; gap: 0.35rem; }
    .dot { width: 7px; height: 7px; border-radius: 50%; }
    .dot-ok { background: var(--ok); box-shadow: 0 0 8px rgba(61, 220, 132, 0.45); }
    .dot-err { background: var(--err); }
    .dot-warn { background: #fbbf77; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.75rem;
      align-items: center;
      margin: 0.75rem 0 0.5rem;
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
    .pill.live { border-color: var(--accent); color: var(--accent); animation: pulse 2.4s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
    .tabs { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .tab {
      font-family: inherit;
      font-size: 0.68rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: transparent;
      color: var(--muted);
      cursor: pointer;
    }
    .tab:hover { color: var(--text); border-color: rgba(255,107,44,0.45); }
    .tab.on { background: rgba(255, 107, 44, 0.12); border-color: var(--accent); color: var(--accent); }
    button.primary {
      font-family: inherit;
      background: linear-gradient(135deg, var(--accent), #c2410c);
      border: none; color: #0a0a0b; font-weight: 600; padding: 0.5rem 0.9rem; border-radius: 6px; cursor: pointer; font-size: 0.75rem;
    }
    button.ghost { font-family: inherit; font-size: 0.75rem; cursor: pointer; border: 1px solid var(--line);
      background: var(--panel); color: var(--text); padding: 0.5rem 0.9rem; border-radius: 6px; }
    .banner { margin-bottom: 1rem; padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--line); font-size: 0.75rem; line-height: 1.5; color: var(--muted); }
    .banner.warn { border-color: rgba(255, 180, 60, 0.45); color: #fbbf77; }
    .banner.err { border-color: rgba(255, 77, 109, 0.45); color: #fda4b4; }
    .empty { padding: 2rem; text-align: center; color: var(--muted); font-size: 0.8rem; }
    dialog { border: 1px solid var(--line); background: var(--panel); color: var(--text); border-radius: 10px; padding: 1.25rem; max-width: 22rem; }
    dialog::backdrop { background: rgba(0,0,0,0.65); }
    dialog input {
      width: 100%; margin-top: 0.5rem; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--line);
      background: var(--bg); color: var(--text); font-family: inherit; font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <header>
    <h1>Tráfego CAPI</h1>
    <p class="sub">Resumo de recuperação (CAPI), navegadores e fila de eventos. Dados vêm do Worker; histórico entre invocações exige KV <code>EVENT_LOG</code> no <code>wrangler.toml</code>. E-mail aparece se enviado em <code>custom_data.email</code> (mascarado) ou <code>monitor.email</code>.</p>
  </header>
  <main>
    <div id="banners"></div>

    <div class="grid2">
      <div class="stat-card">
        <h2><span class="stat-icon" aria-hidden="true">⛨</span> Ad blockers &amp; pixel</h2>
        <p class="stat-desc" style="margin-top:0">Quando o pixel não dispara, o CAPI ainda pode registrar a conversão.</p>
        <div id="statAd" class="stat-metric mutedn">—</div>
        <p id="statAdSub" class="stat-fine"></p>
      </div>
      <div class="stat-card">
        <h2><span class="stat-icon" aria-hidden="true">🛡</span> ITP / cookies <code style="font-size:0.6rem">_fbp</code></h2>
        <p class="stat-desc" style="margin-top:0">Origem aproximada do cookie (tracker envia <code>client_context</code>).</p>
        <div id="statItp" class="stat-metric" style="color: var(--ok)">—</div>
        <p id="statItpSub" class="stat-fine"></p>
      </div>
    </div>

    <div class="card">
      <h3>Distribuição por navegador</h3>
      <table>
        <thead>
          <tr>
            <th>Browser</th>
            <th>Eventos</th>
            <th>Ad block sinal</th>
            <th>Cookie tracker</th>
          </tr>
        </thead>
        <tbody id="browserRows"><tr><td colspan="4" class="empty">—</td></tr></tbody>
      </table>
    </div>

    <div class="toolbar" style="margin-top:0.5rem">
      <span class="pill live" id="livePill">ao vivo</span>
      <div class="tabs" id="tabRow"></div>
      <div style="flex:1;min-width:0"></div>
      <button type="button" class="primary" id="btnToken">Definir token</button>
      <button type="button" class="ghost" id="btnRefresh">Atualizar</button>
    </div>

    <div class="card" style="margin-top:0.5rem">
      <h3>Log de eventos</h3>
      <table>
        <thead>
          <tr>
            <th>Horário</th>
            <th>Evento</th>
            <th>Contato</th>
            <th>Meta CAPI</th>
            <th>Pixel (sinal)</th>
            <th>Browser / SO</th>
            <th>Bot</th>
          </tr>
        </thead>
        <tbody id="rows">
          <tr><td colspan="7" class="empty">Carregando…</td></tr>
        </tbody>
      </table>
    </div>
  </main>
  <dialog id="dlg">
    <form method="dialog" id="dlgForm">
      <strong style="font-family:Syne,sans-serif">Token do monitor</strong>
      <p style="font-size:0.75rem;color:var(--muted);margin:0.5rem 0 0">Mesmo valor da variável <code>MONITOR_TOKEN</code> no Worker.</p>
      <input type="password" id="tokInput" autocomplete="off" placeholder="cole o token" />
      <menu style="margin-top:1rem;display:flex;gap:0.5rem;justify-content:flex-end;padding:0">
        <button type="button" class="ghost" id="dlgCancel" value="cancel">Cancelar</button>
        <button type="submit" class="primary" value="default">Salvar</button>
      </menu>
    </form>
  </dialog>
  <script>
(function () {
  var KEY = "meta_capi_monitor_token";
  var rows = document.getElementById("rows");
  var browserRows = document.getElementById("browserRows");
  var tabRow = document.getElementById("tabRow");
  var banners = document.getElementById("banners");
  var statAd = document.getElementById("statAd");
  var statAdSub = document.getElementById("statAdSub");
  var statItp = document.getElementById("statItp");
  var statItpSub = document.getElementById("statItpSub");
  var dlg = document.getElementById("dlg");
  var tokInput = document.getElementById("tokInput");

  var lastItems = [];
  var filterEvent = "all";

  function token() { try { return sessionStorage.getItem(KEY) || ""; } catch (_) { return ""; } }
  function setToken(t) { try { sessionStorage.setItem(KEY, t); } catch (_) {} }

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function realEvents(items) {
    return items.filter(function (e) { return e && e.event_name != null && e.event_name !== ""; });
  }

  function fbpKey(k) {
    if (!k) return "—";
    if (k === "cookie_antes") return "cookie_antes";
    if (k === "tracker_novo") return "tracker_novo";
    return k;
  }

  function renderSummary(items) {
    var ev = realEvents(items);
    var n = ev.length;
    if (!n) {
      statAd.textContent = "0%";
      statAdSub.textContent = "Ainda sem eventos com nome no buffer.";
      statItp.textContent = "0";
      statItpSub.textContent = "Nenhum _fbp categorizado ainda.";
      return;
    }
    var withAd = ev.filter(function (e) { return e.ad_block_suspected === true; });
    if (withAd.length) {
      var ok = withAd.filter(function (e) { return e.ok === true; }).length;
      var pct = Math.round(100 * ok / withAd.length);
      statAd.textContent = pct + "% CAPI ok";
      statAdSub.textContent = "Sinal de bloqueio: " + withAd.length + " evento(s) — " + ok + " entregue(s) à Meta com sucesso. Sem bloqueio detectado nos demais (use client_context.ad_block_suspected no site).";
    } else {
      statAd.textContent = "0%";
      statAdSub.textContent = "Nenhum evento com ad_block_suspected=true. Inclua no envio: MetaTracker.track(\"Lead\", { client_context: { ad_block_suspected: true } }) quando fizer detecção no front.";
    }
    var fbp = {};
    ev.forEach(function (e) {
      var k = fbpKey(e.fbp_source) || "—";
      fbp[k] = (fbp[k] || 0) + 1;
    });
    var line = Object.keys(fbp)
      .sort()
      .map(function (k) { return k + " " + fbp[k]; })
      .join(" · ");
    var trk = fbp.tracker_novo || 0;
    var pctItp = n ? Math.round(100 * trk / n) : 0;
    statItp.textContent = pctItp + "% com cookie criado no tracker";
    statItpSub.textContent = line
      ? line + ". cookie_antes ≈ pixel/outro; tracker_novo = _fbp criado nesta lib."
      : "—";
  }

  function renderBrowserTable(items) {
    var ev = realEvents(items);
    if (!ev.length) {
      browserRows.innerHTML = '<tr><td colspan="4" class="empty">Sem amostra ainda.</td></tr>';
      return;
    }
    var by = {};
    ev.forEach(function (e) {
      var b = e.browser || "Unknown";
      if (!by[b]) by[b] = { n: 0, ad: 0, tr: 0 };
      by[b].n++;
      if (e.ad_block_suspected) by[b].ad++;
      if (e.fbp_source === "tracker_novo") by[b].tr++;
    });
    var keys = Object.keys(by).sort(function (a, c) { return by[c].n - by[a].n; });
    var maxN = 1;
    keys.forEach(function (k) { if (by[k].n > maxN) maxN = by[k].n; });
    browserRows.innerHTML = keys.map(function (b) {
      var o = by[b];
      var pAd = o.n ? o.ad / o.n : 0;
      var pTr = o.n ? o.tr / o.n : 0;
      return (
        "<tr><td><strong>" + esc(b) + "</strong></td><td class=\"mono\">" + o.n + "</td><td><div class=\"micro\"><div class=\"microbar\">" +
        "<i style=\"width:" + Math.round(pAd * 100) + "%\"></i></div><span class=\"mono\">" + o.ad + "</span></div></td><td><div class=\"micro\"><div class=\"microbar ok\">" +
        "<i style=\"width:" + Math.round(pTr * 100) + "%\"></i></div><span class=\"mono\">" + o.tr + "</span></div></td></tr>"
      );
    }).join("");
  }

  function buildTabs(items) {
    var ev = realEvents(items);
    var names = {};
    ev.forEach(function (e) { names[e.event_name] = true; });
    var list = Object.keys(names).sort();
    var html = '<button type="button" class="tab' + (filterEvent === "all" ? " on" : "") + '" data-e="all">Todos</button>';
    list.forEach(function (n) {
      html += '<button type="button" class="tab' + (filterEvent === n ? " on" : "") + '" data-e="' + esc(n) + '">' + esc(n) + "</button>";
    });
    tabRow.innerHTML = html;
    [].forEach.call(tabRow.querySelectorAll(".tab"), function (btn) {
      btn.onclick = function () {
        filterEvent = btn.getAttribute("data-e") || "all";
        buildTabs(lastItems);
        renderDetail();
      };
    });
  }

  function pixelLabel(e) {
    var s = (e && e.pixel_status) || "unknown";
    if (s === "active") return { cls: "status-ok", t: "Ativo" };
    if (s === "blocked" || s === "inactive") return { cls: "status-err", t: s === "blocked" ? "Bloqueio" : "Inativo" };
    return { cls: "", t: "—" };
  }

  function renderDetail() {
    var list = lastItems;
    if (!list.length) {
      rows.innerHTML = '<tr><td colspan="7" class="empty">Nada no buffer.</td></tr>';
      return;
    }
    var base = filterEvent === "all" ? list : list.filter(function (e) { return e.event_name === filterEvent; });
    if (!base.length) {
      rows.innerHTML = '<tr><td colspan="7" class="empty">Nada neste filtro.</td></tr>';
      return;
    }
    rows.innerHTML = base
      .map(function (e) {
        var dt = new Date(e.ts || Date.now());
        var time = dt.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" });
        var en = e.event_name;
        var okM = e.ok === true;
        var px = pixelLabel(e);
        var b = e.bot === true;
        return (
          "<tr>" +
          '<td class="mono">' + esc(time) + "</td>" +
          "<td>" +
          (en
            ? '<span class="evt-pill">' + esc(en) + "</span>"
            : "<span class=\"status-err\">" + esc(e.error || "—") + "</span>") +
          "</td>" +
          "<td>" +
          esc(e.email_masked || "—") +
          (e.phone_masked ? "<br><small style=\"color:var(--muted)\">" + esc(e.phone_masked) + "</small>" : "") +
          (e.lead_name ? "<br><small style=\"color:var(--muted)\">" + esc(e.lead_name) + "</small>" : "") +
          "</td>" +
          '<td><span class="row-dot"><span class="dot ' + (okM ? "dot-ok" : "dot-err") + '"></span>' + (okM ? "OK" : esc(e.error || "Falha")) + "</span></td>" +
          '<td><span class="' + esc(px.cls) + '">' + esc(px.t) + "</span></td>" +
          "<td>" + esc(e.browser_os || (e.browser && e.os ? e.browser + " / " + e.os : "—")) + "</td>" +
          "<td>" + (b ? "Sim" : "Não") + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderBanners(data, err) {
    banners.innerHTML = "";
    if (err) { var d = document.createElement("div"); d.className = "banner err"; d.textContent = err; banners.appendChild(d); return; }
    if (data && !data.kv_configured) {
      var w = document.createElement("div");
      w.className = "banner warn";
      w.innerHTML = "KV <strong>EVENT_LOG</strong> não ligado — agregados dependem de histórico curto. Configure no <code>wrangler.toml</code>.";
      banners.appendChild(w);
    }
    if (data) {
      var m = (window.__META_MONITOR__ && window.__META_MONITOR__.worker_env) || "";
      if (m) { var p = document.createElement("div"); p.className = "banner"; p.textContent = "Worker env: " + m; banners.appendChild(p); }
    }
  }

  function clearDash(msg) {
    var m = msg || "—";
    statAd.textContent = m; statItp.textContent = m;
    statAdSub.textContent = ""; statItpSub.textContent = "";
    browserRows.innerHTML = '<tr><td colspan="4" class="empty">' + esc(msg || "—") + "</td></tr>";
    tabRow.innerHTML = "";
  }

  async function load() {
    try {
      var hr = await fetch("/health");
      var hj = await hr.json();
      window.__META_MONITOR__ = { worker_env: hj.worker_env || "" };
    } catch (_) { window.__META_MONITOR__ = { worker_env: "" }; }
    var h = { Accept: "application/json" };
    var t = token();
    if (t) h["Authorization"] = "Bearer " + t;
    try {
      var res = await fetch("/api/monitor/events", { headers: h, credentials: "same-origin" });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 401) {
        lastItems = [];
        rows.innerHTML = '<tr><td colspan="7" class="empty">Não autorizado — defina o token.</td></tr>';
        clearDash("—");
        renderBanners(null, "401: configure MONITOR_TOKEN no Worker.");
        return;
      }
      if (!res.ok) {
        lastItems = [];
        rows.innerHTML = '<tr><td colspan="7" class="empty">HTTP ' + res.status + "</td></tr>";
        clearDash("—");
        renderBanners(null, data.error || "Erro ao carregar");
        return;
      }
      renderBanners(data, null);
      lastItems = data.items || [];
      renderSummary(lastItems);
      renderBrowserTable(lastItems);
      buildTabs(lastItems);
      renderDetail();
    } catch (x) {
      lastItems = [];
      rows.innerHTML = '<tr><td colspan="7" class="empty">Falha de rede</td></tr>';
      clearDash("—");
      renderBanners(null, String(x && x.message ? x.message : x));
    }
  }

  document.getElementById("btnToken").onclick = function () { tokInput.value = token(); dlg.showModal(); };
  document.getElementById("dlgCancel").onclick = function () { dlg.close(); };
  document.getElementById("dlgForm").onsubmit = function () { setToken(tokInput.value.trim()); dlg.close(); load(); };
  document.getElementById("btnRefresh").onclick = function () { load(); };
  setInterval(load, 5000);
  load();
})();
  </script>
</body>
</html>`;
