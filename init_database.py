"""
Database initialization script.
Creates all necessary tables in PostgreSQL database.
Run this once before starting the application.
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "admin")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "TransactAI")

# First, connect to postgres database to create the target database if it doesn't exist
try:
    admin_engine = create_engine(f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/postgres")
    with admin_engine.connect() as conn:
        conn.execute(text("COMMIT"))
        # Check if database exists
        result = conn.execute(text(
            f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'"
        ))
        if not result.fetchone():
            conn.execute(text(f'CREATE DATABASE "{DB_NAME}"'))
            print(f"✅ Database '{DB_NAME}' created")
        else:
            print(f"✅ Database '{DB_NAME}' already exists")
except Exception as e:
    print(f"⚠️ Could not create database (may already exist): {e}")

# Now connect to the target database and create tables
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)

# Import models to register them with Base
from api.models import Base, Transaction, Feedback

try:
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    print("   - transactions")
    print("   - feedback")
except Exception as e:
    print(f"❌ Error creating tables: {e}")

