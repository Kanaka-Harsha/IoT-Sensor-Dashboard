import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load .env file from root directory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

DB_HOST = os.getenv("DATABASE_HOST", "localhost")
DB_PORT = int(os.getenv("DATABASE_PORT", 5432))
DB_NAME = os.getenv("DATABASE_NAME", os.getenv("WATER_DATABASE_NAME", "water_quality_data"))
DB_USER = os.getenv("DATABASE_USER", "postgres")
DB_PASS = os.getenv("DATABASE_PASS", "password123")

logger = logging.getLogger("db_module")

def get_db_connection(database=None):
    """Establishes and returns a psycopg2 connection to PostgreSQL."""
    target_db = database if database else DB_NAME
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=target_db,
        user=DB_USER,
        password=DB_PASS
    )
    return conn

def create_database_if_not_exists():
    """Connects to default postgres database and creates target DB if missing."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname="postgres",
            user=DB_USER,
            password=DB_PASS
        )
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (DB_NAME,))
            exists = cur.fetchone()
            if not exists:
                cur.execute(f'CREATE DATABASE "{DB_NAME}";')
                logger.info(f"Database '{DB_NAME}' created successfully.")
        conn.close()
    except Exception as e:
        logger.warning(f"Could not check/create database '{DB_NAME}': {e}")

def init_db():
    """Initializes tables for water quality, air quality, and Pi 4 temperature in the PostgreSQL database using raw SQL."""
    create_database_if_not_exists()
    
    create_water_quality_table = """
    CREATE TABLE IF NOT EXISTS water_quality (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        turbidity REAL,
        ph REAL,
        tds_ppm REAL
    );
    """
    
    create_air_quality_table = """
    CREATE TABLE IF NOT EXISTS air_quality (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        temperature_c REAL,
        humidity REAL,
        pm25 REAL,
        pm10 REAL,
        co2 REAL,
        aqi REAL
    );
    """

    create_pi4_temperature_table = """
    CREATE TABLE IF NOT EXISTS pi4_temperature (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        temperature_c REAL
    );
    """

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(create_water_quality_table)
            cur.execute(create_air_quality_table)
            cur.execute(create_pi4_temperature_table)
            # Migration check: ensure 'turbidity' column exists if table was previously created
            cur.execute("ALTER TABLE water_quality ADD COLUMN IF NOT EXISTS turbidity REAL;")
        conn.commit()
        logger.info("Database tables 'water_quality', 'air_quality', and 'pi4_temperature' verified/created successfully.")
    except Exception as e:
        conn.rollback()
        logger.error(f"Error initializing database tables: {e}")
        raise e
    finally:
        conn.close()

def execute_query(query, params=None, fetchone=False, fetchall=False, commit=False):
    """
    Executes a raw SQL query using RealDictCursor and handles connections safely.
    Returns dictionary / list of dictionaries for JSON serialization.
    """
    conn = get_db_connection()
    result = None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params or ())
            if fetchone:
                result = cur.fetchone()
                if result:
                    result = dict(result)
            elif fetchall:
                result = [dict(row) for row in cur.fetchall()]
        if commit:
            conn.commit()
    except Exception as e:
        if commit:
            conn.rollback()
        logger.error(f"SQL execution error on query: {query} -> {e}")
        raise e
    finally:
        conn.close()
    return result
