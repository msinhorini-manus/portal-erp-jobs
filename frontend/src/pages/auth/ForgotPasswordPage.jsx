import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, setError } = useAuth();

  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Por favor, informe seu email');
      return;
    }

    const result = await forgotPassword(email);
    if (result.success) {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-[#F26522]" />
            <span className="text-2xl font-bold">
              <span className="text-[#003570]">Portal ERP</span>
              <span className="text-[#F26522]"> Jobs</span>
            </span>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">
              Recuperar Senha
            </CardTitle>
            <CardDescription className="text-center">
              {success
                ? 'Verifique seu email para continuar'
                : 'Informe seu email para receber as instruções'
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Email enviado!
                </h3>
                <p className="text-gray-600 mb-4">
                  Enviamos um link para <strong>{email}</strong> com instruções para redefinir sua senha.
                </p>
                <p className="text-sm text-gray-500">
                  Não recebeu o email? Verifique sua pasta de spam ou{' '}
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-[#003570] hover:underline"
                  >
                    tente novamente
                  </button>
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#003570] hover:bg-[#002550]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar instruções'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-center pt-0">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
