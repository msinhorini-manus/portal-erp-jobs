"""
Endpoint temporário para executar migrações
"""
from flask import Blueprint, jsonify
from src.config import db

migrate_bp = Blueprint('migrate', __name__, url_prefix='/api/migrate')

@migrate_bp.route('/add-area-column', methods=['POST'])
def add_area_column():
    """
    Adicionar coluna area à tabela jobs
    Este é um endpoint temporário para migração
    """
    try:
        # SQL para adicionar coluna
        sql = """
        ALTER TABLE jobs ADD COLUMN IF NOT EXISTS area VARCHAR(100);
        CREATE INDEX IF NOT EXISTS idx_jobs_area ON jobs(area);
        """
        
        # Executar SQL
        db.session.execute(db.text(sql))
        db.session.commit()
        
        # Verificar se foi criada
        verify_sql = """
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'area';
        """
        
        result = db.session.execute(db.text(verify_sql)).fetchone()
        
        if result:
            return jsonify({
                'message': 'Coluna area adicionada com sucesso',
                'column_info': {
                    'name': result[0],
                    'type': result[1],
                    'max_length': result[2]
                }
            }), 200
        else:
            return jsonify({'error': 'Coluna não foi criada'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

