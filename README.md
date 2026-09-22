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

## Contrato regional

A plataforma usa **um Next.js, um Flask e um banco**. O Flask resolve o site pelo hostname cadastrado e entrega um contrato único com `code`, `country_code`, `locale`, `currency_code`, `timezone`, `canonical_origin` e `is_active`. O browser não pode informar `site_id` como autoridade.

O catálogo inicial possui doze sites (`BR`, `MX`, `AR`, `CO`, `CL`, `PE`, `EC`, `ES`, `PT`, `US`, `CA` e `AU`). Somente o Brasil está ativo. O México está preparado com `es-MX`, `MXN` e `America/Mexico_City`, mas permanece sem domínio, fora do seletor e sem indexação até homologação formal.

Endpoints:

- `GET /api/context`: contexto do site resolvido pelo servidor.
- `GET /api/sites`: somente sites públicos ativos.
- `/api/admin/sites`: CRUD protegido para superadministradores.

## Atores e candidaturas regionais

A identidade do usuário permanece global, mas suas regras operacionais pertencem ao site atual:

- `CompanySite`: aprovação, perfil público, membresia e limite de vagas;
- `CandidateSite`: ativação, descoberta opt-in, pretensão e disponibilidade;
- `Job.site_id`: vaga vinculada à presença regional da empresa;
- `Application.site_id`: candidatura vinculada simultaneamente à vaga e ao candidato do mesmo site;
- `ApplicationStatusEvent`: trilha de auditoria das mudanças de estado.

As migrations `20260922_03` e `20260922_04` implementam esse contrato. A especificação e as evidências estão em [`docs/WAVE2_REGIONAL_ACTORS_2026-09-22.md`](docs/WAVE2_REGIONAL_ACTORS_2026-09-22.md).

## Segurança de configuração

O Flask falha fechado se `SECRET_KEY` ou `JWT_SECRET_KEY` tiverem menos de 32 caracteres. Valores reais nunca devem ser versionados. Use `.env.example` apenas como referência de nomes.

## Validação local

### Backend

```bash
cd backend/portal_erp_jobs_api
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt pip-audit
.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
.venv/bin/alembic upgrade head
.venv/bin/alembic check
.venv/bin/pip-audit -r requirements.txt
```

### Next.js

```bash
cd next
corepack enable
corepack prepare pnpm@11.24.0 --activate
pnpm install --frozen-lockfile
pnpm peers check
pnpm test
pnpm audit --prod
pnpm run build
```

## Regras de repositório

Banco, `.env`, uploads, logs, dependências e builds não entram no Git. Toda alteração deve passar por testes, CI, artefato de deploy e rollback documentado.
