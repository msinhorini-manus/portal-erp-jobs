# Onda 1 — contexto regional único

**Data:** 22 de setembro de 2026
**Escopo:** modelo regional, contrato Flask e consumo inicial no Next.js.

## Resultado

A plataforma passa a possuir uma fonte de verdade regional no mesmo banco. Foram adicionadas as entidades `sites`, `site_domains` e `site_locales`; a vaga passa a carregar `site_id`, derivado pelo Flask e nunca aceito como autoridade do navegador.

O catálogo inicial contém os doze sites regionais aprovados: Brasil, México, Argentina, Colômbia, Chile, Peru, Equador, Espanha, Portugal, Estados Unidos, Canadá e Austrália. Somente o Brasil está ativo. O México está pré-configurado com `es-MX`, `MXN` e `America/Mexico_City`, porém sem domínio e invisível no seletor público.

## Contrato

| Campo | Brasil | México |
|---|---|---|
| `code` | `BR` | `MX` |
| `country_code` | `BR` | `MX` |
| `locale` | `pt-BR` | `es-MX` |
| `currency_code` | `BRL` | `MXN` |
| `timezone` | `America/Sao_Paulo` | `America/Mexico_City` |
| `canonical_origin` | `https://jobs.portalerp.com.br` | Não definido |
| `is_active` | Sim | Não |

`GET /api/context` entrega o site atual; `GET /api/sites` entrega somente sites ativos; `/api/admin/sites` é restrito a superadministradores. Host desconhecido ou site inativo falha fechado. `site_id`, `siteCode` e cabeçalhos equivalentes enviados pelo browser são rejeitados.

## Migração e validação

A revisão Alembic `20260922_01` registra o schema legado e `20260922_02` aplica o modelo regional. A migração foi executada em uma cópia da base real de produção: dez usuários, quatro empresas, duas vagas e cinco candidaturas foram preservados; as duas vagas foram vinculadas ao Brasil; `PRAGMA integrity_check` retornou `ok`; `PRAGMA foreign_key_check` não retornou violações; e `alembic check` não detectou diferenças entre ORM e schema.

O backend concluiu 14 testes automatizados. O Next concluiu quatro testes unitários, TypeScript sem erros e build de produção. No smoke integrado local, home, `/vagas` e `/sitemap.xml` retornaram 200; o HTML apresentou `lang=pt-BR` e `og:locale=pt_BR`; o seletor mostrou somente Brasil; e o sitemap não incluiu México.

## Gate para ativar México

México só pode mudar para ativo depois de domínio e TLS aprovados, origem canônica cadastrada, traduções completas em espanhol, taxonomias localizadas, escopo regional aplicado a empresas/candidaturas e fluxos E2E homologados. A ativação deve ser feita no CRUD administrativo e exige um domínio primário ativo e o locale default cadastrado.
