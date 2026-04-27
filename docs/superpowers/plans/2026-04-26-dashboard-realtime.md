# Dashboard Realtime + Camada de Execução — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a dashboard de monitoramento CAPI reativa em tempo real (SSE), adicionar dock de navegação flutuante, expandir KPIs, adicionar feed de atividade ao vivo e popular a Camada 3 com scripts Python para validação, teste, healthcheck e clonagem de clientes.

**Architecture:** Abordagem incremental sobre os 3 arquivos JS existentes (`monitor/page.js`, `monitor/router.js`, `worker.js`). SSE substitui o polling de 5s. Scripts Python determinísticos na `execution/` implementam a Camada 3. O projeto passa a ser um piloto replicável via `clone_client.py`.

**Tech Stack:** Cloudflare Workers (JS vanilla), `TransformStream` para SSE, `EventSource` nativo no browser, Python 3 + `httpx` + `python-dotenv` para scripts de execução.

---

## Mapa de Arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `monitor/page.js` | Modificar | Dashboard HTML/CSS/JS: navbar dock, 6 KPIs, feed ao vivo, SSE client, highlights |
| `monitor/router.js` | Modificar | Adicionar endpoint `/api/monitor/stream` (SSE), aceitar `ctx` |
| `worker.js` | Modificar | Passar `ctx` para `handleMonitorRequest` |
| `wrangler.toml` | Modificar | Adicionar variável `CLIENT_NAME` |
| `.env.example` | Modificar | Adicionar `CLIENT_NAME` e `WORKER_URL` |
| `execution/validate_env.py` | Criar | Valida variáveis obrigatórias do .env |
| `execution/test_capi_event.py` | Criar | Envia evento de teste ao worker |
| `execution/check_health.py` | Criar | Healthcheck dos 3 endpoints principais |
| `execution/clone_client.py` | Criar | Duplica o projeto para novo cliente |
| `directives/monitor_painel.md` | Criar | SOP do painel de monitoramento |

---

## Task 1: CLIENT_NAME — título configurável por cliente

**Files:**
- Modify: `wrangler.toml`
- Modify: `.env.example`
- Modify: `monitor/page.js`
- Modify: `monitor/router.js`

- [ ] **Step 1: Adicionar CLIENT_NAME ao wrangler.toml**

  No `wrangler.toml`, dentro de `[vars]`, adicionar após `PIXEL_ID`:
  ```toml
  CLIENT_NAME = "CAPI Lorena"
  ```

- [ ] **Step 2: Adicionar CLIENT_NAME e WORKER_URL ao .env.example**

  Adicionar ao final de `.env.example`:
  ```
  # Nome exibido na dashboard (ex: "CAPI Lorena", "CAPI João Adv")
  CLIENT_NAME=CAPI Lorena

  # URL pública do Worker para scripts de execução
  WORKER_URL=https://lorena-capi.suporte-922.workers.dev
  ```

- [ ] **Step 3: Substituir título hardcoded no page.js**

  Em `monitor/page.js`, localizar e substituir:
  ```js
  // ANTES (linha ~6):
  <title>Meta CAPI — monitor</title>
  
  // DEPOIS:
  <title>{{CLIENT_NAME}} — monitor</title>
  ```

  E também:
  ```js
  // ANTES (linha ~263):
  <h1>Tráfego CAPI Framework</h1>
  <p class="sub">Visão operacional de eventos CAPI, leads via webhook e correlação por <code>event_id</code>. Use filtros para investigar queda de entrega e validar se o lead entrou no fluxo server-side.</p>
  
  // DEPOIS:
  <h1>{{CLIENT_NAME}}</h1>
  <p class="sub">Visão operacional de eventos CAPI, leads via webhook e correlação por <code>event_id</code>. Use filtros para investigar queda de entrega e validar se o lead entrou no fluxo server-side.</p>
  ```

- [ ] **Step 4: Injetar CLIENT_NAME no router.js ao servir o dashboard**

  Em `monitor/router.js`, localizar o trecho que retorna o HTML do dashboard:
  ```js
  // ANTES:
  if (request.method === "GET" && path === "/dashboard") {
    const tok = (env.MONITOR_TOKEN || "").trim();
    const cookie = tok
      ? ...
      : ...;
    return new Response(DASHBOARD_HTML, {
  ```

  Substituir por:
  ```js
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
  ```

- [ ] **Step 5: Verificação manual**

  Rodar `npx wrangler dev` e abrir `http://localhost:8787/dashboard`. O título deve mostrar "CAPI Lorena" (ou o valor de `CLIENT_NAME` no `.dev.vars`).

- [ ] **Step 6: Commit**

  ```bash
  git add monitor/page.js monitor/router.js wrangler.toml .env.example
  git commit -m "feat: CLIENT_NAME configurável por cliente no dashboard"
  ```

---

## Task 2: Dock de navegação flutuante

**Files:**
- Modify: `monitor/page.js` (CSS + HTML)

