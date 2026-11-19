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

## Estado deste commit

Implementação local preparada. Ainda não houve READY, corte ou publicação deste commit. A versão anterior continua restaurada. Backup fresco e off-server da retomada foram validados separadamente; os guards de frescor serão revalidados antes de eventual corte.

Publicação exige build padrão com fontes reais, testes remotos isolados, smokes sintéticos do bundle, pins de fonte/módulos/helpers, READY próprio, rollback Next-only, API continuamente online e auditoria final com janela de logs não vazia e endpoints/segmentos privados preservados em sucesso ou falha. Não declarar a release funcional publicada nem o503 corrigido apenas com esses diagnósticos.
