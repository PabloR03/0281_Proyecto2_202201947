const { Pool } = require('pg');

// Configuración de la base de datos
const dbConfig = {
    user: process.env.DB_USER || 'metrics_202201947',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'metrics_db',
    password: process.env.DB_PASSWORD || 'metrics_202201947',
    port: process.env.DB_PORT || 5432,
    max: 20, // máximo número de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Crear pool de conexiones
const pool = new Pool(dbConfig);

// Manejar errores de conexión
pool.on('error', (err, client) => {
    console.error('Error inesperado en cliente inactivo de la base de datos:', err);
});

// Función para probar la conexión
async function testConnection() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('Conexión a PostgreSQL establecida exitosamente');
        return true;
    } catch (error) {
        console.error('Error conectando a PostgreSQL:', error.message);
        return false;
    }
}

// Función para insertar datos de CPU
async function insertCPUData(data) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO cpu_metrics (timestamp, porcentaje_uso)
            VALUES ($1, $2)
            RETURNING id;
        `;
        const values = [
            new Date(data.timestamp),
            data.porcentajeUso
        ];

        const result = await client.query(query, values);
        console.log(`CPU data guardada en BD con ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error('Error insertando datos de CPU:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Función para insertar datos de RAM
async function insertRAMData(data) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO ram_metrics (timestamp, total_mb, libre_mb, uso_mb, porcentaje_uso)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const values = [
            new Date(data.timestamp),
            data.total,
            data.libre,
            data.uso,
            data.porcentajeUso
        ];
        
        const result = await client.query(query, values);
        console.log(`RAM data guardada en BD con ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error('Error insertando datos de RAM:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Función para insertar métricas combinadas
async function insertMetricsData(data) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO metrics_combined (
                timestamp, total_ram, ram_libre, uso_ram, porcentaje_ram,
                porcentaje_cpu_uso, porcentaje_cpu_libre, procesos_corriendo,
                total_procesos, procesos_durmiendo, procesos_zombie, procesos_parados
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id;
        `;
        const values = [
            new Date(data.timestamp),
            data.total_ram,
            data.ram_libre,
            data.uso_ram,
            data.porcentaje_ram,
            data.porcentaje_cpu_uso,
            data.porcentaje_cpu_libre,
            data.procesos_corriendo,
            data.total_procesos,
            data.procesos_durmiendo,
            data.procesos_zombie,
            data.procesos_parados
        ];
        
        const result = await client.query(query, values);
        console.log(`Metrics data guardada en BD con ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error('Error insertando datos de metrics:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Función para insertar datos de procesos
async function insertProcesosData(data) {
    const client = await pool.connect();
    try {
        const query = `
            INSERT INTO procesos_metrics (
                timestamp, procesos_corriendo, total_procesos,
                procesos_durmiendo, procesos_zombie, procesos_parados
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const values = [
            new Date(data.timestamp),
            data.procesos_corriendo,
            data.total_procesos,
            data.procesos_durmiendo,
            data.procesos_zombie,
            data.procesos_parados
        ];
        
        const result = await client.query(query, values);
        console.log(`Procesos data guardada en BD con ID: ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error('Error insertando datos de procesos:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Función para obtener estadísticas de la base de datos
async function getDatabaseStats() {
    const client = await pool.connect();
    try {
        const cpuCount = await client.query('SELECT COUNT(*) FROM cpu_metrics');
        const ramCount = await client.query('SELECT COUNT(*) FROM ram_metrics');
        const metricsCount = await client.query('SELECT COUNT(*) FROM metrics_combined');
        const procesosCount = await client.query('SELECT COUNT(*) FROM procesos_metrics');
        
        return {
            cpuRecords: parseInt(cpuCount.rows[0].count),
            ramRecords: parseInt(ramCount.rows[0].count),
            metricsRecords: parseInt(metricsCount.rows[0].count),
            procesosRecords: parseInt(procesosCount.rows[0].count),
            totalRecords: parseInt(cpuCount.rows[0].count) + parseInt(ramCount.rows[0].count) + 
                            parseInt(metricsCount.rows[0].count) + parseInt(procesosCount.rows[0].count)
        };
    } catch (error) {
        console.error('Error obteniendo estadísticas de BD:', error.message);
        return null;
    } finally {
        client.release();
    }
}

// Función para cerrar el pool de conexiones
async function closePool() {
    try {
        await pool.end();
        console.log('Pool de conexiones cerrado');
    } catch (error) {
        console.error('Error cerrando pool de conexiones:', error.message);
    }
}

module.exports = {
    pool,
    testConnection,
    insertCPUData,
    insertRAMData,
    insertMetricsData,
    insertProcesosData,
    getDatabaseStats,
    closePool
};