- [ ] **Step 1: Adicionar CSS do dock antes de `</style>`**

  Localizar `</style>` em `monitor/page.js` e inserir antes:
  ```css
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
  ```

- [ ] **Step 2: Ajustar padding do main para não ficar atrás do dock**

  Localizar em `monitor/page.js`:
  ```css
    main { padding: 1rem 1.5rem 2rem; }
  ```
  Substituir por:
  ```css
    main { padding: 1rem 1.5rem 5rem; }
  ```

- [ ] **Step 3: Adicionar HTML do dock antes de `</body>`**

  Localizar `</body>` em `monitor/page.js` e inserir antes:
  ```html
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
  ```

- [ ] **Step 4: Verificação manual**

  `npx wrangler dev` → abrir dashboard → a pílula flutuante deve aparecer na parte inferior central. Ao passar o mouse sobre cada item, o label deve expandir suavemente.

- [ ] **Step 5: Commit**

  ```bash
  git add monitor/page.js
  git commit -m "feat: dock de navegação flutuante com link para Central CAPI"
  ```

---

## Task 3: 6 KPIs com animação de atualização e cores reativas

**Files:**
- Modify: `monitor/page.js` (CSS + HTML + JS)

- [ ] **Step 1: Adicionar CSS de animação dos KPIs antes de `</style>`**

  ```css
    @keyframes kpi-update {
      from { opacity: 0.45; transform: translateY(4px); }
      to   { opacity: 1;    transform: translateY(0); }
    }
    .kpi .val.updated { animation: kpi-update 0.35s ease; }
    .kpi.kpi-danger  .val { color: var(--err); }
    .kpi.kpi-success .val { color: var(--ok); }
    .kpi.kpi-warn    .val { color: var(--warn); }
  ```

- [ ] **Step 2: Substituir a seção de KPIs no HTML**

  Localizar:
  ```html
      <section class="kpis">
        <article class="kpi"><div class="lbl">CAPI em validação</div><div class="val" id="kpiEventTotal">0</div></article>
        <article class="kpi"><div class="lbl">CAPI sucesso</div><div class="val" id="kpiEventOk">0</div></article>
        <article class="kpi"><div class="lbl">Leads webhook</div><div class="val" id="kpiLeadTotal">0</div></article>
        <article class="kpi"><div class="lbl">Desduplicados</div><div class="val" id="kpiCorr">0</div></article>
      </section>
  ```

  Substituir por:
  ```html
      <section class="kpis">
        <article class="kpi"><div class="lbl">CAPI em validação</div><div class="val" id="kpiEventPending">0</div></article>
        <article class="kpi" id="kpiOkCard"><div class="lbl">CAPI sucesso</div><div class="val" id="kpiEventOk">0</div></article>
        <article class="kpi" id="kpiRateCard"><div class="lbl">Taxa de sucesso</div><div class="val" id="kpiRate">0%</div></article>
        <article class="kpi"><div class="lbl">Leads webhook</div><div class="val" id="kpiLeadTotal">0</div></article>
        <article class="kpi"><div class="lbl">Desduplicados</div><div class="val" id="kpiCorr">0</div></article>
        <article class="kpi" id="kpiErrCard"><div class="lbl">Falhas</div><div class="val" id="kpiErr">0</div></article>
      </section>
  ```

- [ ] **Step 3: Substituir a função renderMetrics no JS**

  Localizar no bloco `<script>`:
  ```js
  function renderMetrics(m) {
    document.getElementById("kpiEventTotal").textContent = String(m.event_pending || 0);
    document.getElementById("kpiEventOk").textContent = String(m.event_ok || 0);
    document.getElementById("kpiLeadTotal").textContent = String(m.lead_total || 0);
    document.getElementById("kpiCorr").textContent = String(m.event_deduplicated || 0);
  }
  ```

  Substituir por:
  ```js
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
  ```

- [ ] **Step 4: Verificação manual**

  Abrir dashboard → devem aparecer 6 KPIs. "Falhas" deve ser vermelho se houver erros no KV. "Taxa de sucesso" deve ser verde (≥80%) ou laranja (<80%).

- [ ] **Step 5: Commit**

  ```bash
  git add monitor/page.js
  git commit -m "feat: expandir KPIs para 6 cards com animação e cores reativas"
  ```

---

## Task 4: Endpoint SSE no worker

**Files:**
- Modify: `monitor/router.js`
- Modify: `worker.js` (linha 193)

- [ ] **Step 1: Adicionar `ctx` à assinatura de handleMonitorRequest**

  Em `monitor/router.js`, localizar:
  ```js
  export async function handleMonitorRequest(request, env, jsonResponse) {
  ```
  Substituir por:
  ```js
  export async function handleMonitorRequest(request, env, ctx, jsonResponse) {
  ```

- [ ] **Step 2: Adicionar o endpoint SSE em router.js**

  Localizar o bloco do endpoint existente de events:
  ```js
    if (request.method === "GET" && path === "/api/monitor/events") {
  ```

  Inserir **antes** dele o novo endpoint SSE:
  ```js
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
  ```

