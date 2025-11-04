import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Lock, User, CheckCircle, Globe, Briefcase, Users as UsersIcon, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI } from '@/services/api'
import { toast } from 'react-hot-toast'

export default function CompanyRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [language, setLanguage] = useState('pt')
  
  // React Hook Form
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      // Company Data
      legalName: '',
      tradeName: '',
      taxId: '',
      website: '',
      sector: '',
      companySize: '',
      description: '',
      country: '',
      state: '',
      city: '',
      address: '',
      
      // Responsible Person
      responsibleName: '',
      responsiblePosition: '',
      responsibleDepartment: '',
      responsibleEmail: '',
      responsiblePhone: '',
      
      // Access Credentials
      password: '',
      confirmPassword: ''
    }
  })

  // Watch specific fields if needed
  const watchedSector = watch('sector')
  const watchedSize = watch('companySize')
  const watchedCountry = watch('country')

  const translations = {
    pt: {
      step1: 'Dados da Empresa',
      step2: 'Responsável',
      step3: 'Senha',
      step1Title: 'Informações da Empresa',
      step1Subtitle: 'Informe os dados da sua empresa',
      step2Title: 'Dados do Responsável',
      step2Subtitle: 'Quem terá acesso à plataforma?',
      step3Title: 'Criar Senha de Acesso',
      step3Subtitle: 'Crie uma senha segura para acessar sua conta',
      legalName: 'Razão Social',
      legalNamePlaceholder: 'Nome completo da empresa',
      tradeName: 'Nome Fantasia',
      tradeNamePlaceholder: 'Como sua empresa é conhecida',
      taxId: 'CNPJ',
      taxIdPlaceholder: '00.000.000/0000-00',
      website: 'Website',
      websitePlaceholder: 'https://suaempresa.com.br',
      sector: 'Setor',
      sectorPlaceholder: 'Selecione o setor',
      sectors: {
        tech: 'Tecnologia',
        finance: 'Financeiro',
        health: 'Saúde',
        education: 'Educação',
        retail: 'Varejo',
        other: 'Outro'
      },
      companySize: 'Tamanho da Empresa',
      companySizePlaceholder: 'Selecione',
      sizes: {
        small: '1-50 funcionários',
        medium: '51-200 funcionários',
        large: '201-1000 funcionários',
        enterprise: '1000+ funcionários'
      },
      description: 'Descrição',
      descriptionPlaceholder: 'Conte um pouco sobre sua empresa...',
      country: 'País',
      countryPlaceholder: 'Selecione o país',
      countries: {
        br: 'Brasil',
        us: 'Estados Unidos',
        es: 'Espanha',
        pt: 'Portugal'
      },
      state: 'Estado',
      statePlaceholder: 'Ex: São Paulo',
      city: 'Cidade',
      cityPlaceholder: 'Ex: São Paulo',
      address: 'Endereço',
      addressPlaceholder: 'Rua, número, complemento',
      responsibleName: 'Nome Completo',
      responsibleNamePlaceholder: 'Nome do responsável',
      responsiblePosition: 'Cargo',
      responsiblePositionPlaceholder: 'Ex: Gerente de RH',
      responsibleDepartment: 'Departamento',
      responsibleDepartmentPlaceholder: 'Ex: Recursos Humanos',
      responsibleEmail: 'E-mail Corporativo',
      responsibleEmailPlaceholder: 'email@empresa.com.br',
      responsiblePhone: 'Telefone',
      responsiblePhonePlaceholder: '(11) 99999-9999',
      password: 'Senha',
      passwordPlaceholder: 'Mínimo 8 caracteres',
      confirmPassword: 'Confirmar Senha',
      confirmPasswordPlaceholder: 'Digite a senha novamente',
      next: 'Próximo',
      previous: 'Voltar',
      createAccount: 'Criar Conta',
      haveAccount: 'Já tem uma conta?',
      login: 'Fazer login'
    }
  }

  const t = translations[language]

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1)
  }

  const onSubmit = async (data) => {
    console.log('📝 Form submitted with data:', data)
    
    // Validate password match
    if (data.password !== data.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    try {
      // Prepare data for API
      const companyData = {
        legal_name: data.legalName,
        trade_name: data.tradeName,
        tax_id: data.taxId,
        website: data.website,
        sector: data.sector,
        company_size: data.companySize,
        description: data.description,
        country: data.country,
        state: data.state,
        city: data.city,
        address: data.address,
        responsible_name: data.responsibleName,
        responsible_position: data.responsiblePosition,
        responsible_department: data.responsibleDepartment,
        email: data.responsibleEmail,
        phone: data.responsiblePhone,
        password: data.password
      }

      console.log('🚀 Sending to API:', companyData)

      const response = await authAPI.registerCompany(companyData)
      
      console.log('✅ Registration successful:', response)
      
      toast.success('Empresa cadastrada com sucesso!')
      navigate('/empresa/login')
    } catch (error) {
      console.error('❌ Registration error:', error)
      toast.error(error.response?.data?.message || 'Erro ao cadastrar empresa')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F3B47] via-[#2D5A6B] to-[#1F3B47] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step
                      ? 'bg-[#E91E63] text-white scale-110'
                      : s < step
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white/60'
                  }`}
                >
                  {s < step ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 rounded ${
                      s < step ? 'bg-green-500' : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Labels */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-8 text-white/80 text-sm">
            <span className={step === 1 ? 'font-semibold text-white' : ''}>
              {t.step1}
            </span>
            <span className={step === 2 ? 'font-semibold text-white' : ''}>
              {t.step2}
            </span>
            <span className={step === 3 ? 'font-semibold text-white' : ''}>
              {t.step3}
            </span>
          </div>
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2D5A6B] text-white">
            <CardTitle className="text-2xl font-bold">
              {step === 1 && t.step1Title}
              {step === 2 && t.step2Title}
              {step === 3 && t.step3Title}
            </CardTitle>
            <p className="text-white/80 text-sm mt-2">
              {step === 1 && t.step1Subtitle}
              {step === 2 && t.step2Subtitle}
              {step === 3 && t.step3Subtitle}
            </p>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Step 1: Company Data */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t.legalName} *
                      </label>
                      <Input
                        {...register('legalName', { required: true })}
                        placeholder={t.legalNamePlaceholder}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.tradeName}
                      </label>
                      <Input
                        {...register('tradeName')}
                        placeholder={t.tradeNamePlaceholder}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t.taxId} *
                      </label>
                      <Input
                        {...register('taxId', { required: true })}
                        placeholder={t.taxIdPlaceholder}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {t.website}
                      </label>
                      <Input
                        {...register('website')}
                        placeholder={t.websitePlaceholder}
                        type="url"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {t.sector} *
                      </label>
                      <select
                        {...register('sector', { required: true })}
                        className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                      >
                        <option value="">{t.sectorPlaceholder}</option>
                        <option value="tech">{t.sectors.tech}</option>
                        <option value="finance">{t.sectors.finance}</option>
                        <option value="health">{t.sectors.health}</option>
                        <option value="education">{t.sectors.education}</option>
                        <option value="retail">{t.sectors.retail}</option>
                        <option value="other">{t.sectors.other}</option>
                      </select>
                      {/* Debug: Show selected value */}
                      <p className="text-xs text-gray-500 mt-1">
                        Selecionado: {watchedSector || 'nenhum'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        {t.companySize} *
                      </label>
                      <select
                        {...register('companySize', { required: true })}
                        className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                      >
                        <option value="">{t.companySizePlaceholder}</option>
                        <option value="small">{t.sizes.small}</option>
                        <option value="medium">{t.sizes.medium}</option>
                        <option value="large">{t.sizes.large}</option>
                        <option value="enterprise">{t.sizes.enterprise}</option>
                      </select>
                      {/* Debug: Show selected value */}
                      <p className="text-xs text-gray-500 mt-1">
                        Selecionado: {watchedSize || 'nenhum'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                      {t.description}
                    </label>
                    <textarea
                      {...register('description')}
                      placeholder={t.descriptionPlaceholder}
                      rows="3"
                      className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {t.country} *
                      </label>
                      <select
                        {...register('country', { required: true })}
                        className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                      >
                        <option value="">{t.countryPlaceholder}</option>
                        <option value="br">{t.countries.br}</option>
                        <option value="us">{t.countries.us}</option>
                        <option value="es">{t.countries.es}</option>
                        <option value="pt">{t.countries.pt}</option>
                      </select>
                      {/* Debug: Show selected value */}
                      <p className="text-xs text-gray-500 mt-1">
                        Selecionado: {watchedCountry || 'nenhum'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t.state} *
                      </label>
                      <Input
                        {...register('state', { required: true })}
                        placeholder={t.statePlaceholder}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.city} *
                      </label>
                      <Input
                        {...register('city', { required: true })}
                        placeholder={t.cityPlaceholder}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {t.address}
                    </label>
                    <Input
                      {...register('address')}
                      placeholder={t.addressPlaceholder}
                      className="h-11"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-[#E91E63] hover:bg-[#C2185B] text-white px-8"
                    >
                      {t.next}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Responsible Person */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {t.responsibleName} *
                    </label>
                    <Input
                      {...register('responsibleName', { required: true })}
                      placeholder={t.responsibleNamePlaceholder}
                      className="h-11"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.responsiblePosition} *
                      </label>
                      <Input
                        {...register('responsiblePosition', { required: true })}
                        placeholder={t.responsiblePositionPlaceholder}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.responsibleDepartment}
                      </label>
                      <Input
                        {...register('responsibleDepartment')}
                        placeholder={t.responsibleDepartmentPlaceholder}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t.responsibleEmail} *
                      </label>
                      <Input
                        {...register('responsibleEmail', { required: true })}
                        type="email"
                        placeholder={t.responsibleEmailPlaceholder}
                        className="h-11"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t.responsiblePhone} *
                      </label>
                      <Input
                        {...register('responsiblePhone', { required: true })}
                        placeholder={t.responsiblePhonePlaceholder}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      onClick={handlePrevious}
                      variant="outline"
                      className="px-8"
                    >
                      {t.previous}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-[#E91E63] hover:bg-[#C2185B] text-white px-8"
                    >
                      {t.next}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Password */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {t.password} *
                    </label>
                    <Input
                      {...register('password', { required: true, minLength: 8 })}
                      type="password"
                      placeholder={t.passwordPlaceholder}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      {t.confirmPassword} *
                    </label>
                    <Input
                      {...register('confirmPassword', { required: true, minLength: 8 })}
                      type="password"
                      placeholder={t.confirmPasswordPlaceholder}
                      className="h-11"
                    />
                  </div>

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      onClick={handlePrevious}
                      variant="outline"
                      className="px-8"
                    >
                      {t.previous}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#E91E63] hover:bg-[#C2185B] text-white px-8"
                    >
                      {t.createAccount}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-white/80 text-sm">
            {t.haveAccount}{' '}
            <Link
              to="/empresa/login"
              className="text-[#F7941D] hover:text-[#E8850D] font-semibold"
            >
              {t.login}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

