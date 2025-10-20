import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <h1 style={{ color: '#1F3B47' }}>Portal ERP Jobs</h1>
        <p>Teste de renderização básica</p>
        <Routes>
          <Route path="/" element={<div><h2>Homepage</h2><p>Bem-vindo ao Portal ERP Jobs!</p></div>} />
          <Route path="/teste" element={<div><h2>Página de Teste</h2></div>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

