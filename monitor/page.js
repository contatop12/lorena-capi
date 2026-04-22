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
      --panel: #0f1013;
      --line: rgba(255, 107, 44, 0.26);
      --accent: #ff6b2c;
      --text: #e8e6e3;
      --muted: #7a778c;
      --ok: #3ddc84;
      --err: #ff4d6d;
      --warn: #fbbf77;
      --chip: rgba(91, 159, 212, 0.14);
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
    header { padding: 1.7rem 1.5rem 0.9rem; border-bottom: 1px solid var(--line); }
    h1 {
      margin: 0 0 0.35rem;
      font-family: "Syne", sans-serif;
      letter-spacing: -0.02em;
      font-size: clamp(1.35rem, 3vw, 2rem);
    }
    .sub { margin: 0; max-width: 70rem; color: var(--muted); font-size: 0.78rem; line-height: 1.5; }
    main { padding: 1rem 1.5rem 2rem; }
    .banner {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 0.7rem 0.85rem;
      color: var(--muted);
      margin-bottom: 0.65rem;
      font-size: 0.74rem;
    }
    .banner.warn { border-color: rgba(255, 180, 60, 0.45); color: var(--warn); }
    .banner.err { border-color: rgba(255, 77, 109, 0.45); color: #fca3b8; }
    .kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.7rem;
      margin: 0.9rem 0 1rem;
    }
    .kpi {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      padding: 0.85rem 0.95rem;
    }
    .kpi .lbl { font-size: 0.67rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.09em; }
    .kpi .val { font-size: 1.25rem; margin-top: 0.35rem; font-weight: 600; }
    .toolbar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 0.8rem;
    }
    .live {
      border: 1px solid var(--accent);
      color: var(--accent);
      border-radius: 999px;
      padding: 0.24rem 0.58rem;
      font-size: 0.68rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    button, select {
      font-family: inherit;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel);
      color: var(--text);
      padding: 0.45rem 0.68rem;
      font-size: 0.73rem;
    }
    button.primary {
      border: none;
      background: linear-gradient(135deg, var(--accent), #c2410c);
      color: #0a0a0b;
      font-weight: 600;
      cursor: pointer;
    }
    .spacer { flex: 1; min-width: 0; }
    .card {
      border: 1px solid var(--line);
      border-radius: 11px;
      background: var(--panel);
      margin-bottom: 0.85rem;
      overflow: hidden;
    }
    .card h3 {
      margin: 0;
      padding: 0.62rem 0.8rem;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.68rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-family: "Syne", sans-serif;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.71rem; }
    th, td { text-align: left; padding: 0.55rem 0.7rem; border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
    th { color: var(--muted); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.07em; }
    tr:last-child td { border-bottom: none; }
    .chip {
      display: inline-block;
      background: var(--chip);
      color: #88c0ff;
      border-radius: 4px;
      padding: 0.18rem 0.42rem;
      font-size: 0.66rem;
      font-weight: 600;
    }
    .ok { color: var(--ok); font-weight: 600; }
    .err { color: var(--err); font-weight: 600; }
    .warn { color: var(--warn); font-weight: 600; }
    .mono { font-variant-numeric: tabular-nums; }
    .muted { color: var(--muted); }
    .empty { color: var(--muted); padding: 1.3rem; text-align: center; }
    dialog { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--text); }
    dialog::backdrop { background: rgba(0,0,0,0.65); }
    dialog input { width: 100%; margin-top: 0.5rem; border: 1px solid var(--line); border-radius: 6px; background: #090a0d; color: var(--text); padding: 0.5rem; }
  </style>
</head>
<body>
  <header>
    <h1>Tráfego CAPI Framework</h1>
    <p class="sub">Visão operacional de eventos CAPI, leads via webhook e correlação por <code>event_id</code>. Use filtros para investigar queda de entrega e validar se o lead entrou no fluxo server-side.</p>
  </header>
  <main>
    <div id="banners"></div>
    <section class="kpis">
      <article class="kpi"><div class="lbl">CAPI total</div><div class="val" id="kpiEventTotal">0</div></article>
      <article class="kpi"><div class="lbl">CAPI sucesso</div><div class="val" id="kpiEventOk">0%</div></article>
      <article class="kpi"><div class="lbl">Leads webhook</div><div class="val" id="kpiLeadTotal">0</div></article>
      <article class="kpi"><div class="lbl">Correlação confirmada</div><div class="val" id="kpiCorr">0</div></article>
    </section>

    <div class="toolbar">
      <span class="live">ao vivo</span>
      <select id="fEvent"><option value="all">Evento: todos</option></select>
      <select id="fStatus">
        <option value="all">Status: todos</option>
        <option value="ok">Status: ok</option>
        <option value="error">Status: erro</option>
      </select>
      <div class="spacer"></div>
      <button id="btnRefresh">Atualizar</button>
      <button class="primary" id="btnAuto">Auto: ON</button>
    </div>

    <section class="card">
      <h3>Correlação lead -> CAPI</h3>
      <table>
        <thead>
          <tr>
            <th>event_id</th>
            <th>Lead</th>
            <th>Status</th>
            <th>CAPI</th>
            <th>Horários</th>
          </tr>
        </thead>
        <tbody id="corRows"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody>
      </table>
    </section>

    <section class="card">
      <h3>Leads recebidos (webhook)</h3>
      <table>
        <thead>
          <tr>
            <th>Horário</th>
            <th>Nome/Contato</th>
            <th>Origem</th>
            <th>event_id</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody id="leadRows"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody>
      </table>
    </section>

    <section class="card">
      <h3>Eventos CAPI</h3>
      <table>
        <thead>
          <tr>
            <th>Horário</th>
            <th>Evento</th>
            <th>Status</th>
            <th>event_id</th>
            <th>Contato</th>
            <th>Browser</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody id="eventRows"><tr><td colspan="7" class="empty">Carregando...</td></tr></tbody>
      </table>
    </section>
  </main>

  <script>
(function () {
  var banners = document.getElementById("banners");
  var eventRows = document.getElementById("eventRows");
  var leadRows = document.getElementById("leadRows");
  var corRows = document.getElementById("corRows");
  var fEvent = document.getElementById("fEvent");
  var fStatus = document.getElementById("fStatus");
  var btnAuto = document.getElementById("btnAuto");
  var state = { events: [], leads: [], correlations: [], metrics: {} };
  var autoTimer = null;
  var autoEnabled = true;
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtTs(ts) {
    var n = Number(ts || Date.now());
    var d = new Date(n);
    return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" });
  }
  function statusCls(ok) { return ok === true ? "ok" : ok === false ? "err" : "warn"; }
  function statusTxt(ok) { return ok === true ? "OK" : ok === false ? "Erro" : "Pendente"; }

  function renderBanners(data, err) {
    banners.innerHTML = "";
    if (err) {
      var e = document.createElement("div");
      e.className = "banner err";
      e.textContent = err;
      banners.appendChild(e);
      return;
    }
    if (data && !data.kv_configured) {
      var w = document.createElement("div");
      w.className = "banner warn";
      w.innerHTML = "KV <strong>EVENT_LOG</strong> não configurado. Operando em modo reduzido por instância.";
      banners.appendChild(w);
    }
  }

  function renderMetrics(m) {
    document.getElementById("kpiEventTotal").textContent = String(m.event_total || 0);
    document.getElementById("kpiEventOk").textContent = String(m.capi_success_rate || 0) + "%";
    document.getElementById("kpiLeadTotal").textContent = String(m.lead_total || 0);
    document.getElementById("kpiCorr").textContent = String(m.correlation_confirmed || 0) + " / " + String(m.lead_total || 0);
  }

  function refreshEventFilter(events) {
    var current = fEvent.value || "all";
    var names = {};
    events.forEach(function (e) { if (e.event_name) names[e.event_name] = true; });
    var opts = ['<option value="all">Evento: todos</option>'];
    Object.keys(names).sort().forEach(function (n) {
      opts.push('<option value="' + esc(n) + '">' + esc(n) + "</option>");
    });
    fEvent.innerHTML = opts.join("");
    fEvent.value = names[current] ? current : "all";
  }

  function filteredEvents() {
    var ev = state.events || [];
    var eName = fEvent.value || "all";
    var st = fStatus.value || "all";
    return ev.filter(function (e) {
      if (eName !== "all" && e.event_name !== eName) return false;
      if (st === "ok" && e.ok !== true) return false;
      if (st === "error" && e.ok !== false) return false;
      return true;
    });
  }

  function renderEvents() {
    var ev = filteredEvents();
    if (!ev.length) {
      eventRows.innerHTML = '<tr><td colspan="7" class="empty">Sem eventos para os filtros atuais.</td></tr>';
      return;
    }
    eventRows.innerHTML = ev.map(function (e) {
      var contact = esc(e.email_masked || "—");
      if (e.phone_masked) contact += '<br><small class="muted">' + esc(e.phone_masked) + "</small>";
      if (e.lead_name) contact += '<br><small class="muted">' + esc(e.lead_name) + "</small>";
      return (
        "<tr>" +
        '<td class="mono">' + esc(fmtTs(e.ts)) + "</td>" +
        "<td>" + (e.event_name ? '<span class="chip">' + esc(e.event_name) + "</span>" : esc(e.error || "—")) + "</td>" +
        '<td class="' + statusCls(e.ok) + '">' + statusTxt(e.ok) + "</td>" +
        '<td class="mono">' + esc(e.event_id || "—") + "</td>" +
        "<td>" + contact + "</td>" +
        "<td>" + esc(e.browser_os || "—") + "</td>" +
        "<td>" + esc(e.detail || e.error || "—") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderLeads() {
    var leads = state.leads || [];
    if (!leads.length) {
      leadRows.innerHTML = '<tr><td colspan="5" class="empty">Sem leads via webhook ainda.</td></tr>';
      return;
    }
    leadRows.innerHTML = leads.map(function (l) {
      var c = esc(l.lead_email || l.email_masked || "—");
      if (l.phone_masked) c += '<br><small class="muted">' + esc(l.phone_masked) + "</small>";
      if (l.lead_name) c += '<br><small class="muted">' + esc(l.lead_name) + "</small>";
      return (
        "<tr>" +
        '<td class="mono">' + esc(fmtTs(l.ts)) + "</td>" +
        "<td>" + c + "</td>" +
        "<td>" + esc(l.lead_source || "webhook") + "</td>" +
        '<td class="mono">' + esc(l.event_id || "—") + "</td>" +
        "<td>" + esc(l.page_url || l.detail || "—") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderCorrelations() {
    var rows = state.correlations || [];
    if (!rows.length) {
      corRows.innerHTML = '<tr><td colspan="5" class="empty">Sem correlação disponível ainda.</td></tr>';
      return;
    }
    corRows.innerHTML = rows.map(function (c) {
      var sCls = c.status === "deduplicated" ? "ok" : c.status === "failed" ? "err" : "warn";
      var sTxt =
        c.status === "deduplicated"
          ? "Desduplicado"
          : c.status === "validated_capi"
            ? "CAPI validado"
            : c.status === "failed"
              ? "Falhou"
              : "Pendente";
      return (
        "<tr>" +
        '<td class="mono">' + esc(c.event_id || "—") + "</td>" +
        "<td>" +
        esc(c.lead_name || "—") +
        ((c.lead_email || c.email_masked) ? '<br><small class="muted">' + esc(c.lead_email || c.email_masked) + "</small>" : "") +
        "</td>" +
        '<td class="' + sCls + '">' + sTxt + "</td>" +
        "<td>" + esc(c.event_name || "Lead") + (c.capi_error ? '<br><small class="err">' + esc(c.capi_error) + "</small>" : "") + "</td>" +
        "<td class='mono'>" + esc(fmtTs(c.lead_ts)) + (c.capi_ts ? "<br>" + esc(fmtTs(c.capi_ts)) : "") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function paint(data) {
    state.events = Array.isArray(data.events) ? data.events : [];
    state.leads = Array.isArray(data.leads) ? data.leads : [];
    state.correlations = Array.isArray(data.correlations) ? data.correlations : [];
    state.metrics = data.metrics || {};
    renderMetrics(state.metrics);
    refreshEventFilter(state.events);
    renderEvents();
    renderLeads();
    renderCorrelations();
  }

  async function load() {
    var h = { Accept: "application/json" };
    try {
      var res = await fetch("/api/monitor/events", { headers: h, credentials: "same-origin" });
      var data = await res.json().catch(function () { return {}; });
      if (res.status === 401) {
        renderBanners(null, "Não autorizado (401). Verifique MONITOR_TOKEN no Worker e recarregue a página.");
        return;
      }
      if (!res.ok) {
        renderBanners(null, data.error || ("Erro HTTP " + res.status));
        return;
      }
      renderBanners(data, null);
      paint(data);
    } catch (e) {
      renderBanners(null, String(e && e.message ? e.message : e));
    }
  }

  fEvent.onchange = renderEvents;
  fStatus.onchange = renderEvents;
  document.getElementById("btnRefresh").onclick = load;
  btnAuto.onclick = function () {
    autoEnabled = !autoEnabled;
    btnAuto.textContent = "Auto: " + (autoEnabled ? "ON" : "OFF");
    if (autoEnabled) {
      if (!autoTimer) autoTimer = setInterval(load, 5000);
      load();
    } else if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  };
  autoTimer = setInterval(load, 5000);
  load();
})();
  </script>
</body>
</html>`;
