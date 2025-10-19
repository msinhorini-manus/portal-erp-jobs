# Portal ERP Jobs - Documentação da API

## 📋 Visão Geral

API RESTful para a plataforma Portal ERP Jobs, desenvolvida em Python com Flask.

**Base URL:** `http://localhost:5000/api`

**Autenticação:** JWT (JSON Web Tokens)

---

## 🔐 Autenticação

### 1. Registrar Usuário

**POST** `/auth/register`

Registra um novo usuário (candidato ou empresa).

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123",
  "user_type": "candidate"  // ou "company"
}
```

**Response (201):**
```json
{
  "message": "Usuário registrado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@example.com",
    "user_type": "candidate"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### 2. Login

**POST** `/auth/login`

Autentica um usuário existente.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": 1,
    "email": "usuario@example.com",
    "user_type": "candidate"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### 3. Renovar Token

**POST** `/auth/refresh`

Renova o access token usando o refresh token.

**Headers:**
```
Authorization: Bearer {refresh_token}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### 4. Obter Usuário Atual

**GET** `/auth/me`

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "usuario@example.com",
  "user_type": "candidate",
  "created_at": "2025-10-12T22:00:00"
}
```

---

### 5. Alterar Senha

**PUT** `/auth/change-password`

Altera a senha do usuário autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "current_password": "senha123",
  "new_password": "novaSenha456"
}
```

**Response (200):**
```json
{
  "message": "Senha alterada com sucesso"
}
```

---

## 👤 Candidatos

### 1. Obter Meu Perfil

**GET** `/candidates/profile`

Retorna o perfil completo do candidato autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "full_name": "João Silva",
  "phone": "(11) 98765-4321",
  "city": "São Paulo",
  "state": "SP",
  "bio": "Desenvolvedor Full Stack com 5 anos de experiência...",
  "github_url": "https://github.com/joaosilva",
  "linkedin_url": "https://linkedin.com/in/joaosilva",
  "portfolio_url": "https://joaosilva.dev",
  "salary_expectation": 8000.00,
  "availability": "immediate",
  "skills": [...],
  "experiences": [...],
  "education": [...],
  "certifications": [...],
  "projects": [...]
}
```

---

### 2. Criar/Atualizar Perfil

**POST/PUT** `/candidates/profile`

Cria ou atualiza o perfil do candidato.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "full_name": "João Silva",
  "phone": "(11) 98765-4321",
  "birth_date": "1995-05-15",
  "city": "São Paulo",
  "state": "SP",
  "bio": "Desenvolvedor Full Stack com 5 anos de experiência...",
  "github_url": "https://github.com/joaosilva",
  "linkedin_url": "https://linkedin.com/in/joaosilva",
  "portfolio_url": "https://joaosilva.dev",
  "salary_expectation": 8000.00,
  "availability": "immediate"
}
```

**Response (200/201):**
```json
{
  "message": "Perfil atualizado com sucesso",
  "candidate": {...}
}
```

---

### 3. Buscar Candidatos (Empresas)

**GET** `/candidates/search`

Busca candidatos com filtros (apenas para empresas).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `q` (string): Termo de busca
- `city` (string): Cidade
- `state` (string): Estado
- `min_salary` (int): Salário mínimo
- `max_salary` (int): Salário máximo
- `availability` (string): Disponibilidade
- `page` (int): Página (default: 1)
- `per_page` (int): Itens por página (default: 20)

**Example:**
```
GET /api/candidates/search?q=desenvolvedor&city=São Paulo&page=1&per_page=20
```

**Response (200):**
```json
{
  "candidates": [...],
  "total": 150,
  "pages": 8,
  "current_page": 1,
  "per_page": 20
}
```

---

### 4. Obter Candidato por ID (Empresas)

**GET** `/candidates/{candidate_id}`

Retorna o perfil de um candidato específico (apenas para empresas).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "full_name": "João Silva",
  ...
}
```

---

### 5. Adicionar Skill

**POST** `/candidates/profile/skills`

