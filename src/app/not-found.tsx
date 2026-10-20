import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-sm text-muted-foreground">
        El enlace puede estar mal escrito o el negocio ya no está disponible.
      </p>
      <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Ir al inicio
      </Link>
    </main>
  );
}
