# BACKLOG EJECUTABLE — Plataforma Unificada (Spot)

> Última auditoría completa: 2026-08-29
> Tablas en BD: 25 | RLS habilitado: 25/25 | Migraciones: 3 (initial_schema, create_reservations, sync_remote_drift)

## Leyenda

- ✅ Completado y funcional
- 🟡 Parcial — existe estructura, falta funcionalidad
- ❌ Pendiente — no iniciado
- 🔒 Bloqueado por otra tarea

---

## EPIC 1 — FOUNDATION

| ID      | Tarea                        | Estado | Notas                                              |
| ------- | ---------------------------- | ------ | -------------------------------------------------- |
| FND-001 | Inicializar proyecto Next.js | ✅     | Next.js 16 + Turbopack, TypeScript                 |
| FND-002 | Setup UI base (shadcn/ui)    | ✅     | shadcn/ui instalado, Tailwind CSS v4               |
| FND-003 | Integrar Supabase            | ✅     | Client + Server helpers, 25 tablas, RLS en todas   |
| FND-004 | Sistema de temas dual        | ✅     | Dark "Midnight Paper" + Light "Clean Crystal". Auditoría de contraste WCAG completa (2026-08-29) |
| FND-005 | Configuración IDE            | ✅     | VSCode settings, CSS linting, Tailwind at-rules. Migrado de Antigravity a Claude Code (2026-08-29): `.claude/commands/{sod,eod}.md`, `.mcp.json` (Context7) |

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

> ℹ️ Se usa el patrón de protección por **Layout Server Guards** (Next.js) en vez de `middleware.ts` (deprecado). `/d/*` redirige a `/login` sin sesión. `/sa/*` además verifica `platform_role === "superadmin"`.

---

## EPIC 3 — BUSINESSES

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| BUS-001 | Tabla businesses               | ✅     | Branding, contacto, tema público, config. de agente IA  |
| BUS-002 | Tabla business_members         | ✅     | user_id + business_id + role + status                   |
| BUS-003 | Crear negocio (SuperAdmin)     | ✅     | Server action, ownerEmail opcional, handoff temporal     |
| BUS-004 | Listar negocios (Sidebar)      | ✅     | Dropdown en sidebar, fallback por owner_id              |
| BUS-005 | Detalle negocio (SuperAdmin)   | ✅     | `/sa/businesses/[id]` — tabs: overview, módulos, subs   |
| BUS-006 | Contexto negocio (cookie)      | ✅     | Cookie `spot-business-id`, persistencia 30 días         |
| BUS-007 | Settings del negocio (tenant)  | ✅     | `/d/settings` — perfil, contacto, color de marca (con selector de texto legible automático) |
| BUS-008 | Handoff UI (transferir owner)  | ❌     | Solo hay `ownerEmail` opcional al crear; no hay UI para transferir un negocio ya existente |

---

## EPIC 4 — ORDERS (POS)

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| ORD-001 | Tablas transactions + items    | ✅     | En schema, con RLS                                      |
| ORD-002 | Crear pedido                   | ✅     | Vía componente /d/pos (POSClient) y orders.ts action    |
| ORD-003 | Listar pedidos                 | ✅     | En /d/orders (OrdersTable), ordenado descendentemente   |
| ORD-004 | Cambiar estado                 | ✅     | Confirmado o Completado, cancelaciones, vía Server Actions |
| ORD-005 | Vista POS rápida               | ✅     | `/d/pos` — cart, escaneo de código de barras (USB + cámara), cobro a crédito |

---

## EPIC 5 — DASHBOARD

| ID       | Tarea                         | Estado | Notas                                                   |
| -------- | ----------------------------- | ------ | ------------------------------------------------------- |
| DASH-001 | Layout dashboard              | ✅     | Sidebar colapsable, header sticky, backdrop-blur        |
| DASH-002 | Navegación                    | ✅     | Links a todos los módulos, role-based (SuperAdmin link) |
| DASH-003 | Stats con data real           | ✅     | `/d` consulta `transactions`, `contacts`, `catalog_items` en vivo |
| DASH-004 | Gráficas (Recharts)           | ✅     | `dashboard-charts.tsx`, recharts instalado y en uso     |

