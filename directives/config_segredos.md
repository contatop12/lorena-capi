# Higiene de segredos

## O que nunca versionar

- Valores reais de `META_ACCESS_TOKEN`, `MONITOR_TOKEN` ou qualquer token de API.
- Arquivo `.dev.vars` (já no `.gitignore`) — só modelos em `.dev.vars.example`.

## Onde colocar segredos no Cloudflare

1. **Worker (produção / preview)**  
   ```bash
   npx wrangler secret put META_ACCESS_TOKEN
   npx wrangler secret put MONITOR_TOKEN
   ```  
   Confirme no Dashboard do Worker em **Settings → Variables** que aparecem como *Secret*.

2. **Desenvolvimento local**  
   Copie `.dev.vars.example` → `.dev.vars` e preencha na sua máquina. Não faça commit de `.dev.vars`.

## Variáveis “públicas” vs segredas

- **Públicas** (`[vars]` / não secret): `PIXEL_ID`, `META_API_VERSION`, `ALLOWED_ORIGINS`, `WORKER_ENV`, `TEST_EVENT_CODE`, `EXPOSE_META_ERRORS`, `WORKER_EVENT_URL` (referência apenas).
- **Segredas**: `META_ACCESS_TOKEN` (obrigatório), `MONITOR_TOKEN` (recomendado em `WORKER_ENV=production`).

## Rotação e incidentes

- Em vazamento suspeito: revogue o token no Meta Business / regenere e rode `wrangler secret put` de novo.
- Não logue tokens em `console.log` do Worker nem em respostas ao browser (use `EXPOSE_META_ERRORS` só em diagnóstico controlado).

## Erro Cloudflare `10053` — “Binding name already in use”

Ao rodar `npx wrangler secret put META_ACCESS_TOKEN` (ou `MONITOR_TOKEN`), a API falha se **já existir uma variável com o mesmo nome** como **texto não criptografado** em **Workers → seu Worker → Settings → Variables**.

1. Abra o painel do Worker na Cloudflare.
2. Em **Variables**, localize a linha **`META_ACCESS_TOKEN`** (tipo texto / “Value” visível).
3. **Apague** essa variável (ícone de eliminar na linha).
4. Volte ao terminal e execute de novo: `npx wrangler secret put META_ACCESS_TOKEN`  
   **ou** em **Variables → Add → Secret**, crie `META_ACCESS_TOKEN` e cole o valor (equivalente ao `secret put`).

Enquanto o token existir só como texto plano, o Worker pode até receber pedidos, mas **não** deve tratar o binding como secret seguro; o ideal é **sempre** `META_ACCESS_TOKEN` como **Encrypted / Secret**.

O mesmo procedimento vale para `MONITOR_TOKEN` se aparecer o mesmo erro.
