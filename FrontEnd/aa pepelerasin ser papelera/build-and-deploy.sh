#!/usr/bin/env bash

echo -e "\n🚀 Iniciando construcción y despliegue en Kubernetes...\n"

# Configuración de colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración de variables
NAMESPACE="so1-fase2"
TIMEOUT=300
MINIKUBE_IP=$(minikube ip 2>/dev/null)
DOCKER_USER="pablo03r"  # Tu usuario de Docker Hub

# Funciones de utilidad
error_exit() { echo -e "${RED}❌ Error: $1${NC}" >&2; exit 1; }
success_msg() { echo -e "${GREEN}✅ $1${NC}"; }
info_msg() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
important_msg() { echo -e "${BLUE}🔵 $1${NC}"; }

# Verificación de dependencias
verify_dependencies() {
    local dependencies=("kubectl" "docker" "minikube")
    for cmd in "${dependencies[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error_exit "$cmd no está instalado"
        fi
    done
    
    if ! minikube status &> /dev/null; then
        error_exit "minikube no está ejecutándose. Ejecuta 'minikube start' primero"
    fi
}

# Verificar disponibilidad de imágenes en Docker Hub
verify_docker_images() {
    local images=(
        "${DOCKER_USER}/api1-nodejs-fase2:latest"
        "${DOCKER_USER}/api1-python-fase2:latest"
    )
    
    info_msg "Verificando disponibilidad de imágenes en Docker Hub..."
    for image in "${images[@]}"; do
        info_msg "Descargando imagen $image..."
        docker pull "$image" || error_exit "No se pudo descargar la imagen $image desde Docker Hub"
        success_msg "Imagen $image descargada exitosamente"
    done
}

# Despliegue en Kubernetes
deploy_kubernetes() {
    local components=(
        "k8s/namespace.yaml:Namespace"
        "k8s/postgres.yaml:PostgreSQL"
        "k8s/nodejs-api.yaml:API Node.js"
        "k8s/python-api.yaml:API Python"
    )
    
    for component in "${components[@]}"; do
        IFS=':' read -r file name <<< "$component"
        info_msg "Desplegando $name..."
        kubectl apply -f "$file" || error_exit "Error desplegando $name"
        success_msg "$name desplegado"
    done
    
    # Esperar a que PostgreSQL esté listo
    info_msg "Esperando a que PostgreSQL esté listo..."
    kubectl wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=${TIMEOUT}s || 
        error_exit "PostgreSQL no estuvo listo en $TIMEOUT segundos"
    success_msg "PostgreSQL está listo"
    
    # Esperar a que las APIs estén listas
    info_msg "Esperando a que las APIs estén listas..."
    kubectl wait --for=condition=ready pod -l app=nodejs-api -n "$NAMESPACE" --timeout=${TIMEOUT}s || 
        error_exit "API Node.js no estuvo lista en $TIMEOUT segundos"
    kubectl wait --for=condition=ready pod -l app=python-api -n "$NAMESPACE" --timeout=${TIMEOUT}s || 
        error_exit "API Python no estuvo lista en $TIMEOUT segundos"
    success_msg "Todas las APIs están listas"
}

# Configurar Ingress
setup_ingress() {
    info_msg "Habilitando Ingress Controller en Minikube..."
    minikube addons enable ingress || error_exit "Error habilitando Ingress"
    success_msg "Ingress Controller habilitado"
    
    info_msg "Esperando a que el Ingress Controller esté listo..."
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=${TIMEOUT}s || error_exit "Ingress Controller no estuvo listo en $TIMEOUT segundos"
    
    info_msg "Desplegando Ingress y Traffic Split..."
    kubectl apply -f k8s/ingress-traffic-split.yaml || error_exit "Error desplegando Ingress y Traffic Split"
    success_msg "Ingress y Traffic Split desplegados"
}

# Mostrar información del cluster
show_cluster_info() {
    echo -e "\n🎉 ¡Despliegue completado exitosamente!\n"
    echo -e "📋 Información del cluster:"
    echo -e "------------------------"
    kubectl get all -n "$NAMESPACE"
    
    echo -e "\n🌐 URLs de acceso (usando minikube):"
    echo "Node.js API: http://${MINIKUBE_IP}:30700"
    echo "Python API:  http://${MINIKUBE_IP}:30800"
    echo -e "\n🔄 Con Load Balancing (50% Python, 50% Node.js):"
    echo "http://${MINIKUBE_IP}/api"
    echo -e "\n🎯 Acceso específico por tecnología:"
    echo "Solo Python: http://${MINIKUBE_IP}/python"
    echo "Solo Node.js: http://${MINIKUBE_IP}/nodejs"
    
    echo -e "\n💡 Comandos útiles:"
    echo "Port-forward:"
    echo "kubectl port-forward service/nodejs-api-service 30700:30700 -n $NAMESPACE"
    echo "kubectl port-forward service/python-api-service 30800:30800 -n $NAMESPACE"
    echo -e "\nMonitorización:"
    echo "kubectl get pods -n $NAMESPACE -w"
    echo -e "\nVer logs:"
    echo "kubectl logs -f deployment/nodejs-api-deployment -n $NAMESPACE"
    echo "kubectl logs -f deployment/python-api-deployment -n $NAMESPACE"
    echo -e "\nImagenes disponibles en Docker Hub:"
    echo "docker pull ${DOCKER_USER}/api1-nodejs-fase2:latest"
    echo "docker pull ${DOCKER_USER}/api1-python-fase2:latest"
}

# Ejecución principal
main() {
    verify_dependencies
    verify_docker_images
    deploy_kubernetes
    setup_ingress
    show_cluster_info
}

main "$@"
