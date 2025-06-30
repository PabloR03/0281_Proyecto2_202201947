
# Sistemas Operativos 1 A - Vacaciones Junio 2025

## Proyecto 2

### Segundo Semestre 2024

```plaintext
Universidad San Carlos de Guatemala  
Programador: Pablo Andrés Rodríguez Lima  
Carné: 202201947  
Correo: pabloa10rodriguez@gmail.com  
```


## Descripción General

El sistema está compuesto por cinco APIs complementarias que forman una arquitectura distribuida de monitoreo de sistema:

1. **API de Recolección (Go)**: Implementada en Go, obtiene métricas del sistema operativo en tiempo real a través de archivos `/proc` personalizados y las expone mediante endpoints REST.

2. **API de Persistencia (Node.js)**: Desarrollada en Node.js/Express, recibe datos de monitoreo vía HTTP, los procesa y almacena en una base de datos PostgreSQL alojada en Google Cloud Platform.

3. **API de Persistencia (Python)**: Implementada en Python/Flask, proporciona una alternativa de persistencia con funcionalidades idénticas a la API Node.js, utilizando la misma base de datos PostgreSQL en GCP.

4. **API de Consulta (Node.js)**: Desarrollada en Node.js/Express, lee la base de datos PostgreSQL y proporciona acceso a la última lectura de métricas almacenadas, funcionando como interfaz de consulta de datos históricos.

5. **API de Frontend (React)**: Aplicación web desarrollada en React que consume datos de las APIs del sistema mediante WebSockets y HTTP, proporcionando una interfaz gráfica interactiva para visualización en tiempo real de métricas del sistema con dashboards, gráficas y monitoreo continuo.

## Arquitectura del Sistema

### Componentes Principales

El sistema implementa una arquitectura distribuida con los siguientes componentes:

#### API de Recolección (Go) - Puerto 8080
**Monitoreadores Concurrentes**: Tres gorrutinas independientes que ejecutan de forma paralela el monitoreo continuo de CPU, RAM y procesos del sistema, actualizando los datos cada 5 segundos.

**Servidor HTTP**: Un servidor web que expone múltiples endpoints REST para el acceso a las métricas del sistema, operando en el puerto 8080.

**Sincronización de Datos**: Implementación de mutex para garantizar el acceso seguro a los datos compartidos entre las gorrutinas de monitoreo y las peticiones HTTP.

#### API de Persistencia (Node.js) - Puerto 7000
**Servidor Express**: Aplicación Node.js que opera en el puerto 7000, configurada con middleware de seguridad (Helmet), CORS y manejo de JSON con límite de 50MB.

**Conexión a Base de Datos**: Pool de conexiones PostgreSQL configurado para conectarse a una instancia de Cloud SQL en GCP (IP: 34.56.148.15).

**Procesamiento de Datos**: Sistema de validación y parsing de datos JSON recibidos, con manejo especializado de formatos de fecha y hora.

**Persistencia Transaccional**: Implementación de transacciones para operaciones críticas de base de datos.

#### API de Persistencia (Python) - Puerto 8000
**Servidor Flask**: Aplicación Python/Flask que opera en el puerto 8000, configurada con CORS habilitado para permitir peticiones desde diferentes orígenes.

**Conexión a Base de Datos**: Implementación de conexiones PostgreSQL usando psycopg2 con cursor de diccionarios para facilitar el manejo de datos estructurados.

**Procesamiento de Datos**: Sistema robusto de parsing de fechas con múltiples formatos soportados, incluyendo manejo de microsegundos y formatos ISO.

**Logging Configurado**: Sistema de logging integrado para monitoreo de operaciones y debugging de errores.

**Manejo de Errores**: Middleware personalizado para captura y manejo de errores 404 y 500 con respuestas estructuradas.

#### API de Consulta (Node.js) - Puerto 9000
**Servidor Express**: Aplicación Node.js que opera en el puerto 9000, configurada con middleware CORS para permitir acceso desde diferentes orígenes.

