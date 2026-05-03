"use client";

import { useState, useTransition } from "react";
import { updateBusinessSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Business {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  currency: string | null;
  theme: { brandColor?: string } | null;
}

const BRAND_PRESETS = [
  { name: "Naranja", color: "#ff5b1f" },
  { name: "Azul", color: "#3b82f6" },
  { name: "Verde", color: "#22c55e" },
  { name: "Rojo", color: "#ef4444" },
  { name: "Púrpura", color: "#a855f7" },
  { name: "Rosa", color: "#ec4899" },
  { name: "Cyan", color: "#06b6d4" },
  { name: "Ámbar", color: "#f59e0b" },
  { name: "Esmeralda", color: "#10b981" },
  { name: "Índigo", color: "#6366f1" },
];

interface Props {
  business: Business;
}

export function SettingsForm({ business }: Props) {
  const [isPending, startTransition] = useTransition();
  const [brandColor, setBrandColor] = useState(business.theme?.brandColor || "#ff5b1f");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBusinessSettings(business.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ajustes actualizados correctamente");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Information Profile */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Perfil del Negocio</h3>
          <p className="text-sm text-muted-foreground">
            Esta información puede ser visible de cara al público en tu portal web.
          </p>
        </div>
        
        <div className="space-y-4 rounded-xl border p-6 bg-card">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Comercial *</Label>
            <Input id="name" name="name" defaultValue={business.name} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={business.description || ""}
              placeholder="¿Qué ofrece tu negocio?"
              rows={4}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Información de Contacto</h3>
          <p className="text-sm text-muted-foreground">
            Opciones para que tus clientes puedan contactarte.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 rounded-xl border p-6 bg-card">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Público</Label>
            <Input id="email" name="email" type="email" defaultValue={business.email || ""} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" name="whatsapp" placeholder="+57 300 000 0000" defaultValue={business.whatsapp || ""} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Teléfono Fijo / Secundario</Label>
            <Input id="phone" name="phone" defaultValue={business.phone || ""} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" defaultValue={business.address || ""} />
          </div>
          
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="city">Ciudad / Región</Label>
            <Input id="city" name="city" defaultValue={business.city || ""} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Region & Config */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Configuración Regional</h3>
          <p className="text-sm text-muted-foreground">
            Parámetros operativos para manejo de finanzas y ventas.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border p-6 bg-card">
          <div className="space-y-2 max-w-[240px]">
            <Label htmlFor="currency">Moneda Base</Label>
            <Select name="currency" defaultValue={business.currency || "COP"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">Peso Colombiano (COP)</SelectItem>
                <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Brand Color */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Palette className="h-5 w-5" /> Color de Marca
          </h3>
          <p className="text-sm text-muted-foreground">
            Personaliza el color de acento de tu panel y página web.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border p-6 bg-card">
          <div className="flex flex-wrap gap-2">
            {BRAND_PRESETS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => setBrandColor(preset.color)}
                className="group relative"
                title={preset.name}
              >
                <div
                  className="w-9 h-9 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: preset.color,
                    borderColor: brandColor === preset.color ? "var(--ink)" : "transparent",
                    transform: brandColor === preset.color ? "scale(1.15)" : "scale(1)",
                    boxShadow: brandColor === preset.color ? `0 0 0 2px var(--paper), 0 0 0 4px ${preset.color}` : "none",
                  }}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              placeholder="#ff5b1f"
              className="max-w-[140px] font-mono text-sm"
            />
            <div
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: brandColor }}
            >
              Vista previa
            </div>
          </div>

          <input type="hidden" name="brandColor" value={brandColor} />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
