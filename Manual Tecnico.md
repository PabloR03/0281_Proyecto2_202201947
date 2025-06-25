
# Sistemas Operativos 1 A - Vacaciones Junio 2025

## Proyecto 1

### Segundo Semestre 2024

```plaintext
Universidad San Carlos de Guatemala  
Programador: Pablo Andrés Rodríguez Lima  
Carné: 202201947  
Correo: pabloa10rodriguez@gmail.com  
```

## Descripción del Proyecto

Este proyecto consiste en el desarrollo de un entorno de pruebas y herramientas para estudiar y manipular conceptos fundamentales de Sistemas Operativos, incluyendo la interacción con el kernel, manejo de procesos, y comunicación entre módulos usando APIs desarrolladas en Node.js y Go.

Se implementaron scripts automatizados en Bash para facilitar la creación, gestión y limpieza de contenedores Docker que ejecutan aplicaciones de estrés, simulación y monitoreo del sistema. Además, se desarrollaron herramientas para graficar métricas y visualizar datos relevantes para el análisis del comportamiento del sistema operativo bajo carga.

---

## Objetivos

### Objetivo General

* Desarrollar un conjunto de herramientas y scripts para facilitar la experimentación y análisis en entornos controlados de sistemas operativos, usando Docker, APIs en Node.js y Go, y módulos del kernel.

### Objetivos Específicos

* Automatizar la creación y gestión de contenedores Docker para pruebas de estrés en el sistema.
* Implementar APIs para la interacción entre módulos y la recolección de datos del sistema.
* Visualizar datos y métricas a través de gráficos generados a partir de las APIs.
* Documentar y facilitar la comprensión de conceptos relacionados con el kernel y procesos del sistema operativo.

---

## Cómo usar el proyecto

1. **Requisitos Previos**

   * Docker instalado y corriendo en tu máquina.
   * Node.js y Go configurados para ejecutar los servicios API.
   * Acceso a la terminal Bash para ejecutar scripts de gestión.

2. **Despliegue de contenedores de estrés**
   Ejecuta el script `stress_containers.sh` para crear 10 contenedores Docker que generarán carga en CPU, I/O, memoria y disco.

3. **Limpieza de contenedores**
   Para eliminar los contenedores de estrés creados, ejecuta el script `remove_containers.sh`.

4. **Ejecución de APIs**
   Levanta los servicios API desarrollados en Node.js y Go para la recolección y exposición de métricas del sistema.

5. **Visualización de métricas**
   Accede a la interfaz gráfica proporcionada para visualizar los datos recolectados y analizar el comportamiento del sistema operativo bajo pruebas.





---

## COMANDOS PARA EJECUTAR

### 1. Preparación del Entorno

#### Crear Módulos
Compila, carga y verifica dos módulos del kernel (cpu_202201947 y ram_202201947).

Funciones principales:

Definir rutas y nombres de módulos:
Usa variables para ubicar los módulos (MODULES_DIR) y sus nombres (CPU_MODULE, RAM_MODULE).

Colores para mensajes:
Define códigos ANSI para mensajes de error y éxito.

Función check_error:
Verifica si el comando anterior falló; si es así, muestra un error y termina el script.

Cambiar al directorio de módulos:
Se mueve a MODULES_DIR o termina si falla.

Compilar módulos:
Ejecuta make clean && make; si falla, finaliza con error.

Cargar módulos al kernel:
Usa insmod para insertar ambos .ko; verifica errores.

Verificar carga de módulos:
Usa lsmod | grep para confirmar que los módulos están activos.

Verificar archivos en /proc:
Comprueba existencia y muestra contenido de /proc/cpu_202201947 y /proc/ram_202201947.

```bash
./install_modules.sh
```

#### Leer Módulos
Lee y muestra la información de los módulos de kernel cpu_202201947 y ram_202201947 cargados en /proc.

Funciones principales:

Definir nombres de módulos:
Usa variables para identificar los módulos cpu_202201947 y ram_202201947.

Colores para mensajes:
Define colores para mensajes de estado (éxito y error).

Verificar carga de módulos:
Utiliza lsmod | grep para comprobar si los módulos están activos. Si no lo están, muestra error y termina.

Leer archivos /proc:
Verifica existencia de /proc/cpu_202201947 y /proc/ram_202201947. Si existen, imprime su contenido; si no, muestra error.
```bash
./read_modules.sh
```

#### Eliminar Módulos
Elimina los módulos de kernel cpu_202201947 y ram_202201947, limpia archivos de compilación y verifica su correcta eliminación de /proc.

Funciones principales:

Define nombres de módulos y ruta de trabajo (MODULES_DIR).

Establece colores para mensajes de éxito y error.

Implementa la función check_error para validar la ejecución correcta de comandos.

Cambia al directorio de módulos especificado.

Verifica si los módulos están cargados con lsmod y los elimina con rmmod.

Muestra mensajes de confirmación de descarga exitosa o indica si el módulo no estaba cargado.

Ejecuta make clean para eliminar archivos generados por compilación.

Verifica que los archivos /proc/cpu_202201947 y /proc/ram_202201947 hayan sido eliminados.
```bash
./remove_modules.sh
```

---

