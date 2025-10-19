import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Mail, Phone, MapPin, Lock, User, CheckCircle, Globe, Briefcase, Users as UsersIcon, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CompanyRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [language, setLanguage] = useState('pt') // pt, en, es
  const [formData, setFormData] = useState({
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
  })

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
      legalName: 'Razão Social / Nome Legal',
      legalNamePlaceholder: 'Nome legal da empresa',
      tradeName: 'Nome Fantasia',
      tradeNamePlaceholder: 'Nome comercial',
      taxId: 'Dados Tributários',
      taxIdPlaceholder: 'CNPJ / Tax ID / NIF / RFC',
      website: 'Website',
      websitePlaceholder: 'https://www.empresa.com',
      sector: 'Setor de Atuação',
      sectorPlaceholder: 'Selecione o setor',
      companySize: 'Tamanho da Empresa',
      companySizePlaceholder: 'Selecione',
      description: 'Descrição da Empresa',
      descriptionPlaceholder: 'Conte um pouco sobre sua empresa...',
      country: 'País',
      countryPlaceholder: 'Selecione',
      state: 'Estado / Região',
      statePlaceholder: 'Estado',
      city: 'Cidade',
      cityPlaceholder: 'Cidade',
      address: 'Endereço',
      addressPlaceholder: 'Endereço completo',
      responsibleName: 'Nome Completo',
      responsibleNamePlaceholder: 'Nome do responsável',
      responsiblePosition: 'Cargo / Posição',
      responsiblePositionPlaceholder: 'Ex: Gerente de RH',
      responsibleDepartment: 'Departamento',
      responsibleDepartmentPlaceholder: 'Ex: Recursos Humanos',
      responsibleEmail: 'E-mail Corporativo',
      responsibleEmailPlaceholder: 'email@empresa.com',
      responsiblePhone: 'Telefone',
      responsiblePhonePlaceholder: '+55 (11) 98765-4321',
      password: 'Senha',
      passwordPlaceholder: 'Mínimo 8 caracteres',
      confirmPassword: 'Confirmar Senha',
      confirmPasswordPlaceholder: 'Digite a senha novamente',
      passwordHint: 'Use letras maiúsculas, minúsculas, números e símbolos',
      termsText: 'Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.',
      next: 'Próximo',
      back: 'Voltar',
      createAccount: 'Criar Conta',
      alreadyHaveAccount: 'Já tem uma conta?',
      login: 'Fazer login',
      sectors: {
        tech: 'Tecnologia',
        finance: 'Financeiro',
        health: 'Saúde',
        education: 'Educação',
        retail: 'Varejo',
        manufacturing: 'Manufatura',
        services: 'Serviços',
        other: 'Outro'
      },
      sizes: {
        small: '1-50 funcionários',
        medium: '51-200 funcionários',
        large: '201-1000 funcionários',
        enterprise: 'Mais de 1000 funcionários'
      },
      countries: {
        br: 'Brasil',
        us: 'Estados Unidos',
        es: 'Espanha',
        mx: 'México',
        ar: 'Argentina',
        pt: 'Portugal',
        other: 'Outro'
      }
    },
    en: {
      step1: 'Company Data',
      step2: 'Responsible',
      step3: 'Password',
      step1Title: 'Company Information',
      step1Subtitle: 'Enter your company details',
      step2Title: 'Responsible Person',
      step2Subtitle: 'Who will have platform access?',
      step3Title: 'Create Access Password',
      step3Subtitle: 'Create a secure password to access your account',
      legalName: 'Legal Name',
      legalNamePlaceholder: 'Company legal name',
      tradeName: 'Trade Name',
      tradeNamePlaceholder: 'Commercial name',
      taxId: 'Tax ID',
      taxIdPlaceholder: 'Tax ID / EIN / VAT',
      website: 'Website',
      websitePlaceholder: 'https://www.company.com',
      sector: 'Industry Sector',
      sectorPlaceholder: 'Select sector',
      companySize: 'Company Size',
      companySizePlaceholder: 'Select',
      description: 'Company Description',
      descriptionPlaceholder: 'Tell us about your company...',
      country: 'Country',
      countryPlaceholder: 'Select',
      state: 'State / Region',
      statePlaceholder: 'State',
      city: 'City',
      cityPlaceholder: 'City',
      address: 'Address',
      addressPlaceholder: 'Full address',
      responsibleName: 'Full Name',
      responsibleNamePlaceholder: 'Responsible person name',
      responsiblePosition: 'Position / Title',
      responsiblePositionPlaceholder: 'Ex: HR Manager',
      responsibleDepartment: 'Department',
      responsibleDepartmentPlaceholder: 'Ex: Human Resources',
      responsibleEmail: 'Corporate Email',
      responsibleEmailPlaceholder: 'email@company.com',
      responsiblePhone: 'Phone',
      responsiblePhonePlaceholder: '+1 (555) 123-4567',
      password: 'Password',
      passwordPlaceholder: 'Minimum 8 characters',
      confirmPassword: 'Confirm Password',
      confirmPasswordPlaceholder: 'Type password again',
      passwordHint: 'Use uppercase, lowercase, numbers and symbols',
      termsText: 'By creating your account, you agree to our Terms of Use and Privacy Policy.',
      next: 'Next',
      back: 'Back',
      createAccount: 'Create Account',
      alreadyHaveAccount: 'Already have an account?',
      login: 'Sign in',
      sectors: {
        tech: 'Technology',
        finance: 'Finance',
        health: 'Healthcare',
        education: 'Education',
        retail: 'Retail',
        manufacturing: 'Manufacturing',
        services: 'Services',
        other: 'Other'
      },
      sizes: {
        small: '1-50 employees',
        medium: '51-200 employees',
        large: '201-1000 employees',
        enterprise: 'Over 1000 employees'
      },
      countries: {
        br: 'Brazil',
        us: 'United States',
        es: 'Spain',
        mx: 'Mexico',
        ar: 'Argentina',
        pt: 'Portugal',
        other: 'Other'
      }
    },
    es: {
      step1: 'Datos de Empresa',
      step2: 'Responsable',
      step3: 'Contraseña',
      step1Title: 'Información de la Empresa',
      step1Subtitle: 'Ingrese los datos de su empresa',
      step2Title: 'Datos del Responsable',
      step2Subtitle: '¿Quién tendrá acceso a la plataforma?',
      step3Title: 'Crear Contraseña de Acceso',
      step3Subtitle: 'Cree una contraseña segura para acceder a su cuenta',
      legalName: 'Razón Social',
      legalNamePlaceholder: 'Nombre legal de la empresa',
      tradeName: 'Nombre Comercial',
      tradeNamePlaceholder: 'Nombre comercial',
      taxId: 'Datos Fiscales',
      taxIdPlaceholder: 'RFC / NIF / CIF',
      website: 'Sitio Web',
      websitePlaceholder: 'https://www.empresa.com',
      sector: 'Sector de Actividad',
      sectorPlaceholder: 'Seleccione el sector',
      companySize: 'Tamaño de la Empresa',
      companySizePlaceholder: 'Seleccione',
      description: 'Descripción de la Empresa',
      descriptionPlaceholder: 'Cuéntenos sobre su empresa...',
      country: 'País',
      countryPlaceholder: 'Seleccione',
      state: 'Estado / Región',
      statePlaceholder: 'Estado',
      city: 'Ciudad',
      cityPlaceholder: 'Ciudad',
      address: 'Dirección',
      addressPlaceholder: 'Dirección completa',
      responsibleName: 'Nombre Completo',
      responsibleNamePlaceholder: 'Nombre del responsable',
      responsiblePosition: 'Cargo / Posición',
      responsiblePositionPlaceholder: 'Ej: Gerente de RRHH',
      responsibleDepartment: 'Departamento',
      responsibleDepartmentPlaceholder: 'Ej: Recursos Humanos',
      responsibleEmail: 'Email Corporativo',
      responsibleEmailPlaceholder: 'email@empresa.com',
      responsiblePhone: 'Teléfono',
      responsiblePhonePlaceholder: '+34 612 345 678',
      password: 'Contraseña',
      passwordPlaceholder: 'Mínimo 8 caracteres',
      confirmPassword: 'Confirmar Contraseña',
      confirmPasswordPlaceholder: 'Escriba la contraseña nuevamente',
      passwordHint: 'Use mayúsculas, minúsculas, números y símbolos',
      termsText: 'Al crear su cuenta, acepta nuestros Términos de Uso y Política de Privacidad.',
      next: 'Siguiente',
      back: 'Volver',
      createAccount: 'Crear Cuenta',
      alreadyHaveAccount: '¿Ya tiene una cuenta?',
      login: 'Iniciar sesión',
      sectors: {
        tech: 'Tecnología',
        finance: 'Finanzas',
        health: 'Salud',
        education: 'Educación',
        retail: 'Comercio',
        manufacturing: 'Manufactura',
        services: 'Servicios',
        other: 'Otro'
      },
      sizes: {
        small: '1-50 empleados',
        medium: '51-200 empleados',
        large: '201-1000 empleados',
        enterprise: 'Más de 1000 empleados'
      },
      countries: {
        br: 'Brasil',
        us: 'Estados Unidos',
        es: 'España',
        mx: 'México',
        ar: 'Argentina',
        pt: 'Portugal',
        other: 'Otro'
      }
    }
  }

  const t = translations[language]

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Dados do cadastro:', formData)
    navigate('/empresa/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold text-white">
                  P
                </div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
              </div>
            </Link>
            
            {/* Language Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage('pt')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  language === 'pt' ? 'bg-[#F7941D] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                PT
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  language === 'en' ? 'bg-[#F7941D] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1 rounded font-semibold transition-colors ${
                  language === 'es' ? 'bg-[#F7941D] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                ES
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s ? 'bg-[#F7941D] text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      step > s ? 'bg-[#F7941D]' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm font-medium">
              <span className={step >= 1 ? 'text-[#F7941D]' : 'text-gray-500'}>{t.step1}</span>
              <span className={step >= 2 ? 'text-[#F7941D]' : 'text-gray-500'}>{t.step2}</span>
              <span className={step >= 3 ? 'text-[#F7941D]' : 'text-gray-500'}>{t.step3}</span>
            </div>
          </div>

          {/* Form Card */}
          <Card className="border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white rounded-t-lg">
              <CardTitle className="text-2xl">
                {step === 1 && t.step1Title}
                {step === 2 && t.step2Title}
                {step === 3 && t.step3Title}
              </CardTitle>
              <p className="text-white/80 text-sm mt-1">
                {step === 1 && t.step1Subtitle}
                {step === 2 && t.step2Subtitle}
                {step === 3 && t.step3Subtitle}
              </p>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit}>
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
                          type="text"
                          name="legalName"
                          value={formData.legalName}
                          onChange={handleChange}
                          placeholder={t.legalNamePlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                          {t.tradeName}
                        </label>
                        <Input
                          type="text"
                          name="tradeName"
                          value={formData.tradeName}
                          onChange={handleChange}
                          placeholder={t.tradeNamePlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
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
                          type="text"
                          name="taxId"
                          value={formData.taxId}
                          onChange={handleChange}
                          placeholder={t.taxIdPlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {t.website}
                        </label>
                        <Input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          placeholder={t.websitePlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
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
                          name="sector"
                          value={formData.sector}
                          onChange={handleChange}
                          className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                          required
                        >
                          <option value="">{t.sectorPlaceholder}</option>
                          <option value="tech">{t.sectors.tech}</option>
                          <option value="finance">{t.sectors.finance}</option>
                          <option value="health">{t.sectors.health}</option>
                          <option value="education">{t.sectors.education}</option>
                          <option value="retail">{t.sectors.retail}</option>
                          <option value="manufacturing">{t.sectors.manufacturing}</option>
                          <option value="services">{t.sectors.services}</option>
                          <option value="other">{t.sectors.other}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                          <UsersIcon className="w-4 h-4" />
                          {t.companySize} *
                        </label>
                        <select
                          name="companySize"
                          value={formData.companySize}
                          onChange={handleChange}
                          className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                          required
                        >
                          <option value="">{t.companySizePlaceholder}</option>
                          <option value="small">{t.sizes.small}</option>
                          <option value="medium">{t.sizes.medium}</option>
                          <option value="large">{t.sizes.large}</option>
                          <option value="enterprise">{t.sizes.enterprise}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.description}
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
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
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none h-11"
                          required
                        >
                          <option value="">{t.countryPlaceholder}</option>
                          <option value="br">{t.countries.br}</option>
                          <option value="us">{t.countries.us}</option>
                          <option value="es">{t.countries.es}</option>
                          <option value="mx">{t.countries.mx}</option>
                          <option value="ar">{t.countries.ar}</option>
                          <option value="pt">{t.countries.pt}</option>
                          <option value="other">{t.countries.other}</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                          {t.state}
                        </label>
                        <Input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder={t.statePlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {t.city} *
                        </label>
                        <Input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder={t.cityPlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                        {t.address}
                      </label>
                      <Input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder={t.addressPlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                      />
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
                        type="text"
                        name="responsibleName"
                        value={formData.responsibleName}
                        onChange={handleChange}
                        placeholder={t.responsibleNamePlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {t.responsiblePosition} *
                        </label>
                        <Input
                          type="text"
                          name="responsiblePosition"
                          value={formData.responsiblePosition}
                          onChange={handleChange}
                          placeholder={t.responsiblePositionPlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                          {t.responsibleDepartment}
                        </label>
                        <Input
                          type="text"
                          name="responsibleDepartment"
                          value={formData.responsibleDepartment}
                          onChange={handleChange}
                          placeholder={t.responsibleDepartmentPlaceholder}
                          className="border-2 focus:border-[#F7941D] h-11"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {t.responsibleEmail} *
                      </label>
                      <Input
                        type="email"
                        name="responsibleEmail"
                        value={formData.responsibleEmail}
                        onChange={handleChange}
                        placeholder={t.responsibleEmailPlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {t.responsiblePhone} *
                      </label>
                      <Input
                        type="tel"
                        name="responsiblePhone"
                        value={formData.responsiblePhone}
                        onChange={handleChange}
                        placeholder={t.responsiblePhonePlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                        required
                      />
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
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder={t.passwordPlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t.passwordHint}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-[#1F3B47] flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        {t.confirmPassword} *
                      </label>
                      <Input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder={t.confirmPasswordPlaceholder}
                        className="border-2 focus:border-[#F7941D] h-11"
                        required
                      />
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>{t.termsText}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-4 mt-8">
                  {step > 1 && (
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      className="flex-1 h-12 border-2 border-[#1F3B47] text-[#1F3B47] hover:bg-[#1F3B47] hover:text-white font-semibold"
                    >
                      {t.back}
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 h-12 bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold"
                    >
                      {t.next}
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-[#F7941D] hover:bg-[#e8850d] text-white font-semibold"
                    >
                      {t.createAccount}
                    </Button>
                  )}
                </div>
              </form>

              {/* Login Link */}
              <div className="text-center mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  {t.alreadyHaveAccount}{' '}
                  <Link to="/empresa/login" className="text-[#F7941D] font-semibold hover:underline">
                    {t.login}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

