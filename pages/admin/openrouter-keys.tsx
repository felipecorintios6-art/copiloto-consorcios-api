import Head from "next/head";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type {
  CreateOpenRouterKeyInput,
  OpenRouterKeyHealth,
  OpenRouterKeyPublic
} from "@/lib/types/openrouterCapacity";

const healthLabels: Record<OpenRouterKeyHealth, string> = {
  active: "Ativa",
  near_limit: "Proxima do limite",
  cooldown: "Em cooldown",
  daily_limit_reached: "Limite diario atingido",
  inactive: "Inativa"
};

type FormState = CreateOpenRouterKeyInput;

const initialForm: FormState = {
  label: "",
  api_key: "",
  model: "openrouter/free",
  status: "active",
  priority: 0,
  daily_limit: 100,
  concurrent_limit: 1,
  tenant_id: "",
  notes: ""
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "-";
}

export default function OpenRouterKeysAdminPage() {
  const [keys, setKeys] = useState<OpenRouterKeyPublic[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadKeys = useCallback(async () => {
    setIsLoading(true);
    setFeedback("");

    try {
      const response = await fetch("/api/admin/openrouter-keys");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel carregar chaves.");
      }

      setKeys(data);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro ao carregar chaves."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFeedback("");

    try {
      const response = await fetch("/api/admin/openrouter-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          priority: Number(form.priority ?? 0),
          daily_limit: Number(form.daily_limit ?? 100),
          concurrent_limit: Number(form.concurrent_limit ?? 1),
          tenant_id: form.tenant_id || null,
          notes: form.notes || null
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Nao foi possivel salvar a chave.");
      }

      setForm(initialForm);
      await loadKeys();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao salvar chave.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(key: OpenRouterKeyPublic, status: "active" | "inactive") {
    await fetch(`/api/admin/openrouter-keys/${key.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });
    await loadKeys();
  }

  async function clearCooldown(key: OpenRouterKeyPublic) {
    await fetch(`/api/admin/openrouter-keys/${key.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cooldown_until: null })
    });
    await loadKeys();
  }

  async function deleteKey(key: OpenRouterKeyPublic) {
    await fetch(`/api/admin/openrouter-keys/${key.id}`, {
      method: "DELETE"
    });
    await loadKeys();
  }

  return (
    <>
      <Head>
        <title>OpenRouter Keys | Copiloto Consorcios API</title>
      </Head>
      <main className="test-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Chaves OpenRouter</h1>
          </div>
          <button className="button" type="button" onClick={loadKeys}>
            Atualizar
          </button>
        </header>

        {feedback ? <pre className="compact-error">{feedback}</pre> : null}

        <section className="memory-grid">
          <form className="panel admin-form" onSubmit={handleSubmit}>
            <div className="panel-header">
              <h2>Nova chave</h2>
            </div>
            <div className="form-grid">
              <input
                placeholder="Nome da chave"
                value={form.label}
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
                required
              />
              <input
                placeholder="API key"
                type="password"
                value={form.api_key}
                onChange={(event) =>
                  setForm((current) => ({ ...current, api_key: event.target.value }))
                }
                required
              />
              <input
                placeholder="Modelo"
                value={form.model}
                onChange={(event) =>
                  setForm((current) => ({ ...current, model: event.target.value }))
                }
              />
              <input
                placeholder="Tenant opcional"
                value={form.tenant_id ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tenant_id: event.target.value
                  }))
                }
              />
              <input
                min="0"
                type="number"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: Number(event.target.value)
                  }))
                }
              />
              <input
                min="1"
                type="number"
                value={form.daily_limit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    daily_limit: Number(event.target.value)
                  }))
                }
              />
              <input
                min="1"
                type="number"
                value={form.concurrent_limit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    concurrent_limit: Number(event.target.value)
                  }))
                }
              />
              <textarea
                className="small-textarea"
                placeholder="Notas"
                value={form.notes ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? "Salvando..." : "Salvar chave"}
              </button>
            </div>
          </form>

          <div className="panel import-panel">
            <div className="panel-header">
              <h2>Resumo operacional</h2>
            </div>
            <div className="import-body">
              <div className="counter-row">
                <span>Total: {keys.length}</span>
                <span>Ativas: {keys.filter((key) => key.health === "active").length}</span>
                <span>Cooldown: {keys.filter((key) => key.health === "cooldown").length}</span>
              </div>
              <p className="muted-line">
                Prioridade maior vence. Dentro da mesma prioridade, o sistema usa
                maior restante diario e alterna pela chave menos usada recentemente.
              </p>
            </div>
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <h2>Capacidade das chaves</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chave</th>
                  <th>Modelo</th>
                  <th>Status</th>
                  <th>Uso diario</th>
                  <th>Restante</th>
                  <th>Simultaneas</th>
                  <th>Cooldown</th>
                  <th>Ultimo uso</th>
                  <th>Prioridade</th>
                  <th>Erros recentes</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td>
                      <strong>{key.label}</strong>
                      <span className="muted-block">{key.key_preview}</span>
                    </td>
                    <td>{key.model}</td>
                    <td>
                      <span className={`status-pill ${key.health}`}>
                        {healthLabels[key.health]}
                      </span>
                    </td>
                    <td>
                      {key.daily_used} / {key.daily_limit}
                    </td>
                    <td>{key.daily_remaining}</td>
                    <td>
                      {key.current_concurrent} / {key.concurrent_limit}
                    </td>
                    <td>{formatDate(key.cooldown_until)}</td>
                    <td>{formatDate(key.last_used_at)}</td>
                    <td>{key.priority}</td>
                    <td>
                      {key.recent_errors?.length
                        ? key.recent_errors.map((error) => (
                            <span className="muted-block" key={error.id}>
                              {error.error_code ?? "erro"}: {error.error_message}
                            </span>
                          ))
                        : "-"}
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          className="button"
                          type="button"
                          onClick={() =>
                            updateStatus(
                              key,
                              key.status === "active" ? "inactive" : "active"
                            )
                          }
                        >
                          {key.status === "active" ? "Inativar" : "Ativar"}
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => clearCooldown(key)}
                        >
                          Cooldown
                        </button>
                        <button
                          className="button danger-button"
                          type="button"
                          onClick={() => deleteKey(key)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && keys.length === 0 ? (
                  <tr>
                    <td colSpan={11}>Nenhuma chave cadastrada.</td>
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
