# Videos de demo grabados desde la propia app

Generan un MP4 1920×1080 recorriendo la app real en producción: nadie graba nada. Edge se controla con el protocolo de depuración (sin dependencias; Node 22+ y `ffmpeg` en el PATH) y la post-producción añade zooms animados, subtítulos con diseño, efectos de sonido, aceleración de lo repetitivo y, si hay, música sincronizada al pulso.

| Archivo | Qué hace |
|---|---|
| `studio.mjs` | Grabador: cursor y ondas de clic, tarjetas de título animadas, transiciones, anillos de resaltado, y el registro de "órdenes de dirección" (subtítulos, zooms, aceleraciones, sonidos). |
| `post.mjs` | Post-producción en dos fases: `prepare` (cuadros → video base + subtítulos) y `render` (zoom, subtítulos, sonido, música). |
| `sfx.mjs` | Sintetiza los efectos (clic, tecla, whoosh, zoom, éxito) sin archivos externos. |
| `beats.mjs` | Detecta tempo y pulso de la música para que subtítulos y zooms caigan en el beat. |
| `ferreteria.mjs`, `logistica.mjs` | Los guiones de cada demo. |

## Repetir una grabación
1. **Datos frescos** (las demos se fechan al sembrarlas; con datos viejos el panel sale vacío):
   `node --env-file=.env.local scripts/seed-demos.mjs --only=demo-ferreteria` (y `--only=demo-logistica`).
2. **Sesión del panel, una sola vez.** Abre Edge con un perfil propio, inicia sesión tú y ciérralo del todo (Edge deja procesos de fondo; el grabador termina los que usen ese perfil):
   `msedge --user-data-dir=<carpeta>\profile-owner https://spot-pi-olive.vercel.app/login`
   Esa carpeta guarda tu sesión: bórrala al terminar.
3. Graba (desde esta carpeta, con la ruta de trabajo en formato Windows; en Git Bash usa `pwd -W` y `MSYS_NO_PATHCONV=1`):
   `node ferreteria.mjs <carpeta> salida.mp4 [musica.mp3]`
   `node logistica.mjs <carpeta> salida.mp4 <tracking_token de un envío en camino> [musica.mp3]`
   (el token sale de `service_orders` con estado `in_transit` de `demo-logistica`).

## Poner o cambiar la música sin volver a grabar
Cada grabación deja una carpeta `job-<nombre>` con el video base y el guion de zooms y subtítulos. Para mezclar otra pista:
`node post.mjs render <carpeta>/job-ferreteria <salida.mp4> <musica.mp3> [ajuste_dB]`
Detecta el tempo, alinea subtítulos, zooms y efectos al pulso, recorta la pista a la duración del video con entrada y salida suaves y normaliza el volumen a -16 LUFS.

## Cuidados
- El cuadro de usuario del panel muestra la cuenta real: `studio.mjs` la reemplaza por una persona de demo ("Carlos Gómez") antes de pintar nada. Si cambia la cuenta dueña de las demos, ajusta los textos de `clean()`.
- Los guiones crean pedidos y movimientos reales en las demos (un pedido web, una venta, un envío). Vuelve a sembrar antes de cada grabación.
- Los textos y los pasos dependen de las etiquetas de la interfaz; si cambian, hay que actualizarlos.
- La música debe tener derechos de uso comercial (Suno: plan de pago).
