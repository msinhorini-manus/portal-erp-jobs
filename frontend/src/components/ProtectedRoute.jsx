import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy guard. Candidate curriculum may use the Next BFF HttpOnly session;
 * company/admin routes retain their existing localStorage session until their migration.
 */
export function ProtectedRoute({ children, requiredType }) {
  const legacyToken = localStorage.getItem('authToken');
  const userType = localStorage.getItem('userType');
  const token = requiredType === 'candidate' ? null : legacyToken;
  const [candidateSession, setCandidateSession] = useState(requiredType === 'candidate' ? 'loading' : 'unused');

  useEffect(() => {
    if (requiredType !== 'candidate') return;
    if (userType === 'candidate') {
      for (const key of ['authToken', 'refreshToken', 'userType', 'userId']) localStorage.removeItem(key);
    }
    let active = true;
    fetch('/bff/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => {
        if (!active) return;
        setCandidateSession(response.ok ? 'valid' : 'invalid');
      })
      .catch(() => active && setCandidateSession('invalid'));
    return () => { active = false; };
  }, [requiredType, userType]);

  if (requiredType === 'candidate') {
    if (candidateSession === 'loading') {
      return <div className="min-h-[60vh] flex items-center justify-center text-gray-600">Validando sessão...</div>;
    }
    if (candidateSession === 'valid') return children;
    return <Navigate to="/candidato/login" replace />;
  }

  if (!token) {
    const loginPath = requiredType === 'admin' ? '/admin/login' : requiredType === 'company' ? '/empresa/login' : '/candidato/login';
    if (window.location.pathname === loginPath) return children;
    return <Navigate to={loginPath} replace />;
  }

  if (requiredType && userType !== requiredType) {
    const redirectPath = userType === 'admin' ? '/admin' : userType === 'company' ? '/empresa/dashboard' : '/candidato/dashboard';
    if (window.location.pathname === redirectPath) return children;
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
