const mysql = require('mysql2/promise');
const config = require('./config');

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = mysql.createPool(config.mysql);
            
            // Probar la conexión
            const connection = await this.pool.getConnection();
            console.log('✅ Conexión a MySQL establecida correctamente');
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Error conectando a MySQL:', error.message);
            return false;
        }
    }

    async testConnection() {
        if (!this.pool) {
            return await this.connect();
        }
        
        try {
            const connection = await this.pool.getConnection();
            await connection.ping();
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Error en test de conexión:', error.message);
            return false;
        }
    }

    async insertMetricsBatch(metricsArray) {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        if (metricsArray.length === 0) {
            return { insertedRows: 0 };
        }

        const query = `
            INSERT INTO system_metrics (
                total_ram, ram_libre, uso_ram, porcentaje_ram,
                porcentaje_cpu_uso, porcentaje_cpu_libre,
                procesos_corriendo, total_procesos, procesos_durmiendo,
                procesos_zombie, procesos_parados, hora, timestamp_received
            ) VALUES ?
        `;

        const values = metricsArray.map(metric => [
            metric.total_ram,
            metric.ram_libre,
            metric.uso_ram,
            metric.porcentaje_ram,
            metric.porcentaje_cpu_uso,
            metric.porcentaje_cpu_libre,
            metric.procesos_corriendo,
            metric.total_procesos,
            metric.procesos_durmiendo,
            metric.procesos_zombie,
            metric.procesos_parados,
            metric.hora,
            metric.timestamp_received
        ]);

        try {
            const [result] = await this.pool.execute(query, [values]);
            return {
                insertedRows: result.affectedRows,
                insertId: result.insertId
            };
        } catch (error) {
            console.error('❌ Error insertando lote de métricas:', error.message);
            throw error;
        }
    }

    async insertImportMetadata(metadata, filePath) {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        const query = `
            INSERT INTO import_metadata (
                total_records, collection_start, collection_end,
                duration_minutes, file_path
            ) VALUES (?, ?, ?, ?, ?)
        `;

        try {
            const [result] = await this.pool.execute(query, [
                metadata.total_records,
                metadata.collection_start,
                metadata.collection_end,
                metadata.duration_minutes,
                filePath
            ]);

            return {
                insertedRows: result.affectedRows,
                insertId: result.insertId
            };
        } catch (error) {
            console.error('❌ Error insertando metadata:', error.message);
            throw error;
        }
    }

    async getMetricsStats() {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        try {
            const [rows] = await this.pool.execute(`
                SELECT 
                    COUNT(*) as total_records,
                    MIN(timestamp_received) as earliest_record,
                    MAX(timestamp_received) as latest_record,
                    AVG(porcentaje_cpu_uso) as avg_cpu_usage,
                    AVG(porcentaje_ram) as avg_ram_usage,
                    AVG(total_procesos) as avg_total_processes
                FROM system_metrics
            `);

            return rows[0];
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error.message);
            throw error;
        }
    }

    async getImportHistory() {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        try {
            const [rows] = await this.pool.execute(`
                SELECT * FROM import_metadata 
                ORDER BY import_date DESC 
                LIMIT 10
            `);

            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo historial de importaciones:', error.message);
            throw error;
        }
    }

    async getMetricsByDateRange(startDate, endDate, limit = 1000) {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        try {
            const [rows] = await this.pool.execute(`
                SELECT * FROM system_metrics 
                WHERE timestamp_received BETWEEN ? AND ?
                ORDER BY timestamp_received ASC
                LIMIT ?
            `, [startDate, endDate, limit]);

            return rows;
        } catch (error) {
            console.error('❌ Error obteniendo métricas por rango de fecha:', error.message);
            throw error;
        }
    }

    async clearMetrics() {
        if (!this.pool) {
            throw new Error('Base de datos no conectada');
        }

        try {
            const [result] = await this.pool.execute('DELETE FROM system_metrics');
            return { deletedRows: result.affectedRows };
        } catch (error) {
            console.error('❌ Error eliminando métricas:', error.message);
            throw error;
        }
    }

    async closePool() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔒 Pool de conexiones MySQL cerrado');
        }
    }
}

module.exports = new Database();