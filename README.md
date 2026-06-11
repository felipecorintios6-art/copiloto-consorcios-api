# Copiloto Consorcios API

Motor de inteligencia para um Copiloto Comercial especializado em consorcios.

Este projeto nao e um CRM e nao e uma interface final de atendimento. Ele e uma API preparada para ser conectada futuramente a CRMs, WhatsApp, aplicativos, dashboards e sistemas internos.

## Stack

- Next.js
- TypeScript
- API Routes
- Arquitetura limpa
- Pronto para deploy na Vercel

## Instalacao

```bash
npm install
npm run dev
```

Acesse:

- Teste visual: `http://localhost:3000/test`
- Endpoint: `POST http://localhost:3000/api/suggest-response`

## Configuracao

Crie um arquivo `.env.local` baseado em `.env.example`:

```env
AI_PROVIDER=openai
AI_MODEL=

DEEPSEEK_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
OPENROUTER_NEAR_LIMIT_MARGIN=0.1
OPENROUTER_COOLDOWN_MINUTES=15

SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_SECRET=
```

Variaveis obrigatorias para cada area:

- `/test` e `/api/suggest-response`: configure pelo menos a chave do provider escolhido em `AI_PROVIDER`.
- `/memory` e `/api/memory/*`: configure `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL`, alem de `SUPABASE_SERVICE_ROLE_KEY`.
- Gerenciador de capacidade OpenRouter: configure Supabase, `SUPABASE_SERVICE_ROLE_KEY` e `ENCRYPTION_SECRET`.

Sem Supabase configurado, `/test` e `/api/suggest-response` continuam funcionando normalmente. Apenas `/memory` e `/api/memory/*` dependem do Supabase.

## Memoria comercial com Supabase

As tabelas e indices estao em `supabase/migrations/001_memory_schema.sql`.

Rotas internas de memoria:

- `POST /api/memory/import-company`
- `POST /api/memory/import-lead`
- `POST /api/memory/import-conversation`
- `POST /api/memory/import-message`
- `POST /api/memory/import-batch`
- `GET /api/memory/summary`
- `GET /api/memory/health`

O endpoint `/api/memory/import-batch` recebe:

```json
{
  "company": {
    "external_id": "empresa-001",
    "name": "Empresa Exemplo"
  },
  "lead": {
    "external_id": "lead-001",
    "name": "Maria Silva",
    "phone": "11999999999",
    "city": "Sao Paulo",
    "state": "SP",
    "source": "CRM",
    "category": "Consorcio auto",
    "credit_value": "80000",
    "entry_value": "5000",
    "status": "novo"
  },
  "conversation": {
    "external_id": "conversa-001",
    "consultant_id": "consultor-001",
    "consultant_name": "Joao SDR",
    "status": "em_atendimento",
    "result": "em_andamento",
    "started_at": "2026-06-11T10:00:00Z"
  },
  "messages": [
    {
      "external_id": "msg-001",
      "sender_type": "lead",
      "message_text": "Tenho interesse em consorcio.",
      "created_at": "2026-06-11T10:01:00Z"
    }
  ],
  "result": {
    "status": "em_atendimento",
    "result": "em_andamento",
    "loss_reason": null
  }
}
```

As rotas `/api/memory/*` exigem `SUPABASE_URL` ou `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. A chave service role fica somente no backend.

Seguranca:

- `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser usada em componentes React, paginas frontend ou variaveis `NEXT_PUBLIC_*`.
- `NEXT_PUBLIC_SUPABASE_URL` contem apenas a URL publica do projeto Supabase.
- `.env.local` nao deve ser commitado.
- O SQL da memoria fica em `supabase/migrations/001_memory_schema.sql`.

`AI_PROVIDER` aceita:

- `openai`
- `gemini`
- `deepseek`
- `openrouter`

`AI_MODEL` e opcional. Se ficar vazio, cada provider usa seu modelo padrao.

Modelos padrao:

- OpenAI: `gpt-4.1-mini`
- Gemini: `gemini-1.5-flash`
- DeepSeek: `deepseek-chat`
- OpenRouter: `openrouter/free`

## Endpoint inicial

### `POST /api/suggest-response`

Entrada:

