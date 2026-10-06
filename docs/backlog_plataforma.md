# BACKLOG EJECUTABLE — Plataforma Unificada (Spot)

> Última auditoría completa: 2026-08-29
> Tablas en BD: 25 | RLS habilitado: 25/25 | Migraciones: 4 (initial_schema, create_reservations, sync_remote_drift, audit_log_insert_policy)

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
| BUS-008 | Handoff UI (transferir owner)  | ✅     | `transferBusinessOwnership()` + diálogo en `/sa/businesses/[id]`. Probado en vivo (2026-10-06): validaciones, transferencia, ruta inversa; el dueño anterior queda como `admin` |

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
| MT-004 | QA multi-tenant                | 🟡     | Vitest instalado y configurado (`npm run test`), primeros tests reales sobre `lib/utils.ts` (2026-09-28). Falta lo que da nombre a la tarea: tests de aislamiento entre negocios contra Supabase — necesita decidir estrategia de DB de pruebas (local vía Docker vs. proyecto Supabase dedicado) antes de escribirlos |

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
| SA-005 | Suspender / Activar negocio    | ✅     | `SuspendBusinessDialog` en `/sa/businesses/[id]` (antes el backend existía sin botón). Probado en vivo con motivo y reactivación |
| SA-006 | Analytics globales             | ❌     | `/sa/analytics` directorio vacío                         |
| SA-007 | Logs de auditoría              | ✅     | `/sa/logs`. Estuvo vacío hasta 2026-10-06: faltaba la política INSERT en `audit_log` y el embed de `profiles` no existe (FK a `auth.users`) |

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

1. **MT-004** — Decidir estrategia de DB de pruebas (Supabase local vía Docker vs. proyecto dedicado) para poder escribir tests de aislamiento multi-tenant reales
2. **EPIC 11** — Decidir si el Builder (proposals/templates) sigue vigente o se cierra
3. **Pendiente de sesión** — Revisar login role de la CLI de Supabase (`supabase db push` devuelve 403 y pide `SUPABASE_DB_PASSWORD`); hoy se aplicó la migración vía conector

## 📊 Resumen de Progreso

| Epic                    | Total | ✅ | 🟡 | ❌ | %     |
| ------------------------ | ----- | -- | -- | -- | ----- |
| 1. Foundation             | 5     | 5  | 0  | 0  | 100%  |
| 2. Auth                   | 6     | 6  | 0  | 0  | 100%  |
| 3. Businesses              | 8     | 8  | 0  | 0  | 100%  |
| 4. Orders                  | 5     | 5  | 0  | 0  | 100%  |
| 5. Dashboard                | 4     | 4  | 0  | 0  | 100%  |
| 6. Multi-Tenant             | 4     | 2  | 2  | 0  | 75%   |
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
| **TOTAL**                                 | **69**| **60** | **3** | **6** | **89%** |

---

## 📝 Historial de sesiones

### 2026-10-06 — Negocio activo tras login, verificación en vivo y audit log

- **Negocio activo tras login**: el layout elegía el primer negocio solo para pintar el sidebar, pero no podía escribir la cookie `spot-business-id`, y las páginas (`getActiveBusiness()`) solo leían la cookie → "Sin negocio seleccionado" hasta hacer click. Ahora `get-user-businesses.ts` resuelve el negocio en un solo lugar (cookie válida o primero) y el sidebar persiste la cookie.
- **BUS-008 y SA-005 probados en vivo** sobre "Restaurante Mock" (revertido): suspender/reactivar, validaciones de email, transferencia y ruta inversa.
- **Bug encontrado — `audit_log` nunca escribió**: solo tenía políticas SELECT, así que todo `logAudit()` fallaba en silencio por RLS. Migración `20261006104622_audit_log_insert_policy.sql` (aplicada vía conector, `db push` daba 403).
- **Bug encontrado — `/sa/logs` vacía aunque hubiera filas**: embebía `profiles:user_id`, pero `audit_log.user_id` referencia `auth.users`. Ahora se consultan los autores aparte. Las acciones de negocio ahora pasan `businessId` al log.

### 2026-09-28 — BUS-008, SA-005 y arranque de MT-004

- **Transferencia de propiedad de negocio** (BUS-008): `transferBusinessOwnership()` en `superadmin.ts` + `TransferOwnershipDialog`. El dueño anterior pasa a `admin` en `business_members` en vez de perder acceso.
- **Corregido un gap que yo mismo había marcado ✅ sin verificar**: `suspendBusiness`/`reactivateBusiness` (SA-005) existían en el backend desde antes pero no estaban conectados a ningún botón. Ahora tienen `SuspendBusinessDialog` en `/sa/businesses/[id]`.
- **No probado en vivo**: sin credenciales de login en este entorno, y crear un usuario de prueba desechable vía el Admin API falló por falta de salida de red en el sandbox de Bash. `tsc --noEmit` y `npm run lint` sí pasan limpio.
- **MT-004 arrancado**: Vitest instalado y configurado (`npm run test` / `test:watch`), primeros tests reales pasando sobre `lib/utils.ts` (9 tests, incluye el caso que motivó `readableTextColor()`). Falta la estrategia de DB de pruebas para poder testear aislamiento multi-tenant de verdad.

### 2026-08-29 — Re-auditoría completa + fixes de infraestructura

- **Re-auditoría de los 16 EPICs** contra el código real (el backlog llevaba desde 2026-04-06 sin actualizarse y varios módulos completos no aparecían: Reservas, Crédito/Fiado, Inventario Avanzado, Agente IA, PWA — se agregaron como EPICs 12–16).
- **Migración de tooling**: proyecto adaptado de Antigravity a Claude Code (ver nota en FND-005).
- **Fix**: Caja (POS) no encontraba productos de Inventario con código de barras al escanearlos — solo miraba `catalog_items.sku`. Ahora también resuelve el barcode del ítem de inventario vinculado.
- **Auditoría de contraste WCAG** en todo el dashboard (15+ páginas, ambos temas): bug sistémico donde `--ink` se invierte en modo oscuro rompía ~25 componentes ("pills" activos, badges); texto blanco fijo sobre colores que se aclaran en oscuro (`--accent`/`--success`/`--violet`).
- **Fix**: el service worker (PWA) cacheaba JS/CSS con estrategia cache-first, sirviendo código viejo indefinidamente en dev y tras cada deploy en producción. Ahora network-first para JS/CSS; no se registra en desarrollo.
- **Reconciliado drift de migraciones**: 7 migraciones aplicadas directo a producción entre abril-mayo nunca tuvieron archivo en el repo (`ai_agent_*` en `businesses`, `inventory.barcode`, `catalog_items.inventory_id`, tablas `catalog_item_ingredients` / `credit_accounts` / `credit_payments`). Reconstruidas en `supabase/migrations/20260829000000_sync_remote_drift.sql`.
