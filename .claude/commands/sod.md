---
description: Start of Day — Iniciar jornada de desarrollo
---

# SOD — Start of Day

Ejecutar al inicio de cada sesión de trabajo.

## Pasos

1. **Verificar estado del proyecto**
   ```bash
   cd "C:/Users/USUARIO/Documents/Aplicaciones Propias/spot" && git status && git log -3 --oneline
   ```

2. **Verificar dependencias**
   ```bash
   npm ls --depth=0
   ```

3. **Verificar Supabase**
   - Usar el CLI de `supabase` (nunca el MCP de Supabase — regla de `AGENTS.md`), por ejemplo:
   ```bash
   supabase migration list
   ```
   - Confirmar que las migraciones locales están sincronizadas con el proyecto remoto (`lswjtmbyboalwysrsavd`).

4. **Levantar dev server**
   ```bash
   npm run dev
   ```

5. **Revisar el plan actualizado**
   - Leer `docs/backlog_plataforma.md` (backlog ejecutable, fuente de verdad en el repo)
   - Identificar las tareas pendientes de la fase actual y su estado (✅ / 🟡 / ❌ / 🔒)

6. **Reportar al usuario**
   - Resumir el estado: qué se completó en la sesión anterior, qué queda por hacer
   - Proponer las tareas del día (máximo 3-4 tareas atómicas)
   - Confirmar con el usuario antes de empezar
