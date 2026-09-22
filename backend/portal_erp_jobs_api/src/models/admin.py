"""
Admin model for Portal ERP Jobs
"""
from datetime import datetime
from src.config import db

class AdminRole:
    """Admin role constants"""
    SUPER_ADMIN = 'super_admin'  # Full access, can manage other admins
    ADMIN = 'admin'  # Full access to content management
    MODERATOR = 'moderator'  # Limited access, can moderate content

class AdminPermission:
    """Admin permission constants"""
    # User Management
    MANAGE_ADMINS = 'manage_admins'
    MANAGE_CANDIDATES = 'manage_candidates'
    MANAGE_COMPANIES = 'manage_companies'
    APPROVE_COMPANIES = 'approve_companies'

    # Content Management
    MANAGE_JOBS = 'manage_jobs'
    MANAGE_TAGS = 'manage_tags'
    MANAGE_AREAS = 'manage_areas'
    MANAGE_LEVELS = 'manage_levels'
    MANAGE_MODALITIES = 'manage_modalities'
    MANAGE_TECHNOLOGIES = 'manage_technologies'
    MANAGE_SOFTWARES = 'manage_softwares'

    # Reports & Analytics
    VIEW_REPORTS = 'view_reports'
    EXPORT_DATA = 'export_data'

# Default permissions by role
DEFAULT_PERMISSIONS = {
    AdminRole.SUPER_ADMIN: {
        AdminPermission.MANAGE_ADMINS: True,
        AdminPermission.MANAGE_CANDIDATES: True,
        AdminPermission.MANAGE_COMPANIES: True,
        AdminPermission.APPROVE_COMPANIES: True,
        AdminPermission.MANAGE_JOBS: True,
        AdminPermission.MANAGE_TAGS: True,
        AdminPermission.MANAGE_AREAS: True,
        AdminPermission.MANAGE_LEVELS: True,
        AdminPermission.MANAGE_MODALITIES: True,
        AdminPermission.MANAGE_TECHNOLOGIES: True,
        AdminPermission.MANAGE_SOFTWARES: True,
        AdminPermission.VIEW_REPORTS: True,
        AdminPermission.EXPORT_DATA: True,
    },
    AdminRole.ADMIN: {
        AdminPermission.MANAGE_ADMINS: False,
        AdminPermission.MANAGE_CANDIDATES: True,
        AdminPermission.MANAGE_COMPANIES: True,
        AdminPermission.APPROVE_COMPANIES: True,
        AdminPermission.MANAGE_JOBS: True,
        AdminPermission.MANAGE_TAGS: True,
        AdminPermission.MANAGE_AREAS: True,
        AdminPermission.MANAGE_LEVELS: True,
        AdminPermission.MANAGE_MODALITIES: True,
        AdminPermission.MANAGE_TECHNOLOGIES: True,
        AdminPermission.MANAGE_SOFTWARES: True,
        AdminPermission.VIEW_REPORTS: True,
        AdminPermission.EXPORT_DATA: False,
    },
    AdminRole.MODERATOR: {
        AdminPermission.MANAGE_ADMINS: False,
        AdminPermission.MANAGE_CANDIDATES: True,
        AdminPermission.MANAGE_COMPANIES: False,
        AdminPermission.APPROVE_COMPANIES: False,
        AdminPermission.MANAGE_JOBS: True,
        AdminPermission.MANAGE_TAGS: False,
        AdminPermission.MANAGE_AREAS: False,
        AdminPermission.MANAGE_LEVELS: False,
        AdminPermission.MANAGE_MODALITIES: False,
        AdminPermission.MANAGE_TECHNOLOGIES: False,
        AdminPermission.MANAGE_SOFTWARES: False,
        AdminPermission.VIEW_REPORTS: True,
        AdminPermission.EXPORT_DATA: False,
    }
}

class Admin(db.Model):
    """Admin model"""
    __tablename__ = 'admins'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default=AdminRole.ADMIN)
    permissions = db.Column(db.JSON, default=lambda: DEFAULT_PERMISSIONS[AdminRole.ADMIN])

    # Profile
    avatar_url = db.Column(db.String(500), nullable=True)
    phone = db.Column(db.String(20), nullable=True)

    # Activity tracking
    last_activity = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)

    # Relationship
    user = db.relationship('User', backref='admin', uselist=False)

    def has_permission(self, permission):
        """Check if admin has a specific permission"""
        if self.role == AdminRole.SUPER_ADMIN:
            return True
        return self.permissions.get(permission, False)

    def set_role(self, role):
        """Set role and update permissions to defaults"""
        self.role = role
        self.permissions = DEFAULT_PERMISSIONS.get(role, DEFAULT_PERMISSIONS[AdminRole.MODERATOR])

    def update_permission(self, permission, value):
        """Update a specific permission"""
        if self.permissions is None:
            self.permissions = {}
        self.permissions[permission] = value

    def __repr__(self):
        return f'<Admin {self.name}>'

    def to_dict(self, include_permissions=False):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'role': self.role,
            'avatar_url': self.avatar_url,
            'phone': self.phone,
            'last_activity': self.last_activity.isoformat() if self.last_activity else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_permissions:
            data['permissions'] = self.permissions

        return data