- [ ] **Step 3: Atualizar a chamada em worker.js**

  Em `worker.js`, localizar a linha 193:
  ```js
      const monitorRes = await handleMonitorRequest(request, env, jsonResponse);
  ```
  Substituir por:
  ```js
      const monitorRes = await handleMonitorRequest(request, env, ctx, jsonResponse);
  ```

- [ ] **Step 4: Verificação manual com curl**

  ```bash
  # Rodar wrangler dev e em outro terminal:
  curl -N -H "Cookie: meta_monitor_token=SEU_TOKEN" http://localhost:8787/api/monitor/stream
  # Deve aparecer: data: {"ok":true,...}
  # Após ~25s deve aparecer: event: reconnect
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add monitor/router.js worker.js
  git commit -m "feat: endpoint SSE /api/monitor/stream para atualizações em tempo real"
  ```

---

## Task 5: SSE client no frontend

**Files:**
- Modify: `monitor/page.js` (bloco `<script>`)

- [ ] **Step 1: Substituir autoTimer por eventSource no estado inicial**

  Localizar no `<script>`:
  ```js
  var state = { events: [], leads: [], correlations: [], metrics: {}, eventTimelines: {} };
  var autoTimer = null;
  var autoEnabled = true;
  ```
  Substituir por:
  ```js
  var state = { events: [], leads: [], correlations: [], metrics: {}, eventTimelines: {} };
  var eventSource = null;
  var autoEnabled = true;
  ```

- [ ] **Step 2: Adicionar função startSSE logo após as funções de render existentes**

  Localizar a linha:
  ```js
  fEvent.onchange = renderEvents;
  ```
  Inserir **antes** dela:
  ```js
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
  ```

- [ ] **Step 3: Substituir btnAuto.onclick e inicialização**

  Localizar:
  ```js
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
  ```
  Substituir por:
  ```js
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
  ```

- [ ] **Step 4: Verificação manual**

  Abrir dashboard → abrir DevTools → aba Network → filtrar "EventStream" → deve aparecer conexão aberta para `/api/monitor/stream` recebendo `data:` messages a cada 2s. O botão "Auto: ON/OFF" deve abrir/fechar a conexão.

- [ ] **Step 5: Commit**

  ```bash
  git add monitor/page.js
  git commit -m "feat: substituir polling por SSE (EventSource) no cliente da dashboard"
  ```

---

## Task 6: Feed de atividade ao vivo

**Files:**
- Modify: `monitor/page.js` (CSS + HTML + JS)

- [ ] **Step 1: Adicionar CSS do feed antes de `</style>`**

  ```css
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes flash-new {
      0%   { background: rgba(255, 107, 44, 0.16); }
      100% { background: transparent; }
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.25; }
    }
    .pulse-dot {
      display: inline-block;
      width: 0.48rem;
      height: 0.48rem;
      border-radius: 999px;
      background: var(--accent);
      animation: pulse-dot 1.4s ease infinite;
      margin-right: 0.45rem;
      vertical-align: middle;
    }
    .feed-wrap {
      height: 220px;
      overflow-y: auto;
      padding: 0.35rem 0;
    }
    .feed-row {
      display: flex;
      align-items: baseline;
      gap: 0.55rem;
      padding: 0.28rem 0.7rem;
      font-size: 0.70rem;
      animation: slide-in 0.22s ease, flash-new 1.5s ease;
    }
    .feed-ts   { color: var(--muted); flex-shrink: 0; font-variant-numeric: tabular-nums; min-width: 5.5rem; }
    .feed-type { min-width: 9rem; }
    .feed-id   { color: var(--muted); font-size: 0.64rem; min-width: 6rem; }
  ```

- [ ] **Step 2: Adicionar a seção de feed no HTML**

  Localizar no HTML:
  ```html
      <section class="card">
        <h3>Leads recebidos (webhook)</h3>
  ```
  Inserir **antes** dessa seção:
  ```html
      <section class="card">
        <h3><span class="pulse-dot"></span>Atividade ao vivo</h3>
        <div class="feed-wrap" id="feedWrap"><div class="empty">Aguardando eventos...</div></div>
      </section>
  ```

