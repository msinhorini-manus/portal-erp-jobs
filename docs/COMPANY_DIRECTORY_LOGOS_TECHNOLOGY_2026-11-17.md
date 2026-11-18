# Diretório de empresas — logos legíveis e chamada de tecnologia

## Estado produtivo

Publicado no DigitalOcean, somente Next, no commit de aplicação `6868a4acc4a4dd8030c8c60bb9ffea1bf8098d5b` (PR #29). API/venv permanecem `d211a37f210a072f049b2955653363d95f4e5483`; SPA/Admin permanece `6ac36b31955b51d02a078c6c635ef6ef8fd525a9`. Banco preservado no schema `20261111_12`, integridade ok e zero violações FK. Não houve migração, restore de banco, fixture nem restart da API. PRs encadeados continuam abertos; o commit documental posterior não é o commit servido.

## Diagnóstico e alteração limitada

O diretório `/br/empresas` renderizava um ícone genérico, sem usar `logo_url`. A consulta inicial encontrou 24 empresas elegíveis e 20 logos cadastrados. Esses números são uma linha de base histórica, não uma constante: os cadastros continuaram mudando legitimamente durante a release. Os testes finais consultam a paginação atual; não criam nem alteram empresas.

O componente existente EmployerLogo agora tem variante exclusiva `directory`: área branca de **96 × 64 px**, borda discreta, imagem inteira em proporção natural (`object-contain`), sem recorte, deformação ou recompressão. O nome empresarial é **18 px**, com quebra de nomes longos. Grade responsiva, filtros, paginação de vinte resultados, conteúdo e links canônicos slug-only foram preservados. URLs ausentes, inseguras ou imagens quebradas usam iniciais. Perfis não publicáveis ou de outra região continuam excluídos.

A chamada passa para **“O mercado de tecnologia trabalha aqui.”** na capa e nas ocorrências do mesmo slogan: rodapé, Sobre, AuthShell do candidato e descrição de marca regional. Foi corrigida uma coluna implícita dos filtros que causava overflow já existente no celular, com `grid-cols-1` explícito.

**O mosaico de vagas da capa não teve aumento de logo nem nome nesta release.** Continua com logo de 32 × 32 px e nome empresarial de 12 px. Os tamanhos no detalhe da vaga e no perfil empresarial também não foram alterados. Uma eventual proposta de 40 px/14 px para o mosaico é uma alteração futura, não publicada.

## Backup e recuperação

Backup completo novo: `/var/backups/portal-erp-jobs/company-directory-logos-prechange-20261118T014256Z`, incluindo banco, runtimes, configuração privada e logos. Leitura de archives, extração e restauração isolada do SQLite verificadas; cópia privada fora da origem validada independentemente por hash. Não foram gerados links públicos de backup.

Corte por rename de diretórios, com recuperação automática somente do Next, mesmo ID/env/cwd PM2. O Next anterior completo e o script/state de rollback permanecem arquivados. Assets estáticos antigos ausentes no novo build foram preservados por seus bytes/paths, evitando chunks 404 em abas antigas. Nginx, outros hosts, API, SPA, dados e uploads não foram alterados. Somente BR permanece ativo.

## Homologação e produção

Bateria completa Next local e remota: **725 testes em 33 arquivos**, TypeScript e build aprovados. Wrapper de recuperação: 33 testes sintéticos. Verificações públicas: **22 checks** de diretório, slogan, empresas slug-only, 404 sem redirect nas rotas retiradas, idioma/canonical, Admin noindex, robots e sitemaps. Chromium desktop e celular: logos exibidos carregando, área 96×64 px, nomes 18 px, paginação, nova chamada e ausência de overflow. Todos os envios foram bloqueados; zero gravações pelos testes.

Alguns primeiros guards operacionais bloquearam antes de qualquer corte: resumo Vitest com ANSI, caches FETCH públicos normalmente renovados e smoke de saúde usando uma rota raiz API inexistente. Foram corrigidos somente helpers fora do repositório. Fonte/bundles não derivados foram conferidos contra o backup (18.577 arquivos). Caches FETCH são aceitos somente após validação de origem loopback, rotas públicas BR, tags, formato, status e ausência de credenciais. Os caches WebP da marca foram comprovados byte a byte contra a otimização pública de seu PNG. READY original e evidências de bloqueios foram preservados, não sobrescritos para ocultar drift.

## Logs e ressalva

Na janela anterior ao corte, o Next antigo registrou **três rejeições de Server Reference ID inválido** e o Nginx registrou **um GET 503**. A auditoria dessa linha de base não foi aprovada e permanece documentada para investigação; não se afirma que a plataforma inteira esteja livre de erros ou que esse 503 foi resolvido.

Na manutenção do corte houve **seis 502**, todos exatamente pareados com recusa do listener Next `127.0.0.1:3001` planejadamente parado. API `:5000` nunca foi parada. A janela saudável posterior ao corte e aos testes passou com **zero erros de runtime e zero 5xx**. Um GET 400 ao IP da origem foi revisado por assinatura exata como rejeição não canônica, sem liberar outros hosts, rotas ou 5xx. Logs fonte permanecem preservados e a janela é finita; não há promessa de monitoramento contínuo.

## Encerramento

Chave SSH temporária retirada por material exato; outras chaves preservadas. Nova tentativa com a chave retirada retornou Permission denied. Chave privada e socket locais removidos. Staging, candidato incompleto e diretório de operações desta release removidos por caminhos exatos. Backups, cópia privada independente, evidências de recuperação e Next anterior preservados. Não houve merge/tag dos PRs encadeados por consequência desta publicação.