**Conexión de Solo Lectura**: Pool de conexiones PostgreSQL optimizado para consultas de lectura, conectándose a la misma instancia de Cloud SQL en GCP (IP: 34.56.148.15).

**Procesamiento de Consultas**: Sistema especializado en la recuperación de la última lectura de métricas almacenadas en la base de datos.

**Respuesta Estructurada**: Formateo de datos de salida para proporcionar acceso directo a las métricas más recientes del sistema.

#### API de Frontend (React) - Puerto 3000
**Aplicación React**: Interfaz web desarrollada con React que proporciona visualización interactiva en tiempo real de las métricas del sistema.

**Conexión WebSocket**: Implementación de Socket.IO cliente para comunicación bidireccional en tiempo real con el servidor de consulta, habilitando actualizaciones automáticas de datos.

**Dashboard Interactivo**: Sistema de visualización con múltiples componentes que incluyen tarjetas de métricas, gráficas de líneas temporales, gráficas circulares para distribución de recursos y gráficas de barras para estados de procesos.

**Gestión de Estado**: Implementación con React hooks (useState, useEffect) para manejo del estado de la aplicación, datos históricos, estado de conexión y actualizaciones en tiempo real.

**Visualización de Datos**: Integración con Recharts para renderizado de gráficas interactivas incluyendo LineChart, AreaChart, BarChart y PieChart con tooltips personalizados y leyendas.

**Indicadores de Estado**: Sistema de monitoreo de conexión con indicadores visuales de estado, gestión de errores de conexión y timestamps de última actualización.

**Sistema de Configuración**: Manejo de variables de entorno para configuración de URLs de Socket.IO, APIs, intervalos de actualización y límites de datos históricos.

**Interfaz Responsiva**: Diseño adaptativo con CSS-in-JS, sistema de grid responsivo, tema oscuro y animaciones para una experiencia de usuario moderna.

**Manejo de Datos Históricos**: Procesamiento y visualización de series temporales con límite configurable de puntos históricos y formateo automático de timestamps.

**Debugging y Monitoreo**: Sistema integrado de logging en consola, información de debug visible en la interfaz y manejo robusto de estados de carga y error.

## Estructura de Datos

### API de Recolección (Go)

#### Estructuras de Entrada

CPUData: Contiene el porcentaje de uso del procesador
RAMData: Incluye memoria total, libre, en uso y porcentaje de utilización
ProcesosData: Información sobre estados de procesos del sistema

#### Estructura de Respuesta Combinada
La estructura `CombinedMetrics` proporciona una vista unificada de todas las métricas del sistema, incluyendo cálculos derivados como el porcentaje de CPU libre y marca temporal de la consulta.

### API de Persistencia (Node.js y Python)

#### Base de Datos PostgreSQL
**Esquema**: fase2
**Tablas Principales**:
- `monitoring_data`: Almacena las métricas de sistema recolectadas
- `metadata`: Registra información sobre las sesiones de recolección

#### Campos de Monitoreo

total_ram, ram_libre, uso_ram, porcentaje_ram
porcentaje_cpu_uso, porcentaje_cpu_libre
procesos_corriendo, total_procesos, procesos_durmiendo
procesos_zombie, procesos_parados
hora, timestamp_received, api


### API de Consulta (Node.js)

#### Estructura de Consulta
La API de consulta accede a la tabla `monitoring_data` del esquema `fase2` para recuperar el registro más reciente basado en el campo `id` ordenado de forma descendente.

#### Formato de Respuesta
Retorna la última lectura completa de métricas incluyendo todos los campos de monitoreo con sus valores más actualizados disponibles en la base de datos.

### API de Frontend (React)

#### Estado de la Aplicación
**currentData**: Almacena la última lectura de métricas recibida del sistema de monitoreo en tiempo real.

**historicalData**: Array que mantiene un historial limitado de métricas para visualización de tendencias temporales.

**isConnected**: Estado booleano que indica la conectividad con el servidor WebSocket.

**lastUpdate**: Timestamp de la última actualización de datos recibida.

**connectionError**: Información sobre errores de conexión para debugging y notificación al usuario.

#### Estructura de Configuración

