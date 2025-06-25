from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configurar CORS de manera simple
CORS(app)

# Configuración de base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'monitoring'),
    'user': os.getenv('DB_USER', 'admin'),
    'password': os.getenv('DB_PASSWORD', 'admin123'),
    'port': os.getenv('DB_PORT', '5432')
}

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"Error conectando a la base de datos: {e}")
        return None

def parse_datetime(date_string):
    """Función para parsear fechas, igual que en Node.js"""
    if not date_string or not isinstance(date_string, str):
        raise ValueError(f"Fecha inválida: {date_string}")
    
    # Limpiar la fecha de espacios
    clean_date_string = date_string.strip()
    
    try:
        # Intentar parsear directamente primero
        return datetime.fromisoformat(clean_date_string.replace('Z', '+00:00'))
    except:
        pass
    
    # Si tiene microsegundos (más de 3 dígitos después del punto), truncar a milisegundos
    if '.' in clean_date_string:
        parts = clean_date_string.split('.')
        if len(parts) == 2 and len(parts[1]) > 3:
            # Truncar microsegundos a milisegundos
            clean_date_string = f"{parts[0]}.{parts[1][:3]}"
    
    # Formatos específicos a intentar
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%f"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(clean_date_string, fmt)
        except:
            continue
    
    raise ValueError(f"No se pudo parsear la fecha: {date_string}")

# Rutas

@app.route('/', methods=['GET'])
def home():
    """Ruta raíz"""
    return jsonify({
        'message': 'Monitoring Data API',
        'version': '1.0.0',
        'api_type': 'Python/Flask'
    })

@app.route('/monitoring-data', methods=['POST'])
def create_monitoring_data():
    """Recibir datos de monitoreo en tiempo real"""
    try:
        data = request.get_json()
        
        # Validar que los datos requeridos estén presentes
        if not data or not isinstance(data, dict):
            return jsonify({
                'error': 'Datos inválidos: se esperaba un objeto JSON'
            }), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'error': 'Error de conexión a la base de datos'
            }), 500

        try:
            with conn.cursor() as cursor:
                monitoring_query = """
                    INSERT INTO monitoring_data (
                        total_ram, ram_libre, uso_ram, porcentaje_ram, porcentaje_cpu_uso,
                        porcentaje_cpu_libre, procesos_corriendo, total_procesos,
                        procesos_durmiendo, procesos_zombie, procesos_parados,
                        hora, timestamp_received, api
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """

                values = (
                    data.get('total_ram', 0),
                    data.get('ram_libre', 0),
                    data.get('uso_ram', 0),
                    data.get('porcentaje_ram', 0),
                    data.get('porcentaje_cpu_uso', 0),
                    data.get('porcentaje_cpu_libre', 0),
                    data.get('procesos_corriendo', 0),
                    data.get('total_procesos', 0),
                    data.get('procesos_durmiendo', 0),
                    data.get('procesos_zombie', 0),
                    data.get('procesos_parados', 0),
                    parse_datetime(data.get('hora', datetime.now().isoformat())),
                    parse_datetime(data.get('timestamp_received', datetime.now().isoformat())),
                    'Python/Flask'
                )

                cursor.execute(monitoring_query, values)
                result = cursor.fetchone()
                conn.commit()

                return jsonify({
                    'message': 'Datos de monitoreo guardados exitosamente',
                    'id': result[0],
                    'timestamp': datetime.now().isoformat(),
                    'api': 'Python/Flask'
                }), 201

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error al guardar datos de monitoreo: {e}")
        return jsonify({
            'error': 'Error al guardar datos de monitoreo',
            'details': str(e)
        }), 500

@app.route('/monitoring-data', methods=['GET'])
def get_monitoring_data():
    """Obtener datos de monitoreo con paginación"""
    try:
        skip = int(request.args.get('skip', 0))
        limit = min(int(request.args.get('limit', 100)), 1000)  # Máximo 1000

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'error': 'Error de conexión a la base de datos'
            }), 500

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = """
                    SELECT * FROM monitoring_data
                    ORDER BY id DESC
                    OFFSET %s LIMIT %s
                """
                cursor.execute(query, (skip, limit))
                results = cursor.fetchall()
                
                # Convertir a lista de diccionarios
                data = [dict(row) for row in results]
                return jsonify(data)

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error al obtener datos de monitoreo: {e}")
        return jsonify({
            'error': 'Error al obtener datos de monitoreo',
            'details': str(e)
        }), 500

