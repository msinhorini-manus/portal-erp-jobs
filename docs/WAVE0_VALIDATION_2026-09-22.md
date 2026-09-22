# Validação da Onda 0 — 22/09/2026

## Resultado

A contenção dos quatro bloqueadores P0 foi implantada em produção com rollback preparado.

| Controle | Resultado em produção |
|---|---|
| Secrets Flask/JWT | Rotacionados e presentes com comprimento mínimo; valores não registrados |
| Sessões anteriores | Invalidadas pela rotação JWT, conforme planejado |
| Recuperação de senha | Resposta pública não contém `_debug_token`; token pendente é removido enquanto o e-mail não estiver configurado |
| Mutations de catálogos | Requisição anônima retorna 401 |
| Endpoint HTTP de migração | Não registrado; retorna 404 |
| Bootstrap remoto de admin | Desativado por padrão; retorna 404 |
| CORS não confiável | Sem `Access-Control-Allow-Origin` |
| Next.js | 16.3.5 em produção |
| Open Graph | PNG 1200×630 responde 200 e metadata usa URL absoluta |
| Perfil de empresa | Nome canônico renderizado; não exibe `undefined` |
| Banco | `PRAGMA integrity_check` retornou `ok` |
| Processos | Flask e Next online no PM2 |
| Dependências Next | `pnpm audit --prod`: nenhuma vulnerabilidade conhecida |
| Dependências Python | `pip-audit`: nenhuma vulnerabilidade conhecida |
| Testes Flask | 7/7 aprovados |

## Rollback

Backup pré-deploy preservado em:

`/var/backups/portal-erp-jobs/wave0-20260922T152854Z`

O diretório contém cópia transacional do SQLite, fontes anteriores de backend/frontend/Next, Nginx, estado PM2 e checksums.

## Limitações conhecidas

O envio transacional de e-mail ainda não foi configurado. Por segurança, o endpoint de recuperação retorna resposta uniforme, mas não emite token utilizável. A configuração de CI está em `ops/ci.proposed.yml`; a credencial GitHub disponível não possui permissão `workflows` para ativá-la automaticamente.

Regionalização, unificação das áreas autenticadas no Next, modelo de sites e migração de dados começam nas ondas seguintes.
