# Portal ERP Jobs — empresas com slug único por país, sem ID público

Data: 11/11/2026. Escopo exclusivo da plataforma Jobs.

## Estado verdadeiro

A implementação está concluída e homologada localmente. **Ainda não foi implantada em produção nesta release.** O servidor `root@161.35.228.99` respondeu à tentativa SSH final, mas recusou a chave temporária com `Permission denied (publickey,password)`. A chave pública enviada foi conferida e corresponde à chave privada local, protegida para acesso somente pelo proprietário.

O backup produtivo, staging remoto e deploy desta alteração dependem desse acesso. Não foram executados nem devem ser apresentados como concluídos. A release anterior com URLs `/{país}/empresas/{slug}/{id}` permanece a referência produtiva anterior; o estado atual do banco não foi recertificado via SSH neste trabalho.

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
| Scripts operacionais: preservação, rollback e gates | **12 testes aprovados** |
| Next: TypeScript e build | Aprovados |
| SPA: lint focal e build | Aprovados |
| Auditoria Python | Nenhuma vulnerabilidade conhecida encontrada |
| Auditorias Next/SPA | Nenhuma vulnerabilidade alta/crítica; permanecem 1 moderada no Next e 3 moderadas/1 baixa na SPA |

O E2E usa o mesmo comando `next start` já empregado em produção. Uma alteração não solicitada para runtime standalone foi retirada antes dos gates finais. Serviços e bancos da homologação são sintéticos e isolados; o runner encerra seus serviços e remove o banco ao sair.

A revisão independente não encontrou bloqueadores P0/P1. A inconsistência inicialmente encontrada entre elegibilidade do diretório e do detalhe foi corrigida e coberta por regressão. Também foi corrigido o achado condicional PostgreSQL de snapshots antigos: alterações de país em REPEATABLE READ/SERIALIZABLE são recusadas antes da consulta de memberships. A nova prova concorrente passou. Isso não muda o comportamento SQLite da produção pretendida.

Os testes PostgreSQL são suplementares, executados em clusters locais descartáveis, não uma migração de infraestrutura. O baseline PostgreSQL histórico completo contém limitação anterior à revisão 12; os testes desta revisão partem de schema 11 equivalente. Nenhuma migração do banco produtivo para PostgreSQL é proposta.

## Sequência de publicação pendente

1. Restabelecer o SSH pela chave temporária desta release e conferir schema, markers, integridade, FKs, serviços e capacidade, somente por leitura.
2. Fazer backup consistente do SQLite, runtime e configuração Jobs; verificar restauração isolada e hashes, incluindo cópia privada fora do servidor.
3. Homologar o commit exato em staging remoto e em cópia atual do banco. O gate falha se encontrar snapshots ausentes/malformados/reservados não cobertos pela autorização seletiva; não permite reparação silenciosa desses casos.
4. Parar controladamente os processos necessários, aplicar a migration aditiva e trocar API, SPA e Next. Aplicar somente o patch Nginx que retira URLs antigas de empresas no host legado. Preservar dados de negócio, timestamps, IDs, sessões e snapshots de vagas.
5. Validar perfis, canonical, sitemap, dados estruturados, 404 das rotas retiradas, browser, hashes de runtime, banco e logs novos. Não criar contas de teste permanentes.
6. Somente depois desses gates: fechar/mesclar o PR, taguear o commit efetivamente implantado e remover a chave temporária.

O rollback preferencial é **de código, mantendo schema 12 e reservas**, sem sobrescrever o banco atual com dados antigos. Escritas únicas válidas da versão 11 continuam compatíveis pelos guards; colisões são recusadas com rollback. O downgrade apaga tombstones e não é rollback seguro para continuar servindo URLs sem ID depois de exclusões definitivas.

## Continuidade

A chave temporária deve permanecer localmente protegida apenas até o deploy autorizado. Não anexar banco, chave privada, credenciais, variáveis de ambiente ou estados de login a relatórios/PRs. A aprovação de empresas, RBAC, IDs internos, regras de candidaturas e operação regional existente são preservados.
