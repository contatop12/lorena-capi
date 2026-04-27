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
