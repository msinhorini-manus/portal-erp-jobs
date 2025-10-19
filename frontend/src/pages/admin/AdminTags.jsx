import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Tags, Briefcase, TrendingUp, Users, Building2, Code, Package, Settings, LogOut, Plus, Edit, Trash2, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminTags() {
  const [tags, setTags] = useState([
    { id: 1, name: 'React', category: 'Frontend', usageCount: 234 },
    { id: 2, name: 'Node.js', category: 'Backend', usageCount: 189 },
    { id: 3, name: 'Python', category: 'Backend', usageCount: 156 },
    { id: 4, name: 'SAP', category: 'ERP', usageCount: 145 },
    { id: 5, name: 'AWS', category: 'Cloud', usageCount: 123 },
    { id: 6, name: 'Docker', category: 'DevOps', usageCount: 98 },
  ])

  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [formData, setFormData] = useState({ name: '', category: '' })
  const [searchTerm, setSearchTerm] = useState('')

  const categories = ['Frontend', 'Backend', 'DevOps', 'Cloud', 'Database', 'ERP', 'Mobile', 'Outro']

  const handleAdd = () => {
    setEditingTag(null)
    setFormData({ name: '', category: '' })
    setShowModal(true)
  }

  const handleEdit = (tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, category: tag.category })
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Tem certeza que deseja excluir esta tag?')) {
      setTags(tags.filter(t => t.id !== id))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingTag) {
      setTags(tags.map(t => t.id === editingTag.id ? { ...t, ...formData } : t))
    } else {
      setTags([...tags, { id: Date.now(), ...formData, usageCount: 0 }])
    }
    setShowModal(false)
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F7941D] rounded-full flex items-center justify-center font-bold">
                P
              </div>
              <div>
                <div className="text-xl font-bold">
                  PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
                </div>
                <div className="text-xs text-white/70">Painel de Administração</div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]">
          <nav className="p-4">
            <div className="space-y-1">
              <Link
                to="/admin"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              
              <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase">
                Configurações
              </div>
              
              <Link
                to="/admin/tags"
                className="flex items-center gap-3 px-4 py-3 bg-[#F7941D] text-white rounded-lg font-semibold"
              >
                <Tags className="w-5 h-5" />
                Tags/Keywords
              </Link>
              
              <Link
                to="/admin/areas"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Briefcase className="w-5 h-5" />
                Áreas de Atuação
              </Link>
              
              <Link
                to="/admin/niveis"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                Níveis de Experiência
              </Link>
              
              <Link
                to="/admin/modalidades"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                Modalidades
              </Link>
              
              <Link
                to="/admin/tecnologias"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Code className="w-5 h-5" />
                Tecnologias
              </Link>
              
              <Link
                to="/admin/softwares"
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Package className="w-5 h-5" />
                Softwares/ERPs
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1F3B47]">Tags / Keywords</h1>
              <p className="text-gray-600 mt-1">Gerenciar tags e palavras-chave da plataforma</p>
            </div>
            <Button
              onClick={handleAdd}
              className="bg-[#F7941D] hover:bg-[#e8850d] text-white flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nova Tag
            </Button>
          </div>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags Table */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white rounded-t-lg">
              <CardTitle>Lista de Tags ({filteredTags.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nome</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Categoria</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Uso</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTags.map((tag) => (
                      <tr key={tag.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 bg-[#F7941D]/10 text-[#F7941D] rounded-full font-semibold">
                            {tag.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{tag.category}</td>
                        <td className="px-6 py-4 text-gray-700">{tag.usageCount} vagas</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(tag)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle>{editingTag ? 'Editar Tag' : 'Nova Tag'}</CardTitle>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/20 p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                    Nome da Tag *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: React, Python, SAP"
                    className="border-2 focus:border-[#F7941D]"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[#1F3B47]">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 rounded-md focus:border-[#F7941D] focus:outline-none"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    variant="outline"
                    className="flex-1 border-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#F7941D] hover:bg-[#e8850d] text-white"
                  >
                    {editingTag ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

