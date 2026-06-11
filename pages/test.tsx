import Head from "next/head";
import { FormEvent, useMemo, useState } from "react";
import {
  OPENROUTER_MODELS,
  type OpenRouterModelId
} from "@/lib/ai/openrouter-models";
import type { AIProviderId } from "@/lib/types/ai";
import type { SuggestResponseResult } from "@/lib/types/consorcios";

const samplePayload = {
  company: {
    name: "Consorcios Prime",
    objective: "Levar o lead para uma videochamada consultiva"
  },
  lead: {
    name: "Mariana",
    credit_value: "R$ 180.000",
    entry_value: "R$ 15.000",
    category: "Imovel",
    city: "Sao Paulo"
  },
  conversation: [
    {
      sender: "lead",
      message:
        "Tenho interesse, mas queria entender se tem como garantir quando sai a contemplacao."
    }
  ]
};

const providers: Array<{
  id: AIProviderId;
  label: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter"
  },
  {
    id: "openai",
    label: "OpenAI"
  },
  {
    id: "gemini",
    label: "Gemini"
  },
  {
    id: "deepseek",
    label: "DeepSeek"
  }
];

function getProviderLabel(provider: AIProviderId) {
  return (
    providers.find((providerOption) => providerOption.id === provider)?.label ??
    provider
  );
}

export default function TestPage() {
  const [provider, setProvider] = useState<AIProviderId>("openrouter");
  const [selectedOpenRouterModelId, setSelectedOpenRouterModelId] =
    useState<OpenRouterModelId>("openrouter-auto");
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(samplePayload, null, 2)
  );
  const [result, setResult] = useState<SuggestResponseResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resultText = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ""),
    [result]
  );
  const selectedOpenRouterModel = OPENROUTER_MODELS.find(
    (model) => model.id === selectedOpenRouterModelId
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const parsedPayload = JSON.parse(jsonInput);
      const response = await fetch("/api/suggest-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsedPayload,
          provider,
          selected_model_id:
            provider === "openrouter" ? selectedOpenRouterModelId : undefined
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel gerar a sugestao.");
      }

      setResult(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro inesperado."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Teste | Copiloto Consorcios API</title>
      </Head>
      <main className="test-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Copiloto Consorcios API</p>
            <h1>Teste do motor</h1>
          </div>
          <div className="test-controls">
            <label>
              <span>Provider</span>
              <select
                aria-label="Provider"
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as AIProviderId)
                }
              >
                {providers.map((providerOption) => (
                  <option key={providerOption.id} value={providerOption.id}>
                    {providerOption.label}
                  </option>
                ))}
              </select>
            </label>
            {provider === "openrouter" ? (
              <label>
                <span>IA do OpenRouter</span>
                <select
                  aria-label="IA do OpenRouter"
                  value={selectedOpenRouterModelId}
                  onChange={(event) =>
                    setSelectedOpenRouterModelId(
                      event.target.value as OpenRouterModelId
                    )
                  }
                >
                  {OPENROUTER_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </header>

        <form className="workspace" onSubmit={handleSubmit}>
          <section className="editor panel">
            <div className="panel-header">
              <h2>Entrada JSON</h2>
              <button className="button primary" disabled={isLoading} type="submit">
                {isLoading ? "Analisando..." : "Sugerir Resposta"}
              </button>
            </div>
            <textarea
              spellCheck={false}
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
            />
          </section>

          <section className="result panel">
            <div className="panel-header">
              <h2>Retorno</h2>
            </div>
            {result ? (
              <div className="result-meta">
                <span>
                  Provider:{" "}
                  {result.provider && providers.some((item) => item.id === result.provider)
                    ? getProviderLabel(result.provider as AIProviderId)
                    : getProviderLabel(provider)}
                </span>
                <span>
                  IA utilizada:{" "}
                  {result.ai_used ?? selectedOpenRouterModel?.label ?? "-"}
                </span>
              </div>
            ) : null}
            {error ? <pre className="error">{error}</pre> : null}
            {!error && result ? <pre>{resultText}</pre> : null}
            {!error && !result ? (
              <div className="empty-state">A resposta gerada aparecera aqui.</div>
            ) : null}
          </section>
        </form>
      </main>
    </>
  );
}
