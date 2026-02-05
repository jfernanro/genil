import requests
import json
import re
import urllib3
from datetime import datetime

# Desactivar avisos de seguridad (necesario para webs antiguas del gobierno)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuración
URL = "https://www.chguadalquivir.es/saih/AforosTabla.aspx"
JSON_FILE = "datos.json"

# Cabeceras "Antirrobo" para parecer un PC normal
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
    print(f"💾 JSON Final guardado: {datos}")

def main():
    print("🕵️ INICIANDO MODO DETECTIVE...")
    
    datos = {
        "nivel": 0.0, 
        "caudal": 0.0, 
        "timestamp": datetime.now().isoformat(), 
        "status": "error"
    }

    try:
        # Petición ignorando verificación SSL (verify=False)
        print(f"📡 Conectando a {URL}...")
        response = requests.get(URL, headers=HEADERS, timeout=30, verify=False)
        response.encoding = 'utf-8'
        
        print(f"⚡ Estado HTTP: {response.status_code}")
        
        if response.status_code != 200:
            print("❌ La web devolvió un error.")
            guardar_json(datos)
            return

        html = response.text.upper() # Convertimos todo a mayúsculas para buscar mejor
        print(f"📄 Tamaño descarga: {len(html)} caracteres")
        
        # 1. VERIFICAR SI NOS HAN BLOQUEADO
        titulo = re.search(r'<TITLE>(.*?)</TITLE>', html)
        if titulo:
            print(f"🏷️ Título de la web descargada: {titulo.group(1).strip()}")
        else:
            print("⚠️ La página NO tiene título (¿Página blanca?).")

        # 2. INTENTAR BUSCAR LA ESTACIÓN A17 (Más fiable que 'ECIJA')
        print("🔎 Buscando 'A17' y 'GENIL'...")
        
        filas = html.split('<TR')
        encontrado = False

        for fila in filas:
            # Buscamos A17 (código) o ECIJA, y que sea del río GENIL
            if ('A17' in fila or 'ECIJA' in fila) and 'GENIL' in fila:
                
                # Limpiamos el HTML para ver el texto puro
                texto_limpio = re.sub(r'<[^>]+>', ' ', fila)
                texto_limpio = " ".join(texto_limpio.split())
                
                print(f"🎯 FILA ENCONTRADA: {texto_limpio}")
                
                # Buscamos números decimales (formato 0,45 o 2.34)
                numeros = re.findall(r'\d+[.,]\d{2}', texto_limpio)
                print(f"🔢 Números detectados: {numeros}")
                
                if len(numeros) >= 1:
                    # El primer número suele ser el nivel
                    datos["nivel"] = float(numeros[0].replace(',', '.'))
                    
                    # Si hay más, el último suele ser el caudal
                    if len(numeros) > 1:
                         # Limpiamos puntos de miles si los hay (ej: 1.200,50)
                        raw_caudal = numeros[-1].replace('.', '').replace(',', '.')
                        datos["caudal"] = float(raw_caudal)
                    
                    datos["status"] = "success"
                    encontrado = True
                    print("✅ ¡DATOS EXTRAÍDOS CORRECTAMENTE!")
                    break
        
        if not encontrado:
            print("❌ NO se encontró la fila de Ecija/A17.")
            print("--- MUESTRA DEL HTML DESCARGADO (Primeros 500 cars) ---")
            print(html[:500])
            print("-------------------------------------------------------")

    except Exception as e:
        print(f"🔥 ERROR FATAL: {str(e)}")

    guardar_json(datos)

if __name__ == "__main__":
    main()
