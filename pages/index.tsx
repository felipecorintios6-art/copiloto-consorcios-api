import Head from "next/head";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Head>
        <title>Copiloto Consorcios API</title>
      </Head>
      <main className="shell compact">
        <section className="panel">
          <p className="eyebrow">Motor de inteligencia</p>
          <h1>Copiloto Consorcios API</h1>
          <p>
            Projeto preparado para conectar CRMs, WhatsApp, dashboards e sistemas
            internos ao motor comercial de consorcios.
          </p>
          <Link className="button primary" href="/test">
            Abrir teste
          </Link>
        </section>
      </main>
    </>
  );
}
