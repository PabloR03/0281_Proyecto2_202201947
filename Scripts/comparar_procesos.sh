#!/bin/bash

echo "=== COMPARACIÓN DE INFORMACIÓN DE PROCESOS ==="
echo

echo "1. TU MÓDULO (/proc/procesos_202201947):"
if [ -f /proc/procesos_202201947 ]; then
    cat /proc/procesos_202201947
else
    echo "   ❌ El módulo no está cargado"
fi
echo

echo "2. COMANDOS DEL SISTEMA:"
echo "   Total de procesos (ps -e):"
total_ps=$(ps -e --no-headers | wc -l)
echo "      Total: $total_ps"

echo
echo "   Procesos por estado (ps aux):"
running=$(ps aux --no-headers | awk '$8 ~ /^R/ {count++} END {print count+0}')
sleeping=$(ps aux --no-headers | awk '$8 ~ /^S/ {count++} END {print count+0}')
zombie=$(ps aux --no-headers | awk '$8 ~ /^Z/ {count++} END {print count+0}')
stopped=$(ps aux --no-headers | awk '$8 ~ /^T/ {count++} END {print count+0}')

echo "      Corriendo (R): $running"
echo "      Durmiendo (S): $sleeping"
echo "      Zombie (Z): $zombie"
echo "      Parados (T): $stopped"

echo
echo "3. INFORMACIÓN DEL KERNEL (/proc/stat):"
grep "processes\|procs_running\|procs_blocked" /proc/stat

echo
echo "4. INFORMACIÓN ADICIONAL:"
echo "   Procesos activos actuales:"
ps aux --no-headers | awk '$8 ~ /^R/ {print "   PID:", $2, "CMD:", $11}' | head -5

echo
echo "=== NOTAS ==="
echo "• Los números pueden variar ligeramente debido a que los procesos cambian constantemente"
echo "• Tu módulo lee directamente del kernel, ps lee de /proc"
echo "• Ambos deberían mostrar valores similares en el momento de la lectura"