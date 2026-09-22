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

## Rollback

O rollback restaura o código da fotografia anterior, mantém uma cópia do banco pós-incidente e reinicia os processos. A restauração do banco só deve ocorrer quando houver corrupção ou migração de dados incompatível; mudanças apenas de código devem preservar os dados mais recentes.

## Observação da Onda 0

A rotação de `SECRET_KEY` e `JWT_SECRET_KEY` invalida tokens anteriores. Esse efeito é intencional e necessário para retirar de circulação credenciais assinadas com defaults previsíveis.
