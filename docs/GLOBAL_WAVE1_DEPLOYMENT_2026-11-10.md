# Global Wave 1 — implantação exclusiva do Portal ERP Jobs

**Estado atualizado em 10/11/2026:** migração implantada e gates produtivos aprovados em `https://jobs.portalerp.com/br`. Runtime final `2cb460476cc11640b248a7ba6ee58383dcbfab10`, schema `20261110_09`. Somente BR ativo. Este documento certifica a migração técnica, não a indexação Google nem a homologação de todos os serviços operacionais de lançamento.

## Escopo e origem existente

Reaproveitar a mesma plataforma, API Flask e banco SQLite no DigitalOcean. O destino brasileiro é `https://jobs.portalerp.com/br`. O domínio editorial `portalerp.com/br` e todos os outros sites do ecossistema ficam fora do escopo. Nginx, DNS, TLS e redirects devem usar somente os hosts exatos `jobs.portalerp.com` e `jobs.portalerp.com.br`, sem wildcard.

Antes da migração, o host global já existia com redirecionamento Cloudflare para o host brasileiro antigo, e o Nginx atendia somente o host antigo. Essa condição foi corrigida: a origem final atende os dois hosts exatos, o global serve `/br`, e o legado redireciona a navegação para os equivalentes. Não foi criada outra plataforma ou banco. O DNS/origin foi reconfirmado pelo conector autorizado, não presumido a partir do proxy.

## Backup já comprovado

Cópia consistente em `/var/backups/portal-erp-jobs/global1-prechange-20261110T185800Z`, com segunda cópia privada fora do servidor. Banco schema `20260930_08`, integridade `ok`, FK zero; leitura e extração de arquivos runtime, restauração isolada do banco e SHA-256 aprovados. A configuração privada do Jobs/TLS/runtime foi preservada. Não foi executado boot integral da aplicação restaurada nesse gate.

Os markers backend/SPA/Next preservados apontam para `b5be33b379af304e4b4222b265235fb74d0b8823`. A configuração Nginx original tem SHA-256 `c54e8fdf87589cfbe8948587a75bcc4885776493ef35907a378b00ee653f64c3`.

Como o sistema continua recebendo gravações, **fazer outro backup consistente imediatamente antes da troca**. O snapshot de 10/11 às 18:58 UTC não deve ser restaurado automaticamente por cima de cadastros/candidaturas posteriores.

## Código preparado

- Migration `20261110_09`: unicidade por host/prefixo, primário único/site e preflight/downgrade fechados. Não muda o cadastro BR por si só.
- Next regional `[country]`: páginas, BFF, links, contexto ativo e cache por host/prefixo/site/locale; raiz global 307 para `/br`.
- Cookies candidato/empresa host-only e `Path=/br`, sem compartilhar `Domain=.portalerp.com`; backend confere o site do JWT e o vínculo atual.
- Canonical/OG/sitemap do Brasil com `/br`, HTML pt-BR; sem hreflang fictício para países desativados; recuperação/convites/Admin privados com noindex.
- SPA Admin em `/admin`, currículo visual em `/br/candidato/curriculo`, APIs `/br/api/*` e BFF `/br/bff/*`. Assets globais.
- `ops/nginx.jobs-global.conf`: base da configuração final instalada; renderização transacional e backups exclusivos do Jobs na origem.
- `ops/jobs_region_cutover.py`: alteração estritamente escopada ao cadastro BR, auditada, idempotente e com rollback somente de configuração. Não muda dados de negócio ou sessões e não restaura banco antigo.

Os servidores de API e Next devem ouvir somente em loopback na origem. Nginx encaminha Host interno `127.0.0.1:5000` com `X-Regional-Host` externo validado e `X-Regional-Prefix` derivado da URL; remove cabeçalhos do browser. Next recebe o Host externo exato e sanitiza novamente seu contexto. Não adicionar ProxyFix/CORS wildcard para contornar validações.

Variáveis Next: `NEXT_INTERNAL_API_ORIGIN=http://127.0.0.1:5000`, `NEXT_DEFAULT_COUNTRY=br`, `NEXT_GLOBAL_CANONICAL_ORIGIN=https://jobs.portalerp.com`. CORS do runtime Flask deve adicionar apenas o host global exato ao host antigo, caso esteja explicitamente configurado. Não imprimir arquivos de ambiente ou configuração PM2 privada.

## Gates locais comprovados até este registro

Backend: 139 testes em 9 processos/suítes; Next: 58 testes em 9 arquivos, TypeScript e build; SPA: 18 testes Node, lint focal e build. Dependências Python sem vulnerabilidades conhecidas; audits Next/SPA passaram para alta/crítica. Avisos moderados/baixos devem ser lidos e registrados, não convertidos em afirmação de ausência total de advisories.

