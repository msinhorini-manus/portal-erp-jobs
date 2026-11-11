import { useEffect, useState } from 'react'
import { resolveRegionalContext } from './lib/regional-context.js'
import { setRegionalRuntime } from './lib/regional-runtime.js'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { MainLayout } from './components/layout'
import AdminLayout from './components/admin/AdminLayout'

// Pages
import HomePage from './pages/HomePage'
import JobSearchPage from './pages/JobSearchPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import CompanySearchPage from './pages/CompanySearchPage'
import JobDetailPage from './pages/JobDetailPage'
import CompanyRegisterPage from './pages/CompanyRegisterPage'
import CompanyLoginPage from './pages/CompanyLoginPage'
import CompanyDashboardPage from './pages/CompanyDashboardPage'
import PostJobPage from './pages/PostJobPage'
import MyJobsPage from './pages/MyJobsPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminTags from './pages/admin/AdminTags'
import AdminAreas from './pages/admin/AdminAreas'
import AdminLevels from './pages/admin/AdminLevels'
import AdminModalities from './pages/admin/AdminModalities'
import AdminTechnologies from './pages/admin/AdminTechnologies'
import AdminSoftwares from './pages/admin/AdminSoftwares'
import AdminCompanies from './pages/admin/AdminCompanies'
import AdminCandidates from './pages/admin/AdminCandidates'
import AdminJobs from './pages/admin/AdminJobs'
import CompanyUsersPage from './pages/CompanyUsersPage'
import ResumeBuilderPage from './pages/ResumeBuilderPage'
import CandidateRegisterPage from './pages/CandidateRegisterPage'
import CandidateLoginPage from './pages/CandidateLoginPage'
import CandidateDashboardPage from './pages/CandidateDashboardPage'
import CandidatePublicProfilePage from './pages/CandidatePublicProfilePage'
import CompaniesPage from './pages/CompaniesPage'
import AreasPage from './pages/AreasPage'
import TechnologiesPage from './pages/TechnologiesPage'
import SalariesPage from './pages/SalariesPage'
import ContentPage from './pages/ContentPage'
import ArticlePage from './pages/ArticlePage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import CompanyProfilePage from './pages/CompanyProfilePage'
import CompanyCandidatesPage from './pages/CompanyCandidatesPage'

// Componentes wrapper para páginas admin (removem o layout interno)
import AdminDashboardContent from './pages/admin/AdminDashboardContent'
import AdminCandidatesContent from './pages/admin/AdminCandidatesContent'
import AdminCompaniesContent from './pages/admin/AdminCompaniesContent'
import AdminJobsContent from './pages/admin/AdminJobsContent'
import AdminAccessContent from './pages/admin/AdminAccessContent'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterCandidatePage from './pages/auth/RegisterCandidatePage'
import RegisterCompanyPage from './pages/auth/RegisterCompanyPage'
import RegisterCompanySuccessPage from './pages/auth/RegisterCompanySuccessPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage'
import LinkedInCallbackPage from './pages/auth/LinkedInCallbackPage'

