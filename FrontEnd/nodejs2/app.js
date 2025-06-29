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

// Función para obtener el último dato de monitoreo
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
      ORDER BY timestamp_received DESC 
      LIMIT 1
    `;

    const result = await pool.query(query);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error al obtener último dato:', error);
    return null;
  }
}

// Función para obtener historial de datos (últimos 20 registros)
async function getHistoricalData() {
  try {
    const query = `
      SELECT 
        porcentaje_ram,
        porcentaje_cpu_uso,
        procesos_corriendo,
        timestamp_received
      FROM fase2.monitoring_data 
      ORDER BY timestamp_received DESC 
      LIMIT 20
    `;

    const result = await pool.query(query);
    return result.rows.reverse(); // Invertir para mostrar cronológicamente
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return [];
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Enviar datos iniciales al cliente
  getLatestMonitoringData().then(data => {
    if (data) {
      socket.emit('monitoring-data', data);
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

// Función para emitir datos en tiempo real
async function broadcastLatestData() {
  const latestData = await getLatestMonitoringData();
  const historicalData = await getHistoricalData();
  
  if (latestData) {
    io.emit('monitoring-data', latestData);
    io.emit('historical-data', historicalData);
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
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      latest_monitoring: '/api/monitoring/latest',
      history: '/api/monitoring/history'
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
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\nCerrando servidor...');
  await pool.end();
  console.log('Conexión a base de datos cerrada');
  process.exit(0);
});