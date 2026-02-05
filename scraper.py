import requests
import json
import re
from datetime import datetime

# URL oficial del SAIH
URL = "https://www.chguadalquivir.es/saih/AforosTabla.aspx"

# Cabeceras anti-bloqueo (Simulan ser un Chrome real en Windows)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1'
}

def main():
    print("Iniciando scraping del SAIH...")
    
    try:
        # Petición con timeout de 30 segundos
        response = requests.get(URL, headers=HEADERS, timeout=30)
        
        # Forzar codificación UTF-8 por si acaso
        response.encoding = 'utf-8'

        if response.status_code != 200:
            print(f"Error HTTP: {response.status_code}")
            return

        html = response.text.upper()
        
        # Buscamos la fila de ECIJA y GENIL
        if 'ECIJA' in html and 'GENIL' in html:
            # Dividimos el HTML por filas de tabla <TR>
            filas = html.split('<TR')
            
            for fila in filas:
                # Buscamos la fila específica
                if 'ECIJA' in fila and 'GENIL' in fila:
                    # Limpiamos las etiquetas HTML para dejar solo texto
                    texto_limpio = re.sub(r'<[^>]+>', ' ', fila)
                    # Quitamos espacios extra
                    texto_limpio = " ".join(texto_limpio.split())
                    
                    print(f"Fila encontrada: {texto_limpio}")
                    
                    # Buscamos números decimales (ej: 2.34 o 0,45)
                    # Explicación Regex: \d+ (números) + [.,] (coma o punto) + \d{2} (dos decimales)
                    numeros = re.findall(r'\d+[.,]\d{2}', texto_limpio)
                    
                    if len(numeros) >= 1:
                        # Asumimos lógica:
                        # 1. El primer decimal encontrado tras el nombre suele ser el NIVEL
                        # 2. El último suele ser el CAUDAL (o uno de los últimos)
                        
                        str_nivel = numeros[0].replace(',', '.')
                        nivel = float(str_nivel)
                        
                        caudal = 0.0
                        if len(numeros) > 1:
                            # Para el caudal, cogemos el último número encontrado en la fila
                            # y limpiamos posibles puntos de miles (ej: 1.200,50)
                            str_caudal = numeros[-1].replace('.', '').replace(',', '.')
                            caudal = float(str_caudal)

                        # Validación de seguridad (el río no puede tener 50 metros de altura)
                        if nivel > 20: 
                             print(f"Nivel detectado ({nivel}m) parece erróneo, descartando.")
                             continue

                        datos = {
                            "nivel": nivel,
                            "caudal": caudal,
                            "timestamp": datetime.now().isoformat(),
                            "status": "success"
                        }
                        
                        # Guardamos el archivo JSON
                        with open('datos.json', 'w') as f:
                            json.dump(datos, f)
                        
                        print(f"ÉXITO: Nivel {nivel}m - Caudal {caudal}m3/s guardados.")
                        return

        print("No se encontraron datos válidos de Écija en el HTML.")
        
    except Exception as e:
        print(f"Error fatal en el script: {str(e)}")

if __name__ == "__main__":
    main()
