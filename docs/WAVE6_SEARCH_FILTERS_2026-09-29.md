# Onda 6 — revisão de buscas, filtros e paginação

**Data:** 29 de setembro de 2026  
**Escopo:** Portal ERP Jobs — páginas públicas, área candidata, área empresarial e endpoints administrativos relacionados.

## Diagnóstico

A revisão identificou uma falha funcional no contrato entre a página Next `/vagas` e a API Flask. A interface enviava `search`, `technology` e `salary_range`, enquanto a API aceita `q`, `tech`, `salary_min_exact` e `salary_max_exact`. Como consequência, alguns filtros apareciam na URL sem alterar o resultado.

Também foram encontrados estes pontos:

- busca livre de vagas não pesquisava nome da empresa nem skills canônicas, apesar do placeholder prometer isso;
- localização da interface não era consumida pela API;
- o filtro de contrato não encontrava valores legados em maiúsculas, como `CLT`;
- nível e modalidade precisavam aceitar rótulos PT-BR e valores canônicos;
- a página de tecnologias usava o catálogo legado de 10 itens em vez do catálogo canônico de 73 skills;
- a página pública de empresas não expunha os filtros já existentes na API;
- a busca proativa empresarial de profissionais existia no backend/BFF, mas não estava disponível na interface;
- listas paginadas podiam receber página/tamanho inválidos de forma inconsistente;
- a busca administrativa de candidatos usava um campo inexistente (`Candidate.email`) e uma função de concatenação incompatível com SQLite.

## Correções implementadas

### Vagas públicas

- tradução centralizada dos parâmetros da UI para a API;
- busca livre por título, descrição, requisitos, empresa e skill;
- busca textual literal, case-insensitive e tolerante à ausência de acentos em PT/ES;
- filtros por localização, área, tecnologia, empresa, modalidade, nível, contrato e salário;
- compatibilidade de modalidade e senioridade entre rótulos PT-BR e valores canônicos;
- contrato case-insensitive para dados legados;
- paginação preservando todos os filtros;
- total exibido com base no total real, não apenas na página corrente.

### Empresas públicas

- busca por nome/descrição;
- filtros por setor, cidade e UF;
- paginação com preservação de parâmetros;
- estado vazio e limpeza de filtros.

### Tecnologias

- migração da listagem para `/api/config/skills`, a fonte canônica usada pelo CRUD de vagas;
- os links agora filtram o mesmo catálogo persistido nas vagas.

### Candidatos e ATS

- busca proativa visível na área empresarial, limitada a profissionais opt-in do site regional;
- filtros por nome/cargo, cidade, UF, tecnologia, pretensão salarial, experiência mínima e disponibilidade imediata;
- paginação e links para perfis autorizados;
- allowlist BFF ampliada somente para os filtros documentados de tecnologia, salário, experiência e disponibilidade;
- dashboard candidato carrega até 100 vagas e candidaturas para que os filtros locais não fiquem limitados aos 20 primeiros itens;
- query do BFF candidato preservada somente para `page`, `per_page` e `status`.

### Paginação e administração

- `pagination_args()` aplicado em vagas, empresas, candidatos, candidaturas e diretórios administrativos;
- valores inválidos retornam 400; `per_page` é limitado a 100;
- busca administrativa de candidatos corrigida para nome, sobrenome, nome completo e e-mail via `User`.

## Validação local

- backend vagas/filtros: 9 testes aprovados;
- backend currículo: 11 testes aprovados;
- backend segurança/regional: 30 testes aprovados;
- Next Vitest: 21 testes aprovados;
- TypeScript: sem erros;
- Next produção: build aprovado;
- SPA legado: lint focal e build aprovados;
- Chromium desktop e mobile: busca livre, empresa, localização, área, tecnologia, nível, modalidade, contrato, salário, filtros combinados, catálogo canônico e diretório de empresas aprovados;
- Chromium autenticado: busca proativa empresarial com todos os filtros aprovados contra cópia local consistente do banco de produção.

## Regras preservadas

- Flask/SQLite permanecem a autoridade de dados;
- contexto regional continua derivado do Host;
- somente empresas aprovadas e vagas públicas ativas aparecem nas buscas;
- busca empresarial retorna somente currículos opt-in e sem PII indevida;
- queries do browser continuam limitadas por allowlists do BFF;
- nenhum dado produtivo foi alterado durante a validação local.
