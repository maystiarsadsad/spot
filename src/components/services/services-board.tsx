"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { STATUS_LABELS, type ServiceKind, type ServiceSettings } from "@/lib/service-orders/flow";
import { saveServiceSettings } from "@/lib/actions/service-orders";
import { Kanban } from "./kanban";
import { OrderDialog } from "./order-dialog";
import { NewOrderDialog } from "./new-order-dialog";
import { shortWhen, type CourierOption, type ServiceItemOption, type ServiceOrderRow } from "./types";

interface Props {
  businessId: string;
  businessName: string;
  slug: string;
  siteUrl: string;
  kind: ServiceKind;
  currency: string;
  timeZone: string;
  now: number;
  orders: ServiceOrderRow[];
  couriers: CourierOption[];
  items: ServiceItemOption[];
  settings: ServiceSettings;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ServicesBoard(props: Props) {
  const { orders, kind, currency, timeZone } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const open = orders.find((o) => o.id === openId) ?? null;
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const history = useMemo(() => {
    const q = norm(query.trim());
    return orders
      .filter((o) => ["delivered", "cancelled"].includes(o.status))
      .filter((o) => !q || norm(`${o.code} ${o.customerName} ${o.customerPhone ?? ""} ${o.dropoffAddress ?? ""}`).includes(q));
  }, [orders, query]);

  return (
    <>
      <Tabs defaultValue="tablero">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="tablero">Tablero</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="tarifas">Tarifas</TabsTrigger>
          </TabsList>
          <Button onClick={() => setCreating(true)} disabled={props.items.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> {kind === "shipment" ? "Nuevo envío" : "Nueva orden"}
          </Button>
        </div>
        <TabsContent value="tablero" className="pt-4">
          <Kanban kind={kind} orders={active} currency={currency} timeZone={timeZone} now={props.now} onOpen={(o) => setOpenId(o.id)} />
        </TabsContent>
        <TabsContent value="historial" className="space-y-3 pt-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Código, cliente, dirección…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en el historial" />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>{kind === "shipment" ? "Destino" : "Servicios"}</TableHead>
                  <TableHead>Cerrada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin órdenes cerradas.</TableCell></TableRow>}
                {history.slice(0, 200).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpenId(o.id)}>
                    <TableCell className="font-medium">{o.code}</TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs">{kind === "shipment" ? o.dropoffAddress : o.items.map((l) => l.name).join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{shortWhen(o.completedAt ?? o.createdAt, timeZone)}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABELS[o.status]}</Badge>
                      {o.status === "delivered" && !o.paid && <Badge variant="outline" className="ml-1 border-amber-500/50 text-amber-600">Por cobrar</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(o.total, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="tarifas" className="pt-4">
          <SettingsCard businessId={props.businessId} kind={kind} settings={props.settings} currency={currency} />
        </TabsContent>
      </Tabs>

      <OrderDialog
        order={open}
        onClose={() => setOpenId(null)}
        couriers={props.couriers}
        items={props.items}
        currency={currency}
        timeZone={timeZone}
        siteUrl={props.siteUrl}
        slug={props.slug}
        businessName={props.businessName}
      />
      <NewOrderDialog open={creating} onClose={() => setCreating(false)} businessId={props.businessId} kind={kind} items={props.items} settings={props.settings} currency={currency} />
    </>
  );
}

function SettingsCard({ businessId, kind, settings, currency }: { businessId: string; kind: ServiceKind; settings: ServiceSettings; currency: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [s, setS] = useState(settings);
  const n = (v: string) => Number(v) || 0;
  const field = (id: string, label: string, value: number, onChange: (v: number) => void, step = 1) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} step={step} value={value} onChange={(e) => onChange(n(e.target.value))} />
    </div>
  );
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">{kind === "shipment" ? "Tarifas de envío" : "Servicio de lavandería"}</CardTitle>
        <CardDescription>
          {kind === "shipment"
            ? `El precio de cada servicio del Catálogo es la tarifa base; cubre los primeros km y luego se cobra por km (en ${currency}).`
            : "Los precios por kilo y por prenda se editan en Catálogo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {kind === "shipment" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {field("st-inc", "Km incluidos en la base", s.includedKm, (v) => setS({ ...s, includedKm: v }), 0.5)}
            {field("st-km", "Precio por km adicional", s.perKm, (v) => setS({ ...s, perKm: v }), 100)}
            {field("st-max", "Cobertura máxima (km)", s.maxKm, (v) => setS({ ...s, maxKm: v }))}
            {field("st-road", "Factor de calles (1,0–2,0)", s.roadFactor, (v) => setS({ ...s, roadFactor: v }), 0.05)}
            {field("st-med", "Recargo paquete mediano", s.sizeFees.medium, (v) => setS({ ...s, sizeFees: { ...s.sizeFees, medium: v } }), 500)}
            {field("st-lg", "Recargo paquete grande", s.sizeFees.large, (v) => setS({ ...s, sizeFees: { ...s.sizeFees, large: v } }), 500)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {field("st-home", "Domicilio (recoger y/o entregar)", s.homeServiceFee, (v) => setS({ ...s, homeServiceFee: v }), 500)}
            {field("st-hours", "Horas para tener la ropa lista", s.turnaroundHours, (v) => setS({ ...s, turnaroundHours: v }))}
          </div>
        )}
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await saveServiceSettings(businessId, s);
              if ("error" in res && res.error) return void toast.error(res.error);
              toast.success("Tarifas guardadas");
              router.refresh();
            })
          }
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
        </Button>
      </CardContent>
    </Card>
  );
}
