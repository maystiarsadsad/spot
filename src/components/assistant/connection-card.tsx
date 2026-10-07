"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Loader2, Lock, ShieldCheck, Unplug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { connectClaudeKey, disconnectClaudeKey, saveClaudeSettings } from "@/lib/actions/assistant";
import { CLAUDE_MODELS, formatUsd } from "@/lib/assistant/models";

interface Props {
  businessId: string;
  includesClaude: boolean;
  settings: {
    claudeEnabled: boolean;
    model: string;
    dailyCapUsd: number;
    monthlyCapUsd: number | null;
    hasKey: boolean;
    keyLast4: string | null;
    keyVerifiedAt: string | null;
  };
}

/** Typical storefront question: ~3.5k input tokens (catalog, mostly cached) + ~250 output. */
function costPerAnswer(m: (typeof CLAUDE_MODELS)[number]) {
  return (500 * m.input + 3000 * m.cacheRead + 250 * m.output) / 1_000_000;
}

export function ConnectionCard({ businessId, includesClaude, settings }: Props) {
  const [isPending, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(settings.claudeEnabled);
  const [model, setModel] = useState(settings.model);
  const [daily, setDaily] = useState(String(settings.dailyCapUsd));
  const [monthly, setMonthly] = useState(settings.monthlyCapUsd == null ? "" : String(settings.monthlyCapUsd));

  if (!includesClaude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" /> Claude está incluido en el plan Profesional</CardTitle>
          <CardDescription>
            Tu plan incluye el asistente automático: responde precios, opciones de los productos, horarios, dirección y
            domicilios usando tu catálogo y las preguntas frecuentes que configures en “Entrenamiento”. Con el plan
            Profesional puedes conectar Claude (IA de Anthropic) para respuestas abiertas y conversaciones naturales.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const connect = () =>
    startTransition(async () => {
      const res = await connectClaudeKey(businessId, key);
      if ("error" in res && res.error) return void toast.error(res.error);
      setKey("");
      toast.success("API key verificada y guardada");
    });

  const disconnect = () =>
    startTransition(async () => {
      if (!confirm("¿Desconectar la API key? El asistente volverá a responder en modo automático.")) return;
      const res = await disconnectClaudeKey(businessId);
      if ("error" in res && res.error) return void toast.error(res.error);
      setEnabled(false);
      toast.success("API key desconectada");
    });

  const save = () =>
    startTransition(async () => {
      const res = await saveClaudeSettings(businessId, {
        enabled,
        model,
        dailyCapUsd: Number(daily),
        monthlyCapUsd: monthly.trim() === "" ? null : Number(monthly),
      });
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success("Configuración guardada");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Tu cuenta de Anthropic</CardTitle>
          <CardDescription>
            El asistente usa tu propia API key: Anthropic te cobra directamente lo que consuma, sin recargos de Spot.
            La guardamos cifrada y nunca se muestra completa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.hasKey ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                <span className="font-mono">sk-ant-…{settings.keyLast4}</span>
                {settings.keyVerifiedAt ? (
                  <Badge variant="secondary">Verificada</Badge>
                ) : (
                  <Badge variant="destructive">Rechazada por Anthropic — reemplázala</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={isPending}>
                <Unplug className="mr-1 h-4 w-4" /> Desconectar
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="anthropic-key">{settings.hasKey ? "Reemplazar API key" : "API key"}</Label>
            <div className="flex gap-2">
              <Input
                id="anthropic-key"
                type="password"
                autoComplete="off"
                placeholder="sk-ant-api03-…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <Button onClick={connect} disabled={isPending || !key.trim()}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Créala en{" "}
              <a className="underline inline-flex items-center gap-0.5" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                console.anthropic.com <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → API Keys. Verificamos que funcione antes de guardarla (sin gastar tokens).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo y tope de gasto</CardTitle>
          <CardDescription>
            Al llegar al tope, el asistente sigue respondiendo en modo automático (gratis) hasta el día siguiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Responder con Claude</Label>
              <p className="text-xs text-muted-foreground">Si está apagado, responde el asistente automático.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={(v) => setEnabled(!!v)} disabled={!settings.hasKey} aria-label="Responder con Claude" />
          </div>

          <div className="space-y-2">
            <Label>Modelo</Label>
            <div className="grid gap-2">
              {CLAUDE_MODELS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${model === m.id ? "border-[var(--accent)] bg-[var(--accent)]/5" : ""}`}
                >
                  <input type="radio" name="claude-model" className="mt-1" checked={model === m.id} onChange={() => setModel(m.id)} />
                  <span className="flex-1">
                    <span className="font-semibold">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.description}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      ${m.input} / ${m.output} por millón de tokens · ≈ {formatUsd(costPerAnswer(m), 3)} por respuesta
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cap-day">Tope diario (USD)</Label>
              <Input id="cap-day" type="number" min={0} max={1000} step={0.5} value={daily} onChange={(e) => setDaily(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cap-month">Tope mensual (USD)</Label>
              <Input id="cap-month" type="number" min={0} max={10000} step={1} placeholder="Sin tope" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
          </div>

          <Button onClick={save} disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
