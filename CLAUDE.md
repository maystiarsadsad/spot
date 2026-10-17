@AGENTS.md

---

# Traspaso — leer primero (actualizado 2026-10-15)

> `AGENTS.md` (importado arriba) tiene las **reglas obligatorias**, el stack, los patrones de código y la descripción de cada vertical. Este bloque agrega lo que hace falta para retomar el proyecto desde cero en una cuenta nueva de Claude, sin el historial de chats.

## Qué es y para qué
**Spot** ("Tu negocio, tu lugar") es un SaaS multi-tenant para negocios locales en **Colombia** (precios en COP, WhatsApp de ventas, facturación DIAN en el roadmap). Cada negocio tiene:
- **Página pública** `/[slug]` (tienda / reservas / inscripción / búsqueda de habitaciones / solicitud de servicio, según su vertical) + páginas privadas por token para el cliente final (`/[slug]/pedido|cita|socio|estadia|servicio|repartidor/[token]`).
- **Panel del negocio** `/d/*` (POS, pedidos, catálogo, inventario, contactos, finanzas con fiado, equipo, reportes, asistente IA, página web, ajustes + el módulo de su vertical: agenda, socios, estadías, servicios).
- **SuperAdmin** `/sa/*` (crear/suspender/transferir negocios, módulos, usuarios, logs de auditoría).
- **Sitio de marketing** `/` (home con precios y demos) + legales (`/terminos`, `/privacidad`, `/cookies`, `/encargo-de-datos`).

Es un **proyecto propio del usuario (side project)**, no de Ads Factory. Ya tiene **clientes reales** (ver "Existing Businesses" en AGENTS.md).

Planes publicados (`public/locales/es/marketing.json` → `pricing.plans`, COP/mes + implementación): Esencial 50.000 (+500.000), Profesional 83.000 (+1.050.000), Empresa desde 150.000 (+2.500.000). Anual = 10 meses. Facturación electrónica DIAN incluida en Empresa, adicional en Profesional (aún no construida).

## Entorno de esta carpeta (cuentas)
Esta carpeta está en `Documents\Aplicaciones Propias\` → entorno **proyectos** (ver `C:\Users\USUARIO\Documents\ENTORNOS_LEEME.md`). Git, `gh`, `vercel` y `supabase` cambian de cuenta solos según la carpeta:
- **Git / GitHub**: cuenta `maystiarsadsad`. Remoto `git@github.com:maystiarsadsad/spot.git` (SSH, rama `main`). ⚠️ El repo es **PÚBLICO**: nunca commitear secretos.
- **Vercel**: cuenta `ariascrc-3925` (confirmado por el usuario el 2026-10-15). Producción: `https://spot-pi-olive.vercel.app` (homepage del repo en GitHub). Deploy automático al hacer push a `main` (integración Git de Vercel; no hay `.vercel/` local). No hay dominio propio configurado en el código (`siteUrl()` usa `NEXT_PUBLIC_SITE_URL` o `VERCEL_PROJECT_PRODUCTION_URL`).
- **Supabase**: proyecto ref `lswjtmbyboalwysrsavd` (producción, único; no hay staging). Pertenece a la cuenta de Supabase del entorno proyectos (confirmado por el usuario el 2026-10-15). El CLI usa el `SUPABASE_ACCESS_TOKEN` del entorno proyectos.
- No ejecutar `vercel login` / `gh auth login` / `supabase login`: si no hay sesión, los wrappers del entorno avisan.

## Instalar, correr, probar, desplegar
```bash
npm install
cp .env.example .env.local   # ojo: .env.example está en .gitignore (.env*), en un clon nuevo no existe → crear .env.local con la tabla de abajo
npm run dev                  # http://localhost:3000 (en Claude Desktop: preview "spot-dev" de .claude/launch.json)
npm test                     # Vitest, src/**/*.test.ts — 91 tests, 9 archivos (lógica pura de verticales, utils, asistente)
npm run lint
npm run build                # verificar antes de cerrar el día
```
- **Deploy**: `git push` a `main` → Vercel construye y publica. No hay CI aparte.
- **Migraciones**: archivos en `supabase/migrations/` (16 al 2026-10-14). Aplicar con `supabase db push`. Gotcha conocido: el CLI ha devuelto **403 en el login role y pide `SUPABASE_DB_PASSWORD`**; en esos casos se aplicaron por el conector de Supabase y luego se dejó el archivo en el repo con el mismo nombre. Si repites eso, el archivo SIEMPRE debe quedar en `supabase/migrations/` (hubo un drift de 7 migraciones aplicadas solo en producción, reconstruidas en `20260829000000_sync_remote_drift.sql`).
- **Tipos**: `supabase gen types typescript --project-id lswjtmbyboalwysrsavd > src/types/database.ts`.
- **Cron**: `vercel.json` → `/api/cron/ical-sync` diario 09:00 UTC (requiere `CRON_SECRET`).
- **Demos**: `node --env-file=.env.local scripts/seed-demos.mjs` (ver AGENTS.md). Usa la secret key (salta RLS) — solo toca slugs `demo-*`.

