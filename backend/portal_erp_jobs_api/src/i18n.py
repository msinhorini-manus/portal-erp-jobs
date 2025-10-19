"""
Internationalization (i18n) module for Portal ERP Jobs API
Provides multi-language support for API responses
"""
import json
import os
from flask import request, g

# Supported languages
SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-ES']
DEFAULT_LANGUAGE = 'pt-BR'

# Load translations
TRANSLATIONS = {}

def load_translations():
    """Load translations from JSON file"""
    global TRANSLATIONS
    
    # Try different possible paths
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'translations', 'messages.json'),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'translations', 'messages.json'),
        '/translations/messages.json',
        'translations/messages.json'
    ]
    
    for path in possible_paths:
        try:
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    TRANSLATIONS = json.load(f)
                print(f"✅ Translations loaded from: {path}")
                return True
        except Exception as e:
            continue
    
    # If no translations file found, use default translations
    print("⚠️  Translations file not found, using default translations")
    TRANSLATIONS = {
        'pt-BR': {
            'success': {
                'created': 'Criado com sucesso',
                'updated': 'Atualizado com sucesso',
                'deleted': 'Excluído com sucesso',
                'saved': 'Salvo com sucesso'
            },
            'error': {
                'not_found': 'Não encontrado',
                'unauthorized': 'Não autorizado',
                'forbidden': 'Acesso negado',
                'bad_request': 'Requisição inválida',
                'internal_error': 'Erro interno do servidor',
                'validation_error': 'Erro de validação',
                'duplicate': 'Registro duplicado',
                'invalid_credentials': 'Credenciais inválidas'
            },
            'validation': {
                'required_field': 'Campo obrigatório',
                'invalid_email': 'E-mail inválido',
                'invalid_format': 'Formato inválido'
            }
        },
        'en-US': {
            'success': {
                'created': 'Created successfully',
                'updated': 'Updated successfully',
                'deleted': 'Deleted successfully',
                'saved': 'Saved successfully'
            },
            'error': {
                'not_found': 'Not found',
                'unauthorized': 'Unauthorized',
                'forbidden': 'Forbidden',
                'bad_request': 'Bad request',
                'internal_error': 'Internal server error',
                'validation_error': 'Validation error',
                'duplicate': 'Duplicate record',
                'invalid_credentials': 'Invalid credentials'
            },
            'validation': {
                'required_field': 'Required field',
                'invalid_email': 'Invalid email',
                'invalid_format': 'Invalid format'
            }
        },
        'es-ES': {
            'success': {
                'created': 'Creado con éxito',
                'updated': 'Actualizado con éxito',
                'deleted': 'Eliminado con éxito',
                'saved': 'Guardado con éxito'
            },
            'error': {
                'not_found': 'No encontrado',
                'unauthorized': 'No autorizado',
                'forbidden': 'Acceso denegado',
                'bad_request': 'Solicitud inválida',
                'internal_error': 'Error interno del servidor',
                'validation_error': 'Error de validación',
                'duplicate': 'Registro duplicado',
                'invalid_credentials': 'Credenciales inválidas'
            },
            'validation': {
                'required_field': 'Campo obligatorio',
                'invalid_email': 'Correo electrónico inválido',
                'invalid_format': 'Formato inválido'
            }
        }
    }
    return False


def get_locale():
    """
    Determine the best language for the current request
    Priority:
    1. 'lang' query parameter
    2. 'Accept-Language' header
    3. Default language (pt-BR)
    """
    # Check query parameter
    lang = request.args.get('lang')
    if lang and lang in SUPPORTED_LANGUAGES:
        return lang
    
    # Check Accept-Language header
    accept_language = request.headers.get('Accept-Language', '')
    
    # Parse Accept-Language header
    for lang_code in accept_language.split(','):
        # Remove quality value if present (e.g., "en-US;q=0.9")
        lang_code = lang_code.split(';')[0].strip()
        
        # Check exact match
        if lang_code in SUPPORTED_LANGUAGES:
            return lang_code
        
        # Check language prefix (e.g., "en" matches "en-US")
        lang_prefix = lang_code.split('-')[0]
        for supported_lang in SUPPORTED_LANGUAGES:
            if supported_lang.startswith(lang_prefix):
                return supported_lang
    
    # Return default language
    return DEFAULT_LANGUAGE


def translate(key, lang=None):
    """
    Translate a message key to the specified language
    
    Args:
        key: Message key in format "category.message" (e.g., "success.created")
        lang: Language code (optional, uses current request language if not specified)
    
    Returns:
        Translated message or the key itself if translation not found
    """
    if lang is None:
        lang = getattr(g, 'locale', DEFAULT_LANGUAGE)
    
    # Split key into parts (e.g., "success.created" -> ["success", "created"])
    parts = key.split('.')
    
    # Navigate through the translation dictionary
    try:
        translation = TRANSLATIONS[lang]
        for part in parts:
            translation = translation[part]
        return translation
    except (KeyError, TypeError):
        # Return key if translation not found
        return key


def init_i18n(app):
    """
    Initialize i18n for Flask app
    
    Args:
        app: Flask application instance
    """
    # Load translations
    load_translations()
    
    @app.before_request
    def before_request():
        """Set locale for each request"""
        g.locale = get_locale()
    
    # Add translate function to Jinja2 context
    app.jinja_env.globals['translate'] = translate
    app.jinja_env.globals['t'] = translate  # Shorthand


# Shorthand function
def t(key, lang=None):
    """Shorthand for translate()"""
    return translate(key, lang)

