# Onda 8 — legal, SEO técnico e equipe empresarial

**Data:** 29 de setembro de 2026

## Objetivo

Remover três bloqueios do gate de lançamento do Portal ERP Jobs:

1. publicar páginas institucionais e legais, com consentimento explícito e auditável nos cadastros;
2. completar SEO técnico, sitemap e dados estruturados das páginas públicas;
3. substituir o placeholder de usuários por gestão empresarial multiusuário com RBAC, convites e auditoria.

## Legal e consentimento

- Novas rotas públicas: `/sobre`, `/contato`, `/termos` e `/privacidade`.
- Cadastros de candidato e empresa exigem aceite explícito dos Termos e da Política de Privacidade.
- Os aceites são persistidos por usuário, site, tipo de documento e versão em `legal_acceptances`.
- O registro conserva data, prefixo de IP e hash do user-agent, sem armazenar IP completo.
- Versão documental inicial: `2026-09-29`.
- As fontes institucionais consultadas estão em `docs/WAVE8_LEGAL_SOURCES_2026-09-29.md`.

> O texto publicado é uma base operacional responsável e deve continuar sujeito à revisão jurídica formal da organização.

## SEO técnico

- Canonical explícito nas páginas públicas principais.
- Sitemap paginado para incluir todas as vagas e empresas públicas, além das páginas legais e institucionais.
- `JobPosting` enriquecido com URL canônica, organização contratante, localização, modalidade remota quando aplicável, vínculo, validade e salário quando disponível.
- `Organization` nos perfis públicos de empresas.
- `WebSite` e `Organization` na homepage.
- O hub `/conteudo` deixou de apontar para artigos inexistentes e agora referencia apenas destinos reais.
- Páginas de convite são `noindex, nofollow`.

## Gestão de equipe e RBAC

### Papéis

| Papel | Vagas | Candidatos/ATS | Perfil da empresa | Equipe |
|---|---|---|---|---|
| `owner` | ver e gerir | ver e gerir | gerir | gerir, inclusive promover owner |
| `admin` | ver e gerir | ver e gerir | gerir | gerir `hr` e `viewer` |
| `hr` | ver e gerir | ver e gerir | somente leitura | não |
| `viewer` | somente leitura | não | somente leitura | não |

### Convites

- Token aleatório de alta entropia; somente o hash SHA-256 é persistido.
- Expiração em 72 horas.
- Convite limitado ao site regional e à empresa autenticada.
- Criação, reenvio, cancelamento e aceite são auditados.
- Se o provedor de e-mail estiver configurado, o link é enviado ao destinatário e não volta na resposta.
- Sem provedor, owner/admin recebe um link manual temporário para compartilhamento direto.
- Consulta e aceite públicos têm rate limiting e respostas genéricas para falhas de autenticação.
- O preview público mostra o e-mail mascarado; eventos de auditoria não duplicam o endereço de e-mail em metadados JSON.

### Revogação e invariantes

- Desativar ou alterar o papel revoga todas as famílias de sessão do usuário.
- O callback JWT revalida membership ativa, empresa e site em toda requisição autenticada.
- Um usuário não pode pertencer simultaneamente a duas equipes empresariais ativas.
- A migration cria um índice parcial único para garantir essa regra também no SQLite e invalida tokens de convite legados armazenados em claro.
- Um owner não pode remover seu próprio acesso.
- A empresa nunca pode ficar sem ao menos um owner ativo.
- Administradores não alteram ou removem owners nem outros administradores.
- E-mails e a lista de membros ficam restritos a `manage_users`.

## Banco

A migration `20260929_07` cria:

- `company_invitations`;
- `company_audit_events`;
- `legal_acceptances`.

Também garante, de forma idempotente, o vínculo owner das empresas legadas que ainda não possuam `company_users` correspondente.

## Gates executados antes do release

- backend: segurança (30), vagas/filtros (9), currículo (11), equipe/legal (2);
- Next: Vitest (22), TypeScript e build de produção;
- migration 07 em SQLite novo e em cópia consistente da produção;
- `alembic check` sem drift, `integrity_check=ok`, zero violações de FK;
- browser integrado: quatro páginas públicas, consentimentos, convite, aceite, alteração de papel, bloqueio de viewer e revogação imediata;
- SEO integrado: canonicals, sitemap integral, links internos, `JobPosting` e `Organization`.
- dependências: `PyJWT 2.14.0`; `pip-audit`, `pnpm audit --prod` e `npm audit --omit=dev` sem vulnerabilidades conhecidas.

## Rollback

A revisão 07 adiciona tabelas e realiza backfill de owners. Em produção, o rollback seguro é restaurar conjuntamente o snapshot SQLite e os diretórios de código criados imediatamente antes do release; não executar downgrade destrutivo em um banco que já recebeu convites ou aceites reais.
