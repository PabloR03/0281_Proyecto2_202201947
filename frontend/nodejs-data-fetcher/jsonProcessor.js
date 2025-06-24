const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

class JsonProcessor {
    constructor() {
        this.totalProcessed = 0;
        this.errors = [];
    }

    async readJsonFile(filePath) {
        try {
            console.log(`📖 Leyendo archivo: ${filePath}`);
            
            // Verificar si el archivo existe
            await fs.access(filePath);
            
            // Leer el archivo
            const fileContent = await fs.readFile(filePath, 'utf8');
            
            console.log(`📊 Tamaño del archivo: ${(fileContent.length / 1024 / 1024).toFixed(2)} MB`);
            
            // Parsear JSON
            const jsonData = JSON.parse(fileContent);
            
            if (!jsonData.data || !Array.isArray(jsonData.data)) {
                throw new Error('El archivo JSON no tiene el formato esperado (falta campo "data" o no es array)');
            }

            console.log(`✅ Archivo JSON leído correctamente`);
            console.log(`📈 Total de registros en data: ${jsonData.data.length}`);
            
            return {
                success: true,
                metadata: jsonData.metadata,
                data: jsonData.data,
                totalRecords: jsonData.data.length
            };

        } catch (error) {
            console.error('❌ Error leyendo archivo JSON:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateMetricRecord(record, index) {
        const requiredFields = [
            'total_ram', 'ram_libre', 'uso_ram', 'porcentaje_ram',
            'porcentaje_cpu_uso', 'porcentaje_cpu_libre',
            'procesos_corriendo', 'total_procesos', 'procesos_durmiendo',
            'procesos_zombie', 'procesos_parados', 'hora', 'timestamp_received'
        ];

        const missingFields = requiredFields.filter(field => 
            record[field] === undefined || record[field] === null
        );

        if (missingFields.length > 0) {
            const error = `Registro ${index}: Campos faltantes: ${missingFields.join(', ')}`;
            this.errors.push(error);
            return false;
        }

        // Validar tipos de datos numéricos
        const numericFields = [
            'total_ram', 'ram_libre', 'uso_ram', 'porcentaje_ram',
            'porcentaje_cpu_uso', 'porcentaje_cpu_libre',
            'procesos_corriendo', 'total_procesos', 'procesos_durmiendo',
            'procesos_zombie', 'procesos_parados'
        ];

        for (const field of numericFields) {
            if (isNaN(Number(record[field]))) {
                const error = `Registro ${index}: Campo ${field} no es numérico: ${record[field]}`;
                this.errors.push(error);
                return false;
            }
        }

        return true;
    }

    async processInBatches(data, batchProcessor) {
        const batchSize = config.batchSize;
        const totalBatches = Math.ceil(data.length / batchSize);
        let processedBatches = 0;
        let totalProcessed = 0;

        console.log(`🔄 Procesando ${data.length} registros en lotes de ${batchSize}`);
        console.log(`📦 Total de lotes: ${totalBatches}`);

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            
            try {
                console.log(`⏳ Procesando lote ${batchNumber}/${totalBatches} (${batch.length} registros)`);
                
                // Validar registros del lote
                const validRecords = [];
                for (let j = 0; j < batch.length; j++) {
                    const globalIndex = i + j;
                    if (this.validateMetricRecord(batch[j], globalIndex)) {
                        validRecords.push(batch[j]);
                    }
                }

                if (validRecords.length > 0) {
                    const result = await batchProcessor(validRecords);
                    totalProcessed += result.insertedRows || 0;
                    console.log(`✅ Lote ${batchNumber} procesado: ${result.insertedRows} registros insertados`);
                } else {
                    console.log(`⚠️  Lote ${batchNumber} omitido: no hay registros válidos`);
                }

                processedBatches++;

                // Mostrar progreso cada 10 lotes
                if (processedBatches % 10 === 0) {
                    const progress = ((processedBatches / totalBatches) * 100).toFixed(2);
                    console.log(`📊 Progreso: ${progress}% (${processedBatches}/${totalBatches} lotes)`);
                }

            } catch (error) {
                console.error(`❌ Error procesando lote ${batchNumber}:`, error.message);
                this.errors.push(`Lote ${batchNumber}: ${error.message}`);
            }
        }

        return {
            totalProcessed,
            totalBatches: processedBatches,
            errors: this.errors
        };
    }

    getProcessingStats() {
        return {
            totalProcessed: this.totalProcessed,
            totalErrors: this.errors.length,
            errors: this.errors.slice(-10) // Últimos 10 errores
        };
    }

    clearStats() {
        this.totalProcessed = 0;
        this.errors = [];
    }
}

module.exports = JsonProcessor;