socketUrl: URL del servidor Socket.IO para conexión WebSocket
apiUrl: URL base de la API para peticiones HTTP
refreshInterval: Intervalo de actualización en milisegundos
maxHistoricalPoints: Límite máximo de puntos históricos a mantener


#### Componentes de Visualización
**MetricCard**: Componente para mostrar métricas individuales con valor, título, subtítulo e indicador de estado visual.

**ConnectionStatus**: Componente de estado de conexión con indicadores visuales y información de última actualización.

**CustomTooltip**: Tooltip personalizado para gráficas con formateo específico de valores y unidades.

**PieChartCustomLabel**: Etiquetas personalizadas para gráficas circulares con formateo de porcentajes.

## Endpoints de la API

### API de Recolección (Go) - Puerto 8080

#### `/cpu`
- **Método**: GET
- **Descripción**: Retorna las métricas de uso del procesador en formato JSON
- **Respuesta**: Datos en tiempo real del porcentaje de utilización de CPU

#### `/ram`
- **Método**: GET
- **Descripción**: Proporciona información detallada sobre el uso de memoria del sistema
- **Respuesta**: Datos de memoria total, libre, en uso y porcentaje de utilización

#### `/procesos`
- **Método**: GET
- **Descripción**: Información sobre el estado de los procesos del sistema
- **Respuesta**: Conteo de procesos en diferentes estados (corriendo, durmiendo, zombie, parados)

#### `/metrics`
- **Método**: GET
- **Descripción**: Endpoint principal que consolida todas las métricas del sistema
- **Respuesta**: Estructura JSON unificada con todas las métricas disponibles y timestamp

#### `/health`
- **Método**: GET
- **Descripción**: Endpoint de verificación de estado del servicio
- **Respuesta**: Respuesta simple "OK" para validar disponibilidad

### API de Persistencia (Node.js) - Puerto 7000

#### `/` (Raíz)
- **Método**: GET
- **Descripción**: Información general de la API
- **Respuesta**: Metadatos de la API incluyendo versión, tipo y configuración de base de datos

#### `/monitoring-data`
- **Método**: POST
- **Descripción**: Recibe y almacena datos de monitoreo en tiempo real
- **Cuerpo**: JSON con métricas del sistema
- **Respuesta**: Confirmación de inserción con ID generado

#### `/monitoring-data`
- **Método**: GET
- **Descripción**: Obtiene datos de monitoreo con paginación
- **Parámetros**: `skip` (offset), `limit` (máximo 1000)
- **Respuesta**: Array de registros de monitoreo ordenados por ID descendente

#### `/monitoring-data/:id`
- **Método**: GET
- **Descripción**: Obtiene un registro específico de monitoreo
- **Parámetros**: `id` (identificador numérico)
- **Respuesta**: Objeto con datos del registro solicitado

#### `/metadata`
- **Método**: POST
- **Descripción**: Crea registros de metadata sobre sesiones de recolección
- **Cuerpo**: JSON con información de la sesión
- **Respuesta**: Confirmación de inserción

#### `/metadata`
- **Método**: GET
- **Descripción**: Obtiene todos los registros de metadata
- **Respuesta**: Array completo de metadata ordenado por ID

#### `/stats`
- **Método**: GET
- **Descripción**: Proporciona estadísticas agregadas del sistema
- **Respuesta**: Métricas calculadas incluyendo promedios, máximos y conteos

#### `/monitoring-data`
- **Método**: DELETE
- **Descripción**: Elimina todos los datos de monitoreo y metadata
- **Respuesta**: Confirmación con conteo de registros eliminados

#### `/test-connection`
- **Método**: GET
- **Descripción**: Verifica conectividad con la base de datos PostgreSQL
- **Respuesta**: Estado de conexión, versión de base de datos y tablas disponibles

### API de Persistencia (Python) - Puerto 8000

#### `/` (Raíz)
- **Método**: GET
- **Descripción**: Información general de la API Python
- **Respuesta**: Metadatos de la API incluyendo versión, tipo Python/Flask y configuración de base de datos

