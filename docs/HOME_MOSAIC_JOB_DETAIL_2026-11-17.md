# Portal ERP Jobs — mosaico da capa e detalhe da vaga

## Escopo autorizado

A proposta final aprovada é um mosaico de **4 colunas e 5 linhas**, com até 20 vagas públicas reais, mais recentes primeiro. O escopo é exclusivamente o Jobs no DigitalOcean; Flask continua a autoridade de dados e o Next permanece responsável pela apresentação pública. Não há migração de banco, alteração de URLs, DNS, Nginx, SPA/Admin, ativação de países ou mudança nas regras de candidatura, aprovação de empresas ou CRUD.

## Implementação

O hero central mantém a identidade Jobs by Portal ERP, busca e demais seções. A capa consulta 20 oportunidades, filtra a elegibilidade e região, ordena criação decrescente com desempate pelo ID e não preenche a grade com vagas artificiais. A grade responde com 1 coluna no celular, 2 no tablet e 4 no desktop. Os títulos não são truncados; localização, modalidade, contrato e publicação são os dados reais.

O DTO Flask acrescenta `company_logo_url`, opcional e compatível. Reutiliza a elegibilidade já resolvida e a relação regional carregada, priorizando o logo do CompanySite e usando o global somente quando não há override. Não adiciona consulta de elegibilidade nem libera marca para vagas confidenciais ou perfis não publicáveis. IDs permanecem internos e os builders públicos existentes preservam as URLs regionais de vagas e empresas.

Os logos ocupam 32px nos cards, 80–96px no cabeçalho da vaga e 48px na seção empresarial. Ausência, URL insegura ou erro de carregamento usa iniciais; vagas confidenciais usam identificação neutra. As imagens não são buscadas pelo servidor, têm dimensões reservadas e não enviam referrer a terceiros. A conferência do backup pré-release encontrou 24 empresas BR aprovadas e nenhum logo cadastrado: esta release não inventa marcas, não faz uploads nem altera esses cadastros.

O detalhe mostra descrição, responsabilidades quando cadastradas, requisitos, benefícios completos, tecnologias e informações reais. Listas explicitamente marcadas podem virar listas/chips; prosa e listas mistas mantêm o texto integral, sem resumo ou interpretação de HTML. Apenas linhas isoladas de `Candidatura: URL externa` e equivalentes são omitidas da apresentação e do JobPosting para evitar conflito com a orientação de candidatura interna; o registro original permanece intacto.

O botão usa o ApplyButton existente. Entrar/Criar conta retornam à mesma vaga regional por `redirect`. Não há novo destino de candidatura externa nem alteração de autenticação/aplicações. Canonical, Open Graph, JobPosting com directApply, WebSite/SearchAction, links internos e noindex privado permanecem nos contratos existentes. Somente BR está ativo.

## Backup e homologação

Backup do código Git bundle verificado antes das alterações. Backup consistente da produção em `/var/backups/portal-erp-jobs/layout-mosaic-prechange-20261117T202532Z`, com DB, runtimes e configuração, restauração isolada e hashes validados. Cópia privada independente fora da origem também verificada; nenhum backup, configuração ou credencial é publicado.

Homologação local: **197 testes backend em 16 suítes isoladas**, zero failures/errors/skips; **584 testes Next em 28 arquivos**, TypeScript e build aprovados. O Chromium verificou desktop, tablet e celular em uma API local com banco de backup somente leitura, sem cadastro nem envio de candidaturas. As verificações incluem 20 cards reais, grade 4/2/1, ordem de publicação, logos de 32px, ausência de overflow, canonical, idioma, JobPosting e links de candidatura. Correções dos requests de teste local respeitaram a separação Next/Flask/Nginx, sem alterar a aplicação para contornar testes.

## Estado de publicação

**Ainda pendente neste commit documental pré-release:** staging pinado pelo commit exato, transação de código com snapshot fresco e rollback somente de código, validação pública e de logs, fechamento do PR/tag e retirada da chave temporária. Não restaurar banco em rollback. Este documento será complementado após comprovação real da publicação.
