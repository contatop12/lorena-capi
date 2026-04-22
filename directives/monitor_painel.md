# Diretiva — Painel de monitoramento CAPI (Camada 1)

## Objetivo

Oferecer uma **interface web** servida pelo próprio Worker para acompanhar envios à Meta (sucesso/falha, nome do evento, `event_id`, URL truncada), acessível pelo **link do Worker** (`/dashboard`).

## URLs

| Rota | Método | Descrição |
|------|--------|------------|
| `/dashboard` | GET | Interface HTML (pública). Dados sensíveis vêm só da API com token. |
| `/api/monitor/events` | GET | JSON com lista recente; exige `MONITOR_TOKEN` em produção. |

Exemplo: `https://conversao-api-meta.suporte-922.workers.dev/dashboard`

## Configuração

1. **`MONITOR_TOKEN`** (secret ou variável cifrada no painel): obrigatório em **`WORKER_ENV=production`**. O painel envia o token no header `Authorization: Bearer …` (preferido); a API também aceita `X-Monitor-Token` ou `?token=` para scripts legados. O valor fica em `sessionStorage` após “Definir token”.
2. **`EVENT_LOG`** (binding KV opcional): sem KV, o Worker ainda registra tentativas em memória isolada por invocação de forma limitada — para **histórico persistente** entre requests, crie um namespace KV, descomente `[[kv_namespaces]]` no `wrangler.toml` e faça deploy.

## Ferramentas

- Código: [`monitor/page.js`](../monitor/page.js), [`monitor/router.js`](../monitor/router.js), [`monitor/store.js`](../monitor/store.js), integração em [`worker.js`](../worker.js).

## Edge cases

- **401 na API**: token ausente ou incorreto em produção.
- **Lista vazia com KV**: ainda não houve POST `/event` após configurar o KV, ou concorrência muito alta (perda ocasional de escrita no anel — aceitável para diagnóstico).
- **Privacidade**: não armazenamos IP completo nem token Meta; só metadados de evento e URL truncada.

## Manutenção

Se alterar rotas ou esquema do log, atualize este arquivo e o texto de ajuda no painel em `monitor/page.js`.