#### `/monitoring-data`
- **Método**: POST
- **Descripción**: Recibe y almacena datos de monitoreo en tiempo real con validación robusta
- **Cuerpo**: JSON con métricas del sistema
- **Respuesta**: Confirmación de inserción con ID generado, timestamp y identificador de API Python

#### `/monitoring-data`
- **Método**: GET
- **Descripción**: Obtiene datos de monitoreo con paginación usando RealDictCursor
- **Parámetros**: `skip` (offset), `limit` (máximo 1000)
- **Respuesta**: Array de registros de monitoreo convertidos a diccionarios ordenados por ID descendente

#### `/monitoring-data/<int:data_id>`
- **Método**: GET
- **Descripción**: Obtiene un registro específico de monitoreo por ID
- **Parámetros**: `data_id` (identificador numérico como parámetro de ruta)
- **Respuesta**: Objeto con datos del registro solicitado o error 404 si no existe

#### `/metadata`
- **Método**: POST
- **Descripción**: Crea registros de metadata sobre sesiones de recolección con parsing avanzado de fechas
- **Cuerpo**: JSON con información de la sesión
- **Respuesta**: Confirmación de inserción con ID generado y identificador de API Python

#### `/metadata`
- **Método**: GET
- **Descripción**: Obtiene todos los registros de metadata
- **Respuesta**: Array completo de metadata convertido a diccionarios ordenado por ID

#### `/stats`
- **Método**: GET
- **Descripción**: Proporciona estadísticas agregadas del sistema con métricas específicas de Python API
- **Respuesta**: Métricas calculadas incluyendo promedios, máximos, conteos y registros específicos de la API Python

#### `/monitoring-data`
- **Método**: DELETE
- **Descripción**: Elimina todos los datos de monitoreo y metadata con conteo previo
- **Respuesta**: Confirmación con conteo exacto de registros eliminados de ambas tablas

#### `/test-connection`
- **Método**: GET
- **Descripción**: Verifica conectividad con la base de datos PostgreSQL incluyendo información de esquema
- **Respuesta**: Estado de conexión, versión de base de datos, esquema actual y listado de tablas en fase2

### API de Consulta (Node.js) - Puerto 9000

#### `/` (Raíz)
- **Método**: GET
- **Descripción**: Información general de la API de consulta
- **Respuesta**: Metadatos de la API incluyendo versión, tipo y configuración de base de datos

#### `/latest`
- **Método**: GET
- **Descripción**: Obtiene la última lectura de métricas disponible en la base de datos
- **Respuesta**: Registro más reciente de monitoreo con todas las métricas del sistema

#### `/test-connection`
- **Método**: GET
- **Descripción**: Verifica conectividad con la base de datos PostgreSQL
- **Respuesta**: Estado de conexión y confirmación de acceso a datos

### API de Frontend (React) - Puerto 3000

#### Rutas de la Aplicación Web

#### `/` (Dashboard Principal)
- **Método**: Interfaz Web
- **Descripción**: Dashboard principal que muestra todas las métricas del sistema en tiempo real
- **Funcionalidad**: Visualización completa con tarjetas de métricas, gráficas temporales, distribución de recursos y estados de procesos

#### Eventos WebSocket Manejados

#### `connect`
- **Descripción**: Evento de conexión exitosa con el servidor Socket.IO
- **Funcionalidad**: Actualiza estado de conexión y reinicia indicadores de error

#### `disconnect`
- **Descripción**: Evento de desconexión del servidor
- **Funcionalidad**: Actualiza estado de conexión y maneja reconexión automática

#### `monitoring-data`
- **Descripción**: Recibe datos de monitoreo en tiempo real
- **Datos**: Objeto JSON con métricas actuales del sistema
- **Funcionalidad**: Actualiza estado actual y timestamp de última actualización

#### `historical-data`
- **Descripción**: Recibe array de datos históricos para gráficas temporales
- **Datos**: Array de objetos con histórico de métricas
- **Funcionalidad**: Procesa datos históricos con límite configurable y formateo de timestamps