### 2. Construcción y Ejecución de la Aplicación

#### Levantar o Crear Contenedores con Docker Compose
Prepara y despliega un entorno Docker para el proyecto, verificando herramientas, imágenes, conectividad y estado de los contenedores.

Funciones principales:

Define colores para mensajes de salida (print_success, print_warning, print_error).

Verifica la existencia y funcionamiento de Docker y Docker Compose.

Cambia al directorio raíz del proyecto.

Comprueba si existe docker-compose.yml.

Limpia contenedores, volúmenes e imágenes de despliegues previos.

Descarga las imágenes necesarias desde DockerHub o verifica su presencia local.

Arranca los contenedores definidos en docker-compose.yml.

Espera y valida que todos los contenedores estén ejecutándose correctamente.

Realiza pruebas de conectividad a los servicios expuestos (backend y frontend).

Protege y verifica la integridad de la imagen alpine-stress.

Muestra las URLs de acceso a los servicios desplegados.
```bash
./deploy_app.sh
```

#### Detener o Eliminar Contenedores de la App
Realiza el apagado y limpieza de un entorno Docker para el proyecto, ofreciendo un menú interactivo con diferentes niveles de limpieza, asegurando la protección de imágenes críticas.

Funciones principales:
Define colores para mensajes de salida (print_success, print_warning, print_error).

Cambia al directorio raíz del proyecto.

Verifica la existencia y funcionamiento de Docker.

Comprueba si existe docker-compose.yml.

Protege la imagen containerstack/alpine-stress:latest mediante un backup temporal.

Ofrece un menú con las siguientes opciones:

Apagado suave (detiene contenedores).

Apagado completo (detiene y elimina volúmenes).

Limpieza profunda (elimina volúmenes, imágenes y redes no usadas).

Limpieza agresiva (elimina imágenes específicas del proyecto).

Cancelar operación.

Realiza la acción seleccionada según la opción elegida por el usuario.

Valida y restaura (si es necesario) la imagen protegida alpine-stress.

Elimina el backup temporal si la protección de alpine-stress fue exitosa.

Muestra mensajes claros sobre el estado final de la operación.


```bash
./shutdown_app.sh
```

#### Detener Servicios Manualmente

```bash
docker-compose down
```

#### Detener y Eliminar Volúmenes

```bash
docker-compose down -v
```

---

### 3. Simulación de Carga (Stress Testing)

#### Crear Contenedores para Estresar RAM y CPU (dura 1 min)
Despliega 10 contenedores Docker basados en la imagen containerstack/alpine-stress, ejecutando diferentes tipos de estrés para probar los recursos del sistema.

Funciones principales:
Define colores para mensajes de salida (errores y éxitos).

Verifica que Docker esté instalado y disponible.

Comprueba que la imagen containerstack/alpine-stress esté presente localmente.

Define un conjunto de opciones para estrés: CPU, I/O, RAM (memoria), y disco.

Despliega 10 contenedores con nombres únicos que ejecutan aleatoriamente uno de los tipos de estrés definidos, cada uno con un tiempo de ejecución limitado a 60 segundos.

Muestra mensajes de éxito o error para la creación de cada contenedor.

Indica al final que el despliegue se completó satisfactoriamente.
```bash
./stress_containers.sh
```

#### Detener/Eliminar Contenedores de Prueba
Elimina todos los contenedores Docker cuyo nombre contiene el prefijo stress_, usados para pruebas de estrés.

Funciones principales:
Define colores para mensajes de salida (errores y éxitos).

Verifica que Docker esté instalado y disponible.

Busca contenedores en ejecución o detenidos que tengan nombres que comienzan con stress_.

Elimina forzosamente esos contenedores si existen.

Informa al usuario si no se encontraron contenedores para eliminar.

Maneja errores y finaliza el script si falla la eliminación.

Muestra mensajes de estado durante todo el proceso.
```bash
./remove_containers.sh
```

---

### 4. Acceso a la Base de Datos (PostgreSQL)

#### Conectarte al Contenedor PostgreSQL

```bash
 docker exec -it metrics-postgres psql -U metrics_202201947 -d metrics_db
```

#### Ejecutar Consultas:

* Listar Tablas:

```sql
\dt
```

* Ver últimos datos de CPU:

```sql
 SELECT * FROM cpu_metrics ORDER BY created_at DESC LIMIT 10;
```

* Ver últimos datos de RAM:

```sql
 SELECT * FROM ram_metrics ORDER BY created_at DESC LIMIT 10;
```
* Ver ultimos datos de los procesos 
```sql
 SELECT * FROM procesos_metrics ORDER BY created_at DESC LIMIT 10;
```

* Ver ultimos datos combinados
```sql
 SELECT * FROM metrics_combined ORDER BY created_at DESC LIMIT 10;
```



Fase 1
locust -f phase1_generator.py --host=http://localhost:8080 -u 300 -r 1 -t 180s --headless
Fase 2
locust -f phase2_sender.py --host=http://192.168.49.2 -u 150 -r 1 --headless

# Enviar datos generados al ingress
locust -f phase2_sender.py --host=http://metrics-api.local \
       -u 150 -r 1 --headless

# Detener manualmente con Ctrl+C después de observar el tráfico