# Onda 3 — autenticação e dashboard candidato no Next.js

**Data:** 22 de setembro de 2026

## Resultado

A jornada principal do candidato foi migrada para o Next.js 16: login, cadastro, dashboard, perfil, privacidade, candidaturas, recuperação e redefinição de senha. O currículo permanece temporariamente na SPA, mas passou a usar a mesma sessão segura do Next por meio do BFF.

## Arquitetura de sessão

O browser acessa somente `/bff/*`. O BFF chama o Flask no loopback, preservando o host regional validado. JWTs não são expostos ao JavaScript nem persistidos em `localStorage`:

| Controle | Implementação |
|---|---|
| Access token | Cookie `pej_access`, `HttpOnly`, `Secure`, `SameSite=Strict`, 15 minutos |
| Refresh token | Cookie `pej_refresh`, `HttpOnly`, `Secure`, `SameSite=Strict`, 7 dias |
| CSRF | Cookie legível `pej_csrf` + header `X-CSRF-Token` em mutações |
| Rotação | Um único refresh JTI atual por família persistida |
| Reuso | Revoga toda a família e retorna `401` |
| Logout | Revoga a família, inclusive usando refresh quando o access expirou |
| Troca/reset de senha | Revoga todas as famílias do usuário |
| Contexto regional | Claims e família vinculados ao site resolvido pelo servidor |

A migration `20260922_05` cria `auth_session_families` e adiciona `users.password_changed_at`. O upgrade, downgrade para `20260922_04` e novo upgrade foram executados em cópia da base real, com `integrity_check=ok`, zero violações de FK e `alembic check` sem drift.

## Proteções adicionais

O backend passou a aplicar política de senha forte, lockout persistente após falhas, respostas sem enumeração nos logins e recuperação, rate limiting com limite de memória, reset one-use armazenado apenas como SHA-256 e revogação por mudança de senha. O endpoint de formação foi alinhado aos campos reais do modelo e logs de currículo com token/PII foram removidos.

O rate limiter atual é compatível com o Gunicorn de um worker. Antes de aumentar workers ou criar réplicas, seu estado deve migrar para Redis ou armazenamento compartilhado.

## Rotas

| Rota | Runtime |
|---|---|
| `/candidato/login` | Next.js |
| `/candidato/cadastro` | Next.js |
| `/candidato/dashboard` | Next.js |
| `/recuperar-senha` | Next.js |
| `/redefinir-senha` | Next.js |
| `/candidato/curriculo` | SPA temporária com BFF HttpOnly |
| `/bff/auth/*` | Route Handlers do Next |
| `/bff/candidate/*` | Proxy allowlisted do Next |

## Validação executada

- Backend: `compileall`, **28 testes**, `pip-audit` sem vulnerabilidades.
- Next.js: **10 testes**, TypeScript, build Next 16.3.5, peer check e `pnpm audit --prod` sem vulnerabilidades.
- SPA: lint dos três arquivos alterados, build e `npm audit --omit=dev` sem vulnerabilidades.
- Migração: upgrade/downgrade/re-upgrade sobre cópia da base real, integridade e FKs válidas, sem drift Alembic.
- Smoke integrado: cadastro `201`; ausência de JWT no JSON; cookies HttpOnly/Strict; `me`, perfil e currículo `200`; mutação sem CSRF `403`; mutação com CSRF `200`; refresh transparente `200`; reuso `401`; família revogada `401`; logout `200`; pós-logout `401`.
- Jornada de candidatura: aplicação `201`, listagem `200`, retirada `200`, estado final `withdrawn`.

## Limitação consciente

Não há provedor SMTP/Resend configurado no servidor. Por isso, a recuperação responde `503` genérico e não cria token. A implementação de entrega real está pronta, mas a funcionalidade só deve ser considerada operacional após configurar remetente/domínio e executar um envio real. Essa limitação não bloqueia login, cadastro, dashboard, candidatura, perfil ou currículo.
