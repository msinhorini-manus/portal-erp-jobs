import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Building2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI } from '@/services/api'

export default function CompanyLoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Limpar erro ao digitar
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.loginCompany(formData)
      
      // Salvar token e dados do usuário
      localStorage.setItem('authToken', response.access_token)
      localStorage.setItem('userType', 'company')
      localStorage.setItem('userId', response.user.id)
      localStorage.setItem('companyData', JSON.stringify(response.user))
      
      // Redirecionar para dashboard
      navigate('/empresa/dashboard')
    } catch (err) {
      console.error('Erro no login:', err)
      setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F3B47] to-[#2a5261] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-1">
            <div className="w-12 h-12 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white text-xl">
              P
            </div>
            <div className="text-2xl font-bold text-white">
              PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
            </div>
          </div>
        </Link>

        {/* Login Card */}
        <Card className="border-2 shadow-2xl">
          <CardHeader className="bg-white rounded-t-lg pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-[#F7941D] rounded-full flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center text-[#1F3B47]">
              Login Empresa
            </CardTitle>
            <p className="text-center text-gray-600 mt-2">
              Acesse sua conta para gerenciar vagas
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="empresa@exemplo.com"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Esqueci a senha */}
              <div className="text-right">
                <Link 
                  to="/empresa/recuperar-senha" 
                  className="text-sm text-[#F7941D] hover:text-[#d67d19] font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>

              {/* Botão de Login */}
              <Button 
                type="submit" 
                className="w-full bg-[#F7941D] hover:bg-[#d67d19] text-white py-6 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {/* Link para cadastro */}
            <div className="text-center">
              <p className="text-gray-600">
                Ainda não tem uma conta?{' '}
                <Link 
                  to="/empresa/cadastro" 
                  className="text-[#F7941D] hover:text-[#d67d19] font-semibold"
                >
                  Cadastre sua empresa
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Link para área do candidato */}
        <div className="mt-6 text-center">
          <p className="text-white">
            É candidato?{' '}
            <Link 
              to="/candidato/login" 
              className="text-[#F7941D] hover:text-[#d67d19] font-semibold"
            >
              Clique aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

