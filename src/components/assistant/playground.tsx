"use client";

import { useRef, useState, useTransition } from "react";
import { Bot, Loader2, RotateCcw, Send, Sparkles, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { testAssistant } from "@/lib/actions/assistant";
import { formatUsd } from "@/lib/assistant/models";

interface Msg {
  role: "user" | "assistant";
  text: string;
  engine?: "claude" | "keywords";
  debug?: string;
  cost?: number;
  action?: string;
}

const SUGGESTIONS = ["¿Qué me recomiendas?", "¿Hacen domicilios?", "¿A qué hora abren?"];

export function Playground({ businessId, sampleItem }: { businessId: string; sampleItem: string | null }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const suggestions = sampleItem ? [`¿${sampleItem} se puede sin cebolla?`, ...SUGGESTIONS] : SUGGESTIONS;

  const send = (text: string) => {
    const question = text.trim();
    if (!question || isPending) return;
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    startTransition(async () => {
      const res = await testAssistant(businessId, question, history);
      if ("error" in res && res.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${res.error}` }]);
      } else if ("text" in res) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: res.text, engine: res.engine, debug: res.debug, cost: res.costUsd, action: res.action?.label },
        ]);
      }
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Prueba tu asistente</CardTitle>
          <CardDescription>
            Responde igual que en tu página. Las pruebas con Claude cuentan en el uso y el tope del día.
          </CardDescription>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reiniciar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[420px] min-h-[200px] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                <p className="whitespace-pre-line">{m.text}</p>
                {m.action && <p className="mt-1 text-xs font-semibold text-[var(--accent)]">[Botón: {m.action}]</p>}
                {m.engine && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant={m.engine === "claude" ? "default" : "secondary"} className="gap-1">
                      {m.engine === "claude" ? <Sparkles className="h-3 w-3" /> : null}
                      {m.engine === "claude" ? "Claude" : "Automático"}
                    </Badge>
                    {m.cost != null && <span>{formatUsd(m.cost, 4)}</span>}
                    {m.debug && <span>· {m.debug}</span>}
                  </div>
                )}
              </div>
              {m.role === "user" && <User className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
          {isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Escribiendo…
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Input placeholder="Pregunta como lo haría un cliente…" value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} />
          <Button type="submit" disabled={isPending || !input.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