@app.route('/monitoring-data/<int:data_id>', methods=['GET'])
def get_monitoring_data_by_id(data_id):
    """Obtener un registro específico de monitoreo"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'error': 'Error de conexión a la base de datos'
            }), 500

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = 'SELECT * FROM monitoring_data WHERE id = %s'
                cursor.execute(query, (data_id,))
                result = cursor.fetchone()

                if not result:
                    return jsonify({'error': 'Registro no encontrado'}), 404

                return jsonify(dict(result))

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error al obtener registro: {e}")
        return jsonify({
            'error': 'Error al obtener registro',
            'details': str(e)
        }), 500

@app.route('/metadata', methods=['GET'])
def get_metadata():
    """Obtener todos los metadatos"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'error': 'Error de conexión a la base de datos'
            }), 500

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                query = 'SELECT * FROM metadata ORDER BY id'
                cursor.execute(query)
                results = cursor.fetchall()
                
                data = [dict(row) for row in results]
                return jsonify(data)

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error al obtener metadata: {e}")
        return jsonify({
            'error': 'Error al obtener metadata',
            'details': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Obtener estadísticas básicas"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'error': 'Error de conexión a la base de datos'
            }), 500

        try:
            with conn.cursor() as cursor:
                queries = [
                    'SELECT COUNT(*) FROM monitoring_data',
                    'SELECT COUNT(*) FROM metadata',
                    'SELECT AVG(porcentaje_cpu_uso) FROM monitoring_data',
                    'SELECT AVG(porcentaje_ram) FROM monitoring_data',
                    'SELECT MAX(porcentaje_cpu_uso) FROM monitoring_data',
                    'SELECT MAX(porcentaje_ram) FROM monitoring_data'
                ]

                results = []
                for query in queries:
                    cursor.execute(query)
                    results.append(cursor.fetchone()[0])

                stats = {
                    'total_monitoring_records': int(results[0] or 0),
                    'total_metadata_records': int(results[1] or 0),
                    'average_cpu_usage': round(float(results[2] or 0), 2),
                    'average_ram_usage': round(float(results[3] or 0), 2),
                    'max_cpu_usage': int(results[4] or 0),
                    'max_ram_usage': int(results[5] or 0),
                    'api': 'Python/Flask'
                }

                return jsonify(stats)

        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {e}")
        return jsonify({
            'error': 'Error al obtener estadísticas',
            'details': str(e)
        }), 500

@app.route('/monitoring-data', methods=['DELETE'])
def delete_all_monitoring_data():
    """Limpiar todos los datos"""
    conn = get_db_connection()
    if not conn:
        return jsonify({
            'error': 'Error de conexión a la base de datos'
        }), 500

    try:
        with conn.cursor() as cursor:
            # Contar registros antes de eliminar
            cursor.execute('SELECT COUNT(*) FROM monitoring_data')
            deleted_monitoring = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM metadata')
            deleted_metadata = cursor.fetchone()[0]

            # Eliminar datos
            cursor.execute('DELETE FROM monitoring_data')
            cursor.execute('DELETE FROM metadata')
            
            conn.commit()

            return jsonify({
                'message': 'Datos eliminados exitosamente',
                'deleted_monitoring_records': int(deleted_monitoring),
                'deleted_metadata_records': int(deleted_metadata),
                'api': 'Python/Flask'
            })

    except Exception as e:
        conn.rollback()
        logger.error(f"Error al eliminar datos: {e}")
        return jsonify({
            'error': 'Error al eliminar datos',
            'details': str(e)
        }), 500
    finally:
        conn.close()

@app.errorhandler(404)
def not_found(error):
    """Middleware para manejar rutas no encontradas"""
    return jsonify({
        'error': 'Endpoint no encontrado',
        'api': 'Python/Flask'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Middleware para manejo de errores"""
    logger.error(f'Error no manejado: {error}')
    return jsonify({
        'error': 'Error interno del servidor',
        'api': 'Python/Flask'
    }), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print(f"🚀 Servidor Flask ejecutándose en puerto {port}")
    print(f"📖 API disponible en: http://localhost:{port}")
    print(f"📊 Endpoint para datos: POST http://localhost:{port}/monitoring-data")
    
    app.run(host='0.0.0.0', port=port, debug=False)