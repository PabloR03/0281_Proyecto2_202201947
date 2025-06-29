import json
import time
from datetime import datetime
from locust import HttpUser, task, between, events
import logging

# Configurar logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# Lista para almacenar todos los datos JSON recibidos
collected_data = []

# Variables de control
json_filename = "locust_output_202201947.json"

class SystemMonitorUser(HttpUser):
    """
    FASE 1: Usuario de Locust que simula peticiones al sistema de monitoreo en la VM
    Configuración: 300 usuarios, 1-2 seg entre peticiones, 3 minutos
    """
    # Tiempo de espera entre peticiones: 1-2 segundos
    wait_time = between(1, 2)
    
    def on_start(self):
        """Se ejecuta cuando un usuario inicia"""
        logger.info(f"Usuario iniciado: {self.host}")
    
    @task(10)  # Peso 10 - tarea principal
    def get_metrics(self):
        """
        Obtiene las métricas completas del sistema
        Formato esperado del JSON:
        {
            "total_ram": 2072,
            "ram_libre": 1110552576,
            "uso_ram": 442,
            "porcentaje_ram": 22,
            "porcentaje_cpu_uso": 22,
            "porcentaje_cpu_libre": 88,
            "procesos_corriendo": 123,
            "total_procesos": 233,
            "procesos_durmiendo": 65,
            "procesos_zombie": 65,
            "procesos_parados": 65,
            "hora": "2025-06-17 02:21:54"
        }
        """
        try:
            with self.client.get("/metrics", catch_response=True) as response:
                if response.status_code == 200:
                    try:
                        # Parsear el JSON
                        data = response.json()
                        
                        # Agregar timestamp de cuando se recibió
                        data['timestamp_received'] = datetime.now().isoformat()
                        
                        # Guardar en la lista global
                        collected_data.append(data)
                        
                        # Log cada 200 registros para verificación
                        if len(collected_data) % 200 == 0:
                            print(f"📊 Registros recolectados: {len(collected_data)}")
                        
                        response.success()
                        
                    except json.JSONDecodeError as e:
                        response.failure(f"Invalid JSON response: {e}")
                        
                else:
                    response.failure(f"Status code: {response.status_code}")
                    
        except Exception as e:
            pass
    
    @task(3)  # Peso 3 - tarea secundaria
    def get_cpu_info(self):
        """Obtiene información específica de CPU"""
        try:
            with self.client.get("/cpu", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status code: {response.status_code}")
        except Exception as e:
            pass
    
    @task(3)  # Peso 3 - tarea secundaria
    def get_ram_info(self):
        """Obtiene información específica de RAM"""
        try:
            with self.client.get("/ram", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status code: {response.status_code}")
        except Exception as e:
            pass
    
    @task(2)  # Peso 2 - tarea secundaria
    def get_processes_info(self):
        """Obtiene información específica de procesos"""
        try:
            with self.client.get("/procesos", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status code: {response.status_code}")
        except Exception as e:
            pass
    
    @task(1)  # Peso 1 - verificación de salud
    def health_check(self):
        """Verifica que el servicio esté disponible"""
        try:
            with self.client.get("/health", catch_response=True) as response:
                if response.status_code == 200:
                    response.success()
                else:
                    response.failure(f"Status code: {response.status_code}")
        except Exception as e:
            pass


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Se ejecuta cuando inicia el test"""
    print(f"\n{'='*60}")
    print(f"🚀 INICIANDO FASE 1 - GENERACIÓN DE TRÁFICO")
    print(f"{'='*60}")
    print(f"🎯 Usuarios: 300")
    print(f"⏱️  Duración: 3 minutos (180 segundos)")
    print(f"🔄 Intervalo: 1-2 segundos entre peticiones")
    print(f"📈 Objetivo: ~2000 registros")
    print(f"🌐 Host: {environment.host}")
    print(f"📁 Archivo de salida: {json_filename}")
    print(f"{'='*60}")
    print("⚡ Generando tráfico...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Se ejecuta cuando termina el test"""
    print(f"\n⏹️  Generación de tráfico detenida")
    print(f"📊 Registros recolectados: {len(collected_data)}")


@events.quitting.add_listener
def on_quitting(environment, **kwargs):
    """
    Se ejecuta cuando Locust termina
    Guarda todos los datos recolectados en un archivo JSON
    """
    if collected_data:
        try:
            # Preparar metadata
            metadata = {
                "total_records": len(collected_data),
                "collection_start": collected_data[0]['timestamp_received'] if collected_data else None,
                "collection_end": collected_data[-1]['timestamp_received'] if collected_data else None,
                "duration_minutes": 3,
                "users": 300,
                "generated_at": datetime.now().isoformat(),
                "phase": 1,
                "description": "Datos recolectados del sistema de monitoreo"
            }
            
            # Estructura final del JSON
            final_data = {
                "metadata": metadata,
                "data": collected_data
            }
            
            # Guardar todos los datos en un archivo JSON
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(final_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n{'='*60}")
            print(f"✅ FASE 1 COMPLETADA EXITOSAMENTE")
            print(f"{'='*60}")
            print(f"📁 Archivo generado: {json_filename}")
            print(f"📊 Total de registros: {len(collected_data)}")
            print(f"🎯 Objetivo: ~2000 registros")
            
            # Mostrar estadísticas
            if len(collected_data) >= 2000:
                print("✅ Objetivo de registros alcanzado!")
                status = "EXITOSO"
            elif len(collected_data) >= 1500:
                print("⚠️  Registros suficientes para continuar")
                status = "ACEPTABLE"
            else:
                print(f"❌ Solo se generaron {len(collected_data)} registros")
                status = "INSUFICIENTE"
            
            print(f"📋 Estado: {status}")
            print(f"{'='*60}")
            print(f"🔄 Siguiente paso: Ejecutar Fase 2")
            print(f"💻 Comando: locust -f phase2_sender.py --host=http://TU-INGRESS-URL -u 150 -r 1 --headless")
            print(f"{'='*60}")
                
        except Exception as e:
            print(f"❌ Error guardando datos: {e}")
    else:
        print("\n❌ No se recolectaron datos durante la ejecución")
        print("🔍 Verificar que el backend esté funcionando en el host especificado")


if __name__ == "__main__":
    print("="*70)
    print("🔧 GENERADOR DE TRÁFICO - FASE 1")
    print("="*70)
    print("\n📋 Uso correcto:")
    print("locust -f phase1_generator.py --host=http://TU-VM-IP:8080 \\")
    print("       -u 300 -r 1 -t 180s --headless")
    print("\n📋 Parámetros:")
    print("  --host: URL de tu VM con el backend")
    print("  -u 300: 300 usuarios concurrentes")
    print("  -r 1: agregar 1 usuario por segundo")
    print("  -t 180s: duración de 3 minutos")
    print("  --headless: ejecutar sin interfaz web")
    print("\n📁 Archivo de salida: locust_output_202201947.json")
    print("="*70)



# locust -f phase1_generator.py --host=http://35.188.88.211:8080 -u 300 -r 1 -t 180s --headless