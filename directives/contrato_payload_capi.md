# Contrato de payload: `tracker.js` → `worker.js` (Meta CAPI)

## Endpoint HTTP

- **Método**: `POST`
- **URL**: configurada no site via `data-endpoint` no `<script>` ou `window.__META_TRACKER_ENDPOINT__` (ex.: `https://<worker>/event`; também aceitos: `/collect`, `POST /`).
- **Corpo**: JSON (`Content-Type: application/json`).

## Corpo enviado pelo browser (schema `meta-capi-v1`)

| Campo | Tipo | Obrigatório | Descrição |
|--------|------|-------------|------------|
| `schema` | string | sim | Fixo: `meta-capi-v1` |
| `event_name` | string | sim | Ex.: `PageView`, `Lead`, `Purchase` |
| `event_id` | string | sim | UUID v4 para desduplicação |
| `event_time` | number | sim | Unix em **segundos** |
| `event_source_url` | string | sim | URL atual da página |
| `referrer_url` | string | não | `document.referrer` |
| `action_source` | string | sim | Fixo: `website` |
| `custom_data` | object | não | Campos do evento (valor, moeda, contents, etc.) |
| `user_data` | object | não | `fbp`, `fbc`, hashes (`em`, `ph`, …). O Worker completa `client_ip_address` e `client_user_agent` a partir da requisição HTTP se necessário |

## O que o Worker adiciona / prioriza

- `user_data.client_ip_address`: `CF-Connecting-IP` (fallback `True-Client-IP`, `X-Real-IP`).
- `user_data.client_user_agent`: cabeçalho `User-Agent` da requisição ao Worker (browser), salvo se já vier no JSON.

## Resposta do Worker

- **200**: `{ "ok": true, "event_id": "...", "meta": { ... resposta Graph API ... } }`
- **500**: `{ "ok": false, "error": "...", ... }` (configuração, JSON inválido, erro Graph API, etc.)

## Variáveis de ambiente (replicação por cliente)

Ver [.env.example](../.env.example), `wrangler.toml` e [config_ambiente.md](config_ambiente.md). Troca de cliente: **mesmo código**, novos valores de `PIXEL_ID`, `META_ACCESS_TOKEN`, `ALLOWED_ORIGINS`, `META_API_VERSION`.

Se `TEST_EVENT_CODE` estiver definido no Worker (ex.: `TEST7356`), o backend inclui `test_event_code` no JSON enviado à Meta — os eventos aparecem em **Testar eventos** no Events Manager, não na atribuição real. Remova a variável após validar.
