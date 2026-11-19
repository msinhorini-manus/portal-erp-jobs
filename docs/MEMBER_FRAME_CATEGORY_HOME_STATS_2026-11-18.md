# Moldura de membros e contagens públicas — 18/11/2026

## Estado

Implementação local concluída; publicação em produção ainda pendente dos gates de homologação e do corte autorizado. O backup novo da produção e sua cópia privada fora da DigitalOcean já foram verificados. Este documento não certifica produção nem indexação do Google.

## Escopo autorizado

A listagem pública de empresas mantém grade, ordem, filtros, paginação, logo 96×64 px e nome de 18 px. Somente o booleano regional `is_member === true` recebe moldura navy de 2 px e uma única aba “Membro Ecossistema Portal ERP”. O Admin continua sendo a única autoridade da condição de membro. Não foi redesenhada a página de detalhes da empresa, que preserva sua única menção discreta. O mosaico da capa permanece com até 20 vagas, mais recentes primeiro, logo 48×48 px e nome de 14 px/600.

Cada card empresarial apresenta a quantidade de vagas ativas publicamente associáveis à empresa. Os cards de áreas da capa e da página Áreas, e os cards de Tecnologias, passam a exibir suas quantidades de vagas. Zero, singular, plural e indisponibilidade são explícitos. A capa recebe três indicadores regionais: vagas ativas, empresas cadastradas com perfil público aprovado e candidatos com conta ativa. Não há dados pessoais de candidatos no dashboard.

## Fonte de verdade das contagens

Flask continua sendo a autoridade de dados. Não há banco, fixtures, contagens fixas ou regra paralela no Next. A consulta geral de vagas preserva exatamente a publicação existente: site atual, `is_active`, status `active`/`approved`, expiração NULL/futura e presença empresarial aprovada, com JOIN por empresa e site. Não foi adicionada exigência de proprietário ativo ou slug público ao universo geral de vagas.

Os totais de empresas usam a elegibilidade pública do diretório, proprietário ativo e reserva de slug válida daquela empresa naquele país. O total de candidatos conta candidatos distintos com inscrição regional ativa e usuário global ativo, incluindo quem não autorizou descoberta pública; inclusão no agregado não libera currículo, contato ou perfil.

Vagas confidenciais entram no total geral e nas categorias, mas não são atribuídas à empresa em cards, contagens ou listagem de vagas do perfil empresarial. O diretório usa contagem agrupada dos IDs da página, sem um COUNT para cada card; o detalhe usa a mesma regra.

## Categorias e filtros

`/api/config/areas`, `/skills` e `/technologies` aceitam a opção aditiva `include_counts=true`, que acrescenta `job_count` inteiro. Sem essa opção, seus arrays, campos, filtros e ordenação existentes são preservados. A página Tecnologias continua consumindo Skill, não presume correspondência de IDs com o catálogo Technology.

As quantidades correspondem ao `total` das URLs existentes `area=<nome>` e `tech=<nome>`, mantendo busca textual legada e tecnologia por Skill OU título/descrição/requisitos. Não houve troca para IDs, novas FKs ou mudança da semântica dos links. Uma vaga pode aparecer em várias categorias: somar categorias não representa o total único de vagas. Agregados SQL agrupados e EXISTS evitam duplicação por habilidades.

## Região, falhas e segurança

Host e prefixo registrados continuam definindo a região no backend. Valores de país enviados pelo cliente não alteram a autoridade das contagens. Brasil permanece o único país ativo; nenhum país, domínio, DNS, Nginx ou plataforma editorial foi ativado/alterado por esta implementação. Foram preparados rótulos numéricos PT/EN/ES, sem certificar versões internacionais completas.

Consultas que falham retornam erro 500 genérico, não sucesso com zero. O Next mostra “Quantidade indisponível” ou traço para valores ausentes/inválidos e distingue catálogo indisponível de catálogo realmente vazio. Não há arredondamento, sufixo “+” nem preenchimento artificial. As novas leituras de totais e contagens não usam cache persistente no Next.

Nenhuma migração, alteração de modelo, dependência, aprovação, usuário, membresia ou configuração de e-mails faz parte do escopo. A camada de e-mails e a SPA Admin anteriores são preservadas. Rollback deverá ser somente de código, sem restauração ou downgrade do banco, mantendo schema `20261111_12`, reservas e uploads.

## Revisão e validação local

A revisão precedente cobriu integralmente os 24 Markdown em docs, README e seis relatórios sanitizados: 31 documentos. Contratos históricos foram reconciliados sem confundir documentação antiga com código/runtime atualmente implantados.

Bateria Next: 814 testes aprovados em 36 arquivos, TypeScript aprovado e build local integrado aprovado. Backend: 127 testes aprovados em sete processos/suítes isolados (`test_public_category_stats`, `test_jobs_wave4`, `test_company_country_slugs`, `test_company_logo_uploads`, `test_job_public_logos`, `test_global1_regional`, `test_security_wave0`). A suíte nova tem 23 testes, incluindo equivalência com a rota real, predicado original independente, matriz de lifecycle/aprovação/região, confidencialidade, opt-out, duplicações, zeros, erros reais de SQL, caracteres especiais e cardinalidade constante de consultas ao ampliar catálogos/empresas. O diretório distingue falha de leitura de um resultado real vazio, coberto por uma regressão adicional.

Pillow 13.0.0 já era dependência do projeto e da origem. A venv local não o continha; a wheel x86_64 da origem não era compatível com o sandbox aarch64. Foi instalada apenas localmente a mesma versão com hash publicado conferido, sem mudança no requirements ou na produção. O bloqueio ambiental inicial de teste está preservado como evidência, não é reportado como teste aprovado.

Homologação visual integrada em Chromium desktop/tablet/celular: 503 verificações aprovadas e zero falhas. Ela usa Flask e Next reais com um banco estritamente sintético, e bloqueia gravações, autenticação e envios reais. Valores, vagas, contas e vínculo de membro da demonstração são fictícios, explicitamente rotulados; não representam cadastro ou membresia de empresas reais. Foram medidos grade, dimensão dos logos e nomes, moldura/aba, totais, pluralização e equivalência dos cliques de categoria/empresa com as listagens, sem overflow horizontal.

## Condições de fechamento produtivo

Exigir fonte/commit imutáveis, staging isolado com logs reais, backup restaurável e prova privada off-server, paridade de runtime/configuração/PM2, preservação de banco/slug/ownership/membresia/uploads, smokes de origem, equivalência HTTP das contagens, browser responsivo público e logs finitos estritos. Remover a chave temporária e os artefatos de teste após o fechamento, preservando backups e recuperação independente. PRs encadeados anteriores não devem ser mesclados automaticamente.
