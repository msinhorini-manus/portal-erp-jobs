"""
Configuration file for Portal ERP Jobs API
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get base directory
BASE_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

class Config:
    """Base configuration"""
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'portal_erp_jobs_secret_key_default')
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Database
    # Use SQLite with absolute path
    db_path = os.path.join(BASE_DIR, 'database', 'app.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{db_path}'
    )
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt_secret_key_default')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 86400)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES', 604800)))
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # Application
    APP_NAME = os.getenv('APP_NAME', 'Portal ERP Jobs')
    APP_VERSION = os.getenv('APP_VERSION', '1.0.0')




# Database instance
from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()

