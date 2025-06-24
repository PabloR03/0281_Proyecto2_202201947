CREATE DATABASE IF NOT EXISTS metrics_db;
USE metrics_db;

CREATE TABLE IF NOT EXISTS system_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_ram INT NOT NULL,
    ram_libre INT NOT NULL,
    uso_ram INT NOT NULL,
    porcentaje_ram INT NOT NULL,
    porcentaje_cpu_uso INT NOT NULL,
    porcentaje_cpu_libre INT NOT NULL,
    procesos_corriendo INT NOT NULL,
    total_procesos INT NOT NULL,
    procesos_durmiendo INT NOT NULL,
    procesos_zombie INT NOT NULL,
    procesos_parados INT NOT NULL,
    hora VARCHAR(20) NOT NULL,
    timestamp_received DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp_received (timestamp_received),
    INDEX idx_hora (hora),
    INDEX idx_created_at (created_at)
);

-- Crear tabla para metadatos de las importaciones
CREATE TABLE IF NOT EXISTS import_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_records INT NOT NULL,
    collection_start DATETIME NOT NULL,
    collection_end DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(500) NOT NULL
);