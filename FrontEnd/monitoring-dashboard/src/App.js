import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import io from 'socket.io-client';

// Variables de entorno con valores por defecto
const config = {
  //socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://104.155.141.242:9000',
  //apiUrl: process.env.REACT_APP_API_URL || 'http://104.155.141.242:9000',
  socketUrl: process.env.REACT_APP_SOCKET_URL,
  apiUrl: process.env.REACT_APP_API_URL,
  refreshInterval: parseInt(process.env.REACT_APP_REFRESH_INTERVAL) || 5000,
  maxHistoricalPoints: parseInt(process.env.REACT_APP_MAX_HISTORICAL_POINTS) || 50
};

// Debug: Mostrar configuración en consola
console.log('=== CONFIGURACIÓN DEL DASHBOARD ===');
console.log('Socket URL:', config.socketUrl);
console.log('API URL:', config.apiUrl);
console.log('Refresh Interval:', config.refreshInterval);
console.log('Max Historical Points:', config.maxHistoricalPoints);
console.log('Variables de entorno disponibles:');
console.log('REACT_APP_SOCKET_URL:', process.env.REACT_APP_SOCKET_URL);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('=====================================');

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000000',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    borderBottom: '1px solid #1f2937',
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    backdropFilter: 'blur(8px)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 0
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '14px',
    margin: '4px 0 0 0'
  },
  mainContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 24px'
  },
  grid: {
    display: 'grid',
    gap: '24px',
    marginBottom: '32px'
  },
  gridCols4: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'
  },
  gridCols3: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'
  },
  gridCols2: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))'
  },
  metricCard: {
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '24px',
    transition: 'border-color 0.2s ease',
    cursor: 'default'
  },
  metricCardHover: {
    borderColor: '#4b5563'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  cardTitle: {
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  cardValue: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  cardSubtitle: {
    color: '#6b7280',
    fontSize: '14px'
  },
  chartContainer: {
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '24px'
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#e5e7eb'
  },
  chartWrapper: {
    height: '256px'
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%'
  },
  legendText: {
    fontSize: '14px',
    color: '#9ca3af'
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  connectionText: {
    color: '#9ca3af'
  },
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContent: {
    textAlign: 'center'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '2px solid #4b5563',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px auto'
  },
  loadingText: {
    color: '#9ca3af'
  },
  systemInfo: {
    marginTop: '32px',
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '24px'
  },
  systemInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    fontSize: '14px'
  },
  infoLabel: {
    color: '#9ca3af'
  },
  infoValue: {
    marginLeft: '8px',
    color: '#ffffff'
  },
  configInfo: {
    backgroundColor: '#1f2937',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  debugInfo: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    fontSize: '12px',
    color: '#9ca3af'
  }
};

// CSS para animaciones
const cssAnimations = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inyectar CSS de animaciones
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = cssAnimations;
  document.head.appendChild(styleElement);
}

