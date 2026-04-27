"use client";

import { useState } from "react";
import {
  MoreVertical,
  UserCog,
  ShieldCheck,
  ShieldBan,
  Loader2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeUserRole } from "@/lib/actions/superadmin";
import { toast } from "sonner";

interface UserActionsDropdownProps {
  userId: string;
  currentRole: string | null;
  displayName: string | null;
  isSelf: boolean;
}

export function UserActionsDropdown({
  userId,
  currentRole,
  displayName,
  isSelf,
}: UserActionsDropdownProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole || "user");
  const [loading, setLoading] = useState(false);

  async function handleChangeRole() {
    if (selectedRole === currentRole) {
      setShowRoleDialog(false);
      return;
    }

    setLoading(true);
    const result = await changeUserRole(userId, selectedRole);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `Rol de ${displayName || "usuario"} actualizado a ${selectedRole}`
      );
      setShowRoleDialog(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonVariants({
            variant: "ghost",
            className:
              "h-8 w-8 p-0 opacity-0 group-hover:opacity-100",
          })}
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/50 mb-1">
            Acciones de Usuario
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            disabled={isSelf}
            onClick={() => setShowRoleDialog(true)}
          >
            <UserCog className="mr-2 h-4 w-4" />
            Cambiar Rol
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" disabled>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Auditar Actividad
          </DropdownMenuItem>
          {!isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                disabled
              >
                <ShieldBan className="mr-2 h-4 w-4" />
                Suspender Acceso
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Plataforma</DialogTitle>
            <DialogDescription>
              Cambia el rol de <strong>{displayName || "este usuario"}</strong>{" "}
              en la plataforma. Esto afecta sus permisos globales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <label className="text-sm font-medium">Nuevo Rol</label>
            <Select value={selectedRole} onValueChange={(v) => v && setSelectedRole(v)}>
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
              {selectedRole === "superadmin" &&
                "⚠️ SuperAdmin tiene acceso total a la plataforma."}
              {selectedRole === "support" &&
                "Soporte puede ver negocios pero no crear ni eliminar."}
              {selectedRole === "user" &&
                "Acceso estándar — solo puede gestionar negocios asignados."}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleChangeRole} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
