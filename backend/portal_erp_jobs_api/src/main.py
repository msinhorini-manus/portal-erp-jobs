"""
Portal ERP Jobs API - Main Application
"""
import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Import configuration
from src.config import Config, db

# Import i18n
from src.i18n import init_i18n

# Import all models
from src.models.user import User
from src.models.candidate import Candidate, CandidateSkill
from src.models.company import Company
from src.models.job import Job, Skill
from src.models.application import Application
from src.models.experience import Experience
from src.models.education import Education
from src.models.certification import Certification
from src.models.project import Project
from src.models.language import Language

# Import routes
from src.routes.auth import auth_bp
from src.routes.candidates import candidates_bp
from src.routes.companies import companies_bp
from src.routes.jobs import jobs_bp
from src.routes.applications import applications_bp
from src.routes.resume import resume_bp

# Initialize Flask app
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Load configuration
app.config.from_object(Config)

# Initialize extensions
CORS(app, origins=['*'])  # Permitir todas as origens
jwt = JWTManager(app)

# Initialize i18n
init_i18n(app)

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(candidates_bp)
app.register_blueprint(companies_bp)
app.register_blueprint(jobs_bp)
app.register_blueprint(applications_bp)
app.register_blueprint(resume_bp)

# API root endpoint
@app.route('/api')
def api_root():
    """API root endpoint"""
    from flask import g
    from src.i18n import t
    
    return jsonify({
        'name': 'Portal ERP Jobs API',
        'version': '1.0.0',
        'status': 'running',
        'language': getattr(g, 'locale', 'pt-BR'),
        'supported_languages': ['pt-BR', 'en-US', 'es-ES'],
        'endpoints': {
            'auth': '/api/auth',
            'candidates': '/api/candidates',
            'companies': '/api/companies',
            'jobs': '/api/jobs',
            'applications': '/api/applications'
        }
    })

# Serve frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve frontend static files"""
    static_folder_path = app.static_folder
    if static_folder_path is None:
        return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return jsonify({
                'message': 'Portal ERP Jobs API',
                'status': 'Frontend not deployed yet',
                'api_docs': '/api'
            }), 200


# Create tables on first request
@app.before_request
def create_tables():
    """Create database tables before first request"""
    if not hasattr(app, 'tables_created'):
        with app.app_context():
            db.create_all()
            app.tables_created = True
            print("✅ Database tables created successfully!")


if __name__ == '__main__':
    print(f"🚀 Starting {Config.APP_NAME} v{Config.APP_VERSION}")
    print(f"📍 Environment: {Config.DEBUG and 'Development' or 'Production'}")
    print(f"🔗 API available at: http://0.0.0.0:5000/api")
    print(f"🌍 i18n enabled: pt-BR, en-US, es-ES")
    
    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ Database tables created!")
    
    app.run(host='0.0.0.0', port=5000, debug=Config.DEBUG)