```json
{
  "company": {
    "name": "Nome da empresa",
    "objective": "Objetivo principal"
  },
  "lead": {
    "name": "Nome do lead",
    "credit_value": "Valor do credito",
    "entry_value": "Valor de entrada",
    "category": "Categoria",
    "city": "Cidade"
  },
  "conversation": [
    {
      "sender": "lead",
      "message": "Mensagem"
    }
  ]
}
```

Saida:

```json
{
  "suggestion": "",
  "lead_temperature": "",
  "detected_objection": "",
  "next_action": ""
}
```

Para testar um provider especifico sem mudar o `.env.local`, use:

```bash
POST /api/suggest-response?provider=gemini
```

ou envie o header:

```http
x-ai-provider: gemini
```

## Arquitetura

Estrutura principal:

```txt
lib/
  ai/
    providers/
    generateAIResponse.ts
  agents/
  prompts/
  types/
  utils/
pages/
  api/
    suggest-response.ts
  test.tsx
```

Responsabilidades:

- `pages/api/suggest-response.ts`: camada HTTP.
- `lib/agents/consortiumSalesAgent.ts`: orquestra o agente comercial.
- `lib/prompts/consortiumSalesPrompt.ts`: regras e comportamento do agente.
- `lib/ai/generateAIResponse.ts`: unica entrada para chamadas de IA.
- `lib/ai/providers/*`: adaptadores de provedores.
- `lib/types/*`: contratos compartilhados.
- `lib/utils/*`: validacao e utilitarios.

Toda chamada de IA deve passar por:

```ts
generateAIResponse()
```

Assim, endpoints e agentes nao precisam conhecer detalhes de DeepSeek, Gemini, OpenAI ou provedores futuros.

## Regras do agente

O agente foi preparado para:

- analisar conversas;
- sugerir respostas;
- identificar objecoes;
- identificar intencao;
- ajudar consultores comerciais;
- conduzir para escritorio, videochamada ou atendimento especializado quando fizer sentido.

Regras obrigatorias:

- responder sempre em portugues brasileiro;
- nunca gerar textoes;
- nunca prometer contemplacao;
- nunca prometer aprovacao;
- nunca inventar taxas;
- nunca inventar condicoes comerciais;
- nunca substituir decisoes comerciais humanas;
- fazer perguntas objetivas;
- usar dados do simulador quando existirem;
- considerar o contexto da conversa.

## Como adicionar novos modelos ou providers

1. Crie um arquivo em `lib/ai/providers`, por exemplo `anthropic.ts`.
2. Implemente a interface `AIProvider`.
3. Registre o provider em `lib/ai/providers/index.ts`.
4. Adicione o novo identificador em `lib/types/ai.ts`.
5. Configure uma nova variavel de ambiente se necessario.

Os endpoints nao precisam ser alterados se continuarem usando `generateAIResponse()`.

## Como conectar futuros CRMs

O CRM deve chamar o endpoint HTTP e enviar o contexto da empresa, os dados do lead e o historico da conversa.

Exemplo de fluxo futuro:

1. CRM recebe ou atualiza uma conversa.
2. CRM envia os dados para `/api/suggest-response`.
3. Copiloto retorna sugestao, temperatura, objecao e proxima acao.
4. CRM exibe a recomendacao para o consultor.

Quando o projeto evoluir, podem ser adicionadas camadas antes do agente para:

- buscar historico no banco de dados;
- carregar memoria por empresa;
- aplicar regras comerciais da operacao;
- registrar feedback do consultor;
- classificar leads;
- iniciar atendimento autonomo supervisionado.

Essas capacidades ainda nao foram implementadas, mas a estrutura ja separa HTTP, agente, prompt e provider para suportar esse crescimento.

## Deploy na Vercel

1. Suba o projeto para um repositorio Git.
2. Importe o repositorio na Vercel.
3. Abra o projeto na Vercel.
4. Va em `Settings` > `Environment Variables`.
5. Em `Key`, cole o nome da variavel.
6. Em `Value`, cole o valor correspondente.
7. Em `Environment`, selecione `Production`, `Preview` e `Development` se quiser usar a mesma configuracao em todos os ambientes.
8. Clique em `Save`.
9. Faca um novo deploy.

Variaveis para colar na Vercel:

