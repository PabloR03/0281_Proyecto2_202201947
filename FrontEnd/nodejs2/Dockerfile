# Usar imagen oficial de Node.js (versión LTS)
FROM node:18-alpine

# Establecer directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción solamente
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copiar el código fuente
COPY --chown=nextjs:nodejs . .

# Cambiar al usuario no-root
USER nextjs

# Exponer el puerto (usando variable de entorno o puerto por defecto)
EXPOSE 9000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=9000
ENV DB_HOST=34.56.148.15
ENV DB_NAME=monitoring-metrics
ENV DB_USER=postgres
ENV DB_PASSWORD=12345678
ENV DB_PORT=5432

# Comando de salud para Docker
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:$PORT/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para ejecutar la aplicación
CMD ["npm", "start"]