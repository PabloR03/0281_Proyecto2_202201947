#!/bin/bash

echo "🧹 Limpiando despliegue de Kubernetes..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info_msg() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

error_msg() {
    echo -e "${RED}❌ $1${NC}"
}

important_msg() {
    echo -e "${BLUE}🔵 $1${NC}"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "🗂️  Estado actual del cluster:"
echo "================================"
kubectl get all -n so1-fase2 2>/dev/null || echo "Namespace so1-fase2 no existe o está vacío"
echo ""

# Eliminar deployments y services específicos
info_msg "Eliminando recursos específicos..."

if [ -f "k8s/python-api.yaml" ]; then
    kubectl delete -f k8s/python-api.yaml 2>/dev/null || true
    success_msg "Recursos de Python API eliminados"
else
    error_msg "Archivo k8s/python-api.yaml no encontrado"
fi

if [ -f "k8s/nodejs-api.yaml" ]; then
    kubectl delete -f k8s/nodejs-api.yaml 2>/dev/null || true
    success_msg "Recursos de Node.js API eliminados"
else
    error_msg "Archivo k8s/nodejs-api.yaml no encontrado"
fi

if [ -f "k8s/postgres.yaml" ]; then
    kubectl delete -f k8s/postgres.yaml 2>/dev/null || true
    success_msg "Recursos de PostgreSQL eliminados"
else
    error_msg "Archivo k8s/postgres.yaml no encontrado"
fi

# Forzar eliminación de pods si están en estado Terminating
info_msg "Verificando pods en estado Terminating..."
TERMINATING_PODS=$(kubectl get pods -n so1-fase2 --field-selector=status.phase=Terminating --no-headers 2>/dev/null | awk '{print $1}')
if [ ! -z "$TERMINATING_PODS" ]; then
    info_msg "Forzando eliminación de pods en estado Terminating..."
    echo "$TERMINATING_PODS" | xargs -r kubectl delete pod --force --grace-period=0 -n so1-fase2
fi

# Eliminar PersistentVolumeClaims (antes del namespace)
info_msg "Eliminando PersistentVolumeClaims..."
kubectl delete pvc --all -n so1-fase2 2>/dev/null || true

# Eliminar namespace (esto eliminará todo lo que esté dentro)
info_msg "Eliminando namespace so1-fase2..."
kubectl delete namespace so1-fase2 2>/dev/null || true

# Esperar a que el namespace se elimine completamente
info_msg "Esperando a que el namespace se elimine completamente..."
timeout 60s bash -c 'while kubectl get namespace so1-fase2 2>/dev/null; do sleep 2; done' || true

# Eliminar PersistentVolumes (están fuera del namespace)
info_msg "Eliminando PersistentVolumes..."
kubectl delete pv postgres-pv 2>/dev/null || true
kubectl get pv | grep "so1-fase2" | awk '{print $1}' | xargs -r kubectl delete pv 2>/dev/null || true

# Limpiar recursos huérfanos
info_msg "Limpiando posibles recursos huérfanos..."
kubectl delete configmaps,secrets -l app=nodejs-api --all-namespaces 2>/dev/null || true
kubectl delete configmaps,secrets -l app=python-api --all-namespaces 2>/dev/null || true
kubectl delete configmaps,secrets -l app=postgres --all-namespaces 2>/dev/null || true

# Limpiar imágenes de Minikube si está disponible
if command_exists minikube && minikube status >/dev/null 2>&1; then
    important_msg "Detectado Minikube en ejecución"
    read -p "¿Deseas eliminar las imágenes de Minikube? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info_msg "Eliminando imágenes de Minikube..."
        minikube image rm nodejs-monitoring-api:latest 2>/dev/null || true
        minikube image rm python-monitoring-api:latest 2>/dev/null || true
        success_msg "Imágenes eliminadas de Minikube"
    fi
fi

# Limpiar imágenes Docker locales
read -p "¿Deseas eliminar las imágenes Docker locales? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info_msg "Eliminando imágenes Docker locales..."
    docker rmi nodejs-monitoring-api:latest 2>/dev/null || true
    docker rmi python-monitoring-api:latest 2>/dev/null || true
    
    # Limpiar imágenes dangling
    info_msg "Limpiando imágenes Docker sin etiqueta..."
    docker image prune -f 2>/dev/null || true
    
    success_msg "Imágenes Docker eliminadas"
fi

# Limpieza adicional opcional
read -p "¿Deseas hacer una limpieza profunda de Docker? (contenedores parados, redes, volúmenes) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info_msg "Realizando limpieza profunda de Docker..."
    docker container prune -f 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    success_msg "Limpieza profunda de Docker completada"
fi

echo ""
echo "🎉 Limpieza completada exitosamente!"
echo ""
echo "🔍 Verificación final:"
echo "======================"
echo ""
echo "📋 Recursos en el namespace so1-fase2:"
kubectl get all -n so1-fase2 2>/dev/null || echo "✅ Namespace so1-fase2 no existe (limpio)"
echo ""
echo "📊 PersistentVolumes relacionados:"
kubectl get pv 2>/dev/null | grep -E "(postgres|so1-fase2)" || echo "✅ No hay PVs relacionados"
echo ""
echo "🖼️  Imágenes Docker locales:"
docker images | grep -E "(nodejs-monitoring-api|python-monitoring-api)" || echo "✅ No hay imágenes locales"

if command_exists minikube && minikube status >/dev/null 2>&1; then
    echo ""
    echo "🐳 Imágenes en Minikube:"
    minikube image ls | grep -E "(nodejs-monitoring-api|python-monitoring-api)" || echo "✅ No hay imágenes en Minikube"
fi

echo ""
echo "💡 Comandos útiles adicionales:"
echo "  - Para reiniciar Minikube: minikube delete && minikube start"
echo "  - Para limpiar todo Docker: docker system prune -a"
echo "  - Para ver todos los recursos: kubectl get all --all-namespaces"