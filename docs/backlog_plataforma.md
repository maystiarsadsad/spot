# BACKLOG EJECUTABLE — Plataforma Unificada (Spot)

> Última auditoría: 2026-04-06
> Tablas en BD: 21 | RLS habilitado: 21/21 | Migración: 1 (initial_schema)

## Leyenda

- ✅ Completado y funcional
- 🟡 Parcial — existe estructura, falta funcionalidad
- ❌ Pendiente — no iniciado
- 🔒 Bloqueado por otra tarea

---

## EPIC 1 — FOUNDATION

| ID      | Tarea                        | Estado | Notas                                              |
| ------- | ---------------------------- | ------ | -------------------------------------------------- |
| FND-001 | Inicializar proyecto Next.js | ✅     | Next.js 15 + Turbopack, TypeScript                 |
| FND-002 | Setup UI base (shadcn/ui)    | ✅     | shadcn/ui instalado, Tailwind CSS v4               |
| FND-003 | Integrar Supabase            | ✅     | Client + Server helpers, 21 tablas, RLS en todas   |
| FND-004 | Sistema de temas dual        | ✅     | Dark "Obsidian Monolith" + Light "Clean Crystal"   |
| FND-005 | Configuración IDE            | ✅     | VSCode settings, CSS linting, Tailwind at-rules    |

---

## EPIC 2 — AUTH

| ID       | Tarea                          | Estado | Notas                                                    |
| -------- | ------------------------------ | ------ | -------------------------------------------------------- |
| AUTH-001 | Tabla profiles + trigger       | ✅     | Auto-create on signup, platform_role field                |
| AUTH-002 | Login UI                       | ✅     | Formulario galáctico, Google social, dark/light           |
| AUTH-003 | Register UI                    | ✅     | Formulario galáctico, confirm password, validación client |
| AUTH-004 | Protección de rutas (layouts)  | ✅     | Guards en Server Components: `getUser()` + `redirect()`  |
| AUTH-005 | Logout action                  | ✅     | Server action en `auth.ts`                               |
| AUTH-006 | AuthProvider (client context)  | ✅     | `AuthProvider` en layout, profile reactivo                |

> ℹ️ Se usa el patrón de protección por **Layout Server Guards** (Next.js 15) en vez de `middleware.ts` (deprecado). `/d/*` redirige a `/login` sin sesión. `/sa/*` además verifica `platform_role === "superadmin"`.

---

## EPIC 3 — BUSINESSES

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| BUS-001 | Tabla businesses               | ✅     | 21 campos, tipos de negocio, branding, contacto         |
| BUS-002 | Tabla business_members         | ✅     | user_id + business_id + role + status                   |
| BUS-003 | Crear negocio (SuperAdmin)     | ✅     | Server action, ownerEmail opcional, handoff temporal     |
| BUS-004 | Listar negocios (Sidebar)      | ✅     | Dropdown en sidebar, fallback por owner_id              |
| BUS-005 | Detalle negocio (SuperAdmin)   | ✅     | `/sa/businesses/[id]` — tabs: overview, módulos, subs   |
| BUS-006 | Contexto negocio (cookie)      | ✅     | Cookie `spot-business-id`, persistencia 30 días         |
| BUS-007 | Settings del negocio (tenant)  | ❌     | `/d/settings` está vacío — no hay form de edición       |
| BUS-008 | Handoff UI (transferir owner)  | ❌     | No hay interfaz para transferir propiedad               |

---

## EPIC 4 — ORDERS (POS)

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| ORD-001 | Tablas transactions + items    | ✅     | En schema, con RLS                                      |
| ORD-002 | Crear pedido                   | ✅     | Vía componente /d/pos (POSClient) y orders.ts action    |
| ORD-003 | Listar pedidos                 | ✅     | En /d/orders (OrdersTable), ordenado descendentemente   |
| ORD-004 | Cambiar estado                 | ✅     | Confirmado o Completado, cancelaciones, vía Server Actions |
| ORD-005 | Vista POS rápida               | ✅     | `/d/pos` interfaz tipo cart con grid de ítems del catálogo|

---

## EPIC 5 — DASHBOARD

| ID       | Tarea                         | Estado | Notas                                                   |
| -------- | ----------------------------- | ------ | ------------------------------------------------------- |
| DASH-001 | Layout dashboard              | ✅     | Sidebar colapsable, header sticky, backdrop-blur        |
| DASH-002 | Navegación                    | ✅     | Links a todos los módulos, role-based (SuperAdmin link) |
| DASH-003 | Stats con data real           | 🟡     | Existe UI de cards con valores hardcoded (`$0`, `0`)    |
| DASH-004 | Gráficas (Recharts)           | ❌     | Sin librería instalada, sin componentes de charts       |

---

## EPIC 6 — MULTI-TENANT

