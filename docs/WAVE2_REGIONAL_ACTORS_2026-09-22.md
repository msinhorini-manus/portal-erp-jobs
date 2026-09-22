# Onda 2 — empresas, candidatos e candidaturas regionais

**Data:** 22 de setembro de 2026

## Objetivo

A Onda 2 aplica o `site_id` resolvido pelo servidor às empresas, candidatos, vagas e candidaturas, preservando uma única identidade global por usuário e uma única base de dados. A região não é aceita do corpo, query string ou cabeçalho público; ela é derivada do `Host` e validada contra os claims da sessão JWT.

## Modelo entregue

| Entidade | Escopo | Regra principal |
|---|---|---|
| `Company` | Global | Identidade jurídica e conta compartilhada |
| `CompanySite` | Regional | Aprovação, apresentação pública, membresia e limite de vagas por site |
| `Candidate` | Global | Identidade e currículo reutilizável |
| `CandidateSite` | Regional | Ativação, descoberta opt-in, pretensão e disponibilidade por site |
| `Job` | Regional | Chave composta impede empresa sem presença no mesmo site |
| `Application` | Regional | Chaves compostas impedem vaga ou candidato de outro site |
| `ApplicationStatusEvent` | Regional por vínculo | Histórico imutável de criação e transições |

## Regras implementadas

1. **Empresa pendente não publica vaga.** A criação, edição, ativação e leitura de candidatos exigem uma presença `approved` no site atual.
2. **Limite de vagas é regional.** `max_active_jobs` pertence a `CompanySite` e é revalidado na criação e reativação.
3. **Candidato é privado por padrão.** O backfill cria `CandidateSite.is_discoverable = false`; o diretório público só lista opt-ins e nunca retorna e-mail, telefone, URL de currículo ou salário atual.
4. **Candidatura não cruza sites.** O banco impõe FKs compostas de `(job_id, site_id)` e `(candidate_id, site_id)`.
5. **Sessão não cruza sites.** Todas as rotas protegidas relevantes validam `site_id` e `site_code` do JWT contra o site resolvido do `Host`.
6. **Estados são auditáveis.** O fluxo canônico é `applied`, `reviewing`, `interview`, `accepted`, `rejected` ou `withdrawn`; transições inválidas retornam conflito e cada mudança gera evento.
7. **Remoções administrativas são regionais.** Empresa ou candidato são suspensos no site em vez de destruir identidade global e histórico.

## Migrações

| Revisão | Conteúdo |
|---|---|
| `20260922_03` | Cria `company_sites` e `candidate_sites`, backfilla Brasil e garante owner empresarial legado |
| `20260922_04` | Adiciona constraints compostas em vagas/candidaturas, normaliza estados e cria histórico |

O ensaio foi executado em banco vazio e em cópia da base real de produção. O ciclo `20260922_04 → 20260922_02 → 20260922_04` preservou as contagens, concluiu com `integrity_check=ok` e sem violações em `foreign_key_check`.

## Compatibilidade

A SPA protegida continua operacional nesta onda. Foram mantidas as rotas legadas `/api/applications/my-applications` e `PUT /api/applications/<id>`, e os dashboards foram atualizados para os estados canônicos. O fallback opcional da SPA foi adaptado ao Express 5.2.1. Dependências de produção da SPA foram atualizadas e o `npm audit --omit=dev` concluiu sem vulnerabilidades conhecidas.

## Validação

| Verificação | Resultado |
|---|---|
| Backend unitário/integração | 19 testes aprovados |
| Compilação Python | Aprovada |
| `pip-audit` | 0 vulnerabilidades conhecidas |
| Alembic em banco vazio | Head `20260922_04`, sem diff de metadata |
| Migração em cópia real | Aprovada; 4 empresas, 5 candidatos, 2 vagas e 5 candidaturas preservados |
| Downgrade/upgrade em cópia real | Aprovado |
| Next.js | 4 testes, TypeScript e build aprovados; 0 vulnerabilidades |
| SPA | Build aprovado; arquivos alterados sem erros de lint; 0 vulnerabilidades de produção |
| Smoke HTTP público | Contexto, vagas, empresas, candidatos e estatísticas em 200 |
| Smoke HTTP protegido | Perfil/currículo/candidaturas do candidato e empresa em 200 |

## Limite desta onda

A Onda 2 **não migra os dashboards protegidos da SPA para Next.js**. Ela estabiliza o contrato e as regras de dados que esses dashboards e sua futura implementação Next.js utilizarão. O México permanece inativo; ativá-lo exige domínio real, TLS, traduções completas e aceite operacional.
