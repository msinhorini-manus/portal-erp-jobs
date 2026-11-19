# Portal ERP Jobs — Importador no Admin, etapa de prévia

## Estado

Implementação em desenvolvimento sobre a base diagnóstica `8f8a91893cfbe238858b5365a6ad40a1465956a0`, na branch `wave-admin-importer-preview-20261119`. Nenhum deploy, acesso SSH, alteração do ambiente produtivo, migration ou importação de registros de negócio foi realizado nesta etapa. A release funcional de molduras/contagens não foi incorporada. Flask continua sendo a autoridade; o Admin existente continua sendo a SPA.

## Disponível no código

- Rota protegida `/admin/importacoes`, com entrada Importações condicionada à capacidade de administrador de plataforma.
- Upload de JSON, CSV e ZIP e alternativa de JSON colado. Selecionar arquivo não envia dados; o POST depende da ação Validar prévia.
- Validação e comparação sem gravação, mensagens por item, filtros, paginação e relatório CSV com proteção contra fórmulas de planilha.
- Layout responsivo no importador, incluindo menu móvel operável por teclado. Demais rotas administrativas preservam seu layout.
- API compartilhada por Admin e agente, com limites, autorização server-side e respostas sem armazenamento em cache.

| Rota Flask | Comportamento |
| --- | --- |
| `GET /api/admin/importacoes/capabilities` | Capacidades de prévia no Brasil. |
| `POST /api/admin/importacoes/preview` | JSON direto ou multipart no campo `file`; retorna propostas e pendências. |
| `POST /api/admin/importacoes/confirm` | Admin autorizado recebe 501: execução não implementada. Agente recebe 403. |

O transporte existente coloca `/br` antes de `/api` no host global. Esta documentação não cria novas regras de Nginx/DNS ou rotas regionais.

## O que “prévia” significa

`dry_run=true`, `status=preview_only` e `execution_enabled=false` são invariantes. Contadores create/update representam propostas, não registros gravados. `review` exige revisão e não autoriza criação. O identificador da análise não é um lote persistido, nem uma autorização de execução.

Não há gravação de empresas, vagas, candidatos, candidaturas, membros, limites, status de aprovação, auditorias ou templates. Não há fila, worker, histórico durável, confirmação operacional, estorno ou envio de e-mails. O botão Confirmar importação permanece desabilitado e explica esse bloqueio.

## Agente

O código suporta um token exclusivamente de prévia no namespace `jip_`, verificado por SHA-256 configurado no servidor e comparação em tempo constante. Fica desabilitado por padrão; nenhum token real ou configuração produtiva foi criado. Ele permite envio/validação e consulta de capacidades no Brasil, nunca confirmação ou outras rotas administrativas. Não reutiliza senha de Admin, SSH ou acesso direto ao banco.

Gerenciamento/emissão/revogação de tokens dentro do Admin ainda não existe. Nesta etapa, uma futura configuração explícita ou rotação no servidor define o acesso. Nenhum hash/token aparece no bundle ou na resposta de capacidades. A UI utiliza somente a sessão Admin já existente.

## Dados enviados e validação

Os anexos permanecem fora do Git e não são usados como banco da aplicação:

- Lote 6: 15 empresas, 70 vagas e 15 logos verificados.
- Catálogo: 6.088 registros correspondentes entre CSV e SQLite. O SQLite contém 5.806 descrições; 282 estão ausentes e 37 títulos ultrapassam o limite de 100 caracteres.
- O CSV isolado não contém descrição; a aplicação sinaliza a pendência, não fabrica conteúdo.

O parser reconhece os layouts contratados, rejeita arquivos/pastas inesperados e limita tamanho comprimido/descomprimido, número de entradas e linhas. ZIPs não são extraídos indiscriminadamente. Logos são verificados sem download. SQLite de catálogo usa somente uma cópia privada temporária, conexão somente leitura/imutável, esquema explícito e orçamento de execução; não executa scripts ou importa tabelas da origem para a aplicação. CSV/SQLite divergentes são bloqueados, sem escolher silenciosamente uma versão.

A comparação com Jobs lê apenas identidades empresariais/regionais, reservas de slugs e identidade auxiliar de vagas. Não consulta currículos ou contatos de candidatos. CNPJ/slugs divergentes, empresas confidenciais ou ambíguas exigem revisão. Identidades públicas existentes não são reescritas.

**Limitação fundamental:** o schema Jobs atual não persiste `fonte/id_fonte`. A deduplicação por essa chave existe dentro do arquivo; a comparação com a base utiliza empresa/título/cidade e não prova identidade externa. Unicidade persistida e importação executável requerem uma etapa própria, com desenho de schema aditivo e homologação.

