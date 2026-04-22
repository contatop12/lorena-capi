Aja como um Engenheiro de Dados e Desenvolvedor Full-Stack sênior, especialista em Server-Side Tracking, Cloudflare Workers e Meta Graph API.

Objetivo do Projeto:
Quero construir um sistema de traqueamento Server-Side para a API de Conversões (CAPI) do Meta Ads. O objetivo é substituir o Google Tag Manager (GTM) Server e o Stape.io por uma infraestrutura própria e gratuita utilizando Cloudflare Workers.

A arquitetura será dividida em duas partes:

Um script de Frontend (Vanilla JavaScript) super leve.

Um backend no Cloudflare Workers para processar e enviar os dados para o Meta.

Requisitos Técnicos do Frontend (tracker.js):

Deve ser escrito em JavaScript puro (Vanilla JS), otimizado e minificável, para ser inserido no <head> dos sites dos meus clientes.

Deve capturar a URL atual, Referrer e gerar um event_id único (padrão UUID v4) para desduplicação no Facebook.

Deve ler e gerenciar os cookies do Meta (_fbp e _fbc), gerando o _fbp caso ele não exista.

Deve enviar um evento 'PageView' automático no carregamento da página.

Deve expor uma função global (ex: window.MetaTracker.track(eventName, eventData)) para disparar eventos manuais como 'Lead', 'AddToCart' e 'Purchase'.

A comunicação com o Worker deve ser feita via fetch (método POST).

Requisitos Técnicos do Backend (worker.js):

Deve ser um Cloudflare Worker moderno (usando a sintaxe de ES Modules: export default { fetch(...) }).

Precisa receber o POST do frontend e extrair os dados do evento.

CRÍTICO: Deve capturar os cabeçalhos da requisição originais do usuário, especificamente o IP (cf-connecting-ip ou x-real-ip) e o User-Agent, pois são obrigatórios para a qualidade de correspondência da CAPI.

Deve montar o payload JSON seguindo estritamente a documentação da Meta CAPI (v19.0 ou superior).

As credenciais PIXEL_ID e META_ACCESS_TOKEN devem ser tratadas como Variáveis de Ambiente (env), para que eu possa replicar esse Worker facilmente para diferentes clientes sem alterar o código.

Deve ter um tratamento de CORS robusto, permitindo requisições de origens específicas (ou * na fase de testes) e respondendo corretamente ao método OPTIONS (Preflight).

Retornar respostas claras de sucesso ou erro (HTTP 200 ou 500).

Instruções de Saída:

Crie os dois arquivos completos e comentados: tracker.js e worker.js.

Crie também um arquivo wrangler.toml básico de exemplo para o deploy do Worker.

Após gerar os códigos, me dê um passo a passo curto de como testar isso localmente ou publicar na Cloudflare.

Vá em frente e construa a base do projeto.