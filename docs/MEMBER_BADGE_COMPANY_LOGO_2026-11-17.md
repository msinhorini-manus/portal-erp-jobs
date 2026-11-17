# Identificação de membro e upload de logo — Portal ERP Jobs

## Escopo autorizado

Esta alteração acrescenta identificação de membro e envio de logo empresarial à plataforma Jobs existente. Não redesenha a página da empresa, não altera as candidaturas, não ativa países, não modifica o portal editorial e não muda Nginx ou DNS. O mosaico mantém vinte vagas recentes, em quatro colunas e cinco linhas no desktop, com adaptação para tablet e celular.

A aplicação de referência é o commit `4061c771515470a82f245a9ceef49f39589dc90d` de API/Next, já publicado na release de layout. A SPA continua na referência `ab2e132da71a029f7215d0111dc4765ac0f72159`. O PR anterior permanece com suas pendências de validação registradas; esta alteração não certifica retrospectivamente aquele encerramento.

## Identificação pública

O card recebe uma aba navy `#0F2530`, da mesma cor da testeira, com a frase completa **Membro Ecossistema Portal ERP**. A moldura é fina e os logos continuam discretos. O destaque não altera a ordem das vagas nem dá prioridade a membros.

Na página existente da empresa há uma única menção discreta junto ao nome, sem repetir a frase nas vagas internas do perfil nem criar novas seções. O logo cadastrado pode ocupar o mesmo espaço de 64 px do ícone empresarial existente.

A origem do selo é exclusivamente `CompanySite.is_member`, da presença regional aprovada e publicamente elegível. O DTO de empresa expõe `is_member` booleano e o de vaga expõe `company_is_member` booleano. Valores malformados, região errada, identidade pública inválida e vagas confidenciais não conferem selo. Não há fallback para membro de outro país e não há campo de autodeclaração de membro no cadastro empresarial.

No backup anterior à alteração não havia empresa brasileira pública marcada como membro. O deploy não cria nem atribui essa condição por suposição. A identificação aparecerá depois de uma marcação administrativa legítima.

## Logo no cadastro e no perfil

O cadastro empresarial passa a oferecer um envio opcional com prévia local. Primeiro o cadastro JSON já existente cria a conta e estabelece a sessão; somente depois o logo é enviado pelo BFF autenticado. Se o envio da imagem falhar após a criação da conta, a tela informa que a conta foi criada e oferece acesso ao perfil para repetir somente o upload, sem duplicar registro ou e-mails.

No perfil, owners e administradores com `manage_company` podem enviar, trocar ou remover o logo. Essas operações são separadas dos outros campos e não modificam aprovação ou condição de membro. Uma empresa em análise pode preparar o logo, mas seu arquivo não fica publicamente disponível antes da elegibilidade do perfil.

São aceitos PNG, JPEG e WebP estáticos de até 2 MiB. O backend verifica o conteúdo real, limita a imagem a 16 milhões de pixels, recusa SVG, GIF, animações, arquivos malformados e decompression bombs, remove metadados e reencoda PNG proporcional até 1024 × 1024. Não há download remoto de imagens nem SSRF.

## Rotas e segurança

- `POST /br/bff/company/profile/logo`: multipart com somente o campo `logo`.
- `DELETE /br/bff/company/profile/logo`: remoção sem corpo.
- Upstream fixo: `/api/companies/logo`, com JWT, presença regional e permissão empresarial.
- `GET /br/api/companies/logos/{opaque}.png`: arquivo público somente quando ainda associado a uma presença aprovada, dono ativo e slug reservado válido.

O BFF aplica CSRF, verifica a origem pública por Host/protocolo sobrescritos pelo Nginx, rejeita headers de autoridade arbitrários e mantém os cookies HttpOnly e o refresh regional existentes. O corpo multipart é limitado antes do parser, e os proxies JSON de vagas, currículo, equipe e perfil permanecem separados. O cenário HTTPS externo com listener HTTP local foi incluído nos testes.

O logo usa nome opaco aleatório, sem ID de empresa ou nome original do arquivo. O armazenamento padrão é `backend/portal_erp_jobs_api/database/company_logos`, fora do webroot e dos arquivos de código substituídos. Diretório e arquivos são privados, com abertura sem seguir links simbólicos, publicação atômica e arquivos anteriores preservados. A remoção usa override regional vazio e não restaura o fallback global. Arquivos órfãos de falha de commit e versões antigas ficam deliberadamente retidos; futura coleta de lixo está fora desta alteração.

O recurso público usa `Cache-Control: no-store`, PNG e `X-Content-Type-Options: nosniff`; perfis não elegíveis, arquivos sem vínculo atual e países inativos falham fechados. As URLs, canonical, sitemap, Organization e JobPosting existentes são preservados.

## Banco, dependência e recuperação

Não há migração, nova tabela ou alteração de coluna. O schema continua `20261111_12`, com as reservas de slug e os triggers existentes. Rollback é somente de código e vínculo do ambiente Python, nunca restauração ou downgrade do banco e nunca remoção dos logos persistentes.

A nova dependência é `Pillow==13.0.0`. Deve ser homologada em ambiente novo e pinado antes da troca; não se instala no ambiente Python vivo. A origem tinha Python 3.12.3 e não tinha Pillow. O ambiente anterior será preservado para recuperação.

## Evidência no commit de implementação

O novo backup remoto e a cópia privada independente foram verificados, incluindo integridade/FK, reservas de slug, arquivos de API/SPA/Next, configuração privada, inventário de pacotes e arquivo de logos, com restauração isolada.

A bateria Next integrada passou em 32 suítes, 713 testes, incluindo as cinco regressões adicionais de origem pública atrás do Nginx; TypeScript e diff passaram. O agente backend concluiu 60 testes isolados, dos quais vinte novos, usando Pillow 12.3.0 disponível no sandbox. A repetição na versão pinada 13.0.0, os builds, os testes de browser e os gates produtivos são obrigatórios antes de considerar a publicação concluída.

**Estado deste documento no commit de implementação: preparado e testado localmente; deploy ainda não certificado.** O relatório operacional pós-publicação deve registrar o commit realmente servido, os resultados finais e qualquer pendência, sem incluir banco, ambientes, chaves ou dados pessoais.
