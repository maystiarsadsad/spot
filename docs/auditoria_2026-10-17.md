# Auditoría end-to-end de Spot — 2026-10-17

Alcance: lectura de código, migraciones y docs; `npm test`, `npm run lint` y `npm run build` ejecutados. **No** se consultó la base remota de Supabase ni se probó ninguna explotación. Cada hallazgo indica si fue verificado en el código (V) o es supuesto (S).

## 1. Estado de salud

| Chequeo | Resultado |
|---|---|
| Tests (Vitest) | 91/91 pasan, 9 archivos, todos de lógica pura en `src/lib` |
| Build | Pasa (tras borrar `.next/dev`, que tenía tipos obsoletos del servidor de desarrollo) |
| Lint | **109 errores y 80 avisos**, casi todos `no-explicit-any` en `src/lib/actions/*` |
| CI | No existe (`.github` ausente) |
| Staging | No existe; un solo proyecto Supabase de producción con clientes reales |
| Monitoreo de errores | Ninguno (sin Sentry; solo 49 `console.*`) |

## 2. Qué hay

**Plataforma:** multi-tenant (negocios, miembros, permisos por módulo), 3 niveles de acceso (SuperAdmin `/sa`, panel `/d`, público `/[slug]`), 16 migraciones, PWA, rate limiting en acciones públicas, auditoría (`audit_log`) visible solo al SuperAdmin.

**Panel del negocio (`/d`):** POS con código de barras y fiado · pedidos con domicilio y mapa en vivo · catálogo con opciones y recetas · inventario con descuento automático · contactos · finanzas (gastos, caja diaria, fiado) · reportes · equipo y nómina (registro) · ajustes (perfil, NIT, marca) · editor de página web · asistente con Claude (BYOK, API key en Vault, topes de gasto) con motor de palabras clave como respaldo.

**5 verticales:** pedidos (restaurantes, tiendas), citas (barbería, tatuajes, veterinaria), membresías (gimnasio), estadías (hoteles, con iCal Airbnb/Booking) y órdenes de servicio (mensajería, lavandería). Cada una con su página pública y su enlace privado por token para el cliente final.

**Sitio y legal:** marketing con precios, términos, privacidad, cookies, encargo de datos con aceptación registrada, comprobante imprimible y exportación mensual de ventas.

## 3. Hallazgos por prioridad

### Críticos — resolver antes de cualquier otro trabajo

1. **Escalada a superadmin (V en SQL).** `20260406_initial_schema.sql:26-27`: la política de UPDATE sobre `profiles` es solo `USING (auth.uid() = id)`, sin `WITH CHECK` ni restricción de columnas, y `profiles` contiene `platform_role`. Ninguna migración posterior lo corrige. Un usuario autenticado podría hacerse superadmin con una llamada directa a PostgREST.
2. **Aislamiento entre negocios roto (V en SQL).** `initial_schema.sql:169-176`: en la política "Owners/admins can manage members", el `business_id` sin calificar dentro de la subconsulta se resuelve contra la tabla interna, así que la condición es siempre cierta para cualquier owner/admin de cualquier negocio. Eso da `FOR ALL` sobre `business_members` de todos los negocios.
   - *Pendiente:* confirmar en la base remota (hubo una migración `sync_remote_drift`, así que la realidad puede diferir) con `pg_policies` vía CLI. Si se confirma, hay que revisar `audit_log` por cambios sospechosos.

### Altos

