import json
import os
from datetime import datetime
from locust import HttpUser, task, between, events
import logging

# Configurar logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Variables de control
json_filename = "locust_output_202201947.json"
json_data = None
total_sends = 0

class IngressUser(HttpUser):
    """
    FASE 2: Usuario que envía el JSON generado al ingress con traffic split
    Configuración: 150 usuarios, 1-4 seg entre peticiones
    """
    # Tiempo de espera entre peticiones: 1-4 segundos
    wait_time = between(1, 4)
    
    def on_start(self):
        """Se ejecuta cuando un usuario inicia"""
        global json_data
        
        if json_data is None:
            print("❌ No hay datos JSON cargados")
            self.environment.process_exit_code = 1
            return
            
        logger.info(f"FASE 2 - Usuario iniciado: {self.host}")
    
    @task
    def send_json_to_ingress(self):
        """
        Envía el JSON completo al ingress
        """
        global total_sends, json_data
        
        if json_data is None:
            return
        
        try:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Locust-Traffic-Generator/1.0'
            }
            
            # Enviar el JSON completo
            with self.client.post("/api/data", 
                                json=json_data, 
                                headers=headers,
                                catch_response=True,
                                timeout=30) as response:
                
                if response.status_code in [200, 201, 202]:
                    response.success()
                    total_sends += 1
                    
                    # Log cada 10 envíos exitosos
                    if total_sends % 10 == 0:
                        print(f"📤 Envíos exitosos: {total_sends}")
                        
                else:
                    response.failure(f"Status code: {response.status_code}")
                    
        except Exception as e:
            # No mostrar errores individuales para evitar spam
            pass


def load_json_data():
    """Carga los datos del JSON generado en la Fase 1"""
    global json_data
    
    try:
        if not os.path.exists(json_filename):
            print(f"❌ Error: Archivo {json_filename} no encontrado")
            print("🔍 Asegúrate de haber ejecutado la Fase 1 primero")
            return False
            
        with open(json_filename, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
            
        # Validar estructura del JSON
        if 'data' not in json_data or 'metadata' not in json_data:
            print("❌ Error: Estructura de JSON inválida")
            return False
            
        records_count = len(json_data.get('data', []))
        
        if records_count == 0:
            print("❌ Error: No hay registros en el JSON")
            return False
            
        print(f"✅ JSON cargado exitosamente")
        print(f"📊 Registros disponibles: {records_count}")
        print(f"📅 Generado: {json_data['metadata'].get('generated_at', 'Desconocido')}")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: JSON inválido - {e}")
        return False
    except Exception as e:
        print(f"❌ Error cargando JSON: {e}")
        return False


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Se ejecuta cuando inicia el test"""
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO FASE 2 - ENVÍO AL INGRESS")
    print(f"{'='*60}")
    
    # Cargar datos del JSON
    if not load_json_data():
        print("❌ No se puede continuar sin los datos del JSON")
        print("🔄 Ejecuta primero la Fase 1 para generar los datos")
        environment.process_exit_code = 1
        return
    
    print(f"🎯 Usuarios: 150")
    print(f"🔄 Intervalo: 1-4 segundos entre peticiones")
    print(f"🌐 Host: {environment.host}")
    print(f"📁 Archivo fuente: {json_filename}")
    print(f"📊 Registros a enviar: {len(json_data.get('data', []))}")
    print(f"{'='*60}")
    print("⚡ Enviando datos al ingress...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Se ejecuta cuando termina el test"""
    print(f"\n⏹️  Envío de datos detenido")
    print(f"📤 Total de envíos realizados: {total_sends}")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """Se ejecuta cuando Locust termina"""
    print(f"\n{'='*60}")
    print(f"✅ FASE 2 COMPLETADA")
    print(f"{'='*60}")
    print(f"📤 Total de envíos realizados: {total_sends}")
    print(f"📁 Archivo enviado: {json_filename}")
    
    if json_data:
        records_sent = len(json_data.get('data', []))
        total_data_points = total_sends * records_sent
        print(f"📊 Registros por envío: {records_sent}")
        print(f"📈 Total de puntos de datos enviados: {total_data_points}")
    
    print(f"🎯 Objetivo: Enviar datos al traffic split para distribución")
    print(f"{'='*60}")
    print(f"✅ Proceso completado exitosamente")
    print(f"{'='*60}")


if __name__ == "__main__":
    print("="*70)
    print("🔧 ENVIADOR AL INGRESS - FASE 2")
    print("="*70)
    print("\n📋 Uso correcto:")
    print("locust -f phase2_sender.py --host=http://TU-INGRESS-URL \\")
    print("       -u 150 -r 1 --headless")
    print("\n📋 Parámetros:")
    print("  --host: URL de tu ingress")
    print("  -u 150: 150 usuarios concurrentes")
    print("  -r 1: agregar 1 usuario por segundo")
    print("  --headless: ejecutar sin interfaz web")
    print("  -t: NO especificar tiempo (ejecutar hasta detener manualmente)")
    print("\n📁 Archivo requerido: locust_output_202201947.json")
    print("🔍 Asegúrate de haber ejecutado la Fase 1 primero")
    print("="*70)