Adiciona uma skill ao perfil do candidato.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "technology_id": 1,
  "proficiency_level": 4,
  "years_experience": 3
}
```

**Response (201):**
```json
{
  "message": "Skill adicionada com sucesso",
  "skill": {...}
}
```

---

### 6. Adicionar Experiência

**POST** `/candidates/profile/experiences`

Adiciona uma experiência profissional.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "title": "Desenvolvedor Full Stack",
  "company": "Tech Company",
  "start_date": "2020-01-01",
  "end_date": "2023-12-31",
  "description": "Desenvolvimento de aplicações web...",
  "is_current": false
}
```

**Response (201):**
```json
{
  "message": "Experiência adicionada com sucesso",
  "experience": {...}
}
```

---

### 7. Adicionar Formação

**POST** `/candidates/profile/education`

Adiciona uma formação acadêmica.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "degree": "Bacharelado",
  "field_of_study": "Ciência da Computação",
  "institution": "USP",
  "start_date": "2015-01-01",
  "end_date": "2019-12-31",
  "is_current": false
}
```

**Response (201):**
```json
{
  "message": "Formação adicionada com sucesso",
  "education": {...}
}
```

---

### 8. Adicionar Certificação

**POST** `/candidates/profile/certifications`

Adiciona uma certificação.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "name": "AWS Certified Solutions Architect",
  "issuer": "Amazon Web Services",
  "issue_date": "2023-06-01",
  "expiry_date": "2026-06-01",
  "credential_url": "https://aws.amazon.com/certification/..."
}
```

**Response (201):**
```json
{
  "message": "Certificação adicionada com sucesso",
  "certification": {...}
}
```

---

### 9. Adicionar Projeto

**POST** `/candidates/profile/projects`

Adiciona um projeto ao portfólio.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "name": "Sistema de Gestão ERP",
  "description": "Sistema completo de gestão empresarial...",
  "technologies": "React, Node.js, PostgreSQL",
  "repo_url": "https://github.com/user/projeto",
  "demo_url": "https://projeto.com",
  "image_url": "https://projeto.com/screenshot.png"
}
```

**Response (201):**
```json
{
  "message": "Projeto adicionado com sucesso",
  "project": {...}
}
```

---

## 🏢 Empresas

### 1. Obter Meu Perfil de Empresa

**GET** `/companies/profile`

Retorna o perfil completo da empresa autenticada.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "user_id": 2,
  "company_name": "Tech Solutions Ltda",
  "cnpj": "12.345.678/0001-90",
  "website": "https://techsolutions.com",
  "description": "Empresa de soluções tecnológicas...",
  "logo_url": "https://techsolutions.com/logo.png",
  "city": "São Paulo",
  "state": "SP",
  "size": "51-200",
  "industry": "Tecnologia"
}
```

---

### 2. Criar/Atualizar Perfil de Empresa

**POST/PUT** `/companies/profile`

