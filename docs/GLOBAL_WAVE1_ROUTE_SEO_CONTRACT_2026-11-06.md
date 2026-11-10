# Jobs: contrato de rotas por país e SEO para /br

**Data:** 6 de novembro de 2026. **Autor:** Manus AI. **Estado:** especificação para implementação; não implantada.

Usaremos **`https://jobs.portalerp.com/br` para o Brasil**, em uma única aplicação Next.js, com o Flask como autoridade de dados e regras e o mesmo banco no DigitalOcean. O contrato serve apenas ao Jobs. Nenhuma configuração de `portalerp.com`, do portal editorial ou de outros sites regionais será alterada.

## 1. País na URL, configuração no banco

O primeiro segmento é o país/mercado: `/br`, futuramente `/mx` ou `/us`. Não é o idioma: `/br` corresponde a `pt-BR`, mas `/pt`, quando homologado, corresponderia a Portugal e `pt-PT`. O idioma não deve mudar por cookie ou pelo navegador quando alguém visita uma URL regional explícita. A página em `/br` sempre entrega português brasileiro no HTML inicial.

Para o Brasil, a configuração proposta é `code=BR`, `country_code=BR`, `locale=pt-BR`, `currency_code=BRL`, `timezone=America/Sao_Paulo`, `canonical_origin=https://jobs.portalerp.com`, `url_prefix=/br` e `is_active=true`. Esses valores descrevem o estado-alvo, não uma alteração já feita.

País, prefixo, idioma, moeda e ativação devem vir do cadastro regional administrado por CRUD. Apenas BR ficará ativo nesta release. País desconhecido ou inativo retorna **404 real** e não cai silenciosamente no Brasil. Desativação deve invalidar o cache, retirar o país do seletor e retirar suas URLs dos sitemaps e alternates.

O código atual resolve o site apenas pelo host, guarda `site_domains.hostname` como único e já possui `url_prefix`, mas ainda não usa esse prefixo para resolver a requisição. Precisamos migrar a unicidade para o par **`hostname + url_prefix`**, preservando um domínio primário por site. A regra existente de unicidade por `site_id + url_prefix` também deve ser reavaliada para não impedir aliases em hosts diferentes. O preflight deve reprovar configurações ambíguas antes de qualquer DDL.

**Não gravar `/br` em `canonical_origin`.** O validador atual corretamente aceita somente uma origem HTTPS sem caminho. Manter a origem separada do prefixo e expor no contrato público `url_prefix` e uma URL regional derivada. Assim, `regionalBaseUrl = canonical_origin + url_prefix` não é confundida com origem de API, CORS, cookies ou imagens.

Preservar o registro BR e seus IDs. Esta mudança não demanda copiar usuários, currículos, empresas, vagas ou candidaturas. Os vínculos regionais existentes continuam sendo a fonte de verdade.

## 2. Organização do App Router

A proposta inicial é mover as jornadas existentes para um segmento dinâmico `[country]`, sem criar uma árvore de páginas separada para cada país. O App Router suporta esse padrão, incluindo um root layout abaixo do segmento dinâmico. [1]

```text
next/src/
  app/
    (global)/
      layout.tsx                    # root layout da entrada global
      page.tsx                      # /; redirect temporário para /br agora

    (regional)/
      [country]/
        layout.tsx                  # root layout com <html lang={site.locale}>
        page.tsx                    # /br
        vagas/
          page.tsx                  # /br/vagas
          [id]/page.tsx             # /br/vagas/3
        empresas/
          page.tsx                  # /br/empresas
          [id]/page.tsx             # /br/empresas/1
        areas/page.tsx
        tecnologias/page.tsx
        salarios/page.tsx
        conteudo/page.tsx
        sobre/page.tsx
        contato/page.tsx
        termos/page.tsx
        privacidade/page.tsx
        candidato/...
        empresa/...
        recuperar-senha/page.tsx
        redefinir-senha/page.tsx
        bff/
          candidate/...
          company/...
        sitemap.xml/route.ts        # inventário regional

    robots.ts                       # /robots.txt, único para todo o host
    sitemap.xml/route.ts             # índice de sitemaps dos países ativos

  lib/
    site.ts                         # DTO regional e montagem de URLs
    site-resolver.server.ts         # country + host -> site ativo
    regional-routes.ts              # route keys e slugs localizados
    regional-seo.server.ts          # canonical e alternates por publicação
    candidate-bff.ts
    company-bff.ts

  components/                       # reutiliza as telas e componentes existentes
```

