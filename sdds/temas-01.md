# temas-01 — Alternar tema oscuro / claro

- **Estado**: completado
- **Versión objetivo**: 1.9 (`CONFIG.VERSION = '1.9'`, `CACHE_NAME = 'genil-v1.9.0'`)
- **Ámbito**: solo frontend (`index.html`, `css/`, `js/`, `sw.js`). El scraper no se toca.

## 1. Objetivo

Añadir un botón en la cabecera que alterne entre el tema oscuro actual (por defecto) y un tema claro nuevo. La elección se recuerda entre visitas.

## 2. Decisiones de diseño (cerradas, no reabrir)

1. **Dos estados**: `dark` (por defecto) y `light`. No hay modo «auto» ni se lee `prefers-color-scheme`: sin preferencia guardada, la app se ve exactamente como ahora.
2. **Mecanismo**: atributo `data-theme="light"` en `<html>`. Si no existe el atributo, el tema es oscuro. Nunca se escribe `data-theme="dark"`: para volver a oscuro se elimina el atributo.
3. **Persistencia**: `localStorage`, clave `CONFIG.THEME_KEY = 'genil-theme'`, valores `'light'` o `'dark'`. Todo acceso va dentro de `try/catch`: si `localStorage` falla, el tema funciona igual durante la sesión pero no se recuerda.
4. **Sin parpadeo**: un script inline en el `<head>` aplica el atributo antes de cargar el CSS.
5. **La cabecera azul no cambia** (degradado `#1e3a8a → #2563eb` y texto blanco en ambos temas). Por eso `<meta name="theme-color">` y `manifest.json` **no se modifican**.
6. **Los tintes translúcidos de alerta y de acento se quedan fijos** (`rgba(34,197,94,0.15)`, `rgba(59,130,246,0.1)`, etc.), porque funcionan sobre fondo claro y oscuro. Solo se tokenizan los colores de la tabla de la §3.
7. **El tema oscuro debe quedar idéntico píxel a píxel**: cada token oscuro vale exactamente lo que hoy está fijo en el código.
8. **Estilo de código**: `var` y `function` clásicas, nada de `const`, `let` ni funciones flecha (ver `CLAUDE.md`). Cadenas con comilla simple, indentación de 4 espacios.

## 3. Tokens de color

En `css/variables.css` se amplía `:root` (tema oscuro) y se añade el bloque `:root[data-theme="light"]`.

| Token | Oscuro (valor actual) | Claro | Dónde se usa hoy (valor fijo a sustituir) |
|---|---|---|---|
| `--bg-base` | `#070b14` | `#eef2f7` | ya es token |
| `--bg-card` | `rgba(15, 23, 42, 0.85)` | `rgba(255, 255, 255, 0.92)` | ya es token |
| `--bg-inset-strong` | `rgba(15, 23, 42, 0.6)` | `#f8fafc` | `.data-box` background |
| `--bg-inset` | `rgba(15, 23, 42, 0.5)` | `#f8fafc` | `.slider-wrap`, `.thresholds` background |
| `--bg-inset-soft` | `rgba(15, 23, 42, 0.4)` | `#f1f5f9` | `.extra-item` background |
| `--bg-solid` | `#0f172a` | `#ffffff` | `js/chart.js` `pointBorderColor` |
| `--border-card` | `rgba(51, 65, 85, 0.6)` | `rgba(148, 163, 184, 0.45)` | ya es token |
| `--border-soft` | `rgba(51, 65, 85, 0.4)` | `rgba(148, 163, 184, 0.35)` | `.extra-item` border |
| `--border-faint` | `rgba(51, 65, 85, 0.3)` | `rgba(148, 163, 184, 0.35)` | `.footer` border-top; grid eje Y del gráfico |
| `--grid-faint` | `rgba(51, 65, 85, 0.15)` | `rgba(148, 163, 184, 0.2)` | grid eje X del gráfico |
| `--text-main` | `#f1f5f9` | `#0f172a` | ya es token |
| `--text-muted` | `#7c8db5` | `#475569` | ya es token; también ticks del gráfico (`'#7c8db5'` fijo en `chart.js`) |
| `--text-faint` | `rgba(124, 141, 181, 0.6)` | `rgba(71, 85, 105, 0.7)` | `.slider-labels` color |
| `--text-disclaimer` | `#a0a8c0` | `#475569` | `.disclaimer` color |
| `--text-caudal` | `#60a5fa` | `#2563eb` | `js/ui.js` inline `style="color:#60a5fa"` del caudal |
| `--text-critico` | `#fca5a5` | `#991b1b` | `.pill-critico` color |
| `--shadow-card` | `0 4px 24px rgba(0, 0, 0, 0.3)` | `0 4px 18px rgba(15, 23, 42, 0.08)` | `.card` box-shadow |
| `--shadow-text` | `0 4px 20px rgba(0, 0, 0, 0.4)` | `none` | `.nivel-valor` text-shadow |
| `--btn-disabled-bg` | `#334155` | `#e2e8f0` | `.btn-refresh:disabled` background |
| `--btn-disabled-fg` | `#64748b` | `#94a3b8` | `.btn-refresh:disabled` color |
| `--verde` | `#22c55e` | `#16a34a` | ya es token |
| `--amarillo` | `#eab308` | `#ca8a04` | ya es token |
| `--naranja` | `#f97316` | `#ea580c` | ya es token |
| `--rojo` | `#ef4444` | `#dc2626` | ya es token |
| `--accent` | `#3b82f6` | `#2563eb` | ya es token; también `borderColor` y `pointBackgroundColor` del gráfico |
| `--critico` | `#991b1b` | `#991b1b` | sin cambio (no hace falta redefinirlo) |

