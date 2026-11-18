# Diretório de empresas — logos legíveis e chamada de tecnologia

## Estado

Código e homologação local concluídos; nova publicação ainda pendente da instalação da chave SSH solicitada. Branch `fix-company-directory-logos-20261117`, baseada na correção Admin anterior. O deploy de Admin já serve SPA `6ac36b31955b51d02a078c6c635ef6ef8fd525a9`, com API/Next `d211a37f210a072f049b2955653363d95f4e5483`; o novo diretório e slogan não devem ser apresentados como publicados antes de backup, staging e gates produtivos.

## Diagnóstico

Em `/br/empresas`, cada card renderizava sempre um ícone Building2, sem consumir o campo `logo_url`. O endpoint público correto, `/br/api/companies/search`, confirmou 24 empresas elegíveis e 20 logos já cadastrados, incluindo Aliare e Skyone. Os vinte arquivos PNG retornam HTTP 200; dezenove têm largura 256 px e um 200 px. Não foi necessário reenviar logos, alterar dados ou criar imagens de marca.

## Alteração visual limitada

A listagem usa o componente existente EmployerLogo com uma variante exclusiva `directory`: área branca de 96 × 64 px, borda discreta, imagem inteira em proporção natural (`object-contain`), sem recorte, deformação ou recompressão. A largura adicional favorece marcas horizontais. Os tamanhos dos logos em vagas e no perfil empresarial permanecem inalterados. Na ausência de logo ou URL segura, usam-se iniciais; falhas de carregamento também recuam para essa alternativa.

O nome empresarial passa para 18 px, com quebra de títulos longos e coluna flexível. A grade de uma/duas/três colunas conforme a tela, filtros, paginação de vinte resultados, descrição, setor, local, tamanho e links canônicos de empresa sem ID foram preservados. Empresas não publicáveis ou de outra região continuam excluídas antes de renderizar imagem ou nome.

A chamada solicitada passa de **“O mercado de software trabalha aqui.”** para **“O mercado de tecnologia trabalha aqui.”** na capa e nas ocorrências do mesmo slogan: rodapé, Sobre, AuthShell do candidato e descrição de marca regional. É somente alteração de texto; não muda fluxos de cadastro ou autenticação.

## Gates locais

Foram acrescentados 12 testes server-rendered da listagem cobrindo logo cadastrado, área/proporção, nome maior, iniciais, URLs inseguras, elegibilidade regional, dados públicos, filtros, paginação e links slug-only. A bateria completa Next passou: **725 testes em 33 arquivos**, TypeScript e build aprovados. A verificação HTTP dos vinte logos e suas resoluções também passou.

O preview local usa uma ponte restrita a leituras públicas GET em loopback, sem banco privado, cookies/tokens ou métodos de escrita. Todos os envios no Chromium são bloqueados. Desktop e celular passaram: vinte cards na primeira página, quatro na segunda, logos cadastrados carregando, área 96×64 px, nomes 18 px, paginação e chamada de tecnologia, sem overflow. Foi corrigida somente uma coluna implícita dos filtros que causava overflow já existente no celular (`grid-cols-1` explícito); cards e filtros continuam os mesmos. As tentativas de browser bloqueadas foram preservadas. Capturas e resultados devem ser apresentados como preview, não como produção.

## Publicação pendente

A chave temporária da correção Admin foi efetivamente retirada. A nova alteração necessita novo acesso SSH autorizado para capturar backup atualizado da produção, inclusive logos atualmente cadastrados, validar cópia privada fora da origem e homologar a fonte imutável. O deploy deve afetar somente o Next: conservar SPA/Admin corrigida, API/venv, schema 12, reservas, dados/arquivos de logos, configuração e hosts. Não restaurar banco em rollback, nem ativar outros países. Não mesclar os PRs encadeados ainda abertos por consequência desta alteração.