Os grupos `(global)` e `(regional)` não aparecem na URL. Nesta organização, os layouts de ambos são root layouts e incluem `html` e `body`; não haverá um `app/layout.tsx` pai fixando `lang=pt-BR` para todos os países. Cada root layout importa estilos e fontes comuns. Metadados globais de robots/sitemap não devem depender de resolver um país pela raiz. Route handlers não precisam renderizar esses layouts.

Essa estrutura não significa reescrever telas ou duplicar a lógica de negócio. A migração deve reaproveitar as páginas e os componentes já presentes. Nas páginas que recebem parâmetros, ler `await params`, resolver o cadastro ativo e repassar o contexto validado aos clientes de dados.

**Não configurar `basePath: '/br'` globalmente no Next.** Isso fixaria toda a aplicação em um único prefixo e dificultaria `/mx`, `/us`, a raiz e o Admin. O segmento dinâmico deve ser o responsável pelo país.

Os caminhos do Brasil continuam em português. Para uma expansão futura, o roteador deve usar chaves lógicas e slugs localizados, por exemplo `jobs.index`, `companies.detail` e `password.reset`. `/mx/empleos` pode ser resolvido para a mesma implementação de listagem usada em `/br/vagas`; não criaremos uma tela nova por país. Um eventual rewrite interno não muda a URL canônica externa.

Manter os slugs em um registro central validado, com compatibilidade com a localização existente. Se forem editáveis pelo CMS, usar chaves permitidas e histórico de redirects, sem aceitar caminhos arbitrários capazes de sombrear `bff`, `api`, `admin` ou assets. Neste lançamento não é necessário publicar rotas espanholas ou inglesas.

## 3. Conteúdo por CRUD, não por cópias no código

Configuração regional, textos institucionais, conteúdo comercial e metadados editoriais devem ser administráveis pelo Admin/CMS. A homepage brasileira deve ser preservada na migração, não substituída por conteúdo novo de exemplo.

Componentes, validações e traduções genéricas de interface podem ser compartilhados. Conteúdo próprio de um país não deve ficar em `if (country === 'mx')` ou numa nova página hardcoded. O código atual ainda possui textos regionais em constantes e formatos fixos em páginas; eles precisam ser desacoplados conforme o conteúdo migrado, sem declarar os futuros países traduzidos antes da homologação.

O CMS deve conseguir guardar a publicação regional e, quando houver traduções equivalentes, uma chave de equivalência. Não precisamos criar equivalências fictícias para vagas independentes de países diferentes.

## 4. Links, troca de país e segurança das APIs

Usar um helper único, como `regionalHref(site, routeKey, params)`, para links, ações de formulário e redirects das jornadas. Separar `regionalUrl(...)` para SEO de `assetUrl(...)` para imagens. Assets globais podem permanecer em `/_next`, `/assets`, `/uploads` e `/og-image.png`; não recebem `/br` automaticamente. Links externos, `mailto`, âncoras e URLs de parceiros não devem ser reescritos.

O seletor deve listar apenas os sites ativos retornados pela API. Ao trocar de país, uma página institucional equivalente pode manter sua chave lógica e usar o slug do destino. Uma vaga ou empresa sem publicação equivalente no destino deve levar para a listagem/home daquele país, não reutilizar o mesmo ID indiscriminadamente.

O fluxo proposto é:

```text
Browser: /br/vagas ou /br/bff/company/...
                 |
Next/Nginx: valida host e prefixo externo
                 |
API interna Flask: /api/... + contexto confiável host/prefixo
                 |
Flask: resolve site ativo no banco e valida vínculo, sessão e permissão
```

