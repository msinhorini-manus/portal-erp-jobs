"""
Script para corrigir candidatos com first_name ou last_name vazios
"""
import sys
import os

# Adicionar o diretório src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.config import db
from src.main import app
from src.models.candidate import Candidate

def fix_empty_names():
    """Corrige candidatos com first_name ou last_name vazios"""
    with app.app_context():
        # Buscar candidatos com nomes vazios
        candidates_with_empty_names = Candidate.query.filter(
            (Candidate.first_name == '') | 
            (Candidate.first_name == None) |
            (Candidate.last_name == '') |
            (Candidate.last_name == None)
        ).all()
        
        if not candidates_with_empty_names:
            print("✅ Nenhum candidato com nomes vazios encontrado!")
            return
        
        print(f"🔍 Encontrados {len(candidates_with_empty_names)} candidatos com nomes vazios:")
        
        for candidate in candidates_with_empty_names:
            print(f"\n📝 Candidato ID: {candidate.id}")
            print(f"   first_name: '{candidate.first_name}'")
            print(f"   last_name: '{candidate.last_name}'")
            
            # Corrigir nomes vazios
            if not candidate.first_name or candidate.first_name.strip() == '':
                candidate.first_name = 'Nome'
                print(f"   ✅ first_name corrigido para: 'Nome'")
            
            if not candidate.last_name or candidate.last_name.strip() == '':
                candidate.last_name = 'Pendente'
                print(f"   ✅ last_name corrigido para: 'Pendente'")
        
        # Salvar alterações
        try:
            db.session.commit()
            print(f"\n✅ {len(candidates_with_empty_names)} candidatos corrigidos com sucesso!")
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Erro ao salvar alterações: {str(e)}")
            raise

if __name__ == '__main__':
    print("🚀 Iniciando correção de nomes vazios...\n")
    fix_empty_names()
    print("\n✅ Script finalizado!")

