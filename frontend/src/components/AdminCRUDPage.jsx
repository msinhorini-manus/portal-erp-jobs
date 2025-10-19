import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';

const AdminCRUDPage = ({ 
  title, 
  subtitle, 
  singularName, 
  pluralName,
  storageKey,
  fields,
  icon: Icon,
  initialData = []
}) => {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Carregar dados do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const data = JSON.parse(stored);
      setItems(data);
      setFilteredItems(data);
    } else if (initialData.length > 0) {
      setItems(initialData);
      setFilteredItems(initialData);
      localStorage.setItem(storageKey, JSON.stringify(initialData));
    }
  }, [storageKey, initialData]);

  // Filtrar items
  useEffect(() => {
    if (searchTerm) {
      const filtered = items.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [searchTerm, items]);

  const handleCreate = () => {
    const initialFormData = {};
    fields.forEach(field => {
      initialFormData[field.name] = field.defaultValue || '';
    });
    setFormData(initialFormData);
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setFormData({ ...item });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = (item) => {
    if (confirm(`Tem certeza que deseja excluir "${item[fields[0].name]}"?`)) {
      const newItems = items.filter(i => i.id !== item.id);
      setItems(newItems);
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingItem) {
      // Editar
      const newItems = items.map(item =>
        item.id === editingItem.id ? { ...formData, id: editingItem.id } : item
      );
      setItems(newItems);
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    } else {
      // Criar
      const newItem = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };
      const newItems = [...items, newItem];
      setItems(newItems);
      localStorage.setItem(storageKey, JSON.stringify(newItems));
    }
    
    setShowModal(false);
    setFormData({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F7941D] rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">PORTAL <span className="text-[#F7941D]">ERP</span> JOBS</h1>
              <p className="text-sm text-gray-300">{title}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition"
            >
              Dashboard
            </button>
            <button className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition">
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-3xl font-bold text-[#1F3B47]">{title}</h2>
              <p className="text-gray-600 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-[#F7941D] text-white px-6 py-3 rounded-lg hover:bg-[#e58915] transition font-medium"
            >
              <Plus size={20} />
              Novo {singularName}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={`Buscar ${pluralName.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white px-6 py-4">
            <h3 className="font-semibold">Lista de {pluralName} ({filteredItems.length})</h3>
          </div>
          
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Icon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Nenhum {singularName.toLowerCase()} encontrado</p>
              <p className="text-gray-400 mt-2">Clique em "Novo {singularName}" para adicionar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {fields.map(field => (
                      <th key={field.name} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field.label}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {fields.map(field => (
                        <td key={field.name} className="px-6 py-4 whitespace-nowrap">
                          {field.render ? field.render(item[field.name]) : item[field.name]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#1F3B47] to-[#2a5261] text-white p-4 flex items-center justify-between sticky top-0">
              <h3 className="text-xl font-semibold">
                {editingItem ? `Editar ${singularName}` : `Novo ${singularName}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white/10 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(field => (
                  <div key={field.name} className={field.fullWidth ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      >
                        <option value="">Selecione...</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F7941D] focus:border-transparent"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#F7941D] text-white rounded-lg hover:bg-[#e58915] transition font-medium"
                >
                  {editingItem ? 'Salvar Alterações' : `Criar ${singularName}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCRUDPage;