O caminho interno `/api/...` pode continuar estável. SSR e BFF precisam transportar tanto o host quanto o prefixo obtido da requisição validada. Nas chamadas diretas da SPA legada, a entrada regional pode ser `/br/api/...`, reescrita pelo Nginx para o endpoint interno existente.

Não aceitar `site_id` do body/query como autoridade. Qualquer cabeçalho interno de país/prefixo fornecido pelo navegador deve ser removido ou sobrescrito na borda; o Flask só confia no contexto interno proveniente do caminho autorizado. Hosts desconhecidos, prefixos inválidos e combinações ambíguas falham de forma fechada.

Caches de contexto, conteúdo, sitemap e respostas públicas devem incluir **host + país/site + idioma**. Hoje há cache de contexto marcado somente pelo host; isso é insuficiente quando o mesmo domínio serve dois países.

Cookies de candidato/empresa e renovação devem ter política regional coerente e validação do `site` do token no backend. Um cookie de `/br` não pode conceder acesso a `/mx`. A escolha entre nomes por país e cookies com `Path` regional deve ser fechada e testada juntamente com logout/CSRF. Usuários terão que autenticar novamente no novo domínio; não transportaremos JWTs em URLs para conservar sessões antigas.

O **Admin legado permanece em `/admin`**, fora do índice, sem obrigar uma migração completa para Next nesta onda. Suas chamadas devem carregar o contexto de um site autorizado, inicialmente BR, e continuar respeitando o escopo do administrador. A futura seleção regional não pode conceder permissões que o admin não possui. O currículo visual legado precisa conservar sua jornada com proxy/basename compatível com `/br`, sem duplicar a implementação.

## 5. Canonical e idioma das páginas /br

Toda página pública indexável deve ter canonical absoluto apontando para **ela própria no novo endereço**. Uma vaga não aponta para a home nem para o domínio antigo. A recomendação do Google em uma mudança de URLs inclui atualizar canonical, links internos e os alternates. [2]

Exemplo de saída esperada, não evidência de página já implantada:

```html
<html lang="pt-BR">
<head>
  <title>Consultor ERP — Nome da Empresa | Jobs by Portal ERP</title>
  <link rel="canonical" href="https://jobs.portalerp.com/br/vagas/3" />
  <meta property="og:url" content="https://jobs.portalerp.com/br/vagas/3" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="robots" content="index,follow" />
</head>
```

O título, a descrição e o conteúdo visível devem continuar específicos da página. `metadataBase` usa a origem global; as URLs canônicas são construídas explicitamente com o prefixo. No layout, não herdar canonical ou `og:url` da home indevidamente nas páginas de detalhe.

`html lang=pt-BR` melhora a semântica e a acessibilidade, mas o Google identifica o idioma pelo conteúdo, não exclusivamente por `lang` ou `hreflang`. Portanto, textos em português no HTML inicial são indispensáveis. [3]

Parâmetros de campanha não geram canonicals novas. Paginação real não deve apontar toda para a página 1. Para buscas/filtros, definir quais páginas são úteis e indexáveis e quais combinações são redundantes; não aplicar uma regra genérica que retire conteúdos relevantes ou impeça percorrer as listagens.

## 6. Hreflang: o que publicar agora e depois

**Agora, com apenas o Brasil ativo: não precisamos anunciar alternativas internacionais.** Podemos omitir `hreflang` por enquanto. Uma tag autorreferente `pt-BR` é válida, mas não cria internacionalização nem é requisito para indexar a página. Não inserir `es-MX`, `en-US` ou outros códigos apontando para páginas inexistentes, inativas, privadas ou sem equivalência. [3]

Quando houver versões equivalentes publicadas, gerar o conjunto de alternates a partir do cadastro e das publicações. Cada versão deve listar **a si própria e às demais**, com URLs absolutas e referências recíprocas. Escolher HTML via `generateMetadata` como implementação principal; não é necessário duplicar a lógica em HTML, cabeçalhos e XML, pois os métodos são equivalentes para o Google. [3]

Exemplo futuro para a página **Sobre**, somente se ambos os países e as traduções estiverem publicados:

