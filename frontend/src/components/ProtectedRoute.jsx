import { Navigate } from 'react-router-dom';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 * Verifica autenticação de forma síncrona para evitar redirecionamentos incorretos
 */
export function ProtectedRoute({ children, requiredType }) {
  // Verificar autenticação diretamente do localStorage de forma síncrona
  const token = localStorage.getItem('authToken');
  const userType = localStorage.getItem('userType');
  const isAuthenticated = !!token;

  // Se não estiver autenticado, redireciona para o login correspondente
  if (!isAuthenticated) {
    let loginPath = '/candidato/login';
    if (requiredType === 'admin') {
      loginPath = '/admin/login';
    } else if (requiredType === 'company') {
      loginPath = '/empresa/login';
    }

    // Evitar redirecionamento se já estivermos na página de login
    if (window.location.pathname === loginPath) {
      return children;
    }

    return <Navigate to={loginPath} replace />;
  }

  // Se estiver autenticado mas o tipo de usuário não for o exigido
  if (requiredType && userType !== requiredType) {
    // Se for admin tentando acessar área de candidato/empresa, permitimos ou redirecionamos?
    // Geralmente admin tem acesso a tudo, mas aqui vamos manter a separação por enquanto.

    let redirectPath = '/candidato/dashboard';
    if (userType === 'admin') {
      redirectPath = '/admin';
    } else if (userType === 'company') {
      redirectPath = '/empresa/dashboard';
    }

    // Evitar loop de redirecionamento
    if (window.location.pathname === redirectPath) {
      return children;
    }

    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
