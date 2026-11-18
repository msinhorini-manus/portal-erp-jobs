# Portal ERP Jobs — Central de E-mails no Admin

**Data:** 18/11/2026. **Estado:** implementação concluída e validada localmente; ainda não publicada no servidor.

## Entrega e limites

Implementação na branch `feat-admin-email-center-20261118`, sobre `wave-transactional-mail-api-20261118`, base `c2d462fac23edaec268b4c7b99aa2ff8c3aa6d6a`. A entrega preserva a cadeia de PRs existente, sem merge em main ou deploy na DigitalOcean. O PR desta implementação deve ter como base a branch do PR #31, não main. O marcador histórico de produção da API `942eb49` é referência documental, não uma verificação atual do servidor.

A Central está integrada à SPA Admin existente, em **Configurações → Central de E-mails**, com rota `/admin/emails` sob o basename regional vigente. Não foi criado painel paralelo. Next/BFF, cadastro empresarial, candidaturas, banco vivo, DNS e configurações de transporte permanecem intactos.

## Funcionalidades implementadas

- Abas **Templates**, **Regras de disparo** e **Histórico**, com aviso persistente de indisponibilidade operacional.
- Catálogo fixo `application.created.company` nas versões **Português / English / Español**; interface geral em português. Listagem com filtros, metadados, estados editoriais e versões.
- Editor de nome, assunto, HTML e texto, catálogo de variáveis permitidas, validações de servidor e prévia desktop/mobile com dados fictícios. Prévia isolada por iframe sandbox e CSP, sem envio de e-mail.
- Rascunhos persistidos no Flask/SQLAlchemy, revisão otimista, publicação em snapshots imutáveis, inativação, comparação e restauração para novo rascunho. Restauração não reativa automaticamente um template inativo.
- Proteção de alterações não salvas, inclusive navegação interna e Voltar/Avançar do navegador; descarte explícito, confirmação com foco, bloqueio de ações concorrentes e preservação do texto em falhas/409. Prévia descarta respostas obsoletas; publicar exige rascunho salvo e sem divergência local.
- Regra de nova candidatura exibida em leitura: evento → responsável elegível da empresa/região → Brasil/pt-BR → template publicado, com os gates pendentes e motivo de bloqueio. Histórico de envios explicitamente indisponível, sem registros fictícios.
- Shell responsivo, sidebar recolhível, filtros empilhados, tabela rolável e editor/prévia alternáveis no mobile.

A Central prepara conteúdo e governança editorial. **Publicar uma versão não habilita `application.created`, processador, destinatários ou backlog.** Teste real e ativação de regra permanecem indisponíveis. English e Español são bases editoriais com `country_code=null`, não países ou sites ativados. Brasil/pt-BR permanece o único escopo proposto para o primeiro aviso empresarial.

## Migração e persistência

Migração aditiva Alembic **`20261118_13`**, sobre `20261111_12`, com duas tabelas editoriais e proteção de imutabilidade das versões. Não foi aplicada a banco vivo nesta tarefa. O catálogo de exemplo é disponibilizado em memória, sem gravação por GET; somente uma ação editorial explícita e autorizada materializa o rascunho. Uma edição concorrente retorna 409 sem sobrescrita silenciosa.

Os testes usam bancos SQLite temporários, incluindo upgrade e preservação das tabelas anteriores. A implementação contém proteção de imutabilidade específica para PostgreSQL, mas não foi executada em uma instância PostgreSQL nesta tarefa. Não se deve substituir essa homologação pelo resultado SQLite.

## Segurança operacional

Endpoints em `/api/admin/emails`, sem chamadas ao transporte de e-mails e sem endpoint de ativação. Capacidades distintas `email.view`, `email.edit`, `email.publish`, `email.rules` e `email.history`, com admin ativo, JWT regional e escopo validado no servidor. Acesso genérico ao Admin não concede essas capacidades automaticamente. Nenhuma permissão de conta existente foi alterada nesta tarefa.