```html
<link rel="alternate" hreflang="pt-BR"
      href="https://jobs.portalerp.com/br/sobre" />
<link rel="alternate" hreflang="es-MX"
      href="https://jobs.portalerp.com/mx/acerca" />
```

Esse mesmo conjunto apareceria nas duas páginas. Cada uma conserva o próprio canonical. Não canonicalizar todas as traduções para o Brasil. Para variantes praticamente idênticas no mesmo idioma, avaliar a consolidação apropriada antes de impor autorreferência indiscriminadamente; a distinção entre versões regionais reais e duplicação técnica importa. [3]

Em Next, `alternates.languages` deve ser calculado **por página**, não como mapa global de homepages herdado por todas as vagas. Interfaces sugeridas:

```ts
// Contratos propostos; ainda não são helpers implementados.
regionalHref(site, 'jobs.detail', { id })
regionalCanonical(site, 'jobs.detail', { id })
getPublishedAlternates({ entityKey, currentSite })
```

Uma vaga exclusiva do Brasil não terá `hreflang` apontando para outra vaga do México, para `/mx/empleos` ou para a home mexicana. Empresas também só recebem alternates quando há perfis regionais equivalentes e publicados. Páginas institucionais e entradas regionais equivalentes podem ter alternates quando a localização for homologada.

**`x-default`:** não o adicionaremos automaticamente a todas as páginas. A raiz será inicialmente um redirect temporário para `/br`; optaremos por não emitir `x-default` nesta fase. Isso é uma escolha de simplicidade, não uma proibição do Google, que também admite páginas de encaminhamento. Quando a raiz virar o hub global, público e com resposta 200, ela poderá ser o `x-default` do grupo de homepages, com reciprocidade. Não será o fallback universal de cada vaga. [3]

Para hreflang usar `pt-BR`, `es-MX`, `en-US` etc., nunca apenas `BR`, `MX` ou `US`. Esses códigos de país não são códigos de idioma. A configuração de locale interna pode ser mais ampla do que os códigos aceitos pelo Google; validar o código destinado a hreflang antes de publicá-lo. [3]

## 7. Sitemap, robots e dados estruturados

A proposta é publicar um índice em `https://jobs.portalerp.com/sitemap.xml` que lista `https://jobs.portalerp.com/br/sitemap.xml`. Outros sitemaps entram somente após ativação/homologação. Reutilizar a paginação existente para vagas e empresas; o tamanho atual não exige particionar arbitrariamente o inventário brasileiro.

Cada sitemap contém apenas URLs canônicas, indexáveis e publicadas de sua região. Login, dashboard, currículo privado, recuperação, convites tokenizados, Admin e APIs ficam fora. Datas `lastmod` devem refletir alterações reais, não a data de geração em todas as páginas.

**`robots.txt` continua obrigatoriamente na raiz do host**, em `/robots.txt`; criar `/br/robots.txt` não substitui esse arquivo. Suas regras precisam reconhecer as novas rotas de API e BFF e preservar a proteção de conteúdo privado. Login/Admin/recuperação devem ter `noindex` verificável; robots não substitui autenticação e bloquear rastreamento pode impedir o Google de ler o `noindex`.

`JobPosting.url`, identificadores URL, breadcrumbs e referências à empresa devem usar o endereço canônico com `/br`. Preservar localização real da vaga, elegibilidade de trabalho remoto, salário/BRL e datas de publicação/validade. Não deduzir a localização física de uma vaga remota apenas pelo domínio. Home e perfil empresarial devem atualizar `WebSite`/`Organization` sem mudar indevidamente URLs externas oficiais da organização.

O tratamento de expiração deve impedir que uma vaga encerrada continue marcada ou oferecida como aberta. Validar uma vaga real no Rich Results Test após a mudança. A migração de domínio, por si só, não resolve a operação de notificações da Indexing API ou o tratamento de vagas vencidas.

## 8. Redirecionamentos e Search Console

