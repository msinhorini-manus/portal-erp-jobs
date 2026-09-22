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

Antes de reiniciar a API após `20260922_04`, confirme: `alembic current`, `integrity_check=ok`, `foreign_key_check` vazio, todas as empresas/candidatos legados com presença BR e todas as vagas/candidaturas com `site_id` BR. O código da Onda 2 não deve iniciar sobre uma base ainda em `20260922_02`.

O Next deve iniciar com `NEXT_INTERNAL_API_ORIGIN=http://127.0.0.1:5000`. Esse endereço é somente server-side. Chamadas internas transportam o domínio regional em `X-Regional-Host`; o Flask aceita esse cabeçalho apenas por loopback, e o Nginx remove qualquer valor enviado por clientes públicos.

## Rollback

O rollback restaura o código da fotografia anterior, mantém uma cópia do banco pós-incidente e reinicia os processos. A restauração do banco só deve ocorrer quando houver corrupção ou migração de dados incompatível; mudanças apenas de código devem preservar os dados mais recentes.

Para rollback das migrações regionais, pare API e Next, preserve a base pós-incidente e restaure o snapshot SQLite feito imediatamente antes do upgrade. O ciclo Alembic `20260922_04 → 20260922_02 → 20260922_04` foi validado em cópia da base real, mas não deve substituir o restore transacional em produção.

## Observação da Onda 0

A rotação de `SECRET_KEY` e `JWT_SECRET_KEY` invalida tokens anteriores. Esse efeito é intencional e necessário para retirar de circulação credenciais assinadas com defaults previsíveis.
