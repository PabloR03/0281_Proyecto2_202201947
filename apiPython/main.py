from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
from datetime import datetime
import os
from dotenv import load_dotenv
import psycopg
from typing import List, Optional

# Cargar variables de entorno
load_dotenv()

app = FastAPI(title="Monitoring Data API", version="1.0.0")

# Configuración de base de datos
DATABASE_URL = f"postgresql+psycopg://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelos de base de datos
class MonitoringData(Base):
    __tablename__ = "monitoring_data"
    
    id = Column(Integer, primary_key=True, index=True)
    total_ram = Column(Integer, nullable=False)
    ram_libre = Column(Integer, nullable=False)
    uso_ram = Column(Integer, nullable=False)
    porcentaje_ram = Column(Integer, nullable=False)
    porcentaje_cpu_uso = Column(Integer, nullable=False)
    porcentaje_cpu_libre = Column(Integer, nullable=False)
    procesos_corriendo = Column(Integer, nullable=False)
    total_procesos = Column(Integer, nullable=False)
    procesos_durmiendo = Column(Integer, nullable=False)
    procesos_zombie = Column(Integer, nullable=False)
    procesos_parados = Column(Integer, nullable=False)
    hora = Column(DateTime, nullable=False)
    timestamp_received = Column(DateTime, nullable=False)
    api = Column(String(50), default="Python")
    created_at = Column(DateTime, default=datetime.utcnow)

class Metadata(Base):
    __tablename__ = "metadata"
    
    id = Column(Integer, primary_key=True, index=True)
    total_records = Column(Integer, nullable=False)
    collection_start = Column(DateTime, nullable=False)
    collection_end = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    users = Column(Integer, nullable=False)
    generated_at = Column(DateTime, nullable=False)
    phase = Column(Integer, nullable=False)
    description = Column(Text)
    api = Column(String(50), default="Python")
    created_at = Column(DateTime, default=datetime.utcnow)

# Modelos Pydantic
class MonitoringDataRequest(BaseModel):
    total_ram: int
    ram_libre: int
    uso_ram: int
    porcentaje_ram: int
    porcentaje_cpu_uso: int
    porcentaje_cpu_libre: int
    procesos_corriendo: int
    total_procesos: int
    procesos_durmiendo: int
    procesos_zombie: int
    procesos_parados: int
    hora: str
    timestamp_received: str

class MonitoringDataResponse(BaseModel):
    id: int
    total_ram: int
    ram_libre: int
    uso_ram: int
    porcentaje_ram: int
    porcentaje_cpu_uso: int
    porcentaje_cpu_libre: int
    procesos_corriendo: int
    total_procesos: int
    procesos_durmiendo: int
    procesos_zombie: int
    procesos_parados: int
    hora: datetime
    timestamp_received: datetime
    api: str
    created_at: datetime

    class Config:
        from_attributes = True

class MetadataResponse(BaseModel):
    id: int
    total_records: int
    collection_start: datetime
    collection_end: datetime
    duration_minutes: int
    users: int
    generated_at: datetime
    phase: int
    description: Optional[str]
    api: str
    created_at: datetime

    class Config:
        from_attributes = True

# Función para obtener sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def parse_datetime(date_string: str) -> datetime:
    """Parsear diferentes formatos de fecha"""
    if not date_string:
        return datetime.utcnow()
    
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S"
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue
    
    # Si no se puede parsear, devolver datetime actual
    return datetime.utcnow()

@app.get("/")
async def root():
    return {"message": "Monitoring Data API", "version": "1.0.0", "api_type": "Python"}

# NUEVA RUTA: Recibir datos de monitoreo en tiempo real
@app.post("/monitoring-data")
async def create_monitoring_data(data: MonitoringDataRequest, db: Session = Depends(get_db)):
    """Recibir y almacenar datos de monitoreo en tiempo real"""
    try:
        print(f"Datos recibidos: {data}")  # Debug
        
        monitoring_obj = MonitoringData(
            total_ram=data.total_ram,
            ram_libre=data.ram_libre,
            uso_ram=data.uso_ram,
            porcentaje_ram=data.porcentaje_ram,
            porcentaje_cpu_uso=data.porcentaje_cpu_uso,
            porcentaje_cpu_libre=data.porcentaje_cpu_libre,
            procesos_corriendo=data.procesos_corriendo,
            total_procesos=data.total_procesos,
            procesos_durmiendo=data.procesos_durmiendo,
            procesos_zombie=data.procesos_zombie,
            procesos_parados=data.procesos_parados,
            hora=parse_datetime(data.hora),
            timestamp_received=parse_datetime(data.timestamp_received),
            api="Python",
            created_at=datetime.utcnow()
        )
        
        print(f"Objeto creado: {monitoring_obj}")  # Debug
        
        db.add(monitoring_obj)
        db.commit()
        db.refresh(monitoring_obj)
        
        return {
            "message": "Datos de monitoreo guardados exitosamente",
            "id": monitoring_obj.id,
            "timestamp": datetime.utcnow().isoformat(),
            "api": "Python"
        }
        
    except Exception as e:
        print(f"Error detallado: {str(e)}")  # Debug
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al guardar datos de monitoreo: {str(e)}")

@app.get("/monitoring-data", response_model=List[MonitoringDataResponse])
async def get_monitoring_data(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Obtener datos de monitoreo con paginación (más recientes primero)"""
    data = db.query(MonitoringData).order_by(MonitoringData.id.desc()).offset(skip).limit(limit).all()
    return data

@app.get("/monitoring-data/{data_id}", response_model=MonitoringDataResponse)
async def get_monitoring_data_by_id(data_id: int, db: Session = Depends(get_db)):
    """Obtener un registro específico de monitoreo"""
    data = db.query(MonitoringData).filter(MonitoringData.id == data_id).first()
    if not data:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return data

@app.get("/metadata", response_model=List[MetadataResponse])
async def get_metadata(db: Session = Depends(get_db)):
    """Obtener todos los metadatos"""
    metadata = db.query(Metadata).all()
    return metadata

@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Obtener estadísticas básicas de los datos"""
    total_records = db.query(MonitoringData).count()
    total_metadata = db.query(Metadata).count()
    
    if total_records > 0:
        from sqlalchemy import func
        
        avg_cpu = db.query(func.avg(MonitoringData.porcentaje_cpu_uso)).scalar()
        avg_ram = db.query(func.avg(MonitoringData.porcentaje_ram)).scalar()
        max_cpu = db.query(func.max(MonitoringData.porcentaje_cpu_uso)).scalar()
        max_ram = db.query(func.max(MonitoringData.porcentaje_ram)).scalar()
    else:
        avg_cpu = avg_ram = max_cpu = max_ram = 0
    
    return {
        "total_monitoring_records": total_records,
        "total_metadata_records": total_metadata,
        "average_cpu_usage": round(float(avg_cpu or 0), 2),
        "average_ram_usage": round(float(avg_ram or 0), 2),
        "max_cpu_usage": max_cpu or 0,
        "max_ram_usage": max_ram or 0,
        "api": "Python"
    }

@app.delete("/monitoring-data")
async def clear_monitoring_data(db: Session = Depends(get_db)):
    """Limpiar todos los datos de monitoreo"""
    deleted_monitoring = db.query(MonitoringData).count()
    deleted_metadata = db.query(Metadata).count()
    
    db.query(MonitoringData).delete()
    db.query(Metadata).delete()
    db.commit()
    
    return {
        "message": "Datos eliminados exitosamente",
        "deleted_monitoring_records": deleted_monitoring,
        "deleted_metadata_records": deleted_metadata,
        "api": "Python"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)