#### `connect_error`
- **Descripción**: Maneja errores de conexión WebSocket
- **Funcionalidad**: Almacena información de error para debugging y notificación al usuario

#### `reconnect`
- **Descripción**: Evento de reconexión exitosa
- **Funcionalidad**: Logging de intentos de reconexión y restauración de estado

## Configuración del Entorno

### Infraestructura de Recolección (Go)
- **Plataforma**: Google Cloud Platform (GCP)
- **Dirección IP**: 35.188.88.211
- **Acceso**: Terminal SSH mediante Termius
- **Puerto de Servicio**: 8080

#### Archivos del Sistema
La aplicación depende de archivos específicos del sistema:
- `/proc/cpu_202201947`: Métricas de CPU
- `/proc/ram_202201947`: Información de memoria
- `/proc/procesos_202201947`: Estado de procesos

### Infraestructura de Persistencia (Node.js)
- **Plataforma**: Google Cloud Platform (GCP)
- **Puerto de Servicio**: 7000
- **Base de Datos**: PostgreSQL en Cloud SQL
- **IP Base de Datos**: 34.56.148.15
- **Esquema**: fase2

#### Configuración de Base de Datos

Host: 34.56.148.15
Database: monitoring-metrics
User: postgres
Password: 12345678
Port: 5432
Schema: fase2


#### Variables de Entorno

DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, PORT


### Infraestructura de Persistencia (Python)
- **Plataforma**: Compatible con múltiples entornos
- **Puerto de Servicio**: 8000
- **Framework**: Flask con psycopg2 para PostgreSQL
- **Base de Datos**: PostgreSQL en Cloud SQL (misma instancia que Node.js)
- **IP Base de Datos**: 34.56.148.15
- **Esquema**: fase2

#### Configuración de Base de Datos Python

Host: 34.56.148.15
Database: monitoring-metrics
User: postgres
Password: 12345678
Port: 5432
Schema: fase2 (establecido automáticamente)


#### Variables de Entorno Python

DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, PORT


#### Dependencias Python

Flask: Framework web principal
Flask-CORS: Manejo de CORS
psycopg2: Conector PostgreSQL
logging: Sistema de logs integrado


### Infraestructura de Consulta (Node.js)
- **Plataforma**: Compatible con múltiples entornos
- **Puerto de Servicio**: 9000
- **Framework**: Express con pg para PostgreSQL
- **Base de Datos**: PostgreSQL en Cloud SQL (misma instancia compartida)
- **IP Base de Datos**: 34.56.148.15
- **Esquema**: fase2

#### Configuración de Base de Datos Consulta

Host: 34.56.148.15
Database: monitoring-metrics
User: postgres
Password: 12345678
Port: 5432
Schema: fase2


#### Variables de Entorno Consulta

DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, PORT


#### Dependencias Node.js Consulta

Express: Framework web principal
CORS: Manejo de CORS
pg: Conector PostgreSQL


### Infraestructura de Frontend (React)
- **Plataforma**: Compatible con múltiples entornos
- **Puerto de Servicio**: 3000 (desarrollo) / configurable para producción
- **Framework**: React con create-react-app
- **Conexión**: WebSocket mediante Socket.IO y HTTP para APIs REST

#### Configuración de Frontend

Servidor de desarrollo: localhost:3000
Build de producción: Archivos estáticos desplegables
Conexión WebSocket: Configurable via variables de entorno
APIs de datos: Configurable via variables de entorno


#### Variables de Entorno Frontend

REACT_APP_SOCKET_URL: URL del servidor Socket.IO
REACT_APP_API_URL: URL base de las APIs
REACT_APP_REFRESH_INTERVAL: Intervalo de actualización en ms
REACT_APP_MAX_HISTORICAL_POINTS: Límite de puntos históricos


#### Dependencias Frontend

React: Framework de interfaz principal
Socket.IO-client: Cliente WebSocket para tiempo real
Recharts: Librería de gráficas y visualización
React Hooks: useState, useEffect para gestión de estado
CSS-in-JS: Estilos integrados con soporte para temas


#### Configuración de Despliegue

