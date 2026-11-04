# Contrato canônico — administração de acessos

Implementação: `src/routes/admin_access.py`, blueprint `admin_access_bp`, prefixo `/api/admin`, registrado em `src/main.py`. Usa o schema 08 existente; não requer migration. A tela `/admin/usuarios` consome estes DTOs.

## Autorização e escopo

`GET /access-capabilities` usa `admin_required`: administrador globalmente ativo, sessão válida e atribuição administrativa ativa no site atual. Retorna `{is_platform_admin: boolean, can_approve_companies: boolean}`. A primeira propriedade representa o flag armazenado; a segunda deriva da permissão `APPROVE_COMPANIES` existente. Os endpoints de contas usam o guard existente `platform_admin_required`, que exige **super_admin + is_platform_admin + atribuição ativa no site**. O flag isolado em outro papel não concede acesso.

Todas as operações de contas, inclusive por administradores da plataforma, são limitadas a usuários candidate/company presentes em `_regional_user_query(site_atual)`. Administradores alvo, IDs inexistentes e usuários sem presença nesse site recebem 404. Membros empresariais inativos e convites ainda não aceitos são resolvidos sem conferir-lhes autorização empresarial. A aprovação empresarial continua exclusivamente no fluxo administrativo existente; este blueprint não escreve em CompanySite nem CompanyUser.

## Listagem e DTO

`GET /access-users?search=&type=&page=&per_page=` retorna:

```typescript
interface AccessUser {
  id: number;
  email: string;
  name: string;
  user_type: 'candidate' | 'company';
  global_active: boolean;
  login_locked: boolean;
  failed_login_attempts: number;
  candidate_id: number | null;
  regional_active: boolean;
  company_id: number | null;
  company_name: string | null;
  company_role: string | null;
  company_member_active: boolean | null;
  company_status: 'pending' | 'approved' | 'rejected' | 'suspended' | null;
}
interface AccessUsersResponse {
  users: AccessUser[];
  total: number;
  pages: number;
  current_page: number;
}
```

`regional_active` não incorpora `global_active`: para candidatos é `CandidateSite.is_active`; para empresas é `CompanySite.status === 'approved'`. O vínculo da pessoa com a equipe é mostrado separadamente em `company_member_active`; convite aceito continua sendo requisito da autenticação, não é ativado por estas APIs. Nenhum flag isolado representa autorização efetiva. Um proprietário legado sem CompanyUser continua listável, com papel/estado do membro null, sem criação implícita de vínculo.

Caso existam vários vínculos empresariais históricos locais, o DTO escolhe primeiro o ativo, depois o convite aceito e depois o menor ID. Nunca usa uma empresa de outro site para preencher os campos. Há apenas uma linha por conta. Busca literal por email, nome do candidato, nome do membro e nome global/regional da empresa; máximo 255 caracteres. `type` aceita vazio, candidate ou company; valores inválidos retornam 400. Paginação padrão 1/20, limite 100, valores inválidos retornam 400.

## Mutações e reautenticação

Todas exigem JSON objeto com `admin_password: string` e `reason: string`. Motivo obrigatório, não vazio, máximo **500 caracteres**, sem caracteres de controle. Senha de reautenticação limitada a 1024 caracteres. Senha inválida/ausente/tipo errado ou administrador com login bloqueado retorna 403, sem mutações (inclusive no ator). O motivo é validado, mas **não persistido como texto livre**, para evitar PII e segredos na auditoria: somente `reason_provided` e `reason_length` são gravados.

Rate limiting compartilhado entre as três ações, por IP + ID do administrador, usando `auth_rate_limiter` e as configurações existentes `AUTH_LOGIN_RATE_LIMIT`/`AUTH_LOGIN_RATE_WINDOW`. Tentativas inválidas também contam. Limite excedido retorna 429 e `Retry-After`. Continua valendo a limitação arquitetural do limitador existente: estado local ao processo, exige backend compartilhado antes de múltiplos workers/réplicas.