Next + Flask + SQLite sintético + Chromium: 307 verificações, repetidas duas vezes, com páginas públicas, sitemap paginado acima de 100 vagas, canonicals, isolamento, CSRF/login/logout/replay e convite/viewer/revogação. Nenhum dado ou conta real nesses testes.

Cópia privada do banco produtivo: migration upgrade/check, cutover/rollback idempotentes e downgrade/upgrade/check aprovados; integridade/FK e dados de negócio preservados.

Revisão independente não encontrou P0 e identificou uma falha P1 de barra final nas coleções do proxy Nginx. Foi corrigida por normalização interna de jobs/companies/applications na API nova e na alias antiga, preservando método/corpo/query. Teste através de Nginx real local confirmou coleções novas e legadas com 200/401 sem redirect para loopback, incluindo POST não autenticado sem alteração de método/corpo.

O E2E integrado completo SPA + Nginx + Next + Flask passou com **35 verificações**: CV real com sessão HttpOnly, edição/releitura do resumo, privacidade e logout via CSRF; Admin raiz/login/listagens de empresas, candidatos e vagas com respostas 200; 403 de UI não encerra sessão; revogação da sessão sintética no backend causa mensagem de expiração e limpeza de identidade. No teste de 403, a resposta foi simulada de forma estritamente escopada pelo browser, sem mutar permissões reais; a revogação/401 usou o backend real da fixture local. Zero erros de página/hidratação e zero 5xx inesperados.

Durante o teste, duas correções foram incluídas: localhost em build produtivo não é tratado como servidor de desenvolvimento, e respostas 401 administrativas paralelas emitem somente uma notificação de redirecionamento para evitar navegações abortadas. Ambas têm regressões Node específicas; build/lint foram repetidos após as correções. O teste preservou a ação Exportar PDF, mas não baixou/revalidou o arquivo PDF neste gate.

## Ordem obrigatória do cutover produtivo

1. Concluir o E2E integrado real: CV editar/reler/privacidade/logout, Admin login/listagens/401 e 403 sem logout, redirects legados, POST/API sem redirect destrutivo. Revisar logs e não suprimir erros inesperados.
2. Publicar commit exato/PR isolado e empacotar a release; não mesclar/taguear como lançada antes dos gates produtivos.
3. Inspecionar via acesso autorizado a regra Cloudflare, DNS/origin e TLS **somente do Jobs**. Guardar cópia privada dos objetos exatos que forem alterados. Confirmar que a regra global existente não atende outros hosts antes de modificá-la.
4. Preparar TLS válido para `jobs.portalerp.com`. Uma emissão ACME HTTP não funcionará se o redirect Cloudflare descartar o challenge; resolver somente essa condição específica, sem desligar regras globais ou SSL de outros serviços.
5. Construir backend/SPA/Next em diretórios de staging. Executar regressões/audits/checks remotos antes de substituir runtime.
6. Fazer snapshot consistente recente, preservar configuração/runtime atuais e definir janela curta sem escrita enquanto API é parada, a migration é aplicada e o cadastro BR é alterado. Migration SQLite não deve ser tratada como DDL universalmente transacional.
7. Aplicar schema09; executar o helper de cutover explicitamente no DB correto, preservando BR ID e alias `jobs.portalerp.com.br` com prefixo vazio. Apenas BR ativo.
8. Trocar runtime/configuração de forma controlada, iniciar API loopback e Next em sequência, aguardar readiness, validar origem global por `--resolve`/Host exato e TLS. Verificar banco, `alembic check`, markers, hashes, PM2 e logs novos. Não habilitar redirects públicos finais antes de validar a origem nova.
9. Remover/ajustar **somente** a regra Cloudflare que encaminha Jobs global para antigo. Com a origem validada, ativar os redirects antigos para os equivalentes `/br`. Evitar a coexistência das duas direções, que criaria loop.
10. Validar HTTPS externo completo, navegar candidato/empresa/Admin e remover integralmente fixtures sintéticas se forem necessárias em produção, preservando auditoria append-only. Verificar canonical/sitemap/robots/dados estruturados e zero novos 5xx.
11. Registrar evidências, mesclar/taguear release após gates, remover autorização SSH temporária e encerrar serviços de homologação. Manter backup/rollback recuperáveis conforme retenção acordada.

## Rollback e sessões antigas

Se falhar antes do cutover, não alterar a produção. Se falhar após a troca, reverter código/configuração de hosts e reconciliar **somente** o cadastro regional com o helper de rollback; não repor um DB antigo sobre gravações novas. Downgrade09 só é permitido depois de remover explicitamente configurações incompatíveis, sem deletar países ou negócio para forçar passagem.

Usuários precisam autenticar novamente no novo host. Não transportar cookies/JWT em query. BFF mutável em aba antiga recebe 409 para exigir atualização; APIs diretas legadas mantêm seu endpoint/contexto. O Admin antigo navega para `/admin` no novo host, nunca `/br/admin`. Páginas públicas antigas têm redirect individual, não tudo para a home.

