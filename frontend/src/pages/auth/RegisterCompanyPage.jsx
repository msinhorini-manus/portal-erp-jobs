import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Building2, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle, Phone, User, Clock } from 'lucide-react';

export default function RegisterCompanyPage() {
  const navigate = useNavigate();
  const { registerCompany, loading, error, setError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: '',
    cnpj: '',
    contact_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
    setError(null);
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
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

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.company_name || !formData.contact_name) {
        setError('Por favor, preencha todos os campos obrigatórios');
        return;
      }
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos obrigatórios');
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

    if (!acceptTerms) {
      setError('Você precisa aceitar os termos de uso');
      return;
    }

    const result = await registerCompany({
      company_name: formData.company_name,
      cnpj: formData.cnpj.replace(/\D/g, ''),
      contact_name: formData.contact_name,
      email: formData.email,
      phone: formData.phone.replace(/\D/g, ''),
      password: formData.password
    });

    if (result.success) {
      // Mostrar mensagem de sucesso com aviso de aprovação pendente
      navigate('/cadastro/empresa/sucesso');
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
          <p className="text-gray-600 mt-2">Cadastre sua empresa</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
              <Building2 className="h-6 w-6 text-[#F26522]" />
              Cadastro de Empresa
            </CardTitle>
            <CardDescription className="text-center">
              Encontre os melhores profissionais do mercado de ERP
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-[#F26522] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  1
                </div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#F26522]' : 'bg-gray-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-[#F26522] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  2
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Aprovação necessária</p>
                  <p className="text-blue-600">Após o cadastro, sua empresa será analisada pela nossa equipe antes de ser ativada.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome da empresa *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="company_name"
                        name="company_name"
                        type="text"
                        placeholder="Nome da sua empresa"
                        value={formData.company_name}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={handleCNPJChange}
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Nome do responsável *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="contact_name"
                        name="contact_name"
                        type="text"
                        placeholder="Seu nome completo"
                        value={formData.contact_name}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className="pl-10"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full bg-[#F26522] hover:bg-[#d55a1d]"
                  >
                    Continuar
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email corporativo *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="contato@empresa.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
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
                    <Label htmlFor="confirmPassword">Confirmar senha *</Label>
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

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={acceptTerms}
                      onCheckedChange={setAcceptTerms}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm text-gray-600 leading-tight cursor-pointer"
                    >
                      Concordo com os{' '}
                      <Link to="/termos" className="text-[#003570] hover:underline">
                        Termos de Uso
                      </Link>{' '}
                      e{' '}
                      <Link to="/privacidade" className="text-[#003570] hover:underline">
                        Política de Privacidade
                      </Link>
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevStep}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#F26522] hover:bg-[#d55a1d]"
                      disabled={loading || !acceptTerms}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cadastrando...
                        </>
                      ) : (
                        'Cadastrar empresa'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="text-center text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link
                to="/login?type=company"
                className="text-[#F26522] font-medium hover:underline"
              >
                Faça login
              </Link>
            </div>
            <div className="text-center text-sm text-gray-600">
              É um profissional?{' '}
              <Link
                to="/cadastro/candidato"
                className="text-[#003570] font-medium hover:underline"
              >
                Cadastre-se como candidato
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
