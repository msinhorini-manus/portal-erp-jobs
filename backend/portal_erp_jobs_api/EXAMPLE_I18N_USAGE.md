# Exemplo de Uso do Sistema de Internacionalização (i18n) na API

## Como usar traduções nas rotas

### 1. Importar a função de tradução

```python
from src.i18n import t
```

### 2. Usar nas respostas da API

#### Exemplo 1: Mensagem de sucesso

```python
@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    try:
        # ... código de registro ...
        
        return jsonify({
            'message': t('success.created'),
            'user_id': new_user.id,
            'company_id': new_company.id
        }), 201
    except Exception as e:
        return jsonify({
            'error': t('error.internal_error'),
            'details': str(e)
        }), 500
```

#### Exemplo 2: Validação de campos

```python
@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json()
    
    # Validar dados obrigatórios
    if not data.get('email') or not data.get('password'):
        return jsonify({
            'error': t('validation.required_field'),
            'fields': ['email', 'password']
        }), 400
    
    # Verificar se email já existe
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({
            'error': t('error.duplicate')
        }), 409
```

#### Exemplo 3: Autenticação

```python
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    user = User.query.filter_by(email=data.get('email')).first()
    
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({
            'error': t('error.invalid_credentials')
        }), 401
    
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'message': t('success.saved'),
        'access_token': access_token
    }), 200
```

## Como testar com diferentes idiomas

### Opção 1: Query Parameter

```bash
# Português (padrão)
curl http://localhost:5000/api?lang=pt-BR

# Inglês
curl http://localhost:5000/api?lang=en-US

# Espanhol
curl http://localhost:5000/api?lang=es-ES
```

### Opção 2: Accept-Language Header

```bash
# Português
curl -H "Accept-Language: pt-BR" http://localhost:5000/api

# Inglês
curl -H "Accept-Language: en-US" http://localhost:5000/api

# Espanhol
curl -H "Accept-Language: es-ES" http://localhost:5000/api
```

## Mensagens disponíveis

### Sucesso (success)
- `success.created` - Criado com sucesso / Created successfully / Creado con éxito
- `success.updated` - Atualizado com sucesso / Updated successfully / Actualizado con éxito
- `success.deleted` - Excluído com sucesso / Deleted successfully / Eliminado con éxito
- `success.saved` - Salvo com sucesso / Saved successfully / Guardado con éxito

### Erros (error)
- `error.not_found` - Não encontrado / Not found / No encontrado
- `error.unauthorized` - Não autorizado / Unauthorized / No autorizado
- `error.forbidden` - Acesso negado / Forbidden / Acceso denegado
- `error.bad_request` - Requisição inválida / Bad request / Solicitud inválida
- `error.internal_error` - Erro interno do servidor / Internal server error / Error interno del servidor
- `error.validation_error` - Erro de validação / Validation error / Error de validación
- `error.duplicate` - Registro duplicado / Duplicate record / Registro duplicado
- `error.invalid_credentials` - Credenciais inválidas / Invalid credentials / Credenciales inválidas

### Validação (validation)
- `validation.required_field` - Campo obrigatório / Required field / Campo obligatorio
- `validation.invalid_email` - E-mail inválido / Invalid email / Correo electrónico inválido
- `validation.invalid_format` - Formato inválido / Invalid format / Formato inválido
- `validation.min_length` - Tamanho mínimo não atingido / Minimum length not met / Longitud mínima no alcanzada
- `validation.max_length` - Tamanho máximo excedido / Maximum length exceeded / Longitud máxima excedida

## Adicionando novas traduções

Edite o arquivo `/translations/messages.json` e adicione as novas chaves em todos os idiomas:

```json
{
  "pt-BR": {
    "nova_categoria": {
      "nova_mensagem": "Texto em português"
    }
  },
  "en-US": {
    "nova_categoria": {
      "nova_mensagem": "Text in English"
    }
  },
  "es-ES": {
    "nova_categoria": {
      "nova_mensagem": "Texto en español"
    }
  }
}
```

Depois use nas rotas:

```python
t('nova_categoria.nova_mensagem')
```

