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
    { name: 'color', label: 'Cor', type: 'select', options: [
      { value: 'blue', label: 'Azul' },
      { value: 'green', label: 'Verde' },
      { value: 'purple', label: 'Roxo' },
      { value: 'orange', label: 'Laranja' },
      { value: 'red', label: 'Vermelho' },
      { value: 'cyan', label: 'Ciano' },
      { value: 'yellow', label: 'Amarelo' }
    ]},
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da tecnologia', fullWidth: true }
  ];

  const initialData = [
    { id: 1, name: 'React', category: 'Frontend', color: 'blue', description: 'Biblioteca JavaScript para interfaces' },
    { id: 2, name: 'Node.js', category: 'Backend', color: 'green', description: 'Runtime JavaScript para backend' },
    { id: 3, name: 'Python', category: 'Backend', color: 'yellow', description: 'Linguagem de programação versátil' },
    { id: 4, name: 'Java', category: 'Backend', color: 'orange', description: 'Linguagem orientada a objetos' },
    { id: 5, name: 'PostgreSQL', category: 'Database', color: 'blue', description: 'Banco de dados relacional' },
    { id: 6, name: 'MongoDB', category: 'Database', color: 'green', description: 'Banco de dados NoSQL' },
    { id: 7, name: 'Docker', category: 'DevOps', color: 'blue', description: 'Containerização de aplicações' },
    { id: 8, name: 'Kubernetes', category: 'DevOps', color: 'blue', description: 'Orquestração de containers' },
    { id: 9, name: 'AWS', category: 'Cloud', color: 'orange', description: 'Amazon Web Services' },
    { id: 10, name: 'Azure', category: 'Cloud', color: 'blue', description: 'Microsoft Azure' }
  ];

  return (
    <AdminCRUDPage
      title="Tecnologias"
      subtitle="Gerenciar tecnologias e linguagens de programação"
      singularName="Tecnologia"
      pluralName="Tecnologias"
      apiEndpoint="/config/technologies"
      storageKey="admin_technologies"
      fields={fields}
      icon={Code}
      initialData={initialData}
    />
  );
};

export default AdminTechnologies;
