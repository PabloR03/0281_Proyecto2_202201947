#!/bin/bash

# Directorio donde están los módulos
MODULES_DIR="../Modulos"
SCRIPTS_DIR="../Scripts"

# Nombres de los módulos
CPU_MODULE="cpu_202201947"
RAM_MODULE="ram_202201947"
PROCESOS_MODULE="procesos_202201947"

echo "=== Instalando y configurando módulos del kernel ==="

# Cambiar al directorio de los módulos
cd "$MODULES_DIR"

# Compilar los módulos
echo "Compilando los módulos..."
make clean && make

# Cargar los módulos
echo "Cargando módulos..."
sudo insmod "$CPU_MODULE.ko"
sudo insmod "$RAM_MODULE.ko"
sudo insmod "$PROCESOS_MODULE.ko"

# Mostrar contenido de los archivos proc
echo "Contenido de /proc/$CPU_MODULE:"
cat "/proc/$CPU_MODULE"

echo "Contenido de /proc/$RAM_MODULE:"
cat "/proc/$RAM_MODULE"

echo "Contenido de /proc/$PROCESOS_MODULE:"
cat "/proc/$PROCESOS_MODULE"

echo "=== Instalación completada ==="