Cria ou atualiza o perfil da empresa.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "company_name": "Tech Solutions Ltda",
  "cnpj": "12.345.678/0001-90",
  "website": "https://techsolutions.com",
  "description": "Empresa de soluções tecnológicas...",
  "logo_url": "https://techsolutions.com/logo.png",
  "city": "São Paulo",
  "state": "SP",
  "size": "51-200",
  "industry": "Tecnologia"
}
```

**Response (200/201):**
```json
{
  "message": "Perfil atualizado com sucesso",
  "company": {...}
}
```

---

### 3. Obter Empresa por ID

**GET** `/companies/{company_id}`

Retorna o perfil público de uma empresa (sem autenticação).

**Response (200):**
```json
{
  "id": 1,
  "company_name": "Tech Solutions Ltda",
  ...
}
```

---

### 4. Buscar Empresas

**GET** `/companies/search`

Busca empresas com filtros (público).

**Query Parameters:**
- `q` (string): Termo de busca
- `city` (string): Cidade
- `state` (string): Estado
- `size` (string): Tamanho da empresa
- `industry` (string): Setor
- `page` (int): Página
- `per_page` (int): Itens por página

**Response (200):**
```json
{
  "companies": [...],
  "total": 50,
  "pages": 3,
  "current_page": 1,
  "per_page": 20
}
```

---

## 💼 Vagas

### 1. Listar Todas as Vagas

**GET** `/jobs/`

Lista todas as vagas ativas (público).

**Query Parameters:**
- `q` (string): Termo de busca
- `city` (string): Cidade
- `state` (string): Estado
- `employment_type` (string): Tipo de contratação (CLT, PJ, etc.)
- `work_mode` (string): Modo de trabalho (remote, hybrid, onsite)
- `min_salary` (int): Salário mínimo
- `max_salary` (int): Salário máximo
- `page` (int): Página
- `per_page` (int): Itens por página

**Response (200):**
```json
{
  "jobs": [...],
  "total": 300,
  "pages": 15,
  "current_page": 1,
  "per_page": 20
}
```

---

### 2. Obter Vaga por ID

**GET** `/jobs/{job_id}`

Retorna detalhes de uma vaga específica (público).

**Response (200):**
```json
{
  "id": 1,
  "company_id": 1,
  "title": "Desenvolvedor Full Stack Sênior",
  "description": "Buscamos desenvolvedor experiente...",
  "requirements": "5+ anos de experiência...",
  "benefits": "Vale alimentação, plano de saúde...",
  "employment_type": "CLT",
  "work_mode": "hybrid",
  "city": "São Paulo",
  "state": "SP",
  "salary_min": 8000.00,
  "salary_max": 12000.00,
  "status": "active",
  "created_at": "2025-10-12T10:00:00",
  "updated_at": "2025-10-12T10:00:00",
  "company": {...},
  "technologies": [...]
}
```

---

### 3. Criar Vaga (Empresas)

**POST** `/jobs/`

Cria uma nova vaga (apenas empresas).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "title": "Desenvolvedor Full Stack Sênior",
  "description": "Buscamos desenvolvedor experiente...",
  "requirements": "5+ anos de experiência...",
  "benefits": "Vale alimentação, plano de saúde...",
  "employment_type": "CLT",
  "work_mode": "hybrid",
  "city": "São Paulo",
  "state": "SP",
  "salary_min": 8000.00,
  "salary_max": 12000.00,
  "technologies": [
    {
      "technology_id": 1,
      "is_required": true
    },
    {
      "technology_id": 2,
      "is_required": false
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Vaga criada com sucesso",
  "job": {...}
}
```

---

### 4. Atualizar Vaga (Empresas)

**PUT** `/jobs/{job_id}`

Atualiza uma vaga existente (apenas empresa dona).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:** (mesmos campos do POST, todos opcionais)

**Response (200):**
```json
{
  "message": "Vaga atualizada com sucesso",
  "job": {...}
}
```

---

### 5. Deletar Vaga (Empresas)

**DELETE** `/jobs/{job_id}`

Deleta uma vaga (apenas empresa dona).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "message": "Vaga deletada com sucesso"
}
```

---

### 6. Minhas Vagas (Empresas)

**GET** `/jobs/my-jobs`

Lista todas as vagas da empresa autenticada.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string): Filtrar por status (active, paused, closed)
- `page` (int): Página
- `per_page` (int): Itens por página

**Response (200):**
```json
{
  "jobs": [...],
  "total": 15,
  "pages": 1,
  "current_page": 1,
  "per_page": 20
}
```

---

### 7. Candidaturas de uma Vaga (Empresas)

**GET** `/jobs/{job_id}/applications`

Lista todas as candidaturas de uma vaga (apenas empresa dona).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string): Filtrar por status
- `page` (int): Página
- `per_page` (int): Itens por página

**Response (200):**
```json
{
  "applications": [...],
  "total": 45,
  "pages": 3,
  "current_page": 1,
  "per_page": 20
}
```

---

## 📝 Candidaturas

### 1. Candidatar-se a uma Vaga (Candidatos)

**POST** `/applications/`

Candidata-se a uma vaga (apenas candidatos).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "job_id": 1,
  "cover_letter": "Tenho grande interesse nesta vaga..."
}
```

