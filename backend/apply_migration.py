"""
Script to apply database migration for curriculo_publico field
"""
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'portal_erp_jobs_api'))

from src.config import db
from src.app import create_app

def apply_migration():
    """Apply the curriculo_publico migration"""
    app = create_app()
    
    with app.app_context():
        try:
            # Read migration SQL
            migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_curriculo_publico.sql')
            with open(migration_path, 'r') as f:
                sql = f.read()
            
            # Execute migration
            print("🔄 Applying migration: add_curriculo_publico...")
            
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
            
            for statement in statements:
                if statement:
                    print(f"   Executing: {statement[:50]}...")
                    db.session.execute(db.text(statement))
            
            db.session.commit()
            print("✅ Migration applied successfully!")
            
        except Exception as e:
            print(f"❌ Error applying migration: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    apply_migration()

