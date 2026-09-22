"""
User model for Portal ERP Jobs
"""
from datetime import datetime, timedelta
import hashlib
import hmac
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from src.config import db

class User(db.Model):
    """User base model"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for social login
    user_type = db.Column(db.String(20), nullable=False)  # 'candidate', 'company', or 'admin'
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)  # Email verified

    # Social Login
    auth_provider = db.Column(db.String(20), default='email')  # 'email', 'google', 'linkedin'
    social_id = db.Column(db.String(255), nullable=True, index=True)  # ID from social provider

    # Password Reset
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

    # Email Verification
    verification_token = db.Column(db.String(255), nullable=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)

    # Security
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login = db.Column(db.DateTime, nullable=True)
    password_changed_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    candidate = db.relationship('Candidate', backref='user', uselist=False, cascade='all, delete-orphan')
    company = db.relationship('Company', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.utcnow()

    def revoke_all_sessions(self):
        """Revoke all JWT session families belonging to this user."""
        from src.models.session_family import SessionFamily

        if self.id is None:
            return 0
        return SessionFamily.revoke_all_for_user(self.id)

    def check_password(self, password):
        """Check if password matches"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def generate_reset_token(self):
        """Generate password reset token"""
        token = secrets.token_urlsafe(32)
        self.reset_token = hashlib.sha256(token.encode('utf-8')).hexdigest()
        self.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        return token

    def verify_reset_token(self, token):
        """Verify password reset token"""
        if not self.reset_token or not self.reset_token_expires:
            return False
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        if not hmac.compare_digest(self.reset_token, token_hash):
            return False
        if datetime.utcnow() > self.reset_token_expires:
            return False
        return True

    def clear_reset_token(self):
        """Clear password reset token"""
        self.reset_token = None
        self.reset_token_expires = None

    def generate_verification_token(self):
        """Generate email verification token"""
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        return self.verification_token

    def verify_email_token(self, token):
        """Verify email verification token"""
        if not self.verification_token or not self.verification_token_expires:
            return False
        if self.verification_token != token:
            return False
        if datetime.utcnow() > self.verification_token_expires:
            return False
        return True

    def clear_verification_token(self):
        """Clear email verification token"""
        self.verification_token = None
        self.verification_token_expires = None
        self.is_verified = True

    def is_locked(self):
        """Check if account is locked"""
        if self.locked_until and datetime.utcnow() < self.locked_until:
            return True
        return False

    def record_failed_login(self):
        """Record failed login attempt"""
        if self.locked_until and datetime.utcnow() >= self.locked_until:
            self.failed_login_attempts = 0
            self.locked_until = None
        self.failed_login_attempts = (self.failed_login_attempts or 0) + 1
        if self.failed_login_attempts >= 5:
            self.locked_until = datetime.utcnow() + timedelta(minutes=15)

    def record_successful_login(self):
        """Record successful login"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_login = datetime.utcnow()

    def __repr__(self):
        return f'<User {self.email}>'

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'user_type': self.user_type,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'auth_provider': self.auth_provider,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