---

## EPIC 6 — MULTI-TENANT

| ID     | Tarea                          | Estado | Notas                                                    |
| ------ | ------------------------------ | ------ | -------------------------------------------------------- |
| MT-001 | Relaciones FK en schema        | ✅     | Todas las tablas tienen `business_id` FK                 |
| MT-002 | RLS policies                   | 🟡     | 25 tablas con RLS habilitado, políticas básicas creadas   |
| MT-003 | Filtrado por business_id       | ✅     | `getActiveBusiness()` helper + dashboard filtrado        |
| MT-004 | QA multi-tenant                | ❌     | No hay framework de tests (jest/vitest/playwright) ni tests de aislamiento |

> ✅ `getActiveBusiness()` en `src/lib/get-active-business.ts` — helper reutilizable para todos los módulos.

---

## EPIC 7 — MÓDULOS (Tenant)

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| MOD-001 | Catálogo (`/d/catalog`)        | ✅     | `catalog_categories`, `catalog_items`. Modo directo (link a inventario) y modo receta (`catalog_item_ingredients`) |
| MOD-002 | Inventario (`/d/inventory`)    | ✅     | `inventory`, `inventory_movements`. Código de barras + descuento automático al vender (ambos modelos) |
| MOD-003 | Contactos (`/d/contacts`)      | ✅     | Tabla: `contacts`                                       |
| MOD-004 | Finanzas (`/d/finance`)        | ✅     | Gastos, Caja Diaria, Cuentas de Crédito/Fiado, stats    |
| MOD-005 | Equipo (`/d/team`)             | ✅     | `employees`, `payroll`, `shifts` + permisos granulares por módulo |
| MOD-006 | Reportes (`/d/reports`)        | ✅     | Recharts. Consolida Gastos, Personal y Clientes         |
| MOD-007 | Tabla business_modules         | ✅     | Existe + toggle action funcional desde SuperAdmin       |

---

## EPIC 8 — SUPERADMIN

| ID     | Tarea                          | Estado | Notas                                                    |
| ------ | ------------------------------ | ------ | -------------------------------------------------------- |
| SA-001 | Role check en sidebar          | ✅     | `platform_role === "superadmin"` condiciona link a `/sa` |
| SA-002 | Lista negocios                 | ✅     | `/sa/businesses` con tabla, badges, búsqueda             |
| SA-003 | Detalle + módulos              | ✅     | `/sa/businesses/[id]` con tabs y BusinessModulesManager  |
| SA-004 | Lista usuarios                 | ✅     | `/sa/users` con data real                                |
| SA-005 | Suspender / Activar negocio    | ✅     | `suspendBusiness` / reactivar en `superadmin.ts`, con razón y audit log |
| SA-006 | Analytics globales             | ❌     | `/sa/analytics` directorio vacío                         |
| SA-007 | Logs de auditoría              | ✅     | `/sa/logs` — UI real sobre tabla `audit_log`             |

---

## EPIC 9 — WEB PÚBLICA

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| PUB-001 | Ruta `/[slug]`                 | ✅     | `(public)/[slug]/page.tsx` — negocio + catálogo público |
| PUB-002 | Render de contenido            | ✅     | Arquitectura distinta a la original: en vez de un builder de `webpage_sections`, la página pública renderiza el catálogo directo (`PublicStorefront`). Las tablas `webpage_sections`/`business_templates`/`webpage_proposals` quedaron sin usar — ver EPIC 11 |
| PUB-003 | Theme público por negocio      | ✅     | `business.theme` (bg/text color) aplicado como CSS vars en `storefront.tsx` |

---