- [ ] **Step 3: Adicionar variável feedWrap e funções de feed no bloco JS**

  Localizar:
  ```js
  var banners = document.getElementById("banners");
  ```
  Inserir na mesma linha ou logo abaixo (adicionar feedWrap):
  ```js
  var feedWrap = document.getElementById("feedWrap");
  ```

  Depois, localizar a função `esc(s)` no JS e adicionar as helpers de feed logo após:
  ```js
  var knownFeedKeys = new Set();

  function fmtTsShort(ts) {
    var d = new Date(Number(ts || Date.now()));
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(function (n) { return String(n).padStart(2, "0"); }).join(":");
  }

  function shortId(id) {
    var s = String(id || "");
    if (!s) return "—";
    return s.length > 10 ? s.slice(0, 5) + "…" + s.slice(-4) : s;
  }

  function feedKey(item) {
    return String(item.event_id || "") + "_" + String(item.ts || "");
  }

  function updateFeed(events, leads) {
    var all = (events || []).concat(leads || []).sort(function (a, b) {
      return Number(b.ts || 0) - Number(a.ts || 0);
    });
    var firstRender = feedWrap.querySelector(".empty") !== null;
    if (firstRender && all.length) feedWrap.innerHTML = "";
    all.forEach(function (item) {
      var key = feedKey(item);
      if (knownFeedKeys.has(key)) return;
      knownFeedKeys.add(key);
      var isLead = item.kind === "lead_capture" || !!item.webhook_received;
      var capiStatus = item.capi_status ||
        (item.ok === true ? "validated_capi" : item.ok === false ? "failed" : "pending");
      var row = document.createElement("div");
      row.className = "feed-row";
      row.innerHTML =
        '<span class="feed-ts">[' + fmtTsShort(item.ts) + ']</span>' +
        '<span class="feed-type">' + esc(isLead ? "Lead recebido" : (item.event_name || "Evento CAPI")) + '</span>' +
        '<span class="feed-id">' + esc(shortId(item.event_id)) + '</span>' +
        capiSemaphore(capiStatus);
      feedWrap.insertBefore(row, feedWrap.firstChild);
    });
    while (feedWrap.children.length > 50) {
      feedWrap.removeChild(feedWrap.lastChild);
    }
  }
  ```

- [ ] **Step 4: Chamar updateFeed dentro de paint()**

  Localizar no final da função `paint()`:
  ```js
    renderMetrics(state.metrics);
    renderWeekChart();
    refreshEventFilter(state.events);
    renderEvents();
    renderLeads();
  ```
  Adicionar ao final:
  ```js
    updateFeed(state.events, state.leads);
  ```

- [ ] **Step 5: Verificação manual**

  Abrir dashboard → o card "Atividade ao vivo" deve aparecer acima das tabelas. O ponto laranja deve pulsar. Ao receber dados via SSE, linhas devem aparecer no topo com animação slide-in + flash laranja.

- [ ] **Step 6: Commit**

  ```bash
  git add monitor/page.js
  git commit -m "feat: feed de atividade ao vivo com slide-in e flash laranja"
  ```

---

## Task 7: Highlight de linhas novas nas tabelas

**Files:**
- Modify: `monitor/page.js` (CSS + JS)

- [ ] **Step 1: Adicionar CSS de highlight antes de `</style>`**

  ```css
    @keyframes highlight-row {
      0%   { border-left-color: rgba(255, 107, 44, 0.9); }
      50%  { border-left-color: transparent; }
      100% { border-left-color: rgba(255, 107, 44, 0.9); }
    }
    tr.row-new td:first-child {
      border-left: 2px solid var(--accent) !important;
      animation: highlight-row 0.55s ease 2;
    }
  ```

- [ ] **Step 2: Adicionar tracking de IDs conhecidos**

  Logo após `var knownFeedKeys = new Set();` (adicionado na Task 6), incluir:
  ```js
  var knownEventKeys = new Set();
  var knownLeadKeys  = new Set();
  ```

- [ ] **Step 3: Adicionar função de highlight**

  Logo após as funções `feedKey` e `updateFeed`, adicionar:
  ```js
  function highlightNewRows(tbody, items, keyFn, knownSet) {
    var rows = tbody ? tbody.querySelectorAll("tr") : [];
    items.forEach(function (item, i) {
      var key = keyFn(item);
      if (!knownSet.has(key) && rows[i]) {
        rows[i].classList.add("row-new");
        (function (r) {
          setTimeout(function () { if (r) r.classList.remove("row-new"); }, 1500);
        })(rows[i]);
      }
      knownSet.add(key);
    });
  }
  ```

- [ ] **Step 4: Chamar highlightNewRows em paint()**

  Na função `paint()`, após as chamadas de `renderEvents()` e `renderLeads()`, adicionar:
  ```js
    highlightNewRows(eventRows, state.events,
      function (e) { return String(e.event_id || "") + "_" + String(e.ts || ""); },
      knownEventKeys);
    highlightNewRows(leadRows, state.leads,
      function (l) { return String(l.event_id || "") + "_" + String(l.ts || ""); },
      knownLeadKeys);
  ```

- [ ] **Step 5: Verificação manual**

  No dashboard, enviar um evento de teste via `execution/test_capi_event.py` (Task 9 — pode usar curl por enquanto). A linha nova nas tabelas deve piscar com borda laranja 2x.

- [ ] **Step 6: Commit**

  ```bash
  git add monitor/page.js
  git commit -m "feat: highlight animado de linhas novas nas tabelas de eventos e leads"
  ```

---

## Task 8: execution/validate_env.py

**Files:**
- Create: `execution/validate_env.py`

