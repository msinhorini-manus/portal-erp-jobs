import { Link, useParams } from 'react-router-dom'
import { Calendar, Clock, User, ArrowLeft, Share2, Bookmark, ThumbsUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const articles = {
  '1': {
    id: 1,
    title: 'Como se Tornar um Consultor SAP de Sucesso em 2025',
    category: 'Carreira',
    author: 'Maria Silva',
    date: '2025-01-10',
    readTime: '8 min',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200',
    tags: ['SAP', 'Carreira', 'Consultoria'],
    content: `
# Como se Tornar um Consultor SAP de Sucesso em 2025

O mercado de consultoria SAP continua em alta, com demanda crescente por profissionais qualificados. Neste guia completo, vamos explorar o caminho para se tornar um consultor SAP de sucesso.

## O Que é um Consultor SAP?

Um consultor SAP é um profissional especializado em implementar, configurar e otimizar sistemas SAP para empresas. Eles atuam como ponte entre a tecnologia e os processos de negócio.

## Módulos SAP Mais Demandados

### 1. SAP S/4HANA
O futuro do SAP está no S/4HANA. Profissionais com experiência nesta plataforma são altamente valorizados.

### 2. SAP FICO (Finanças e Controladoria)
Um dos módulos mais tradicionais e com demanda constante no mercado.

### 3. SAP MM (Gestão de Materiais)
Essencial para empresas de manufatura e varejo.

### 4. SAP SD (Vendas e Distribuição)
Crucial para processos comerciais e logística.

## Certificações Essenciais

Para se destacar no mercado, considere as seguintes certificações:

- **SAP Certified Application Associate** - Nível fundamental
- **SAP Certified Technology Associate** - Para aspectos técnicos
- **SAP Certified Development Associate** - Para desenvolvimento

## Faixa Salarial

Consultores SAP no Brasil podem ganhar:

- **Júnior**: R$ 5.000 - R$ 8.000
- **Pleno**: R$ 8.000 - R$ 15.000
- **Sênior**: R$ 15.000 - R$ 25.000
- **Especialista**: R$ 25.000+

## Roadmap de Aprendizado

### Fase 1: Fundamentos (3-6 meses)
- Entender processos de negócio
- Aprender conceitos básicos de ERP
- Estudar um módulo específico

### Fase 2: Certificação (6-12 meses)
- Preparar para certificação oficial
- Realizar cursos práticos
- Participar de projetos reais

### Fase 3: Especialização (12+ meses)
- Aprofundar em módulos específicos
- Desenvolver soft skills
- Construir network profissional

## Dicas de Sucesso

1. **Escolha um módulo e se especialize**
2. **Invista em certificações oficiais**
3. **Participe de comunidades SAP**
4. **Mantenha-se atualizado com S/4HANA**
5. **Desenvolva habilidades de comunicação**

## Conclusão

A carreira de consultor SAP oferece excelentes oportunidades de crescimento e remuneração. Com dedicação e as certificações certas, você pode construir uma carreira sólida e bem-remunerada nesta área.
    `
  },
  '2': {
    id: 2,
    title: 'Top 10 Tecnologias Mais Demandadas em 2025',
    category: 'Tecnologia',
    author: 'João Santos',
    date: '2025-01-08',
    readTime: '12 min',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200',
    tags: ['Tecnologia', 'Tendências', 'Mercado'],
    content: `
# Top 10 Tecnologias Mais Demandadas em 2025

O mercado de tecnologia está em constante evolução. Vamos explorar as 10 tecnologias mais demandadas em 2025 e como você pode se preparar.

## 1. Inteligência Artificial e Machine Learning

### Por que está em alta?
A IA está transformando todos os setores, desde saúde até finanças.

### Habilidades necessárias:
- Python
- TensorFlow/PyTorch
- Estatística e matemática

### Faixa salarial: R$ 12.000 - R$ 30.000

## 2. Cloud Computing (AWS, Azure, GCP)

### Por que está em alta?
Migração massiva para a nuvem continua acelerando.

### Habilidades necessárias:
- AWS/Azure/GCP
- Kubernetes
- Docker
- Terraform

### Faixa salarial: R$ 10.000 - R$ 25.000

## 3. Desenvolvimento Full Stack

### Por que está em alta?
Empresas buscam profissionais versáteis.

### Habilidades necessárias:
- React/Vue/Angular
- Node.js/Python/Java
- Bancos de dados
- APIs RESTful

### Faixa salarial: R$ 8.000 - R$ 20.000

## 4. DevOps e SRE

### Por que está em alta?
Automação e confiabilidade são prioridades.

### Habilidades necessárias:
- CI/CD
- Kubernetes
- Monitoring (Prometheus, Grafana)
- IaC (Terraform, Ansible)

### Faixa salarial: R$ 12.000 - R$ 28.000

## 5. Cybersecurity

### Por que está em alta?
Aumento de ataques cibernéticos.

### Habilidades necessárias:
- Ethical hacking
- Compliance (ISO 27001, LGPD)
- SIEM tools
- Network security

### Faixa salarial: R$ 10.000 - R$ 25.000

## 6. Data Engineering

### Por que está em alta?
Explosão de dados requer profissionais especializados.

### Habilidades necessárias:
- Apache Spark
- Airflow
- SQL/NoSQL
- Data warehousing

### Faixa salarial: R$ 12.000 - R$ 28.000

## 7. Blockchain

### Por que está em alta?
Adoção em finanças, supply chain e mais.

### Habilidades necessárias:
- Solidity
- Ethereum
- Smart contracts
- Web3

### Faixa salarial: R$ 15.000 - R$ 35.000

## 8. IoT (Internet das Coisas)

### Por que está em alta?
Indústria 4.0 e cidades inteligentes.

### Habilidades necessárias:
- Embedded systems
- MQTT
- Edge computing
- Sensores e atuadores

### Faixa salarial: R$ 10.000 - R$ 22.000

## 9. Mobile Development (Flutter/React Native)

### Por que está em alta?
Apps móveis continuam dominando.

### Habilidades necessárias:
- Flutter/React Native
- iOS/Android nativo
- APIs
- UX/UI

### Faixa salarial: R$ 8.000 - R$ 18.000

## 10. Low-Code/No-Code Platforms

### Por que está em alta?
Democratização do desenvolvimento.

### Habilidades necessárias:
- Power Platform
- OutSystems
- Mendix
- Lógica de negócio

### Faixa salarial: R$ 7.000 - R$ 16.000

## Como se Preparar

1. **Escolha 2-3 tecnologias complementares**
2. **Faça projetos práticos**
3. **Obtenha certificações**
4. **Contribua para open source**
5. **Mantenha-se atualizado**

## Conclusão

O mercado oferece excelentes oportunidades para quem se especializa nas tecnologias certas. Escolha aquelas que mais se alinham com seus interesses e invista em aprendizado contínuo.
    `
  }
}

const relatedArticles = [
  {
    id: 3,
    title: 'Guia Completo de Certificações para Desenvolvedores',
    category: 'Certificações',
    readTime: '15 min'
  },
  {
    id: 4,
    title: 'Como Negociar Salário em Entrevistas de TI',
    category: 'Carreira',
    readTime: '6 min'
  },
  {
    id: 5,
    title: 'React vs Vue vs Angular: Qual Escolher em 2025?',
    category: 'Tecnologia',
    readTime: '10 min'
  }
]

export default function ArticlePage() {
  const { id } = useParams()
  const article = articles[id] || articles['1']

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
                  Portal <span className="text-[#F7941D]">ERP</span> Jobs
                </div>
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/vagas" className="hover:text-[#F7941D] transition-colors font-medium">Vagas</Link>
              <Link to="/conteudo" className="text-[#F7941D] font-medium">Conteúdo</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <Link to="/conteudo" className="flex items-center gap-2 text-gray-600 hover:text-[#F7941D] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Voltar para Conteúdo</span>
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <div className="bg-white">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <span className="px-4 py-2 bg-[#F7941D] text-white text-sm font-semibold rounded-full">
                {article.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-[#1F3B47] mb-6">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-medium">{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>{new Date(article.date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{article.readTime} de leitura</span>
              </div>
            </div>

            <div className="flex gap-3 mb-8">
              <Button variant="outline" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Salvar
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                Curtir
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      <div className="container mx-auto px-6 mb-12">
        <div className="max-w-4xl mx-auto">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
      </div>

      {/* Article Content */}
      <div className="container mx-auto px-6 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <div className="prose prose-lg max-w-none">
              {article.content.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold text-[#1F3B47] mt-8 mb-4">{paragraph.substring(2)}</h1>
                } else if (paragraph.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-bold text-[#1F3B47] mt-6 mb-3">{paragraph.substring(3)}</h2>
                } else if (paragraph.startsWith('### ')) {
                  return <h3 key={index} className="text-xl font-bold text-[#1F3B47] mt-4 mb-2">{paragraph.substring(4)}</h3>
                } else if (paragraph.startsWith('- ')) {
                  return <li key={index} className="text-gray-700 ml-6">{paragraph.substring(2)}</li>
                } else if (paragraph.trim()) {
                  return <p key={index} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>
                }
                return null
              })}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <span key={index} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-[#F7941D] hover:text-white transition-colors cursor-pointer">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Related Articles */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-[#1F3B47] mb-6">Artigos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <Card key={related.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
                      {related.category}
                    </span>
                    <h3 className="font-bold text-lg text-[#1F3B47] mt-3 mb-2">
                      {related.title}
                    </h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                      <Clock className="w-4 h-4" />
                      <span>{related.readTime}</span>
                    </div>
                    <Link to={`/conteudo/${related.id}`}>
                      <Button size="sm" className="bg-[#F7941D] hover:bg-[#E67E22] text-white w-full">
                        Ler Artigo
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F3B47] text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/80">© 2025 Portal ERP Jobs. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