## EPIC 10 — AUTOMATIZACIONES

| ID       | Tarea                         | Estado | Notas                                                   |
| -------- | ----------------------------- | ------ | ------------------------------------------------------- |
| AUTO-001 | Cron jobs                     | ❌     | `src/app/api/cron/` existe pero vacío                   |
| AUTO-002 | Notificaciones                | ❌     | Tabla `notifications` existe, sin lógica de envío ni UI |

---

## EPIC 11 — BUILDER *(evaluar si sigue vigente)*

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| BLD-001 | Proposals (propuestas web)     | ❌     | Tabla `webpage_proposals` sin usar, `/sa/proposals` vacío |
| BLD-002 | Preview de página              | ❌     | Sin componente de preview                               |
| BLD-003 | Templates                      | ❌     | Tabla `business_templates` sin usar, `/sa/templates` vacío |

> ⚠️ El objetivo original de este EPIC (un builder de secciones con propuestas/templates) parece haber sido reemplazado por el enfoque más simple de `/d/webpage` + storefront directo (EPIC 9). Antes de retomarlo, confirmar si sigue siendo el plan o si estas 3 tareas deberían cerrarse como no-aplican.

---

## EPIC 12 — RESERVAS

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| RES-001 | Tabla reservations             | ✅     | `supabase/migrations/20260408132805_create_reservations.sql`, con RLS |
| RES-002 | Calendario / listado           | ✅     | `/d/reservations` — `reservations-calendar.tsx`         |
| RES-003 | Crear / editar reserva         | ✅     | `reservation-dialog.tsx` + `lib/actions/reservations.ts` |

---

## EPIC 13 — CRÉDITO / FIADO

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| CRD-001 | Tablas credit_accounts/payments | ✅    | Con garante, límite, estado. RLS OK. Reconciliadas en `20260829000000_sync_remote_drift.sql` |
| CRD-002 | Gestión de cuentas de crédito  | ✅     | `credit-manager.tsx` en `/d/finance` (417 líneas)       |
| CRD-003 | Cobro a crédito desde POS      | ✅     | `chargeToCredit` en `pos-client.tsx`                     |

---

## EPIC 14 — INVENTARIO AVANZADO (barcode + recetas)

| ID          | Tarea                              | Estado | Notas                                                   |
| ----------- | ----------------------------------- | ------ | ------------------------------------------------------- |
| INVADV-001  | Escaneo de código de barras         | ✅     | Lector USB (`use-barcode-scanner.ts`) + cámara (`camera-scanner.tsx`). Bug de matching Inventario↔Caja corregido 2026-08-29 |
| INVADV-002  | Autocompletar producto por barcode  | ✅     | `barcode-lookup.ts` contra base pública (Open Food Facts) |
| INVADV-003  | Recetas / insumos (modo restaurante) | ✅    | `catalog_item_ingredients` + descuento automático de cada insumo al completar una venta (`orders.ts`) |

---

## EPIC 15 — AGENTE IA (web pública)

| ID     | Tarea                          | Estado | Notas                                                    |
| ------ | ------------------------------ | ------ | -------------------------------------------------------- |
| AI-001 | Config. del agente             | ✅     | `businesses.ai_agent_enabled/prompt/greeting`             |
| AI-002 | Chat público en storefront     | ✅     | `public-chat.ts` (Gemini vía `@google/genai`) + widget en `storefront.tsx` |
| AI-003 | Editor del agente (dashboard)  | ✅     | `ai-agent-tab.tsx` en `/d/webpage` (316 líneas)           |

---

## EPIC 16 — PWA

| ID      | Tarea                          | Estado | Notas                                                   |
| ------- | ------------------------------ | ------ | ------------------------------------------------------- |
| PWA-001 | Manifest + iconos               | ✅     | `src/app/manifest.ts`, `public/icons/`                  |
| PWA-002 | Service worker                  | ✅     | `public/sw.js` — network-first para JS/CSS (fix 2026-08-29), no se registra en dev |
| PWA-003 | Instalable / probado en dispositivo | 🟡 | Infraestructura lista; falta verificar el prompt de instalación real en móvil/desktop |

