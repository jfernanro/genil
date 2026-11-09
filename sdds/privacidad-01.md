# privacidad-01 — Eliminar recursos de terceros, aviso de privacidad y disclaimer

- **Estado**: completado
- **Versión objetivo**: 1.10 (`CONFIG.VERSION = '1.10'`, `CACHE_NAME = 'genil-v1.10.0'`)
- **Ámbito**: frontend (`index.html`, `css/`, `js/ui.js`, `js/config.js`, `sw.js`, ficheros nuevos en `fonts/` y `vendor/`) y documentación (`README.md`, `CLAUDE.md`).
- **Orden**: va antes que `textos-01`. Los textos nuevos o reescritos aquí ya llevan tildes.

## 1. Objetivo

1. Que, al cargar la página, el navegador solo contacte con GitHub Pages (hosting) y GoatCounter (estadísticas). Hoy también contacta con Google Fonts y jsDelivr, que reciben la IP del visitante.
2. Añadir al footer un aviso de privacidad veraz.
3. Dejar claro en el disclaimer que los umbrales son orientativos y que los datos pueden llegar con retraso.

## 2. Situación actual

| Recurso | Dónde | Destino |
|---|---|---|
| Fuentes Outfit (400, 600, 800, 900) y JetBrains Mono (500, 700) | `index.html`: `<link rel="preconnect" href="https://fonts.googleapis.com">` + `<link href="https://fonts.googleapis.com/css2?...">` | Google |
| Chart.js 4.4.0 | `index.html`: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js">` | jsDelivr |
| GoatCounter | `index.html`: `<script data-goatcounter=... src="//gc.zgo.at/count.js">` | **Se mantiene** |

No hay cookies. `localStorage` solo guarda `genil-theme`.

## 3. Decisiones (cerradas)

1. Fuentes autoalojadas en woff2, solo el subset `latin` (cubre U+0000–00FF, que incluye á, é, í, ó, ú, ñ, ü, ¿ y ¡). No se incluye `latin-ext`.
2. Origen de las fuentes: paquetes npm de Fontsource (licencia OFL), descargados de jsDelivr una sola vez durante el desarrollo. Se fija la versión exacta: la última `5.x` estable de cada paquete, apuntada en la §8.
3. Chart.js: el mismo fichero que se usa hoy (`chart.js@4.4.0/dist/chart.umd.min.js`), copiado al repo. No se cambia de versión.
4. GoatCounter se mantiene. No hace falta banner de cookies (no hay cookies, y `localStorage` del tema es una función que pide el propio usuario).
5. Estilo de código: `var`/`function`, comillas simples, 4 espacios.

## 4. Ficheros nuevos

### 4.1 `fonts/`

Descarga (con `curl -fL`) estos ficheros a `fonts/` con el **mismo nombre**:

| Paquete | Ficheros |
|---|---|
| `@fontsource/outfit@<5.x exacta>` | `files/outfit-latin-400-normal.woff2`, `outfit-latin-600-normal.woff2`, `outfit-latin-800-normal.woff2`, `outfit-latin-900-normal.woff2` |
| `@fontsource/jetbrains-mono@<5.x exacta>` | `files/jetbrains-mono-latin-500-normal.woff2`, `jetbrains-mono-latin-700-normal.woff2` |

URL de ejemplo: `https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.x.y/files/outfit-latin-400-normal.woff2`. Para saber la última versión exacta: `curl -s https://data.jsdelivr.com/v1/packages/npm/@fontsource/outfit/resolved?specifier=5`.

Copia también la licencia de cada paquete (`.../LICENSE`) como `fonts/OFL-Outfit.txt` y `fonts/OFL-JetBrainsMono.txt`.

**Verificación obligatoria**: cada `.woff2` debe empezar por la firma `wOF2`, que se comprueba con `head -c 4 fichero`. Si alguno no la tiene (por ejemplo, una página de error HTML), detente y repórtalo.

### 4.2 `vendor/chart.umd.min.js`

```bash
curl -fL -o vendor/chart.umd.min.js https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js
```

Verifica que empieza por un comentario de licencia de Chart.js y que no es HTML. No lo modifiques.

### 4.3 `css/fonts.css`

Un `@font-face` por fichero, con `font-display: swap`, `font-style: normal`, el `font-weight` que corresponda y `src: url('../fonts/<fichero>.woff2') format('woff2');`. Las familias deben llamarse exactamente `'Outfit'` y `'JetBrains Mono'`, que son los nombres que ya usan `css/*.css` y `js/chart.js`.

## 5. Cambios en ficheros existentes

### 5.1 `index.html`
- Elimina el `<link rel="preconnect" href="https://fonts.googleapis.com">` y el `<link>` de Google Fonts.
- Añade `<link rel="stylesheet" href="./css/fonts.css">` **antes** de `variables.css`.
- Sustituye el `<script>` de jsDelivr por `<script src="./vendor/chart.umd.min.js"></script>`.
- No toques el script inline del tema ni el de GoatCounter.

