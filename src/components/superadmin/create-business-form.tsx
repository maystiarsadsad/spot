"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BUSINESS_TYPES } from "@/lib/constants";
import { createBusiness } from "@/lib/actions/businesses";
import { Loader2, Store, Link as LinkIcon, User, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateBusinessForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Basic slugify
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
  };

  const clientAction = async (formData: FormData) => {
    try {
      setError(null);
      const result = await createBusiness(formData);
      if (result && result.error) {
        setError(result.error);
        toast.error("Error al crear negocio: " + result.error);
        return;
      }
      toast.success("Negocio creado correctamente");
      router.push("/sa/businesses");
    } catch (err: any) {
      setError(err.message);
      toast.error("Error al crear negocio: " + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link 
        href="/sa/businesses" 
        className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group w-fit"
      >
        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        Volver a la lista
      </Link>

      <form action={clientAction}>
        <Card className="border-orange-200 dark:border-orange-900/50 shadow-lg bg-card/60 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                <Store className="size-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Crear Nuevo Negocio</CardTitle>
                <CardDescription>
                  Configura un nuevo espacio para un cliente en Spot Platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-900 mb-4 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold flex items-center">
                  <Store className="mr-2 h-4 w-4 text-orange-500/70" />
                  Nombre comercial
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Restaurante Gourmet"
                  value={name}
                  onChange={handleNameChange}
                  required
                  className="bg-background focus:ring-orange-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-sm font-semibold flex items-center">
                  <LinkIcon className="mr-2 h-4 w-4 text-orange-500/70" />
                  URL personalizada (Slug)
                </Label>
                <div className="flex items-center">
                  <span className="px-3 bg-muted h-10 flex items-center text-xs font-mono border-y border-l rounded-l-md text-muted-foreground">
                    /
                  </span>
                  <Input
                    id="slug"
                    name="slug"
                    placeholder="restaurante-gourmet"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="rounded-l-none bg-background focus:ring-orange-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-sm font-semibold flex items-center">
                  <Layers className="mr-2 h-4 w-4 text-orange-500/70" />
                  Tipo de negocio
                </Label>
                <Select name="type" required onValueChange={(val) => setType(val as any)}>
                  <SelectTrigger className="bg-background focus:ring-orange-500/20">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {Object.entries(BUSINESS_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <span>{config.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail" className="text-sm font-semibold flex items-center">
                  <User className="mr-2 h-4 w-4 text-orange-500/70" />
                  Email del dueño (Opcional)
                </Label>
                <Input
                  id="ownerEmail"
                  name="ownerEmail"
                  type="email"
                  placeholder="Dejar en blanco para asignarte temporalmente"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="bg-background focus:ring-orange-500/20"
                />
                <p className="text-[10px] text-muted-foreground italic pl-1">
                  Si se deja en blanco, serás el dueño temporal y podrás reasignarlo luego (Handoff). Si se provee, el usuario debe estar registrado.
                </p>
              </div>
            </div>

            <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/50">
              <h4 className="text-sm font-bold text-orange-700 dark:text-orange-400 mb-2 flex items-center">
                Módulos que se activarán (Default):
              </h4>
              <div className="flex flex-wrap gap-2">
                {type ? (
                  // MOCK Modules visualization for info
                  <span className="text-xs text-muted-foreground italic">
                    Cargando configuración típica para {(BUSINESS_TYPES as any)[type]?.label}...
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Selecciona un tipo de negocio para ver los módulos predeterminados.
                  </span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 flex items-center justify-between border-t rounded-b-xl">
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Al crear el negocio, el dueño recibirá los permisos necesarios automáticamente.
            </p>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-95 min-w-[140px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creando...
        </>
      ) : (
        "Crear Negocio"
      )}
    </Button>
  );
}