- [ ] **Step 1: Criar o script**

  ```python
  #!/usr/bin/env python3
  """Valida variáveis de ambiente obrigatórias do worker CAPI. Camada 3 — Execução."""

  import os
  import sys
  from dotenv import load_dotenv

  load_dotenv()

  REQUIRED = [
      "PIXEL_ID",
      "META_ACCESS_TOKEN",
      "META_API_VERSION",
      "ALLOWED_ORIGINS",
      "WORKER_ENV",
  ]

  OPTIONAL = [
      "CLIENT_NAME",
      "WORKER_URL",
      "MONITOR_TOKEN",
      "WEBHOOK_TOKEN",
      "EXPOSE_META_ERRORS",
      "TEST_EVENT_CODE",
  ]

  SECRETS = {"META_ACCESS_TOKEN", "MONITOR_TOKEN", "WEBHOOK_TOKEN"}


  def mask(key, val):
      return "***" if key in SECRETS else val


  def validate():
      errors = []
      warnings = []

      print("=== Variáveis obrigatórias ===")
      for key in REQUIRED:
          val = os.getenv(key, "").strip()
          if not val:
              errors.append(f"FALTANDO: {key}")
              print(f"  ✗ {key}")
          elif key == "META_API_VERSION" and not val.startswith("v"):
              errors.append(f"FORMATO: {key} deve começar com 'v' (ex: v25.0), atual: {val}")
              print(f"  ✗ {key} = {val}")
          elif key == "ALLOWED_ORIGINS" and ("*" in val or not val.startswith("https")):
              warnings.append(f"{key} deve ser HTTPS explícito em produção (atual: {val})")
              print(f"  ~ {key} = {val}")
          else:
              print(f"  ✓ {key} = {mask(key, val)}")

      print("\n=== Variáveis opcionais ===")
      for key in OPTIONAL:
          val = os.getenv(key, "").strip()
          if val:
              print(f"  ~ {key} = {mask(key, val)}")
          else:
              warnings.append(f"Opcional não definido: {key}")
              print(f"  - {key} (não definido)")

      if warnings:
          print("\n⚠ Avisos:")
          for w in warnings:
              print(f"  {w}")

      if errors:
          print("\n✗ Erros:")
          for e in errors:
              print(f"  {e}")
          sys.exit(1)

      print("\n✓ Todas as variáveis obrigatórias estão configuradas.")


  if __name__ == "__main__":
      validate()
  ```

- [ ] **Step 2: Testar o script**

  ```bash
  python execution/validate_env.py
  # Se .env estiver completo: deve imprimir ✓ para todas as obrigatórias
  # Se faltando PIXEL_ID por exemplo: deve sair com código 1
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add execution/validate_env.py
  git commit -m "feat(exec): validate_env.py — validação de variáveis da Camada 3"
  ```

---

## Task 9: execution/test_capi_event.py

**Files:**
- Create: `execution/test_capi_event.py`

- [ ] **Step 1: Criar o script**

  ```python
  #!/usr/bin/env python3
  """Envia um evento Lead de teste ao worker CAPI e valida a resposta. Camada 3 — Execução."""

  import os
  import sys
  import json
  import time
  import hashlib
  import httpx
  from dotenv import load_dotenv

  load_dotenv()

  WORKER_URL = os.getenv("WORKER_URL", "").rstrip("/")
  if not WORKER_URL:
      print("✗ WORKER_URL não definido no .env")
      sys.exit(1)


  def sha256(val: str) -> str:
      return hashlib.sha256(val.strip().lower().encode()).hexdigest()


  def test_event():
      event_id = f"test_{int(time.time() * 1000)}"
      payload = {
          "event_name": "Lead",
          "event_id": event_id,
          "event_time": int(time.time()),
          "user_data": {
              "em": [sha256("test@example.com")],
              "ph": [sha256("11999999999")],
              "client_ip_address": "127.0.0.1",
              "client_user_agent": "Mozilla/5.0 (Test; Python/exec)",
          },
          "custom_data": {"source": "test_capi_event_script"},
      }

      print(f"Enviando evento de teste: {event_id}")
      print(f"Endpoint: {WORKER_URL}/event\n")

      try:
          resp = httpx.post(
              f"{WORKER_URL}/event",
              json=payload,
              headers={"Content-Type": "application/json"},
              timeout=15.0,
          )
          data = resp.json()
          print(f"HTTP {resp.status_code}")
          print(json.dumps(data, indent=2, ensure_ascii=False))

          if resp.status_code == 200 and data.get("ok"):
              print(f"\n✓ Evento enviado com sucesso. event_id={event_id}")
          else:
              print(f"\n✗ Falha: {data.get('error', 'desconhecido')}")
              sys.exit(1)
      except httpx.RequestError as exc:
          print(f"✗ Erro de conexão: {exc}")
          sys.exit(1)


  if __name__ == "__main__":
      test_event()
  ```

