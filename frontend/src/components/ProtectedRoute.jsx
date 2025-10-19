import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children, requiredType }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page
    const loginPath = requiredType === 'candidate' ? '/candidato/login' : '/empresa/login';
    return <Navigate to={loginPath} replace />;
  }

  // Check if user type matches required type
  const userType = localStorage.getItem('userType');
  if (requiredType && userType !== requiredType) {
    const redirectPath = userType === 'candidate' ? '/candidato/dashboard' : '/empresa/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default ProtectedRoute;