## Homologação local

- Backend: 191 testes aprovados na versão final, em processos separados com SQLite temporário e configuração sintética. Listeners/snapshots verificaram ausência de gravações.
- Frontend: build Vite padrão aprovado e 60 testes Node aprovados, sem novas dependências. Lint direcionado aprovado. Oito gates de compatibilidade API–frontend também passaram, incluindo 10.000 itens com 119.991 avisos.
- Browser integrado: SPA compilada real, Flask real e sessão Admin sintética, sem acesso externo. Desktop, tablet e celular passaram upload do Lote 6, contadores 15/70/15, bloqueio de clique repetido, filtros, download CSV e confirmação desabilitada. Desktop também validou o catálogo de 6.088 vagas e o erro real 400 de um JSON inválido. O menu móvel passou Enter/Escape/retorno de foco. Nenhum overflow global de página, erro JavaScript ou gravação no banco de teste; hash do SQLite de teste permaneceu igual.
- Uma primeira tentativa de browser falhou por falta de SQLAlchemy no Python global; o executor passou a usar a venv existente e o Playwright já instalado. Uma tentativa ampliada falhou pelo seletor do teste que mudava de nome ao abrir o menu; apenas o seletor do harness foi corrigido e a matriz integral foi repetida. Logs preservados; nenhum ajuste de aplicação para esconder falhas.
- 236 arquivos protegidos rastreados, incluindo Next/diagnóstico, modelos, migrations, e-mail e manifestos de dependências, foram comparados byte a byte à base: zero diferenças.

A revisão independente inicial encontrou quatro pontos: leitura de JSON antes de autenticação, alocação prematura de metadados ZIP, divergência de totais de avisos na tela e inconsistência entre cabeçalhos locais/centrais ZIP. Todos receberam correções e gates específicos, sem apagar os PoCs e relatórios históricos. Na versão final, a credencial e o escopo são verificados antes do corpo; um prescan estrutural precede a carga JSON; o diretório central é percorrido com limites antes de criar ZipInfo; metadados locais e centrais são comparados; os totais frontend devem corresponder exatamente aos itens/mensagens. A matriz de browser inteira foi repetida após essas correções e passou. Os novos gates backend e o teste API–frontend foram reexecutados no fechamento.

O teto de arquivo permanece 50 MiB, com 10.000 itens. Metadados ZIP agregados ficam limitados a 1 MiB; ZIP64, multidisco, SFX e estruturas ambíguas fora do contrato são rejeitados. O scanner limita profundidade, nós e escalares JSON e usa deadline com checkpoints. Isso não é um limite rígido de memória de processo nem prova de concorrência/CPU em produção. O cache JSON interno do Flask exige regressão em upgrades; a resolução antecipada específica do importador mantém testes de paridade com os guards regionais existentes. Rate limit continua local ao processo, não distribuído.

**Implementação e homologação local concluídas para a etapa de prévia.** Homologação remota, dimensionamento de recursos/concorrência e publicação seguem pendentes. Esses testes não equivalem a produção, importação executável ou garantia universal de segurança.

## Próxima etapa de execução

1. Fechar identidades empresariais e vínculo de acesso de empresas importadas, sem criar contas/login fictícios nem enviar convites silenciosos.
2. Persistir lotes, itens, hash de entrada, opções revisadas e chaves externas com constraints e concorrência testadas. Revalidar a análise antes de confirmar.
3. Preservar controle exclusivo do Admin sobre membro, aprovação e limite, com confirmação específica de alterações.
4. Implementar processamento durável e limitado, com checkpoints de progresso, idempotência, auditoria e recuperação compatível. Confirmar só o lote revisado; repetir arquivo/chave não pode duplicar registros.
5. Tratar candidatura externa sem criar candidatura interna por clique; homologar conteúdo, taxonomias, validade e URLs antes de publicação.
6. Definir limitação compartilhada entre workers/processos antes de uma publicação que dependa desse controle; o limiter desta etapa é local ao processo, não distribuído.
7. Testar falhas/concorrência/retomada e preservação de candidatos/candidaturas em staging; nenhum teste cria fixtures na produção.
8. Publicar apenas a release aprovada com backup fresco privado/off-server, migrations aditivas revisadas quando necessárias, READY/cutover/logs pinados e rollback de código sem restauração destrutiva do banco.

A autorização desta etapa não habilita gravar lotes, mudar schema produtivo, operar campanhas, ativar outros países ou promover PRs encadeados pendentes.
