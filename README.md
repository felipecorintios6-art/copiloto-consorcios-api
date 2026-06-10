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
```

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
3. Configure as variaveis de ambiente:
   - `AI_PROVIDER`
   - `AI_MODEL`
   - `DEEPSEEK_API_KEY`
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
4. Faca o deploy.

Build:

```bash
npm run build
```

## Observacoes

A rota `/test` existe apenas para facilitar testes do motor de IA. Ela nao e um CRM, nao armazena dados e nao implementa historico.