## Variables de entorno (solo nombres)
| Variable | Dónde | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | local + Vercel | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | local + Vercel | clave pública (anon/publishable) |
| `SUPABASE_SECRET_KEY` | local + Vercel (server) | cliente admin (`src/lib/supabase/admin.ts`): crear usuarios, equipo, rate limit, seed de demos. Fallback legado: `SUPABASE_SERVICE_ROLE_KEY` |
| `CRON_SECRET` | Vercel | protege `/api/cron/ical-sync` |
| `NEXT_PUBLIC_SITE_URL` | opcional | dominio propio; si falta usa `VERCEL_PROJECT_PRODUCTION_URL` (automática en Vercel) o `localhost:3000` |
| `DEMO_OWNER_EMAIL`, `DEMO_WHATSAPP` | opcional, solo script de demos | dueño (superadmin) y WhatsApp de las demos; tienen default en `scripts/seed-demos.mjs` |

- **No hay API key de IA a nivel plataforma.** El asistente usa la **API key de Anthropic de cada negocio (BYOK)**, guardada cifrada en **Supabase Vault** (migración `20261006140000_ai_assistant_claude.sql`), con topes de gasto mensuales y registro de uso (`/d/asistente`, `src/lib/assistant/`). Sin key, responde con un motor de palabras clave (`keyword-engine.ts`).
- `.env.local` todavía contiene una `GEMINI_API_KEY` que **ya no se usa** (el chat con Gemini fue reemplazado por Claude).

## Servicios externos
- **Supabase**: Postgres + Auth (email/contraseña; el backlog menciona Google pero no hay `signInWithOAuth` en el código) + Storage (imágenes de catálogo) + Realtime (mapa del repartidor en vivo) + Vault.
- **Vercel**: hosting, cron, `after()` para sincronizar iCal en segundo plano.
- **Anthropic API**: por negocio (BYOK), `@anthropic-ai/sdk`.
- **OpenStreetMap** (tiles de Leaflet), **Open Food Facts** (autocompletar producto por código de barras), **WhatsApp `wa.me`** (ventas y contacto), **Airbnb / Booking.com** vía iCal (estadías), **Unsplash** (fotos de las demos).
- **Context7 MCP** (`.mcp.json`, vía `npx @upstash/context7-mcp`): AGENTS.md exige consultarlo antes de escribir código. Si no conecta, leer `node_modules/next/dist/docs/`.

## Estructura (además de lo que muestra AGENTS.md)
- `src/app/(marketing)/` home + legales · `src/app/comprobante/[id]` comprobante de venta imprimible · `src/app/api/export/ventas` exportación mensual para el contador · `src/app/api/ical/[token]` feed iCal por habitación.
- `src/lib/actions/*.ts` todas las Server Actions por módulo · `src/lib/{booking,memberships,stays,service-orders}/` lógica pura de cada vertical (con tests) · `src/lib/rate-limit.ts` límite de intentos en acciones públicas (RPC `rate_limit_hit`) · `src/lib/legal.ts` versiones de términos aceptados en el registro.
- `src/lib/AGENTS.md` reglas del "agente backend" (Server Actions, RLS). `docs/agents_system.md` esquema de roles de agentes (orquestador/frontend/backend/QA).
- `docs/backlog_plataforma.md` backlog por EPICs + historial de sesiones (fuente de verdad del avance; ver "Desactualizado" abajo).
- `docs/Rediseño/` prototipos HTML/JSX del rediseño visual "expresivo" (referencia de diseño, no se compilan). `spot-expresivo.css` en la raíz es copia idéntica de `docs/Rediseño/spot-expresivo.css` y no se importa en `src/`.
- `.claude/commands/{sod,eod}.md` flujos de inicio y cierre de jornada.

