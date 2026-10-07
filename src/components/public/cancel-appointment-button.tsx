"use client";

import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cancelAppointmentByToken } from "@/lib/actions/booking";

export function CancelAppointmentButton({ token }: { token: string }) {
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
          if (!confirm("¿Seguro que quieres cancelar tu cita?")) return;
          setError(null);
          startTransition(async () => {
            const res = await cancelAppointmentByToken(token);
            if ("error" in res && res.error) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {isPending ? <Loader2 size={16} className="store-spin" /> : <XCircle size={16} />} Cancelar mi cita
      </button>
      {error && <p className="bk-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
