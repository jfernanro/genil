import requests
import json
import re
import os
from datetime import datetime

# Configuración
URL = "https://www.chguadalquivir.es/saih/AforosTabla.aspx"
JSON_FILE = "datos.json"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
}

def guardar_json(datos):
    with open(JSON_FILE, 'w') as f:
        json.dump(datos, f)
    print(f"💾 Archivo {JSON_FILE} guardado/actualizado.")

def main():
    print("🌊 Iniciando robot del SAIH...")
    
    datos_finales = {
        "nivel": 0.0,
        "caudal": 0.0,
        "timestamp": datetime.now().isoformat(),
        "status": "error" # Por defecto asumimos error hasta demostrar lo contrario
    }

    try:
        response = requests.get(URL, headers=HEADERS, timeout=30)
        response.encoding = 'utf-8'

        if response.status_code != 200:
            print(f"❌ Error HTTP: {response.status_code}")
            guardar_json(datos_finales)
            return

        html = response.text.upper()
        
        # Búsqueda más agresiva: Buscar cualquier mención a ECIJA y GENIL en la misma línea
        # Dividimos por TR (filas)
        filas = html.split('<TR')
        encontrado = False

        for fila in filas:
            if 'ECIJA' in fila and 'GENIL' in fila:
                # Limpiamos HTML
                texto_limpio = re.sub(r'<[^>]+>', ' ', fila)
                texto_limpio = " ".join(texto_limpio.split())
                
                print(f"🔎 Fila encontrada: {texto_limpio}")
                
                # Buscamos números decimales (ej: 2.34 o 0,45)
                numeros = re.findall(r'\d+[.,]\d{2}', texto_limpio)
                
                if len(numeros) >= 1:
                    # Asumimos que el primer número es Nivel
                    nivel = float(numeros[0].replace(',', '.'))
                    
                    # Asumimos que el último número (si hay más de uno) es Caudal
                    caudal = 0.0
                    if len(numeros) > 1:
                        caudal = float(numeros[-1].replace('.', '').replace(',', '.'))
                    
                    # Filtro de cordura: El río no puede tener 50 metros de altura
                    if nivel < 20:
                        datos_finales["nivel"] = nivel
                        datos_finales["caudal"] = caudal
                        datos_finales["status"] = "success"
                        datos_finales["timestamp"] = datetime.now().isoformat()
                        encontrado = True
                        print(f"✅ ÉXITO: Nivel {nivel}m detectado.")
                        break

        if not encontrado:
            print("⚠️ No se encontraron datos válidos en el HTML, guardando estado de error.")

    except Exception as e:
        print(f"🔥 Excepción fatal: {e}")
    
    # IMPORTANTE: Guardamos SIEMPRE, haya éxito o fallo.
    # Esto evita el error "pathspec did not match any files" en Git.
    guardar_json(datos_finales)

if __name__ == "__main__":
    main()
