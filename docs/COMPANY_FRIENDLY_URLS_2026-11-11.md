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

**Status histórico do primeiro commit:** implementação e homologação locais concluídas, antes do backup/staging/deploy. O fechamento produtivo e as evidências finais constam abaixo.

## Fechamento produtivo — 11/11/2026

A release foi implantada e homologada. Commit final de runtime: `ed5f0f723f8635b3ce647952eb15024a8b8037a2`; schema `20261111_11`. A API e a SPA permaneceram com o mesmo código depois da primeira troca; seus markers foram promovidos ao commit final apenas após a comprovação de paridade de bytes com a fonte Git.

O backup pré-mudança foi concluído em `/var/backups/portal-erp-jobs/company-urls-prechange-20261111T193829Z`, com restauração isolada, conferência de hashes e cópia privada fora do servidor. Houve também snapshots transacionais frescos. Nenhum banco antigo foi restaurado sobre dados produtivos.

A primeira passagem voltou automaticamente ao código original porque um smoke de POST numérico de vaga esperava 404, embora o proxy corretamente devolvesse 405. O código anterior ficou online, os dados foram preservados e a migration aditiva foi reconciliada por leitura. A segunda passagem concluiu todos os gates sem reaplicar a migration.

Uma falha real de socket `UND_ERR_SOCKET` apareceu nos logs durante as checagens. Foi publicada uma correção Next-only, com rollback próprio, sem interromper a API ou modificar banco/Nginx. A recuperação faz no máximo uma tentativa adicional para GET interno anônimo e apenas para a assinatura exata de conexão encerrada antes da resposta. HTTP 401/403/404/429/5xx, abortos, timeouts, JSON malformado e mutações não são repetidos. A causa de reutilização de conexão é provável; a assinatura real e a recuperação foram reproduzidas em Node nativo. O commit final passou em 399 testes Next, 21 arquivos, além de TypeScript e build remotos; o E2E local preservou 402 verificações.

Gates finais: 119 checagens HTTPS públicas para os quatro perfis publicados, links, canonical/OG/Organization, sitemap, páginas privadas e regiões inativas; três navegações Chromium completas, com 27 verificações e zero JavaScript errors ou 5xx inesperados. Foram classificadas separadamente cinco recusas de prefetch da borda com status 503, header `cf-speculation-refused`, requisição GET com `sec-purpose: prefetch`, tipo `other` e sem navegação principal. Isso é comportamento documentado do Speed Brain [1], não erro da página nem da origem. Nenhuma regra Cloudflare foi alterada nesta release.

A paridade final cobriu 399 arquivos fonte e 17.566 entradas imutáveis de dependências/SPA. Foi excluído apenas o arquivo exato de cache de resultados do Vitest, que mudou com a execução dos testes. Integridade SQLite `ok`, FK 0, slugs empresariais completos, somente BR ativo, API/Next online e 0 reinícios automáticos. Os logs novos pós-correção passaram no gate estrito.

Nenhuma fixture de empresa, candidato, vaga ou candidatura foi criada em produção nesta release. IDs, aprovações e vínculos antigos foram preservados. Search Console/indexação efetiva e ativação de outros países não foram executados por esta alteração.

## Referência de classificação da borda

[1]: https://developers.cloudflare.com/speed/optimization/content/speed-brain/ "Cloudflare Speed Brain: prefetch e recusas 503"
