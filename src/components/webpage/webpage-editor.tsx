"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Globe, Eye, EyeOff, ExternalLink, Package, FolderOpen,
  Save, Image as ImageIcon, Type, FileText, Link2, Phone,
  Mail, MapPin, MessageCircle, Bot, AtSign, Share2,
  MessageSquare, Clock, Palette, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Database } from "@/types/database";
import { updateBusinessWebpage } from "@/lib/actions/webpage";
import { AiAgentTab } from "./ai-agent-tab";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

interface WebpageEditorProps {
  business: Business;
  itemCount: number;
  categoryCount: number;
}

const FONT_OPTIONS = [
  { value: "inter", label: "Inter (Moderno)" },
  { value: "roboto", label: "Roboto (Clásico)" },
  { value: "poppins", label: "Poppins (Elegante)" },
  { value: "playfair", label: "Playfair Display (Serif)" },
  { value: "outfit", label: "Outfit (Geométrico)" },
  { value: "system", label: "Sistema (Default)" },
];

const COLOR_PRESETS = [
  { name: "Oscuro", primary: "#6366f1", bg: "#0f172a", text: "#f1f5f9" },
  { name: "Claro", primary: "#3b82f6", bg: "#ffffff", text: "#1e293b" },
  { name: "Esmeralda", primary: "#10b981", bg: "#0c1a14", text: "#d1fae5" },
  { name: "Rosa", primary: "#ec4899", bg: "#1a0a14", text: "#fce7f3" },
  { name: "Ámbar", primary: "#f59e0b", bg: "#1a150a", text: "#fef3c7" },
  { name: "Rojo", primary: "#ef4444", bg: "#1a0a0a", text: "#fecaca" },
];

