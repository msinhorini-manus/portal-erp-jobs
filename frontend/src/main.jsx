import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

console.log('🟢 main.jsx: Script carregado');

// Capturar erros globais
window.addEventListener('error', (event) => {
  console.error('🔴 GLOBAL ERROR:', event.error);
  console.error('🔴 ERROR MESSAGE:', event.message);
  console.error('🔴 ERROR SOURCE:', event.filename, event.lineno, event.colno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 UNHANDLED PROMISE REJECTION:', event.reason);
});

console.log('🟢 main.jsx: Procurando elemento root...');
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('🔴 ERRO CRÍTICO: Elemento #root não encontrado!');
  document.body.innerHTML = '<div style="padding: 20px; background: #fee; color: #c00;"><h1>Erro: Elemento #root não encontrado!</h1></div>';
} else {
  console.log('🟢 main.jsx: Elemento root encontrado:', rootElement);

  try {
    console.log('🟢 main.jsx: Criando root do React...');
    const root = createRoot(rootElement);

    console.log('🟢 main.jsx: Root criado, iniciando render...');
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('🟢 main.jsx: Render iniciado com sucesso!');
  } catch (error) {
    console.error('🔴 ERRO AO RENDERIZAR:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #fee; color: #c00;">
        <h1>Erro ao inicializar aplicação</h1>
        <pre>${error.toString()}</pre>
        <pre>${error.stack}</pre>
      </div>
    `;
  }
}

console.log('🟢 main.jsx: Script finalizado');
