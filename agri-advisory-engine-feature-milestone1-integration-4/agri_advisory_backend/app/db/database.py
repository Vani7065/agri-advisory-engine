from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
from app.core.logger import logger

try:
    # pool_pre_ping=True checks the connection viability before executing queries
    # essential for cloud databases like Supabase which can drop idle links
    engine = create_engine(
        settings.DATABASE_URL, 
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    logger.info("Database engine initialized successfully.")
except Exception as e:
    logger.error(f"Error initializing database engine: {str(e)}")
    raise e

# Dependency to get DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()