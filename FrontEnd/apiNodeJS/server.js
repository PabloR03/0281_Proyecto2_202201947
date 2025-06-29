const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 7000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configuración de base de datos PostgreSQL - GCP
const pool = new Pool({
  host: process.env.DB_HOST || '34.56.148.15',
  database: process.env.DB_NAME || 'monitoring-metrics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  port: process.env.DB_PORT || 5432,
});

// Configurar el schema por defecto a fase2
pool.on('connect', (client) => {
  client.query('SET search_path TO fase2, public');
});

// Función para parsear fechas
function parseDateTime(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    throw new Error(`Fecha inválida: ${dateString}`);
  }

  // Limpiar la fecha de espacios
  const cleanDateString = dateString.trim();
  
  // Intentar parsear directamente primero
  try {
    const date = new Date(cleanDateString.replace('Z', '+00:00'));
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    // Continuar con otros métodos
  }

  // Si tiene microsegundos (más de 3 dígitos después del punto), truncar a milisegundos
  let processedDateString = cleanDateString;
  if (processedDateString.includes('.')) {
    const parts = processedDateString.split('.');
    if (parts.length === 2 && parts[1].length > 3) {
      processedDateString = `${parts[0]}.${parts[1].substring(0, 3)}`;
    }
  }

  // Formatos específicos a intentar
  const formats = [
    // Formato con espacio: "2025-06-23 19:38:36"
    {
      regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      converter: (str) => new Date(str.replace(' ', 'T'))
    },
    // Formato ISO con T: "2025-06-23T19:38:36"
    {
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/,
      converter: (str) => new Date(str)
    },
    // Formato con milisegundos: "2025-06-23 19:38:36.123"
    {
      regex: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/,
      converter: (str) => new Date(str.replace(' ', 'T'))
    },
    // Formato ISO con milisegundos: "2025-06-23T19:38:36.123"
    {
      regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/,
      converter: (str) => new Date(str)
    }
  ];
  
  for (let format of formats) {
    if (format.regex.test(processedDateString)) {
      try {
        const date = format.converter(processedDateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  throw new Error(`No se pudo parsear la fecha: ${dateString}`);
}

// Rutas

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'Monitoring Data API - Node.js/Express',
    version: '1.0.0',
    api_type: 'Node.js',
    database: 'PostgreSQL GCP',
    schema: 'fase2'
  });
});

