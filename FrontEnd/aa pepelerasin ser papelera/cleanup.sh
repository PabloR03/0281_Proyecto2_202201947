#!/bin/bash

echo "🧹 Limpiando despliegue de Kubernetes..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuración de variables
DOCKER_USER="pablo03r"

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

ingress_msg() {
    echo -e "${PURPLE}🌐 $1${NC}"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "🗂️  Estado actual del cluster:"
echo "================================"
kubectl get all -n so1-fase2 2>/dev/null || echo "Namespace so1-fase2 no existe o está vacío"
echo ""

# Mostrar estado de Ingress antes de limpiar
ingress_msg "Estado actual de Ingress:"
echo "=========================="
kubectl get ingress -n so1-fase2 2>/dev/null || echo "No hay recursos de Ingress en so1-fase2"
echo ""

# ========================================
# LIMPIEZA DE INGRESS
# ========================================
ingress_msg "Limpiando recursos de Ingress..."

# Lista de todos los posibles ingress que hemos creado
INGRESS_RESOURCES=(
    "python-api-ingress"
    "nodejs-api-ingress-canary"
    "nodejs-api-direct-ingress"
    "metricas-python-ingress"
    "metricas-nodejs-ingress-canary"
    "monitoring-api-ingress"
    "nodejs-api-ingress"
)

for ingress in "${INGRESS_RESOURCES[@]}"; do
    if kubectl get ingress "$ingress" -n so1-fase2 >/dev/null 2>&1; then
        kubectl delete ingress "$ingress" -n so1-fase2 2>/dev/null || true
        success_msg "Ingress $ingress eliminado"
    else
        info_msg "Ingress $ingress no existe (OK)"
    fi
done

# Eliminar cualquier ingress restante en el namespace
info_msg "Eliminando cualquier Ingress restante en so1-fase2..."
kubectl delete ingress --all -n so1-fase2 2>/dev/null || true

# ========================================
# LIMPIEZA DE LOAD BALANCER PERSONALIZADO
# ========================================
ingress_msg "Limpiando Load Balancer personalizado..."

# Eliminar deployment y service del load balancer NGINX personalizado
kubectl delete deployment load-balancer -n so1-fase2 2>/dev/null && success_msg "Load Balancer deployment eliminado" || info_msg "Load Balancer deployment no existe"
kubectl delete service load-balancer-service -n so1-fase2 2>/dev/null && success_msg "Load Balancer service eliminado" || info_msg "Load Balancer service no existe"
kubectl delete configmap nginx-lb-config -n so1-fase2 2>/dev/null && success_msg "Load Balancer ConfigMap eliminado" || info_msg "Load Balancer ConfigMap no existe"
kubectl delete configmap debug-scripts -n so1-fase2 2>/dev/null && success_msg "Debug scripts ConfigMap eliminado" || info_msg "Debug scripts ConfigMap no existe"

# Eliminar NetworkPolicies si existen
kubectl delete networkpolicy allow-load-balancer-to-apis -n so1-fase2 2>/dev/null && success_msg "NetworkPolicy eliminada" || info_msg "NetworkPolicy no existe"

# ========================================
# LIMPIEZA ORIGINAL
# ========================================
# Eliminar deployments y services específicos
info_msg "Eliminando recursos específicos de APIs..."

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

# Eliminar archivos de configuración si existen
if [ -f "canary-traffic-split.yaml" ]; then
    kubectl delete -f canary-traffic-split.yaml 2>/dev/null || true
    success_msg "Configuración Canary eliminada"
fi

if [ -f "loadbalancer-fix.yaml" ]; then
    kubectl delete -f loadbalancer-fix.yaml 2>/dev/null || true
    success_msg "Configuración Load Balancer eliminada"
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
kubectl delete configmaps,secrets -l app=load-balancer --all-namespaces 2>/dev/null || true

# ========================================
# VERIFICAR INGRESS CONTROLLER
# ========================================
ingress_msg "Verificando estado del NGINX Ingress Controller..."
if kubectl get pods -n ingress-nginx >/dev/null 2>&1; then
    echo "📊 Pods del Ingress Controller:"
    kubectl get pods -n ingress-nginx -o wide | grep -E "(NAME|nginx-controller)" || echo "No hay pods del controller corriendo"
    echo ""
    
    # Mostrar logs recientes del ingress controller para debug
    info_msg "Últimas 5 líneas de logs del Ingress Controller:"
    kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=5 2>/dev/null || echo "No se pudieron obtener logs"
    echo ""
else
    important_msg "NGINX Ingress Controller no está instalado o no está en ingress-nginx namespace"
fi

# Limpiar imágenes de Minikube si está disponible (IMÁGENES ACTUALIZADAS)
if command_exists minikube && minikube status >/dev/null 2>&1; then
    important_msg "Detectado Minikube en ejecución"
    read -p "¿Deseas eliminar las imágenes de Minikube? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        info_msg "Eliminando imágenes de Minikube..."
        # Imágenes antiguas (por compatibilidad)
        minikube image rm nodejs-monitoring-api:latest 2>/dev/null || true
        minikube image rm python-monitoring-api:latest 2>/dev/null || true
        # Nuevas imágenes de Docker Hub
        minikube image rm ${DOCKER_USER}/api1-nodejs-fase2:latest 2>/dev/null || true
        minikube image rm ${DOCKER_USER}/api1-python-fase2:latest 2>/dev/null || true
        success_msg "Imágenes eliminadas de Minikube"
    fi
fi

# Limpiar imágenes Docker locales (IMÁGENES ACTUALIZADAS)
read -p "¿Deseas eliminar las imágenes Docker locales? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    info_msg "Eliminando imágenes Docker locales..."
    # Imágenes antiguas
    docker rmi nodejs-monitoring-api:latest 2>/dev/null || true
    docker rmi python-monitoring-api:latest 2>/dev/null || true
    # Nuevas imágenes de Docker Hub
    docker rmi ${DOCKER_USER}/api1-nodejs-fase2:latest 2>/dev/null || true
    docker rmi ${DOCKER_USER}/api1-python-fase2:latest 2>/dev/null || true
    
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
echo
