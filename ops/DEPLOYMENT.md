# Deploy e rollback

## Serviços de produção

| Serviço | Processo | Porta |
|---|---|---:|
| API Flask/Gunicorn | `portal-erp-jobs-api` | 5000 |
| Next.js público | `portal-erp-next` | 3001 |
| Proxy/TLS | Nginx | 80/443 |

## Ordem segura

1. Criar backup transacional do SQLite e arquivos de código.
2. Validar `SHA256SUMS` e `PRAGMA integrity_check`.
3. Instalar dependências em diretórios de release, nunca sobre o processo ativo.
4. Executar testes e builds.
5. Trocar a release e reiniciar um processo por vez.
6. Validar health, rotas públicas, autenticação e controles de segurança.
7. Executar `pm2 save` somente após o smoke test.

## Migrações Alembic

O banco legado deve ser marcado uma única vez na baseline antes do primeiro upgrade regional:

```bash
cd /var/www/portal-erp-jobs/backend/portal_erp_jobs_api
venv/bin/alembic stamp 20260922_01
venv/bin/alembic upgrade head
venv/bin/alembic current
```

Antes do `stamp`, confirme que a base possui o schema legado e não possui `alembic_version`. Antes e depois do upgrade, execute `PRAGMA integrity_check` e `PRAGMA foreign_key_check` em cópia ou por script operacional somente leitura. A revisão `20260922_02` cria `sites`, `site_domains`, `site_locales`, cadastra doze regiões, ativa somente `BR` e vincula todas as vagas legadas ao Brasil.

As revisões seguintes são cumulativas:

| Revisão | Mudança |
|---|---|
| `20260922_03` | Presenças regionais de empresas e candidatos, com backfill BR e owner empresarial |
| `20260922_04` | Constraints compostas de site, estados de candidatura e histórico auditável |
| `20260922_05` | Famílias de sessão JWT rotativas e `password_changed_at` para revogação global |
| `20260922_06` | Lifecycle explícito de vagas com `status`, `is_featured`, constraints e backfill |

Antes de reiniciar a API após `20260922_06`, confirme: `alembic current`, `integrity_check=ok`, `foreign_key_check` vazio, existência de `auth_session_families`, `users.password_changed_at`, `jobs.status` e `jobs.is_featured`, todas as empresas/candidatos legados com presença BR, todas as vagas/candidaturas com `site_id` BR e nenhuma inconsistência entre `jobs.status` e `jobs.is_active`. O código da Onda 4 não deve iniciar sobre uma base anterior a `20260922_06`.

O Next deve iniciar com `NEXT_INTERNAL_API_ORIGIN=http://127.0.0.1:5000`. Esse endereço é somente server-side. Chamadas internas transportam o domínio regional em `X-Regional-Host`; o Flask aceita esse cabeçalho apenas por loopback, e o Nginx remove qualquer valor enviado por clientes públicos.

O Nginx deve encaminhar `/bff/`, `/candidato/login`, `/candidato/cadastro` e `/candidato/dashboard` ao Next. `/candidato/curriculo` continua na SPA. Após o deploy, valide que o BFF não devolve `access_token` ou `refresh_token`, cookies de sessão têm `HttpOnly`, `Secure` e `SameSite=Strict`, mutações sem CSRF recebem `403`, refresh rotativo funciona e logout invalida a família.

Na Onda 4, o Nginx também encaminha ao Next `/empresa/login`, `/empresa/cadastro`, `/empresa/dashboard`, `/empresa/perfil`, `/empresa/usuarios`, `/empresa/vagas`, `/empresa/publicar-vaga` e `/empresa/candidatos`, incluindo suas subrotas. O namespace `/bff/company/*` usa cookies separados dos candidatos e só aceita rotas allowlisted. Após o deploy, valide o ciclo de vaga **criar → ler → editar → pausar → reativar → arquivar**, inclusive benefícios e skills, e confirme que vagas pausadas/arquivadas continuam visíveis apenas pelo detalhe privado empresarial.

O currículo candidato deve ser validado pelo BFF em sete superfícies: perfil completo, experiências, formações, skills, certificações, projetos e idiomas. Cada coleção deve passar por criação, leitura, atualização e exclusão; ownership cruzado deve permanecer bloqueado.

Recuperação de senha exige `EMAIL_PROVIDER=smtp` com `SMTP_*` ou `EMAIL_PROVIDER=resend` com `RESEND_API_KEY`, além de `EMAIL_FROM`. Sem configuração completa, o comportamento esperado é `503` genérico sem token persistido. Não considere a entrega de e-mail homologada sem teste real no domínio remetente.

## Rollback

O rollback restaura o código da fotografia anterior, mantém uma cópia do banco pós-incidente e reinicia os processos. A restauração do banco só deve ocorrer quando houver corrupção ou migração de dados incompatível; mudanças apenas de código devem preservar os dados mais recentes.

Para rollback das migrações regionais, de autenticação ou de lifecycle de vagas, pare API e Next, preserve a base pós-incidente e restaure o snapshot SQLite feito imediatamente antes do upgrade. Os ciclos Alembic `20260922_05 → 20260922_04 → 20260922_05` e `20260922_06 → 20260922_05 → 20260922_06` foram validados em cópia da base real, mas não substituem o restore transacional em produção. Reverter apenas o código após a Onda 4 é incompatível com os contratos de lifecycle; prefira restaurar código e banco juntos.

## Observação da Onda 0

A rotação de `SECRET_KEY` e `JWT_SECRET_KEY` invalida tokens anteriores. Esse efeito é intencional e necessário para retirar de circulação credenciais assinadas com defaults previsíveis.
