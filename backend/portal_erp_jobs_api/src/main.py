"""
Portal ERP Jobs API - Main Application
"""
import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import timezone

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Import configuration
from src.config import Config, db

# Import i18n
from src.i18n import init_i18n

# Import all models
from src.models.user import User
from src.models.candidate import Candidate, CandidateSite, CandidateSkill
from src.models.company import Company, CompanySite
from src.models.job import Job, Skill
from src.models.application import Application, ApplicationStatusEvent
from src.models.experience import Experience
from src.models.education import Education
from src.models.certification import Certification
from src.models.project import Project
from src.models.language import Language
from src.models.site import Site, SiteDomain, SiteLocale
from src.models.session_family import SessionFamily

# Import routes
from src.routes.auth import auth_bp
from src.routes.candidates import candidates_bp
from src.routes.companies import companies_bp
from src.routes.jobs import jobs_bp
from src.routes.applications import applications_bp
from src.routes.resume import resume_bp
from src.routes.admin import admin_bp
from src.routes.stats import stats_bp
from src.routes.config import config_bp
from src.routes.sites import sites_bp
from src.regional_context import init_regional_context

# Initialize Flask app
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Load configuration
app.config.from_object(Config)

# Initialize extensions
CORS(app,
     resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
     supports_credentials=False)
jwt = JWTManager(app)

# Initialize database
db.init_app(app)


@jwt.token_in_blocklist_loader
def is_token_revoked(_jwt_header, jwt_payload):
    """Reject tokens outside an active persisted family or predating a password change."""
    family_id = jwt_payload.get("family_id")
    identity = jwt_payload.get("sub")
    if not family_id or identity is None:
        return True
    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return True

    family = SessionFamily.query.filter_by(family_id=family_id).first()
    if not family or family.user_id != user_id or not family.is_valid():
        return True

    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return True
    if user.password_changed_at:
        changed_at = user.password_changed_at
        if changed_at.tzinfo is None:
            changed_at = changed_at.replace(tzinfo=timezone.utc)
        try:
            if int(changed_at.timestamp()) > int(jwt_payload.get("iat", 0)):
                return True
        except (TypeError, ValueError, OverflowError):
            return True
    return False


@jwt.revoked_token_loader
def revoked_token_response(_jwt_header, _jwt_payload):
    return jsonify({"error": "Sessão inválida ou revogada. Faça login novamente."}), 401

# Resolve the authoritative regional site before locale and route handlers.
init_regional_context(app)

# Initialize i18n
init_i18n(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(candidates_bp)
app.register_blueprint(companies_bp)
app.register_blueprint(jobs_bp)
app.register_blueprint(applications_bp)
app.register_blueprint(resume_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(config_bp)
app.register_blueprint(sites_bp)

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

# Serve frontend - COMENTADO PARA SEPARAR BACKEND E FRONTEND
# O backend deve servir APENAS a API, não arquivos estáticos
# @app.route('/', defaults={'path': ''})
# @app.route('/<path:path>')
# def serve(path):
#     """Serve frontend static files"""
#     static_folder_path = app.static_folder
#     if static_folder_path is None:
#         return "Static folder not configured", 404
#
#     if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
#         return send_from_directory(static_folder_path, path)
#     else:
#         index_path = os.path.join(static_folder_path, 'index.html')
#         if os.path.exists(index_path):
#             return send_from_directory(static_folder_path, 'index.html')
#         else:
#             return jsonify({
#                 'message': 'Portal ERP Jobs API',
#                 'status': 'Frontend not deployed yet',
#                 'api_docs': '/api'
#             }), 200


if __name__ == '__main__':
    print(f"🚀 Starting {Config.APP_NAME} v{Config.APP_VERSION}")
    print(f"📍 Environment: {Config.DEBUG and 'Development' or 'Production'}")
    print(f"🔗 API available at: http://0.0.0.0:5000/api")
    print(f"🌍 i18n enabled: pt-BR, en-US, es-ES")

    app.run(host='0.0.0.0', port=5000, debug=Config.DEBUG)
