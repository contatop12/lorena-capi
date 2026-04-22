# Checklist — conectividade, CORS e Meta CAPI

Use após configurar `PIXEL_ID`, `META_ACCESS_TOKEN`, `ALLOWED_ORIGINS` e o endpoint no `tracker.js`.

**Página mínima local:** [examples/test-page.html](../examples/test-page.html) — com Worker em dev, use `?endpoint=http://127.0.0.1:8787/collect` (ajuste porta se necessário).

## 1. Worker

- [ ] `POST /event` (ou `/collect`) retorna JSON (não HTML de erro).
- [ ] Sem `PIXEL_ID` ou `META_ACCESS_TOKEN`: resposta `500` com `error: "missing_env"`.
- [ ] Com credenciais válidas: resposta `200` com `ok: true` e corpo `meta` coerente com a Graph API.

## 2. CORS

- [ ] `OPTIONS /event` retorna `204` com cabeçalhos `Access-Control-Allow-*` corretos.
- [ ] Com `ALLOWED_ORIGINS` restrito: apenas origens listadas conseguem `POST` do browser; origem não listada falha no preflight ou na leitura da resposta.
- [ ] Com `ALLOWED_ORIGINS=*` (testes): requisições de qualquer origem aceitas.

## 3. Tracker (`tracker.js`)

- [ ] `<script src=".../tracker.js" data-endpoint="https://.../collect">` definido.
- [ ] No carregamento: um evento `PageView` é enviado (ver rede / resposta `200`).
- [ ] `_fbp` existe após primeira visita; com `?fbclid=` na URL, `_fbc` é criado/atualizado.
- [ ] `MetaTracker.track("Lead", { custom_data: { ... } })` retorna Promise e recebe `ok: true` em sucesso.

## 4. Replicação entre clientes

- [ ] Mesmos arquivos `tracker.js` e `worker.js`; apenas variáveis de ambiente (e URL `data-endpoint` do Worker do cliente) alteradas.
- [ ] Eventos aparecem no Test Events / Ads Manager para o pixel correto de cada ambiente.

## 5. Qualidade CAPI

- [ ] `user_data` no evento enviado à Meta inclui IP e User-Agent (via Worker).
- [ ] `event_id` único por disparo para permitir desduplicação com o pixel, se aplicável.
