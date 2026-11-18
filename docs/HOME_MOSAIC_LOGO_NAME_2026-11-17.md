# Mosaico da capa — logo e nome empresarial mais legíveis

## Escopo autorizado

Somente no mosaico de vagas recentes da capa: área do logo de **32×32 para 48×48 px** e nome empresarial de **12 para 14 px**, em **seminegrito (600)**. O título da vaga permanece o foco principal. Não há redesenho do card.

Foi adicionada uma variante exclusiva `mosaic` no componente EmployerLogo. RecentJobs é seu único consumidor. As variantes `card`, `hero`, `sidebar`, `profile` e `directory` mantêm seus tamanhos; o diretório continua com logo 96×64 px e nome 18 px. Imagem proporcional, lazy loading, alternativa por iniciais, falha de imagem e confidencialidade permanecem iguais.

Grade responsiva de 1/2/4 colunas, até 20 vagas recentes (5 linhas com 20 vagas no desktop), ordenação data/ID, links canônicos regionais, aba navy e elegibilidade de membro não foram alterados. Nomes longos quebram linha, sem truncamento. Não foram modificados API, banco, dados, uploads, Admin, cadastros, candidatura, Nginx, outros hosts ou países.

## Gates locais e staging remoto

Revisão estática independente: PASS, diff de aplicação restrito a três arquivos Next. Regressões cobrem 48 px, texto 14 px/600, confidenciais/iniciais, preservação das outras variantes, grade, limite/ordem, membros e elegibilidade regional. **730 testes Next em 33 arquivos**, TypeScript e build aprovados localmente e no staging remoto isolado.

O browser local usa apenas leituras públicas, sem banco privado ou sessão real; métodos de escrita são bloqueados. Desktop, tablet e celular passaram, com 48×48 px, nome 14 px/peso 600, vinte vagas na ordem mais recente, grade 4/2/1 colunas, imagens, canonical/idioma, aba navy e ausência de overflow. Diretório 96×64 px/nome 18 px preservado.

## Publicação comprovada — 18/11/2026

**Aplicação publicada e validada em https://jobs.portalerp.com/br.** Commit Next servido: `107188747dd0593734c24e1081cc0d999b9e7abf`, PR #30. API permanece em `d211a37f210a072f049b2955653363d95f4e5483`; SPA/Admin em `6ac36b31955b51d02a078c6c635ef6ef8fd525a9`.

Novo backup privado da produção: `/var/backups/portal-erp-jobs/mosaic-logo-name-prechange-20261118T030518Z`. Banco consistente, runtimes API/SPA/Next, logos e configurações incluídos. A venv externa foi materializada somente dentro de cópia privada, com igualdade de manifesto de arquivos/links e extração/restauração isolada. O vínculo e a venv ativos não foram alterados. Cópia privada fora da origem comprovada por hashes e invariantes do banco. Não foi testado boot integral de uma VM restaurada.

Corte somente do Next, com fonte imutável, READY vinculado ao staging, árvore anterior retida, assets estáticos compatíveis e rollback independente arquivado. API não foi parada nem reiniciada. Nenhuma migração, restauração do banco, escrita em empresas/vagas ou alteração de uploads ocorreu pela release.

Gates públicos HTTP: PASS. Browser Chromium no domínio público: desktop 1440 px, tablet 820 px e celular 390 px, com medidas 48×48/14 px/600, grid 4/2/1, vinte vagas recentes, imagens carregadas, canonical/idioma, aba navy e zero overflow; diretório 96×64/nome 18 preservado. Todos os métodos de escrita foram interceptados no browser. Não foram criadas contas, candidaturas ou vagas artificiais na produção.

Paridade final de código/bundles, configuração, processos, rollback e dados: PASS. Schema `20261111_12`, integridade `ok`, FK=0, reservas/triggers e invariantes empresariais preservadas. Auditoria finita dos seis logs: zero erros e zero 5xx saudáveis inesperados; uma ocorrência 502 da parada planejada do listener Next, pareada com a respectiva recusa de loopback. A janela anterior ao corte também registrou zero erros/5xx nesta release.

## Reconciliações operacionais restritas

Antes do corte, o READY bloqueou um cache novo da marca clara do rodapé. Seu arquivo foi reproduzido byte a byte em memória pelo Sharp do próprio Next e ligado à fonte/chave/parâmetros públicos exatos. Um helper irmão pinado valida somente esse cache, preservando o validador anterior e a paridade de toda fonte/bundle/configuração. O cache PNG gerado pelo teste HTTP sem Accept WebP foi retirado apenas depois de prova nativa e pin exato; nenhuma fonte ou dado foi removido. Seis regressões do sibling e 64 regressões da transação passaram.

A auditoria final reconheceu somente a navegação à origem `POST /` → 307 → `POST /br` → 404 comprovada, sem liberar outros hosts, métodos, rotas, parâmetros ou 5xx. Os logs originais foram preservados. Nenhum helper da release anterior foi sobrescrito.

## Fechamento e limites

Staging e operações temporárias remotos desta release foram removidos depois de arquivar a evidência integral na recuperação. Backup, árvore anterior e rollback foram preservados. Chave SSH temporária retirada por material exato, outras chaves preservadas; autenticação nova com a chave retirada recusada. Chave privada e socket locais removidos; nenhum preview local permanece ativo.

Os PRs encadeados continuam abertos para revisão, sem merge ou tag automático. Um commit documental posterior não altera o commit de aplicação servido. O diagnóstico anterior de GET 503/rejeições de Server Reference ID inválido de releases anteriores não é declarado resolvido por este ajuste visual. A aprovação da janela finita não equivale a garantia de estabilidade contínua nem de indexação do Google.

## Histórico da revisão

A proposta de 40 px, nunca publicada, foi substituída por 48 px a pedido do usuário em 17/11 às 23:51 BRT. Scripts e provas de 40 px ficaram arquivados como históricos. O acesso inicialmente recusado foi instalado pelo usuário; backup, staging, READY e corte finais usaram exclusivamente a revisão de 48 px.
