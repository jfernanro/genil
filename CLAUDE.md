# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Monitor del nivel y caudal del río Genil en Écija (estación de aforo A17 del SAIH Guadalquivir). Dos piezas independientes que solo se comunican a través de dos ficheros JSON versionados en el repo:

- `scraper.py` (Python 3.12 + `requests`) escribe `datos.json` (última lectura) e `historico.json` (lecturas de las últimas `HISTORICO_HORAS` = 24 h contadas desde la más reciente, con un mínimo de `MIN_HISTORICO` = 20 lecturas porque el cron de GitHub es irregular y un tope de seguridad `MAX_HISTORICO` = `HISTORICO_HORAS * 8`).
- Una PWA estática (HTML/CSS/JS vanilla con ES modules, sin build ni bundler) servida por GitHub Pages en https://jfernanro.github.io/genil/ que lee esos dos ficheros.

No hay build, linter ni tests.

## Comandos

```bash
pip install requests
python scraper.py                 # Hace scraping real y sobrescribe datos.json / historico.json
python -m http.server 8000        # Servir el frontend en local (los ES modules y el SW requieren HTTP, no file://)
```

Si ejecutas el scraper en local, no hagas commit de `datos.json`/`historico.json` salvo que sea intencionado: los genera el bot.

## Automatización y git

- `.github/workflows/actualizar.yml` ejecuta el scraper. El disparo principal es un job externo en cron-job.org que cada 15 min llama a la API de GitHub (`repository_dispatch` tipo `scrape`, con un token personal que puede caducar); el `schedule` (`30 * * * *`) es solo un respaldo horario porque el cron de GitHub es muy irregular. También admite `workflow_dispatch`. Cada ejecución hace commit como "RioBot" con el mensaje "Actualizacion automatica niveles" si los datos cambian, lo que en la práctica es siempre (cambia `timestamp` o `last_attempt`); cada commit dispara un despliegue de Pages (límite blando ~10/h).
- Por eso `main` avanza constantemente en remoto: haz `git pull --rebase` antes de hacer push. Casi todo el historial son commits del bot; para ver cambios de código reales, filtra ese mensaje (`git log --invert-grep --grep="Actualizacion automatica"`).

## Scraper

- Recorre `BRIDGES` en orden: petición directa al SAIH, luego AllOrigins (respuesta JSON, HTML en `contents`) y CodeTabs (HTML). El primero que devuelva HTML parseable gana.
- El parseo es por regex, sin parser HTML: localiza la fila `<tr>` que contiene "GENIL" y ("A17" o "ECIJA") y lee las columnas por índice (`COL_NIVEL`, `COL_CAUDAL`, `COL_COTA`). Si la CHG cambia la tabla, lo habitual es tener que ajustar esos índices. Los números vienen en formato español (`1.234,56`), de ahí `parse_number`.
- Si fallan todos los puentes, se escribe `datos.json` con `status: "error"`, `last_attempt` (hora del intento) y el último dato válido conocido (`nivel`/`caudal`/`timestamp` de la lectura buena, tomados del `datos.json` previo o de `historico[-1]`; `null` si no hay ninguno). El histórico no se toca. Un `status: "error"` sin `last_attempt` es el formato antiguo y no contiene datos válidos. El frontend depende de estos campos: muestra el último dato con aviso "SIN ACTUALIZAR" (`state.status = 'fallback'`) o "SIN DATOS" si no hay ninguno.

## Frontend

- `js/app.js` mantiene un único objeto `state` mutable que se pasa a los demás módulos: `api.js` lo rellena (y añade la última lectura a `state.historico` si su timestamp es nuevo), `ui.js` regenera todo el DOM de `#app` como cadena HTML en cada `render(state)` y gestiona los eventos por delegación sobre la raíz, y `chart.js` destruye y recrea la instancia de Chart.js (cargado global por CDN en `index.html`) en cada refresco.
- Toda la configuración (umbrales de alerta, intervalo de refresco, minutos para considerar datos obsoletos, rango de la ventana del slider de tendencia) está en `js/config.js`. Los umbrales del README deben coincidir con `CONFIG.UMBRALES`. `CONFIG.HISTORICO_HORAS`/`CONFIG.HISTORICO_MIN` deben coincidir con `HISTORICO_HORAS`/`MIN_HISTORICO` del scraper: `trimHistorico` (`js/utils.js`) replica la misma regla de recorte en el frontend.
- Estilo de código: `var` y `function` clásicas en lugar de `const`/arrow functions; mantenlo así.

## Service worker

`sw.js` cachea los recursos estáticos (cache-first) y usa network-first para `datos.json`/`historico.json`. Al cambiar cualquier fichero estático hay que **incrementar `CACHE_NAME`** en `sw.js` (si no, los clientes instalados seguirán con la versión cacheada) y, si se añade o renombra un fichero JS/CSS, añadirlo a `STATIC_ASSETS`. `CONFIG.VERSION` en `js/config.js` es la versión que se muestra en la UI y se mantiene a mano por separado.
