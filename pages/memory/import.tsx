import Head from "next/head";
import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import type {
  ImportConversationRecord,
  ImportResult,
  ImportValidationError
} from "@/lib/types/memory";
import {
  importColumns,
  parseCSV,
  parseJSONImport,
  toImportRecords,
  validateImportRecords
} from "@/lib/utils/importParser";

type UploadKind = "csv" | "json";

function getFileKind(fileName: string): UploadKind {
  return fileName.toLowerCase().endsWith(".json") ? "json" : "csv";
}

function parseFileContent(kind: UploadKind, content: string) {
  return kind === "json" ? parseJSONImport(content) : parseCSV(content);
}

export default function MemoryImportPage() {
  const [records, setRecords] = useState<ImportConversationRecord[]>([]);
  const [errors, setErrors] = useState<ImportValidationError[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const previewRows = useMemo(() => records.slice(0, 5), [records]);
  const validRecords = Math.max(records.length - new Set(errors.map((error) => error.row)).size, 0);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFeedback("");
    setImportResult(null);

    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const parsed = toImportRecords(parseFileContent(getFileKind(file.name), content));
      const validationErrors = validateImportRecords(parsed);

      setFileName(file.name);
      setRecords(parsed);
      setErrors(validationErrors);
    } catch (error) {
      setFileName(file.name);
      setRecords([]);
      setErrors([]);
      setFeedback(
        error instanceof Error ? error.message : "Nao foi possivel ler o arquivo."
      );
    }
  }

  async function handleImport() {
    setFeedback("");
    setImportResult(null);
    setIsImporting(true);

    try {
      const response = await fetch("/api/import-conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ records })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrors(data.errors ?? []);
        throw new Error(data.error ?? "Importacao nao concluida.");
      }

      setImportResult(data);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Erro inesperado na importacao."
      );
    } finally {
      setIsImporting(false);
    }
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
            <h1>Importar conversas</h1>
          </div>
          <Link className="button" href="/memory">
            Ver memoria
          </Link>
        </header>

        <section className="memory-grid">
          <div className="panel import-panel">
            <div className="panel-header">
              <h2>Arquivo historico</h2>
            </div>
            <div className="import-body">
              <label className="upload-zone">
                <span>Selecionar CSV ou JSON</span>
                <input
                  accept=".csv,.json,application/json,text/csv"
                  type="file"
                  onChange={handleFileChange}
                />
              </label>
              {fileName ? <p className="muted-line">{fileName}</p> : null}
              <div className="counter-row">
                <span>Total: {records.length}</span>
                <span>Validos: {validRecords}</span>
                <span>Erros: {errors.length}</span>
              </div>
              <button
                className="button primary"
                disabled={records.length === 0 || errors.length > 0 || isImporting}
                type="button"
                onClick={handleImport}
              >
                {isImporting ? "Importando..." : "Importar conversas"}
              </button>
              {feedback ? <pre className="compact-error">{feedback}</pre> : null}
              {importResult ? (
                <div className="import-report">
                  <strong>Importacao concluida</strong>
                  <span>Empresas criadas: {importResult.companiesCreated}</span>
                  <span>Leads criados: {importResult.leadsCreated}</span>
                  <span>Conversas criadas: {importResult.conversationsCreated}</span>
                  <span>Mensagens criadas: {importResult.messagesCreated}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel import-panel">
            <div className="panel-header">
              <h2>Relatorio de erros</h2>
            </div>
            <div className="import-body">
              {errors.length === 0 ? (
                <p className="muted-line">Nenhum erro encontrado.</p>
              ) : (
                <div className="error-list">
                  {errors.map((error, index) => (
                    <div key={`${error.row}-${error.field}-${index}`}>
                      Linha {error.row} - {error.field}: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">
            <h2>Preview</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {importColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((record, index) => (
                  <tr key={`${record.lead_nome}-${index}`}>
                    {importColumns.map((column) => (
                      <td key={column}>{record[column]}</td>
                    ))}
                  </tr>
                ))}
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={importColumns.length}>Nenhum arquivo carregado.</td>
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
