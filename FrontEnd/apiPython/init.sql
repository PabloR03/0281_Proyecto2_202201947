-- Crear tabla para almacenar datos de monitoreo
CREATE TABLE IF NOT EXISTS monitoring_data (
    id SERIAL PRIMARY KEY,
    total_ram INTEGER NOT NULL,
    ram_libre INTEGER NOT NULL,
    uso_ram INTEGER NOT NULL,
    porcentaje_ram INTEGER NOT NULL,
    porcentaje_cpu_uso INTEGER NOT NULL,
    porcentaje_cpu_libre INTEGER NOT NULL,
    procesos_corriendo INTEGER NOT NULL,
    total_procesos INTEGER NOT NULL,
    procesos_durmiendo INTEGER NOT NULL,
    procesos_zombie INTEGER NOT NULL,
    procesos_parados INTEGER NOT NULL,
    hora TIMESTAMP NOT NULL,
    timestamp_received TIMESTAMP NOT NULL,
    api VARCHAR(50) DEFAULT 'Python',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para metadata
CREATE TABLE IF NOT EXISTS metadata (
    id SERIAL PRIMARY KEY,
    total_records INTEGER NOT NULL,
    collection_start TIMESTAMP NOT NULL,
    collection_end TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL,
    users INTEGER NOT NULL,
    generated_at TIMESTAMP NOT NULL,
    phase INTEGER NOT NULL,
    description TEXT,
    api VARCHAR(50) DEFAULT 'Python',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_monitoring_data_hora ON monitoring_data(hora);
CREATE INDEX IF NOT EXISTS idx_monitoring_data_timestamp ON monitoring_data(timestamp_received);
CREATE INDEX IF NOT EXISTS idx_metadata_collection_start ON metadata(collection_start);