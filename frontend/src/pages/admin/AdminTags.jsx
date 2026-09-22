import React from 'react';
import { Tag } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminTags = () => {
  const fields = [
    { name: 'name', label: 'Nome da Tag', type: 'text', placeholder: 'Ex: React', required: true },
    { name: 'category', label: 'Categoria', type: 'select', required: true, options: [
      { value: 'Frontend', label: 'Frontend' },
      { value: 'Backend', label: 'Backend' },
      { value: 'DevOps', label: 'DevOps' },
      { value: 'Cloud', label: 'Cloud' },
      { value: 'Database', label: 'Database' },
      { value: 'ERP', label: 'ERP' },
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Soft Skills', label: 'Soft Skills' },
      { value: 'Metodologia', label: 'Metodologia' },
      { value: 'Outro', label: 'Outro' }
    ]},
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da tag', fullWidth: true }
  ];

  const initialData = [
    { id: 1, name: 'React', category: 'Frontend', description: 'Biblioteca JavaScript para interfaces' },
    { id: 2, name: 'Node.js', category: 'Backend', description: 'Runtime JavaScript para backend' },
    { id: 3, name: 'Python', category: 'Backend', description: 'Linguagem de programação versátil' },
    { id: 4, name: 'SAP', category: 'ERP', description: 'Sistema de gestão empresarial' },
    { id: 5, name: 'AWS', category: 'Cloud', description: 'Amazon Web Services' },
    { id: 6, name: 'Docker', category: 'DevOps', description: 'Containerização de aplicações' },
    { id: 7, name: 'Scrum', category: 'Metodologia', description: 'Metodologia ágil' },
    { id: 8, name: 'Liderança', category: 'Soft Skills', description: 'Habilidade de liderança' }
  ];

  return (
    <AdminCRUDPage
      title="Tags / Keywords"
      subtitle="Gerenciar tags e palavras-chave para vagas"
      singularName="Tag"
      pluralName="Tags"
      apiEndpoint="/config/tags"
      storageKey="admin_tags"
      fields={fields}
      icon={Tag}
      initialData={initialData}
    />
  );
};

export default AdminTags;
