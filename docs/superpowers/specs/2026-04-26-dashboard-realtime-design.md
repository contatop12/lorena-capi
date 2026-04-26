# Dashboard Realtime — Design Spec
**Data:** 2026-04-26  
**Projeto:** lorena-capi (Cloudflare Worker + Meta CAPI)  
**Escopo:** Melhorias de UX/realtime na dashboard de monitoramento CAPI

---

## Contexto

A dashboard atual (`monitor/page.js`) é um HTML estático com polling de 5s para `/api/monitor/events`. O objetivo é torná-la dinâmica e reativa, com SSE para atualizações em tempo real, feed de atividade ao vivo, KPIs reativos e uma navbar dock flutuante com link para a central de monitoramento multi-cliente em `capi.p12digital.com.br`.

---

## Arquitetura

Abordagem incremental — sem refactor da estrutura existente. Mudanças localizadas em 3 arquivos:

- `monitor/page.js` — frontend: navbar, feed, KPIs, SSE client
- `monitor/router.js` — backend: novo endpoint SSE
- `worker.js` — notificação de streams ativos ao registrar eventos

Nenhum arquivo novo é criado.

---

## Componentes

### 1. Navbar Dock Flutuante

**Posição:** `fixed`, centrada na parte inferior da tela (`bottom: 1.5rem`, `left: 50%`, `transform: translateX(-50%)`).

**Visual:**
- Forma de pílula (`border-radius: 999px`)
- Fundo: `rgba(15, 16, 19, 0.85)` + `backdrop-filter: blur(12px)`
- Borda sutil: `1px solid var(--line)` (laranja 26% opacidade)
- Padding compacto: `0.5rem 1rem`
- `z-index: 100`

**Itens:**
- `⬡ CAPI Lorena` — identidade do cliente atual (texto, sem link)
- `↗ Central CAPI` — link externo para `https://capi.p12digital.com.br`, abre em nova aba (`target="_blank" rel="noopener"`)

**Comportamento:**
- Por padrão exibe apenas ícones com tooltip ao hover
- Ao hover, expande label inline com `transition: max-width 0.2s ease`
- Não interfere com o scroll da página

**Futuramente:** o nome "CAPI Lorena" pode vir de uma variável de ambiente `CLIENT_NAME` no worker, renderizada no HTML antes de servir.

---

### 2. SSE — Server-Sent Events

**Endpoint:** `GET /api/monitor/stream`  
**Content-Type:** `text/event-stream`  
**Autenticação:** mesmo token que `/api/monitor/events` (cookie `meta_monitor_token`)

**Comportamento no worker (`monitor/router.js`):**
- Abre um `TransformStream` e retorna a resposta com a readable side
- A cada 2s, faz leitura do KV (`listMonitorEvents`) e compara hash do resultado com o anterior
- Se houver mudança, empurra o payload via `data: {...}\n\n`
- Encerra a conexão após ~25s (antes do timeout de 30s do Cloudflare) com `event: reconnect`
- O cliente reconecta automaticamente via `EventSource` nativo

**Payload do stream:** mesmo formato do `/api/monitor/events` (campos `events`, `leads`, `metrics`, `correlations`, `event_timelines`, `kv_configured`)

**No frontend (`monitor/page.js`):**
- `new EventSource('/api/monitor/stream')` substitui `setInterval(load, 5000)`
- `eventSource.onmessage` chama `paint(data)` com os dados recebidos
- `eventSource.addEventListener('reconnect', ...)` fecha e reabre a conexão
- Botão "Auto: ON/OFF" controla `eventSource.close()` / nova instância
- Botão "Atualizar" mantém fetch pontual como fallback manual

---

### 3. Feed de Atividade ao Vivo

**Posição:** nova seção `<section class="card">` inserida acima das tabelas existentes (após os KPIs e gráfico semanal).

**Visual:**
- Header: `● Atividade ao vivo` — o `●` pulsa em laranja com animação CSS `@keyframes pulse`
- Área de scroll: `height: 220px; overflow-y: auto`
- Fonte monospace, tamanho `0.71rem`

**Formato de cada linha:**
```
[HH:MM:SS]  Lead recebido      abc1…f3e2   ● Em validação
[HH:MM:SS]  CAPI enviado       abc1…f3e2   ● CAPI validado
```

**Comportamento:**
- Linhas novas entram no topo com animação `slide-in` + flash de fundo laranja que desvanece em 1.5s (`@keyframes flash-new`)
- Máximo de 50 linhas; as mais antigas são removidas do DOM
- Linhas novas são identificadas comparando `event_id` + `ts` com o estado anterior

**Highlights nas tabelas:**
- Quando `paint()` detecta linhas novas (por `event_id` + `ts`), adiciona classe `.row-new` às `<tr>` correspondentes nas tabelas de eventos e leads
- `.row-new` aplica animação: borda esquerda pisca 2x em laranja, depois volta ao estado normal

---

### 4. KPIs Reativos

**Grade:** de 4 para 6 cards, layout `repeat(auto-fit, minmax(160px, 1fr))`:

| Card | Fonte no `metrics` | Cor reativa |
|---|---|---|
| Em validação | `event_pending` | neutro |
| CAPI sucesso | `event_ok` | verde se > 0 |
| Taxa de sucesso % | `capi_success_rate` | verde ≥ 80%, laranja < 80% |
| Leads webhook | `lead_total` | neutro |
| Desduplicados | `event_deduplicated` | neutro |
| Falhas | `event_error` | vermelho se > 0 |

**Animação de contador:**
- Quando o valor de um KPI muda, o número anima com `@keyframes count-up`: opacidade de 0.4 → 1 + leve translate-y, duração 0.4s

---

## Fluxo de Dados

```
Evento CAPI/Lead chega no worker
    ↓
logMonitor() grava no KV via appendMonitorEvent()
    ↓
/api/monitor/stream polling interno detecta mudança no KV (2s)
    ↓
Payload enviado via SSE para o browser
    ↓
paint() atualiza KPIs + feed ao vivo + tabelas com highlights
```

---

## Tratamento de Erros

- SSE falha ao conectar → fallback silencioso para polling manual (botão "Atualizar")
- KV indisponível → stream envia último estado em memória (comportamento atual do `listMonitorEvents`)
- Timeout de 25s → evento `reconnect` encerra e `EventSource` reabre automaticamente
- 401 no stream → banner de erro exibido, SSE não reconecta

---

## O que NÃO muda

- Estrutura do KV e lógica de `store.js`
- Endpoint `/api/monitor/events` (mantido para fetch manual)
- Tabelas de eventos e leads (apenas ganham highlights)
- Gráfico semanal (mantido)
- Dialog de detalhes do evento (mantido)
- Autenticação via cookie (mantida)