3. **Dueño puede cambiar columnas de plataforma** (`subscription_plan`, `subscription_status`, `suspended`, `internal_notes`) por RLS sin límite de columnas; `webpage.ts` y `settings.ts` pasan objetos del cliente al `.update()` (V).
4. **Anónimos leen columnas internas** de `businesses` publicadas (`owner_id`, `internal_notes`, suscripción) y todas las `webpage_proposals` que no son borrador (V).
5. **Acciones sin `getUser()` ni chequeo de rol/negocio**, apoyadas solo en RLS (contacts, finance, inventory, credits, settings, webpage; `team.ts` `updateMemberRole`/`updateMemberModules`/`removeMember` sin verificar rol ni negocio). Incumple la regla propia de AGENTS.md (V).
6. **RLS sin roles:** un empleado puede alterar caja, gastos y fiado directo por la API; `credit_*` y `reservations` ni exigen miembro activo (V).
7. **Integridad de datos:** el descuento de stock (`orders.ts:460-485`) y el saldo de fiado (`credits.ts:160-182`) son lectura-cálculo-escritura sin transacción. Dos ventas simultáneas pierden descuentos, y un fallo a medias deja un cargo sin saldo (V). Hay que moverlos a funciones SQL atómicas.
8. **`/d/orders` sin límite ni paginación** (`select("*", …)` de todas las transacciones) e índice `transactions(business_id, created_at)` ausente (V).
9. **Sin `error.tsx`, `global-error.tsx` ni `not-found.tsx`**, y sin monitoreo: un fallo de Supabase muestra la pantalla genérica y nadie se entera (V).
10. **Cobros y facturación inexistentes:** sin pasarela de pago, sin IVA/impoconsumo, sin propinas, sin DIAN (que el plan Empresa ya promete).

### Medios

- **Service worker:** cachea HTML autenticado de `/d/*` (queda en equipos compartidos) y su respaldo `/offline` no existe (V).
- **SuperAdmin muestra datos falsos:** "Sincronizado con Stripe $0.00", "Stripe API Status: Conectado (Live)", interruptores y botones sin acción (V). `/sa/analytics`, `/sa/proposals` y `/sa/templates` son carpetas vacías.
- **Cabeceras de seguridad** (CSP, HSTS, frame) ausentes; rate limit falla abierto y login/registro no tienen límite propio.
- **Sin notificaciones** automáticas (recordatorios de cita, estado de pedido); la tabla `notifications` no se usa.
- **Backups:** no hay evidencia en el repo; verificar PITR en Supabase.
- `isSafeFeedUrl` no resuelve DNS (riesgo residual bajo en Vercel). Inyección de fórmulas en el CSV de ventas. Roles `cashier`/`viewer` en `createMember` no existen en el CHECK de la BD.
- **Botón de Google deshabilitado** aunque el backlog lo da por hecho.

### Bajos / orden

- Tablas sin uso: `webpage_sections`, `business_templates`, `webpage_proposals`, `notifications`, `shifts`.
- Archivos basura: `spot-expresivo.css` en raíz (duplicado), `src/app/globals.css.bak`, SVG de plantilla en `public/`.
- i18n: el panel está casi todo en español fijo; `en` y `pt-BR` casi vacíos; marketing solo en español.
- Documentación desactualizada: `AGENTS.md` (Next 15, "shadcn exclusivo", flujo de commits), `docs/backlog_plataforma.md` (4 migraciones, "cron vacío", Gemini).
- Tests: cero para acciones del servidor (pedidos, fiado, finanzas, inventario) y para aislamiento multi-tenant.

### Corrección a un reporte intermedio
Una de las revisiones afirmó que el asistente es solo de palabras clave. Es incorrecto: `src/lib/assistant/claude.ts` y `answer.ts` integran Claude con la API key de cada negocio; el motor de palabras clave es el respaldo sin key.

## 4. Roadmap

**Fase 0 — Seguridad y estabilidad (1 semana, antes de vender más)**
1. Confirmar en la BD remota los puntos críticos 1 y 2 y revisar `audit_log`.
2. Migración de endurecimiento: `WITH CHECK` y límite de columnas en `profiles`; reescribir la política de `business_members` con alias; bloquear columnas de plataforma en `businesses`; vista pública con columnas seguras; `webpage_proposals` solo por token.
3. Añadir `getUser()` y verificación de rol/negocio a las acciones listadas; lista blanca de campos en `settings` y `webpage`.
4. Diferenciar roles en RLS de caja, gastos y fiado.
5. Funciones SQL atómicas para stock y fiado, con tests.
6. `error.tsx`/`global-error.tsx`/`not-found.tsx`, Sentry, arreglar `sw.js` (no cachear `/d/*`, crear `/offline`).
7. Paginar `/d/orders` e índices por `(business_id, created_at)`.

