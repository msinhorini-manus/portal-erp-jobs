# Diagnóstico do contexto regional — Portal ERP Jobs

## Escopo autorizado

Atualização somente diagnóstica sobre a base `c2d462fac23edaec268b4c7b99aa2ff8c3aa6d6a`. Não incorpora as molduras, contagens e dashboard da release pendente. Nenhuma alteração de API, Admin, banco, migration, env, dependências, configurações, cache, retry, DNS, e-mails ou ativação de países.

O Next registra eventos sanitizados em stdout com prefixo `JOBS_REGIONAL_DIAG`. O objetivo é identificar falhas futuras da leitura de `/api/context`, incluindo fetch, resposta HTTP, leitura/parse JSON e validação. Uma falha histórica sem esse diagnóstico não pode ser atribuída retrospectivamente.

## Privacidade e comportamento

Esquema fechado v1: operação fixa, ID gerado no servidor para correlação de eventos da mesma leitura, emissor, fase, evento, classe de caminho, classe BR/inativo, booleanos RSC/prefetch, tentativa, status técnico, duração limitada e cadeia de até três nomes/códigos de erro allowlisted. Não registra mensagens, stack, URL variável, IDs de entidades, query values, cabeçalhos, cookies, credenciais, referrer, corpo, contatos ou ambiente.

Não há logs de sucesso normal. Um 404 normal do contexto MX/CO não emite falha HTTP; BR400/404 e erros reais de transporte, JSON, validação e 5xx permanecem observados. Isso não altera respostas ou regras de inatividade.

O classificador original de retry permanece byte-idêntico. `recovered` significa que a segunda tentativa já permitida recebeu headers, não prova HTTPOK, JSON válido ou contexto correto. Callers fora de `/api/context` anônimo/bodyless/GET/no-store continuam não observados. Falhas de detalhes de empresa/vaga posteriores à resolução não são atribuídas ao contexto.

Observação, sanitização, clock, serialização e stdout são protegidos para não mudar o resultado da requisição. Não se promete persistência física se stdout/SO falhar.

## Gates locais

Suíte completa final:1072 testes em35 arquivos, todos aprovados, sem skips ou falhas;730 originais e342 novos. TypeScript aprovado. Comparações diferenciais preservam status, statusText, corpo, headers e opções de fetch. Negativos incluem getters, proxies, ciclos, logger/serialização falhos, classes de outro realm, bounds e dados secretos sintéticos. Dois controles Undici locais verificam a recuperação restrita e a segunda falha correlacionada. O hash do classificador original permanece idêntico.

Testes usaram dependências já instaladas, ambiente mínimo, loopback isolado e cache Vitest desativado. O marcador `next/dist/compiled/server-only` é neutralizado somente pelo harness externo de testes, sem alterar a configuração da aplicação. Build padrão Turbopack e runtime real são gates obrigatórios seguintes; TypeScript/unit tests não os substituem.

## Estado no commit de implementação

Implementação local preparada. Ainda não houve READY, corte ou publicação deste commit. A versão anterior continua restaurada. Backup fresco e off-server da retomada foram validados separadamente; os guards de frescor serão revalidados antes de eventual corte.

Publicação exige build padrão com fontes reais, testes remotos isolados, smokes sintéticos do bundle, pins de fonte/módulos/helpers, READY próprio, rollback Next-only, API continuamente online e auditoria final com janela de logs não vazia e endpoints/segmentos privados preservados em sucesso ou falha. Não declarar a release funcional publicada nem o503 corrigido apenas com esses diagnósticos.

## Resultado operacional —19/11/2026

A atualização **somente diagnóstica** do commit `886cd7815beea03b4faac7ccf47f8f00f6d19af8` foi ativada no Next em produção e validada em corte, browser e auditoria final. Não incorpora as molduras, contagens ou dashboard pendentes. O503 histórico não foi atribuído nem considerado corrigido.

Staging remoto:1072 testes em35 arquivos, zero falhas/skips; TypeScript aprovado; build padrão Turbopack e `next start` aprovados. Testes foram executados em namespace sem rede externa, com loopback. O **build teve rede pública apenas para fontes Google**; não usou API/ambiente produtivos, Webpack ou fontes mockadas. Treze WOFF2 nativos foram validados independentemente: sete Inter e seis Manrope. Smokes do bundle foram executados contra API sintética, sem banco produtivo. A suíte operacional final passou177 testes.

Foi realizado backup fresco materializado, com validação/restore isolado e cópia privada off-server, e criado READY real com artefatos/pins físicos. O corte atuou somente no Next; PID, uptime, reinícios, fontes, marker e ambiente da API permaneceram iguais. Admin legado, configuração, schema12, dados, uploads, logos, regras regionais e retry permaneceram preservados. Não houve migration, DB restore ou teste com gravação no banco.

Três tentativas anteriores foram preservadas: cliente urllib sem identificação recebeu403 na borda; smoke Admin procurava noindex apenas no HTML em vez de também verificar X-Robots-Tag; classificador desconhecia duas mensagens nativas de startup. As duas primeiras não ativaram a fonte diagnóstica; as recuperações reiniciaram o Next anterior, mas a observação também falhou pelos contratos dos smokes. A terceira ativou a fonte e executou rollback, cujo fechamento foi aprovado. Somente identificação explícita do probe, verificação correta de noindex e duas variantes nativas estritas foram refinadas, testadas e repinadas. Nenhum5xx/erro/traceback foi admitido. Relatórios originais não foram reescritos ou reclassificados como aprovados.

Na tentativa final, o corte foi aprovado com43 linhas access e cinco linhas nativas de startup. A janela pública original incluiu145 linhas access:140 respostas200, quatro404 e um499 de conexão encerrada pelo cliente. Não houve5xx; o499 ficou registrado, não foi convertido em200 ou503. Os seis segmentos de cada janela foram preservados integralmente, com marcador público único e receipts pinados.

Browser desktop1440px, tablet820px e celular390px: navegação real/RSC, locale pt-BR, grid4/2/1 e logos48px preservados; zero5xx, exceções JS ou métodos de escrita enviados. A ausência dos novos contadores foi também verificada. MX/CO continuam404 e noindex do Admin permanece validado.

Auditoria final aprovada, chave temporária retirada preservando todas as demais e recusa autenticada comprovada em nova conexão. Socket/identidade local e temporários diagnósticos foram removidos; backups, recovery, fontes antigas e árvores de rollback permanecem retidos. PR#34 segue separado e não houve merge de PRs encadeados.

Próximo passo: analisar os eventos sanitizados se o503 voltar a ocorrer, definir a correção com evidência e só então re-homologar/publicar a release funcional em uma nova operação. Diagnóstico ativo não é garantia de eliminação do503 ou de indexação Search Console.
