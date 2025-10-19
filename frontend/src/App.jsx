import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
// import './i18n'  // TODO: Reativar após resolver problema
// import { AuthProvider } from './contexts/AuthContext'  // TODO: Reativar após resolver problema
// import ProtectedRoute from './components/ProtectedRoute'  // TODO: Reativar após resolver problema

// Pages
import HomePage from './pages/HomePage'
import JobSearchPage from './pages/JobSearchPage'
import CandidateProfilePage from './pages/CandidateProfilePage'
import CompanySearchPage from './pages/CompanySearchPage'
import JobDetailPage from './pages/JobDetailPage'
import CompanyRegisterPage from './pages/CompanyRegisterPage'
import CompanyLoginPage from './pages/CompanyLoginPage'
// import CompanyDashboardPage from './pages/CompanyDashboardPage'  // Protected
// import PostJobPage from './pages/PostJobPage'  // Protected
// import MyJobsPage from './pages/MyJobsPage'  // Protected
// import CompanyUsersPage from './pages/CompanyUsersPage'  // Protected
// import ResumeBuilderPage from './pages/ResumeBuilderPage'  // Protected
import CandidateRegisterPage from './pages/CandidateRegisterPage'
import CandidateLoginPage from './pages/CandidateLoginPage'
// import CandidateDashboardPage from './pages/CandidateDashboardPage'  // Protected
import CompaniesPage from './pages/CompaniesPage'
import AreasPage from './pages/AreasPage'
import TechnologiesPage from './pages/TechnologiesPage'
import SalariesPage from './pages/SalariesPage'
import ContentPage from './pages/ContentPage'
import ArticlePage from './pages/ArticlePage'
import CompanyDetailPage from './pages/CompanyDetailPage'

function App() {
  return (
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
          
          {/* Candidate Routes - Public */}
          <Route path="/candidato/cadastro" element={<CandidateRegisterPage />} />
          <Route path="/candidato/login" element={<CandidateLoginPage />} />
          
          {/* TODO: Adicionar rotas protegidas após resolver AuthProvider */}
        </Routes>
      </div>
    </Router>
  )
}

export default App

