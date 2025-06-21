-- Crear tabla para métricas de CPU
CREATE TABLE IF NOT EXISTS cpu_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    porcentaje_uso DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para métricas de RAM
CREATE TABLE IF NOT EXISTS ram_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_mb BIGINT NOT NULL DEFAULT 0,
    libre_mb BIGINT NOT NULL DEFAULT 0,
    uso_mb BIGINT NOT NULL DEFAULT 0,
    porcentaje_uso DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para métricas combinadas
CREATE TABLE IF NOT EXISTS metrics_combined (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    total_ram BIGINT NOT NULL DEFAULT 0,
    ram_libre BIGINT NOT NULL DEFAULT 0,
    uso_ram BIGINT NOT NULL DEFAULT 0,
    porcentaje_ram DECIMAL(5,2) NOT NULL DEFAULT 0,
    porcentaje_cpu_uso DECIMAL(5,2) NOT NULL DEFAULT 0,
    porcentaje_cpu_libre DECIMAL(5,2) NOT NULL DEFAULT 0,
    procesos_corriendo INTEGER NOT NULL DEFAULT 0,
    total_procesos INTEGER NOT NULL DEFAULT 0,
    procesos_durmiendo INTEGER NOT NULL DEFAULT 0,
    procesos_zombie INTEGER NOT NULL DEFAULT 0,
    procesos_parados INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla para métricas de procesos
CREATE TABLE IF NOT EXISTS procesos_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    procesos_corriendo INTEGER NOT NULL DEFAULT 0,
    total_procesos INTEGER NOT NULL DEFAULT 0,
    procesos_durmiendo INTEGER NOT NULL DEFAULT 0,
    procesos_zombie INTEGER NOT NULL DEFAULT 0,
    procesos_parados INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cpu_metrics_timestamp ON cpu_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_ram_metrics_timestamp ON ram_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_combined_timestamp ON metrics_combined(timestamp);
CREATE INDEX IF NOT EXISTS idx_procesos_metrics_timestamp ON procesos_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_cpu_metrics_created_at ON cpu_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_ram_metrics_created_at ON ram_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_metrics_combined_created_at ON metrics_combined(created_at);
CREATE INDEX IF NOT EXISTS idx_procesos_metrics_created_at ON procesos_metrics(created_at);