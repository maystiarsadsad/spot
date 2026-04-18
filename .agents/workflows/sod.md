---
description: Start of Day — Iniciar jornada de desarrollo
---

# SOD — Start of Day

Ejecutar al inicio de cada sesión de trabajo.

## Pasos

1. **Verificar estado del proyecto**
// turbo
```bash
cd c:\Users\USUARIO\Documents\Aplicaciones Propias\spot && git status && git log -3 --oneline
```

2. **Verificar dependencias**
// turbo
```bash
npm ls --depth=0 2>&1 | head -20
```

3. **Verificar Supabase**
- Ejecutar `list_tables` en el proyecto `lswjtmbyboalwysrsavd` para confirmar que el schema está sincronizado

4. **Levantar dev server**
// turbo
```bash
npm run dev
```

5. **Revisar el plan actualizado**
- Leer `C:\Users\USUARIO\.gemini\antigravity\brain\352f8dfc-812b-4db9-8b39-e0df7e740141\artifacts\plan_negocio_plataforma.md.resolved`
- Leer `docs/backlog_plataforma.md`
- Identificar las tareas pendientes de la fase actual

6. **Reportar al usuario**
- Resumir el estado: qué se completó ayer, qué queda por hacer
- Proponer las tareas del día (máximo 3-4 tareas atómicas)
- Confirmar con el usuario antes de empezar
