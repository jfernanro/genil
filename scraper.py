import requests
import json
import re
import logging
import urllib.parse
from datetime import datetime, timezone, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
log = logging.getLogger(__name__)

SAIH_URL = "https://www.chguadalquivir.es/saih/AforosTabla.aspx"
JSON_FILE = "datos.json"
HISTORICO_FILE = "historico.json"
HISTORICO_HORAS = 24          # ventana del historico (cambiar a 48 si se quiere)
MIN_HISTORICO = 20            # nunca guardar menos de esto (cron de GitHub irregular)
MAX_HISTORICO = HISTORICO_HORAS * 8   # tope de seguridad (2x la cadencia nominal de 15 min)
MAX_RETRIES = 2
TIMEOUT_SECONDS = 20

BRIDGES = [
    {"url": SAIH_URL, "type": "direct"},
    {
        "url": "https://api.allorigins.win/get?url=" + urllib.parse.quote(SAIH_URL),
        "type": "json"
    },
    {
        "url": "https://api.codetabs.com/v1/proxy?quest=" + urllib.parse.quote(SAIH_URL),
        "type": "html"
    }
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

COL_NIVEL = 2
COL_COTA = 4
COL_CAUDAL = 6


def save_json(filepath, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f)
    log.info("Guardado %s", filepath)


def load_json(filepath, default):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def parse_number(raw):
    if not raw:
        return None
    clean = raw.strip().replace(" ", "")
    clean = re.sub(r"[^\d,.\-]", "", clean)
    if not clean:
        return None
    if "," in clean and "." in clean:
        clean = clean.replace(".", "").replace(",", ".")
    elif "," in clean:
        clean = clean.replace(",", ".")
    try:
        return float(clean)
    except ValueError:
        return None


def extract_cells_from_row(row_html):
    cells = re.findall(r"<td[^>]*>(.*?)</td>", row_html, re.IGNORECASE | re.DOTALL)
    return [re.sub(r"<[^>]+>", "", c).strip() for c in cells]


def parse_html(html_content):
    upper = html_content.upper()

    if "GENIL" not in upper:
        log.warning("La palabra GENIL no aparece en el HTML recibido")
        return None

    if "A17" not in upper and "ECIJA" not in upper:
        log.warning("No se encuentra referencia a A17 ni ECIJA en el HTML")
        return None

    rows = re.split(r"<tr[^>]*>", html_content, flags=re.IGNORECASE)

    for row in rows:
        row_upper = row.upper()
        is_ecija = ("A17" in row_upper or "ECIJA" in row_upper) and "GENIL" in row_upper

        if not is_ecija:
            continue

        cells = extract_cells_from_row(row)
        log.info("Fila encontrada con %d celdas: %s", len(cells), cells)

        if len(cells) < 7:
            log.warning("Fila con pocas celdas (%d), se esperaban al menos 7", len(cells))
            continue

        nivel = parse_number(cells[COL_NIVEL])
        caudal = parse_number(cells[COL_CAUDAL])
        cota = parse_number(cells[COL_COTA])

        log.info("Valores extraidos -> nivel: %s, caudal: %s, cota: %s", nivel, caudal, cota)

        if nivel is None or nivel < 0 or nivel > 15:
            log.error("Nivel fuera de rango o no numerico: %s", cells[COL_NIVEL])
            continue

        if caudal is not None and (caudal < 0 or caudal > 5000):
            log.warning("Caudal fuera de rango, se descarta: %s", cells[COL_CAUDAL])
            caudal = 0.0

        return {
            "nivel": nivel,
            "caudal": caudal if caudal is not None else 0.0,
            "cota": cota
        }

    log.error("No se encontro fila valida de Ecija/A17 en el HTML")
    return None


def fetch_html(bridge):
    url = bridge["url"]
    bridge_type = bridge["type"]

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            log.info(
                "Intento %d/%d via %s: %s",
                attempt, MAX_RETRIES, bridge_type, url[:80]
            )
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT_SECONDS)

            if response.status_code != 200:
                log.warning("HTTP %d en intento %d", response.status_code, attempt)
                continue

            if bridge_type == "json":
                try:
                    payload = response.json()
                    content = payload.get("contents", "")
                except (ValueError, KeyError):
                    log.warning("Respuesta JSON invalida en intento %d", attempt)
                    continue
            else:
                content = response.text

            if not content or len(content) < 500:
                log.warning("Contenido vacio o demasiado corto (%d bytes)", len(content))
                continue

            return content

        except requests.exceptions.Timeout:
            log.warning("Timeout en intento %d", attempt)
        except requests.exceptions.ConnectionError:
            log.warning("Error de conexion en intento %d", attempt)
        except requests.exceptions.RequestException as e:
            log.warning("Error en intento %d: %s", attempt, e)

    return None


