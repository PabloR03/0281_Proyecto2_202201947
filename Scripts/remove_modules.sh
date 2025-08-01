#!/bin/bash

# Directorio donde están los módulos
MODULES_DIR="../Modulos"

# Nombres de los módulos
CPU_MODULE="cpu_202201947"
RAM_MODULE="ram_202201947"
PROCESOS_MODULE="procesos_202201947"

echo "=== Eliminando módulos y limpiando servicios ==="

# Cambiar al directorio de los módulos
cd "$MODULES_DIR"

# Descargar los módulos
echo "Descargando módulos..."
sudo rmmod "$CPU_MODULE" 2>/dev/null || true
sudo rmmod "$RAM_MODULE" 2>/dev/null || true
sudo rmmod "$PROCESOS_MODULE" 2>/dev/null || true

# Limpiar archivos generados
echo "Limpiando archivos generados..."
make clean

echo "=== Limpieza completada ==="