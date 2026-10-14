"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** Month picker + download of the monthly sales file for the accountant. */
export function SalesExport({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="month"
        value={month}
        max={defaultMonth}
        onChange={(e) => setMonth(e.target.value)}
        aria-label="Mes a exportar"
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
      />
      <a href={`/api/export/ventas?mes=${month}`} className={buttonVariants({ variant: "outline" })} title="Para tu contador. No es facturación electrónica.">
        <Download className="mr-2 h-4 w-4" /> Exportar ventas (Excel)
      </a>
    </div>
  );
}
