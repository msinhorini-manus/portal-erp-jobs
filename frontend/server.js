import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware para servir arquivos estáticos da pasta assets ANTES do fallback
app.use('/assets', express.static(path.join(__dirname, 'dist', 'assets'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

// Servir favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'favicon.ico'));
});

// Servir outros arquivos estáticos da raiz (exceto rotas SPA)
app.use(express.static(path.join(__dirname, 'dist'), {
  index: false, // Não servir index.html automaticamente
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Todas as outras rotas devem retornar o index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'dist')}`);
});

