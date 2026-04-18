---
description: End of Day — Cerrar jornada de desarrollo con commit y push
---

# EOD — End of Day

Ejecutar al final de cada sesión de trabajo. Este es el **único momento** en que se hace commit y push.

## Pasos

1. **Verificar que el proyecto compila**
// turbo
```bash
cd c:\Users\USUARIO\Documents\Aplicaciones Propias\spot && npm run build
```

2. **Revisar cambios**
// turbo
```bash
git diff --stat
```

3. **Stage y commit**
```bash
git add -A && git commit -m "feat: [RESUMEN DEL DÍA]

[Lista de cambios principales]"
```

4. **Push a GitHub**
```bash
git push
```

5. **Actualizar plan**
- Actualizar el archivo `plan_negocio_plataforma.md.resolved` con el progreso del día
- Marcar tareas completadas [x] y agregar notas relevantes

6. **Reportar al usuario**
- Resumir qué se completó
- Listar lo que queda pendiente para la próxima sesión
- Mencionar cualquier blocker o decisión pendiente

## ⚠️ Reglas
- **NUNCA** hacer commit/push durante la jornada — solo al EOD
- El mensaje de commit debe ser descriptivo y agrupar el trabajo del día
- Si hay errores de build, corregirlos antes de hacer commit
