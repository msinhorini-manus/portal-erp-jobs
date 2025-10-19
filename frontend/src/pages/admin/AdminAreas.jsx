import React from 'react';
import { Briefcase } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminAreas = () => {
  const fields = [
    {
      name: 'name',
      label: 'Nome da Área',
      type: 'text',
      placeholder: 'Ex: Desenvolvimento',
      required: true
    },
    {
      name: 'description',
      label: 'Descrição',
      type: 'textarea',
      placeholder: 'Descrição da área de atuação',
      fullWidth: true
    },
    {
      name: 'icon',
      label: 'Ícone',
      type: 'text',
      placeholder: 'Ex: Code, Database, Cloud',
      required: true
    },
    {
      name: 'color',
      label: 'Cor',
      type: 'select',
      required: true,
      options: [
        { value: 'blue', label: 'Azul' },
        { value: 'green', label: 'Verde' },
        { value: 'purple', label: 'Roxo' },
        { value: 'orange', label: 'Laranja' },
        { value: 'red', label: 'Vermelho' },
        { value: 'cyan', label: 'Ciano' },
        { value: 'pink', label: 'Rosa' },
        { value: 'yellow', label: 'Amarelo' }
      ],
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-white bg-${value}-500`}>
          {value}
        </span>
      )
    }
  ];

  const initialData = [
    { id: 1, name: 'Desenvolvimento', description: 'Frontend, Backend, Full Stack', icon: 'Code', color: 'blue' },
    { id: 2, name: 'Consultoria & ERP', description: 'SAP, Oracle, Protheus', icon: 'Users', color: 'green' },
    { id: 3, name: 'Suporte & Infraestrutura', description: 'L1, L2, L3, SysAdmin', icon: 'Headphones', color: 'orange' },
    { id: 4, name: 'DevOps & Cloud', description: 'AWS, Azure, Kubernetes', icon: 'Cloud', color: 'cyan' },
    { id: 5, name: 'Dados & Analytics', description: 'Data Science, BI', icon: 'Database', color: 'purple' },
    { id: 6, name: 'Segurança', description: 'Cybersecurity, InfoSec', icon: 'Shield', color: 'red' },
    { id: 7, name: 'Gestão & Liderança', description: 'Tech Lead, IT Manager', icon: 'Users2', color: 'pink' },
    { id: 8, name: 'Mobile', description: 'iOS, Android, React Native', icon: 'Smartphone', color: 'green' },
    { id: 9, name: 'QA & Testes', description: 'QA, Testes Automatizados', icon: 'CheckCircle', color: 'yellow' }
  ];

  return (
    <AdminCRUDPage
      title="Áreas de Atuação"
      subtitle="Gerenciar categorias de vagas da plataforma"
      singularName="Área"
      pluralName="Áreas"
      storageKey="admin_areas"
      fields={fields}
      icon={Briefcase}
      initialData={initialData}
    />
  );
};

export default AdminAreas;

