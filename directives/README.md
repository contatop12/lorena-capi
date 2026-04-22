# Diretivas do projeto

Documentação operacional e técnica — leia na ordem sugerida ao integrar ou replicar para um novo cliente.

| Arquivo | Conteúdo |
| -------- | ----------- |
| [config_ambiente.md](config_ambiente.md) | Tabela de variáveis, `.env` / Wrangler / replicação |
| [config_segredos.md](config_segredos.md) | Higiene de tokens e `wrangler secret put` |
| [framework_capi_playbook.md](framework_capi_playbook.md) | Framework padrão: arquitetura, snippets, webhook e go-live |
| [contrato_payload_capi.md](contrato_payload_capi.md) | JSON browser → Worker → Meta CAPI |
| [checklist_validacao_integracao.md](checklist_validacao_integracao.md) | Testes de CORS, eventos e erros |
| [producao_worker_meta_capi.md](producao_worker_meta_capi.md) | SOP e checklist de produção |
| [monitor_painel.md](monitor_painel.md) | Painel `/dashboard`, KV `EVENT_LOG`, token |
| [cliente_lorena_lcoadv.md](cliente_lorena_lcoadv.md) | Notas do cliente ativo de referência |

Código principal: `worker.js`, `tracker.js`, `wrangler.toml`, pasta `monitor/`.