## Convenciones y gotchas
- **Idioma**: responder al usuario siempre en **español**. Mensajes de commit en español con prefijo convencional (`feat(stays): …`, `fix(dashboard): …`).
- **Commits**: según AGENTS.md, solo al cierre del día con `/eod` (build → un commit → push → actualizar backlog). En la práctica los últimos días se hicieron commits por funcionalidad; confirmar con el usuario.
- **Clientes reales** (Briago, Comidas Rápidas Santo Domingo, CostiAlitas): nunca sembrar ni modificar sus datos. Probar con las demos `demo-*`.
- **Next.js 16** (no 15 como dice el stack en AGENTS.md) + React 19.2: protección de rutas con guards en layouts (no middleware). Leer `node_modules/next/dist/docs/` antes de usar APIs.
- UI: shadcn/ui sobre **Base UI** (`@base-ui/react`) + Lucide. Excepciones ya instaladas: Leaflet (mapas), Recharts (gráficas), html5-qrcode (escáner por cámara), sonner, react-day-picker.
- **i18n**: hay diccionarios en `public/locales/{es,en,pt-BR}/common.json` y `es/marketing.json`, pero gran parte del panel aún tiene texto en español directo en los componentes. El objetivo (AGENTS.md) es no hardcodear; no hay traducción real a en/pt-BR todavía.
- Negocio activo del panel: cookie `spot-business-id` resuelta en `src/lib/get-user-businesses.ts` / `get-active-business.ts`.
- `audit_log.user_id` referencia `auth.users` (no `profiles`): no se puede embeber `profiles` en ese select.
- Colores de marca: usar `readableTextColor()` (`src/lib/utils.ts`) para texto sobre el color del negocio; el tema oscuro invierte `--ink`.
- PWA: `public/sw.js` es network-first para JS/CSS y no se registra en dev.
- Formularios con contraseña usan POST nativo si el JS no cargó (no romper ese fallback).
- Imágenes de demos: Unsplash validadas con `--check-images`; sin marcas reales en demos ni en la página pública.

## Estado actual (2026-10-14, último commit `1e288d9`)
Funcional y en producción. Hecho: núcleo (auth, multi-negocio, POS con código de barras, pedidos con domicilio y mapa en vivo, catálogo con opciones tipo Rappi y recetas, inventario, contactos, finanzas con fiado, equipo con permisos, reportes, PWA), los **5 motores de vertical** (pedidos, citas, membresías, estadías con iCal, órdenes de servicio), asistente con Claude (BYOK), rate limiting, sitio de marketing con precios 2026, legales + aceptación de términos y acuerdo de encargo de datos, comprobante imprimible y exportación para el contador. Tests: 91/91 pasando (2026-10-15).

**Desactualizado en `docs/backlog_plataforma.md`** (auditado hasta 2026-10-06): EPIC 10 dice que `api/cron` está vacío (ya existe `ical-sync`); EPIC 15 menciona Gemini (`@google/genai`), hoy es Claude; los motores de vertical, marketing, legales y facturación de octubre no tienen EPIC. `.env.example` también estaba desactualizado (se actualizó el 2026-10-15, pero está ignorado por git: solo existe en esta PC).

## Pendiente / próximos pasos
1. **Facturación electrónica DIAN** — diseño completo en la última sección de `docs/backlog_plataforma.md`; se construye cuando el primer cliente la contrate.
2. **MT-004** — tests de aislamiento multi-tenant contra Supabase: falta decidir DB de pruebas (Supabase local con Docker vs. proyecto dedicado).
3. **EPIC 11 (Builder)** — decidir si se cierra: `webpage_sections`/`business_templates`/`webpage_proposals` están sin usar.
4. **SA-006** analíticas globales en `/sa` y **AUTO-002** notificaciones (tabla `notifications` sin lógica).
5. **PWA-003** probar instalación real en móvil.
6. Arreglar el acceso del CLI de Supabase (`db push` 403 / `SUPABASE_DB_PASSWORD`).
7. i18n real del panel y traducciones en/pt-BR.
8. Poner al día `docs/backlog_plataforma.md` con lo de octubre.
9. Sesión del 2026-10-06 dejó "en pendiente hasta nuevo aviso" una revisión del **color de marca** del panel (la página pública tiene su propia personalización).
