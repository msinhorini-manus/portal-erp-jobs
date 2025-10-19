import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

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
import AdminTags from './pages/admin/AdminTags'
import AdminAreas from './pages/admin/AdminAreas'
import AdminLevels from './pages/admin/AdminLevels'
import AdminModalities from './pages/admin/AdminModalities'
import AdminTechnologies from './pages/admin/AdminTechnologies'
import AdminSoftwares from './pages/admin/AdminSoftwares'
import CompanyUsersPage from './pages/CompanyUsersPage'
import ResumeBuilderPage from './pages/ResumeBuilderPage'
import CandidateRegisterPage from './pages/CandidateRegisterPage'
import CandidateLoginPage from './pages/CandidateLoginPage'
import CandidateDashboardPage from './pages/CandidateDashboardPage'
import CompaniesPage from './pages/CompaniesPage'
import AreasPage from './pages/AreasPage'
import TechnologiesPage from './pages/TechnologiesPage'
import SalariesPage from './pages/SalariesPage'
import ContentPage from './pages/ContentPage'
import ArticlePage from './pages/ArticlePage'
import CompanyDetailPage from './pages/CompanyDetailPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/vagas" element={<JobSearchPage />} />
            <Route path="/empresas" element={<CompaniesPage />} />
            <Route path="/empresas/:id" element={<CompanyDetailPage />} />
            <Route path="/areas" element={<AreasPage />} />
            <Route path="/tecnologias" element={<TechnologiesPage />} />
            <Route path="/salarios" element={<SalariesPage />} />
            <Route path="/conteudo" element={<ContentPage />} />
            <Route path="/conteudo/:id" element={<ArticlePage />} />
            <Route path="/vagas/:id" element={<JobDetailPage />} />
            <Route path="/candidato/:id" element={<CandidateProfilePage />} />
            <Route path="/buscar-candidatos" element={<CompanySearchPage />} />
            
            {/* Company Routes - Public */}
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
            
            {/* Candidate Routes - Public */}
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
            
            {/* Admin Routes - Protected */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/tags" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminTags />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/areas" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminAreas />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/levels" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminLevels />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/modalities" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminModalities />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/technologies" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminTechnologies />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/softwares" 
              element={
                <ProtectedRoute requiredType="admin">
                  <AdminSoftwares />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

