export default function HomePage() {
  return (
    <div style={{padding: '20px', backgroundColor: 'white', minHeight: '100vh'}}>
      <h1 style={{color: '#1F3B47', fontSize: '32px', marginBottom: '20px'}}>
        Portal ERP Jobs
      </h1>
      <p style={{fontSize: '18px', color: '#333'}}>
        Teste de renderização - Se você está vendo isso, o React está funcionando!
      </p>
      <div style={{marginTop: '20px', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px'}}>
        <h2 style={{color: '#F7941D'}}>Informações do Sistema</h2>
        <ul>
          <li>React: Funcionando ✅</li>
          <li>Roteamento: Funcionando ✅</li>
          <li>Renderização: Funcionando ✅</li>
        </ul>
      </div>
    </div>
  )
}

