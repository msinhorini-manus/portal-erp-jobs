#!/usr/bin/env python3
"""
Script to create the first admin user for Portal ERP Jobs
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from portal_erp_jobs_api.src.main import app, db
from portal_erp_jobs_api.src.models import User, Admin
from werkzeug.security import generate_password_hash

def create_admin():
    """Create first admin user"""
    with app.app_context():
        # Check if admin already exists
        existing_admin = User.query.filter_by(user_type='admin').first()
        
        if existing_admin:
            print("❌ Admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            return
        
        # Get admin credentials from environment or use defaults
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@portalerpjobs.com')
        admin_password = os.getenv('ADMIN_PASSWORD', 'Admin@Portal2025!')
        admin_name = os.getenv('ADMIN_NAME', 'Administrador')
        
        try:
            # Create user
            admin_user = User(
                email=admin_email,
                password_hash=generate_password_hash(admin_password),
                user_type='admin',
                is_active=True
            )
            
            db.session.add(admin_user)
            db.session.flush()  # Get user ID
            
            # Create admin profile
            admin_profile = Admin(
                user_id=admin_user.id,
                name=admin_name,
                role='super_admin',
                permissions={
                    'manage_users': True,
                    'manage_jobs': True,
                    'manage_tags': True,
                    'manage_areas': True,
                    'manage_levels': True,
                    'manage_modalities': True,
                    'manage_technologies': True,
                    'manage_softwares': True
                }
            )
            
            db.session.add(admin_profile)
            db.session.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Email: {admin_email}")
            print(f"   Password: {admin_password}")
            print(f"   Name: {admin_name}")
            print("\n⚠️  IMPORTANT: Change the password after first login!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating admin user: {str(e)}")
            sys.exit(1)

if __name__ == '__main__':
    create_admin()

