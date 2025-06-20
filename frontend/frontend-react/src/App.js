import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SystemMonitor = () => {
  const [metrics, setMetrics] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({ cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0 });
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [lastUpdate, setLastUpdate] = useState('Nunca');
  const [isPaused, setIsPaused] = useState(false);
  const [timeRange, setTimeRange] = useState(20);
  const intervalRef = useRef(null);

  // URL base de la API - ajustar según tu configuración
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'http://localhost:3001' 
    : 'http://localhost:3001';

  const fetchLatestMetrics = async () => {
    if (isPaused) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/latest`);
      if (!response.ok) throw new Error('Error al obtener datos');
      
      const data = await response.json();
      console.log('Datos recibidos:', data); // Para debug
      
      // CORRECCIÓN: Acceder correctamente a la estructura de datos
      if (data && data.cpu && data.ram) {
        const newMetric = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          cpu: parseFloat(data.cpu.porcentajeUso) || 0,
          ram: parseFloat(data.ram.porcentajeUso) || 0,
          ramUsed: parseFloat(data.ram.uso) || 0,
          ramTotal: parseFloat(data.ram.total) || 0
        };

        setCurrentMetrics({
          cpu: newMetric.cpu,
          ram: newMetric.ram,
          ramUsed: newMetric.ramUsed,
          ramTotal: newMetric.ramTotal
        });

        setMetrics(prev => {
          const updated = [...prev, newMetric];
          return updated.slice(-timeRange);
        });

        setConnectionStatus('online');
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        console.warn('Estructura de datos inesperada:', data);
        setConnectionStatus('offline');
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setConnectionStatus('offline');
    }
  };

  const clearData = () => {
    setMetrics([]);
    setCurrentMetrics({ cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0 });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
    setMetrics(prev => prev.slice(-newRange));
  };

  useEffect(() => {
    // Fetch inicial
    fetchLatestMetrics();
    
    // Configurar intervalo
    intervalRef.current = setInterval(fetchLatestMetrics, 5000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, timeRange]);

  const getStatusColor = () => {
    return connectionStatus === 'online' ? '#10b981' : '#ef4444';
  };

  const getProgressColor = (percentage, type) => {
    if (type === 'cpu') {
      if (percentage > 80) return '#ef4444';
      if (percentage > 60) return '#f59e0b';
      return '#10b981';
    } else {
      if (percentage > 85) return '#ef4444';
      if (percentage > 70) return '#f59e0b';
      return '#3b82f6';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'white',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '20px 30px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
            🖥️ Monitor de Sistema
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(),
              boxShadow: `0 0 10px ${getStatusColor()}`
            }}></div>
            <span style={{ fontSize: '14px', opacity: '0.9' }}>
              {connectionStatus === 'online' ? 'Conectado' : 'Desconectado'}
            </span>
            <span style={{ fontSize: '12px', opacity: '0.7' }}>
              {lastUpdate}
            </span>
          </div>
        </header>

        {/* Métricas Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* CPU Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '25px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>CPU</h3>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {currentMetrics.cpu.toFixed(1)}%
              </span>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              height: '8px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${currentMetrics.cpu}%`,
                height: '100%',
                background: getProgressColor(currentMetrics.cpu, 'cpu'),
                borderRadius: '10px',
                transition: 'all 0.3s ease'
              }}></div>
            </div>
            <small style={{ opacity: '0.8' }}>Uso actual del procesador</small>
          </div>

          {/* RAM Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '25px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>RAM</h3>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {currentMetrics.ram.toFixed(1)}%
              </span>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              height: '8px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${currentMetrics.ram}%`,
                height: '100%',
                background: getProgressColor(currentMetrics.ram, 'ram'),
                borderRadius: '10px',
                transition: 'all 0.3s ease'
              }}></div>
            </div>
            <small style={{ opacity: '0.8' }}>
              {currentMetrics.ramUsed.toFixed(0)} MB / {currentMetrics.ramTotal.toFixed(0)} MB
            </small>
          </div>
        </div>

        {/* Gráfica */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '25px',
          marginBottom: '30px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Métricas Combinadas</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="rgba(255,255,255,0.8)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.8)"
                fontSize={12}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="CPU %"
              />
              <Line 
                type="monotone" 
                dataKey="ram" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="RAM %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Controles */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '20px',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          marginBottom: '30px'
        }}>
          <button
            onClick={togglePause}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: isPaused ? '#10b981' : '#f59e0b',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {isPaused ? 'Reanudar' : 'Pausar'}
          </button>
          
          <button
            onClick={clearData}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Limpiar
          </button>
          
          <button
            onClick={fetchLatestMetrics}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Actualizar
          </button>
          
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(Number(e.target.value))}
            style={{
              padding: '10px 15px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <option value={20} style={{ color: 'black' }}>Últimos 20 registros</option>
            <option value={50} style={{ color: 'black' }}>Últimos 50 registros</option>
            <option value={100} style={{ color: 'black' }}>Últimos 100 registros</option>
          </select>
        </div>

        {/* Footer */}
        <footer style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '15px 25px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: '0.9' }}>
            Monitor de Sistema - Datos actualizados cada 5 segundos
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', opacity: '0.8' }}>
            <span>Registros CPU: {metrics.length}</span>
            <span>Registros RAM: {metrics.length}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SystemMonitor;