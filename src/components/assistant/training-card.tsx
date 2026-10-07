"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveAssistantTraining } from "@/lib/actions/assistant";

interface Props {
  businessId: string;
  includesClaude: boolean;
  initial: {
    greeting: string;
    instructions: string;
    extraInfo: string;
    faqs: { q: string; a: string }[];
  };
}

const FAQ_EXAMPLES = [
  { q: "¿Aceptan Nequi o tarjeta?", a: "Sí, recibimos efectivo, tarjeta, Nequi y Daviplata." },
  { q: "¿Cuánto cuesta el domicilio?", a: "El domicilio cuesta $4.000 en un radio de 3 km." },
];

export function TrainingCard({ businessId, includesClaude, initial }: Props) {
  const [isPending, startTransition] = useTransition();
  const [greeting, setGreeting] = useState(initial.greeting);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [extraInfo, setExtraInfo] = useState(initial.extraInfo);
  const [faqs, setFaqs] = useState(initial.faqs.length ? initial.faqs : []);

  const setFaq = (i: number, patch: Partial<{ q: string; a: string }>) =>
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const save = () =>
    startTransition(async () => {
      const res = await saveAssistantTraining(businessId, { greeting, instructions, extraInfo, faqs });
      if ("error" in res && res.error) return void toast.error(res.error);
      toast.success("Entrenamiento guardado");
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrena a tu asistente</CardTitle>
        <CardDescription>
          El catálogo, los precios, las opciones de cada producto, el horario y la dirección ya los conoce. Aquí le
          enseñas lo demás. Las preguntas frecuentes las usa también el asistente automático.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="ai-greeting">Saludo</Label>
          <Input
            id="ai-greeting"
            maxLength={300}
            placeholder="¡Hola! 👋 Soy el asistente de tu negocio. ¿Qué se te antoja hoy?"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Preguntas frecuentes</Label>
            <span className="text-xs text-muted-foreground">{faqs.length}/50</span>
          </div>
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Agrega las preguntas que más te hacen por WhatsApp. El asistente las responderá con tus palabras.
            </p>
          )}
          {faqs.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input placeholder="Pregunta" value={f.q} maxLength={300} onChange={(e) => setFaq(i, { q: e.target.value })} aria-label={`Pregunta ${i + 1}`} />
              <Textarea placeholder="Respuesta" rows={2} value={f.a} maxLength={1000} onChange={(e) => setFaq(i, { a: e.target.value })} aria-label={`Respuesta ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" onClick={() => setFaqs((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Eliminar pregunta">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={faqs.length >= 50} onClick={() => setFaqs((prev) => [...prev, { q: "", a: "" }])}>
              <Plus className="mr-1 h-4 w-4" /> Agregar pregunta
            </Button>
            {faqs.length === 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFaqs(FAQ_EXAMPLES)}>
                Usar ejemplos
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-extra">Información adicional</Label>
          <Textarea
            id="ai-extra"
            rows={4}
            maxLength={8000}
            placeholder={"Zonas y costo de domicilio, medios de pago, políticas de cambios, parqueadero, promociones vigentes…\nEj: Hacemos domicilios hasta la calle 170. El pedido mínimo para domicilio es de $20.000."}
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Escribe frases completas: el asistente automático responde con la frase que mejor coincida.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-instructions">Personalidad e indicaciones {includesClaude ? "" : "(solo con Claude)"}</Label>
          <Textarea
            id="ai-instructions"
            rows={4}
            maxLength={4000}
            disabled={!includesClaude}
            placeholder={"Habla de tú y con buena onda. Sugiere siempre una bebida o un acompañamiento.\nSi preguntan por eventos privados, pide que escriban por WhatsApp."}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        <Button onClick={save} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar entrenamiento
        </Button>
      </CardContent>
    </Card>
  );
}
