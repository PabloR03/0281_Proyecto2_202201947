const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const database = require('./database');
const JsonProcessor = require('./jsonProcessor');

const app = express();
const jsonProcessor = new JsonProcessor();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Variables de estado
let importInProgress = false;
let lastImportResult = null;

// Función para importar datos desde el archivo JSON
async function importJsonData() {
    if (importInProgress) {
        throw new Error('Ya hay una importación en progreso');
    }

    importInProgress = true;
    const startTime = Date.now();
    
    try {
        console.log('🚀 Iniciando importación de datos JSON...');
        
        // Leer archivo JSON
        const fileResult = await jsonProcessor.readJsonFile(config.jsonFilePath);
        
        if (!fileResult.success) {
            throw new Error(`Error leyendo archivo: ${fileResult.error}`);
        }

        const { metadata, data } = fileResult;
        
        // Insertar metadata de la importación
        if (metadata) {
            await database.insertImportMetadata(metadata, config.jsonFilePath);
            console.log('📋 Metadata de importación guardada');
        }

        // Procesar datos en lotes
        const batchProcessor = async (batch) => {
            return await database.insertMetricsBatch(batch);
        };

        const processingResult = await jsonProcessor.processInBatches(data, batchProcessor);
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        const result = {
            success: true,
            totalRecords: data.length,
            processedRecords: processingResult.totalProcessed,
            processedBatches: processingResult.totalBatches,
            errors: processingResult.errors,
            duration: `${duration}s`,
            importDate: new Date().toISOString()
        };

        console.log('✅ Importación completada exitosamente');
        console.log(`📊 Estadísticas: ${result.processedRecords}/${result.totalRecords} registros en ${result.duration}`);
        
        if (result.errors.length > 0) {
            console.log(`⚠️  Se encontraron ${result.errors.length} errores durante la importación`);
        }

        lastImportResult = result;
        return result;

    } catch (error) {
        console.error('❌ Error durante la importación:', error.message);
        const errorResult = {
            success: false,
            error: error.message,
            duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
            importDate: new Date().toISOString()
        };
        lastImportResult = errorResult;
        throw error;
    } finally {
        importInProgress = false;
        jsonProcessor.clearStats();
    }
}

// === ENDPOINTS DE LA API ===

// Endpoint para importar datos
app.post('/api/import', async (req, res) => {
    try {
        const result = await importJsonData();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener el estado de la importación
app.get('/api/import/status', (req, res) => {
    res.json({
        importInProgress,
        lastImportResult,
        timestamp: new Date().toISOString()
    });
});

// Endpoint para obtener estadísticas de la base de datos
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await database.getMetricsStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener historial de importaciones
app.get('/api/import/history', async (req, res) => {
    try {
        const history = await database.getImportHistory();
        res.json({
            success: true,
            data: history,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener métricas por rango de fechas
app.get('/api/metrics', async (req, res) => {
    try {
        const { start_date, end_date, limit = 1000 } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren los parámetros start_date y end_date (formato: YYYY-MM-DD HH:MM:SS)',
                timestamp: new Date().toISOString()
            });
        }

        const metrics = await database.getMetricsByDateRange(start_date, end_date, parseInt(limit));
        
        res.json({
            success: true,
            data: metrics,
            count: metrics.length,
            parameters: { start_date, end_date, limit },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para limpiar todas las métricas
app.delete('/api/metrics', async (req, res) => {
    try {
        const result = await database.clearMetrics();
        res.json({
            success: true,
            message: `${result.deletedRows} registros eliminados`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint de salud
app.get('/api/health', async (req, res) => {
    try {
        const dbConnected = await database.testConnection();
        
        res.json({
            status: 'OK',
            service: 'nodejs-metrics-importer',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            database: {
                connected: dbConnected,
                type: 'MySQL'
            },
            import: {
                inProgress: importInProgress,
                lastImport: lastImportResult ? lastImportResult.importDate : null
            },
            config: {
                jsonFilePath: config.jsonFilePath,
                batchSize: config.batchSize
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener información de la API
app.get('/api/info', (req, res) => {
    res.json({
        name: 'NodeJS Metrics Importer API',
        version: '1.0.0',
        description: 'API para importar métricas de sistema desde archivos JSON a MySQL',
        endpoints: {
            'POST /api/import': 'Importar datos desde el archivo JSON configurado',
            'GET /api/import/status': 'Obtener estado de la importación actual',
            'GET /api/import/history': 'Obtener historial de importaciones',
            'GET /api/stats': 'Obtener estadísticas de la base de datos',
            'GET /api/metrics': 'Obtener métricas por rango de fechas (query: start_date, end_date, limit)',
            'DELETE /api/metrics': 'Eliminar todas las métricas',
            'GET /api/health': 'Estado de salud del servicio',
            'GET /api/info': 'Información de la API'
        },
        timestamp: new Date().toISOString()
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        availableEndpoints: [
            'GET /api/info',
            'GET /api/health',
            'POST /api/import',
            'GET /api/import/status',
            'GET /api/import/history',
            'GET /api/stats',
            'GET /api/metrics',
            'DELETE /api/metrics'
        ],
        timestamp: new Date().toISOString()
    });
});

// Función para inicializar el servicio
async function startService() {
    try {
        console.log('🚀 Iniciando NodeJS Metrics Importer...');
        
        // Conectar a la base de datos
        const dbConnected = await database.connect();
        if (!dbConnected) {
            throw new Error('No se pudo conectar a la base de datos MySQL');
        }

        // Verificar que el archivo JSON existe
        try {
            const fs = require('fs').promises;
            await fs.access(config.jsonFilePath);
            console.log(`✅ Archivo JSON encontrado: ${config.jsonFilePath}`);
        } catch (error) {
            console.log(`⚠️  Advertencia: No se puede acceder al archivo JSON: ${config.jsonFilePath}`);
            console.log('   La importación no estará disponible hasta que se corrija la ruta');
        }

        // Iniciar servidor
        app.listen(config.port, () => {
            console.log('\n🎉 Servicio iniciado exitosamente!');
            console.log(`🌐 Servidor ejecutándose en: http://localhost:${config.port}`);
            console.log('\n📋 Endpoints disponibles:');
            console.log(`   • POST http://localhost:${config.port}/api/import - Importar datos`);
            console.log(`   • GET  http://localhost:${config.port}/api/stats - Estadísticas`);
            console.log(`   • GET  http://localhost:${config.port}/api/health - Estado del servicio`);
            console.log(`   • GET  http://localhost:${config.port}/api/info - Información de la API`);
            console.log('\n🔧 Configuración:');
            console.log(`   • Archivo JSON: ${config.jsonFilePath}`);
            console.log(`   • Tamaño de lote: ${config.batchSize} registros`);
            console.log(`   • Base de datos: MySQL en ${config.mysql.host}:${config.mysql.port}`);
        });

    } catch (error) {
        console.error('❌ Error iniciando el servicio:', error.message);
        process.exit(1);
    }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('💥 Error no capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promesa rechazada no manejada:', reason);
    process.exit(1);
});

// Cerrar conexiones al salir
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servicio...');
    await database.closePool();
    console.log('👋 Servicio cerrado correctamente');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando servicio...');
    await database.closePool();
    console.log('👋 Servicio cerrado correctamente');
    process.exit(0);
});

// Iniciar el servicio
startService();