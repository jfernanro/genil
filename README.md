# Monitor Rio Genil - Ecija

Monitor en tiempo real del nivel y caudal del Rio Genil a su paso por Ecija (estacion de aforo A17), con datos extraidos automaticamente del [SAIH Guadalquivir](https://www.chguadalquivir.es/saih).

Publicado en GitHub Pages jfernanro.github.com/genil

## Arquitectura

El proyecto funciona en dos capas independientes:

**Scraper (backend)** - Un script Python ejecutado cada 15 minutos mediante GitHub Actions. Se conecta a la web del SAIH Guadalquivir a traves de proxies publicos, localiza la fila de la estacion A17 (Ecija/Genil) en la tabla de aforos, extrae nivel y caudal, y escribe el resultado en `datos.json`. Solo hace commit si los datos han cambiado respecto a la lectura anterior.

**Dashboard (frontend)** - Una pagina HTML estatica servida por GitHub Pages que consume `datos.json` y presenta los datos con indicadores visuales de alerta segun umbrales predefinidos. Incluye grafico de tendencia en sesion, calculo de variacion entre lecturas y deteccion de datos obsoletos. Se refresca automaticamente cada 60 segundos.

## Estructura de ficheros

```
.github/workflows/actualizar.yml   Workflow de GitHub Actions (cron cada 15 min)
scraper.py                          Script de extraccion de datos
datos.json                          Ultimo dato extraido (generado automaticamente)
index.html                          Dashboard principal (GitHub Pages)
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
- GitHub Actions (automatizacion y cron)
- GitHub Pages (hosting estatico)
- Chart.js 4.x (graficos)
- HTML/CSS/JS vanilla (sin frameworks)

## Fuente de datos

Todos los datos provienen del Sistema Automatico de Informacion Hidrologica (SAIH) de la Confederacion Hidrografica del Guadalquivir. Este proyecto no esta afiliado ni respaldado por la CHG. Los datos se obtienen mediante scraping de la pagina publica de aforos y pueden presentar retrasos o errores de lectura.

## Limitaciones

- El scraper depende de la estructura HTML de la web del SAIH. Si la CHG modifica el formato de la tabla, el parseo dejara de funcionar.
- Los proxies CORS publicos utilizados (AllOrigins, CodeTabs) pueden caer o limitar peticiones sin previo aviso.
- El historico mostrado en el grafico solo abarca la sesion actual del navegador. No se persiste entre visitas.
- GitHub Actions tiene un limite de minutos gratuitos mensuales. En repositorios publicos no supone problema.
