# Onda 4 — empresas no Next.js e validação dos CRUDs

**Data:** 22 de setembro de 2026

## Resultado implementado

A Onda 4 migra a autenticação e os dashboards protegidos das empresas para o Next.js 16. A sessão empresarial usa um BFF próprio em `/bff/company/*`; os tokens JWT permanecem exclusivamente em cookies `HttpOnly`, `Secure` e `SameSite=Strict`. As mutações exigem double-submit CSRF, o refresh é rotativo, o logout revoga a família de sessão e a allowlist impede acesso a endpoints administrativos ou parâmetros de autoridade fornecidos pelo browser.

As rotas `/empresa/login`, `/empresa/cadastro`, `/empresa/dashboard`, `/empresa/perfil`, `/empresa/usuarios`, `/empresa/vagas`, `/empresa/publicar-vaga` e `/empresa/candidatos`, inclusive detalhes e edição, são renderizadas pelo Next. A SPA deixa de servir a área empresarial e permanece temporariamente apenas no Admin e no construtor de currículo candidato.

## CRUD de vagas

O lifecycle de vaga foi centralizado em `src/services/jobs.py`. A migration `20260922_06` introduz `jobs.status` e `jobs.is_featured`, faz backfill coerente e adiciona constraints. Exclusão empresarial e administrativa é arquivamento lógico; vaga arquivada não é pública e preserva candidaturas e trilha histórica.

| Operação | Contrato validado |
|---|---|
| Criar | Empresa do JWT e site do Host; ignora autoridade enviada pelo cliente; valida strings, IDs, salários, skills e quota |
| Ler | Lista privada e detalhe privado da própria empresa, inclusive pausada/arquivada; catálogo público mostra apenas vagas publicáveis |
| Atualizar | Ownership e site obrigatórios; campos omitidos são preservados; `skills` presentes substituem atomicamente a coleção |
| Pausar/reativar | Transição centralizada; reativação volta a validar aprovação e quota |
| Excluir | Soft delete para `archived`; candidaturas permanecem preservadas |
| Conteúdo | Descrição, requisitos, responsabilidades, benefícios e skills têm round-trip completo no formulário Next |

O formulário empresarial consome os catálogos de áreas, níveis, modalidades e as 73 skills reais pelo BFF regional. O detalhe privado `/api/jobs/my-jobs/<id>` permite editar vagas não públicas sem relaxar o endpoint público `/api/jobs/<id>`.

## CRUD de currículo

O backend de currículo foi normalizado para validação consistente, respostas genéricas em erros internos e ownership estrito. A interface continua na SPA nesta onda, mas todas as chamadas passam pelo BFF candidato e não dependem de JWT em `localStorage`.

| Superfície | Operações validadas |
|---|---|
| Perfil completo | GET e PUT parcial/simétrico |
| Experiências | Create, list, update e delete |
| Formações | Create, list, update e delete |
| Skills | Create, list, update e delete, com duplicidade rejeitada |
| Certificações | Create, list, update e delete |
| Projetos | Create, list, update e delete |
| Idiomas | Create, list, update e delete |

Datas, URLs, limites de texto, booleanos literais e ownership de IDs foram cobertos por testes. Atualizações parciais preservam os campos não enviados.

## Validação executada antes do deploy

| Gate | Resultado |
|---|---:|
| Testes backend de segurança e regras regionais | 28 aprovados |
| Testes backend do CRUD de vagas | 8 aprovados |
| Testes backend do CRUD de currículo | 11 aprovados |
| Testes Next/BFF | 18 aprovados |
| TypeScript Next | Aprovado |
| Build Next 16 | Aprovado |
| Build SPA | Aprovado |
| Auditoria de dependências Python | Sem vulnerabilidades conhecidas |
| Auditoria de produção Next | Sem vulnerabilidades conhecidas |
| Auditoria de produção SPA | Sem vulnerabilidades de severidade alta |
| Alembic em SQLite novo | Upgrade, downgrade, re-upgrade e zero drift aprovados |
| Alembic em cópia da base de produção | `20260922_06`, `integrity_check=ok`, zero violações de FK e zero drift |
| Smoke HTTP integrado em cópia da produção | Oito gates aprovados |

O smoke integrado criou apenas identidades sintéticas na cópia descartável do banco. Ele comprovou sessão empresarial HttpOnly, CSRF, rejeição de `company_id` fornecido pelo cliente, perfil e catálogo; ciclo completo **criar → listar → detalhar → editar → pausar → reativar → arquivar** da vaga; diferença entre visibilidade privada e pública; sessão candidata HttpOnly; round-trip do perfil do currículo; e CRUD das seis coleções.

## Controles adicionais

O cadastro empresarial agora valida JSON, exige identificação fiscal e rejeita duplicidade com `409` antes de gravar. Falhas internas de cadastro/login não devolvem SQL, parâmetros ou PII ao cliente. O cadastro candidato também rejeita payload não objeto e responde com erro genérico em falhas internas.

## Rollback

O deploy deve criar backup SQLite consistente, fotografia dos três runtimes e Nginx, instalar dependências em staging, executar `alembic upgrade 20260922_06`, validar integridade e trocar os artefatos de forma transacional. Qualquer falha antes do smoke final restaura código, configuração Nginx e banco da fotografia anterior. O ciclo `20260922_06 → 20260922_05 → 20260922_06` foi exercitado somente em cópia descartável da base real.

## Limitações remanescentes

O Admin continua na SPA. A página visual do construtor de currículo também permanece temporariamente na SPA, embora seu contrato autenticado já esteja integralmente no BFF seguro. A recuperação de senha real continua indisponível até configurar e homologar SMTP ou Resend. Sites além do Brasil permanecem cadastrados porém inativos; México só deve ser ativado após domínio, tradução, conteúdo e regressão regional.
