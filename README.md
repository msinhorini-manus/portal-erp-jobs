# Portal ERP Jobs

Fonte canônica da plataforma **Portal ERP Jobs** implantada em `jobs.portalerp.com.br`.

## Arquitetura atual

| Diretório | Função |
|---|---|
| `next/` | Páginas públicas em Next.js 16 |
| `frontend/` | SPA React/Vite temporária para candidato, empresa e admin |
| `backend/portal_erp_jobs_api/` | API Flask e modelos SQLAlchemy |
| `ops/` | Configuração e documentação operacional |

O destino aprovado é uma única aplicação Next.js para todas as páginas, mantendo o Flask como autoridade de regras e o banco atual durante a primeira fase. A SPA é temporária e será portada por domínio.

## Segurança de configuração

O Flask falha fechado se `SECRET_KEY` ou `JWT_SECRET_KEY` tiverem menos de 32 caracteres. Valores reais nunca devem ser versionados. Use `.env.example` apenas como referência de nomes.

## Validação local

### Backend

```bash
cd backend/portal_erp_jobs_api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt pip-audit
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
.venv/bin/pip-audit -r requirements.txt
```

### Next.js

```bash
cd next
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
pnpm peers check
pnpm audit --prod
pnpm run build
```

## Regras de repositório

Banco, `.env`, uploads, logs, dependências e builds não entram no Git. Toda alteração deve passar por testes, CI, artefato de deploy e rollback documentado.
