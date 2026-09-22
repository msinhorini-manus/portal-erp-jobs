import React from 'react';
import { MapPin } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminModalities = () => {
  const fields = [
    { name: 'name', label: 'Nome da Modalidade', type: 'text', placeholder: 'Ex: Remoto', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da modalidade', fullWidth: true },
    { name: 'icon', label: 'Ícone', type: 'text', placeholder: 'Ex: Home, Building, Laptop' }
  ];

  const initialData = [
    { id: 1, name: 'Remoto', description: 'Trabalho 100% remoto de qualquer lugar', icon: 'Home' },
    { id: 2, name: 'Presencial', description: 'Trabalho presencial no escritório', icon: 'Building' },
    { id: 3, name: 'Híbrido', description: 'Combinação de remoto e presencial', icon: 'Laptop' },
    { id: 4, name: 'Flexível', description: 'Horários flexíveis', icon: 'Clock' }
  ];

  return (
    <AdminCRUDPage
      title="Modalidades de Trabalho"
      subtitle="Gerenciar tipos de modalidade de trabalho"
      singularName="Modalidade"
      pluralName="Modalidades"
      apiEndpoint="/config/modalities"
      storageKey="admin_modalities"
      fields={fields}
      icon={MapPin}
      initialData={initialData}
    />
  );
};

export default AdminModalities;
