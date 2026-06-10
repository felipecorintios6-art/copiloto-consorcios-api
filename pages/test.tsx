import Head from "next/head";
import { FormEvent, useMemo, useState } from "react";
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

const providers: AIProviderId[] = ["openai", "gemini", "deepseek", "openrouter"];

export default function TestPage() {
  const [provider, setProvider] = useState<AIProviderId>("openai");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const parsedPayload = JSON.parse(jsonInput);
      const response = await fetch(`/api/suggest-response?provider=${provider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsedPayload)
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
          <select
            aria-label="Provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as AIProviderId)}
          >
            {providers.map((providerOption) => (
              <option key={providerOption} value={providerOption}>
                {providerOption}
              </option>
            ))}
          </select>
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
