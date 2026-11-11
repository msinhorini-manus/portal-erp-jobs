# Portal ERP Jobs — URLs amigáveis de vagas em produção

Data local: 10/11/2026. Escopo exclusivo do Jobs, no servidor DigitalOcean existente, mantendo Flask, Next, a SPA residual e o mesmo banco.

## Resultado e contrato atual

**Implantação e validação produtiva aprovadas.** Commit de runtime: `74c1172cede3e04d563ee7474fcc8efbe05c2b13`. Schema Alembic: `20261111_10`.

Formato brasileiro: `/br/vagas/{empresa}/{titulo-da-vaga}/{id}`. Exemplo real validado:

`https://jobs.portalerp.com/br/vagas/ix-tec/analista-de-materiais-protheus-pl/1`

O usuário alterou a diretriz às 22:29 locais: como a plataforma ainda não foi lançada, não criar redirects de vagas. A versão final atende essa orientação:

- URL descritiva exata: HTTP 200, sem Location.
- URL numérica antiga, slug incorreto, trailing slash no detalhe ou ID não canônico: HTTP 404, sem Location.
- URLs numéricas do domínio `.com.br`, com ou sem `/br`: HTTP 404, sem redirects.
- Métodos não suportados no detalhe continuam bloqueados. POSTs antigos não são redirecionados nem convertidos em GET.
- Os redirects de domínio, raiz global e outras jornadas já existentes não foram removidos; a mudança sem redirects é específica das páginas de vagas.

O país permanece como primeiro segmento. A coleção preparada para espanhol é `vacantes` e para inglês é `jobs`. Somente BR permanece ativo. México, Colômbia e demais países não foram ativados nem considerados integralmente homologados por esta release.

## Identidade, segurança e SEO

O ID continua sendo a chave estável. A migration acrescenta dois snapshots públicos de empresa e título, sem recriar vagas, candidaturas, favoritos, currículos ou vínculos. Novas vagas recebem snapshots automaticamente; alterações normais posteriores de nome/título não modificam os snapshots.

A confidencialidade prevalece: empregadores ocultos usam `empresa-confidencial`, sem expor nome real, website, logo ou perfil no detalhe público e no JobPosting. URLs que deixem de corresponder à apresentação pública são rejeitadas.

Canonical, Open Graph, `JobPosting.url`, sitemap, cards e retorno de candidatura/login utilizam o mesmo builder. O núcleo está em `next/src/lib/public-job-url-core.js`; a SPA o incorpora no build e o Next permanece autocontido no servidor.

Apenas vagas públicas, regionais e não expiradas entram na consulta pública e no sitemap. `expires_at` está no DTO básico. Os registros antigos e o CRUD privado continuam preservados; não foi instalada uma rotina de encerramento ou de notificação ao Google.

O HTML brasileiro mantém `pt-BR`. Não foram emitidas equivalências hreflang para países ainda sem conteúdo equivalente homologado. Admin, login e demais jornadas privadas continuam com noindex e controle de acesso.

## Backup, implantação e reconciliação

O backup consistente anterior à migration foi criado em `/var/backups/portal-erp-jobs/job-urls-prechange-20261111T011142Z`, validando integridade, FKs, leitura dos arquivos e restauração isolada. Uma cópia privada fora do servidor teve todos os hashes conferidos. Novos backups completos foram feitos antes de cada troca de runtime.

A primeira troca aplicou e validou a migration 10, mas o script interpretou seu próprio retorno de readiness HTTP 200 como falha. O rollback de código manteve o schema aditivo 10 e foi reconciliado, restabelecendo os processos antigos online. O flag manual e suas evidências permaneceram preservados.

A segunda troca passou nos smokes de origem, mas o gate capturou duas respostas Nginx 502 durante a parada planejada. O rollback de código voltou online automaticamente. Nenhuma cópia antiga de banco foi restaurada.

O script foi corrigido para retornar sucesso explícito em readiness e persistir o schema inicial da retomada. A auditoria de logs agora separa períodos saudáveis e manutenção: somente 502 exatamente pareados com conexão recusada aos listeners locais são aceitos na janela de parada. Qualquer 5xx ou erro inesperado fora dela permanece bloqueador. Os testes dessa classificação incluem rejeição de 502 saudável, 503 na manutenção, 502 sem pareamento e traceback de runtime.

Após a nova diretriz sem redirects, houve nova implementação, novo commit e staging remoto completo. A passagem final reutilizou a migration já aplicada, sem reaplicá-la, e terminou com DEPLOY_OK. Backup transacional final: `/var/backups/portal-erp-jobs/friendly-cutover-20261111T014400Z`.

## Gates finais

| Gate | Resultado |
|---|---|
| Backend, suítes isoladas | 153 testes aprovados |
| Migration em cópia produtiva, backfill, downgrade 09, reupgrade 10, Alembic e preservação de estrutura/dados | Aprovados |
| Next Vitest, versão sem redirects | 158 testes em 15 arquivos aprovados |
| TypeScript antes/depois do build e build Next | Aprovados localmente e staging remoto |
| SPA: lint focal, testes regionais, audit e build | Aprovados; 18 testes regionais |
| E2E integrado local sem redirects | 336 assertions aprovadas, dados exclusivamente sintéticos |
| HTTP real do build Next | 31 checks de páginas/SEO/métodos e redirects não relacionados preservados |
| Nginx candidato isolado e sintaxe instalada | Aprovados |
| Gates públicos HTTPS externos | 70 checks aprovados; duas vagas públicas elegíveis e 17 URLs no sitemap BR |
| Chromium produtivo anônimo | 9 checks aprovados: SSR/hidratação, título, empresa, canonical, idioma, voltar, candidatura/login e retorno amigável |
| Integridade SQLite / FKs | ok / zero violações |
| Empresas sem owner / memberships ativos conflitantes / slugs ausentes | zero / zero / zero |
| Paridade de runtime com staging | 87 arquivos backend, 17 arquivos dist SPA e 18.823 arquivos Next/dependências conferidos |
| PM2 API / Next | online / online; zero restarts observados no gate final |
| Logs saudáveis pós-readiness e após gates públicos | Sem erro inesperado ou 5xx |
| Auditorias de dependências | Gates Python e produção Next/SPA aprovados; não afirmar que advisories de menor severidade foram eliminados |

Na primeira passagem do Chromium, a página SSR já estava visível antes de o handler React do CTA estar hidratado; o roteiro clicou cedo e esgotou a espera. A repetição aguardou o handler real e passou integralmente, sem suprimir assertions de login ou erros.

Nenhuma conta, empresa ou candidatura sintética foi criada na produção nesta release. Os serviços e a fixture locais foram encerrados e limpos. Backups e evidências remotas ficam privados; não anexar banco, configuração, chave SSH, tokens ou credenciais.

## Limites de lançamento

Esta release conclui as URLs públicas descritivas do Jobs e seu SEO técnico associado. Não representa confirmação de indexação pelo Google, operação do Search Console, ativação de outros países, homologação de e-mail transacional ou resolução de todas as pendências gerais de lançamento. Esses itens permanecem separados.
