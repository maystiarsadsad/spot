"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documentIssues } from "@/lib/dealership/documents";
import { VehicleDialog } from "./vehicle-dialog";
import { vehicleTitle, type VehicleRow } from "./types";

interface Props {
  businessId: string;
  currency: string;
  vehicles: VehicleRow[];
}

const PROBLEM_LABEL = { missing: "Falta", expired: "Vencido", expiring: "Por vencer" } as const;

/** Where every physical folder is, and what is missing in each one. */
export function DocumentsPanel({ currency, vehicles }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<VehicleRow | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles
      .filter((v) => v.status !== "sold")
      .filter((v) => !q || `${v.plate} ${v.brand} ${v.model ?? ""} ${v.docLocation ?? ""}`.toLowerCase().includes(q))
      .map((v) => ({ v, issues: documentIssues(v.documents, today) }))
      // Vehicles with the most pending paperwork first; unplaced folders next
      .sort((a, b) => b.issues.length - a.issues.length || Number(!a.v.docLocation) - Number(!b.v.docLocation));
  }, [vehicles, query, today]);

  const unplaced = rows.filter((r) => !r.v.docLocation).length;
  const fresh = (v: VehicleRow | null) => (v ? vehicles.find((x) => x.id === v.id) ?? v : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por placa o ubicación (ej. Archivador 2)…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar documentación" />
        </div>
        {unplaced > 0 && <Badge variant="destructive">{unplaced} carpetas sin ubicar</Badge>}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No hay vehículos en inventario.</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Ubicación de la carpeta</TableHead>
                <TableHead>Pendiente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ v, issues }) => (
                <TableRow key={v.id} className="cursor-pointer" onClick={() => setOpen(v)}>
                  <TableCell className="font-mono font-semibold">{v.plate}</TableCell>
                  <TableCell>{vehicleTitle(v)}</TableCell>
                  <TableCell>{v.docLocation ?? <span className="text-destructive">Sin ubicar</span>}</TableCell>
                  <TableCell>
                    {issues.length === 0 ? (
                      <Badge variant="secondary">Completa</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {issues.slice(0, 4).map((i) => (
                          <Badge key={i.key} variant={i.problem === "missing" ? "outline" : "destructive"}>{PROBLEM_LABEL[i.problem]}: {i.label}</Badge>
                        ))}
                        {issues.length > 4 && <Badge variant="outline">+{issues.length - 4}</Badge>}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VehicleDialog vehicle={fresh(open)} onOpenChange={(o) => !o && setOpen(null)} currency={currency} initialTab="documents" />
    </div>
  );
}
