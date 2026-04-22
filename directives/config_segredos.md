# Higiene de segredos

## O que nunca versionar

- Valores reais de `META_ACCESS_TOKEN`, `MONITOR_TOKEN` ou qualquer token de API.
- Arquivo `.dev.vars` (já no `.gitignore`) — só modelos em `.dev.vars.example`.

## Onde colocar segredos no Cloudflare

1. **Worker (produção / preview)**  
   ```bash
   wrangler secret put META_ACCESS_TOKEN
   wrangler secret put MONITOR_TOKEN
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
