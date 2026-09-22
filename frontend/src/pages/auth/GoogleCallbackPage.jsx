import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function GoogleCallbackPage() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL hash
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');

        if (!accessToken) {
          setError('Token de acesso não encontrado');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Login with Google token
        const result = await loginWithGoogle(accessToken);

        if (result.success) {
          navigate('/candidato/dashboard');
        } else {
          setError(result.error || 'Erro ao fazer login com Google');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        console.error('Google callback error:', err);
        setError('Erro ao processar login com Google');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [loginWithGoogle, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="text-center">
        {error ? (
          <div className="space-y-4">
            <p className="text-red-600">{error}</p>
            <p className="text-gray-500">Redirecionando para o login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#003570]" />
            <p className="text-gray-600">Processando login com Google...</p>
          </div>
        )}
      </div>
    </div>
  );
}