### 5.2 `sw.js`
- `CACHE_NAME = 'genil-v1.10.0'`.
- Añade a `STATIC_ASSETS`: `'./css/fonts.css'`, `'./vendor/chart.umd.min.js'` y los 6 `'./fonts/*.woff2'`. Las licencias `.txt` no.
- Revisa si `sw.js` tiene alguna lógica específica para orígenes externos (Google Fonts o jsDelivr). Si la tiene, elimínala y anótalo en el informe.

### 5.3 `js/config.js`
`VERSION: '1.10'`.

### 5.4 `js/ui.js` — umbrales
Título de la tarjeta de umbrales: `'Umbrales de alerta'` → `'Umbrales de alerta (orientativos)'`.

### 5.5 `js/ui.js` — disclaimer
Sustituye el contenido del bloque `.disclaimer` (después de `disclaimer-title`) por este texto. Mantén los `<strong style="color:var(--text-main)">` donde están ahora.

> Esta página NO es una fuente oficial. Los datos se obtienen mediante lectura automatizada de la web del SAIH Guadalquivir y pueden contener errores, retrasos (habitualmente de hasta 30 minutos) o interrupciones sin previo aviso. Los umbrales de alerta son orientativos, definidos por el autor, y no corresponden a ningún nivel oficial de aviso. Este monitor no sustituye a los sistemas oficiales de alerta. Ante cualquier situación de riesgo, consulte siempre a **Protección Civil (112)** o a la **Confederación Hidrográfica del Guadalquivir**. El autor no se hace responsable de decisiones tomadas en base a la información aquí mostrada.

### 5.6 `js/ui.js` — footer
El footer queda así: el enlace del SAIH y el de «Creado por» no cambian de URL; las líneas 1 y 2 ya llevan tildes y la línea 3 es nueva.

```
Datos: <a SAIH>SAIH - Confederación Hidrográfica del Guadalquivir</a>
<br>Actualización automática vía GitHub Actions cada 15 min
<br><br><span class="footer-privacy">Privacidad: sin cookies ni registro. Estadísticas de visitas anónimas y agregadas (GoatCounter). La preferencia de tema se guarda solo en tu navegador. El alojamiento (GitHub Pages) registra datos técnicos de conexión.</span>
<br><br><small>Creado por <a ...>jfernanro.github.io</a> &middot; v...</small>
```

### 5.7 `css/components.css`
```css
.footer-privacy {
    display: inline-block;
    max-width: 420px;
    line-height: 1.5;
    font-size: 0.95em;
}
```

### 5.8 Documentación
- `README.md`: en la sección de umbrales, indica que son orientativos y no oficiales. En el árbol de ficheros, añade `fonts/`, `vendor/` y `css/fonts.css`. Si menciona Google Fonts o el CDN de Chart.js, actualízalo.
- `CLAUDE.md`, sección Frontend: cambia «Chart.js (cargado global por CDN en `index.html`)» por «Chart.js 4.4.0 (autoalojado en `vendor/`, cargado global en `index.html`)». Añade una viñeta: «Sin recursos de terceros salvo GoatCounter: fuentes autoalojadas en `fonts/` (`css/fonts.css`) y Chart.js en `vendor/`. No añadir CDNs ni fuentes externas; el footer afirma que no hay más terceros.»

## 6. Criterios de aceptación

1. `grep -rn "googleapis\|gstatic\|jsdelivr" index.html css js sw.js` no devuelve nada.
2. En DevTools > Network, al cargar con la caché vacía, las únicas peticiones a otros orígenes son a `gc.zgo.at` y `jfernanro.goatcounter.com`.
3. Las fuentes se ven igual que antes: título en Outfit 900 y cifras en JetBrains Mono 700. En Network, los 6 woff2 se sirven desde `/fonts/`.
4. El gráfico funciona (Chart.js local).
5. Offline (tras la primera carga, con DevTools > Network > Offline): la página carga con sus fuentes y su gráfico.
6. El disclaimer, el título de umbrales y el footer muestran los textos de las §5.4–5.6, con tildes.
7. No hay errores en consola. `node --check` pasa en los `.js` modificados.

## 7. Fuera de alcance

- Quitar o sustituir GoatCounter.
- Poner tildes en el resto de textos de la interfaz (eso es `textos-01`).

## 8. Instrucciones para el agente

- Implementa exactamente esta SDD. Si algo no encaja con el código, detente y repórtalo.
- **No hagas commit ni push.**
- Entrega: ficheros creados y modificados; versiones exactas de los paquetes Fontsource usados; resultado de la verificación `wOF2`; salida del grep del criterio 1; desviaciones y su motivo.

## 9. Notas de cierre

- Implementado por subagente sin desviaciones. Fontsource: `@fontsource/outfit@5.3.0`, `@fontsource/jetbrains-mono@5.3.0`. Firmas `wOF2` verificadas.
- Verificado en Chrome (localhost): solo se piden recursos de `localhost` y `gc.zgo.at`; las 6 fuentes cargan; Chart.js local funciona; textos de umbrales, disclaimer y footer correctos; sin errores en consola.
