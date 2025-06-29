const express = require('express');
const { Pool } = require('pg');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 9000;

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: false,
});

// Middleware
app.use(express.json());

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// SOLUCIÓN 1: Ordenar por ID (más confiable para el último registro insertado)
async function getLatestMonitoringData() {
  try {
    const query = `
      SELECT 
        id,
        total_ram,
        ram_libre,
        uso_ram,
        porcentaje_ram,
        porcentaje_cpu_uso,
        porcentaje_cpu_libre,
        procesos_corriendo,
        total_procesos,
        procesos_durmiendo,
        procesos_zombie,
        procesos_parados,
        hora,
        timestamp_received,
        api,
        created_at
      FROM fase2.monitoring_data 
      ORDER BY id DESC 
      LIMIT 1
    `;

    const result = await pool.query(query);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener último dato:', error);
    return null;
  }
}

// SOLUCIÓN ALTERNATIVA: Ordenar por created_at si es más confiable que timestamp_received
async function getLatestMonitoringDataByCreatedAt() {
  try {
    const query = `
      SELECT 
        id,
        total_ram,
        ram_libre,
        uso_ram,
        porcentaje_ram,
        porcentaje_cpu_uso,
        porcentaje_cpu_libre,
        procesos_corriendo,
        total_procesos,
        procesos_durmiendo,
        procesos_zombie,
        procesos_parados,
        hora,
        timestamp_received,
        api,
        created_at
      FROM fase2.monitoring_data 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const result = await pool.query(query);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener último dato:', error);
    return null;
  }
}

// SOLUCIÓN AVANZADA: Obtener el registro con el ID máximo
async function getLatestMonitoringDataMaxId() {
  try {
    const query = `
      SELECT 
        id,
        total_ram,
        ram_libre,
        uso_ram,
        porcentaje_ram,
        porcentaje_cpu_uso,
        porcentaje_cpu_libre,
        procesos_corriendo,
        total_procesos,
        procesos_durmiendo,
        procesos_zombie,
        procesos_parados,
        hora,
        timestamp_received,
        api,
        created_at
      FROM fase2.monitoring_data 
      WHERE id = (SELECT MAX(id) FROM fase2.monitoring_data)
    `;

    const result = await pool.query(query);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener último dato:', error);
    return null;
  }
}

// Función para obtener historial de datos (últimos 20 registros) - TAMBIÉN CORREGIDA
async function getHistoricalData() {
  try {
    const query = `
      SELECT 
        porcentaje_ram,
        porcentaje_cpu_uso,
        procesos_corriendo,
        timestamp_received,
        id
      FROM fase2.monitoring_data 
      ORDER BY id DESC 
      LIMIT 20
    `;

    const result = await pool.query(query);
    return result.rows.reverse(); // Invertir para mostrar cronológicamente
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return [];
  }
}

// Variable para mantener el último ID procesado (opcional para optimización)
let lastProcessedId = null;

// Función mejorada para verificar si hay nuevos datos
async function hasNewData() {
  try {
    const query = `SELECT MAX(id) as max_id FROM fase2.monitoring_data`;
    const result = await pool.query(query);
    const currentMaxId = result.rows[0]?.max_id;
    
    if (lastProcessedId === null || currentMaxId > lastProcessedId) {
      lastProcessedId = currentMaxId;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error al verificar nuevos datos:', error);
    return true; // En caso de error, asumir que hay nuevos datos
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Enviar datos iniciales al cliente
  getLatestMonitoringData().then(data => {
    if (data) {
      socket.emit('monitoring-data', data);
      console.log(`Enviando dato inicial con ID: ${data.id}`);
    }
  });

  // Enviar historial inicial
  getHistoricalData().then(history => {
    socket.emit('historical-data', history);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Función mejorada para emitir datos en tiempo real solo si hay cambios
async function broadcastLatestData() {
  try {
    // Verificar si hay nuevos datos antes de hacer la consulta completa
    const hasNew = await hasNewData();
    
    if (hasNew) {
      const latestData = await getLatestMonitoringData();
      const historicalData = await getHistoricalData();
      
      if (latestData) {
        console.log(`Broadcasting nuevo dato con ID: ${latestData.id}`);
        io.emit('monitoring-data', latestData);
        io.emit('historical-data', historicalData);
      }
    }
  } catch (error) {
    console.error('Error en broadcast:', error);
  }
}

// Polling cada 5 segundos para obtener nuevos datos
setInterval(broadcastLatestData, 5000);

// Rutas REST existentes (mantener para compatibilidad)
app.get('/api/monitoring/latest', async (req, res) => {
  try {
    const data = await getLatestMonitoringData();
    
    const response = {
      success: true,
      message: 'Último registro obtenido exitosamente',
      data: data,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener datos de monitoreo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de monitoreo',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Nueva ruta para debug - ver todos los IDs
app.get('/api/monitoring/debug', async (req, res) => {
  try {
    const query = `
      SELECT id, timestamp_received, created_at 
      FROM fase2.monitoring_data 
      ORDER BY id DESC 
      LIMIT 10
    `;
    const result = await pool.query(query);
    
    res.status(200).json({
      success: true,
      message: 'Últimos 10 registros para debug',
      data: result.rows,
      lastProcessedId: lastProcessedId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/monitoring/history', async (req, res) => {
  try {
    const data = await getHistoricalData();
    
    const response = {
      success: true,
      message: 'Historial obtenido exitosamente',
      count: data.length,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de salud
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    
    res.status(200).json({
      success: true,
      message: 'API funcionando correctamente',
      database: 'Conectada',
      websocket: 'Activo',
      port: PORT,
      lastProcessedId: lastProcessedId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la API',
      database: 'Desconectada',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Monitoreo con WebSocket',
    version: '2.0.1',
    endpoints: {
      health: '/api/health',
      latest_monitoring: '/api/monitoring/latest',
      history: '/api/monitoring/history',
      debug: '/api/monitoring/debug'
    },
    websocket: 'ws://localhost:' + PORT,
    port: PORT
  });
});

// Manejo de errores para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`API con WebSocket ejecutándose en puerto ${PORT}`);
  console.log(`Endpoint principal: http://localhost:${PORT}/api/monitoring/latest`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Debug endpoint: http://localhost:${PORT}/api/monitoring/debug`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\nCerrando servidor...');
  await pool.end();
  console.log('Conexión a base de datos cerrada');
  process.exit(0);
});