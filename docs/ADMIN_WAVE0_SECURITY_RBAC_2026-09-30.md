# Portal ERP Jobs — Onda Admin 0: segurança, escopo e RBAC

**Data:** 30/09/2026  
**Branch:** `wave-admin0-security-rbac-20260930`  
**Base:** `main` após a Onda 8 (`d9c8c6d16f1e26dabb0b03a8c43861364a0b08e0`)

## Objetivo

Eliminar os bloqueios críticos encontrados na auditoria do Admin legado antes de avançar para a migração visual e funcional ao Next.js. Esta onda preserva o Flask como autoridade de dados e regras e mantém o Admin na SPA atual.

## Entregas

### 1. Escopo regional explícito

- Nova tabela `admin_sites` relaciona administradores e sites autorizados.
- Login e guards validam o site resolvido pelo servidor.
- Listagens e mutações de usuários, empresas, candidatos, vagas e administradores respeitam o site atual.
- Remover uma atribuição regional revoga imediatamente as famílias de sessão daquele administrador naquele site.
- Usuários e presenças regionais são suspensos sem exclusão física destrutiva.

### 2. Autoridade global separada

- `AdminRole.SUPER_ADMIN` continua sendo um papel regional.
- `admins.is_platform_admin` identifica, separadamente, quem pode administrar recursos globais.
- Somente um platform admin pode alterar atribuições de sites, administrar sites e modificar catálogos globais.
- Um super-admin regional não consegue autoatribuir outro site nem conceder autoridade global.
- O último platform admin ativo não pode ser removido ou desativado.

### 3. Migration fail-closed

A revisão `20260930_08`:

- exige o site `BR` antes de qualquer DDL;
- aborta antes de alterar o schema quando há mais de um `super_admin` ativo legado;
- promove no máximo o único super-admin ativo legado a platform admin;
- vincula administradores legados ao BR, único site ativo no lançamento atual;
- cria `admin_sites` e `admin_audit_events`;
- instala triggers SQLite que impedem `UPDATE` e `DELETE` na trilha administrativa.

Se o preflight produtivo encontrar mais de um super-admin ativo, o deploy deve parar sem migration e a autoridade global deve ser escolhida explicitamente antes de nova tentativa.

### 4. Auditoria administrativa

As mutações relevantes registram ator, site de origem, ação, tipo/id do alvo, campos não sensíveis alterados, prefixo de IP e hash do user-agent. A API de leitura:

- é paginada;
- exige `view_reports`;
- é filtrada pelo site atual;
- não expõe prefixo de IP nem fingerprint do navegador.

Catálogos e sites são marcados com `scope=platform` nos metadados de auditoria.

### 5. Contratos e lifecycle

- Aprovação e rejeição de empresas usam transições formais e motivo obrigatório na rejeição.
- Atalhos de ativação não promovem empresas pendentes.
- Alteração de senha administrativa aplica a política forte e revoga sessões.
- O Admin não edita e-mail global por uma rota regional.
- Perfil global de candidato multissite é somente leitura para administradores regionais; campos regionais permanecem administráveis.
- DTO de detalhe do candidato passou a devolver os links e campos efetivamente editáveis, evitando zerar dados ao salvar.
- O campo visual `experience_level`, sem persistência canônica, foi removido do formulário.
- As rotas legadas `/api/auth/admin/register` e `/api/auth/admin/list`, que contornavam os guards novos, foram removidas.

### 6. Dependências do SPA legado

Foram eliminadas vulnerabilidades altas e críticas detectadas no conjunto de produção:

- `jspdf` → `4.2.1`;
- `react-router-dom` → `7.18.4`;
- `vite` → `6.4.3`;
- remoção de `express`, que não era usado;
- overrides transitivos corrigidos para Rollup, Lodash, PostCSS, NanoID e Picomatch.

Permanecem apenas advisories de severidade baixa/moderada no audit atual. O runtime básico de geração de PDF foi validado após o upgrade principal.

## Matriz resumida de permissões

