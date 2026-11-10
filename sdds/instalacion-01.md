# instalacion-01 — Aviso para instalar la app

- **Estado**: implementado (pendiente captura screenshot-narrow.png)
- **Versión objetivo**: 1.13 (`CONFIG.VERSION = '1.13'`, `CACHE_NAME = 'genil-v1.13.0'`)
- **Ámbito**: solo frontend (`index.html`, `manifest.json`, `css/`, `js/`, `sw.js`, `icons/`). El scraper no se toca.

## 1. Objetivo

La PWA ya cumple los criterios de instalabilidad (manifest con `name`, iconos 192/512, `start_url`, `display: standalone`; SW con handler `fetch`; HTTPS), pero el navegador no ofrece instalarla de forma visible:

- **Android (Chromium)**: el mini-infobar nativo depende de heurísticas de interacción, deja de mostrarse ~90 días tras cerrarlo una vez y no es fiable. Las webs que «ofrecen instalar» capturan `beforeinstallprompt` y muestran su propio botón.
- **iOS (Safari y demás navegadores iOS)**: no existe API de instalación ni aviso automático. Solo cabe mostrar instrucciones («Compartir → Añadir a pantalla de inicio»).

Se añade un banner propio, discreto, que aparece la primera vez (y de nuevo pasado un tiempo si se cerró) y que no se muestra nunca si la app ya está instalada.

## 2. Decisiones de diseño (cerradas, no reabrir)

1. **Tres modos del banner**:
   - `prompt`: navegador que ha disparado `beforeinstallprompt`. Texto + botón «Instalar» que llama a `deferredPrompt.prompt()`.
   - `ios`: iOS sin modo standalone. Texto con instrucciones, sin botón de acción (solo cerrar).
   - `none`: cualquier otro caso (escritorio sin evento, Firefox, ya instalada…). No se muestra nada.
2. **Nunca se muestra en modo instalado**: `window.matchMedia('(display-mode: standalone)').matches` o `navigator.standalone === true` → `none`.
3. **Detección de iOS**: `/iPad|iPhone|iPod/.test(navigator.userAgent)` o (`navigator.platform === 'MacIntel'` y `navigator.maxTouchPoints > 1`) para iPadOS. No se distingue Safari de Chrome/Firefox iOS: desde iOS 16.4 todos permiten «Añadir a pantalla de inicio» desde el menú Compartir.
4. **Fuera de `#app`**: `ui.js` regenera `#app` entero en cada `render(state)`, así que el banner vive en su propio contenedor `<div id="install-banner" hidden></div>` en `index.html`, hermano de `#app`. `install.js` lo gestiona de forma independiente; `ui.js` y `state` no se tocan.
5. **Posición**: fijo abajo (`position: fixed; bottom`), ancho máximo el del `.container`, respetando `env(safe-area-inset-bottom)`. No tapa contenido de forma permanente porque se puede cerrar.
6. **Cuándo aparece**: no al instante. Se muestra tras `CONFIG.INSTALL_DELAY_MS = 4000` desde que hay modo disponible (`ios` al cargar; `prompt` al recibir el evento), para no competir con la primera carga de datos.
7. **Cierre y persistencia**: al pulsar «×» se guarda `Date.now()` en `localStorage`, clave `CONFIG.INSTALL_KEY = 'genil-install-dismissed'`. No se vuelve a mostrar hasta pasados `CONFIG.INSTALL_REPROMPT_HORAS = 24` horas. Todo acceso a `localStorage` va en `try/catch` (si falla, se muestra en cada visita; aceptable).
8. **Resultado del prompt**: si `userChoice.outcome === 'dismissed'`, se trata igual que pulsar «×» (se guarda la fecha). Si es `accepted`, se oculta. El evento `appinstalled` oculta el banner y borra `deferredPrompt`. `deferredPrompt` solo se puede usar una vez: tras `prompt()` se pone a `null`.
9. **Captura temprana del evento**: el listener de `beforeinstallprompt` se registra al evaluar el módulo `install.js` (nivel superior), no dentro de `init()`, porque `init()` hace `await` de red y el evento podría llegar antes.
10. **Manifest enriquecido**: se añaden `screenshots` (al menos uno `form_factor: "narrow"`) para que Chrome Android muestre la hoja de instalación ampliada en lugar del diálogo básico. Las capturas no se añaden a `STATIC_ASSETS` (no hacen falta offline).
11. **Sin terceros**: nada de librerías tipo `pwa-install`; todo vanilla.
12. **Estilo de código**: `var` y `function` clásicas, comilla simple, 4 espacios (ver `CLAUDE.md`). Colores solo con variables de `css/variables.css`.

## 3. Textos

| Modo | Texto | Botones |
|---|---|---|
| `prompt` | «Instala Río Genil para consultarlo como una app.» | «Instalar» (primario) · «×» (`aria-label="Cerrar"`) |
| `ios` | «Para instalarla: pulsa Compartir y después «Añadir a pantalla de inicio».» | «×» (`aria-label="Cerrar"`) |

En `ios`, «Compartir» va acompañado de un SVG inline del icono de compartir de iOS (cuadrado con flecha hacia arriba), `aria-hidden="true"`, con `stroke="currentColor"`.

El contenedor lleva `role="dialog"`, `aria-live="polite"` y `aria-label="Instalar la aplicación"`.

## 4. Cambios por fichero

### 4.1 `js/config.js`
Añadir:

```js
INSTALL_KEY: 'genil-install-dismissed',
INSTALL_REPROMPT_HORAS: 24,
INSTALL_DELAY_MS: 4000,
```

