# Camada de e-mails transacionais — Portal ERP Jobs

## Estado em 18/11/2026

**Implementada e homologada localmente; não publicada nem ativada em produção.** A alteração utiliza o backend Flask existente, sem criar outra plataforma, instalar serviços ou modificar o banco.

O usuário forneceu o contrato v1 em `api.md` e um exemplo de chamada. O contrato menciona `www.perpbr.com`; o exemplo usa **https://links.portalerp.com**. Foi realizado apenas `GET https://links.portalerp.com/api/v1/ping`, com o token do exemplo, sem seguir redirects: HTTP 200, token válido, conta padrão ativa e remetente identificado. Nenhum e-mail foi enviado. O token real não foi copiado para o repositório, exemplos, relatórios ou logs de aplicação.

## Arquitetura aproveitada

O Jobs já possuía `src/services/email.py`, com SMTP e Resend, usado pela recuperação de senha e pelos convites de equipe. Foi adicionada a opção `EMAIL_PROVIDER=portal_erp_api` ao mesmo serviço. Os provedores anteriores e a assinatura de `send_transactional_email` foram preservados.

Fluxo: evento/rota do Jobs → serviço central Flask → `POST /api/v1/enviar` → fila ou envio direto da conta padrão → provedor de e-mails.

A API externa já administra sua fila. Esta etapa não acrescenta Celery, Redis, cron, worker próprio ou outbox no banco. O envio permanece síncrono na solicitação do Jobs, com timeout de socket configurável; o timeout não constitui SLA de entrega nem deadline absoluto para a requisição inteira.

## Contrato implementado

O backend envia JSON UTF-8 com `email`, `assunto` e `mensagem` em HTML, para um único destinatário. Nome e campo From não são exigidos: a API usa sua conta padrão, não permite selecionar o remetente por chamada e gera a versão texto a partir do HTML.

São validados destinatário único até 255 caracteres, assunto até 255 caracteres, controles de cabeçalho e HTML até 2 MiB em UTF-8. Assuntos têm CR/LF normalizados. Os templates são renderizados no Jobs antes do POST. Blocos `{{...}}` remanescentes são recusados para evitar a substituição silenciosa documentada pela API. Nomes e atributos HTML de senha/convite são escapados.

Sucesso exige HTTP **201**, JSON objeto, `success=true`, ID inteiro positivo e status `PENDENTE` ou `ENVIADO`. Isso significa aceite pela API/fila ou entrega ao provedor, **não confirmação de chegada à caixa de entrada**. Logs contêm apenas ID e status do aceite, nunca destinatário, conteúdo, Bearer, links de senha ou convite.

Somente as origens HTTPS fornecidas no material são permitidas: `links.portalerp.com` e `www.perpbr.com`, na porta padrão/443. Userinfo, caminhos adicionais, query, fragmento, outras origens e tokens fora do formato exato `mail_` + 48 caracteres hexadecimais minúsculos são recusados. O transporte não segue redirects nem proxies herdados do ambiente. Respostas são lidas com limite de 64 KiB.

## Duplicidade e falhas

A API não é idempotente. Portanto, esta camada faz **uma única tentativa por chamada**, sem fallback automático para SMTP/Resend. Timeout, falha de rede, resposta 5xx e aceite 201 malformado são classificados como `EmailAcceptanceUnknown`: a mensagem pode já estar na fila e não deve ser repetida automaticamente.

Rejeições 4xx, incluindo autenticação, bloqueio de destinatário e limite 429, falham sem repetição automática. Não foi criado agendador de retries ou mecanismo distribuído de rate limit. A cota documentada de 120 chamadas/minuto por token é governada pelo serviço externo e pode ser alterada por seu administrador.

Essa abordagem não garante exatamente um e-mail por evento. O usuário pode submeter outra solicitação, ou pode haver falha entre aceite externo e commit local. Uma próxima etapa de notificações confiáveis deve avaliar outbox transacional, chave única por evento, estados de aceite desconhecido e reconciliação pelo histórico do provedor; ainda assim a API precisa de suporte de idempotência para eliminar a ambiguidade de retries.

## Links sensíveis e privacidade

Recuperação de senha e convite pela nova API ficam bloqueados até `MAIL_API_SENSITIVE_LINKS_APPROVED=true`. É uma confirmação operacional, **não um comando para desligar rastreamento na plataforma externa**. Primeiro o responsável deve verificar rastreamento de cliques/abertura, reescrita e exposição de links, permissões do histórico e retenção apropriada.

O contrato informa configurações de rastreamento gerais e uma conta padrão compartilhada. Não foi alterada qualquer configuração global da plataforma de e-mail; se não houver isolamento seguro para mensagens sensíveis, é necessário um canal/configuração transacional dedicado antes de liberar esses fluxos.

Quando o transporte sensível está bloqueado, recuperação responde igualmente para contas existentes e inexistentes, sem gerar token. Convites mantêm o fallback manual autorizado já existente. Os links continuam sendo construídos pelas rotas com contexto regional confiável; nenhuma URL de país foi alterada. O texto do convite passou a informar **72 horas**, em acordo com a validade real já definida em `INVITATION_TTL`; antes o e-mail dizia sete dias.

## Configuração futura — somente no servidor

```dotenv
EMAIL_PROVIDER=portal_erp_api
MAIL_API_BASE_URL=https://links.portalerp.com
MAIL_API_TOKEN=<token-exclusivo-do-Portal-ERP-Jobs>
MAIL_API_TIMEOUT_SECONDS=10
MAIL_API_SENSITIVE_LINKS_APPROVED=false
```

O placeholder de token acima não é uma credencial válida. Utilizar token exclusivo de **somente envio**, guardado no ambiente privado/cofre do backend, sem prefixos `NEXT_PUBLIC_` ou `VITE_`. `EMAIL_FROM` continua necessário para SMTP/Resend, mas não escolhe o remetente da nova API. A aprovação de links deve mudar para true somente após a verificação externa.

## Testes e escopo

**109 testes locais aprovados**, em quatro suítes isoladas: 53 do transporte API, 32 de segurança/autenticação, dois de equipe empresarial e 22 do contexto global/regional. Os testes do transporte bloqueiam sockets e usam respostas simuladas. Nenhum POST real foi enviado à API externa; os testes de rotas utilizam banco temporário, não produção.

Cobertura: configuração fechada, payload/Unicode/limites, timeout, 4xx/429/5xx, redirects, respostas malformadas ou excessivas, ausência de retries/fallback, logs sem dados sensíveis, bloqueio explícito de links, recuperação sem enumeração, aceite antes do commit e preservação de SMTP/Resend e rotas regionais.

Não foram alterados Next/SPA, DNS, Nginx, banco, cadastros, aprovação de empresas, candidaturas, membros ou países. O código base foi preservado em archive local antes da alteração. Os PRs anteriores continuam abertos e não foram mesclados.

## Próximas etapas

Para ativação: revisão do PR, token exclusivo e configuração do remetente/links na plataforma externa, novo backup da produção, staging no DigitalOcean, deploy manual isolado com rollback e teste de envio para um destinatário autorizado. A conexão validada por ping não substitui esse teste de aceite e entrega.

Cadastros de candidatos/empresas, aprovação/reprovação empresarial e avisos de candidatura **não passaram a enviar e-mails automaticamente nesta etapa**. Esses eventos exigem templates, regras de destinatário, semântica de consentimento quando aplicável e política de duplicidade próprias. Campanhas, newsletter e marketing não fazem parte desta camada transacional.