- [ ] **Step 2: Testar o script**

  ```bash
  python execution/test_capi_event.py
  # Saída esperada: HTTP 200, ok: true, event_id retornado
  # Erros possíveis: CORS (teste via curl direto), PIXEL_ID inválido
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add execution/test_capi_event.py
  git commit -m "feat(exec): test_capi_event.py — envio de evento Lead de teste"
  ```

---

## Task 10: execution/check_health.py

**Files:**
- Create: `execution/check_health.py`

- [ ] **Step 1: Criar o script**

  ```python
  #!/usr/bin/env python3
  """Verifica saúde dos 3 endpoints principais do worker CAPI. Camada 3 — Execução."""

  import os
  import sys
  import httpx
  from dotenv import load_dotenv

  load_dotenv()

  WORKER_URL    = os.getenv("WORKER_URL", "").rstrip("/")
  MONITOR_TOKEN = os.getenv("MONITOR_TOKEN", "").strip()

  if not WORKER_URL:
      print("✗ WORKER_URL não definido no .env")
      sys.exit(1)


  def check(label: str, ok: bool, detail: str = ""):
      icon = "✓" if ok else "✗"
      line = f"  {icon} {label}"
      if detail:
          line += f" — {detail}"
      print(line)
      return ok


  def run():
      errors = []

      # 1. Health endpoint
      print("1. GET /health")
      try:
          r = httpx.get(f"{WORKER_URL}/health", timeout=10)
          d = r.json()
          ok = r.status_code == 200 and bool(d.get("ok"))
          detail = f"worker_env={d.get('worker_env', '?')}" if ok else f"status={r.status_code}"
          if not check("health", ok, detail):
              errors.append("health")
      except Exception as exc:
          check("health", False, str(exc))
          errors.append("health")

      # 2. Dashboard HTML
      print("2. GET /dashboard")
      try:
          r = httpx.get(f"{WORKER_URL}/dashboard", timeout=10, follow_redirects=False)
          ok = r.status_code == 200 and "CAPI" in r.text
          detail = "HTML ok" if ok else f"status={r.status_code}"
          if not check("dashboard", ok, detail):
              errors.append("dashboard")
      except Exception as exc:
          check("dashboard", False, str(exc))
          errors.append("dashboard")

      # 3. Monitor API
      print("3. GET /api/monitor/events")
      if not MONITOR_TOKEN:
          print("   - pulado (MONITOR_TOKEN não definido)")
      else:
          try:
              r = httpx.get(
                  f"{WORKER_URL}/api/monitor/events",
                  cookies={"meta_monitor_token": MONITOR_TOKEN},
                  timeout=10,
              )
              d = r.json()
              ok = r.status_code == 200 and bool(d.get("ok"))
              if ok:
                  m = d.get("metrics", {})
                  detail = f"eventos={m.get('event_total', 0)}, leads={m.get('lead_total', 0)}"
              else:
                  detail = f"status={r.status_code}"
              if not check("monitor_api", ok, detail):
                  errors.append("monitor_api")
          except Exception as exc:
              check("monitor_api", False, str(exc))
              errors.append("monitor_api")

      print()
      if errors:
          print(f"✗ {len(errors)} verificação(ões) falharam: {', '.join(errors)}")
          sys.exit(1)
      print("✓ Worker saudável.")


  if __name__ == "__main__":
      run()
  ```

- [ ] **Step 2: Testar o script**

  ```bash
  python execution/check_health.py
  # Saída esperada:
  # 1. GET /health
  #    ✓ health — worker_env=production
  # 2. GET /dashboard
  #    ✓ dashboard — HTML ok
  # 3. GET /api/monitor/events
  #    ✓ monitor_api — eventos=12, leads=3
  # ✓ Worker saudável.
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add execution/check_health.py
  git commit -m "feat(exec): check_health.py — healthcheck dos 3 endpoints do worker"
  ```

---

## Task 11: execution/clone_client.py — projeto piloto replicável

**Files:**
- Create: `execution/clone_client.py`

