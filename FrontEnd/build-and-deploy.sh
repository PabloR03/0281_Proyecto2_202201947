#!/bin/bash

echo "🚀 Iniciando construcción y despliegue en Kubernetes..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar errores
error_exit() {
    echo -e "${RED}❌ Error: $1${NC}" >&2
    exit 1
}

# Función para mostrar éxito
success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar info
info_msg() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Función para mostrar info importante
important_msg() {
    echo -e "${BLUE}🔵 $1${NC}"
}

# Verificar que kubectl esté instalado
if ! command -v kubectl &> /dev/null; then
    error_exit "kubectl no está instalado"
fi

# Verificar que docker esté instalado
if ! command -v docker &> /dev/null; then
    error_exit "docker no está instalado"
fi

# Verificar que minikube esté instalado
if ! command -v minikube &> /dev/null; then
    error_exit "minikube no está instalado"
fi

# Verificar que minikube esté ejecutándose
if ! minikube status &> /dev/null; then
    error_exit "minikube no está ejecutándose. Ejecuta 'minikube start' primero"
fi

info_msg "Construyendo imágenes Docker..."

# Construir imagen de Node.js
cd apiNodeJS
if [ ! -f "dockerfile" ]; then
    error_exit "No se encontró dockerfile en apiNodeJS"
fi

docker build -t nodejs-monitoring-api:latest . || error_exit "Error construyendo imagen Node.js"
success_msg "Imagen Node.js construida exitosamente"

# Construir imagen de Python
cd ../apiPython
if [ ! -f "Dockerfile" ]; then
    error_exit "No se encontró Dockerfile en apiPython"
fi

docker build -t python-monitoring-api:latest . || error_exit "Error construyendo imagen Python"
success_msg "Imagen Python construida exitosamente"

cd ..

# NUEVO: Cargar imágenes en Minikube
important_msg "Cargando imágenes en Minikube..."
minikube image load nodejs-monitoring-api:latest || error_exit "Error cargando imagen Node.js en Minikube"
success_msg "Imagen Node.js cargada en Minikube"

minikube image load python-monitoring-api:latest || error_exit "Error cargando imagen Python en Minikube"
success_msg "Imagen Python cargada en Minikube"

# Verificar que las imágenes estén en Minikube
info_msg "Verificando imágenes en Minikube..."
minikube image ls | grep -E "(nodejs-monitoring-api|python-monitoring-api)" || error_exit "Las imágenes no se encontraron en Minikube"
success_msg "Imágenes verificadas en Minikube"

info_msg "Aplicando configuraciones de Kubernetes..."

# Crear namespace
kubectl apply -f k8s/namespace.yaml || error_exit "Error creando namespace"
success_msg "Namespace creado"

# Crear base de datos PostgreSQL
kubectl apply -f k8s/postgres.yaml || error_exit "Error desplegando PostgreSQL"
success_msg "PostgreSQL desplegado"

# Esperar a que PostgreSQL esté listo
info_msg "Esperando a que PostgreSQL esté listo..."
kubectl wait --for=condition=ready pod -l app=postgres -n so1-fase2 --timeout=300s || error_exit "PostgreSQL no estuvo listo en 5 minutos"
success_msg "PostgreSQL está listo"

# Desplegar API Node.js
kubectl apply -f k8s/nodejs-api.yaml || error_exit "Error desplegando API Node.js"
success_msg "API Node.js desplegada"

# Desplegar API Python
kubectl apply -f k8s/python-api.yaml || error_exit "Error desplegando API Python"
success_msg "API Python desplegada"

# Esperar a que las APIs estén listas
info_msg "Esperando a que las APIs estén listas..."
kubectl wait --for=condition=ready pod -l app=nodejs-api -n so1-fase2 --timeout=300s || error_exit "API Node.js no estuvo lista en 5 minutos"
kubectl wait --for=condition=ready pod -l app=python-api -n so1-fase2 --timeout=300s || error_exit "API Python no estuvo lista en 5 minutos"

success_msg "Todas las APIs están listas"

echo ""
echo "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "📋 Información del cluster:"
echo "------------------------"
kubectl get all -n so1-fase2

echo ""
echo "🌐 URLs de acceso (usando minikube):"
MINIKUBE_IP=$(minikube ip)
echo "Node.js API: http://${MINIKUBE_IP}:30700"
echo "Python API:  http://${MINIKUBE_IP}:30800"
echo ""
echo "💡 También puedes usar port-forward:"
echo "kubectl port-forward service/nodejs-api-service 30700:30700 -n so1-fase2"
echo "kubectl port-forward service/python-api-service 30800:30800 -n so1-fase2"

echo ""
echo "📊 Para monitorear el estado:"
echo "kubectl get pods -n so1-fase2 -w"
echo ""
echo "🔍 Para ver logs:"
echo "kubectl logs -f deployment/nodejs-api-deployment -n so1-fase2"
echo "kubectl logs -f deployment/python-api-deployment -n so1-fase2"
echo "kubectl logs -f deployment/postgres-deployment -n so1-fase2"
echo ""
echo "🖼️  Para ver imágenes cargadas en Minikube:"
echo "minikube image ls"