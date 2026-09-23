# Portal ERP Jobs

Fonte canônica da plataforma **Portal ERP Jobs** implantada em `jobs.portalerp.com.br`.

## Arquitetura atual

| Diretório | Função |
|---|---|
| `next/` | Páginas públicas, autenticação e dashboards de candidatos e empresas em Next.js 16 |
| `frontend/` | SPA React/Vite temporária apenas para currículo candidato e Admin |
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

## Autenticação e área candidata

A autenticação candidata usa o BFF do Next em `/bff/*`. Access e refresh tokens nunca são devolvidos ao JavaScript do browser: ficam em cookies `HttpOnly`, `Secure` e `SameSite=Strict`. Mutações exigem double-submit CSRF. O access token expira em 15 minutos; o refresh, em sete dias, é rotativo e pertence a uma família persistida e revogável.

As rotas `/candidato/login`, `/candidato/cadastro` e `/candidato/dashboard` são servidas pelo Next. O currículo permanece temporariamente na SPA em `/candidato/curriculo`, mas todas as suas chamadas autenticadas passam pelo mesmo BFF e não usam JWT em `localStorage`.

A migration `20260922_05` cria `auth_session_families` e `users.password_changed_at`. Logout, troca e reset de senha revogam as famílias aplicáveis; reuso de refresh token revoga a cadeia inteira. Login e recuperação têm rate limiting e lockout persistente. Recuperação por e-mail só fica disponível quando SMTP ou Resend está completamente configurado; sem provedor, a API falha de forma segura com `503` e não cria token.

A especificação e as evidências da implementação estão em [`docs/WAVE3_CANDIDATE_AUTH_DASHBOARD_2026-09-22.md`](docs/WAVE3_CANDIDATE_AUTH_DASHBOARD_2026-09-22.md).

## Autenticação e área empresarial

A jornada empresarial também usa um BFF dedicado do Next em `/bff/company/*`, com cookies próprios `HttpOnly`, `Secure` e `SameSite=Strict`, proteção double-submit CSRF, refresh rotativo, logout revogável, allowlist de rotas e rejeição de autoridade regional ou empresarial enviada pelo browser. Login, cadastro, recuperação, dashboard, perfil, usuários, vagas e candidatos são servidos pelo Next.

O CRUD de vagas cobre criação, listagem privada, detalhe privado inclusive quando a vaga está pausada ou arquivada, atualização, ativação/pausa e arquivamento lógico. Benefícios e skills têm round-trip completo; a API aplica ownership, região, aprovação da empresa, quota ativa, estados de lifecycle e visibilidade pública. A migration `20260922_06` adiciona `status` e `is_featured` com backfill seguro.

O CRUD de currículo permanece com a interface temporária da SPA, mas usa exclusivamente o BFF candidato. Perfil, experiências, formações, skills, certificações, projetos e idiomas possuem create/read/update/delete autenticado, validação de ownership e payloads simétricos. A especificação e as evidências estão em [`docs/WAVE4_COMPANY_AND_CRUDS_2026-09-22.md`](docs/WAVE4_COMPANY_AND_CRUDS_2026-09-22.md).

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