- `AI_PROVIDER`: provider padrao de IA, por exemplo `openai`, `gemini`, `deepseek` ou `openrouter`.
- `AI_MODEL`: opcional; deixe vazio se quiser usar o modelo padrao do provider.
- `OPENAI_API_KEY`: cole somente se usar OpenAI.
- `GEMINI_API_KEY`: cole somente se usar Gemini.
- `DEEPSEEK_API_KEY`: cole somente se usar DeepSeek.
- `OPENROUTER_API_KEY`: cole somente se usar OpenRouter direto, sem gerenciador de capacidade.
- `OPENROUTER_MODEL`: opcional; padrao `openrouter/free`.
- `OPENROUTER_NEAR_LIMIT_MARGIN`: opcional; padrao `0.1`.
- `OPENROUTER_COOLDOWN_MINUTES`: opcional; padrao `15`.
- `NEXT_PUBLIC_SUPABASE_URL`: cole a URL do projeto Supabase. Esta variavel pode ser publica.
- `SUPABASE_URL`: cole a mesma URL do projeto Supabase para uso no backend.
- `SUPABASE_SERVICE_ROLE_KEY`: cole a service role key do Supabase. Marque como variavel sensivel se a Vercel oferecer essa opcao.
- `ENCRYPTION_SECRET`: cole uma string longa e privada se for usar o gerenciador de chaves OpenRouter.

Checklist Supabase:

1. Criar ou abrir o projeto no Supabase.
2. Executar `supabase/migrations/001_memory_schema.sql` no SQL Editor do Supabase.
3. Na Vercel, configurar `NEXT_PUBLIC_SUPABASE_URL`.
4. Na Vercel, configurar `SUPABASE_URL`.
5. Na Vercel, configurar `SUPABASE_SERVICE_ROLE_KEY`.
6. Fazer redeploy na Vercel.
7. Abrir `/test` e confirmar que o motor atual continua funcionando.
8. Abrir `/api/memory/health` e confirmar `ok: true`.
9. Abrir `/memory` e confirmar que os contadores carregam.
10. Abrir `/memory/import`, usar o exemplo e importar um lote de teste.
11. Confirmar no Supabase se os registros apareceram nas tabelas.

Build:

```bash
npm run build
```

## Observacoes

A rota `/test` existe apenas para facilitar testes do motor de IA. Ela nao e um CRM, nao armazena dados e nao implementa historico.

## Gerenciamento de capacidade OpenRouter

O projeto tambem possui uma camada para operar multiplas chaves OpenRouter com controle de capacidade.

Rotas administrativas:

- `/admin/openrouter-keys`: dashboard de chaves, uso diario, concorrencia, cooldown e erros recentes.
- `GET /api/admin/openrouter-keys`: lista chaves sem expor o valor completo.
- `POST /api/admin/openrouter-keys`: cria chave criptografada.
- `PATCH /api/admin/openrouter-keys/[id]`: atualiza status, limites, modelo, prioridade ou cooldown.
- `DELETE /api/admin/openrouter-keys/[id]`: remove chave.
- `POST /api/admin/process-ai-queue`: processador simples de fila.

Tabelas usadas:

- `openrouter_keys`
- `openrouter_key_usage_logs`
- `ai_request_queue`

Seguranca:

- A chave completa nunca e enviada ao frontend.
- A chave e salva em `api_key_encrypted`.
- O dashboard mostra apenas `key_preview`.
- Configure `ENCRYPTION_SECRET` antes de cadastrar chaves.
- Para testes sem Supabase, o provider OpenRouter pode usar `OPENROUTER_API_KEY` diretamente.
- Quando `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `ENCRYPTION_SECRET` estiverem configuradas, o provider usa o gerenciador de capacidade.

Regras operacionais:

- `selectAvailableOpenRouterKey()` escolhe chave ativa, fora de cooldown, com saldo diario e concorrencia disponivel.
- `recordOpenRouterUsage()` registra sucesso, erro, tokens e aplica cooldown quando houver rate limit.
- `releaseOpenRouterKey()` reduz concorrencia ao final da chamada.
- Quando nao houver chave disponivel, a requisicao e salva em `ai_request_queue`.
- Chaves com `tenant_id` sao isoladas de chaves globais ou de outros tenants.