**Fase 1 — Red de seguridad (1–2 semanas)**
- CI en GitHub Actions (lint, test, build); resolver los 109 errores de lint.
- Proyecto Supabase de staging y tests de aislamiento multi-tenant (MT-004).
- Tests de acciones críticas (pedidos, fiado, finanzas, inventario).
- Verificar backups/PITR; cabeceras de seguridad; rate limit en login.
- Limpiar el SuperAdmin (quitar o conectar lo falso), borrar tablas muertas, actualizar AGENTS.md y el backlog.

**Fase 2 — Producto para cobrar y retener en Colombia (4–6 semanas)**
- Pasarela de pago (Wompi/ePayco) para pedidos y para la suscripción de Spot misma.
- Notificaciones automáticas (WhatsApp/email): confirmaciones, recordatorios, estado de pedido.
- IVA/impoconsumo y propinas en POS; exportaciones (contactos, inventario, gastos).
- Onboarding guiado del negocio nuevo; log de actividad visible para el dueño.
- Facturación DIAN cuando el primer cliente la contrate (diseño ya existe en el backlog).

**Fase 3 — Mercado EE. UU. (después de las fases 0–1; 6–10 semanas)**
1. Moneda y formato por negocio (quitar `es-CO` fijo y el default COP); zona horaria por negocio, incluido el export contable.
2. Textos del panel y del sitio a diccionarios; inglés real.
3. Stripe (o Square) como pasarela; sales tax por estado/condado; propinas.
4. SMS en lugar de WhatsApp; direcciones con estado y ZIP.
5. Textos legales para EE. UU. (CCPA, TCPA) y precios en USD.
- Antes de invertir aquí, validar con un piloto de hispanos en EE. UU.

**Fase 4 — Crecimiento**
Analytics del SuperAdmin (MRR, churn, uso por vertical), turnos de empleados, login con Google, decidir el destino del builder (EPIC 11) y de plantillas/propuestas, i18n completo del panel.

---

## Estado al 2026-10-21

**Resuelto (en producción y en `main`)**
- Críticos 1 y 2: autoascenso a superadmin y política de `business_members` (el 2 ya estaba corregido en producción, ahora también en el repo).
- Altos 3, 4, 5, 6: columnas de plataforma de `businesses`, lectura anónima de `businesses`/`webpage_proposals`, guards de rol en acciones, RLS por rol en caja, gastos, fiado e inventario.
- Alto 7 y 8: stock y fiado atómicos (funciones SQL), `/d/orders` con ventana de 30/90/365 días e índice `transactions(business_id, created_at)`.
- Alto 9: `error.tsx`, `global-error.tsx`, `not-found.tsx`. Sin Sentry por decisión del dueño; los errores quedan en los logs de Vercel con su `digest`.
- Medios: service worker v3 (no guarda HTML autenticado, `/offline` existe), `profiles` ya no es legible por todos, Storage `catalog-images` solo escribible por operadores del negocio dueño de la carpeta.
- Hallazgo nuevo: `inventory_movements` nunca registró un movimiento porque su CHECK no coincidía con lo que escribe la app; corregido.

**Pendiente**
- `owner_id`, estado de suscripción y `ai_agent_prompt` siguen visibles en cualquier negocio publicado (bajo riesgo; requeriría una vista pública con columnas explícitas).
- Cabeceras de seguridad (CSP, HSTS), rate limit en login, tests de acciones y de aislamiento RLS, limpieza de los 109 errores de lint, DIAN, pasarela de pagos, notificaciones.
- Backups: confirmar PITR en el plan de Supabase.
