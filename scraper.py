import requests
import json
import re
import urllib3
import urllib.parse
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TARGET_URL = "https://www.chguadalquivir.es/saih/AforosTabla.aspx"
JSON_FILE = "datos.json"

BRIDGES = [
    {
        "url": "https://api.allorigins.win/get?url=" + urllib.parse.quote(TARGET_URL),
        "type": "json"
    },
    {
        "url": "https://api.codetabs.com/v1/proxy?quest=" + urllib.parse.quote(TARGET_URL),
        "type": "html"
    }
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def save_json(data):
    with open(JSON_FILE, 'w') as f:
        json.dump(data, f)
    print(f"Archivo guardado: {data}")

def parse_html(html_content):
    html = html_content.upper()
    
    if ('A17' in html or 'ECIJA' in html) and 'GENIL' in html:
        rows = html.split('<TR')
        for row in rows:
            if ('A17' in row or 'ECIJA' in row) and 'GENIL' in row:
                clean_text = re.sub(r'<[^>]+>', ' ', row)
                clean_text = " ".join(clean_text.split())
                
                print(f"Fila encontrada: {clean_text}")
                
                numbers = re.findall(r'\d+[.,]\d{2}', clean_text)
                
                if len(numbers) >= 1:
                    level = float(numbers[0].replace(',', '.'))
                    flow = 0.0
                    
                    if len(numbers) > 1:
                        try:
                            flow = float(numbers[-1].replace('.', '').replace(',', '.'))
                        except:
                            flow = 0.0
                    
                    return {"level": level, "flow": flow, "found": True}
                    
    return {"found": False}

def main():
    final_data = {
        "nivel": 0.0,
        "caudal": 0.0,
        "timestamp": datetime.utcnow().isoformat() + "Z", 
        "status": "error"
    }
    
    success = False

    for bridge in BRIDGES:
        if success:
            break
            
        print(f"Conectando via puente: {bridge['url']}")
        
        try:
            response = requests.get(bridge['url'], headers=HEADERS, timeout=30, verify=False)
            
            if response.status_code != 200:
                print(f"Error HTTP {response.status_code}")
                continue

            content = ""
            if bridge['type'] == "json":
                try:
                    json_resp = response.json()
                    content = json_resp.get("contents", "")
                except:
                    continue
            else:
                content = response.text

            if not content:
                continue

            result = parse_html(content)
            
            if result["found"]:
                final_data["nivel"] = result["level"]
                final_data["caudal"] = result["flow"]
                final_data["status"] = "success"
                final_data["timestamp"] = datetime.utcnow().isoformat() + "Z"
                success = True
                print("Datos extraidos correctamente")
            else:
                print("Datos no encontrados en el HTML")

        except Exception as e:
            print(f"Excepcion: {e}")

    save_json(final_data)

if __name__ == "__main__":
    main()
