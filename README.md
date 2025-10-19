# Portal ERP Jobs

Plataforma completa de gestão de vagas e currículos para o setor de software.

## Estrutura do Projeto

```
portal-erp-jobs/
├── backend/          # API Flask + PostgreSQL
└── frontend/         # React + Vite + TailwindCSS
```

## Deploy no Railway

### Backend (Flask API)

**Variáveis de Ambiente Necessárias:**
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=sua-chave-secreta-aqui
FLASK_ENV=production
PORT=5000
```

**Comando de Start:**
```
gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 portal_erp_jobs_api.src.main:app
```

### Frontend (React)

**Variáveis de Ambiente Necessárias:**
```
VITE_API_URL=https://seu-backend.railway.app/api
```

**Build Command:**
```
pnpm install && pnpm build
```

**Start Command:**
```
pnpm preview --host 0.0.0.0 --port $PORT
```

### PostgreSQL

O Railway fornece PostgreSQL automaticamente. A variável `DATABASE_URL` é injetada automaticamente.

## Funcionalidades

- ✅ CRUD completo de currículos
- ✅ CRUD de vagas
- ✅ Sistema de autenticação JWT
- ✅ Busca avançada de candidatos
- ✅ Busca avançada de vagas
- ✅ Dashboard para empresas e candidatos
- ✅ Construtor de currículo com preview em tempo real

## Tecnologias

**Backend:**
- Flask 3.0
- SQLAlchemy
- PostgreSQL
- JWT Authentication
- Gunicorn

**Frontend:**
- React 18
- Vite 6
- TailwindCSS
- React Router

## Autor

Desenvolvido por Manus AI