---

## 🎯 Prioridades Inmediatas (Próximas 3 tareas)

1. **BUS-008** — UI para transferir la propiedad de un negocio ya existente
2. **EPIC 11** — Decidir si el Builder (proposals/templates) sigue vigente o se cierra
3. **MT-004** — Elegir framework de testing e introducir los primeros tests de aislamiento multi-tenant

## 📊 Resumen de Progreso

| Epic                    | Total | ✅ | 🟡 | ❌ | %     |
| ------------------------ | ----- | -- | -- | -- | ----- |
| 1. Foundation             | 5     | 5  | 0  | 0  | 100%  |
| 2. Auth                   | 6     | 6  | 0  | 0  | 100%  |
| 3. Businesses              | 8     | 7  | 0  | 1  | 88%   |
| 4. Orders                  | 5     | 5  | 0  | 0  | 100%  |
| 5. Dashboard                | 4     | 4  | 0  | 0  | 100%  |
| 6. Multi-Tenant             | 4     | 2  | 1  | 1  | 63%   |
| 7. Módulos                  | 7     | 7  | 0  | 0  | 100%  |
| 8. SuperAdmin                | 7     | 6  | 0  | 1  | 86%   |
| 9. Web Pública                | 3     | 3  | 0  | 0  | 100%  |
| 10. Automatizaciones            | 2     | 0  | 0  | 2  | 0%    |
| 11. Builder                      | 3     | 0  | 0  | 3  | 0%    |
| 12. Reservas                      | 3     | 3  | 0  | 0  | 100%  |
| 13. Crédito / Fiado                 | 3     | 3  | 0  | 0  | 100%  |
| 14. Inventario Avanzado               | 3     | 3  | 0  | 0  | 100%  |
| 15. Agente IA                           | 3     | 3  | 0  | 0  | 100%  |
| 16. PWA                                   | 3     | 2  | 1  | 0  | 83%   |
| **TOTAL**                                 | **69**| **59** | **2** | **8** | **87%** |

---

## 📝 Historial de sesiones

### 2026-08-29 — Re-auditoría completa + fixes de infraestructura

- **Re-auditoría de los 16 EPICs** contra el código real (el backlog llevaba desde 2026-04-06 sin actualizarse y varios módulos completos no aparecían: Reservas, Crédito/Fiado, Inventario Avanzado, Agente IA, PWA — se agregaron como EPICs 12–16).
- **Migración de tooling**: proyecto adaptado de Antigravity a Claude Code (ver nota en FND-005).
- **Fix**: Caja (POS) no encontraba productos de Inventario con código de barras al escanearlos — solo miraba `catalog_items.sku`. Ahora también resuelve el barcode del ítem de inventario vinculado.
- **Auditoría de contraste WCAG** en todo el dashboard (15+ páginas, ambos temas): bug sistémico donde `--ink` se invierte en modo oscuro rompía ~25 componentes ("pills" activos, badges); texto blanco fijo sobre colores que se aclaran en oscuro (`--accent`/`--success`/`--violet`).
- **Fix**: el service worker (PWA) cacheaba JS/CSS con estrategia cache-first, sirviendo código viejo indefinidamente en dev y tras cada deploy en producción. Ahora network-first para JS/CSS; no se registra en desarrollo.
- **Reconciliado drift de migraciones**: 7 migraciones aplicadas directo a producción entre abril-mayo nunca tuvieron archivo en el repo (`ai_agent_*` en `businesses`, `inventory.barcode`, `catalog_items.inventory_id`, tablas `catalog_item_ingredients` / `credit_accounts` / `credit_payments`). Reconstruidas en `supabase/migrations/20260829000000_sync_remote_drift.sql`.