Nesta fase, o catálogo e as ações editoriais são restritos ao país **BR**. Publicar/inativar exigem também administração de plataforma; concessão regional isolada não libera publicação global. Variantes English/Español não habilitam operação fora do Brasil.

HTML/variáveis/URLs passam por allowlists e escaping contextual. O CTA usa base regional confiável e área empresarial autenticada, sem query/token/fragmento. O editor não oferece destinatário livre, currículo, contatos de candidato, remetente ou credenciais. A auditoria editorial usa o mecanismo administrativo existente e é separada do histórico de tentativas de e-mail; erros são registrados de forma sanitizada.

## Validação executada

Checks locais no sandbox, sobre o código desta branch, sem dados reais de terceiros e sem envio externo. Nos testes específicos da Central, sockets externos são bloqueados.

| Check | Resultado |
| --- | --- |
| Central de E-mails: API, capacidades, CAS, versões, preview, segurança e migração | 11/11 |
| Regressão de country slug/migração | 6/6 |
| Regressão de URLs de vagas | 4/4 |
| Regressão de URLs de empresas | 7/7 |
| Acesso administrativo | 40/40 |
| Admin wave0 | 9/9 |
| Segurança wave0 | 32/32 |
| Provedor de e-mail existente, testes simulados | 53/53 |
| **Total backend** | **162/162** |
| Frontend: helpers da Central, bloqueio de navegação POP/PUSH e contratos regionais/URLs | **37/37** |
| `py_compile` dos módulos backend afetados | Aprovado |
| ESLint dos arquivos frontend afetados, incluindo App/layout/sidebar | Aprovado |
| `pnpm build` da SPA | Aprovado |
| `git diff --check` | Aprovado |

O build alerta sobre chunk acima de 500 kB; não é falha de compilação. O lint completo do repositório continua com problemas preexistentes fora desta Central (**24 erros e 22 avisos**); não foi declarado limpo. Instalação/build utilizaram pnpm **11.25.0**, com lockfile existente e sem atualização de dependências. O package-lock legado não está sincronizado com a versão atual de Vite; `npm ci` não foi o fluxo validado.

Revisão independente estática executada e achados confirmados corrigidos. Os testes reais do router em memória cobrem cancelar/prosseguir em POP e PUSH sob basename `/br`; a asserção regional foi adaptada à montagem por `createBrowserRouter`, preservando o requisito de basename. Não houve homologação visual no navegador nem teste em staging/live. Resultados locais não comprovam renderização em todos os clientes de e-mail, recebimento de mensagens ou prontidão operacional de produção.

## Antes de publicar no servidor

1. Reconciliar a cadeia de PRs e os marcadores atuais de API/SPA, aprovando o delta específico; esta branch não deve ser implantada isoladamente sem considerar suas bases.
2. Preparar backup privado atual e staging isolado. Aplicar `20261118_13` no PostgreSQL de homologação e validar preservação de dados/imutabilidade e rollback compatível com novos dados editoriais.
3. Homologar a UI com autenticação regional, contas/permissões controladas, fluxos por teclado/mobile, conflitos, restauração, navegação e prévia. Verificar a continuidade das rotas/BFF existentes após a mudança do router.
4. Autorizar separadamente release/deploy e eventual atribuição de capacidades. Manter disparos, teste real, países adicionais e backlog desligados.

Evento/outbox/processador, escolha efetiva do responsável, preferências empresariais, histórico de envio, homologação do transporte e comprovação de recebimento pertencem a fases futuras. Nenhum desses pontos foi ativado ou homologado por esta entrega.

## Registro de entrega

Código enviado à branch `feat-admin-email-center-20261118`; commit de implementação **`b0db1d3`**. **[PR #32 — Central de E-mails](https://github.com/msinhorini-manus/portal-erp-jobs/pull/32)** aberto contra `wave-transactional-mail-api-20261118`. Main e os PRs anteriores não foram mesclados. O commit documental posterior fecha este registro/checklist, sem mudanças no código testado. A entrega via GitHub não é publicação no servidor.
