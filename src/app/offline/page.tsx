import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión",
  robots: { index: false },
};

/** Static fallback the service worker shows when a page can't be fetched. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-muted-foreground">
        No pudimos conectarnos. Revisa tu internet y vuelve a intentarlo: lo que ya estaba guardado en Spot sigue seguro.
      </p>
    </main>
  );
}