| Operação | Moderator | Admin regional | Super-admin regional | Platform admin |
|---|---:|---:|---:|---:|
| Relatórios do site | Sim | Sim | Sim | Sim |
| Candidatos e vagas do site | Sim | Sim | Sim | Sim |
| Empresas e usuários do site | Não | Sim | Sim | Sim |
| Aprovação de empresas | Não | Sim | Sim | Sim |
| Administradores do site | Não | Não | Sim | Sim |
| Atribuições entre sites | Não | Não | Não | Sim |
| Sites e catálogos globais | Não | Não | Não | Sim |

Permissões customizadas continuam sendo verificadas no backend. A interface legada ainda será refinada em onda posterior para ocultar módulos não autorizados antes do clique.

## Gates locais aprovados

- Backend: 61 testes em processos isolados — Admin 9, segurança 30, vagas 9, currículo 11 e equipe 2.
- Migration: upgrade, downgrade, novo upgrade, `alembic check`, backfill de platform admin, integridade e FKs.
- Migration fail-closed: múltiplos super-admins ativos abortam antes de criar coluna/tabelas.
- Auditoria append-only: tentativas de `UPDATE` e `DELETE` bloqueadas pelos triggers SQLite.
- Next: 22 testes, TypeScript e build.
- SPA Admin: ESLint focal e build Vite.
- Dependências: `pip-audit` sem vulnerabilidades conhecidas; `pnpm audit --prod --audit-level high` sem findings altos/críticos.
- jsPDF 4.2.1: smoke de geração de PDF aprovado.
- Revisão independente final: sem achados P0/P1 após as correções.

## Observação sobre a suíte

Os módulos backend usam `DATABASE_URL` temporário no import. Por isso, `unittest discover` em um único processo causa colisão de fixtures SQLite e erro de banco somente leitura. Os cinco módulos foram executados separadamente, em processos isolados, e todos passaram. A consolidação da infraestrutura de testes fica para onda posterior.

## Deploy e rollback

O deploy deve seguir `ops/DEPLOYMENT.md`, com backup transacional do banco e do código, preflight de administradores, migration antes de iniciar a nova API, smoke anônimo e autenticado e rollback conjunto de código/schema se qualquer gate falhar.

## Validação de produção

A release de código `e96063dd838b486da602289c161b5760717275ad` foi implantada no DigitalOcean em **30/09/2026 às 11:39 UTC**. O backup transacional aprovado está em `/var/backups/portal-erp-jobs/admin0-20260930T113818Z`.

As duas primeiras execuções foram interrompidas por gates do próprio script após encontrarem paths incorretos no smoke (`/api/sites` e `/api/auth/admin/login`). Em ambos os casos, o rollback automático restaurou código, banco em `20260929_07`, frontend e processos. A terceira execução, com `/api/admin/sites` e `/api/auth/login/admin`, concluiu com o marcador `admin0_deploy_ok`.

| Gate produtivo | Resultado |
|---|---|
| Alembic | `20260930_08 (head)`, sem drift |
| SQLite | `integrity_check=ok`, zero violações de FK |
| Platform admin | 1 ativo; 1 atribuição regional BR |
| Admin sem site ativo | 0 |
| Auditoria append-only | 2 triggers presentes |
| PM2 | API e Next online, zero restarts inesperados |
| Paridade de runtime | 14 arquivos alterados com hash idêntico ao commit implantado |
| HTTPS público | home, vagas, empresas, páginas legais, sitemap, robots e Admin = 200 |
| Rotas legadas | `/api/auth/admin/list` e `/api/auth/admin/register` = 404 |
| Proteção anônima | auditoria e mutação de sites = 401 |
| Setup | `/api/admin/setup` = 404 |
| Logs novos | zero traceback, erro crítico ou resposta 5xx |

O E2E autenticado usou uma conta sintética temporária `@example.invalid`, percorreu login, dashboard, empresas, candidatos e vagas e validou as APIs de auditoria, administradores e sites. Todas as sete verificações passaram. A conta, sua atribuição e sua sessão foram removidas; as contagens sintéticas finais são zero e não houve evento imutável gerado pela fixture.

**Estado atual:** Onda Admin 0 implantada e validada em produção. O PR só deve ser mesclado e tagueado após o registro destas evidências.
