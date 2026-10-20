"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Shows up in the Vercel function logs next to the same digest
    console.error("[app error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-sm text-muted-foreground">
        No pudimos cargar esta página. Puede ser algo temporal: intenta de nuevo y, si sigue pasando, escríbenos.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Código: {error.digest}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => unstable_retry()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Reintentar
        </button>
        <Link href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