const Dashboard = () => {
  const [currentData, setCurrentData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    console.log('Iniciando conexión con Socket.IO...');
    console.log('URL de conexión:', config.socketUrl);
    
    const socket = io(config.socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 10
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('✅ Conectado exitosamente al servidor:', config.socketUrl);
      console.log('Socket ID:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('❌ Desconectado del servidor. Razón:', reason);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      console.error('🔥 Error de conexión:', error);
      console.error('Intentando conectar a:', config.socketUrl);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Intento de reconexión #', attemptNumber);
    });

    socket.on('monitoring-data', (data) => {
      console.log('📊 Datos de monitoreo recibidos:', data);
      setCurrentData(data);
      setLastUpdate(new Date());
    });

    socket.on('historical-data', (data) => {
      console.log('📈 Datos históricos recibidos:', data.length, 'puntos');
      const formattedData = data
        .slice(-config.maxHistoricalPoints)
        .map((item, index) => ({
          ...item,
          time: new Date(item.timestamp_received).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          index: index
        }));
      setHistoricalData(formattedData);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Limpiando conexión socket...');
      socket.disconnect();
    };
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const MetricCard = ({ title, value, subtitle, color }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const getColorValue = (colorClass) => {
      const colorMap = {
        'bg-blue-500': '#3b82f6',
        'bg-green-500': '#10b981',
        'bg-purple-500': '#8b5cf6',
        'bg-orange-500': '#f97316',
        'bg-gray-500': '#6b7280',
        'bg-red-500': '#ef4444',
        'bg-yellow-500': '#eab308'
      };
      return colorMap[color] || '#6b7280';
    };

    return (
      <div 
        style={{
          ...styles.metricCard,
          ...(isHovered ? styles.metricCardHover : {})
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>{title}</div>
          <div style={{
            ...styles.statusDot,
            backgroundColor: getColorValue(color)
          }}></div>
        </div>
        <div style={styles.cardValue}>{value}</div>
        {subtitle && <div style={styles.cardSubtitle}>{subtitle}</div>}
      </div>
    );
  };

  const ConnectionStatus = () => (
    <div style={styles.connectionStatus}>
      <div style={{
        ...styles.connectionDot,
        backgroundColor: isConnected ? '#10b981' : '#ef4444'
      }}></div>
      <span style={styles.connectionText}>
        {isConnected ? 'Conectado' : 'Desconectado'}
      </span>
      {connectionError && (
        <span style={{...styles.connectionText, color: '#ef4444'}}>
          • Error: {connectionError}
        </span>
      )}
      {lastUpdate && (
        <span style={styles.connectionText}>
          • Última actualización: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  if (!currentData && !connectionError) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>
            Conectando al sistema de monitoreo...
          </div>
          <div style={{...styles.loadingText, marginTop: '8px', fontSize: '12px'}}>
            {config.socketUrl}
          </div>
          <div style={{...styles.loadingText, marginTop: '8px', fontSize: '10px'}}>
            Estado: {isConnected ? 'Conectado' : 'Conectando...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>SYSTEM MONITOR</h1>
            <p style={styles.subtitle}>Real-time system performance dashboard</p>
          </div>
          <ConnectionStatus />
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Debug Info */}
        <div style={styles.debugInfo}>
          <strong>Debug Info:</strong><br/>
          Socket URL: {config.socketUrl}<br/>
          API URL: {config.apiUrl}<br/>
          Conectado: {isConnected ? 'Sí' : 'No'}<br/>
          Última actualización: {lastUpdate ? lastUpdate.toLocaleString() : 'Nunca'}<br/>
          Variables de entorno cargadas: {process.env.REACT_APP_SOCKET_URL ? 'Sí' : 'No'}<br/>
          {connectionError && `Error: ${connectionError}`}
        </div>

        {/* Configuration Info */}
        <div style={styles.configInfo}>
          Servidor: {config.socketUrl} | Puntos históricos: {config.maxHistoricalPoints} | Intervalo: {config.refreshInterval}ms
        </div>

        {/* Metrics Grid */}
        {currentData && (
          <>
            <div style={{...styles.grid, ...styles.gridCols4}}>
              <MetricCard
                title="CPU Usage"
                value={`${currentData.porcentaje_cpu_uso}%`}
                subtitle={`${currentData.porcentaje_cpu_libre}% libre`}
                color="bg-blue-500"
              />
              <MetricCard
                title="Memory Usage"
                value={`${currentData.porcentaje_ram}%`}
                subtitle={`${formatBytes(currentData.ram_libre)} libre`}
                color="bg-green-500"
              />
              <MetricCard
                title="Running Processes"
                value={currentData.procesos_corriendo}
                subtitle={`${currentData.total_procesos} total`}
                color="bg-purple-500"
              />
              <MetricCard
                title="Total RAM"
                value={formatBytes(currentData.total_ram)}
                subtitle={`${formatBytes(currentData.uso_ram)} usado`}
                color="bg-orange-500"
              />
            </div>

            {/* Process Status */}
            <div style={{...styles.grid, ...styles.gridCols3}}>
              <MetricCard
                title="Sleeping"
                value={currentData.procesos_durmiendo}
                color="bg-gray-500"
              />
              <MetricCard
                title="Zombie"
                value={currentData.procesos_zombie}
                color="bg-red-500"
              />
              <MetricCard
                title="Stopped"
                value={currentData.procesos_parados}
                color="bg-yellow-500"
              />
            </div>
          </>
        )}

        {/* Charts */}
        {historicalData.length > 0 && (
          <div style={{...styles.grid, ...styles.gridCols2}}>
            {/* CPU & Memory Chart */}
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>CPU & MEMORY USAGE</h3>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="porcentaje_cpu_uso" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={false}
                      name="CPU"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="porcentaje_ram" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={false}
                      name="RAM"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendDot, backgroundColor: '#3b82f6'}}></div>
                  <span style={styles.legendText}>CPU Usage</span>
                </div>
                <div style={styles.legendItem}>
                  <div style={{...styles.legendDot, backgroundColor: '#10b981'}}></div>
                  <span style={styles.legendText}>Memory Usage</span>
                </div>
              </div>
            </div>

            {/* Running Processes Chart */}
            <div style={styles.chartContainer}>
              <h3 style={styles.chartTitle}>RUNNING PROCESSES</h3>
              <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="procesos_corriendo" 
                      stroke="#8B5CF6" 
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        {currentData && (
          <div style={styles.systemInfo}>
            <h3 style={styles.chartTitle}>SYSTEM INFORMATION</h3>
            <div style={styles.systemInfoGrid}>
              <div>
                <span style={styles.infoLabel}>API Source:</span>
                <span style={styles.infoValue}>{currentData.api}</span>
              </div>
              <div>
                <span style={styles.infoLabel}>Last Update:</span>
                <span style={styles.infoValue}>
                  {new Date(currentData.timestamp_received).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={styles.infoLabel}>System Time:</span>
                <span style={styles.infoValue}>{currentData.hora}</span>
              </div>
              <div>
                <span style={styles.infoLabel}>Socket URL:</span>
                <span style={styles.infoValue}>{config.socketUrl}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {connectionError && !currentData && (
          <div style={{
            ...styles.chartContainer,
            textAlign: 'center',
            padding: '48px 24px'
          }}>
            <h3 style={{...styles.chartTitle, color: '#ef4444'}}>
              ERROR DE CONEXIÓN
            </h3>
            <p style={{color: '#9ca3af', marginBottom: '16px'}}>
              No se pudo conectar al servidor de monitoreo
            </p>
            <p style={{color: '#6b7280', fontSize: '14px'}}>
              URL: {config.socketUrl}
            </p>
            <p style={{color: '#6b7280', fontSize: '14px'}}>
              Error: {connectionError}
            </p>
            <div style={{marginTop: '20px', fontSize: '12px', color: '#6b7280'}}>
              <strong>Troubleshooting:</strong><br/>
              1. Verifica que el servidor esté corriendo en {config.socketUrl}<br/>
              2. Revisa las variables de entorno en tu archivo .env<br/>
              3. Asegúrate de que no haya problemas de CORS<br/>
              4. Verifica la conectividad de red
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;