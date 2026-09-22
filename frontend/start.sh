#!/bin/bash
set -e

echo "🔨 Iniciando build do frontend..."

# Instalar dependências
echo "📦 Instalando dependências..."
npm install --legacy-peer-deps

# Executar build
echo "🏗️ Executando build..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
  echo "❌ Erro: Pasta dist não foi criada!"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "❌ Erro: index.html não foi gerado!"
  exit 1
fi

echo "✅ Build concluído com sucesso!"
echo "📂 Conteúdo da pasta dist:"
ls -lh dist/
echo ""
echo "📂 Conteúdo da pasta dist/assets:"
ls -lh dist/assets/

echo "🚀 Iniciando servidor na porta ${PORT:-8080}..."
node server.js