**Response (201):**
```json
{
  "message": "Candidatura enviada com sucesso",
  "application": {
    "id": 1,
    "job_id": 1,
    "candidate_id": 1,
    "status": "pending",
    "cover_letter": "Tenho grande interesse...",
    "match_percentage": 85,
    "applied_at": "2025-10-12T15:30:00"
  }
}
```

---

### 2. Minhas Candidaturas (Candidatos)

**GET** `/applications/my-applications`

Lista todas as candidaturas do candidato autenticado.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `status` (string): Filtrar por status
- `page` (int): Página
- `per_page` (int): Itens por página

**Response (200):**
```json
{
  "applications": [...],
  "total": 12,
  "pages": 1,
  "current_page": 1,
  "per_page": 20
}
```

---

### 3. Obter Candidatura por ID

**GET** `/applications/{application_id}`

Retorna detalhes de uma candidatura específica.

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "job_id": 1,
  "candidate_id": 1,
  "status": "reviewing",
  "cover_letter": "Tenho grande interesse...",
  "match_percentage": 85,
  "applied_at": "2025-10-12T15:30:00",
  "updated_at": "2025-10-13T10:00:00",
  "job": {...},
  "candidate": {...}
}
```

---

### 4. Atualizar Status da Candidatura (Empresas)

**PUT** `/applications/{application_id}/status`

Atualiza o status de uma candidatura (apenas empresa dona da vaga).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Body:**
```json
{
  "status": "interview"
}
```

**Status válidos:**
- `pending`: Pendente
- `reviewing`: Em análise
- `interview`: Entrevista
- `approved`: Aprovado
- `rejected`: Rejeitado

**Response (200):**
```json
{
  "message": "Status atualizado com sucesso",
  "application": {...}
}
```

---

### 5. Retirar Candidatura (Candidatos)

**DELETE** `/applications/{application_id}`

Retira uma candidatura (apenas candidato dono).

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "message": "Candidatura retirada com sucesso"
}
```

---

## 📊 Códigos de Status HTTP

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `400 Bad Request`: Dados inválidos ou faltando
- `401 Unauthorized`: Não autenticado ou token inválido
- `403 Forbidden`: Sem permissão para acessar o recurso
- `404 Not Found`: Recurso não encontrado
- `409 Conflict`: Conflito (ex: email já cadastrado)
- `500 Internal Server Error`: Erro no servidor

---

## 🔒 Autenticação JWT

Todas as rotas protegidas requerem um token JWT no header:

```
Authorization: Bearer {access_token}
```

**Tokens:**
- **Access Token:** Válido por 24 horas
- **Refresh Token:** Válido por 30 dias

**Renovação:**
Use o endpoint `/auth/refresh` com o refresh token para obter um novo access token.

---

## 📝 Notas Importantes

1. **Tipos de Usuário:**
   - `candidate`: Candidatos (podem se candidatar a vagas)
   - `company`: Empresas (podem criar vagas e buscar candidatos)

2. **Permissões:**
   - Candidatos só podem acessar seus próprios dados
   - Empresas só podem gerenciar suas próprias vagas
   - Empresas podem ver perfis de candidatos que se candidataram

3. **Match Percentage:**
   - Calculado automaticamente ao se candidatar
   - Baseado em: localização (20%), salário (20%), tecnologias (60%)

4. **Paginação:**
   - Padrão: 20 itens por página
   - Máximo: 100 itens por página

5. **Filtros:**
   - Todos os filtros são opcionais
   - Filtros de texto usam busca parcial (LIKE)

---

## 🚀 Testando a API

### Com cURL:

```bash
# Registrar usuário
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123","user_type":"candidate"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"senha123"}'

# Obter perfil (com token)
curl -X GET http://localhost:5000/api/candidates/profile \
  -H "Authorization: Bearer {seu_token_aqui}"
```

### Com Postman:

1. Importe a coleção de endpoints
2. Configure a variável `base_url` como `http://localhost:5000/api`
3. Após login, salve o `access_token` em uma variável
4. Use `{{access_token}}` no header Authorization

---

**Documentação atualizada em:** 12/10/2025
**Versão da API:** 1.0.0

