# Admin — reativação, senhas e aprovação de empresas

**Situação em 04/11/2026:** correção implementada e homologada localmente. **Ainda não implantada em produção:** o servidor DigitalOcean `161.35.228.99` responde por SSH, mas recusa a chave temporária de deploy solicitada nesta tarefa. Não houve alteração de usuários ou liberação de empresas reais durante a implementação.

## Como o administrador vai operar

A nova tela **Usuários e acessos**, em `/admin/usuarios`, lista candidatos e usuários empresariais, incluindo membros inativos. Permite pesquisar por nome, e-mail ou empresa, com filtros de tipo e paginação. Mostra separadamente a conta global, o bloqueio temporário de login, o acesso regional, a situação da empresa e o vínculo da pessoa com a equipe.

**Reativar conta** modifica somente a conta de login global. Uma conta previamente inativa exige novo login: suas sessões antigas são revogadas na mesma transação. **Desbloquear login** limpa somente o bloqueio por tentativas. O acesso regional do candidato continua sendo gerenciado na tela de candidatos; usuários removidos de equipes não são reintegrados automaticamente.

**Redefinir senha** exige a senha atual do administrador e um motivo. Gera um link individual de uso único, válido por uma hora, para que o titular escolha a nova senha. O administrador deve entregar o link por um canal privado verificado. Não há envio automático de e-mail e nenhuma senha existente é exibida. Um novo link invalida o anterior.

O token fica no fragmento do link, não na query HTTP; a página Next o lê localmente e o retira do endereço. O banco guarda somente o hash do token. O consumo é atômico, impede uso concorrente duplicado, valida a expiração no momento da escrita e revoga todas as sessões do titular. O login exibido após o sucesso é o de candidato ou de empresa, conforme o tipo da conta.

As ações globais de acesso exigem administrador de plataforma, sessão válida e atribuição ativa ao site atual. Administradores regionais não recebem essa autoridade global. As mutações exigem reautenticação, têm rate limiting, respostas sem cache e auditoria transacional sem senha, token, e-mail ou texto livre do motivo.

## Regra obrigatória de aprovação empresarial

Toda empresa nova permanece **Aguardando aprovação**, inclusive quando o cadastro tenta fornecer artificialmente status aprovado ou dados de aprovação. Enquanto não for aprovada pelo administrador, não pode publicar vagas nem consultar candidatos.

A tela **Empresas** oferece **Aprovar e liberar**, com confirmação explícita. Registra a identidade administrativa e a data da decisão. A tela também permite rejeitar e suspender a empresa, filtrar todos os estados e consultar os usuários associados para gerir seus acessos.

Reativar uma conta, desbloquear login, recuperar senha ou marcar a empresa como membro **não aprova a empresa**. A reativação empresarial nas rotas legadas também exige a permissão de aprovação. Vagas antigas não são republicadas automaticamente. Aprovar uma empresa não reativa uma conta global desativada.

As telas de candidatos e empresas deixam de apresentar um único status ambíguo. A busca de candidatos usa a normalização e paginação do backend, sem uma segunda filtragem client-side que descartaria resultados válidos.

## Validações concluídas

Passaram **110 testes backend**, executados em processos SQLite isolados: 40 de acessos, 9 de aprovação/recuperação, 9 de Admin regional, 30 de segurança, 2 de equipe empresarial, 9 de vagas e 11 de currículo. Entre os casos novos estão bloqueio de empresas pendentes, negação de liberação sem permissão, isolamento entre sites, preservação de membros removidos, reautenticação inválida, rollback com auditoria, revogação de sessões na reativação, consumo concorrente do token e expiração durante hashing ou espera pelo lock de escrita.

Passaram os **22 testes Next**, a verificação TypeScript, o build Next, o lint focal das telas administrativas e o build do SPA. O E2E Chromium local passou em sete gates: reativação global e desbloqueio sem bypass regional; reativação regional de candidato; busca normalizada; recuperação de candidato com uso único e revogação; recuperação empresarial sem aprovação implícita; aprovação explícita liberando a consulta de candidatos; e encerramento das sessões de teste.

O schema permanece **`20260930_08`**, sem migration nova. `alembic check` não detectou drift, `integrity_check=ok` e zero violações de chaves estrangeiras em banco temporário migrado. As páginas produtivas de login do Admin, cadastro empresarial e recuperação permaneceram acessíveis por HTTPS; isso é somente smoke de disponibilidade da release anterior, **não validação desta correção em produção**.

## Atualizações de segurança incorporadas

A auditoria encontrou dependências afetadas já presentes na plataforma. Foram aplicadas correções mínimas: Next **16.4.5**, Vite **6.4.4**, PyJWT **2.15.0**, Werkzeug **3.1.9**, DOMPurify **3.4.17** e source-map-js **1.2.2**. A dependência Zod não utilizada foi removida em vez de introduzir uma atualização major desnecessária. As fontes oficiais de segurança do Next estão no documento `ADMIN_ACCESS_SECURITY_SOURCES_2026-11-04.md`.

Após as correções, o `pip-audit` não encontrou vulnerabilidades conhecidas e o `pip check` passou. Os audits de produção do Next e do SPA ficaram com **zero findings altos ou críticos**. Permanecem um finding moderado no Next e quatro baixos/moderados no SPA, envolvendo parsing CSS, ZIP e o servidor de desenvolvimento Vite. Não foram apresentados como resolvidos. A produção usa o bundle estático, não o servidor de desenvolvimento Vite. Builds reproduzíveis com lockfile congelado passaram.

## Implantação pendente

A implantação deve continuar no DigitalOcean, com a mesma API Flask, o mesmo banco e o mesmo contexto regional. Não há migração para outra hospedagem nem criação de um banco paralelo produtivo.

Antes da troca de runtime, restabelecer o SSH, confirmar o schema 08 e a integridade do banco, verificar processos e espaço, criar backup consistente e preparar API/venv, SPA e Next em diretórios de release. Não instalar os novos pins Python sobre o processo ativo. Trocar os processos de forma serializada e manter rollback de código/ambientes. Como não há migration, rollback de código deve preservar o banco produtivo e seus registros mais recentes.

Depois do deploy, executar smoke HTTPS, E2E com fixture sintética estritamente escopada, confirmar a regra de aprovação e a revogação, limpar a fixture e verificar integridade, logs incrementais, hashes e markers. Só após esses gates considerar a correção implantada e fechar a release em `main`/tag.

A entrega automática de e-mail transacional não foi homologada por esta correção; o fluxo administrativo é manual e explícito. O Admin continua na SPA legada, e a recuperação reutiliza o frontend Next existente. O limitador de autenticação continua local ao processo; deve receber armazenamento compartilhado antes de ampliar workers/réplicas.
