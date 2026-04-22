# Configuração por ambiente — replicação entre clientes

O código (`tracker.js`, `worker.js`) é **fixo** entre clientes. O que muda é **configuração** e **URL do Worker** no site.

## Chaves padronizadas (mesmo nome em todo lugar)

| Chave | Onde definir (produção Cloudflare) | Onde definir (dev local) | Segredo? |
|--------|-------------------------------------|---------------------------|----------|
| `PIXEL_ID` | Dashboard Worker → Vars / `[vars]` no `wrangler.toml` | `.dev.vars` ou `[vars]` | Não |
| `META_ACCESS_TOKEN` | `wrangler secret put META_ACCESS_TOKEN` ou Dashboard | `.dev.vars` | **Sim** |
| `META_API_VERSION` | `[vars]` / Dashboard | `.dev.vars` / `[vars]` | Não |
| `ALLOWED_ORIGINS` | `[vars]` — lista CSV HTTPS; **produção: explícito** | `.dev.vars` / `[vars]` | Não |
| `WORKER_ENV` | `production` ou `development` | `.dev.vars` / `[vars]` | Não |
| `TEST_EVENT_CODE` | Opcional (Events Manager) | secret ou var | Não |
| `EXPOSE_META_ERRORS` | `true`/`false` — detalhe de erro Meta na resposta | `[vars]` | Não |
| `WORKER_EVENT_URL` | Referência humana / snippet no site (não lida pelo Worker) | `.env` / comentário | Não |
| `MONITOR_TOKEN` | Painel `/dashboard` e `GET /api/monitor/events` | `wrangler secret put MONITOR_TOKEN` ou `[vars]` em dev | **Sim** (produção) |
| `EVENT_LOG` | Binding KV opcional — histórico do monitor entre invocações | `wrangler.toml` `[[kv_namespaces]]` | Não |

## Arquivos de referência no repositório

- **Segredos e gitignore**: [config_segredos.md](config_segredos.md).
- **Modelo humano / CI**: [`.env.example`](../.env.example) — documenta todas as chaves; copie para `.env` na sua máquina se quiser um único arquivo de referência (o Worker na Cloudflare **não** lê `.env` automaticamente).
- **Wrangler local**: [`.dev.vars.example`](../.dev.vars.example) → copie para `.dev.vars` (gitignored) com os mesmos nomes de chave.
- **Deploy**: [wrangler.toml](../wrangler.toml) — `name` do worker por cliente; `[vars]` espelha `PIXEL_ID`, `META_API_VERSION`, `ALLOWED_ORIGINS`; token só via **secret**.

## Site do cliente (tracker)

O browser não acessa seu `.env`. Obrigatório expor a URL do Worker no HTML:

```html
<script
  src="/caminho/tracker.js"
  data-endpoint="https://<worker-do-cliente>/event"
  async
></script>
```

Use o mesmo host que estiver em `WORKER_EVENT_URL` no seu `.env` (comentário de referência em `.env.example`).

## Fluxo por novo cliente

1. Duplicar projeto / mesmo repositório com novo `name` no `wrangler.toml` (ou outro worker).
2. Preencher `PIXEL_ID`, `ALLOWED_ORIGINS`, `META_API_VERSION` (vars) e configurar secret `META_ACCESS_TOKEN`.
3. Publicar o Worker e colocar a URL **`/event`** (recomendado) ou `/collect` em `data-endpoint` no site.

Contrato JSON browser → Worker: [contrato_payload_capi.md](contrato_payload_capi.md).

SOP de produção: [producao_worker_meta_capi.md](producao_worker_meta_capi.md).
