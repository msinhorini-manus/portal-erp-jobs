# Portal ERP Jobs — empresas com slug único por país, sem ID público

Data: 11/11/2026. Escopo exclusivo da plataforma Jobs.

## Estado verdadeiro

A implementação está **implantada e validada em produção** no commit exato `ab2e132da71a029f7215d0111dc4765ac0f72159`, em 11/11/2026 BRT, com validações finais de runtime, banco e logs após os testes públicos. O PR #25 foi mesclado e a tag `company-country-slug-only-20261111` aponta ao commit de aplicação efetivamente servido. A main pode receber esta documentação posterior sem alterar o runtime publicado.

Foram verificados backup consistente, restauração isolada, hashes, cópia privada fora da origem e staging do archive completo. A publicação final foi uma retomada **somente de código sobre schema 12 já aplicado**: não executou nova migration, downgrade ou restauração de banco. Backend e Next estão online; schema `20261111_12`, integridade OK, FK=0, zero reservas duplicadas ou inconsistentes e somente BR ativo.

## URL e unicidade

A URL brasileira passa a ter o formato:

```text
https://jobs.portalerp.com/br/empresas/megasoft
```

O prefixo continua identificando o país; o nome da coleção acompanha o idioma configurado, sem ativar México, Colômbia ou qualquer outro país. A implementação permanece na mesma plataforma e no mesmo banco. Não altera `portalerp.com/br`, DNS ou regras Cloudflare de outros serviços.

O ID continua existindo no banco, nas relações, no Admin e nas APIs internas. Apenas deixa de compor a URL pública do perfil empresarial. As URLs e snapshots já publicados das vagas não mudam nesta alteração.

A migration `20261111_12`, encadeada à `20261111_11`, acrescenta reservas permanentes com `UNIQUE(country_code, slug)`. A chave utiliza o país ISO, não apenas `site_id`: empresas diferentes não podem ocupar o mesmo slug em dois sites do mesmo país. Países diferentes podem reutilizar o mesmo slug. A mesma empresa pode compartilhar sua própria reserva em presenças distintas do mesmo país.

Na colisão, a alocação tenta nome, setor, cidade, combinação de qualificadores e sufixos alfabéticos, nunca o ID interno. Nomes recebem normalização ASCII, minúsculas e hífens. Segmentos numéricos puros ou reservados são recusados. Renomear uma empresa não muda automaticamente sua URL estabelecida.

A reserva é transacional e protegida também no banco. Suspensão, rejeição e exclusão da presença não liberam o nome. A exclusão definitiva da empresa deixa uma reserva tombstone, impedindo que outra empresa herde a URL antiga. Não foi acrescentado um editor de slugs.

## Uma única rota pública

Conforme a orientação já adotada para a retirada das rotas antigas, **não são criados redirects de empresas**. Depois do deploy:

| Caminho | Resultado esperado |
|---|---|
| `/br/empresas/megasoft` | 200 para o perfil elegível |
| `/br/empresas/4` | 404, sem `Location` |
| `/br/empresas/megasoft/4` | 404, sem `Location` |
| Slug desconhecido, coleção/país incorretos, maiúsculas ou barra final no detalhe | 404, sem normalização para outra rota |

Canonical, sitemap, `Organization` e links do diretório e das vagas passam a apontar somente à rota sem ID. O sitemap valida a identidade e a elegibilidade antes de emitir a URL; indisponibilidade ou corrupção do inventário não produz um sitemap parcial com sucesso aparente.

A API pública `GET /api/companies/by-slug/{slug}` resolve o perfil exclusivamente no site ativo determinado pelo transporte confiável. A aprovação administrativa continua obrigatória. Perfis pendentes, rejeitados, suspensos, com responsável global inativo, ou presentes apenas em outro país não são publicados.

Diretório, detalhe e links de empregador foram alinhados: perfis sem slug persistido ou com responsável inativo não deixam cards apontando a 404. Não há fallback baseado no nome, no ID ou no slug de marca de uma vaga. GET não cria reservas nem altera snapshots. Empresas confidenciais nas vagas continuam sem link ou identidade de perfil público.

## Homologação final local

| Gate | Resultado |
|---|---|
| Backend em 16 suítes isoladas | **191 testes aprovados** |
| Next/Vitest | **477 testes aprovados** |
| Browser integrado de URLs, SEO, autenticação, equipe e revogação | **455 verificações aprovadas** |
| SPA: URLs e runtime regional | **23 testes aprovados** |
| Patch Nginx: isolamento e idempotência | **6 testes aprovados** |
| Scripts operacionais originais revisados | **23 testes aprovados** |
| Complementares da retomada | **7 backup, 5 logs, 8 wrapper e 6 cache aprovados** |
| Next: TypeScript e build | Aprovados |
| SPA: lint focal e build | Aprovados |
| Auditoria Python | Nenhuma vulnerabilidade conhecida encontrada |
| Auditorias Next/SPA | Nenhuma vulnerabilidade alta/crítica; permanecem 1 moderada no Next e 3 moderadas/1 baixa na SPA |

