"""
Admin model for Portal ERP Jobs
"""
from datetime import datetime
from src.config import db

class Admin(db.Model):
    """Admin model"""
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='admin')  # 'admin', 'super_admin', 'moderator'
    permissions = db.Column(db.JSON, default=lambda: {
        'manage_users': True,
        'manage_jobs': True,
        'manage_tags': True,
        'manage_areas': True,
        'manage_levels': True,
        'manage_modalities': True,
        'manage_technologies': True,
        'manage_softwares': True
    })
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user = db.relationship('User', backref='admin', uselist=False)
    
    def __repr__(self):
        return f'<Admin {self.name}>'
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'role': self.role,
            'permissions': self.permissions,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