| ID     | Tarea                          | Estado | Notas                                                    |
| ------ | ------------------------------ | ------ | -------------------------------------------------------- |
| MT-001 | Relaciones FK en schema        | ✅     | Todas las tablas tienen `business_id` FK                 |
| MT-002 | RLS policies                   | 🟡     | 21 tablas con RLS habilitado, políticas básicas creadas   |
| MT-003 | Filtrado por business_id       | ✅     | `getActiveBusiness()` helper + dashboard filtrado        |
| MT-004 | QA multi-tenant                | ❌     | No hay tests de aislamiento entre negocios               |

> ✅ `getActiveBusiness()` en `src/lib/get-active-business.ts` — helper reutilizable para todos los módulos.

---

## EPIC 7 — MÓDULOS (Tenant)

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| MOD-001 | Catálogo (`/d/catalog`)        | ✅     | Tablas: `catalog_categories`, `catalog_items`           |
| MOD-002 | Inventario (`/d/inventory`)    | ✅     | Tablas: `inventory`, `inventory_movements`              |
| MOD-003 | Contactos (`/d/contacts`)      | ✅     | Tabla: `contacts`                                       |
| MOD-004 | Finanzas (`/d/finance`)        | 🟡     | Vistas base construidas: Gastos y Caja Diaria. Falta estadísticas. |
| MOD-005 | Equipo (`/d/team`)             | ✅     | Tablas: `employees`, `payroll`, `shifts`                |
| MOD-006 | Reportes (`/d/reports`)        | ✅     | Recharts. Consolida Gastos, Personal y Clientes         |
| MOD-007 | Tabla business_modules         | ✅     | Existe + toggle action funcional desde SuperAdmin       |

---

## EPIC 8 — SUPERADMIN

| ID     | Tarea                          | Estado | Notas                                                    |
| ------ | ------------------------------ | ------ | -------------------------------------------------------- |
| SA-001 | Role check en sidebar          | ✅     | `platform_role === "superadmin"` condiciona link a `/sa` |
| SA-002 | Lista negocios                 | ✅     | `/sa/businesses` con tabla, badges, búsqueda             |
| SA-003 | Detalle + módulos              | ✅     | `/sa/businesses/[id]` con tabs y BusinessModulesManager  |
| SA-004 | Lista usuarios                 | 🟡     | `/sa/users` existe, revisar si tiene data real           |
| SA-005 | Suspender / Activar negocio    | ❌     | Sin acción de suspensión                                 |
| SA-006 | Analytics globales             | ❌     | `/sa/analytics` directorio existe, sin contenido         |
| SA-007 | Logs de auditoría              | ❌     | Tabla `audit_log` existe, sin UI                         |

---

## EPIC 9 — WEB PÚBLICA

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| PUB-001 | Ruta `/[slug]`                 | ❌     | Sin ruta dinámica para páginas públicas                 |
| PUB-002 | Render de secciones            | ❌     | Tabla `webpage_sections` existe, sin renderer           |
| PUB-003 | Theme público por negocio      | ❌     | Sin sistema de theming por tenant                       |

---

## EPIC 10 — AUTOMATIZACIONES

| ID       | Tarea                         | Estado | Notas                                                   |
| -------- | ----------------------------- | ------ | ------------------------------------------------------- |
| AUTO-001 | Cron jobs                     | ❌     | Sin Edge Functions ni cron                              |
| AUTO-002 | Notificaciones                | ❌     | Tabla `notifications` existe, sin lógica de envío       |

---

## EPIC 11 — BUILDER

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| BLD-001 | Proposals (propuestas web)     | ❌     | Tabla `webpage_proposals` existe, `/sa/proposals` vacío |
| BLD-002 | Preview de página              | ❌     | Sin componente de preview                               |
| BLD-003 | Templates                      | ❌     | Tabla `business_templates` existe, sin UI               |

---

## 🎯 Prioridades Inmediatas (Próximas 3 tareas)

1. **RES-001** — Reservas (calendario/listado base)
2. **BLD-001** — Editor de plantilla Builder
3. **Módulo Finanzas** — Iniciar FIN-001

## 📊 Resumen de Progreso

| Epic             | Total | ✅ | 🟡 | ❌ | %     |
| ---------------- | ----- | -- | -- | -- | ----- |
| 1. Foundation    | 5     | 5  | 0  | 0  | 100%  |
| 2. Auth          | 6     | 6  | 0  | 0  | 100%  |
| 3. Businesses    | 8     | 7  | 0  | 1  | 87%   |
| 4. Orders        | 5     | 5  | 0  | 0  | 100%  |
| 5. Dashboard     | 4     | 2  | 1  | 1  | 63%   |
| 6. Multi-Tenant  | 4     | 2  | 1  | 1  | 63%   |
| 7. Módulos       | 7     | 2  | 0  | 5  | 28%   |
| 8. SuperAdmin    | 7     | 3  | 1  | 3  | 50%   |
| 9. Web Pública   | 3     | 0  | 0  | 3  | 0%    |
| 10. Automations  | 2     | 0  | 0  | 2  | 0%    |
| 11. Builder      | 3     | 0  | 0  | 3  | 0%    |
| **TOTAL**        | **54**| **32** | **3** | **19** | **59%** |