// Recibir datos de monitoreo en tiempo real
app.post('/monitoring-data', async (req, res) => {
  try {
    const data = req.body;
    
    // Validar que los datos requeridos estén presentes
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Datos inválidos: se esperaba un objeto JSON'
      });
    }

    // Insertar en la tabla fase2.monitoring_data
    const monitoringQuery = `
      INSERT INTO fase2.monitoring_data (
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
      'Node.js'  // Campo api con valor 'Node.js'
    ];

    const result = await pool.query(monitoringQuery, values);

    console.log(`Datos insertados exitosamente con ID: ${result.rows[0].id}`);

    res.status(201).json({
      message: 'Datos de monitoreo guardados exitosamente',
      id: result.rows[0].id,
      timestamp: new Date().toISOString(),
      api: 'Node.js',
      schema: 'fase2'
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
      SELECT * FROM fase2.monitoring_data
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

    const query = 'SELECT * FROM fase2.monitoring_data WHERE id = $1';
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

// Crear registro de metadata
app.post('/metadata', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: 'Datos inválidos: se esperaba un objeto JSON'
      });
    }

    const metadataQuery = `
      INSERT INTO fase2.metadata (
        total_records, collection_start, collection_end, duration_minutes,
        users, generated_at, phase, description, api
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `;

    const values = [
      data.total_records || 0,
      parseDateTime(data.collection_start || new Date().toISOString()),
      parseDateTime(data.collection_end || new Date().toISOString()),
      data.duration_minutes || 0,
      data.users || 0,
      parseDateTime(data.generated_at || new Date().toISOString()),
      data.phase || 2,
      data.description || '',
      'Node.js'  // Campo api con valor 'Node.js'
    ];

    const result = await pool.query(metadataQuery, values);

    res.status(201).json({
      message: 'Metadata guardada exitosamente',
      id: result.rows[0].id,
      api: 'Node.js'
    });

  } catch (error) {
    console.error('Error al guardar metadata:', error);
    res.status(500).json({
      error: 'Error al guardar metadata',
      details: error.message
    });
  }
});

// Obtener todos los metadatos
app.get('/metadata', async (req, res) => {
  try {
    const query = 'SELECT * FROM fase2.metadata ORDER BY id';
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
    const queries = [
      'SELECT COUNT(*) as count FROM fase2.monitoring_data',
      'SELECT COUNT(*) as count FROM fase2.metadata',
      'SELECT AVG(porcentaje_cpu_uso) as avg_cpu FROM fase2.monitoring_data',
      'SELECT AVG(porcentaje_ram) as avg_ram FROM fase2.monitoring_data',
      'SELECT MAX(porcentaje_cpu_uso) as max_cpu FROM fase2.monitoring_data',
      'SELECT MAX(porcentaje_ram) as max_ram FROM fase2.monitoring_data',
      'SELECT COUNT(*) as count FROM fase2.monitoring_data WHERE api = $1'
    ];

    const results = await Promise.all([
      pool.query(queries[0]),
      pool.query(queries[1]),
      pool.query(queries[2]),
      pool.query(queries[3]),
      pool.query(queries[4]),
      pool.query(queries[5]),
      pool.query(queries[6], ['Node.js'])
    ]);

    const stats = {
      total_monitoring_records: parseInt(results[0].rows[0].count || 0),
      total_metadata_records: parseInt(results[1].rows[0].count || 0),
      average_cpu_usage: parseFloat((results[2].rows[0].avg_cpu || 0).toFixed(2)),
      average_ram_usage: parseFloat((results[3].rows[0].avg_ram || 0).toFixed(2)),
      max_cpu_usage: parseInt(results[4].rows[0].max_cpu || 0),
      max_ram_usage: parseInt(results[5].rows[0].max_ram || 0),
      nodejs_api_records: parseInt(results[6].rows[0].count || 0),
      api: 'Node.js',
      schema: 'fase2'
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

    // Contar registros antes de eliminar
    const countMonitoring = await client.query('SELECT COUNT(*) as count FROM fase2.monitoring_data');
    const countMetadata = await client.query('SELECT COUNT(*) as count FROM fase2.metadata');

    const deletedMonitoring = parseInt(countMonitoring.rows[0].count);
    const deletedMetadata = parseInt(countMetadata.rows[0].count);

    // Eliminar datos
    await client.query('DELETE FROM fase2.monitoring_data');
    await client.query('DELETE FROM fase2.metadata');
    
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

// Probar conexión a la base de datos
app.get('/test-connection', async (req, res) => {
  try {
    const client = await pool.connect();
    
    try {
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0].version;
      
      const schemaResult = await client.query('SELECT current_schema()');
      const schema = schemaResult.rows[0].current_schema;
      
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'fase2'
      `);
      const tables = tablesResult.rows.map(row => row.table_name);

      res.json({
        message: 'Conexión exitosa',
        database_version: version,
        current_schema: schema,
        fase2_tables: tables,
        api: 'Node.js'
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error al probar conexión:', error);
    res.status(500).json({
      error: 'Error al probar conexión',
      details: error.message
    });
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
  console.log(`📖 API disponible en: http://localhost:${PORT}`);
  console.log(`📊 Endpoint para datos: POST http://localhost:${PORT}/monitoring-data`);
  console.log(`🔗 Base de datos: PostgreSQL en GCP (fase2 schema)`);
  console.log(`🧪 Test de conexión: GET http://localhost:${PORT}/test-connection`);
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