- [ ] **Step 1: Criar o script**

  ```python
  #!/usr/bin/env python3
  """
  Cria um novo projeto de cliente a partir deste piloto (lorena-capi).
  Camada 3 — Execução.

  Uso:
      python execution/clone_client.py --name "João Silva" --slug joao-adv
      python execution/clone_client.py --name "Maria Adv" --slug maria-adv --output C:/IA/P12/01.\ Automações\ Ativas
  """

  import os
  import re
  import sys
  import shutil
  import argparse

  TEMPLATE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

  IGNORE = shutil.ignore_patterns(
      ".git", ".wrangler", "node_modules", ".tmp",
      "*.log", "__pycache__", "*.pyc", ".env",
  )


  def slugify(text: str) -> str:
      text = text.lower().strip()
      text = re.sub(r"[^\w\s-]", "", text)
      text = re.sub(r"[\s_]+", "-", text)
      return text.strip("-")


  def replace_in_file(path: str, replacements: list[tuple[str, str]]) -> bool:
      try:
          with open(path, "r", encoding="utf-8") as f:
              content = f.read()
          for old, new in replacements:
              content = re.sub(old, new, content)
          with open(path, "w", encoding="utf-8") as f:
              f.write(content)
          return True
      except Exception as exc:
          print(f"  ⚠ Não foi possível editar {path}: {exc}")
          return False


  def clone_client(name: str, slug: str, output_dir: str):
      target = os.path.join(output_dir, f"{slug}-capi")

      if os.path.exists(target):
          print(f"✗ Diretório já existe: {target}")
          sys.exit(1)

      print(f"Cliente : {name}")
      print(f"Slug    : {slug}")
      print(f"Destino : {target}\n")

      # Copiar estrutura
      shutil.copytree(TEMPLATE_DIR, target, ignore=IGNORE)
      print("✓ Estrutura copiada")

      # Atualizar wrangler.toml
      wrangler = os.path.join(target, "wrangler.toml")
      if os.path.exists(wrangler):
          replace_in_file(wrangler, [
              (r'name\s*=\s*"[^"]*"',           f'name = "{slug}-capi"'),
              (r'CLIENT_NAME\s*=\s*"[^"]*"',     f'CLIENT_NAME = "CAPI {name}"'),
              (r'PIXEL_ID\s*=\s*"[^"]*"',        'PIXEL_ID = ""'),
              (r'ALLOWED_ORIGINS\s*=\s*"[^"]*"', 'ALLOWED_ORIGINS = ""'),
              (r'WORKER_EVENT_URL\s*=\s*"[^"]*"',f'WORKER_EVENT_URL = "https://{slug}-capi.suporte-922.workers.dev/event"'),
          ])
          print("✓ wrangler.toml atualizado")

      # Criar .env a partir do .env.example
      env_example = os.path.join(target, ".env.example")
      env_file    = os.path.join(target, ".env")
      if os.path.exists(env_example):
          shutil.copy(env_example, env_file)
          replace_in_file(env_file, [
              (r"CLIENT_NAME=.*", f"CLIENT_NAME=CAPI {name}"),
              (r"WORKER_URL=.*",  f"WORKER_URL=https://{slug}-capi.suporte-922.workers.dev"),
          ])
          print("✓ .env criado")

      # Criar diretiva do cliente
      directive_path = os.path.join(target, "directives", f"cliente_{slug}.md")
      directive_content = f"""# Cliente: {name}

  ## Identificação

  | Campo | Valor |
  |---|---|
  | Nome | {name} |
  | Pixel ID | (preencher) |
  | Origem CORS | (preencher — ex: https://www.dominio.com.br) |
  | Worker | {slug}-capi |
  | URL Worker | https://{slug}-capi.suporte-922.workers.dev |
  | Dashboard | https://{slug}-capi.suporte-922.workers.dev/dashboard |

  ## Configuração inicial

  1. Editar `wrangler.toml`: `PIXEL_ID`, `ALLOWED_ORIGINS`
  2. `npx wrangler secret put META_ACCESS_TOKEN`
  3. `npx wrangler secret put MONITOR_TOKEN`
  4. `npx wrangler deploy`
  5. `python execution/check_health.py`
  6. `python execution/validate_env.py`

  ## Manutenção

  Seguir o mesmo padrão do projeto piloto `lorena-capi` e do `AGENTS.md`.
  """
      with open(directive_path, "w", encoding="utf-8") as f:
          f.write(directive_content)
      print(f"✓ Diretiva criada: directives/cliente_{slug}.md")

      print(f"""
  ✓ Projeto criado em: {target}

  Próximos passos:
    cd "{target}"
    # Editar wrangler.toml: PIXEL_ID e ALLOWED_ORIGINS
    npx wrangler secret put META_ACCESS_TOKEN
    npx wrangler secret put MONITOR_TOKEN
    npx wrangler deploy
    python execution/check_health.py
  """)


  if __name__ == "__main__":
      parser = argparse.ArgumentParser(description="Clona o projeto piloto CAPI para um novo cliente")
      parser.add_argument("--name",   required=True, help="Nome do cliente (ex: 'João Silva')")
      parser.add_argument("--slug",   help="Slug (ex: 'joao-adv'). Se omitido, gerado do nome.")
      parser.add_argument("--output", default=os.path.dirname(TEMPLATE_DIR),
                          help="Diretório pai onde criar o projeto. Padrão: pasta acima do piloto.")
      args = parser.parse_args()

      slug = args.slug or slugify(args.name)
      clone_client(args.name, slug, args.output)
  ```

- [ ] **Step 2: Testar em dry-run**

  ```bash
  # Listar o que seria criado sem criar de fato (verificar argumentos):
  python execution/clone_client.py --name "Cliente Teste" --slug teste-adv --output /tmp
  # Deve criar /tmp/teste-adv-capi/ com wrangler.toml e .env atualizados
  # Verificar: cat /tmp/teste-adv-capi/wrangler.toml | grep name
  # Esperado: name = "teste-adv-capi"
  ```

