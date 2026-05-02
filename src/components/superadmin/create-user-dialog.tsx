"use client";

import { useState, useTransition } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUserAsSuperadmin } from "@/lib/actions/superadmin";
import { toast } from "sonner";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState("user");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createUserAsSuperadmin({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        display_name: formData.get("display_name") as string,
        platform_role: role,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Usuario creado exitosamente");
        setOpen(false);
        setRole("user");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white shadow-[var(--shadow-stamp)] hover:shadow-[var(--shadow-stamp-lg)] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-display">Crear Usuario</DialogTitle>
          <DialogDescription>
            Crea una nueva cuenta de usuario en la plataforma. El usuario podrá
            iniciar sesión inmediatamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nombre completo</Label>
            <Input
              id="create-name"
              name="display_name"
              placeholder="Juan Pérez"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">Correo electrónico</Label>
            <Input
              id="create-email"
              name="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Contraseña</Label>
            <Input
              id="create-password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Rol de plataforma</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="support">Soporte</SelectItem>
                <SelectItem value="superadmin">SuperAdmin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === "superadmin" &&
                "⚠️ SuperAdmin tiene acceso total a la plataforma."}
              {role === "support" &&
                "Soporte puede ver negocios pero no crear ni eliminar."}
              {role === "user" &&
                "Acceso estándar — solo puede gestionar negocios asignados."}
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
