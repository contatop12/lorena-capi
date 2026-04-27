/** HTML do painel — servido em GET /dashboard (mesmo host do Worker). */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{CLIENT_NAME}} — monitor</title>
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
    main { padding: 1rem 1.5rem 5rem; }
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
    .status-cell { white-space: nowrap; }
    .semaphore {
      display: inline-flex;
      align-items: center;
      gap: 0.38rem;
    }
    .dot {
      width: 0.54rem;
      height: 0.54rem;
      border-radius: 999px;
      display: inline-block;
      box-shadow: 0 0 0 2px rgba(255,255,255,0.04);
    }
    .dot.ok { background: var(--ok); }
    .dot.err { background: var(--err); }
    .dot.warn { background: var(--warn); }
    .row-ok td:first-child { border-left: 2px solid rgba(61, 220, 132, 0.8); }
    .row-err td:first-child { border-left: 2px solid rgba(255, 77, 109, 0.8); }
    .row-warn td:first-child { border-left: 2px solid rgba(251, 191, 119, 0.8); }
    button.detail-btn {
      padding: 0.32rem 0.5rem;
      font-size: 0.66rem;
      line-height: 1;
      cursor: pointer;
    }
    button.detail-btn[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .mono { font-variant-numeric: tabular-nums; }
    .muted { color: var(--muted); }
    .empty { color: var(--muted); padding: 1.3rem; text-align: center; }
    dialog { border: 1px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--text); }
    dialog::backdrop { background: rgba(0,0,0,0.65); }
    dialog input { width: 100%; margin-top: 0.5rem; border: 1px solid var(--line); border-radius: 6px; background: #090a0d; color: var(--text); padding: 0.5rem; }
    .detail-wrap {
      width: min(96vw, 980px);
      max-height: 85vh;
      overflow: auto;
      padding: 0.9rem;
    }
    .detail-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8rem;
      margin-bottom: 0.6rem;
    }
    .detail-title {
      margin: 0;
      font-size: 0.86rem;
      letter-spacing: 0.03em;
    }
    .detail-meta {
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      padding: 0.62rem 0.7rem;
      background: rgba(255,255,255,0.01);
      margin-bottom: 0.62rem;
      font-size: 0.7rem;
      line-height: 1.5;
    }
    .timeline-note {
      margin: 0 0 0.44rem;
      color: var(--muted);
      font-size: 0.67rem;
    }
    .week-chart {
      padding: 0.72rem;
    }
    .week-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      font-size: 0.64rem;
      color: var(--muted);
      margin-bottom: 0.55rem;
    }
    .week-legend .dot {
      width: 0.46rem;
      height: 0.46rem;
      margin-right: 0.3rem;
      box-shadow: none;
    }
    .week-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(68px, 1fr));
      gap: 0.4rem;
      align-items: end;
      min-height: 120px;
    }
    .week-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.34rem;
    }
    .week-bars {
      width: 100%;
      height: 84px;
      display: flex;
      align-items: end;
      justify-content: center;
      gap: 0.12rem;
    }
    .week-bar {
      width: 0.54rem;
      min-height: 0;
      border-radius: 3px 3px 0 0;
      opacity: 0.95;
    }
    .week-bar.ok { background: var(--ok); }
    .week-bar.err { background: var(--err); }
    .week-bar.warn { background: var(--warn); }
    .week-day {
      font-size: 0.6rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .week-total {
      font-size: 0.58rem;
      color: #9ca3af;
    }
    .dock {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.15rem;
      background: rgba(15, 16, 19, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.4rem 0.75rem;
      z-index: 100;
      font-size: 0.72rem;
      white-space: nowrap;
    }
    .dock-item {
      display: inline-flex;
      align-items: center;
      gap: 0;
      padding: 0.28rem 0.5rem;
      border-radius: 999px;
      color: var(--muted);
      text-decoration: none;
      overflow: hidden;
      max-width: 1.8rem;
      transition: max-width 0.22s ease, color 0.15s, background 0.15s;
    }
    .dock-item:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
      max-width: 10rem;
    }
    .dock-label {
      overflow: hidden;
      max-width: 0;
      transition: max-width 0.22s ease, margin-left 0.22s ease;
      margin-left: 0;
    }
    .dock-item:hover .dock-label {
      max-width: 8rem;
      margin-left: 0.35rem;
    }
    .dock-sep {
      width: 1px;
      height: 0.9rem;
      background: var(--line);
      margin: 0 0.25rem;
      flex-shrink: 0;
    }
    .dock-icon { flex-shrink: 0; }
    @keyframes kpi-update {
      from { opacity: 0.45; transform: translateY(4px); }
      to   { opacity: 1;    transform: translateY(0); }
    }
    .kpi .val.updated { animation: kpi-update 0.35s ease; }
    .kpi.kpi-danger  .val { color: var(--err); }
    .kpi.kpi-success .val { color: var(--ok); }
    .kpi.kpi-warn    .val { color: var(--warn); }
  </style>
</head>
<body>
  <header>
    <h1>{{CLIENT_NAME}}</h1>
    <p class="sub">Visão operacional de eventos CAPI, leads via webhook e correlação por <code>event_id</code>. Use filtros para investigar queda de entrega e validar se o lead entrou no fluxo server-side.</p>
  </header>
  <main>
    <div id="banners"></div>
    <section class="kpis">
      <article class="kpi"><div class="lbl">CAPI em validação</div><div class="val" id="kpiEventPending">0</div></article>
      <article class="kpi" id="kpiOkCard"><div class="lbl">CAPI sucesso</div><div class="val" id="kpiEventOk">0</div></article>
      <article class="kpi" id="kpiRateCard"><div class="lbl">Taxa de sucesso</div><div class="val" id="kpiRate">0%</div></article>
      <article class="kpi"><div class="lbl">Leads webhook</div><div class="val" id="kpiLeadTotal">0</div></article>
      <article class="kpi"><div class="lbl">Desduplicados</div><div class="val" id="kpiCorr">0</div></article>
      <article class="kpi" id="kpiErrCard"><div class="lbl">Falhas</div><div class="val" id="kpiErr">0</div></article>
    </section>

    <section class="card">
      <h3>Comparativo semanal (7 dias)</h3>
      <div id="weekChart" class="week-chart"><div class="empty">Carregando comparativo semanal...</div></div>
    </section>

    <div class="toolbar">
      <span class="live">ao vivo</span>
      <select id="fEvent"><option value="all">Evento: todos</option></select>
      <select id="fStatus">
        <option value="all">Status: todos</option>
        <option value="pending">Status: em validação</option>
        <option value="deduplicated">Status: desduplicado</option>
        <option value="validated_capi">Status: CAPI validado</option>
        <option value="failed">Status: falhou</option>
      </select>
      <div class="spacer"></div>
      <button id="btnRefresh">Atualizar</button>
      <button class="primary" id="btnAuto">Auto: ON</button>
    </div>

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
            <th>Ações</th>
          </tr>
        </thead>
        <tbody id="eventRows"><tr><td colspan="8" class="empty">Carregando...</td></tr></tbody>
      </table>
    </section>
  </main>

  <dialog id="eventDetailDialog">
    <div class="detail-wrap">
      <div class="detail-head">
        <h3 class="detail-title" id="eventDetailTitle">Detalhes do evento</h3>
        <button id="eventDetailClose">Fechar</button>
      </div>
      <div class="detail-meta" id="eventDetailMeta">Selecione um evento para visualizar.</div>
      <p class="timeline-note">Timeline completa de monitoramento para o mesmo <code>event_id</code>.</p>
      <div id="eventDetailTimeline"></div>
    </div>
  </dialog>

  <nav class="dock" aria-label="Navegação">
    <span class="dock-item">
      <span class="dock-icon">⬡</span>
      <span class="dock-label">{{CLIENT_NAME}}</span>
    </span>
    <span class="dock-sep" role="separator"></span>
    <a class="dock-item" href="https://capi.p12digital.com.br" target="_blank" rel="noopener noreferrer">
      <span class="dock-icon">↗</span>
      <span class="dock-label">Central CAPI</span>
    </a>
  </nav>

  <script>
(function () {
  var banners = document.getElementById("banners");
  var eventRows = document.getElementById("eventRows");
  var leadRows = document.getElementById("leadRows");
  var weekChart = document.getElementById("weekChart");
  var eventDetailDialog = document.getElementById("eventDetailDialog");
  var eventDetailTitle = document.getElementById("eventDetailTitle");
  var eventDetailMeta = document.getElementById("eventDetailMeta");
  var eventDetailTimeline = document.getElementById("eventDetailTimeline");
  var fEvent = document.getElementById("fEvent");
  var fStatus = document.getElementById("fStatus");
  var btnAuto = document.getElementById("btnAuto");
  var state = { events: [], leads: [], correlations: [], metrics: {}, eventTimelines: {} };
  var eventSource = null;
  var autoEnabled = true;
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtTs(ts) {
    var n = Number(ts || Date.now());
    var d = new Date(n);
    return d.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit" });
  }
  function statusCls(ok) { return ok === true ? "ok" : ok === false ? "err" : "warn"; }
  function statusTxt(ok) { return ok === true ? "OK" : ok === false ? "Erro" : "Pendente"; }
  function capiStatusCls(status) {
    if (status === "deduplicated" || status === "validated_capi") return "ok";
    if (status === "failed") return "err";
    return "warn";
  }
  function capiStatusTxt(status) {
    if (status === "deduplicated") return "Desduplicado";
    if (status === "validated_capi") return "CAPI validado";
    if (status === "failed") return "Falhou";
    return "Em validação";
  }
  function semaphore(ok) {
    var cls = statusCls(ok);
    return '<span class="semaphore"><span class="dot ' + cls + '"></span><span class="' + cls + '">' + statusTxt(ok) + "</span></span>";
  }
  function capiSemaphore(status) {
    var cls = capiStatusCls(status);
    return '<span class="semaphore"><span class="dot ' + cls + '"></span><span class="' + cls + '">' + capiStatusTxt(status) + "</span></span>";
  }

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

  function setKpi(id, text) {
    var el = document.getElementById(id);
    if (!el || el.textContent === text) return;
    el.textContent = text;
    el.classList.remove("updated");
    void el.offsetWidth;
    el.classList.add("updated");
  }
  function renderMetrics(m) {
    setKpi("kpiEventPending", String(m.event_pending || 0));
    setKpi("kpiEventOk",      String(m.event_ok || 0));
    setKpi("kpiLeadTotal",    String(m.lead_total || 0));
    setKpi("kpiCorr",         String(m.event_deduplicated || 0));
    var rate = m.capi_success_rate || 0;
    setKpi("kpiRate", rate + "%");
    var err = m.event_error || 0;
    setKpi("kpiErr", String(err));
    var rateCard = document.getElementById("kpiRateCard");
    if (rateCard) rateCard.className = "kpi " + (rate >= 80 ? "kpi-success" : "kpi-warn");
    var errCard = document.getElementById("kpiErrCard");
    if (errCard)  errCard.className  = "kpi " + (err > 0 ? "kpi-danger" : "");
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
      if (st !== "all" && (e.capi_status || "pending") !== st) return false;
      return true;
    });
  }

  function renderEvents() {
    var ev = filteredEvents();
    if (!ev.length) {
      eventRows.innerHTML = '<tr><td colspan="8" class="empty">Sem eventos para os filtros atuais.</td></tr>';
      return;
    }
    eventRows.innerHTML = ev.map(function (e) {
      var capiStatus = e.capi_status || "pending";
      var rowCls = "row-" + capiStatusCls(capiStatus);
      var eventId = e.event_id ? String(e.event_id) : "";
      var contact = esc(e.email_masked || "—");
      if (e.phone_masked) contact += '<br><small class="muted">' + esc(e.phone_masked) + "</small>";
      if (e.lead_name) contact += '<br><small class="muted">' + esc(e.lead_name) + "</small>";
      return (
        '<tr class="' + rowCls + '">' +
        '<td class="mono">' + esc(fmtTs(e.ts)) + "</td>" +
        "<td>" + (e.event_name ? '<span class="chip">' + esc(e.event_name) + "</span>" : esc(e.error || "—")) + "</td>" +
        '<td class="status-cell">' + capiSemaphore(capiStatus) + "</td>" +
        '<td class="mono">' + esc(e.event_id || "—") + "</td>" +
        "<td>" + contact + "</td>" +
        "<td>" + esc(e.browser_os || "—") + "</td>" +
        "<td>" + esc(e.detail || e.error || "—") + "</td>" +
        '<td><button class="detail-btn" data-event-id="' + esc(eventId) + '"' + (eventId ? "" : " disabled") + ">Detalhes</button></td>" +
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

  function dayKey(ts) {
    var d = new Date(Number(ts || Date.now()));
    return String(d.getFullYear()) + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dayLabel(key) {
    var p = String(key || "").split("-");
    return (p[2] || "--") + "/" + (p[1] || "--");
  }
  function renderWeekChart() {
    var events = Array.isArray(state.events) ? state.events : [];
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = String(d.getFullYear()) + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      days.push({ key: key, ok: 0, err: 0, warn: 0 });
    }
    var byKey = {};
    days.forEach(function (d) { byKey[d.key] = d; });
    events.forEach(function (e) {
      var status = e.capi_status || "pending";
      var key = dayKey(e.ts);
      var slot = byKey[key];
      if (!slot) return;
      if (status === "failed") slot.err += 1;
      else if (status === "deduplicated" || status === "validated_capi") slot.ok += 1;
      else slot.warn += 1;
    });
    var maxV = 1;
    days.forEach(function (d) {
      maxV = Math.max(maxV, d.ok, d.err, d.warn);
    });
    var hasAny = days.some(function (d) { return d.ok > 0 || d.err > 0 || d.warn > 0; });
    if (!hasAny) {
      weekChart.innerHTML = '<div class="empty">Sem eventos CAPI nos últimos 7 dias.</div>';
      return;
    }
    weekChart.innerHTML =
      '<div class="week-legend">' +
      '<span><span class="dot ok"></span> Sucesso</span>' +
      '<span><span class="dot warn"></span> Em validação</span>' +
      '<span><span class="dot err"></span> Falhou</span>' +
      "</div>" +
      '<div class="week-grid">' +
      days.map(function (d) {
        var total = d.ok + d.err + d.warn;
        var okH = d.ok > 0 ? Math.max(3, Math.round((d.ok / maxV) * 84)) : 0;
        var warnH = d.warn > 0 ? Math.max(3, Math.round((d.warn / maxV) * 84)) : 0;
        var errH = d.err > 0 ? Math.max(3, Math.round((d.err / maxV) * 84)) : 0;
        return (
          '<div class="week-col">' +
          '<div class="week-bars">' +
          '<span class="week-bar ok" title="Sucesso: ' + d.ok + '" style="height:' + okH + 'px"></span>' +
          '<span class="week-bar warn" title="Em validação: ' + d.warn + '" style="height:' + warnH + 'px"></span>' +
          '<span class="week-bar err" title="Falhou: ' + d.err + '" style="height:' + errH + 'px"></span>' +
          "</div>" +
          '<div class="week-day">' + dayLabel(d.key) + "</div>" +
          '<div class="week-total">Total: ' + total + "</div>" +
          "</div>"
        );
      }).join("") +
      "</div>";
  }

  function renderEventDetails(eventId) {
    var id = eventId ? String(eventId) : "";
    var consolidated = (state.events || []).find(function (ev) { return String(ev.event_id || "") === id; }) || null;
    var timeline =
      state.eventTimelines &&
      typeof state.eventTimelines === "object" &&
      Array.isArray(state.eventTimelines[id])
        ? state.eventTimelines[id]
        : [];
    var latest = timeline.length ? timeline[timeline.length - 1] : null;
    var currentStatus = consolidated ? (consolidated.capi_status || "pending") : latest ? (latest.ok === true ? "validated_capi" : latest.ok === false ? "failed" : "pending") : "pending";
    eventDetailTitle.textContent = "Detalhes do evento " + (id || "—");
    eventDetailMeta.innerHTML =
      "<strong>event_id:</strong> " + esc(id || "—") +
      "<br><strong>Status atual:</strong> " + capiSemaphore(currentStatus) +
      "<br><strong>Último evento:</strong> " + esc(latest ? (latest.event_name || latest.detail || latest.error || "—") : "—");
    if (!timeline.length) {
      eventDetailTimeline.innerHTML = '<div class="empty">Sem histórico de monitoramento para este event_id.</div>';
      return;
    }
    eventDetailTimeline.innerHTML =
      "<table><thead><tr><th>Horário</th><th>Tipo</th><th>Status</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>" +
      timeline.map(function (item) {
        return (
          "<tr>" +
          '<td class="mono">' + esc(fmtTs(item.ts)) + "</td>" +
          "<td>" + esc(item.kind || "capi_event") + "</td>" +
          '<td class="status-cell">' + semaphore(item.ok) + "</td>" +
          "<td>" + esc(item.event_name || "—") + "</td>" +
          "<td>" + esc(item.detail || item.error || "—") + "</td>" +
          "</tr>"
        );
      }).join("") +
      "</tbody></table>";
  }

  function paint(data) {
    state.events = Array.isArray(data.events) ? data.events : [];
    state.leads = Array.isArray(data.leads) ? data.leads : [];
    state.correlations = Array.isArray(data.correlations) ? data.correlations : [];
    state.eventTimelines = data && typeof data.event_timelines === "object" && data.event_timelines ? data.event_timelines : {};
    state.metrics = data.metrics || {};
    renderMetrics(state.metrics);
    renderWeekChart();
    refreshEventFilter(state.events);
    renderEvents();
    renderLeads();
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

  function startSSE() {
    if (eventSource) { try { eventSource.close(); } catch (_) {} eventSource = null; }
    eventSource = new EventSource("/api/monitor/stream");
    eventSource.onmessage = function (ev) {
      try {
        var data = JSON.parse(ev.data);
        renderBanners(data, null);
        paint(data);
      } catch (_) {}
    };
    eventSource.addEventListener("reconnect", function () {
      try { eventSource.close(); } catch (_) {}
      eventSource = null;
      if (autoEnabled) setTimeout(startSSE, 400);
    });
    eventSource.onerror = function () {
      renderBanners(null, "Conexão SSE instável — reconectando automaticamente...");
    };
  }

  fEvent.onchange = renderEvents;
  fStatus.onchange = renderEvents;
  document.addEventListener("click", function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("button[data-event-id]") : null;
    if (!btn) return;
    var eventId = btn.getAttribute("data-event-id") || "";
    if (!eventId) return;
    renderEventDetails(eventId);
    if (eventDetailDialog && typeof eventDetailDialog.showModal === "function") {
      eventDetailDialog.showModal();
    }
  });
  document.getElementById("eventDetailClose").onclick = function () {
    if (eventDetailDialog && typeof eventDetailDialog.close === "function") eventDetailDialog.close();
  };
  document.getElementById("btnRefresh").onclick = load;
  btnAuto.onclick = function () {
    autoEnabled = !autoEnabled;
    btnAuto.textContent = "Auto: " + (autoEnabled ? "ON" : "OFF");
    if (autoEnabled) {
      startSSE();
      load();
    } else {
      if (eventSource) { try { eventSource.close(); } catch (_) {} eventSource = null; }
    }
  };
  startSSE();
  load();
})();
  </script>
</body>
</html>`;
