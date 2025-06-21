const express = require('express');
const axios = require('axios');
const cors = require('cors');
const config = require('./config');
const db = require('./database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

let metricsData = {
    cpu: [],
    ram: [],
    metrics: [],
    procesos: [],
    lastUpdate: null
};

// Función para obtener datos del backend Go
async function fetchBackendData(endpoint) {
    try {
        const response = await axios.get(`${config.backendUrl}${endpoint}`, {
        timeout: 5000
        });
        return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error.message);
        return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
        };
    }
}

// Función para procesar y almacenar datos de CPU
async function updateCPUData() {
    const result = await fetchBackendData(config.endpoints.cpu);
    
    if (result.success) {
        try {
        const cpuData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        const processedData = {
            timestamp: result.timestamp,
            porcentajeUso: cpuData.porcentajeUso || 0,
            //raw: cpuData
        };
        
        // Guardar en memoria (funcionalidad original)
        metricsData.cpu.push(processedData);
        
        // Mantener solo los últimos 100 registros en memoria
        if (metricsData.cpu.length > 100) {
            metricsData.cpu.shift();
        }
        
        // Guardar en base de datos (nueva funcionalidad)
        try {
            await db.insertCPUData(processedData);
        } catch (dbError) {
            console.error('Error guardando CPU en BD (continuando normalmente):', dbError.message);
        }
        
        console.log(`CPU actualizada: ${processedData.porcentajeUso}%`);
        } catch (parseError) {
        console.error('Error parsing CPU data:', parseError);
        }
    }
}

// Función para procesar y almacenar datos de RAM
async function updateRAMData() {
    const result = await fetchBackendData(config.endpoints.ram);
    
    if (result.success) {
        try {
        const ramData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        const processedData = {
            timestamp: result.timestamp,
            total: ramData.total || 0,
            libre: ramData.libre || 0,
            uso: ramData.uso || 0,
            porcentajeUso: ramData.porcentajeUso || 0,
            //raw: ramData
        };
        
        // Guardar en memoria (funcionalidad original)
        metricsData.ram.push(processedData);
        
        // Mantener solo los últimos 100 registros en memoria
        if (metricsData.ram.length > 100) {
            metricsData.ram.shift();
        }
        
        // Guardar en base de datos (nueva funcionalidad)
        try {
            await db.insertRAMData(processedData);
        } catch (dbError) {
            console.error('Error guardando RAM en BD (continuando normalmente):', dbError.message);
        }
        
        console.log(`RAM actualizada: ${processedData.porcentajeUso}% (${processedData.uso}/${processedData.total} MB)`);
        } catch (parseError) {
        console.error('Error parsing RAM data:', parseError);
        }
    }
}

// Nueva función para procesar y almacenar métricas combinadas
async function updateMetricsData() {
    const result = await fetchBackendData(config.endpoints.metrics);
    
    if (result.success) {
        try {
        const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        const processedData = {
            timestamp: result.timestamp,
            total_ram: data.total_ram || 0,
            ram_libre: data.ram_libre || 0,
            uso_ram: data.uso_ram || 0,
            porcentaje_ram: data.porcentaje_ram || 0,
            porcentaje_cpu_uso: data.porcentaje_cpu_uso || 0,
            porcentaje_cpu_libre: data.porcentaje_cpu_libre || 0,
            procesos_corriendo: data.procesos_corriendo || 0,
            total_procesos: data.total_procesos || 0,
            procesos_durmiendo: data.procesos_durmiendo || 0,
            procesos_zombie: data.procesos_zombie || 0,
            procesos_parados: data.procesos_parados || 0,
            hora: data.hora || '',
            //raw: data
        };
        
        // Guardar en memoria
        metricsData.metrics.push(processedData);
        
        // Mantener solo los últimos 100 registros en memoria
        if (metricsData.metrics.length > 100) {
            metricsData.metrics.shift();
        }
        
        // Guardar en base de datos
        try {
            await db.insertMetricsData(processedData);
        } catch (dbError) {
            console.error('Error guardando Metrics en BD (continuando normalmente):', dbError.message);
        }
        
        console.log(`Metrics actualizadas: CPU ${processedData.porcentaje_cpu_uso}%, RAM ${processedData.porcentaje_ram}%, Procesos ${processedData.total_procesos}`);
        } catch (parseError) {
        console.error('Error parsing Metrics data:', parseError);
        }
    }
}

