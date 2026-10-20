"use client";

import { useEffect } from "react";

/** Last resort when the root layout itself fails: it replaces the whole document, so it carries its own html/body and styles. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fafafa", color: "#111" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#555", margin: 0 }}>
            La aplicación tuvo un error inesperado. Intenta de nuevo en unos segundos.
          </p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#777", margin: 0 }}>Código: {error.digest}</p>}
          <button type="button" onClick={() => unstable_retry()} style={{ padding: "10px 16px", borderRadius: 6, border: 0, background: "#111", color: "#fff", fontSize: 14, cursor: "pointer" }}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
