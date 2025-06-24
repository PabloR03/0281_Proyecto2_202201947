module.exports = {
    // Configuración del servidor
    port: process.env.PORT || 3000,
    
    // Configuración de MySQL
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || 'metrics_user',
        password: process.env.MYSQL_PASSWORD || 'metrics_password',
        database: process.env.MYSQL_DATABASE || 'metrics_db',
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
    },
    
    // Ruta del archivo JSON
    jsonFilePath: '/home/pablor03/Documentos/LabSopes1/Proyecto_Fase2/Locust/locust_output_202201947.json',
    
    // Configuración de importación por lotes
    batchSize: 1000, // Procesar en lotes de 1000 registros
    
    // Configuración de logging
    enableConsoleLog: true
};