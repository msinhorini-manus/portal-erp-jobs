import React from 'react';
import { Code } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminTechnologies = () => {
  const fields = [
    { name: 'name', label: 'Nome da Tecnologia', type: 'text', placeholder: 'Ex: React', required: true },
    { name: 'category', label: 'Categoria', type: 'select', required: true, options: [
      { value: 'Frontend', label: 'Frontend' },
      { value: 'Backend', label: 'Backend' },
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Database', label: 'Database' },
      { value: 'DevOps', label: 'DevOps' },
      { value: 'Cloud', label: 'Cloud' },
      { value: 'Outro', label: 'Outro' }
    ]},
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da tecnologia', fullWidth: true }
  ];

  const initialData = [
    { id: 1, name: 'React', category: 'Frontend', description: 'Biblioteca JavaScript para interfaces' },
    { id: 2, name: 'Node.js', category: 'Backend', description: 'Runtime JavaScript para backend' },
    { id: 3, name: 'Python', category: 'Backend', description: 'Linguagem de programação versátil' },
    { id: 4, name: 'Java', category: 'Backend', description: 'Linguagem orientada a objetos' },
    { id: 5, name: 'PostgreSQL', category: 'Database', description: 'Banco de dados relacional' },
    { id: 6, name: 'MongoDB', category: 'Database', description: 'Banco de dados NoSQL' },
    { id: 7, name: 'Docker', category: 'DevOps', description: 'Containerização de aplicações' },
    { id: 8, name: 'Kubernetes', category: 'DevOps', description: 'Orquestração de containers' },
    { id: 9, name: 'AWS', category: 'Cloud', description: 'Amazon Web Services' },
    { id: 10, name: 'Azure', category: 'Cloud', description: 'Microsoft Azure' }
  ];

  return (
    <AdminCRUDPage
      title="Tecnologias"
      subtitle="Gerenciar tecnologias e linguagens de programação"
      singularName="Tecnologia"
      pluralName="Tecnologias"
      storageKey="admin_technologies"
      fields={fields}
      icon={Code}
      initialData={initialData}
    />
  );
};

export default AdminTechnologies;

