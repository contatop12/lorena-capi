# Diretiva — Worker Meta CAPI em produção (Camada 1)

## Objetivo

Garantir que o endpoint Cloudflare Workers receba eventos do `tracker.js`, aplique CORS seguro e encaminhe à Meta Conversions API com qualidade de correspondência (IP + User-Agent).

## Entradas

- Código: [`worker.js`](../worker.js), [`tracker.js`](../tracker.js).
- Configuração: variáveis no painel Cloudflare ou `wrangler.toml` + secrets (espelhadas em [`.env.example`](../.env.example)).
- Contrato JSON: [`contrato_payload_capi.md`](contrato_payload_capi.md).

## Ferramentas / scripts

- Validação local de variáveis (sem chamar a Meta): [`execution/validate_env.py`](../execution/validate_env.py) — Camada 3.

## Configuração obrigatória em produção

1. `WORKER_ENV=production` (padrão no `wrangler.toml`).
2. `ALLOWED_ORIGINS`: lista **explícita** de origens (HTTPS), separadas por vírgula. **Não** use `*` nem vazio em produção.
3. `PIXEL_ID` e secret `META_ACCESS_TOKEN`.
4. `META_API_VERSION`: manter `v19.0` ou superior (ex.: `v21.0`).
5. Remover `TEST_EVENT_CODE` quando não estiver validando no Events Manager.

## Comportamento esperado

- `GET /health` ou `GET /`: JSON `{ ok, service, worker_env }`.
- `POST /event` (preferencial), `POST /collect` ou `POST /`: corpo JSON conforme contrato.
- `OPTIONS`: preflight com CORS alinhado à allowlist.
- Requisição browser com `Origin` e CORS inválido em produção: **403** antes da chamada à Meta (`cors_not_configured` ou `origin_not_allowed`).
- Erros Graph: HTTP **500**; detalhes da Meta só se `EXPOSE_META_ERRORS=true` (evitar vazamento em produção).

## Edge cases

- **Sem cabeçalho `Origin`**: típico de `curl`/Postman — o Worker pode processar se demais validações passarem; CORS continua irrelevante para esses clientes.
- **Corpo grande**: rejeitado acima de 256 KiB.
- **`Content-Type`**: deve incluir `application/json`.

## Saídas

- Evento aceito: **200** + `ok: true` + `event_id` + resumo `meta`.
- Falha: **500** (ou **403**/**415**/**413**) + JSON `{ ok: false, error: "..." }`.

## Manutenção (self-anneal)

Se a Meta alterar campos obrigatórios ou limites, atualize `worker.js`, depois este documento e [`contrato_payload_capi.md`](contrato_payload_capi.md).
