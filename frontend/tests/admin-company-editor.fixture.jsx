import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import AdminCompaniesContent from '../src/pages/admin/AdminCompaniesContent.jsx'
import { setRegionalRuntime } from '../src/lib/regional-runtime.js'
import '../src/index.css'

setRegionalRuntime({ prefix: '/br', basename: '', site: { code: 'BR' }, admin: true })
localStorage.setItem('authToken', 'isolated-test-token-not-a-real-credential')
localStorage.setItem('userType', 'admin')
createRoot(document.getElementById('root')).render(
  <MemoryRouter initialEntries={['/admin/empresas']}>
    <AdminCompaniesContent />
  </MemoryRouter>
)
