# Prompt para o v0 — Tracking Meta unificado (Browser + CAPI)

Quero que você implemente tracking de conversão **Meta Browser + CAPI unificado** neste projeto.

## Objetivo

Substituir o tracking antigo de Lead por uma versão de maior qualidade, disparada por código no sucesso real do formulário, usando `window.MetaTracker.track`.

## Requisitos obrigatórios

1. **Adicionar no `<head>` global** (todas as páginas):

```html
<script
  src="https://track.lcoadv.com.br/trackerjs"
  data-endpoint="https://track.lcoadv.com.br/event"
  data-pixel-id="993975279878737"
  async
></script>
```

2. **Remover tracking antigo de Lead** baseado nesta função (ou equivalente):

```js
function trackLead(email, name, phone) { ... }
```

3. **Criar nova função global** `trackLeadHighQuality(data)` com este comportamento:
   - verifica se `window.MetaTracker.track` existe
   - dispara evento `Lead`
   - usa `custom_data` com:
     - `form_name: "contato_principal"`
     - `channel: "whatsapp"`
     - `page_path: location.pathname`
     - `value: 1`
     - `currency: "BRL"`
   - usa `user_data` com:
     - `em, ph, fn, ln, ct, st, zp, country, external_id`
   - trata erro com `console.warn("MetaTracker Lead error:", e)`

4. **Disparar `trackLeadHighQuality` somente no sucesso real do formulário**, não no clique do botão.

5. Se houver múltiplos formulários, aplicar somente nos formulários de conversão principal (lead/contato/whatsapp).

6. Não quebrar funcionalidades existentes do formulário.

## Implementação da função

```html
<script>
  function trackLeadHighQuality(data) {
    if (!window.MetaTracker?.track) return;

    window.MetaTracker.track("Lead", {
      custom_data: {
        form_name: "contato_principal",
        channel: "whatsapp",
        page_path: location.pathname,
        value: 1,
        currency: "BRL"
      },
      user_data: {
        em: data.email || undefined,
        ph: data.phone || undefined,
        fn: data.firstName || undefined,
        ln: data.lastName || undefined,
        ct: data.city || undefined,
        st: data.state || undefined,
        zp: data.zip || undefined,
        country: "br",
        external_id: data.crmId || undefined
      }
    }).catch(function (e) {
      console.warn("MetaTracker Lead error:", e);
    });
  }
</script>
```

## Exemplo de chamada no sucesso do formulário

```js
trackLeadHighQuality({
  email: formData.email,
  phone: formData.phone,
  firstName: formData.firstName,
  lastName: formData.lastName,
  city: formData.city,
  state: formData.state,
  zip: formData.zip,
  crmId: formData.crmId
});
```

## Critérios de aceite

- `trackerjs` carregando com status 200 no Network
- evento `Lead` sendo disparado no sucesso do formulário
- request para `https://track.lcoadv.com.br/event` retornando sucesso
- sem duplicidade de implementação antiga de Lead

No final, me mostre:

- quais arquivos foram alterados
- onde a função foi adicionada
- onde o disparo foi conectado no fluxo de sucesso