def parse_ts(ts):
    try:
        return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def trim_historico(historico):
    last = historico[-1] if historico else None
    newest = parse_ts(last.get("timestamp")) if isinstance(last, dict) else None
    if newest is None:
        return historico[-MAX_HISTORICO:]
    limite = newest - timedelta(hours=HISTORICO_HORAS)
    corte = len(historico)
    for i, e in enumerate(historico):
        ts = parse_ts(e.get("timestamp")) if isinstance(e, dict) else None
        if ts is not None and ts >= limite:
            corte = i
            break
    desde = min(corte, max(0, len(historico) - MIN_HISTORICO))
    historico = historico[desde:]
    return historico[-MAX_HISTORICO:]


def update_historico(entry):
    historico = load_json(HISTORICO_FILE, [])

    last = historico[-1] if historico else None
    if last and last.get("timestamp") == entry["timestamp"]:
        log.info("Timestamp duplicado, no se anade al historico")
        return

    historico.append(entry)

    historico = trim_historico(historico)

    save_json(HISTORICO_FILE, historico)
    log.info("Historico actualizado: %d lecturas", len(historico))


def is_valid_reading(d):
    if not isinstance(d, dict):
        return False
    nivel = d.get("nivel")
    if isinstance(nivel, bool) or not isinstance(nivel, (int, float)):
        return False
    if nivel < 0 or nivel > 15:
        return False
    ts = d.get("timestamp")
    return isinstance(ts, str) and ts != ""


def last_good_reading():
    prev = load_json(JSON_FILE, None)
    if is_valid_reading(prev):
        status = prev.get("status")
        if status == "success" or (status == "error" and "last_attempt" in prev):
            return {
                "nivel": prev["nivel"],
                "caudal": prev.get("caudal"),
                "timestamp": prev["timestamp"]
            }, "datos previos"

    hist = load_json(HISTORICO_FILE, [])
    if isinstance(hist, list) and hist and is_valid_reading(hist[-1]):
        last = hist[-1]
        return {
            "nivel": last["nivel"],
            "caudal": last.get("caudal"),
            "timestamp": last["timestamp"]
        }, "historico"

    return None, "ninguna"


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    for bridge in BRIDGES:
        html = fetch_html(bridge)

        if html is None:
            continue

        result = parse_html(html)

        if result is None:
            continue

        final_data = {
            "nivel": result["nivel"],
            "caudal": result["caudal"],
            "timestamp": now,
            "status": "success"
        }

        save_json(JSON_FILE, final_data)

        update_historico({
            "nivel": result["nivel"],
            "caudal": result["caudal"],
            "timestamp": now
        })

        log.info("Extraccion completada correctamente")
        return

    log.error("Todos los puentes fallaron. Se guarda estado de error.")
    good, source = last_good_reading()

    if good:
        error_data = {
            "nivel": good["nivel"],
            "caudal": good["caudal"],
            "timestamp": good["timestamp"],
            "status": "error",
            "last_attempt": now
        }
    else:
        error_data = {
            "nivel": None,
            "caudal": None,
            "timestamp": None,
            "status": "error",
            "last_attempt": now
        }

    save_json(JSON_FILE, error_data)
    if good:
        log.info(
            "Estado de error guardado con ultimo dato valido (fuente: %s): nivel=%s, timestamp=%s",
            source, error_data["nivel"], error_data["timestamp"]
        )
    else:
        log.warning("Estado de error guardado sin dato valido previo (nivel/caudal/timestamp null)")


if __name__ == "__main__":
    main()