Build: npm run build genera archivos estáticos
Servidor: Cualquier servidor web (nginx, Apache, Express estático)
Variables: Configurables en tiempo de build o runtime
CORS: Configurado en las APIs de backend para permitir acceso


### Proceso de Recolección y Almacenamiento

1. **Recolección**: La API Go monitorea continuamente las métricas del sistema cada 5 segundos desde archivos `/proc` personalizados.

2. **Exposición**: Los datos se exponen a través de endpoints REST, particularmente el endpoint `/metrics` que consolida todas las métricas.

3. **Transmisión**: Un cliente HTTP realiza peticiones a la API Go para obtener las métricas actuales.

4. **Recepción**: Las APIs de persistencia (Node.js o Python) reciben los datos JSON a través del endpoint `POST /monitoring-data`.

5. **Procesamiento**: Los datos son validados, las fechas son parseadas y normalizadas usando diferentes estrategias según la API.

6. **Persistencia**: Los datos se insertan en la base de datos PostgreSQL en el esquema `fase2.monitoring_data` con identificación de la API origen.

7. **Confirmación**: Se retorna una confirmación con el ID del registro insertado y metadatos de la API utilizada.

8. **Consulta**: La API de consulta Node.js lee la base de datos para proporcionar acceso a la última lectura de métricas almacenadas.

9. **Distribución WebSocket**: La API de consulta distribuye datos en tiempo real mediante WebSocket a clientes conectados.

10. **Visualización**: La API Frontend React recibe datos via WebSocket, los procesa y los presenta en una interfaz gráfica interactiva con dashboards, métricas en tiempo real y gráficas históricas.

### Integración de Sistemas

El sistema está diseñado para funcionar como una arquitectura distribuida donde:
- La API Go se especializa en la recolección eficiente de métricas del sistema
- Las APIs Node.js y Python se enfocan en la persistencia, consulta y gestión de datos históricos con enfoques tecnológicos diferentes
- La API de consulta Node.js proporciona acceso directo a la última lectura de métricas almacenadas y distribuye datos via WebSocket
- La API Frontend React consume datos del sistema mediante WebSocket y HTTP, proporcionando visualización interactiva y monitoreo en tiempo real
- Todas las APIs de persistencia y consulta comparten la misma base de datos PostgreSQL pero se identifican mediante el campo `api` para diferenciación
- La base de datos PostgreSQL proporciona almacenamiento confiable y capacidades de análisis unificadas
- Las múltiples implementaciones permiten flexibilidad tecnológica y redundancia operacional
- El frontend React ofrece una experiencia de usuario moderna con actualizaciones en tiempo real, gráficas interactivas y monitoreo visual del estado del sistema


# Despliegue en la nube GCP (kubernetes manifiesto)
### Componentes Principales

**Configuración de Base de Datos:**
- ConfigMap y Secret para centralizar las credenciales de conexión a PostgreSQL
- Base de datos externa ubicada en la IP 34.56.148.15

**Servicios Desplegados:**
- **API Python:** Contenedor `pablo03r/api1-python-fase2` ejecutándose en puerto 8000
- **API Node.js (api1):** Contenedor `pablo03r/api1-nodejs-fase2` ejecutándose en puerto 7000  
- **API Node.js 2 (api2):** Contenedor `pablo03r/api2-nodejs-fase2` ejecutándose en puerto 9000

### Características de Configuración

**Alta Disponibilidad:**
- Cada servicio cuenta con 2 réplicas para garantizar disponibilidad
- Health checks configurados con liveness y readiness probes
- Límites de recursos definidos (256Mi-512Mi RAM, 250m-500m CPU)

**Exposición de Servicios:**
- Services tipo ClusterIP para comunicación interna
- LoadBalancers individuales para acceso externo directo
- Configuración de Ingress con distribución de tráfico canary

### Distribución de Tráfico

El sistema implementa una estrategia de distribución donde:
- La API Python recibe el 50% del tráfico a través del Ingress principal
- La API Node.js (api1) recibe el 50% restante mediante configuración canary
- Ambos servicios responden al endpoint `/monitoring-data`




