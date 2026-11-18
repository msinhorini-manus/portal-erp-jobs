# Central de E-mails — implementação Admin

## Escopo e base

Pedido: integrar a interface de gerenciamento de templates, Português / English / Español, editor/prévia e Regras de disparo para nova candidatura ao Admin existente. Base: branch `wave-transactional-mail-api-20261118`, HEAD documental c2d462f; produção histórica da API 942eb49. Branch isolada: `feat-admin-email-center-20261118`. Não modificar main nem executar deploy nesta fase. Não enviar e-mails, criar outbox/worker, alterar candidaturas, ativar países, responsáveis, marketing ou links sensíveis.

Preservar a identidade visual atual: branco/cinza, azul petróleo #1F3B47 e laranja #F7941D; shell SPA existente. Layout desktop editor/prévia em duas colunas e mobile alternável. Idiomas são do conteúdo, não da UI. Reutilizar Flask/SQLAlchemy e banco atual, sem serviço paralelo. Persistência editorial real no backend, não localStorage; migração apenas adiciona tabelas, não será aplicada em produção.

## Estrutura

Frontend: `pages/admin/AdminEmailCenterContent.jsx` e componentes/helpers dedicados em `components/admin/email/`; rota `/admin/emails`, sidebar Configurações. Backend: blueprint `routes/admin_email.py`, modelos editoriais `models/email_template.py`, serviço `services/email_templates.py`, migração Alembic aditiva e testes isolados.

## Contrato API (prefixo /api/admin/emails)

Todos os endpoints são autenticados com JWT, admin ativo e escopo regional validado. Retornos privados `Cache-Control: no-store`. Nenhum endpoint chama transporte externo.

Nesta fase, somente o site autorizado no Brasil pode consultar o catálogo e executar ações editoriais. Fora do país BR, a consulta de capacidades informa indisponibilidade e as demais rotas recusam acesso. Publicar e inativar exigem também `is_platform_admin`; uma concessão regional de `email.publish` não permite publicação global. Códigos de país são emitidos em ISO maiúsculo (`BR`); as variantes English/Español mantêm `country_code=null`.

GET `/capabilities`: `{capabilities:{view,edit,publish,rules,history,test:false},site:{code,country_code,name},dispatch:{enabled:false,status:'not_implemented',reason},variables:[{key,label,description,example}]}`. Capacidades independentes `email.view`, `email.edit`, `email.publish`, `email.rules`, `email.history`; acesso plataforma não elimina checagem de capacidade. Super_admin segue autorização existente, mas escopo regional continua obrigatório. Administração delegada não publica globalmente. GET capacidades não concede acesso ao catálogo.

GET `/templates`: `{templates:[record],total:3}`. Catálogo fixo `application.created.company`, evento `application.created`, público `company`, três variantes pt-BR/en/es. Records `{locale,key,event,audience,country_code,name,status:'draft'|'published'|'inactive'|'published_with_draft',revision:integer,draft:{name,subject,html,text}|null,published:{version,name,subject,html,text,published_at,author}|null,versions:[],updated_at,author,operational:false}`. Catálogo ausente oferece exemplos editoriais em memória (revision 0), nunca grava em GET. pt-BR escopo Brasil; en/es bases editoriais country_code null, não países ativos.

PUT `/templates/{locale}/draft`: body `{revision,name,subject,html,text}`; retorno `{template:record,message}`. Valida no backend campos obrigatórios/limites, allowlist, HTML seguro e URLs. Revision é inteiro, conflitos retornam 409 sem sobrescrever. Rascunhos existentes têm revisão incrementada.

POST `/templates/{locale}/preview`: body `{name,subject,html,text}`; retorno `{subject,html,text,notice:'Prévia — dados fictícios; nenhum e-mail enviado'}`. Amostras fictícias por idioma; HTML escapado e URLs confiáveis. Prévia nunca persistida. Validação retorna 422 `{error,fields:{subject|html|text|name:message}}`.

POST `/templates/{locale}/publish`: body `{revision}`; publica rascunho persistido em nova versão imutável, limpa draft e incrementa revisão; retorna `{template,message}`. Nunca ativa disparos, backlog ou região. Confirmação fica na UI. Editar versão publicada salva novo rascunho.

POST `/templates/{locale}/inactivate`: body `{revision}`; estado inativo sem apagar versões, incrementa revisão. POST `/templates/{locale}/restore`: `{revision,version}` cria novo rascunho de versão antiga. GET `/templates/{locale}/versions`: `{versions:[{version,name,subject,html,text,published_at,author}]}`.

GET `/rules`: `{rules:[{event:'application.created',template_key:'application.created.company',audience:'company',country_code:'BR',locale:'pt-BR',origin:'Nova candidatura válida persistida',recipient:'Responsável principal elegível da empresa/região',enabled:false,status:'not_implemented',published_version:integer|null,gates:[{key,label,ready:boolean,reason}],reason}],can_activate:false}`. Gates reais: elegibilidade/duplicidade, responsável, publicado seguro, evento/outbox/processador/histórico, homologação/transporte. Tudo pendente exceto existência de versão publicada validada. Não implementar endpoint de ativação. Exibir template e link ao editor. Viewer/inativos/pendentes não elegíveis; um responsável, sem seleção arbitrária nem cópia à equipe.

GET `/history`: `{available:false,records:[],reason:'Histórico de envios ainda não implementado. Nenhum disparo é realizado por esta Central.'}`. Não inventar logs de envio; auditoria editorial real independente via AdminAuditEvent.

Erros 401/403 mostram negativa segura; 409 preserva edição local e oferece comparação/recarregamento; 422 aponta campos; falhas locais preservam texto. Não mostrar salvo antes de sucesso. Enviar teste sempre indisponível com motivo: teste não liberado nesta fase. UI sem destinatários, remetente ou credenciais.

## Conteúdo e segurança

Variáveis permitidas: responsavel_nome, empresa_nome, vaga_titulo, data_candidatura, painel_url. Inserir no campo focado e anunciar. Não candidato_nome, contatos ou currículo. Links apenas painel_url ou URLs internas HTTPS no host confiável do Jobs sem query/token; sem imagens externas, scripts, estilos ativos, handlers, forms ou embeds. Prévia iframe sandbox vazio, CSP deny-by-default, sem same-origin/scripts; texto em React escapado. Editor de HTML controlado com ferramentas de formatação seguras, versão texto e catálogo de variáveis. Mudanças não salvas protegidas ao sair, trocar idioma/aba ou fechar.

A restauração preserva o estado inativo; somente publicar explicitamente uma nova versão reativa sua disponibilidade editorial, com confirmação específica e sem ativar e-mails. O CTA usa `trusted_regional_base_url` para respeitar o prefixo do domínio confiável, limitado ao painel/áreas empresariais autenticadas. Publicação requer rascunho salvo e sem edição local divergente; requisições em andamento bloqueiam novas ações/navegação. A prévia descarta respostas obsoletas. O router mantém o mesmo catálogo e basename, usando `createBrowserRouter` para proteção nativa por `useBlocker` também em Voltar/Avançar, sem alteração da autenticação ou BFF.

## Entrega

Testes isolados SQLite e sockets externos bloqueados; lint de arquivos novos, build SPA, regressões afetadas e revisão independente. Código em branch/PR encadeado, sem merge main e sem deploy. Migração, ambiente de produção e homologação operacional continuam pendentes.
