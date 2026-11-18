# Mosaico da capa — logo e nome empresarial mais legíveis

## Escopo autorizado

Somente no mosaico de vagas recentes da capa: área do logo de **32×32 para 40×40 px** e nome empresarial de **12 para 14 px**, em **seminegrito (600)**. O título da vaga permanece o foco principal. Não há redesenho do card.

Foi adicionada uma variante exclusiva `mosaic` no componente EmployerLogo. RecentJobs é seu único consumidor. As variantes `card`, `hero`, `sidebar`, `profile` e `directory` mantêm seus tamanhos; em particular o diretório continua com logo 96×64 px e nome 18 px. Imagem proporcional, lazy loading, alternativa por iniciais, falha de imagem e confidencialidade permanecem iguais.

Grade responsiva de 1/2/4 colunas, até 20 vagas recentes (5 linhas quando existem 20 no desktop), ordenação data/ID, links canônicos regionais, aba navy e elegibilidade de membro não foram alterados. Nomes longos continuam quebrando linha, sem truncamento. Não foram modificados API, banco, dados, uploads, Admin, cadastros, candidatura, Nginx, outros hosts ou países.

## Gates locais

Revisão estática independente: PASS, diff de aplicação restrito a três arquivos Next, sem alteração no diretório nem nas regras de privacidade/membro. Regressões cobrem 40 px, texto 14 px/600, confidenciais/iniciais, preservação das cinco outras variantes, grade, limite/ordem, membros e elegibilidade regional. Bateria Next: **730 testes em 33 arquivos**, TypeScript e build aprovados.

A homologação de browser usa ponte de leituras públicas em loopback, sem banco privado ou sessão real; todos os métodos de escrita são bloqueados. O transporte local das imagens públicas foi corrigido apenas no teste, pois a resolução DNS do preview também interceptava o domínio dos logos. Desktop, tablet e celular passaram: logo 40×40 px, nome 14 px/peso 600, 20 vagas recentes na ordem da API, grade 4/2/1 colunas, imagens carregadas, canonical/idioma, aba navy e ausência de overflow. O diretório também foi medido: 96×64 px e nome 18 px preservados. As capturas são de homologação local, não produção.

## Publicação

**Deploy ainda pendente da chave SSH desta release.** O primeiro teste com a chave nova retornou Permission denied. A chave anterior foi retirada após a publicação do diretório. Há novo backup local da fonte limpa por hash, mas o backup atualizado da produção e a cópia privada independente ainda dependem do acesso.

A publicação deve afetar somente o Next, com staging isolado, fonte imutável, backup novo, paridade de runtime/configuração/PM2/dados e recuperação somente do Next. API permanece no commit `d211a37f210a072f049b2955653363d95f4e5483`, SPA/Admin em `6ac36b31955b51d02a078c6c635ef6ef8fd525a9` e Next atual em `6868a4acc4a4dd8030c8c60bb9ffea1bf8098d5b`. Não restaurar banco nem tocar uploads. Os PRs encadeados devem permanecer abertos para revisão; nenhuma tag/merge por consequência automática desta alteração.

O diagnóstico anterior de GET 503 e rejeições de Server Reference ID inválido não é declarado resolvido por este ajuste visual. Logs da manutenção e do novo runtime precisam de gates próprios; não prometer estabilidade contínua ou indexação do Google.
