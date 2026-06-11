import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MemorySummary } from "@/lib/types/memory";

type LoadState = {
  data: MemorySummary | null;
  error: string;
  isLoading: boolean;
};

export default function MemoryPage() {
  const [state, setState] = useState<LoadState>({
    data: null,
    error: "",
    isLoading: true
  });

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const response = await fetch("/api/memory-summary");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Nao foi possivel carregar a memoria.");
        }

        if (active) {
          setState({
            data,
            error: "",
            isLoading: false
          });
        }
      } catch (error) {
        if (active) {
          setState({
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Erro inesperado ao carregar memoria.",
            isLoading: false
          });
        }
      }
    }

    loadSummary();

    return () => {
      active = false;
    };
  }, []);

  const stats = [
    {
      label: "Empresas cadastradas",
      value: state.data?.companies ?? 0
    },
    {
      label: "Leads importados",
      value: state.data?.leads ?? 0
    },
    {
      label: "Conversas importadas",
      value: state.data?.conversations ?? 0
    },
    {
      label: "Mensagens armazenadas",
      value: state.data?.messages ?? 0
    }
  ];

  return (
    <>
      <Head>
        <title>Memoria Comercial | Copiloto Consorcios API</title>
      </Head>
      <main className="test-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Copiloto Consorcios API</p>
            <h1>Memoria Comercial</h1>
          </div>
          <Link className="button primary" href="/memory/import">
            Importar conversas
          </Link>
        </header>

        {state.error ? <pre className="compact-error">{state.error}</pre> : null}

        <section className="stats-grid">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{state.isLoading ? "..." : stat.value}</strong>
            </div>
          ))}
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <h2>Empresas recentes</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Criada em</th>
                </tr>
              </thead>
              <tbody>
                {state.data?.recentCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{new Date(company.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {!state.isLoading && state.data?.recentCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={2}>Nenhuma empresa cadastrada ainda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