// Nueva función para procesar y almacenar datos de procesos
async function updateProcesosData() {
    const result = await fetchBackendData(config.endpoints.procesos);
    
    if (result.success) {
        try {
        const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
        
        const processedData = {
            timestamp: result.timestamp,
            procesos_corriendo: data.procesos_corriendo || 0,
            total_procesos: data.total_procesos || 0,
            procesos_durmiendo: data.procesos_durmiendo || 0,
            procesos_zombie: data.procesos_zombie || 0,
            procesos_parados: data.procesos_parados || 0,
            //raw: data
        };
        
        // Guardar en memoria
        metricsData.procesos.push(processedData);
        
        // Mantener solo los últimos 100 registros en memoria
        if (metricsData.procesos.length > 100) {
            metricsData.procesos.shift();
        }
        
        // Guardar en base de datos
        try {
            await db.insertProcesosData(processedData);
        } catch (dbError) {
            console.error('Error guardando Procesos en BD (continuando normalmente):', dbError.message);
        }
        
        console.log(`Procesos actualizados: Total ${processedData.total_procesos}, Corriendo ${processedData.procesos_corriendo}, Durmiendo ${processedData.procesos_durmiendo}`);
        } catch (parseError) {
        console.error('Error parsing Procesos data:', parseError);
        }
    }
}

// Función principal de actualización
async function updateMetrics() {
    console.log('Actualizando métricas...');
    await Promise.all([
        updateCPUData(),
        updateRAMData(),
        updateMetricsData(),
        updateProcesosData()
    ]);
    metricsData.lastUpdate = new Date().toISOString();
}

// Endpoints API originales
app.get('/api/metrics', (req, res) => {
    res.json({
        cpu: metricsData.cpu,
        ram: metricsData.ram,
        metrics: metricsData.metrics,
        procesos: metricsData.procesos,
        lastUpdate: metricsData.lastUpdate,
        totalRecords: {
        cpu: metricsData.cpu.length,
        ram: metricsData.ram.length,
        metrics: metricsData.metrics.length,
        procesos: metricsData.procesos.length
        }
    });
});

app.get('/api/metrics/cpu', (req, res) => {
    res.json({
        data: metricsData.cpu,
        lastUpdate: metricsData.lastUpdate,
        count: metricsData.cpu.length
    });
});

app.get('/api/metrics/ram', (req, res) => {
    res.json({
        data: metricsData.ram,
        lastUpdate: metricsData.lastUpdate,
        count: metricsData.ram.length
    });
});

// Nuevos endpoints
app.get('/api/metrics/combined', (req, res) => {
    res.json({
        data: metricsData.metrics,
        lastUpdate: metricsData.lastUpdate,
        count: metricsData.metrics.length
    });
});

app.get('/api/metrics/procesos', (req, res) => {
    res.json({
        data: metricsData.procesos,
        lastUpdate: metricsData.lastUpdate,
        count: metricsData.procesos.length
    });
});

app.get('/api/metrics/latest', (req, res) => {
    const latest = {
        cpu: metricsData.cpu.length > 0 ? metricsData.cpu[metricsData.cpu.length - 1] : null,
        ram: metricsData.ram.length > 0 ? metricsData.ram[metricsData.ram.length - 1] : null,
        metrics: metricsData.metrics.length > 0 ? metricsData.metrics[metricsData.metrics.length - 1] : null,
        procesos: metricsData.procesos.length > 0 ? metricsData.procesos[metricsData.procesos.length - 1] : null,
        lastUpdate: metricsData.lastUpdate
    };
    res.json(latest);
});

app.get('/api/database/stats', async (req, res) => {
    try {
        const stats = await db.getDatabaseStats();
        if (stats) {
            res.json(stats);
        } else {
            res.status(500).json({ error: 'No se pudieron obtener las estadísticas de la BD' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'nodejs-data-fetcher',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        lastUpdate: metricsData.lastUpdate
    });
});

// Inicializar el servicio
async function startService() {
    console.log('Iniciando servicio NodeJS Data Fetcher...');
    
    // Verificar conectividad con la base de datos
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
        console.log('Advertencia: No se pudo conectar con PostgreSQL, continuando sin BD');
    }
    
    // Verificar conectividad con el backend
    try {
        const healthCheck = await fetchBackendData(config.endpoints.health);
        if (healthCheck.success) {
        console.log('Conectividad con backend Go verificada');
        } else {
        console.log('Advertencia: No se pudo conectar con el backend Go');
        }
    } catch (error) {
        console.log('Advertencia: Error al verificar backend Go:', error.message);
    }
    
    // Obtener datos iniciales
    await updateMetrics();
    
    // Configurar intervalo de actualización
    setInterval(updateMetrics, config.updateInterval);
    
    // Iniciar servidor
    app.listen(config.port, () => {
        console.log(`Servicio NodeJS ejecutándose en puerto ${config.port}`);
        console.log(`Datos disponibles en:`);
        console.log(`  - http://localhost:${config.port}/api/metrics`);
        console.log(`  - http://localhost:${config.port}/api/metrics/combined`);
        console.log(`  - http://localhost:${config.port}/api/metrics/procesos`);
        console.log(`  - http://localhost:${config.port}/api/database/stats`);
        console.log(`Actualizando métricas cada ${config.updateInterval}ms`);
    });
}

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});

// Cerrar conexiones al salir
process.on('SIGINT', async () => {
    console.log('\n Cerrando servicio...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n Cerrando servicio...');
    await db.closePool();
    process.exit(0);
});

// Iniciar servicio
startService();