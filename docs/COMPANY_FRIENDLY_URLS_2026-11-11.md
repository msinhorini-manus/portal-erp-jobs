# URLs públicas amigáveis de empresas — 11/11/2026

## Contrato

A URL pública da MegaSoft (ID 4) passa a ser `https://jobs.portalerp.com/br/empresas/megasoft/4`. O padrão é `/{país}/empresas/{nome-da-empresa}/{id}` para português/espanhol e `/{país}/companies/{nome-da-empresa}/{id}` para inglês. Somente BR permanece ativo; MX/CO e demais mercados não são ativados nesta release.

O ID continua imutável e preserva APIs, vínculos, vagas e candidaturas. `CompanySite.public_profile_slug` é um snapshot regional estável: mudanças posteriores de nome não alteram automaticamente o endereço. Colisões de nome são diferenciadas pelo ID. A migration `20261111_11`, encadeada à `20261111_10`, adiciona uma coluna nullable `VARCHAR(140)` e faz backfill somente dos valores nulos, sem modificar as colunas antigas ou os slugs já publicados das vagas.

URLs corretas recebem GET/HEAD 200 diretamente. URLs numéricas antigas, slugs incorretos, IDs não canônicos e barra final no detalhe recebem 404 sem redirecionamento. POST e métodos incompatíveis no proxy global são bloqueados com 405. O host legado bloqueia seus caminhos empresariais numéricos com 404, inclusive POST. Redirecionamentos de domínio e de outras jornadas permanecem intactos.

## Escopo

Os links do diretório, home, resultados de vagas e perfil de empresa usam o novo endereço. Canonical, Open Graph, Organization, hiringOrganization visível e sitemap estão alinhados. A implementação usa um único builder autocontido no Next, compartilhado com a SPA durante a compilação.

A aprovação administrativa das empresas permanece obrigatória. A página pública valida site, atividade, aprovação, ID e slug; dados de empresa confidencial não geram links públicos de empregador. Cabeçalhos regionais e credenciais enviados pelo navegador não são encaminhados pelo proxy público. Falhas críticas do inventário retornam 503, não sitemap parcial 200.

O Nginx recebe apenas um bloco de bloqueio de URLs numéricas no host legado Jobs. Nenhum host do portal editorial é alterado. Admin e currículo visual permanecem na SPA existente; não há migração desses módulos nesta release.

## Gates locais executados

| Gate | Resultado |
|---|---|
| Backend em 13 processos/suítes isolados | 170 testes aprovados |
| Next Vitest | 276 testes aprovados em 19 arquivos |
| Next TypeScript/typegen/build | Aprovados |
| SPA regional + URLs de empresas | 23 testes aprovados |
| SPA build e lint dos arquivos alterados | Aprovados; 0 erros de lint focal |
| Chromium integrado, Flask e Next em loopback | 402 verificações aprovadas |
| Sitemap local | 116 URLs verificadas com HTTP 200 |
| Migration e roundtrip em SQLite descartável | Aprovados, incluindo FKs compostas, índices e dados antigos |
| Auditorias Python e frontend | Gates aprovados; nenhuma vulnerabilidade alta/crítica bloqueante |
| Patch Nginx idempotente e escopo preservado | Aprovado localmente |
| Preparação transacional de operações | 19 regressões locais aprovadas |

O lint integral legado da SPA tem 24 erros e 21 avisos, todos idênticos à baseline anterior. A dívida não foi mascarada nem expandida nesta alteração. Os testes integrados usaram somente dados sintéticos locais, já removidos; não equivalem a homologação de produção.

## Implantação e rollback

A referência runtime anterior é `74c1172cede3e04d563ee7474fcc8efbe05c2b13`, schema `20261111_10`. O staging deve repetir as 13 suites, os 23 testes SPA, Next, auditorias, Nginx isolado e o roundtrip numa cópia atual da produção. Backup consistente e restauração isolada são obrigatórios antes da troca.

A transação preserva `.env`, venv, banco, uploads, processos e ambiente PM2. A API é iniciada e validada antes do Next. O rollback é de código, mantendo a coluna aditiva nullable e as escritas legítimas; não restaura um banco antigo. Migration parcialmente aplicada permanece fail-closed e exige reconciliação manual.

Após a troca devem passar os gates públicos de perfis, links, sitemap, canonical, Organization, URLs anteriores 404 sem Location, regiões inativas, auth privada sem cache, hashes de runtime, Alembic, integridade/FKs e logs novos. Só então o PR pode ser mesclado e a tag criada no commit efetivamente implantado.

**Status deste commit: implementação e homologação locais concluídas; backup/staging/deploy produtivos ainda não finalizados.** As evidências finais serão acrescentadas após os gates de produção.
