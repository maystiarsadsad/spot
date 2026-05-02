"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MODULES, ROLES_BY_TYPE, type BusinessType } from "@/lib/constants";
import {
  createMember,
  updateMemberRole,
  updateMemberModules,
  removeMember,
} from "@/lib/actions/team";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Crown,
  UserPlus,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface MemberProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  permissions: any;
  status: string | null;
  joined_at: string | null;
  profile: MemberProfile | null;
}

interface AccessManagerProps {
  businessId: string;
  businessType: string;
  members: Member[];
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  owner: { label: "Propietario", color: "#d97706", icon: Crown },
  admin: { label: "Administrador", color: "#2563eb", icon: ShieldCheck },
  manager: { label: "Gerente", color: "#7c3aed", icon: Shield },
  cashier: { label: "Cajero", color: "#059669", icon: Shield },
  employee: { label: "Empleado", color: "#0891b2", icon: Shield },
  viewer: { label: "Solo lectura", color: "#6b7280", icon: Shield },
};

const ASSIGNABLE_ROLES = ["admin", "manager", "cashier", "employee", "viewer"];

export function AccessManager({ businessId, businessType, members: initialMembers }: AccessManagerProps) {
  const [members, setMembers] = useState(initialMembers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Create form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState("cashier");
  const [formPosition, setFormPosition] = useState("");
  const [formModules, setFormModules] = useState<string[]>(["transactions"]);

  const positions = ROLES_BY_TYPE[businessType as BusinessType] || ROLES_BY_TYPE.custom;

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("cashier");
    setFormPosition("");
    setFormModules(["transactions"]);
    setShowPassword(false);
  };

  const handleCreate = () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      toast.error("Nombre, email y contraseña son obligatorios");
      return;
    }
    if (formPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    startTransition(async () => {
      const result = await createMember(businessId, {
        display_name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
        modules: formModules,
        position: formPosition || undefined,
      });
      if (result.success) {
        toast.success("Usuario creado exitosamente");
        resetForm();
        setShowCreate(false);
        router.refresh();
      } else {
        toast.error(result.error || "Error al crear usuario");
      }
    });
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, newRole);
      if (result.success) {
        toast.success("Rol actualizado");
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const handleModuleToggle = (memberId: string, currentModules: string[], moduleKey: string) => {
    const newModules = currentModules.includes(moduleKey)
      ? currentModules.filter((m) => m !== moduleKey)
      : [...currentModules, moduleKey];

    startTransition(async () => {
      const result = await updateMemberModules(memberId, newModules);
      if (result.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId
              ? { ...m, permissions: { ...m.permissions, modules: newModules } }
              : m
          )
        );
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const handleRemove = (memberId: string, name: string) => {
    if (!confirm(`¿Eliminar acceso de ${name}? El usuario conservará su cuenta pero ya no podrá acceder a este negocio.`)) return;
    startTransition(async () => {
      const result = await removeMember(memberId);
      if (result.success) {
        toast.success("Acceso eliminado");
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        toast.error(result.error || "Error");
      }
    });
  };

  const getMemberModules = (member: Member): string[] => {
    if (!member.permissions || typeof member.permissions !== "object") return [];
    return Array.isArray(member.permissions.modules) ? member.permissions.modules : [];
  };

  const isFullAccess = (role: string) => role === "owner" || role === "admin";

  return (
    <div className="acc-root">
      {/* Header */}
      <div className="acc-header">
        <div>
          <h3>Accesos al Dashboard</h3>
          <p>{members.length} miembro{members.length !== 1 ? "s" : ""} con acceso</p>
        </div>
        <button className="fin-cash-btn primary" onClick={() => setShowCreate(!showCreate)}>
          <UserPlus size={15} />
          Crear Usuario
        </button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="acc-invite">
          <div className="acc-invite-header">
            <UserPlus size={16} />
            <span>Crear nueva cuenta de usuario</span>
          </div>
          <div className="acc-invite-form">
            <div className="acc-invite-row">
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Nombre completo</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="fin-cash-input"
                />
              </div>
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="fin-cash-input"
                />
              </div>
            </div>

            <div className="acc-invite-row">
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Contraseña</label>
                <div className="acc-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="fin-cash-input"
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="acc-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="acc-invite-field" style={{ flex: 1 }}>
                <label>Rol en el negocio</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="inv-ing-select"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r]?.label || r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="acc-invite-field">
              <label>Cargo / Posición</label>
              <select
                value={formPosition}
                onChange={(e) => setFormPosition(e.target.value)}
                className="inv-ing-select"
              >
                <option value="">Automático según rol</option>
                {positions.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="acc-invite-field">
              <label>Módulos permitidos</label>
              <div className="acc-module-grid compact">
                {Object.entries(MODULES).map(([key, config]) => (
                  <label key={key} className="acc-module-check">
                    <input
                      type="checkbox"
                      checked={formModules.includes(key)}
                      onChange={() =>
                        setFormModules((prev) =>
                          prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
                        )
                      }
                    />
                    <span>{(config as any).defaultLabel}</span>
                  </label>
                ))}
              </div>
              <span className="acc-hint">
                El usuario podrá iniciar sesión con su email y contraseña, y solo verá los módulos seleccionados.
              </span>
            </div>

            <div className="acc-invite-actions">
              <button
                className="fin-cash-btn secondary"
                onClick={() => { setShowCreate(false); resetForm(); }}
              >
                Cancelar
              </button>
              <button className="fin-cash-btn primary" onClick={handleCreate} disabled={isPending}>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="acc-list">
        {members.map((member) => {
          const roleConf = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
          const RoleIcon = roleConf.icon;
          const modules = getMemberModules(member);
          const isExpanded = expandedId === member.id;
          const fullAccess = isFullAccess(member.role);
          const displayName = member.profile?.display_name || "Sin nombre";
          const email = member.profile?.email || "—";
          const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

          return (
            <div key={member.id} className="acc-member">
              <div className="acc-member-row" onClick={() => setExpandedId(isExpanded ? null : member.id)}>
                <div className="acc-member-avatar">
                  {member.profile?.avatar_url ? (
                    <img src={member.profile.avatar_url} alt="" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="acc-member-info">
                  <span className="acc-member-name">{displayName}</span>
                  <span className="acc-member-email">{email}</span>
                </div>
                <span className="acc-role-badge" style={{ borderColor: roleConf.color, color: roleConf.color }}>
                  <RoleIcon size={12} />
                  {roleConf.label}
                </span>
                <span className="acc-module-count">
                  {fullAccess ? "Acceso total" : `${modules.length} módulos`}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExpanded && (
                <div className="acc-member-detail">
                  {member.role !== "owner" && (
                    <div className="acc-detail-section">
                      <label>Rol</label>
                      <div className="acc-role-pills">
                        {ASSIGNABLE_ROLES.map((r) => (
                          <button
                            key={r}
                            className={`acc-role-pill ${member.role === r ? "active" : ""}`}
                            onClick={() => handleRoleChange(member.id, r)}
                            disabled={isPending}
                          >
                            {ROLE_CONFIG[r]?.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="acc-detail-section">
                    <label>
                      Módulos visibles
                      {fullAccess && <span className="acc-detail-hint"> — acceso total por rol</span>}
                    </label>
                    <div className="acc-module-grid">
                      {Object.entries(MODULES).map(([key, config]) => {
                        const checked = fullAccess || modules.includes(key);
                        return (
                          <label key={key} className={`acc-module-check ${fullAccess ? "disabled" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={fullAccess || isPending}
                              onChange={() => handleModuleToggle(member.id, modules, key)}
                            />
                            <span>{(config as any).defaultLabel}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {member.role !== "owner" && (
                    <button
                      className="acc-remove-btn"
                      onClick={() => handleRemove(member.id, displayName)}
                      disabled={isPending}
                    >
                      <Trash2 size={14} />
                      Eliminar acceso
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {members.length === 0 && (
          <div className="fin-empty">
            <Shield size={40} strokeWidth={1} />
            <p>No hay miembros registrados en este negocio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