Los colores de alerta claros son un tono más oscuros para que el texto se lea sobre blanco.

**No se tocan**: `.header` y sus hijos, `.btn-refresh` (estado normal), los fondos `rgba()` de `.live-badge`, `.pill-*`, `.th-*`, `.slider-window`, `.slider-input`, `.spinner`, `.error-box` y `.disclaimer`, las sombras del thumb del slider y `body::before`.

## 4. Cambios por fichero

### 4.1 `index.html`
Justo después de `<meta name="viewport" …>` (antes de cualquier `<link rel="stylesheet">`):

```html
<script>
    try {
        if (localStorage.getItem('genil-theme') === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    } catch (e) { }
</script>
```

La clave va escrita a mano porque el script inline no puede importar `config.js`. Añade un comentario HTML que diga que debe coincidir con `CONFIG.THEME_KEY`.

### 4.2 `css/variables.css`
- Añade al `:root` actual los tokens nuevos de la §3 con su valor oscuro.
- Añade el bloque `:root[data-theme="light"] { … }` con todos los valores claros (incluidos los tokens que ya existían).
- Añade `color-scheme: dark;` en `:root` y `color-scheme: light;` en el bloque claro, para que los controles nativos y las barras de scroll se adapten.

### 4.3 `css/base.css` y `css/components.css`
- Sustituye cada valor fijo de la columna «Dónde se usa hoy» por `var(--token)`.
- Añade el estilo del botón de tema:

```css
.header {
    position: relative;   /* añadir a la regla existente */
}

.theme-toggle {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 1.1em;
    line-height: 1;
    cursor: pointer;
    transition: background 0.2s;
}

.theme-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
}
```

El botón va sobre la cabecera azul, que no cambia de tema, así que sus colores se quedan fijos.

### 4.4 `js/config.js`
Añade `THEME_KEY: 'genil-theme',` al objeto `CONFIG` y cambia `VERSION` a `'1.9'`.

### 4.5 `js/theme.js` (nuevo)

```js
import { CONFIG } from './config.js';

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function toggleTheme() {
    var next = getTheme() === 'light' ? 'dark' : 'light';
    if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    try {
        localStorage.setItem(CONFIG.THEME_KEY, next);
    } catch (e) { }
    return next;
}

export function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
```

### 4.6 `js/ui.js`
- Importa `getTheme` de `./theme.js`.
- En el `render` principal (no en la pantalla de carga), dentro de `.header` y justo después de abrir `<div class="header">`:

```js
var dark = getTheme() === 'dark';
html += '<button class="theme-toggle" id="btn-theme" type="button" aria-label="' +
    (dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro') + '" title="' +
    (dark ? 'Tema claro' : 'Tema oscuro') + '">' + (dark ? '&#9728;' : '&#9790;') + '</button>';
```

  En tema oscuro se muestra ☀ (pasar a claro) y en claro ☾ (pasar a oscuro).
- Sustituye `style="color:#60a5fa"` del caudal por `style="color:var(--text-caudal)"`.
- `bindEventListeners(state, onRefresh, onToggleTheme)`: en el listener `click` existente añade:

```js
var themeBtn = e.target.closest('#btn-theme');
if (themeBtn) {
    onToggleTheme();
    return;
}
```