y `VERSION: '1.13'`.

### 4.2 `js/install.js` (nuevo)
Módulo autocontenido. Exporta `initInstall()`.

- Nivel superior del módulo:
  - `var deferredPrompt = null;`
  - `window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; scheduleShow('prompt'); });`
  - `window.addEventListener('appinstalled', function () { deferredPrompt = null; hide(); });`
- `isStandalone()`, `isIos()` según §2.2 y §2.3.
- `wasDismissedRecently()`: lee `CONFIG.INSTALL_KEY`; `true` si `Date.now() - valor < INSTALL_REPROMPT_HORAS * 3600000`.
- `markDismissed()`: guarda `String(Date.now())`.
- `scheduleShow(mode)`: sale si `isStandalone()` o `wasDismissedRecently()`; si no, `setTimeout(show, CONFIG.INSTALL_DELAY_MS, mode)`. Evitar dobles timers (una variable `pendingTimer`).
- `show(mode)`: rellena `#install-banner` con el HTML del modo (§3), quita `hidden` y añade la clase `is-visible` en el siguiente frame (para la transición).
- `hide()`: quita `is-visible` y pone `hidden` al terminar la transición (o directamente si `prefers-reduced-motion`).
- Delegación de clics sobre `#install-banner`:
  - `[data-action="install"]`: `deferredPrompt.prompt()`, luego `deferredPrompt.userChoice.then(...)` según §2.8; `deferredPrompt = null`; `hide()`.
  - `[data-action="close"]`: `markDismissed()`; `hide()`.
- `initInstall()`: enlaza la delegación y, si `isIos()`, llama a `scheduleShow('ios')`.

### 4.3 `js/app.js`
- `import { initInstall } from './install.js';`
- Llamar a `initInstall();` al final del fichero, junto al registro del SW (antes de `init()`), no dentro de `init()`.

### 4.4 `index.html`
Tras `<div class="container" id="app"></div>`:

```html
<div id="install-banner" class="install-banner" hidden></div>
```

### 4.5 `css/components.css`
Bloque `.install-banner`:

- `position: fixed; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom)); transform: translate(-50%, 16px); opacity: 0; transition: transform .25s, opacity .25s;`
- `.install-banner.is-visible { transform: translate(-50%, 0); opacity: 1; }`
- `width: calc(100% - 24px); max-width:` el mismo que `.container`; `z-index: 10` (por encima del `z-index: 1` de `base.css`).
- Fondo `var(--bg-card)`, borde `var(--border-card)`, sombra `var(--shadow-card)`, texto `var(--text-main)`, `backdrop-filter: blur(12px)` como las tarjetas.
- Layout flex: texto (crece) · botón «Instalar» · botón «×».
- Botón «Instalar»: fondo `var(--accent)`, texto blanco (como `.btn-refresh`).
- Botón «×»: transparente, color `var(--text-muted)`, área táctil mínima 40×40 px.
- `@media (prefers-reduced-motion: reduce)`: sin transición.
- Añadir al final de `body` un `padding-bottom` extra no es necesario (el banner se cierra).

### 4.6 `manifest.json`
Añadir:

```json
"screenshots": [
    {
        "src": "./icons/screenshot-narrow.png",
        "sizes": "1080x1920",
        "type": "image/png",
        "form_factor": "narrow",
        "label": "Nivel y caudal del río Genil en Écija"
    }
]
```

La captura se hace a mano (DevTools, dispositivo móvil 360×640 con DPR 3, tema oscuro, con datos reales) y se guarda en `icons/screenshot-narrow.png`. Relación de aspecto entre 1:2,3 y 2,3:1 y lado mínimo 320 px (requisito de Chrome).

### 4.7 `sw.js`
- `CACHE_NAME = 'genil-v1.13.0'`.
- Añadir `'./js/install.js'` a `STATIC_ASSETS`.

### 4.8 `README.md`
Añadir una línea en la sección de uso: en Android aparece un aviso para instalar; en iPhone, Compartir → «Añadir a pantalla de inicio».

## 5. Fuera de alcance

- Botón permanente «Instalar» en la cabecera o en el footer.
- Notificaciones push o cualquier otra API de PWA.
- Analítica del resultado de la instalación (GoatCounter no se toca).

## 6. Verificación

1. **DevTools (Chrome escritorio)**: Application → Manifest sin errores ni avisos; la sección *Installability* no muestra problemas; la captura aparece en *Screenshots*.
2. **Android (Chrome)**: en una visita nueva (o tras borrar datos del sitio), a los ~4 s aparece el banner `prompt`. «Instalar» abre la hoja de instalación ampliada con captura. Aceptar → el banner desaparece y no vuelve; abierta como app, no aparece.
   - Si `beforeinstallprompt` no llega por heurísticas de interacción, activar `chrome://flags/#bypass-app-banner-engagement-checks` para probar.
3. **Cancelar / cerrar**: al pulsar «×» o cancelar la hoja, recargar → no aparece. Cambiar a mano la clave en `localStorage` a una fecha de hace 25 horas → vuelve a aparecer.
4. **iPhone (Safari)**: aparece el banner `ios` con instrucciones. Tras añadir a pantalla de inicio y abrir desde el icono, no aparece.
5. **Escritorio sin evento / Firefox**: no aparece nada.
6. **Temas**: el banner se ve correcto en oscuro y claro.
7. **Re-render**: tras un refresco automático o manual (`render(state)`), el banner sigue visible y funcional.
8. **SW**: tras desplegar, un cliente instalado recibe `genil-v1.13.0` y `install.js` está en caché.