Na inspeção anterior desta tarefa, `jobs.portalerp.com` respondeu com 301 para `jobs.portalerp.com.br`. Antes de inverter a direção, localizar a regra exata e preservar uma cópia da configuração. Alterar apenas o DNS/proxy/regra do **subdomínio Jobs**, nunca uma regra geral do domínio Portal ERP.

O fluxo-alvo das páginas públicas é:

```text
https://jobs.portalerp.com.br/             -> 301 https://jobs.portalerp.com/br
https://jobs.portalerp.com.br/vagas/3      -> 301 https://jobs.portalerp.com/br/vagas/3
https://jobs.portalerp.com.br/empresas/1   -> 301 https://jobs.portalerp.com/br/empresas/1
https://jobs.portalerp.com/                -> 307 https://jobs.portalerp.com/br
```

Não redirecionar todos os detalhes para a home. Não redirecionar um prefixo internacional inválido para BR. Mapear também URLs sem prefixo no novo host que já tenham sido divulgadas, com destino direto e sem loops. Normalizar barra final e maiúsculas de forma consistente.

APIs e requisições POST não entram numa regra 301 genérica que possa descartar o corpo ou o método; preservar o contrato interno e tratar a compatibilidade de forma específica. Links antigos de convite/recuperação também precisam de teste próprio. Não colocar tokens em logs ou transportar tokens de sessão pela URL.

Verificar as propriedades específicas do Jobs no Search Console, enviar o novo sitemap e inspecionar as URLs novas. Como há mudança de host, avaliar a ferramenta Alteração de Endereço conforme as propriedades elegíveis e os testes do Google, usando somente as propriedades do Jobs. **Não solicitar mudança de endereço da propriedade inteira `portalerp.com` ou `portalerp.com.br`.** Monitorar URLs antigas e novas; manter redirects por pelo menos um ano, preferencialmente enquanto existirem acessos relevantes. O Google não garante prazo fixo nem manutenção imediata de posições. [2]

## 9. Aceite antes da troca produtiva

O backup solicitado deve contemplar uma cópia SQLite consistente, o código runtime, os uploads necessários e as configurações específicas do Jobs. Verificar integridade e restauração em ambiente isolado. Uma cópia local do Git não é backup do banco produtivo. Não restaurar um snapshot antigo por cima de cadastros recebidos durante uma tentativa de release; definir janela e estratégia de rollback compatíveis com a migration.

Validar em homologação: país ativo/inativo, isolamento BR versus um país sintético de teste, cabeçalhos forjados, cache segregado, login/refresh/logout/CSRF, aprovação obrigatória empresarial, CRUD de vagas/currículo, candidatura, convites, recuperação, links e mobile. Confirmar que todos os URLs públicos de sitemap retornam 200 e têm canonical correto, que as jornadas privadas não entram no índice e que não sobram fixtures na produção.

A implementação não pode ser liberada apenas porque o build passou. Os gates de banco, paridade de arquivos, processos, TLS, redirects e navegador fazem parte do aceite. A ativação de MX/US e a tradução integral desses mercados ficam para ondas posteriores.

**Histórico de 06/11:** branch `wave-global1-domain-br-20261106` preparada, fotografia local do código criada e produção não alterada; naquele momento, o SSH estava bloqueado e o backup produtivo não havia sido executado.

**Atualização de 10/11:** SSH restabelecido e backup consistente verificado, com cópia privada fora do servidor. Implementação local de backend, Next e SPA e gates integrados concluídos; migration/cutover/rollback também testados em cópia privada do banco. A produção continua no schema08 e no domínio antigo: a troca depende de TLS/origem e do acesso à regra específica do Cloudflare. Ver `GLOBAL_WAVE1_DEPLOYMENT_2026-11-10.md`. A homologação internacional integral não está concluída e apenas BR será ativado neste lançamento.

## Referências

[1]: https://nextjs.org/docs/app/guides/internationalization "Next.js App Router: subdiretórios, segmento dinâmico e root layout regional"
[2]: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes "Google Search Central: migração de URLs, canonical, redirects e acompanhamento"
[3]: https://developers.google.com/search/docs/specialty/international/localized-versions "Google Search Central: hreflang, reciprocidade, equivalência e x-default"
