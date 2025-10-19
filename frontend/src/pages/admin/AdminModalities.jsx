import React from 'react';
import { MapPin } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminModalities = () => {
  const fields = [
    { name: 'name', label: 'Nome da Modalidade', type: 'text', placeholder: 'Ex: Remoto', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição da modalidade', fullWidth: true }
  ];

  const initialData = [
    { id: 1, name: 'Remoto', description: 'Trabalho 100% remoto de qualquer lugar' },
    { id: 2, name: 'Presencial', description: 'Trabalho presencial no escritório' },
    { id: 3, name: 'Híbrido', description: 'Combinação de remoto e presencial' }
  ];

  return (
    <AdminCRUDPage
      title="Modalidades de Trabalho"
      subtitle="Gerenciar tipos de modalidade de trabalho"
      singularName="Modalidade"
      pluralName="Modalidades"
      storageKey="admin_modalities"
      fields={fields}
      icon={MapPin}
      initialData={initialData}
    />
  );
};

export default AdminModalities;

