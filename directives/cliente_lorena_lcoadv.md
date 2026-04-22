# Cliente: Lorena — LCOAdv (lcoadv.com.br)

## Segurança (obrigatório)

Um **token de acesso Meta** foi compartilhado em canal não seguro. Trate-o como **comprometido**:

1. Na Meta: **Configurações do app** / **Ferramentas** → revogue o token antigo e gere um **novo** com permissão para envio de eventos CAPI ao pixel correto.
2. Na Cloudflare: **Workers** → `conversao-api-meta` → **Settings** → **Variables and Secrets** → edite o secret **`META_ACCESS_TOKEN`** com o **novo** valor.
3. **Nunca** commite tokens em `wrangler.toml`, `.env` versionado ou diretivas no Git.

## Identificação (não sensível)

| Campo | Valor |
|--------|--------|
| Nome | Lorena Carvalho Advocacia / LCOAdv |
| Pixel (Conjunto de dados / Pixel ID) | `993975279878737` |
| Origem CORS (produção) | `https://www.lcoadv.com.br` |
| Worker (URL pública atual) | `https://conversao-api-meta.suporte-922.workers.dev` |
| Endpoint do tracker | `https://conversao-api-meta.suporte-922.workers.dev/event` |
| Test Events (`test_event_code`) | `TEST7356` (variável `TEST_EVENT_CODE` no Worker) |

Se o site também atender em `https://lcoadv.com.br` (sem `www`), inclua as **duas** origens em `ALLOWED_ORIGINS`, separadas por vírgula, para evitar bloqueio de CORS.

## Cloudflare Workers — o que configurar no painel

Como no deploy os **Bindings** aparecem em zero, defina no Worker:

### Variáveis (plain text)

- `PIXEL_ID` = `993975279878737`
- `META_API_VERSION` = `v21.0` (ou a versão que você usar na Graph API)
- `WORKER_ENV` = `production`
- `ALLOWED_ORIGINS` = `https://www.lcoadv.com.br` (e `https://lcoadv.com.br` se aplicável)
- `EXPOSE_META_ERRORS` = `false` (recomendado em produção)
- `TEST_EVENT_CODE` = `TEST7356` — enquanto testar conversões no **Testar eventos** do Events Manager; o Worker repassa ao Graph API no corpo da requisição.

### Secret

- `META_ACCESS_TOKEN` = **apenas** via **Encrypt** / tipo Secret no painel (ou `wrangler secret put META_ACCESS_TOKEN` de forma interativa, sem colar o token no histórico do terminal).

### Observabilidade

No painel do Worker, ative **Logs** / **Tracing** se quiser diagnóstico em tempo quase real (não substitui Harness, mas ajuda a ver `4xx/5xx` e latência).

## Integração no site [LCOAdv](https://www.lcoadv.com.br/)

Inclua **uma vez** no `<head>` (ajuste o `src` para onde hospedar o `tracker.js` — CDN, próprio domínio ou URL pública do asset):

```html
<script
  src="https://SEU-CDN-OU-DOMINIO/tracker.js"
  data-endpoint="https://conversao-api-meta.suporte-922.workers.dev/event"
  async
></script>
```

Eventos manuais (ex.: formulário “Falar com especialista”):

```html
<script>
  document.querySelector("#seu-botao").addEventListener("click", function () {
    if (window.MetaTracker && MetaTracker.track) {
      MetaTracker.track("Lead", { custom_data: { source: "cta_home" } });
    }
  });
</script>
```

## Verificação rápida

1. `GET https://conversao-api-meta.suporte-922.workers.dev/health` → `ok: true`, `worker_env: production`.
2. No site em produção, abra DevTools → **Network** → deve aparecer `POST` para `/event` com status **200** no primeiro carregamento (`PageView`).
3. Se **403** `cors_not_configured` / `origin_not_allowed`: confira `ALLOWED_ORIGINS` e a URL exata do site (com/sem `www`, `http` vs `https`).

## Manutenção (AGENTS.md)

Se a Meta ou a Cloudflare mudarem requisitos, atualize primeiro [`worker.js`](../worker.js), depois este arquivo e [`contrato_payload_capi.md`](contrato_payload_capi.md).
