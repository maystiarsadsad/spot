"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelClassBooking } from "@/lib/actions/gym";

export function CancelClassButton({ token, bookingId }: { token: string; bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className="gym-class-btn"
      style={{ background: "transparent", color: "inherit", border: "1px solid var(--store-border)" }}
      disabled={isPending}
      onClick={() => {
        if (!confirm("¿Cancelar tu cupo en esta clase?")) return;
        startTransition(async () => {
          const res = await cancelClassBooking(token, bookingId);
          if ("error" in res && res.error) alert(res.error);
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 size={14} className="store-spin" /> : "Cancelar"}
    </button>
  );
}