## Indexação e internacionalização posteriores

Enviar o sitemap do novo Jobs na propriedade correta do Search Console, inspecionar URLs e acompanhar migração. Não modificar a propriedade do domínio editorial inteiro nem garantir prazo/inclusão Google. Não anunciar MX/US sem ativação/tradução/homologação. Email transacional, operação da Indexing API, monitoramento e exercícios completos de backup/restore são fluxos separados; não estão automaticamente resolvidos pela troca de domínio.

## Evidência final de produção — 10/11/2026

Backup final de cutover: `/var/backups/portal-erp-jobs/global1-cutover-20261110T210321Z`; backup adicional da atualização Next-only: `/var/backups/portal-erp-jobs/global1-auth-20261110T211154Z`. Os snapshots não foram restaurados por cima de gravações novas.

A conta correta foi acessada por OAuth Cloudflare. DNS já estava correto: A Jobs global para `161.35.228.99`, proxied; A legado para a mesma origem, DNS-only. Foi desativada apenas a regra global→legado do Jobs. A navegação antiga retorna 301 ao equivalente global; `/admin` permanece na raiz. APIs antigas preservam método e autorização; BFF antigo exige atualização com 409. A raiz global retorna 307 para `/br`.

TLS: certificado Let’s Encrypt do hostname exato, válido até 08/02/2027; SSL strict por regra somente para `jobs.portalerp.com`, sem mudar o modo Full geral da zona. `certbot.timer` habilitado/ativo, renovação dry-run aprovada e deploy-hook restrito ao lineage/domínio Jobs instalado e testado. O certificado de borda Cloudflare também foi validado.

Durante a validação, uma regra geral existente de cache da zona não excluía `/br/bff/*`: a origem negava corretamente a sessão revogada, mas a borda podia devolver resposta autenticada em cache. Foi acrescentado, na última posição, bypass **somente do hostname Jobs**, preservando as cinco regras existentes e o cache de assets imutáveis. URLs privadas e depois o cache do hostname exato Jobs foram purgados; nenhuma purga geral da zona. Novas respostas privadas ficaram DYNAMIC, não HIT, e logout/replay passaram em produção.

Também foi bloqueada interação com formulários AuthShell antes da hidratação React, após uma submissão nativa de credencial exclusivamente sintética durante o teste. A credencial foi invalidada, a fixture removida, e a correção passou em 59 testes Next, TypeScript/build local e remoto, SSR e browser sem JavaScript em quatro páginas. Nenhuma credencial real foi usada nesse formulário nem incluída nas evidências.

O downgrade09 foi corrigido para preservar apenas o índice único de hostname legado, sem adicionar constraint redundante. Oito testes de migration passaram; roundtrip de cópia atual do banco com `alembic check` no runtime antigo e no novo passou. Readiness TLS passou após espera explícita pelo reload do Nginx. Tentativas anteriores do cutover foram abortadas com rollback e preservação do banco; outras interrupções do E2E foram expectativas/seletores do roteiro, corrigidas sem ocultar 5xx.

Gates finais: integridade SQLite ok, FK zero, ownerless zero, conflitos de membership zero, dois triggers append-only intactos, somente BR ativo, pt-BR/BRL, prefixo `/br`, alias legado mantido, API/Next online em loopback com zero restarts e Alembic sem drift. Paridade de 160 arquivos de release com o runtime final; apenas o exemplo não operativo `.env.example` do backend foi excluído, pois o deploy preserva arquivos de ambiente.

Chromium produtivo verificou Admin/listagens, candidato/privacidade/CV/logout/replay e empresa/aprovação obrigatória/equipe/logout/replay. A passagem completa foi retomada nos gates empresariais após aprovação da fixture; o roteiro inicial não é marcado como integralmente concluído. Todas as assertions necessárias ficaram comprovadas pelas duas passagens, sem erros JavaScript ou 5xx inesperados. Contas, vínculos, sessões e vagas sintéticas zerados; eventos de auditoria preservados. Sessões administrativas Headless do teste também foram revogadas ou encerradas, sem encerrar sessões reais do usuário.

SEO externo pós-cleanup: 74 verificações aprovadas, 17 URLs no sitemap brasileiro, canonicals correspondentes, HTML pt-BR, JSON-LD retido, países desativados com 404 real, noindex privado/Admin mantido e nenhum hreflang de país não ativo. Logs incrementais API/Next/Nginx revisados e aprovados.

Em um futuro rollback, remover primeiro os redirects antigo→global da origem; só reativar global→antigo após validar o destino antigo. Não criar loop. Preservar o bypass Jobs de cache privado; reverter regras novas de SSL/hook somente de modo explicitamente coordenado. Downgrade09 exige preflight e rollback do cadastro BR, nunca exclusão de negócios ou restauração automática de snapshot antigo.
