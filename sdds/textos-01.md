# textos-01 — Ortografía (tildes) en los textos visibles

- **Estado**: completado
- **Versión objetivo**: 1.11 (`CONFIG.VERSION = '1.11'`, `CACHE_NAME = 'genil-v1.11.0'`)
- **Depende de**: `privacidad-01` (debe estar completada antes; sus textos ya llevan tildes).
- **Ámbito**: solo los textos que ve el usuario: `js/ui.js`, `js/utils.js`, `index.html` (`<title>` y metas), `manifest.json`.

## 1. Objetivo

Hoy los textos de la interfaz están escritos sin tildes («Rio», «Ecija», «pagina»…). El objetivo es corregir la ortografía de todos ellos sin tocar identificadores, claves ni clases CSS.

## 2. Reglas

1. **Solo literales que se muestran** al usuario: contenido HTML, `title`, `aria-label`, textos devueltos por funciones (`texto:`), `<title>`, `<meta name="description">`, `apple-mobile-web-app-title`, `name`, `short_name` y `description` de `manifest.json`.
2. **No cambies** claves ni identificadores: `key: 'critico'`, clases `c-critico`/`pill-critico`/`th-critico`, `CONFIG.UMBRALES.critico`, ids del DOM, nombres de variables o funciones, `status` (`'error'`, `'fallback'`…), ni nada de `scraper.py`, `datos.json` o `historico.json`.
3. Los ficheros deben seguir en UTF-8 sin BOM. `index.html` ya declara `<meta charset="UTF-8">`, y los módulos JS y `manifest.json` se interpretan como UTF-8.
4. Sustituye `m3/s` por `m³/s`.
5. Las mayúsculas también llevan tilde (`CRÍTICO`, `PRECAUCIÓN`).

## 3. Glosario mínimo (no exhaustivo)

| Ahora | Correcto |
|---|---|
| Rio Genil | Río Genil |
| Ecija | Écija |
| Estacion | Estación |
| pagina | página |
| informacion | información |
| Proteccion Civil | Protección Civil |
| Confederacion Hidrografica | Confederación Hidrográfica |
| Actualizacion automatica via | Actualización automática vía |
| Ultima lectura / Ultimo dato valido / Ultimo intento | Última lectura / Último dato válido / Último intento |
| caido / esta disponible | caído / está disponible |
| Error de conexion | Error de conexión |
| Evolucion temporal / ultimas | Evolución temporal / últimas |
| Variacion | Variación |
| Ventana de analisis | Ventana de análisis |
| Precaucion / PRECAUCION | Precaución / PRECAUCIÓN |
| Critico / CRITICO | Crítico / CRÍTICO |
| mas lecturas / grafica | más lecturas / gráfica |
| Aviso importante | (correcto) |

**Revisa todos los literales**, no solo los del glosario. Para ayudarte: `grep -nE "'[^']*[a-zA-Z]{3,}[^']*'" js/ui.js js/utils.js`.

## 4. Cambios por fichero

- `js/ui.js`: todos los textos visibles (cabecera, pantalla de carga, cajas de error y aviso, etiquetas, slider, umbrales, gráfico, botón, disclaimer y footer).
- `js/utils.js`: `texto:` de `getAlerta` (`PRECAUCION` → `PRECAUCIÓN`, `CRITICO` → `CRÍTICO`). Los de `calcTendencia` ya son correctos.
- `index.html`: `<title>`, `<meta name="description">`, `apple-mobile-web-app-title`.
- `manifest.json`: `name`, `short_name`, `description`.
- `js/config.js`: `VERSION: '1.11'`.
- `sw.js`: `CACHE_NAME = 'genil-v1.11.0'`.

## 5. Criterios de aceptación

1. `grep -niE "\b(rio|ecija|estacion|pagina|informacion|proteccion|confederacion|hidrografica|actualizacion|automatica|ultim[ao]s?|valido|caido|conexion|evolucion|variacion|analisis|precaucion|critico|grafica)\b" js/ui.js js/utils.js index.html manifest.json` solo devuelve identificadores o claves (p. ej. `critico` como `key`/clase/`UMBRALES.critico`), nunca texto visible.
2. `python -m json.tool manifest.json` es válido.
3. En el navegador, todos los textos se ven con tildes y sin caracteres corruptos (`Ã`, `�`).
4. Las alertas siguen funcionando: forzar `state.nivel` en cada rango muestra la clase y el color correctos (las claves no han cambiado).
5. `node --check` pasa en los `.js` modificados. No hay errores en consola.

## 6. Fuera de alcance

- `README.md`, `CLAUDE.md`, comentarios de código, logs y textos del scraper.
- Cambios de redacción (solo ortografía).

## 7. Instrucciones para el agente

- Implementa exactamente esta SDD. **No hagas commit ni push.**
- Entrega: ficheros modificados, lista de literales cambiados (antes → después), salida del grep del criterio 1 y desviaciones.

## 8. Notas de cierre

- Implementado por subagente sin desviaciones; sin BOM; claves (`critico`, ids, clases) intactas.
- Verificado en Chrome (localhost): título, manifest y textos con tildes, sin caracteres corruptos; `getAlerta` devuelve las claves originales con `PRECAUCIÓN`/`CRÍTICO`.
