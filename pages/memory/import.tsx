import Head from "next/head";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ImportBatchResult } from "@/lib/types/memory";

type ImportState = {
  result: ImportBatchResult | null;
  error: string;
  isLoading: boolean;
};

const samplePayload = {
  company: {
    external_id: "empresa-001",
    name: "Empresa Exemplo"
  },
  lead: {
    external_id: "lead-001",
    name: "Maria Silva",
    phone: "11999999999",
    city: "Sao Paulo",
    state: "SP",
    source: "CRM",
    category: "Consorcio auto",
    credit_value: "80000",
    entry_value: "5000",
    status: "novo"
  },
  conversation: {
    external_id: "conversa-001",
    consultant_id: "consultor-001",
    consultant_name: "Joao SDR",
    status: "em_atendimento",
    result: "em_andamento",
    started_at: "2026-06-11T10:00:00Z"
  },
  messages: [
    {
      external_id: "msg-001",
      sender_type: "lead",
      message_text: "Tenho interesse em consorcio.",
      created_at: "2026-06-11T10:01:00Z"
    }
  ],
  result: {
    status: "em_atendimento",
    result: "em_andamento",
    loss_reason: null
  }
};

export default function MemoryImportPage() {
  const [jsonText, setJsonText] = useState("");
  const [state, setState] = useState<ImportState>({
    result: null,
    error: "",
    isLoading: false
  });

  const importedTotal = useMemo(() => {
    if (!state.result) {
      return 0;
    }

    return (
      state.result.companiesCreated +
      state.result.companiesUpdated +
      state.result.leadsCreated +
      state.result.leadsUpdated +
      state.result.conversationsCreated +
      state.result.conversationsUpdated +
      state.result.messagesCreated +
      state.result.resultsCreated
    );
  }, [state.result]);

  async function handleImport() {
    setState({
      result: null,
      error: "",
      isLoading: true
    });

    try {
      const payload = JSON.parse(jsonText);
      const response = await fetch("/api/memory/import-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Importacao nao concluida.");
      }

      setState({
        result: data.imported,
        error: "",
        isLoading: false
      });
    } catch (error) {
      setState({
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado na importacao.",
        isLoading: false
      });
    }
  }

  function fillSample() {
    setJsonText(JSON.stringify(samplePayload, null, 2));
    setState({
      result: null,
      error: "",
      isLoading: false
    });
  }

  return (
    <>
      <Head>
        <title>Importar memoria | Copiloto Consorcios API</title>
      </Head>
      <main className="test-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Memoria Comercial</p>
            <h1>Importar dados historicos</h1>
          </div>
          <Link className="button" href="/memory">
            Ver memoria
          </Link>
        </header>

        <section className="panel import-panel">
          <div className="panel-header">
            <h2>JSON do CRM</h2>
          </div>
          <div className="import-body">
            <textarea
              className="json-input"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              placeholder="Cole aqui o JSON com company, lead, conversation, messages e result"
              spellCheck={false}
            />
            <div className="actions-row">
              <button
                className="button primary"
                disabled={!jsonText.trim() || state.isLoading}
                type="button"
                onClick={handleImport}
              >
                {state.isLoading ? "Importando..." : "Importar"}
              </button>
              <button className="button" type="button" onClick={fillSample}>
                Usar exemplo
              </button>
            </div>

            {state.error ? <pre className="compact-error">{state.error}</pre> : null}

            {state.result ? (
              <div className="import-report">
                <strong>Importacao concluida</strong>
                <span>Registros processados: {importedTotal}</span>
                <span>Empresas criadas: {state.result.companiesCreated}</span>
                <span>Empresas atualizadas: {state.result.companiesUpdated}</span>
                <span>Leads criados: {state.result.leadsCreated}</span>
                <span>Leads atualizados: {state.result.leadsUpdated}</span>
                <span>Conversas criadas: {state.result.conversationsCreated}</span>
                <span>Conversas atualizadas: {state.result.conversationsUpdated}</span>
                <span>Mensagens criadas: {state.result.messagesCreated}</span>
                <span>Mensagens ignoradas: {state.result.messagesSkipped}</span>
                <span>Resultados criados: {state.result.resultsCreated}</span>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
