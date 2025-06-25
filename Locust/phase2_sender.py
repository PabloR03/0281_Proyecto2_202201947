import json
import os
import random
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
successful_sends = 0
failed_sends = 0
data_index = 0

# URL del Ingress - CAMBIAR POR TU IP DE MINIKUBE
INGRESS_URL = "http://192.168.49.2:30901/monitoring-data"  # NodePort del ingress
# INGRESS_URL = "http://monitoring-api.local"  # Si usas host mapping

class IngressTrafficUser(HttpUser):
    """
    TRAFFIC SPLIT VIA INGRESS: Usuario que envía datos al Ingress
    El Ingress se encarga de distribuir el tráfico entre Node.js y Python APIs
    """
    # Tiempo de espera entre peticiones: 1-2 segundos para mayor throughput
    wait_time = between(1, 2)
    
    # Configurar el host del ingress
    host = INGRESS_URL
    
    def on_start(self):
        """Se ejecuta cuando un usuario inicia"""
        global json_data
        
        if json_data is None:
            print("❌ No hay datos JSON cargados")
            self.environment.process_exit_code = 1
            return
            
        logger.info(f"INGRESS TRAFFIC SPLIT - Usuario iniciado: {self.host}")
    
    @task
    def send_monitoring_data_to_ingress(self):
        """
        Envía datos de monitoreo al Ingress
        El Ingress distribuye automáticamente entre las APIs
        """
        global total_sends, successful_sends, failed_sends, json_data, data_index
        
        if json_data is None or not json_data.get('data'):
            return
        
        # Obtener registros secuencialmente para enviar todos los datos
        records = json_data['data']
        
        # Usar índice global para recorrer secuencialmente
        current_record = records[data_index % len(records)]
        data_index += 1
        
        try:
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Locust-IngressSplit/1.0',
                'X-Request-ID': f'req-{total_sends}-{datetime.now().microsecond}'
            }
            
            # Preparar los datos para enviar (estructura exacta del JSON)
            monitoring_data = {
                "total_ram": current_record.get("total_ram"),
                "ram_libre": current_record.get("ram_libre"), 
                "uso_ram": current_record.get("uso_ram"),
                "porcentaje_ram": current_record.get("porcentaje_ram"),
                "porcentaje_cpu_uso": current_record.get("porcentaje_cpu_uso"),
                "porcentaje_cpu_libre": current_record.get("porcentaje_cpu_libre"),
                "procesos_corriendo": current_record.get("procesos_corriendo"),
                "total_procesos": current_record.get("total_procesos"),
                "procesos_durmiendo": current_record.get("procesos_durmiendo"),
                "procesos_zombie": current_record.get("procesos_zombie"),
                "procesos_parados": current_record.get("procesos_parados"),
                "hora": current_record.get("hora"),
                "timestamp_received": current_record.get("timestamp_received"),
                # Metadata adicional para tracking
                "source": "locust_traffic_split",
                "record_id": data_index - 1
            }
            
            # Enviar al endpoint del ingress
            with self.client.post("/monitoring-data", 
                                json=monitoring_data, 
                                headers=headers,
                                catch_response=True,
                                timeout=30) as response:
                
                total_sends += 1
                
                if response.status_code in [200, 201, 202]:
                    response.success()
                    successful_sends += 1
                    
                    # Mostrar qué backend procesó la request (si está en headers)
                    backend_used = response.headers.get('X-Backend-Used', 'unknown')
                    
                    # Log cada 50 envíos exitosos
                    if successful_sends % 50 == 0:
                        completion_pct = (data_index / len(records)) * 100
                        print(f"📤 Exitosos: {successful_sends} | Total: {total_sends} | "
                              f"Progreso: {completion_pct:.1f}% | Backend: {backend_used}")
                        
                else:
                    response.failure(f"Status code: {response.status_code}")
                    failed_sends += 1
                    
        except Exception as e:
            failed_sends += 1
            # Log errores críticos ocasionalmente
            if failed_sends % 10 == 0:
                logger.warning(f"Connection error count: {failed_sends}")
    
    @task(1)  # Tarea menos frecuente para verificar status
    def check_ingress_status(self):
        """Verifica el status del ingress y sus backends"""
        try:
            with self.client.get("/status", 
                               catch_response=True,
                               timeout=10) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status check failed: {response.status_code}")
        except Exception:
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
        print(f"📊 Total de registros: {records_count}")
        print(f"📅 Generado: {json_data['metadata'].get('generated_at', 'Desconocido')}")
        print(f"🕐 Duración original: {json_data['metadata'].get('duration_minutes', 0)} minutos")
        print(f"👥 Usuarios originales: {json_data['metadata'].get('users', 0)}")
        
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
    print(f"\n{'='*80}")
    print(f"🚀 INICIANDO TRAFFIC SPLIT VIA INGRESS")
    print(f"{'='*80}")
    
    # Cargar datos del JSON
    if not load_json_data():
        print("❌ No se puede continuar sin los datos del JSON")
        print("🔄 Ejecuta primero la Fase 1 para generar los datos")
        environment.process_exit_code = 1
        return
    
    print(f"🎯 Configuración:")
    print(f"   🌐 Ingress URL: {INGRESS_URL}")
    print(f"   📍 Endpoint: /monitoring-data")
    print(f"   ⚖️  Traffic Split: Manejado por Ingress (50% Node.js / 50% Python)")
    print(f"   📁 Archivo fuente: {json_filename}")
    print(f"   📊 Registros a procesar: {len(json_data.get('data', []))}")
    print(f"   🔄 Modo: Secuencial (recorre todo el JSON)")
    print(f"{'='*80}")
    print("⚡ Enviando datos a través del Ingress...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Se ejecuta cuando termina el test"""
    print(f"\n⏹️  Traffic splitting detenido")
    print(f"📤 Total enviados: {total_sends}")
    print(f"✅ Exitosos: {successful_sends}")
    print(f"❌ Fallidos: {failed_sends}")
    
    if total_sends > 0:
        success_rate = (successful_sends / total_sends) * 100
        print(f"📊 Tasa de éxito: {success_rate:.1f}%")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """Se ejecuta cuando Locust termina"""
    print(f"\n{'='*80}")
    print(f"✅ TRAFFIC SPLITTING VIA INGRESS COMPLETADO")
    print(f"{'='*80}")
    
    if json_data:
        total_records = len(json_data.get('data', []))
        processed_records = min(data_index, total_records)
        completion_pct = (processed_records / total_records) * 100
        
        print(f"📊 Estadísticas finales:")
        print(f"   📁 Archivo procesado: {json_filename}")
        print(f"   📋 Registros disponibles: {total_records}")
        print(f"   ✅ Registros procesados: {processed_records}")
        print(f"   📈 Completitud: {completion_pct:.1f}%")
        print(f"   📤 Requests totales: {total_sends}")
        print(f"   ✅ Requests exitosas: {successful_sends}")
        print(f"   ❌ Requests fallidas: {failed_sends}")
        
        if total_sends > 0:
            success_rate = (successful_sends / total_sends) * 100
            print(f"   📊 Tasa de éxito: {success_rate:.1f}%")
            
            # Estimación de distribución (50/50 por el ingress)
            estimated_nodejs = successful_sends // 2
            estimated_python = successful_sends - estimated_nodejs
            print(f"   🟢 Estimado Node.js: ~{estimated_nodejs} requests")
            print(f"   🟡 Estimado Python: ~{estimated_python} requests")
    
    print(f"🎯 Resultado: Datos enviados via Ingress con traffic splitting automático")
    print(f"⚖️  El Ingress distribuyó el tráfico entre Node.js y Python APIs")
    print(f"💾 Los datos deberían estar insertados en ambas bases de datos")
    print(f"{'='*80}")


if __name__ == "__main__":
    print("="*90)
    print("🔧 TRAFFIC SPLITTER VIA INGRESS - DISTRIBUCIÓN AUTOMÁTICA")
    print("="*90)
    print("\n📋 Pasos previos:")
    print("1. Asegúrate de que el Ingress esté desplegado:")
    print("   kubectl apply -f ingress-traffic-split.yaml")
    print("2. Verifica que el Ingress esté funcionando:")
    print("   kubectl get ingress -n so1-fase2")
    print("   curl http://192.168.49.2:30900/status")
    
    print("\n📋 Uso correcto:")
    print("locust -f trafficSplitIngress.py -u 50 -r 2 --headless -t 600s")
    
    print("\n📋 Parámetros recomendados:")
    print("  -u 50: 50 usuarios concurrentes (menos usuarios, más throughput)")
    print("  -r 2: agregar 2 usuarios por segundo")
    print("  --headless: ejecutar sin interfaz web")
    print("  -t 600s: ejecutar por 10 minutos")
    
    print(f"\n🎯 Configuración actual:")
    print(f"  🌐 Ingress URL: {INGRESS_URL}")
    print(f"  📍 Endpoint: /monitoring-data")
    print(f"  ⚖️  Traffic Split: Automático via Ingress")
    
    print("\n📁 Archivo requerido: locust_output_202201947.json")
    print("🔍 Asegúrate de haber ejecutado la Fase 1 primero")
    
    print("\n💡 Para cambiar la URL del Ingress, modifica la variable:")
    print("     INGRESS_URL al inicio del archivo")
    print("="*90)