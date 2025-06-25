const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // límite de 100 requests por ventana por IP
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
});
app.use(limiter);

// Configuración de base de datos PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'monitoring',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
});

// Función para parsear fechas
function parseDateTime(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error(`Fecha inválida: ${dateString}`);
  }

  // Limpiar la fecha de espacios
  const cleanDateString = dateString.trim();
  
  // Intentar parsear directamente primero
  let date = new Date(cleanDateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Si tiene microsegundos (más de 3 dígitos después del punto), truncar a milisegundos
  let processedDateString = cleanDateString;
  const microsecondMatch = processedDateString.match(/(\.\d{3})\d+/);
  if (microsecondMatch) {
    processedDateString = processedDateString.replace(/(\.\d{3})\d+/, '$1');
  }

  // Intentar parsear la fecha procesada
  date = new Date(processedDateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Formatos específicos a intentar
  const formats = [
    // Formato con espacio: "2025-06-23 19:38:36"
    {
      regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      converter: (str) => new Date(str.replace(' ', 'T'))
    },
    // Formato ISO con microsegundos: "2025-06-23T19:38:36.192640"
    {
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+$/,
      converter: (str) => {
        const truncated = str.replace(/(\.\d{3})\d*/, '$1');
        return new Date(truncated);
      }
    },
    // Formato ISO básico: "2025-06-23T19:38:36"
    {
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
      converter: (str) => new Date(str)
    }
  ];
  
  for (let format of formats) {
    if (format.regex.test(processedDateString)) {
      date = format.converter(processedDateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  throw new Error(`No se pudo parsear la fecha: ${dateString}`);
}

// Rutas

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Monitoring Data API',
    version: '1.0.0',
    api_type: 'Node.js'
  });
});

// RUTA CORREGIDA: Recibir datos de monitoreo en tiempo real
app.post('/monitoring-data', async (req, res) => {
  try {
    const data = req.body;
    
    // Validar que los datos requeridos estén presentes
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Datos inválidos: se esperaba un objeto JSON'
      });
    }

    // Query SQL corregida
    const monitoringQuery = `
      INSERT INTO monitoring_data (
        total_ram, ram_libre, uso_ram, porcentaje_ram, porcentaje_cpu_uso,
        porcentaje_cpu_libre, procesos_corriendo, total_procesos,
        procesos_durmiendo, procesos_zombie, procesos_parados,
        hora, timestamp_received, api
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      data.total_ram || 0,
      data.ram_libre || 0,
      data.uso_ram || 0,
      data.porcentaje_ram || 0,
      data.porcentaje_cpu_uso || 0,
      data.porcentaje_cpu_libre || 0,
      data.procesos_corriendo || 0,
      data.total_procesos || 0,
      data.procesos_durmiendo || 0,
      data.procesos_zombie || 0,
      data.procesos_parados || 0,
      parseDateTime(data.hora || new Date().toISOString()),
      parseDateTime(data.timestamp_received || new Date().toISOString()),
      'Node.js'
    ];

    const result = await pool.query(monitoringQuery, values);

    res.status(201).json({
      message: 'Datos de monitoreo guardados exitosamente',
      id: result.rows[0].id,
      timestamp: new Date().toISOString(),
      api: 'Node.js'
    });

  } catch (error) {
    console.error('Error al guardar datos de monitoreo:', error);
    res.status(500).json({
      error: 'Error al guardar datos de monitoreo',
      details: error.message
    });
  }
});

// Obtener datos de monitoreo con paginación
app.get('/monitoring-data', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Máximo 1000

    const query = `
      SELECT * FROM monitoring_data
      ORDER BY id DESC
      OFFSET $1 LIMIT $2
    `;

    const result = await pool.query(query, [skip, limit]);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener datos de monitoreo:', error);
    res.status(500).json({
      error: 'Error al obtener datos de monitoreo',
      details: error.message
    });
  }
});

// Obtener un registro específico de monitoreo
app.get('/monitoring-data/:id', async (req, res) => {
  try {
    const dataId = parseInt(req.params.id);
    
    if (isNaN(dataId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const query = 'SELECT * FROM monitoring_data WHERE id = $1';
    const result = await pool.query(query, [dataId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error al obtener registro:', error);
    res.status(500).json({
      error: 'Error al obtener registro',
      details: error.message
    });
  }
});

// Obtener todos los metadatos
app.get('/metadata', async (req, res) => {
  try {
    const query = 'SELECT * FROM metadata ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error('Error al obtener metadata:', error);
    res.status(500).json({
      error: 'Error al obtener metadata',
      details: error.message
    });
  }
});

// Obtener estadísticas básicas
app.get('/stats', async (req, res) => {
  try {
    const queries = {
      totalRecords: 'SELECT COUNT(*) as count FROM monitoring_data',
      totalMetadata: 'SELECT COUNT(*) as count FROM metadata',
      avgCpu: 'SELECT AVG(porcentaje_cpu_uso) as avg_cpu FROM monitoring_data',
      avgRam: 'SELECT AVG(porcentaje_ram) as avg_ram FROM monitoring_data',
      maxCpu: 'SELECT MAX(porcentaje_cpu_uso) as max_cpu FROM monitoring_data',
      maxRam: 'SELECT MAX(porcentaje_ram) as max_ram FROM monitoring_data'
    };

    const results = await Promise.all([
      pool.query(queries.totalRecords),
      pool.query(queries.totalMetadata),
      pool.query(queries.avgCpu),
      pool.query(queries.avgRam),
      pool.query(queries.maxCpu),
      pool.query(queries.maxRam)
    ]);

    const stats = {
      total_monitoring_records: parseInt(results[0].rows[0].count),
      total_metadata_records: parseInt(results[1].rows[0].count),
      average_cpu_usage: parseFloat((results[2].rows[0].avg_cpu || 0).toFixed(2)),
      average_ram_usage: parseFloat((results[3].rows[0].avg_ram || 0).toFixed(2)),
      max_cpu_usage: parseInt(results[4].rows[0].max_cpu || 0),
      max_ram_usage: parseInt(results[5].rows[0].max_ram || 0),
      api: 'Node.js'
    };

    res.json(stats);

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

// Limpiar todos los datos
app.delete('/monitoring-data', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const countMonitoring = await client.query('SELECT COUNT(*) as count FROM monitoring_data');
    const countMetadata = await client.query('SELECT COUNT(*) as count FROM metadata');

    const deletedMonitoring = parseInt(countMonitoring.rows[0].count);
    const deletedMetadata = parseInt(countMetadata.rows[0].count);

    await client.query('DELETE FROM monitoring_data');
    await client.query('DELETE FROM metadata');
    
    await client.query('COMMIT');

    res.json({
      message: 'Datos eliminados exitosamente',
      deleted_monitoring_records: deletedMonitoring,
      deleted_metadata_records: deletedMetadata,
      api: 'Node.js'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar datos:', error);
    res.status(500).json({
      error: 'Error al eliminar datos',
      details: error.message
    });
  } finally {
    client.release();
  }
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    api: 'Node.js'
  });
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    api: 'Node.js'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Node.js ejecutándose en puerto ${PORT}`);
  console.log(`📖 APIs disponible en: http://localhost:${PORT}`);
  console.log(`📊 Endpoint para datos: POST http://localhost:${PORT}/monitoring-data`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Cerrando servidor...');
  await pool.end();
  process.exit(0);
});