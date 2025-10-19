import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Users, Shield, Eye, Mail, Briefcase } from 'lucide-react';

export default function CompanyUsersPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    role: 'recruiter',
    status: 'active'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const storedUsers = JSON.parse(localStorage.getItem('companyUsers') || '[]');
    setUsers(storedUsers);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingUser) {
      // Editar usuário existente
      const updatedUsers = users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...formData, updatedAt: new Date().toLocaleDateString('pt-BR') }
          : user
      );
      localStorage.setItem('companyUsers', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      alert('Usuário atualizado com sucesso!');
    } else {
      // Criar novo usuário
      const newUser = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        lastAccess: 'Nunca acessou'
      };
      const updatedUsers = [...users, newUser];
      localStorage.setItem('companyUsers', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      alert('Usuário criado com sucesso!');
    }
    
    closeModal();
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      position: user.position,
      department: user.department,
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleDelete = (userId) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      const updatedUsers = users.filter(user => user.id !== userId);
      localStorage.setItem('companyUsers', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      alert('Usuário excluído com sucesso!');
    }
  };

  const handleToggleStatus = (userId) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        return { ...user, status: newStatus };
      }
      return user;
    });
    localStorage.setItem('companyUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      position: '',
      department: '',
      role: 'recruiter',
      status: 'active'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'Administrador', color: 'bg-red-100 text-red-700' },
      recruiter: { label: 'Recrutador', color: 'bg-blue-100 text-blue-700' },
      viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-700' }
    };
    return roles[role] || roles.viewer;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1F3B47] text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F7941D] flex items-center justify-center font-bold text-xl">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold">
                PORTAL <span className="text-[#F7941D]">ERP</span> JOBS
              </h1>
              <p className="text-xs text-gray-300">Gerenciar Usuários</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/empresa/dashboard')}
              className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition"
            >
              Dashboard
            </button>
            <button className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[#1F3B47] mb-2">Usuários da Empresa</h2>
          <p className="text-gray-600">Gerencie os usuários que têm acesso à plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total de Usuários</p>
                <p className="text-3xl font-bold text-[#1F3B47]">{stats.total}</p>
              </div>
              <Users className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Usuários Ativos</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Usuários Inativos</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.inactive}</p>
              </div>
              <UserX className="text-yellow-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Administradores</p>
                <p className="text-3xl font-bold text-red-600">{stats.admins}</p>
              </div>
              <Shield className="text-red-500" size={40} />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todos os Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            >
              <option value="all">Todas as Funções</option>
              <option value="admin">Administrador</option>
              <option value="recruiter">Recrutador</option>
              <option value="viewer">Visualizador</option>
            </select>

            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[#F7941D] text-white rounded-lg hover:bg-[#e8850d] transition flex items-center gap-2 font-medium whitespace-nowrap"
            >
              <Plus size={20} />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1F3B47] text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Usuário</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Cargo</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Departamento</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Função</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Criado em</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Users className="mx-auto mb-3 text-gray-400" size={48} />
                      <p className="text-lg font-medium">Nenhum usuário encontrado</p>
                      <p className="text-sm">Clique em "Novo Usuário" para adicionar o primeiro usuário</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F7941D] flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#1F3B47]">{user.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={14} />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Briefcase size={16} />
                          {user.position}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{user.department}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role).color}`}>
                          {getRoleBadge(user.role).label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.createdAt}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            className={`p-2 rounded-lg transition ${
                              user.status === 'active'
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}
                            title={user.status === 'active' ? 'Desativar' : 'Ativar'}
                          >
                            {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Create/Edit User */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1F3B47] text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={closeModal} className="text-white hover:text-gray-300">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Corporativo *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    placeholder="Ex: joao.silva@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo *
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    placeholder="Ex: Analista de RH"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departamento *
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                    placeholder="Ex: Recursos Humanos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Função na Plataforma *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                  >
                    <option value="admin">Administrador</option>
                    <option value="recruiter">Recrutador</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'admin' && '✓ Acesso total à plataforma'}
                    {formData.role === 'recruiter' && '✓ Publicar vagas e buscar candidatos'}
                    {formData.role === 'viewer' && '✓ Apenas visualizar informações'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#F7941D] text-white rounded-lg hover:bg-[#e8850d] transition font-medium"
                >
                  {editingUser ? 'Atualizar' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