### 4.7 `js/app.js`
- `import { toggleTheme } from './theme.js';`
- Nueva función:

```js
function onToggleTheme() {
    toggleTheme();
    refresh();
}
```

- `bindEventListeners(state, onRefresh, onToggleTheme);`

`refresh()` regenera el DOM y recrea el gráfico, que así recoge los colores nuevos. No hay que hacer nada más.

### 4.8 `js/chart.js`
- `import { cssVar } from './theme.js';`
- Al principio de `initChart`, lee los colores: `accent = cssVar('--accent')`, `muted = cssVar('--text-muted')`, `gridY = cssVar('--border-faint')`, `gridX = cssVar('--grid-faint')`, `solid = cssVar('--bg-solid')`.
- Sustituye: `borderColor` y `pointBackgroundColor` por `accent`, `pointBorderColor` por `solid`, `ticks.color` (ambos ejes) por `muted`, `grid.color` del eje Y por `gridY` y el del eje X por `gridX`.
- El degradado de relleno (`rgba(59,130,246,…)`) y el `backgroundColor` del tooltip (oscuro en ambos temas, con texto blanco) **se quedan como están**.

### 4.9 `sw.js`
- `CACHE_NAME = 'genil-v1.9.0'`.
- Añade `'./js/theme.js'` a `STATIC_ASSETS` (después de `'./js/utils.js'`).

### 4.10 Documentación
- `README.md`: en la descripción del dashboard, menciona que tiene selector de tema claro u oscuro.
- `CLAUDE.md`, sección Frontend: añade una viñeta: «Colores: todos los que dependen del tema son variables de `css/variables.css` (`:root` = oscuro, `:root[data-theme="light"]` = claro); no hardcodear colores nuevos. `js/chart.js` los lee con `cssVar()` de `js/theme.js`. La preferencia se guarda en `localStorage` (`CONFIG.THEME_KEY`) y la aplica un script inline en `index.html` antes del CSS.» Si añades `js/theme.js`, menciónalo también donde se describen los módulos.

## 5. Criterios de aceptación

1. Sin preferencia guardada, la app se ve idéntica a la versión 1.8 (comparar a ojo cabecera, tarjetas, umbrales, gráfico y pie).
2. Al pulsar ☀ se pasa a tema claro al instante. El gráfico se redibuja con ticks y rejilla legibles sobre fondo claro, y el icono pasa a ☾.
3. Al recargar se mantiene el tema claro sin parpadeo oscuro.
4. Al pulsar ☾ se vuelve a oscuro y desaparece `data-theme` de `<html>`.
5. Con `localStorage` bloqueado (ventana privada en algunos navegadores, o lanzando `localStorage.setItem` en la consola), la app no rompe: el botón cambia el tema durante la sesión.
6. El botón no se solapa con el título en un ancho de 360 px.
7. El slider conserva su valor tras cambiar de tema (vive en `state.ventana`).
8. `grep -nE "#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}\b" css/base.css css/components.css js/ui.js js/chart.js` solo muestra colores de la lista «No se tocan» o de la cabecera o el botón de actualizar.
9. Sin errores en la consola del navegador.

## 6. Verificación

```bash
python -m http.server 8000
# abrir http://localhost:8000 ; DevTools > Application > Service Workers > "Update on reload"
```

Recorre los criterios 1–9. Para ver todos los estados de alerta en claro, en la consola:
`document.querySelector('.nivel-valor').className = 'nivel-valor c-critico'` (y similares con `.alert-pill`).

## 7. Fuera de alcance

- Modo «auto» o seguimiento de `prefers-color-scheme`.
- Cambiar `theme-color` o `manifest.json`.
- Rediseñar la cabecera o la paleta oscura.

## 8. Instrucciones para el agente

- Implementa exactamente esta especificación. Si algo no encaja con el código real, detente y repórtalo en lugar de improvisar.
- **No hagas commit ni push.** Al terminar, devuelve: lista de ficheros modificados, cualquier desviación de la SDD con su motivo, y la salida del `grep` del criterio 8.

## 9. Notas de cierre

- Implementado por subagente según la SDD, sin desviaciones de código.
- Corrección en la revisión: `.header` redefine `--verde`, `--amarillo` y `--rojo` con los valores oscuros, porque el badge «EN VIVO» va sobre la cabecera azul (que no cambia de tema) y en claro perdía contraste.
- Verificado en Chrome (localhost): conmutación, persistencia, gráfico y ausencia de errores en consola.
