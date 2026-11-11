# Portal ERP Jobs — URLs amigáveis de vagas

Data local: 10/11/2026. Escopo exclusivo da plataforma Jobs, mantendo DigitalOcean, Flask, Next, a SPA residual e o banco existente.

## Estrutura

Formato brasileiro: `/br/vagas/{empresa}/{titulo-da-vaga}/{id}`. Exemplo ilustrativo: `https://jobs.portalerp.com/br/vagas/nome-da-empresa/descricao-da-vaga/1`.

O país continua sendo o primeiro segmento. O builder suporta a coleção `vacantes` para idiomas espanhóis e `jobs` para inglês, sem ativar México, Colômbia ou outros sites. Isso prepara URLs de detalhe; não equivale à homologação integral das demais telas internacionais.

O ID continua sendo a identidade e a chave de consulta. Slugs descritivos não mudam relacionamentos de candidaturas, favoritos, histórico, empresa ou usuário. A migration `20261111_10` acrescenta snapshots de empresa e título às vagas existentes, sem recriá-las. Novas vagas recebem snapshots automaticamente. Alterações posteriores de título ou nome empresarial não mudam esses snapshots.

Empregadores confidenciais usam `empresa-confidencial`; nome real, website, logo e perfil empresarial não são expostos no detalhe público nem no JobPosting. A decisão de confidencialidade prevalece mesmo após mudança de uma vaga anteriormente pública.

## Compatibilidade e SEO

- Diretriz atualizada pelo usuário em 10/11/2026 às 22:29 locais: como a plataforma ainda não foi lançada, **não criar redirects de vagas**.
- As URLs descritivas exatas são servidas diretamente com HTTP **200**.
- URLs numéricas antigas, slugs incorretos e IDs não canônicos retornam **404 sem Location**, em vez de gerar páginas duplicadas ou redirects.
- URLs numéricas no domínio `.com.br`, com ou sem `/br`, também são retiradas com 404. Os redirects de domínio e de outras jornadas já existentes não são modificados por esta diretriz de vagas.
- POSTs nas antigas URLs de página não são convertidos em GET nem redirecionados.
- Canonical, Open Graph, `JobPosting.url`, sitemap, cards e retorno de login/candidatura utilizam o builder único.
- Vagas indisponíveis, expiradas ou de outra região devolvem 404 sem revelar slugs. Países inativos não recebem fallback de vagas brasileiras.
- A consulta pública exclui vagas expiradas e o DTO básico informa `expires_at`, evitando cards/prefetches para páginas já indisponíveis. Os registros, status históricos e acesso por CRUD privado permanecem preservados; isso não instala uma rotina automática de encerramento ou notificação ao Google.
- Não são emitidos hreflang de países que ainda não tenham conteúdo equivalente e homologado.

## Organização do código

O builder puro fica em `next/src/lib/public-job-url-core.js`, com tipagem associada. A SPA o incorpora durante o build, sem duplicar a implementação. O runtime Next não depende de uma pasta irmã de frontend no servidor.

O App Router exige o mesmo nome de segmento dinâmico no mesmo nível. O handler curto `[companySlug]` rejeita caminhos obsoletos; a rota longa mantém `[companySlug]/[titleSlug]/[id]`. Os nomes internos não alteram as URLs externas.

## Gates de implantação

A homologação abrange suítes backend em processos isolados, migration upgrade/backfill/downgrade/check, Vitest, TypeScript, build e início efetivo do Next, lint/build/testes da SPA, Nginx real em loopback e browser Chromium. O E2E integrado verifica sitemap com mais de 100 vagas, metadados, retorno de login, cookies regionais, CSRF, convites, viewer e revogação de sessões. Todas as fixtures são locais e sintéticas.

Gates adicionais obrigatórios em produção: backup consistente recente com restore isolado; preflight do runtime/schema; staging remoto; validação da migration; comparação de hashes; integridade/FK/contagens de negócio; HTTPS, ausência de redirects de vagas, SEO e browser; logs novos; rollback de código sem restaurar dados de negócio antigos.

## Status produtivo

**Publicação ainda em andamento; não declarar release concluída.** O SSH foi restabelecido e foram feitos backups consistentes, com restore isolado e cópia privada fora do servidor. A migration aditiva `20261111_10` foi aplicada e validada, com integridade ok, FK zero e preservação dos dados anteriores.

As duas primeiras trocas de código voltaram à versão anterior por gates do script: retorno de readiness interpretando HTTP 200 como erro e logs 502 durante a parada planejada. O primeiro retorno foi reconciliado manualmente, preservando seu flag e evidências; o segundo rollback voltou online automaticamente. O banco não foi restaurado a uma cópia antiga. A próxima passagem reutiliza o schema 10 já verificado e separa a janela de manutenção dos períodos saudáveis, sem aceitar erros após a volta dos serviços.

A publicação não requer alterar DNS, domínio principal `portalerp.com`, outros subdomínios, regras gerais Cloudflare ou ativar outros países.

## Homologação local da versão inicial, anterior à orientação sem redirects

| Gate | Resultado |
|---|---|
| Backend, 11 suítes executadas em processos isolados | 153 testes aprovados |
| Migration 10, backfill, roundtrip, integridade/FKs e Alembic check | Aprovados na suíte isolada |
| Next Vitest | 134 testes em 13 arquivos aprovados |
| TypeScript antes/depois do build | Aprovado |
| Next build e início real do runtime | Aprovados |
| SPA: lint focal, testes regionais e build | Aprovados, 18 testes |
| Nginx real local: três variantes de URL, GET/HEAD, query e bloqueio de POST | Aprovado |
| Chromium público pelo Nginx local | 9 checks aprovados |
| E2E integrado com Next/Flask e fixtures sintéticas | 310 assertions aprovadas; zero erros de browser e respostas inesperadas |
| Serviços locais temporários | Encerrados |
| SSH para produção no preflight final | Recusado; publicação ainda não executada |

A checagem de runtime detectou e corrigiu, antes de qualquer deploy, a colisão de nomes de segmentos dinâmicos do Next. O E2E também identificou prefetches de uma fixture expirada: corrigimos a listagem pública e a exposição da validade no DTO, sem suprimir os 404 no coletor. O teste de downgrade passou a comparar FKs e índices pela semântica, preservando agrupamentos compostos, colunas e ações em vez de ordinais internos reatribuídos pelo SQLite.

Nenhuma conta, candidatura ou empresa real foi usada nos testes de escrita desta release. Os números acima são históricos da versão inicial; os gates da versão sem redirects e a validação produtiva final devem ser registrados separadamente após sua execução.