export function WebpageEditor({ business, itemCount, categoryCount }: WebpageEditorProps) {
  const [isPending, startTransition] = useTransition();

  const socialLinks = (business.social_links as Record<string, string>) || {};
  const themeData = (business.theme as Record<string, any>) || {};

  const [form, setForm] = useState({
    tagline: business.tagline || "",
    description: business.description || "",
    phone: business.phone || "",
    email: business.email || "",
    whatsapp: business.whatsapp || "",
    address: business.address || "",
    logo_url: business.logo_url || "",
    cover_url: business.cover_url || "",
    webpage_published: business.webpage_published || false,
    social_links: {
      instagram: socialLinks.instagram || "",
      facebook: socialLinks.facebook || "",
      twitter: socialLinks.twitter || "",
      tiktok: socialLinks.tiktok || "",
      website: socialLinks.website || "",
    },
    theme: {
      primary_color: themeData.primary_color || "#6366f1",
      bg_color: themeData.bg_color || "#0f172a",
      text_color: themeData.text_color || "#f1f5f9",
      font_family: themeData.font_family || "inter",
      border_radius: themeData.border_radius || "12",
    },
  });

  const publicUrl = `/${business.slug}`;

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    }));
  };

  const handleThemeChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm((prev) => ({
      ...prev,
      theme: { ...prev.theme, primary_color: preset.primary, bg_color: preset.bg, text_color: preset.text },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateBusinessWebpage(business.id, {
        tagline: form.tagline,
        description: form.description,
        phone: form.phone,
        email: form.email,
        whatsapp: form.whatsapp,
        address: form.address,
        logo_url: form.logo_url,
        cover_url: form.cover_url,
        webpage_published: form.webpage_published,
        social_links: form.social_links,
        theme: form.theme,
      });
      if (result.success) {
        toast.success("Página actualizada correctamente");
      } else {
        toast.error(result.error || "Error al guardar");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-2" style={{ borderColor: form.webpage_published ? "hsl(142,70%,45%)" : undefined }}>
        <CardContent className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: form.webpage_published ? "hsl(142,70%,45%,0.1)" : "hsl(0,0%,50%,0.1)" }}>
              {form.webpage_published ? <Eye className="h-6 w-6" style={{ color: "hsl(142,70%,45%)" }} /> : <EyeOff className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{form.webpage_published ? "Página publicada" : "Página no publicada"}</h3>
              <p className="text-sm text-muted-foreground">{form.webpage_published ? "Tu catálogo es visible para todos" : "Solo tú puedes ver tu página"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {form.webpage_published && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors">
                <ExternalLink className="h-4 w-4" /> Ver página
              </a>
            )}
            <Switch checked={form.webpage_published} onCheckedChange={(v) => handleChange("webpage_published", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><Package className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold">{itemCount}</p><p className="text-xs text-muted-foreground">Productos activos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><FolderOpen className="h-5 w-5 text-muted-foreground" /><div><p className="text-2xl font-bold">{categoryCount}</p><p className="text-xs text-muted-foreground">Categorías</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><Link2 className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-mono font-semibold truncate">/{business.slug}</p><p className="text-xs text-muted-foreground">URL pública</p></div></CardContent></Card>
      </div>

      {/* Editor Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="info"><Type className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />Info</TabsTrigger>
          <TabsTrigger value="contact"><Phone className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />Contacto</TabsTrigger>
          <TabsTrigger value="media"><ImageIcon className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />Media</TabsTrigger>
          <TabsTrigger value="design"><Palette className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />Diseño</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="h-3.5 w-3.5 mr-1.5 hidden sm:inline" />IA</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4" /> Texto de tu página</CardTitle>
              <CardDescription>Lo que tus clientes ven al entrar a tu página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tagline">Eslogan / Tagline</Label>
                <Input id="tagline" placeholder="Las mejores papas de la ciudad" value={form.tagline} onChange={(e) => handleChange("tagline", e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Aparece debajo del nombre en el header</p>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" placeholder="Cuéntale a tus clientes de qué se trata tu negocio..." value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Datos de contacto</CardTitle>
              <CardDescription>Se muestran como botones en la parte superior de tu página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Teléfono</Label>
                  <Input id="phone" placeholder="+57 300 123 4567" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Label>
                  <Input id="whatsapp" placeholder="+573001234567" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                  <Input id="email" type="email" placeholder="contacto@tunegocio.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="address" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Dirección</Label>
                  <Input id="address" placeholder="Calle 123 #45-67, Ciudad" value={form.address} onChange={(e) => handleChange("address", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Hash className="h-4 w-4" /> Redes Sociales</CardTitle>
              <CardDescription>Enlaces a tus perfiles (se muestran como íconos)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5"><AtSign className="h-3.5 w-3.5" /> Instagram</Label>
                  <Input placeholder="https://instagram.com/tunegocio" value={form.social_links.instagram} onChange={(e) => handleSocialChange("instagram", e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Share2 className="h-3.5 w-3.5" /> Facebook</Label>
                  <Input placeholder="https://facebook.com/tunegocio" value={form.social_links.facebook} onChange={(e) => handleSocialChange("facebook", e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> X / Twitter</Label>
                  <Input placeholder="https://x.com/tunegocio" value={form.social_links.twitter} onChange={(e) => handleSocialChange("twitter", e.target.value)} />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> TikTok</Label>
                  <Input placeholder="https://tiktok.com/@tunegocio" value={form.social_links.tiktok} onChange={(e) => handleSocialChange("tiktok", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Imágenes</CardTitle>
              <CardDescription>Logo y portada de tu página</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input id="logo_url" placeholder="https://..." value={form.logo_url} onChange={(e) => handleChange("logo_url", e.target.value)} />
                {form.logo_url && (
                  <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border">
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="cover_url">URL de Portada</Label>
                <Input id="cover_url" placeholder="https://..." value={form.cover_url} onChange={(e) => handleChange("cover_url", e.target.value)} />
                {form.cover_url && (
                  <div className="mt-2 h-32 rounded-lg overflow-hidden border">
                    <img src={form.cover_url} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Paleta de Colores</CardTitle>
              <CardDescription>Define la identidad visual de tu página pública</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Presets rápidos</Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button key={p.name} onClick={() => applyColorPreset(p)} className="flex flex-col items-center gap-1 p-2 rounded-lg border hover:border-primary transition-colors text-xs">
                      <div className="flex gap-0.5">
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.primary }} />
                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: p.bg }} />
                      </div>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Color Principal</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input type="color" value={form.theme.primary_color} onChange={(e) => handleThemeChange("primary_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={form.theme.primary_color} onChange={(e) => handleThemeChange("primary_color", e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <Label>Color de Fondo</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input type="color" value={form.theme.bg_color} onChange={(e) => handleThemeChange("bg_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={form.theme.bg_color} onChange={(e) => handleThemeChange("bg_color", e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <div>
                  <Label>Color de Texto</Label>
                  <div className="flex gap-2 items-center mt-1">
                    <input type="color" value={form.theme.text_color} onChange={(e) => handleThemeChange("text_color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0" />
                    <Input value={form.theme.text_color} onChange={(e) => handleThemeChange("text_color", e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
              </div>

              {/* Preview swatch */}
              <div className="p-4 rounded-xl border" style={{ backgroundColor: form.theme.bg_color, color: form.theme.text_color }}>
                <p className="font-semibold">Vista previa de colores</p>
                <p className="text-sm opacity-75 mt-1">Así se vería tu página con estos colores.</p>
                <button className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: form.theme.primary_color }}>Botón de ejemplo</button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Type className="h-4 w-4" /> Tipografía y Forma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Familia de Fuente</Label>
                <Select value={form.theme.font_family} onValueChange={(v) => handleThemeChange("font_family", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Redondez de bordes</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Input type="range" min="0" max="24" value={form.theme.border_radius} onChange={(e) => handleThemeChange("border_radius", e.target.value)} className="flex-1" />
                  <Badge variant="secondary">{form.theme.border_radius}px</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Agent Tab */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <AiAgentTab business={business} />
        </TabsContent>
      </Tabs>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