- [ ] **Step 3: Limpar pasta de teste**

  ```bash
  rm -rf /tmp/teste-adv-capi
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add execution/clone_client.py
  git commit -m "feat(exec): clone_client.py — duplicação do projeto piloto para novos clientes"
  ```

---

## Task 12: Diretiva do painel de monitoramento

**Files:**
- Create: `directives/monitor_painel.md`

- [ ] **Step 1: Criar a diretiva**

  ```markdown
  # Diretiva — Painel de Monitoramento CAPI (Camada 1)

  ## Objetivo

  Descreve o comportamento esperado do painel em `/dashboard` e dos endpoints de monitoramento.
  Referência de operação para a Camada 2 (orquestração) e para diagnóstico de problemas.

  ## Endpoints

  | Método | Path | Autenticação | Descrição |
  |---|---|---|---|
  | GET | `/dashboard` | Nenhuma (define cookie) | Serve HTML da dashboard |
  | GET | `/api/monitor/events` | Cookie `meta_monitor_token` | Snapshot JSON dos eventos |
  | GET | `/api/monitor/stream` | Cookie `meta_monitor_token` | SSE com atualizações a cada 2s |

  ## Variáveis de ambiente relevantes

  - `CLIENT_NAME` — nome exibido na dashboard e no dock (ex: "CAPI Lorena")
  - `MONITOR_TOKEN` — secret que protege `/api/monitor/events` e `/api/monitor/stream`
  - `EVENT_LOG` — KV binding com histórico de eventos (TTL 14 dias, máx 120 entradas)

  ## Comportamento do SSE

  - Endpoint `/api/monitor/stream` mantém conexão aberta por até 25s
  - A cada 2s lê o KV e empurra dados se houver mudança
  - Ao atingir 25s, envia `event: reconnect` e fecha; o cliente reconecta automaticamente
  - Se o KV não estiver configurado, opera com anel de memória in-process (dados perdem entre invocações)

  ## Estrutura dos dados (`/api/monitor/events`)

  ```json
  {
    "ok": true,
    "kv_configured": true,
    "events": [...],
    "leads": [...],
    "correlations": [...],
    "event_timelines": { "event_id": [...] },
    "metrics": {
      "event_total": 0,
      "event_ok": 0,
      "event_pending": 0,
      "event_deduplicated": 0,
      "event_error": 0,
      "lead_total": 0,
      "capi_success_rate": 0
    }
  }
  ```

  ## Dashboard — componentes

  - **Dock flutuante** — navegação inferior, link para `https://capi.p12digital.com.br`
  - **6 KPIs** — Em validação, CAPI sucesso, Taxa %, Leads, Desduplicados, Falhas
  - **Feed ao vivo** — últimas 50 entradas, alimentado por SSE, slide-in + flash laranja
  - **Tabelas** — Eventos CAPI e Leads com highlight de linhas novas
  - **Gráfico semanal** — barras por dia, últimos 7 dias

  ## Scripts de execução (Camada 3)

  | Script | Uso |
  |---|---|
  | `execution/validate_env.py` | Valida `.env` antes do deploy |
  | `execution/test_capi_event.py` | Envia Lead de teste ao worker |
  | `execution/check_health.py` | Verifica saúde dos 3 endpoints |
  | `execution/clone_client.py` | Duplica o piloto para novo cliente |

  ## Diagnóstico rápido

  1. Dashboard em branco → verificar `MONITOR_TOKEN` no Worker
  2. KPIs zerados → verificar binding `EVENT_LOG` (KV) no wrangler.toml
  3. SSE não conecta → verificar se o Worker suporta Unbound (necessário para streams longos)
  4. CLIENT_NAME não aparece → verificar variável `CLIENT_NAME` em `[vars]` no wrangler.toml

  ## Manutenção (self-anneal)

  Ao alterar estrutura dos eventos em `store.js` ou adicionar campos ao payload, atualizar:
  1. `store.js` — lógica de `buildMonitorView`
  2. `monitor/page.js` — renderização dos novos campos
  3. Este documento — seção "Estrutura dos dados"
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add directives/monitor_painel.md
  git commit -m "docs(directive): monitor_painel.md — SOP do painel e scripts da Camada 3"
  ```

---

## Verificação Final

- [ ] `npx wrangler dev` → abrir `http://localhost:8787/dashboard`
- [ ] Dock flutuante aparece na parte inferior central
- [ ] Título exibe "CAPI Lorena"
- [ ] 6 KPIs visíveis com cores corretas
- [ ] Feed "Atividade ao vivo" com ponto pulsante laranja
- [ ] DevTools → Network → EventStream → conexão ativa para `/api/monitor/stream`
- [ ] `python execution/validate_env.py` → sem erros
- [ ] `python execution/check_health.py` → todos ✓
- [ ] `python execution/test_capi_event.py` → HTTP 200, ok: true
- [ ] `python execution/clone_client.py --name "Teste" --slug teste --output /tmp` → cria estrutura correta

```bash
git log --oneline -12
# Deve mostrar os commits das Tasks 1-12
```