O E2E usa o mesmo comando `next start` já empregado em produção. Uma alteração não solicitada para runtime standalone foi retirada antes dos gates finais. Serviços e bancos da homologação são sintéticos e isolados; o runner encerra seus serviços e remove o banco ao sair.

A revisão independente não encontrou bloqueadores P0/P1. A inconsistência inicialmente encontrada entre elegibilidade do diretório e do detalhe foi corrigida e coberta por regressão. Também foi corrigido o achado condicional PostgreSQL de snapshots antigos: alterações de país em REPEATABLE READ/SERIALIZABLE são recusadas antes da consulta de memberships. A nova prova concorrente passou. Isso não muda o comportamento SQLite da produção pretendida.

Os testes PostgreSQL são suplementares, executados em clusters locais descartáveis, não uma migração de infraestrutura. O baseline PostgreSQL histórico completo contém limitação anterior à revisão 12; os testes desta revisão partem de schema 11 equivalente. Nenhuma migração do banco produtivo para PostgreSQL é proposta.

## Publicação e validação executadas

O staging aprovou 26 gates: 186 testes backend remotos, suplemento PostgreSQL local não-root com cinco testes, Next/Vitest 477, SPA 23, migrations 11→12→11→12 em cópia, compatibilidade do writer anterior, builds e auditorias. PostgreSQL não foi instalado ou executado na origem.

A produção aprovou 155 verificações HTTP públicas em quatro empresas, 13 verificações no Chromium desktop e 15 no móvel, incluindo ausência de overflow. MegaSoft respondeu GET/HEAD 200 na URL sem ID; rotas numéricas, slug+ID, maiúsculas e barra final responderam 404 sem Location. As vagas reais mantiveram suas URLs. Canonical, Open Graph, Organization, diretório e sitemap utilizam o slug empresarial sem ID. Robots e cinco páginas BR principais foram revalidados; sitemap com 17 URLs, somente Brasil, sem rotas privadas.

A paridade final verificou 103 arquivos backend, 17 artefatos SPA e 18.856 arquivos Next, incluindo hashes e permissões. Foram segregados 84 bytecodes Python derivados apenas quando sua fonte correspondente permaneceu pinada e verificada; fonte, bytecode sem fonte correspondente, symlinks e artefatos Next não receberam exclusão ampla. O banco, reservas, propriedade empresarial, memberships, configuração e processos foram recertificados após a bateria pública. Não foram criadas contas, candidaturas ou fixtures na produção.

## Ocorrências operacionais preservadas

A primeira transação aplicou schema 12 e passou os smokes, mas reverteu código por um único 502 ao IP exato da origem durante a manutenção. O evento foi pareado com recusa do listener loopback parado. O helper operacional irmão permite exclusivamente esse tipo de 502 pareado dentro da manutenção; o original e o READY ficaram intactos.

Um preflight da retomada bloqueou SIGPIPE porque `git get-tar-commit-id` lê apenas o cabeçalho do archive; a correção alimentou os 1024 bytes esperados e preservou o hash integral e a inspeção de todos os membros. Uma retomada adicional reverteu código por comparação de `__pycache__` gerado em caminhos diferentes; a distinção de cache/fonte foi corrigida e testada fora do repositório. Ambos os rollbacks produtivos preservaram schema 12 e os dados; não houve restauração de DB.

Os logs da transação final passaram sem erros ou 5xx inesperados. Na janela pública, o classificador de host estrito também sinalizou dois acessos GET ao IP exato da origem: 307 na raiz e 404 em `/br`. Esses dois registros foram revisados individualmente, com deltas e hashes privados preservados; a revisão de todos os logs confirmou zero erros/5xx, sem tolerância geral a hosts desconhecidos. O READY pré-cutover conserva o hash do Nginx anterior; a conferência pós-cutover usa corretamente o hash do candidato aprovado, sem modificar o READY.

O rollback preferencial é **de código, mantendo schema 12 e reservas**, sem sobrescrever o banco atual com dados antigos. Escritas únicas válidas da versão 11 continuam compatíveis pelos guards; colisões são recusadas com rollback. O downgrade apaga tombstones e não é rollback seguro para continuar servindo URLs sem ID depois de exclusões definitivas.

## Continuidade

A chave temporária exata desta release foi retirada do root; uma nova conexão com ela foi recusada. A chave privada local, socket SSH, aliases temporários de prova e staging/operacionais remotos foram removidos. Os demais acessos SSH e todos os backups de rollback, incluindo as cópias privadas fora da origem, foram preservados. Evidências operacionais e de staging estão arquivadas de forma privada junto ao backup de recuperação.

Não anexar banco, chave privada, credenciais, variáveis de ambiente ou estados de login a relatórios/PRs. A aprovação de empresas, RBAC, IDs internos, regras de candidaturas e operação regional existente são preservados. Search Console, resultados avançados Google e desempenho de campo continuam pendentes de execução/evidência do operador; não há promessa de indexação.