function App() {
  const [regional, setRegional] = useState(null)
  const [contextError, setContextError] = useState('')
  useEffect(() => {
    let active = true
    resolveRegionalContext().then(context => {
      if (!active) return
      setRegionalRuntime(context)
      if (context.site.locale) document.documentElement.lang = context.site.locale
      setRegional(context)
    }).catch(error => { if (active) setContextError(error.message) })
    return () => { active = false }
  }, [])
  if (contextError) return <div role="alert" className="p-8 text-red-800">{contextError}</div>
  if (!regional) return <div role="status" className="p-8 text-gray-600">Validando região...</div>
  return (
    <AuthProvider>
      <Router basename={regional.basename || '/'}>
        <Routes>
          {/* Auth Routes - Sem layout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro/candidato" element={<RegisterCandidatePage />} />
          <Route path="/cadastro/empresa" element={<RegisterCompanyPage />} />
          <Route path="/cadastro/empresa/sucesso" element={<RegisterCompanySuccessPage />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/auth/linkedin/callback" element={<LinkedInCallbackPage />} />

          {/* Admin Routes - Com layout próprio */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Admin Routes - Protegidas com AdminLayout */}
          <Route
            element={
              <ProtectedRoute requiredType="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboardContent />} />
            <Route path="/admin/tags" element={<AdminTags />} />
            <Route path="/admin/areas" element={<AdminAreas />} />
            <Route path="/admin/levels" element={<AdminLevels />} />
            <Route path="/admin/modalities" element={<AdminModalities />} />
            <Route path="/admin/technologies" element={<AdminTechnologies />} />
            <Route path="/admin/softwares" element={<AdminSoftwares />} />
            <Route path="/admin/empresas" element={<AdminCompaniesContent />} />
            <Route path="/admin/candidatos" element={<AdminCandidatesContent />} />
            <Route path="/admin/vagas" element={<AdminJobsContent />} />
            <Route path="/admin/usuarios" element={<AdminAccessContent />} />
          </Route>

          {/* Rotas com Layout Principal (Navbar + Footer) */}
          <Route element={<MainLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/vagas" element={<JobSearchPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/empresas/:companySlug/:id" element={<CompanyDetailPage collection="empresas" />} />
            <Route path="/companies/:companySlug/:id" element={<CompanyDetailPage collection="companies" />} />
            <Route path="/areas" element={<AreasPage />} />
            <Route path="/tecnologias" element={<TechnologiesPage />} />
            <Route path="/salarios" element={<SalariesPage />} />
            <Route path="/conteudo" element={<ContentPage />} />
            <Route path="/conteudo/:id" element={<ArticlePage />} />
            <Route path="/vagas/:id" element={<JobDetailPage />} />
            <Route path="/vagas/:companySlug/:titleSlug/:id" element={<JobDetailPage collection="vagas" />} />
            <Route path="/vacantes/:companySlug/:titleSlug/:id" element={<JobDetailPage collection="vacantes" />} />
            <Route path="/jobs/:companySlug/:titleSlug/:id" element={<JobDetailPage collection="jobs" />} />
            <Route path="/candidato/:id" element={<CandidateProfilePage />} />
            <Route path="/candidato/perfil/:id" element={<CandidatePublicProfilePage />} />
            <Route path="/buscar-candidatos" element={<CompanySearchPage />} />

            {/* Company Routes - Public (legacy, redirect to new) */}
            <Route path="/empresa/cadastro" element={<CompanyRegisterPage />} />
            <Route path="/empresa/login" element={<CompanyLoginPage />} />

            {/* Company Routes - Protected */}
            <Route
              path="/empresa/dashboard"
              element={
                <ProtectedRoute requiredType="company">
                  <CompanyDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/publicar-vaga"
              element={
                <ProtectedRoute requiredType="company">
                  <PostJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/vagas"
              element={
                <ProtectedRoute requiredType="company">
                  <MyJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/vagas/nova"
              element={
                <ProtectedRoute requiredType="company">
                  <PostJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/vagas/:id/editar"
              element={
                <ProtectedRoute requiredType="company">
                  <PostJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/usuarios"
              element={
                <ProtectedRoute requiredType="company">
                  <CompanyUsersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/empresa/perfil"
              element={
                <ProtectedRoute requiredType="company">
                  <CompanyProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empresa/candidatos"
              element={
                <ProtectedRoute requiredType="company">
                  <CompanyCandidatesPage />
                </ProtectedRoute>
              }
            />

            {/* Candidate Routes - Public (legacy, redirect to new) */}
            <Route path="/candidato/cadastro" element={<CandidateRegisterPage />} />
            <Route path="/candidato/login" element={<CandidateLoginPage />} />

            {/* Candidate Routes - Protected */}
            <Route
              path="/candidato/dashboard"
              element={
                <ProtectedRoute requiredType="candidate">
                  <CandidateDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidato/curriculo"
              element={
                <ProtectedRoute requiredType="candidate">
                  <ResumeBuilderPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
