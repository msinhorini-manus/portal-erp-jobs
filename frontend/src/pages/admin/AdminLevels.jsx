import React from 'react';
import { TrendingUp } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminLevels = () => {
  const fields = [
    { name: 'name', label: 'Nome do Nível', type: 'text', placeholder: 'Ex: Sênior', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição do nível', fullWidth: true },
    { name: 'order', label: 'Ordem', type: 'number', placeholder: '1', required: true }
  ];

  const initialData = [
    { id: 1, name: 'Estagiário', description: 'Estudantes em formação', order: 1 },
    { id: 2, name: 'Trainee', description: 'Recém-formados em programa de trainee', order: 2 },
    { id: 3, name: 'Júnior', description: '0-2 anos de experiência', order: 3 },
    { id: 4, name: 'Pleno', description: '2-5 anos de experiência', order: 4 },
    { id: 5, name: 'Sênior', description: '5-10 anos de experiência', order: 5 },
    { id: 6, name: 'Especialista', description: 'Especialização em área específica', order: 6 },
    { id: 7, name: 'Tech Lead', description: 'Liderança técnica de equipe', order: 7 },
    { id: 8, name: 'Arquiteto', description: 'Arquitetura de soluções', order: 8 }
  ];

  return (
    <AdminCRUDPage
      title="Níveis de Experiência"
      subtitle="Gerenciar níveis de senioridade das vagas"
      singularName="Nível"
      pluralName="Níveis"
      storageKey="admin_levels"
      fields={fields}
      icon={TrendingUp}
      initialData={initialData}
    />
  );
};

export default AdminLevels;

