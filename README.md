# Monitor Rio Genil - Ecija

Monitor en tiempo real del nivel y caudal del Rio Genil a su paso por Ecija (estacion de aforo A17), con datos extraidos automaticamente del [SAIH Guadalquivir](https://www.chguadalquivir.es/saih).

Publicado en [GitHub Pages](https://jfernanro.github.io/genil/)

## Arquitectura

El proyecto funciona en dos capas independientes:

**Scraper (backend)** - Un script Python ejecutado cada 15 minutos mediante GitHub Actions, disparado desde fuera por un job de cron-job.org (`repository_dispatch`), con el cron de GitHub cada hora como respaldo. Se conecta a la web del SAIH Guadalquivir (directamente o a traves de proxies publicos), localiza la fila de la estacion A17 (Ecija/Genil) en la tabla de aforos, extrae nivel y caudal, y escribe el resultado en `datos.json`. Mantiene un historico persistente de las lecturas de las ultimas 24 horas (minimo 20) en `historico.json`. Solo hace commit si los datos han cambiado.

**Dashboard (frontend)** - PWA instalable servida por GitHub Pages. Consume `datos.json` e `historico.json` y presenta los datos con indicadores visuales de alerta segun umbrales predefinidos. Incluye grafico de tendencia, slider interactivo para ajustar la ventana de analisis temporal y deteccion de datos obsoletos. Se refresca automaticamente cada 60 segundos. Funciona offline mostrando los ultimos datos cacheados.

## Estructura de ficheros

```
.github/workflows/actualizar.yml   Workflow de GitHub Actions (repository_dispatch + cron horario de respaldo)
scraper.py                          Script de extraccion de datos
datos.json                          Ultimo dato extraido (generado automaticamente)
historico.json                      Lecturas de las ultimas 24 h (generado automaticamente)
index.html                          Dashboard principal (GitHub Pages)
js/
  config.js                         Constantes y configuracion
  utils.js                          Funciones de calculo y formato
  api.js                            Carga de datos (fetch)
  chart.js                          Grafico Chart.js
  ui.js                             Renderizado y eventos del DOM
  app.js                            Punto de entrada y orquestacion
css/
  variables.css                     Variables CSS (colores, tema)
  base.css                          Reset y layout base
  animations.css                    Keyframes
  components.css                    Estilos de componentes
icons/
  icon-192x192.png                  Icono PWA 192px
  icon-512x512.png                  Icono PWA 512px
manifest.json                       Manifest PWA
sw.js                               Service Worker (cache offline)
```

## Umbrales de alerta

| Estado     | Nivel          |
|------------|----------------|
| Normal     | < 2.7 m        |
| Precaucion | 2.7 - 4.0 m    |
| Alerta     | 4.0 - 5.0 m    |
| Emergencia | 5.0 - 7.0 m    |
| Critico    | > 7.0 m        |

## Tecnologias

- Python 3.9 (scraper con `requests`)
- GitHub Actions (automatizacion) + cron-job.org (disparo externo cada 15 min)
- GitHub Pages (hosting estatico)
- Chart.js 4.x (graficos)
- HTML/CSS/JS vanilla con ES modules (sin frameworks)
- PWA (service worker, manifest, instalable)

## Fuente de datos

Todos los datos provienen del Sistema Automatico de Informacion Hidrologica (SAIH) de la Confederacion Hidrografica del Guadalquivir. Este proyecto no esta afiliado ni respaldado por la CHG. Los datos se obtienen mediante scraping de la pagina publica de aforos y pueden presentar retrasos o errores de lectura.

## Limitaciones

- El scraper depende de la estructura HTML de la web del SAIH. Si la CHG modifica el formato de la tabla, el parseo dejara de funcionar.
- Los proxies CORS publicos utilizados (AllOrigins, CodeTabs) pueden caer o limitar peticiones sin previo aviso.
- El historico persistente cubre las ultimas 24 horas (`HISTORICO_HORAS` en `scraper.py`), con un minimo de 20 lecturas por si el cron de GitHub se retrasa y en 24 horas hay menos lecturas. No se almacena historico a largo plazo.
- El cron de GitHub Actions es muy irregular (puede retrasarse horas), por eso el disparo principal es externo. Si el token usado por cron-job.org caduca, solo queda el respaldo horario.