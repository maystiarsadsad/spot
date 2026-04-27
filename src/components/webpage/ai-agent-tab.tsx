"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Bot, Send, Sparkles, Save, Variable, Info,
  Loader2, User, RefreshCw, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Database } from "@/types/database";
import { updateBusinessWebpage, testAiAgent } from "@/lib/actions/webpage";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

const TEMPLATE_VARIABLES = [
  { key: "{{business_name}}", desc: "Nombre del negocio" },
  { key: "{{business_type}}", desc: "Tipo (restaurante, hotel, etc.)" },
  { key: "{{business_description}}", desc: "Descripción del negocio" },
  { key: "{{business_phone}}", desc: "Teléfono de contacto" },
  { key: "{{business_address}}", desc: "Dirección física" },
  { key: "{{current_date}}", desc: "Fecha actual" },
  { key: "{{current_time}}", desc: "Hora actual" },
  { key: "{{catalog_summary}}", desc: "Lista de productos/servicios con precios" },
  { key: "{{inventory_summary}}", desc: "Stock actual (disponible/agotado)" },
  { key: "{{reservations_count}}", desc: "Reservas activas pendientes" },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  restaurant: `Eres el asistente virtual de {{business_name}}, un restaurante. Tu tono es amigable y apetitoso.

INFORMACIÓN DEL NEGOCIO:
- Dirección: {{business_address}}
- Teléfono: {{business_phone}}
- Fecha: {{current_date}} | Hora: {{current_time}}

MENÚ DISPONIBLE:
{{catalog_summary}}

DISPONIBILIDAD DE INGREDIENTES:
{{inventory_summary}}

REGLAS:
- Si un producto no está en el menú, indícalo amablemente.
- Si un ingrediente está agotado, sugiere alternativas.
- Puedes tomar pedidos y confirmar precios.
- Siempre sugiere complementos o bebidas.`,
  hotel: `Eres el concierge virtual de {{business_name}}. Tu tono es elegante y servicial.

INFORMACIÓN:
- Dirección: {{business_address}}
- Teléfono: {{business_phone}}
- Fecha: {{current_date}} | Hora: {{current_time}}

HABITACIONES/SERVICIOS:
{{catalog_summary}}

DISPONIBILIDAD:
{{inventory_summary}}

Reservas actuales: {{reservations_count}}

REGLAS:
- Verifica disponibilidad antes de confirmar reservas.
- Ofrece upgrades cuando sea posible.
- Informa sobre servicios adicionales.`,
  custom: `Eres el asistente virtual de {{business_name}}.

INFORMACIÓN:
- Tipo: {{business_type}}
- Dirección: {{business_address}}
- Teléfono: {{business_phone}}

CATÁLOGO:
{{catalog_summary}}

INVENTARIO:
{{inventory_summary}}

Responde de forma amigable y profesional. Ayuda con consultas sobre productos, precios y disponibilidad.`,
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function AiAgentTab({ business }: { business: Business }) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [enabled, setEnabled] = useState(business.ai_agent_enabled || false);
  const [greeting, setGreeting] = useState(business.ai_agent_greeting || "Hola 👋 ¿En qué te puedo ayudar?");
  const [prompt, setPrompt] = useState(business.ai_agent_prompt || "");

  const [testInput, setTestInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resolvedPrompt, setResolvedPrompt] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, any> | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const insertVariable = (key: string) => {
    setPrompt((prev) => prev + key);
  };

  const loadTemplate = () => {
    const bType = business.type as string;
    const tmpl = DEFAULT_PROMPTS[bType] || DEFAULT_PROMPTS.custom;
    setPrompt(tmpl);
    toast.success("Plantilla cargada para: " + bType);
  };

  const handleSaveAgent = () => {
    startTransition(async () => {
      const result = await updateBusinessWebpage(business.id, {
        ai_agent_enabled: enabled,
        ai_agent_prompt: prompt,
        ai_agent_greeting: greeting,
      });
      if (result.success) toast.success("Agente IA guardado");
      else toast.error(result.error || "Error al guardar");
    });
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: testInput };
    setMessages((prev) => [...prev, userMsg]);
    setTestInput("");
    setIsTesting(true);

    try {
      const result = await testAiAgent(business.id, testInput, prompt || DEFAULT_PROMPTS.custom);
      if (result.success) {
        setResolvedPrompt(result.resolvedPrompt);
        setContext(result.context);

        let content: string;
        if (result.aiResponse && result.hasApiKey) {
          content = result.aiResponse;
        } else if (!result.hasApiKey) {
          content = `⚠️ No hay API key de Gemini configurada.\n\nAgrega GEMINI_API_KEY en tu archivo .env.local para obtener respuestas reales.\n\n📊 Contexto disponible:\n- ${result.context.catalog_items?.length || 0} productos\n- ${result.context.inventory_summary?.length || 0} items de inventario\n- ${result.context.active_reservations_count} reservas activas`;
        } else {
          content = "❌ No se pudo generar una respuesta.";
        }

        setMessages((prev) => [...prev, { role: "assistant", content }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "❌ Error al procesar la prueba." }]);
    } finally {
      setIsTesting(false);
    }
  };

  const copyResolvedPrompt = () => {
    if (resolvedPrompt) {
      navigator.clipboard.writeText(resolvedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enable/Disable */}
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: enabled ? "hsl(260,70%,50%,0.1)" : "hsl(0,0%,50%,0.1)" }}>
              <Bot className="h-6 w-6" style={{ color: enabled ? "hsl(260,70%,50%)" : undefined }} />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Asistente de IA</h3>
              <p className="text-sm text-muted-foreground">{enabled ? "El chatbot está activo en tu página pública" : "Activa el chatbot para atender clientes 24/7"}</p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </CardContent>
      </Card>

      {/* Greeting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Saludo inicial</CardTitle>
          <CardDescription>El primer mensaje que el chatbot envía al cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Hola 👋 ¿En qué te puedo ayudar?" />
        </CardContent>
      </Card>

      {/* Prompt Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> System Prompt</CardTitle>
              <CardDescription>Instrucciones y personalidad del agente</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadTemplate} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Cargar plantilla
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Escribe las instrucciones del agente IA..." rows={12} className="font-mono text-sm" />

          {/* Variables reference */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Variable className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Variables disponibles</span>
              <Badge variant="secondary" className="text-xs">Tiempo Real</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {TEMPLATE_VARIABLES.map((v) => (
                <button key={v.key} onClick={() => insertVariable(v.key)} className="flex items-center gap-2 text-left p-1.5 rounded hover:bg-accent transition-colors text-xs group">
                  <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] group-hover:border-primary transition-colors">{v.key}</code>
                  <span className="text-muted-foreground">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Chat */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Probar Agente</CardTitle>
          <CardDescription>Envía un mensaje de prueba para ver el contexto que el agente recibiría</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-[280px] border rounded-lg p-4 bg-muted/20">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Envía un mensaje para probar</p>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isTesting && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted p-3 rounded-xl"><Loader2 className="h-4 w-4 animate-spin" /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          <form onSubmit={(e) => { e.preventDefault(); handleTest(); }} className="flex gap-2">
            <Input value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Ej: ¿Qué platos tienen disponibles?" disabled={isTesting} />
            <Button type="submit" disabled={isTesting || !testInput.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </form>

          {resolvedPrompt && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Prompt resuelto con datos reales</Label>
                <Button variant="ghost" size="sm" onClick={copyResolvedPrompt} className="h-7 gap-1 text-xs">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <pre className="bg-muted/50 p-3 rounded-lg text-xs font-mono max-h-[200px] overflow-auto whitespace-pre-wrap border">{resolvedPrompt}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Agent */}
      <div className="flex justify-end">
        <Button onClick={handleSaveAgent} disabled={isPending} size="lg" className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? "Guardando..." : "Guardar Agente IA"}
        </Button>
      </div>
    </div>
  );
}
