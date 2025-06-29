# Dockerfile simple para Monitoring Dashboard React

FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar todo el código fuente
COPY . .

# Exponer puerto 3000 (puerto por defecto de React)
EXPOSE 3000

# Comando para ejecutar la aplicación en modo desarrollo
CMD ["npm", "start"]