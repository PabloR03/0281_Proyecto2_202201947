#!/usr/bin/env python3
"""
Enviador de Datos Fase 2 con Locust - CORREGIDO
Envía datos de monitoreo al balanceador de carga usando Locust
"""

import json
import random
import time
from datetime import datetime
from locust import HttpUser, task, between, events
from locust.env import Environment
from locust.stats import stats_printer, stats_history
from locust.log import setup_logging
import logging
import gevent

# Configurar logging
setup_logging("INFO", None)
logger = logging.getLogger(__name__)

# Variable global para almacenar los datos del JSON
json_data = None
monitoring_records = []

def load_json_data():
    """Cargar datos del archivo JSON al inicio"""
    global json_data, monitoring_records
    
    json_file_path = "/home/pablor03/Documentos/LabSopes1/Proyecto_Fase2/Locust/locust_output_202201947.json"
    
    try:
        logger.info(f"Cargando datos desde: {json_file_path}")
        with open(json_file_path, 'r', encoding='utf-8') as file:
            json_data = json.load(file)
        
        monitoring_records = json_data['data']
        
        logger.info(f"Datos cargados exitosamente:")
        logger.info(f"- Total de registros: {json_data['metadata']['total_records']}")
        logger.info(f"- Fase: {json_data['metadata']['phase']}")
        logger.info(f"- Usuarios: {json_data['metadata']['users']}")
        logger.info(f"- Duración: {json_data['metadata']['duration_minutes']} minutos")
        logger.info(f"- Registros disponibles: {len(monitoring_records)}")
        
        # Mostrar ejemplo de los primeros registros para debug
        if monitoring_records:
            logger.info(f"Ejemplo de registro: {monitoring_records[0]}")
            logger.info(f"Campos disponibles: {list(monitoring_records[0].keys())}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error al cargar datos: {e}")
        return False

class EnviadorDatosMonitoreo(HttpUser):
    """
    Usuario de Locust que envía datos de monitoreo al balanceador de carga
    """
    
    # Tiempo de espera entre tareas (en segundos)
    wait_time = between(0.1, 0.5)  # Entre 100ms y 500ms
    
    def on_start(self):
        """Se ejecuta cuando inicia cada usuario"""
        self.record_index = 0
        self.user_id = id(self)
        logger.info(f"Usuario {self.user_id} iniciado")
    
    @task(10)  # Peso 10 - tarea principal
    def enviar_datos_monitoreo(self):
        """Enviar datos de monitoreo al endpoint correcto"""
        global monitoring_records
        
        if not monitoring_records:
            logger.error("No hay datos disponibles para enviar")
            return
        
        # Seleccionar un registro aleatorio
        record = random.choice(monitoring_records)
        
        # Debug: mostrar qué datos estamos enviando
        if random.random() < 0.01:  # Solo 1% de las veces para no saturar logs
            logger.info(f"Enviando registro: {record}")
        
        # Enviar el registro directamente como viene del JSON
        # Sin wrapper, tal como está en el archivo original
        payload = record
        
        # USAR LA RUTA CORRECTA SEGÚN TU INGRESS
        with self.client.post(
            "/monitoring-data",  # Cambiado de /metricas a /monitoring-data
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Locust-Phase2-Sender/1.0'
            },
            catch_response=True,
            name="enviar_datos_monitoreo"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 201:  # Algunos APIs devuelven 201 para creación
                response.success()
            else:
                response.failure(f"Código de estado: {response.status_code}")
                # Debug: mostrar respuesta de error
                if random.random() < 0.1:  # 10% de las veces
                    logger.error(f"Error response: {response.text[:200]}")
    
    @task(2)  # Tarea secundaria para GET
    def obtener_datos_monitoreo(self):
        """Obtener datos existentes"""
        with self.client.get("/monitoring-data", catch_response=True, name="obtener_datos_monitoreo") as response:
            if response.status_code in [200, 404]:  # 200 OK o 404 si no hay datos
                response.success()
            else:
                response.failure(f"Código de estado: {response.status_code}")
    
    @task(1)  # Peso 1 - tarea de health check
    def health_check(self):
        """Probar health check del root"""
        with self.client.get("/", catch_response=True, name="health_check") as response:
            if response.status_code in [200, 404]:  # 404 es OK si no existe el endpoint
                response.success()
            else:
                response.failure(f"Código de estado: {response.status_code}")

