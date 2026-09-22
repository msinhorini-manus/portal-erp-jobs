import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Briefcase, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, loading, error, setError } = useAuth();

  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password)
    };
    return checks;
  };

  const passwordChecks = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !token) {
      setError('Link de recuperação inválido. Por favor, solicite um novo link.');
      return;
    }

    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos mínimos');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const result = await resetPassword(email, token, formData.password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  if (!email || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardContent className="pt-6">
              <Alert variant="destructive">
                <AlertDescription>
                  Link de recuperação inválido ou expirado. Por favor, solicite um novo link.
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-center">
                <Link
                  to="/recuperar-senha"
                  className="text-[#003570] hover:underline"
                >
                  Solicitar novo link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              Redefinir Senha
            </CardTitle>
            <CardDescription className="text-center">
              {success
                ? 'Sua senha foi alterada com sucesso!'
                : 'Crie uma nova senha para sua conta'
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
                  Senha alterada!
                </h3>
                <p className="text-gray-600 mb-4">
                  Sua senha foi redefinida com sucesso. Você será redirecionado para o login em instantes...
                </p>
                <Link
                  to="/login"
                  className="text-[#003570] hover:underline"
                >
                  Ir para o login agora
                </Link>
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
                    <Label htmlFor="password">Nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Requirements */}
                    {formData.password && (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordChecks.length ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="h-3 w-3" />
                          Mínimo 8 caracteres
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="h-3 w-3" />
                          Uma letra maiúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="h-3 w-3" />
                          Uma letra minúscula
                        </div>
                        <div className={`flex items-center gap-1 ${passwordChecks.number ? 'text-green-600' : 'text-gray-400'}`}>
                          <CheckCircle className="h-3 w-3" />
                          Um número
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-500">As senhas não coincidem</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#003570] hover:bg-[#002550]"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Redefinindo...
                      </>
                    ) : (
                      'Redefinir senha'
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <CardFooter className="flex justify-center pt-0">
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Voltar para o login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
