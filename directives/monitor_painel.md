# Diretiva — Painel de monitoramento CAPI (Camada 1)

## Objetivo

Oferecer uma **interface web** servida pelo próprio Worker para acompanhar envios à Meta (sucesso/falha, nome do evento, `event_id`, URL truncada), acessível pelo **link do Worker** (`/dashboard`).

## URLs

| Rota | Método | Descrição |
| ------ | -------- | ------------ |
| `/dashboard` | GET | Interface HTML (pública). Dados sensíveis vêm só da API com token. |
| `/api/monitor/events` | GET | JSON com lista recente; exige `MONITOR_TOKEN` em produção. |
| `/webhook/lead` | POST | Ingestão opcional de lead do formulário (token `WEBHOOK_TOKEN`). |

Exemplo: `https://conversao-api-meta.suporte-922.workers.dev/dashboard`

## Configuração

1. **`MONITOR_TOKEN`** (secret ou variável cifrada no painel): recomendado em **`WORKER_ENV=production`** para restringir o dashboard.
2. **`WEBHOOK_TOKEN`** (secret): recomendado em **produção** para aceitar `POST /webhook/lead` apenas de integradores autorizados (header `Authorization: Bearer ...` ou `X-Webhook-Token`).
3. **`EVENT_LOG`** (binding KV): obrigatório para histórico persistente e correlação (`lead -> event_id -> status CAPI`) entre requests.

## Ferramentas

- Código: [`monitor/page.js`](../monitor/page.js), [`monitor/router.js`](../monitor/router.js), [`monitor/store.js`](../monitor/store.js), integração em [`worker.js`](../worker.js).

## Edge cases

- **401 na API**: token ausente/incorreto (`MONITOR_TOKEN` ou `WEBHOOK_TOKEN`).
- **Lista vazia com KV**: ainda não houve POST `/event` após configurar o KV, ou concorrência muito alta (perda ocasional de escrita no anel — aceitável para diagnóstico).
- **Privacidade**: não armazenamos IP completo nem token Meta; só metadados de evento e URL truncada.

## Manutenção

Se alterar rotas ou esquema do log, atualize este arquivo e o texto de ajuda no painel em `monitor/page.js`.
