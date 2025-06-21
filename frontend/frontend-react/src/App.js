import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const SystemMonitor = () => {
  const [metrics, setMetrics] = useState([]);
  const [processMetrics, setProcessMetrics] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({ cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0 });
  const [currentProcesses, setCurrentProcesses] = useState({ 
    total: 0, 
    corriendo: 0, 
    durmiendo: 0, 
    zombie: 0, 
    parados: 0 
  });
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [lastUpdate, setLastUpdate] = useState('Nunca');
  const [isPaused, setIsPaused] = useState(false);
  const [timeRange, setTimeRange] = useState(20);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'processes'
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
      console.log('Datos recibidos:', data);
      
      // Actualizar métricas de CPU y RAM
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
      }

      // Actualizar métricas de procesos
      if (data && data.procesos) {
        const processData = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          total: parseInt(data.procesos.total_procesos) || 0,
          corriendo: parseInt(data.procesos.procesos_corriendo) || 0,
          durmiendo: parseInt(data.procesos.procesos_durmiendo) || 0,
          zombie: parseInt(data.procesos.procesos_zombie) || 0,
          parados: parseInt(data.procesos.procesos_parados) || 0
        };

        setCurrentProcesses({
          total: processData.total,
          corriendo: processData.corriendo,
          durmiendo: processData.durmiendo,
          zombie: processData.zombie,
          parados: processData.parados
        });

        setProcessMetrics(prev => {
          const updated = [...prev, processData];
          return updated.slice(-timeRange);
        });
      }

      if (!data || (!data.cpu && !data.ram && !data.procesos)) {
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
    setProcessMetrics([]);
    setCurrentMetrics({ cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0 });
    setCurrentProcesses({ total: 0, corriendo: 0, durmiendo: 0, zombie: 0, parados: 0 });
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
    setMetrics(prev => prev.slice(-newRange));
    setProcessMetrics(prev => prev.slice(-newRange));
  };

  useEffect(() => {
    fetchLatestMetrics();
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

  const getProcessStatusColor = (type) => {
    const colors = {
      corriendo: '#10b981',
      durmiendo: '#3b82f6',
      zombie: '#ef4444',
      parados: '#f59e0b',
      total: '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  const TabButton = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        background: isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)'
      }}
    >
      {label}
    </button>
  );

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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          justifyContent: 'center'
        }}>
          <TabButton 
            id="overview" 
            label="📊 Recursos del Sistema" 
            isActive={activeTab === 'overview'} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="processes" 
            label="⚙️ Procesos del Sistema" 
            isActive={activeTab === 'processes'} 
            onClick={setActiveTab} 
          />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
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

            {/* Gráfica CPU/RAM */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '30px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Métricas de Recursos</h3>
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
          </>
        )}

        {/* Processes Tab */}
        {activeTab === 'processes' && (
          <>
            {/* Process Status Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '30px'
            }}>
              {[
                { key: 'total', label: 'Total', icon: '📊', value: currentProcesses.total },
                { key: 'corriendo', label: 'Ejecutándose', icon: '🟢', value: currentProcesses.corriendo },
                { key: 'durmiendo', label: 'En Espera', icon: '🔵', value: currentProcesses.durmiendo },
                { key: 'zombie', label: 'Zombie', icon: '🧟', value: currentProcesses.zombie },
                { key: 'parados', label: 'Detenidos', icon: '🟡', value: currentProcesses.parados }
              ].map(({ key, label, icon, value }) => (
                <div key={key} style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '15px',
                  padding: '20px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '12px', opacity: '0.8' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Process Timeline Chart */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '30px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Evolución de Procesos</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={processMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="rgba(255,255,255,0.8)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.8)"
                    fontSize={12}
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
                    dataKey="total" 
                    stroke={getProcessStatusColor('total')} 
                    strokeWidth={2}
                    dot={{ fill: getProcessStatusColor('total'), strokeWidth: 2, r: 4 }}
                    name="Total"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="corriendo" 
                    stroke={getProcessStatusColor('corriendo')} 
                    strokeWidth={2}
                    dot={{ fill: getProcessStatusColor('corriendo'), strokeWidth: 2, r: 4 }}
                    name="Ejecutándose"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="durmiendo" 
                    stroke={getProcessStatusColor('durmiendo')} 
                    strokeWidth={2}
                    dot={{ fill: getProcessStatusColor('durmiendo'), strokeWidth: 2, r: 4 }}
                    name="En Espera"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="zombie" 
                    stroke={getProcessStatusColor('zombie')} 
                    strokeWidth={2}
                    dot={{ fill: getProcessStatusColor('zombie'), strokeWidth: 2, r: 4 }}
                    name="Zombie"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="parados" 
                    stroke={getProcessStatusColor('parados')} 
                    strokeWidth={2}
                    dot={{ fill: getProcessStatusColor('parados'), strokeWidth: 2, r: 4 }}
                    name="Detenidos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Current Process Distribution */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '25px',
              marginBottom: '30px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Distribución Actual de Procesos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Ejecutándose', value: currentProcesses.corriendo, fill: getProcessStatusColor('corriendo') },
                  { name: 'En Espera', value: currentProcesses.durmiendo, fill: getProcessStatusColor('durmiendo') },
                  { name: 'Zombie', value: currentProcesses.zombie, fill: getProcessStatusColor('zombie') },
                  { name: 'Detenidos', value: currentProcesses.parados, fill: getProcessStatusColor('parados') }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.8)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.8)"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

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
            <span>Registros Sistema: {metrics.length}</span>
            <span>Registros Procesos: {processMetrics.length}</span>
            <span>Total Procesos: {currentProcesses.total}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SystemMonitor;