### Estado global

`PUT /access-users/<id>/global-status` adiciona `is_active: boolean` **literal JSON**. Strings, números e null são rejeitados com 400.

Retorna `{message, user: AccessUser, scope: 'global'}`. **Impacto global em todos os sites:** escreve somente `User.is_active` e revoga todas as famílias de sessão desse usuário tanto ao desativar quanto ao reativar uma conta previamente inativa. Nenhum outro usuário ou membro da mesma empresa tem sessões revogadas. Reativar exige novo login e não altera aprovação regional, atividade de equipe, convite aceito, vagas ou descoberta regional. Empresa pending/rejected/suspended continua sem acesso às APIs que exigem aprovação.

### Desbloqueio

`POST /access-users/<id>/unlock` retorna `{message, user: AccessUser, scope: 'global'}`. **Impacto global na identidade:** limpa somente `failed_login_attempts` e `locked_until` do alvo. Não ativa conta, candidato, equipe ou empresa e não modifica senha nem sessões.

### Recuperação manual

`POST /access-users/<id>/password-reset` retorna exatamente:

```typescript
interface ManualPasswordResetResponse {
  message: string;
  reset_url: string;
  expires_at: string; // ISO 8601 UTC, sufixo Z
  delivery: 'manual';
}
```

Gera token aleatório via `User.generate_reset_token()` existente, válido por 1 hora, substituindo/inutilizando o token anterior. Banco armazena somente SHA-256. Não cria senha provisória, temporária ou permanente. Link: `https://<origem-canônica>/redefinir-senha?type=candidate|company#token=<token>`. O token fica **somente no fragmento**, nunca na query emitida, para não chegar a logs HTTP/proxy. O Next deve lê-lo localmente e remover o fragmento com `history.replaceState`, mantendo suporte aos links legados com token na query. Origem derivada apenas de `Site.canonical_origin`, revalidada como HTTPS e hostname registrado entre os domínios ativos do próprio site; não usa Host nem X-Forwarded-Host. Configuração inválida/ausente/não confiável retorna 503 sem substituir token anterior. Nenhum email é enviado por este endpoint: envio manual seguro cabe ao administrador.

**Emissão não muda senha, locks, sessões, atividade ou aprovação.** O consumo usa `POST /api/auth/reset-password` com `{token, new_password}` e a política pública de senha. O hash seguro mantém o formato de `User.set_password`; a gravação compara e consome o hash do token em um único UPDATE condicional, valida a expiração pelo relógio efetivo do SQLite, limpa locks e revoga todas as sessões do alvo na mesma transação. Requisições concorrentes não podem consumir o mesmo token duas vezes. Recuperar senha não reativa conta, equipe, candidato nem aprova a empresa. Nunca copiar reset_url para logs, eventos de analytics, auditoria ou armazenamento persistente do frontend.

## Cache, transações e auditoria

Todas as respostas do blueprint (inclusive erros de autorização/validação) levam `Cache-Control: no-store`. Cada mutação, emissão do token e seu evento de auditoria são uma única transação; qualquer exceção causa rollback com mensagem genérica, sem eco de parâmetros, SQL, senha ou token. Alvos de mutações são lidos com row lock onde o banco suporta (`FOR UPDATE`; SQLite não o implementa).

Eventos: `user.global_status_changed`, `user.login_unlocked`, `user.password_reset_issued`. Contêm IDs, site/ator, escopo global, tipo de usuário, justificativa somente em metadados, e flags/quantidades relevantes. Nunca contêm email, senha, token, URL de recuperação ou texto livre do motivo. Os fingerprints de IP/User-Agent seguem o mecanismo de auditoria existente.

Em `admin.py`, a reativação empresarial exige `APPROVE_COMPANIES`, inclusive nas rotas legadas de toggle. Candidatos e empresas recebem DTOs separados de atividade global e regional. Os novos controles da UI enviam o estado desejado explicitamente, evitando inversão em reenvios.
