"use client";

import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelStayByToken } from "@/lib/actions/stays-public";

export function CancelStayButton({ token }: { token: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        className="bk-link"
        style={{ width: "100%" }}
        disabled={isPending}
        onClick={() => {
          if (!confirm("¿Seguro que quieres cancelar tu reserva?")) return;
          setError(null);
          startTransition(async () => {
            const res = await cancelStayByToken(token);
            if ("error" in res && res.error) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {isPending ? <Loader2 size={16} className="store-spin" /> : <XCircle size={16} />} Cancelar mi reserva
      </button>
      {error && <p className="bk-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
