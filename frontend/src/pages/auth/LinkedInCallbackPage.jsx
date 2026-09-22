import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LinkedInCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithLinkedIn } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code from URL query params
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (errorParam) {
          setError(errorDescription || 'Erro ao fazer login com LinkedIn');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!code) {
          setError('Código de autorização não encontrado');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Login with LinkedIn code
        const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
        const result = await loginWithLinkedIn(code, redirectUri);

        if (result.success) {
          navigate('/candidato/dashboard');
        } else {
          setError(result.error || 'Erro ao fazer login com LinkedIn');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        console.error('LinkedIn callback error:', err);
        setError('Erro ao processar login com LinkedIn');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [loginWithLinkedIn, navigate, searchParams]);

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
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#0A66C2]" />
            <p className="text-gray-600">Processando login com LinkedIn...</p>
          </div>
        )}
      </div>
    </div>
  );
}
