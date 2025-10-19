"""
Seed data for Portal ERP Jobs
Populates initial configuration data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.main import app, db
from src.models.job import Skill

def seed_skills():
    """Seed initial skills/technologies"""
    
    skills_data = [
        # Linguagens de Programação
        {'name': 'Python', 'category': 'Linguagem de Programação'},
        {'name': 'JavaScript', 'category': 'Linguagem de Programação'},
        {'name': 'TypeScript', 'category': 'Linguagem de Programação'},
        {'name': 'Java', 'category': 'Linguagem de Programação'},
        {'name': 'C#', 'category': 'Linguagem de Programação'},
        {'name': 'PHP', 'category': 'Linguagem de Programação'},
        {'name': 'Ruby', 'category': 'Linguagem de Programação'},
        {'name': 'Go', 'category': 'Linguagem de Programação'},
        {'name': 'Rust', 'category': 'Linguagem de Programação'},
        {'name': 'Kotlin', 'category': 'Linguagem de Programação'},
        {'name': 'Swift', 'category': 'Linguagem de Programação'},
        
        # Frontend
        {'name': 'React', 'category': 'Frontend'},
        {'name': 'Vue.js', 'category': 'Frontend'},
        {'name': 'Angular', 'category': 'Frontend'},
        {'name': 'Next.js', 'category': 'Frontend'},
        {'name': 'Svelte', 'category': 'Frontend'},
        {'name': 'HTML5', 'category': 'Frontend'},
        {'name': 'CSS3', 'category': 'Frontend'},
        {'name': 'Tailwind CSS', 'category': 'Frontend'},
        {'name': 'Bootstrap', 'category': 'Frontend'},
        
        # Backend
        {'name': 'Node.js', 'category': 'Backend'},
        {'name': 'Django', 'category': 'Backend'},
        {'name': 'Flask', 'category': 'Backend'},
        {'name': 'FastAPI', 'category': 'Backend'},
        {'name': 'Spring Boot', 'category': 'Backend'},
        {'name': 'ASP.NET', 'category': 'Backend'},
        {'name': 'Laravel', 'category': 'Backend'},
        {'name': 'Ruby on Rails', 'category': 'Backend'},
        {'name': 'Express.js', 'category': 'Backend'},
        
        # Bancos de Dados
        {'name': 'PostgreSQL', 'category': 'Banco de Dados'},
        {'name': 'MySQL', 'category': 'Banco de Dados'},
        {'name': 'MongoDB', 'category': 'Banco de Dados'},
        {'name': 'Redis', 'category': 'Banco de Dados'},
        {'name': 'Oracle', 'category': 'Banco de Dados'},
        {'name': 'SQL Server', 'category': 'Banco de Dados'},
        {'name': 'Cassandra', 'category': 'Banco de Dados'},
        {'name': 'DynamoDB', 'category': 'Banco de Dados'},
        
        # DevOps e Cloud
        {'name': 'Docker', 'category': 'DevOps'},
        {'name': 'Kubernetes', 'category': 'DevOps'},
        {'name': 'AWS', 'category': 'Cloud'},
        {'name': 'Azure', 'category': 'Cloud'},
        {'name': 'Google Cloud', 'category': 'Cloud'},
        {'name': 'Jenkins', 'category': 'DevOps'},
        {'name': 'GitLab CI/CD', 'category': 'DevOps'},
        {'name': 'GitHub Actions', 'category': 'DevOps'},
        {'name': 'Terraform', 'category': 'DevOps'},
        {'name': 'Ansible', 'category': 'DevOps'},
        
        # ERPs e Softwares Empresariais
        {'name': 'SAP', 'category': 'ERP'},
        {'name': 'SAP ABAP', 'category': 'ERP'},
        {'name': 'SAP Fiori', 'category': 'ERP'},
        {'name': 'SAP HANA', 'category': 'ERP'},
        {'name': 'Oracle EBS', 'category': 'ERP'},
        {'name': 'Protheus', 'category': 'ERP'},
        {'name': 'RM Totvs', 'category': 'ERP'},
        {'name': 'Datasul', 'category': 'ERP'},
        {'name': 'Senior', 'category': 'ERP'},
        {'name': 'Salesforce', 'category': 'CRM'},
        {'name': 'Dynamics 365', 'category': 'ERP'},
        
        # Business Intelligence
        {'name': 'Power BI', 'category': 'BI'},
        {'name': 'Tableau', 'category': 'BI'},
        {'name': 'Looker', 'category': 'BI'},
        {'name': 'QlikView', 'category': 'BI'},
        
        # Mobile
        {'name': 'React Native', 'category': 'Mobile'},
        {'name': 'Flutter', 'category': 'Mobile'},
        {'name': 'iOS Development', 'category': 'Mobile'},
        {'name': 'Android Development', 'category': 'Mobile'},
        
        # Outras Tecnologias
        {'name': 'Git', 'category': 'Versionamento'},
        {'name': 'REST API', 'category': 'API'},
        {'name': 'GraphQL', 'category': 'API'},
        {'name': 'Microservices', 'category': 'Arquitetura'},
        {'name': 'Agile/Scrum', 'category': 'Metodologia'},
        {'name': 'Machine Learning', 'category': 'IA'},
        {'name': 'Data Science', 'category': 'Dados'},
    ]
    
    with app.app_context():
        # Verificar se já existem skills
        existing_count = Skill.query.count()
        if existing_count > 0:
            print(f"⚠️  Já existem {existing_count} skills no banco. Pulando seed.")
            return
        
        # Adicionar skills
        for skill_data in skills_data:
            skill = Skill(**skill_data)
            db.session.add(skill)
        
        db.session.commit()
        print(f"✅ {len(skills_data)} skills adicionadas com sucesso!")

if __name__ == '__main__':
    print("🌱 Iniciando seed de dados...")
    seed_skills()
    print("✅ Seed concluído!")