# Eventos personalizados para estadísticas
@events.test_start.add_listener
def al_iniciar_test(environment, **kwargs):
    """Se ejecuta al inicio del test"""
    logger.info("="*50)
    logger.info("INICIANDO TEST DE FASE 2")
    logger.info("="*50)
    
    # Cargar datos del JSON
    if not load_json_data():
        logger.error("No se pudieron cargar los datos. Abortando test.")
        environment.process_exit_code = 1
        environment.runner.quit()
        return
    
    logger.info(f"Objetivo: {environment.host}/monitoring-data")  # Actualizado
    
    # Obtener configuración
    try:
        if hasattr(environment, 'parsed_options'):
            num_users = getattr(environment.parsed_options, 'num_users', 'N/A')
            spawn_rate = getattr(environment.parsed_options, 'spawn_rate', 'N/A')
            run_time = getattr(environment.parsed_options, 'run_time', 'N/A')
            
            logger.info(f"Usuarios configurados: {num_users}")
            logger.info(f"Velocidad de spawn: {spawn_rate}")
            logger.info(f"Tiempo de ejecución: {run_time}")
        else:
            logger.info("Configuración de usuarios: No disponible")
    except Exception as e:
        logger.warning(f"No se pudo obtener configuración: {e}")

@events.test_stop.add_listener  
def al_finalizar_test(environment, **kwargs):
    """Se ejecuta al final del test"""
    logger.info("="*50)
    logger.info("TEST COMPLETADO")
    logger.info("="*50)
    
    # Obtener estadísticas
    stats = environment.stats
    total_requests = stats.total.num_requests
    total_failures = stats.total.num_failures
    tasa_exito = ((total_requests - total_failures) / total_requests * 100) if total_requests > 0 else 0
    
    logger.info(f"Total de requests: {total_requests}")
    logger.info(f"Requests exitosos: {total_requests - total_failures}")
    logger.info(f"Requests fallidos: {total_failures}")
    logger.info(f"Tasa de éxito: {tasa_exito:.2f}%")
    logger.info(f"RPS promedio: {stats.total.current_rps:.2f}")

# Configuración para ejecución directa
if __name__ == "__main__":
    # Configuración del entorno
    env = Environment(user_classes=[EnviadorDatosMonitoreo])
    env.create_local_runner()
    
    # Configurar host - usando la IP externa del ingress
    env.host = "http://34.70.154.124"  # Tu IP actual
    
    # Cargar datos antes de iniciar
    if not load_json_data():
        logger.error("No se pudieron cargar los datos. Abortando.")
        exit(1)
    
    # Iniciar el test
    logger.info("Iniciando test con 10 usuarios durante 60 segundos...")
    env.runner.start(user_count=10, spawn_rate=2)
    
    # Ejecutar por 60 segundos
    gevent.spawn_later(60, lambda: env.runner.quit())
    
    # Mantener el test corriendo
    env.runner.greenlet.join()
    
    # Mostrar estadísticas finales
    logger.info("¡Test completado!")
    stats = env.stats
    print("\nEstadísticas finales:")
    print(f"Total requests: {stats.total.num_requests}")
    print(f"Fallos: {stats.total.num_failures}")
    print(f"RPS promedio: {stats.total.current_rps:.2f}")
    print(f"Tiempo promedio respuesta: {stats.total.avg_response_time:.2f}ms")

# COMANDOS ACTUALIZADOS:
# locust -f phase2_sender_fixed.py --host=http://34.70.154.124 -u 150 -r 1 -t 10s --headless
#
# Para verificar:
# kubectl get pods -n so1-fase2
# kubectl logs -n so1-fase2 deployment/api-python-deployment
# kubectl logs -n so1-fase2 deployment/api-nodejs-deployment







# -- SELECT * FROM fase2.monitoring_data;

# SELECT api, COUNT(*) AS cantidad
# FROM fase2.monitoring_data
# WHERE api IN ('Node.js', 'Python')
# GROUP BY api;


# locust -f phase2_sender.py --host=http://34.70.154.124 -u 150 -r 1 -t 5s --headless