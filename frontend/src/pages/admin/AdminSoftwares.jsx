import React from 'react';
import { Package } from 'lucide-react';
import AdminCRUDPage from '../../components/AdminCRUDPage';

const AdminSoftwares = () => {
  const fields = [
    { name: 'name', label: 'Nome do Software', type: 'text', placeholder: 'Ex: SAP', required: true },
    { name: 'category', label: 'Categoria', type: 'select', required: true, options: [
      { value: 'ERP', label: 'ERP' },
      { value: 'CRM', label: 'CRM' },
      { value: 'BI', label: 'BI/Analytics' },
      { value: 'Gestão', label: 'Gestão' },
      { value: 'Outro', label: 'Outro' }
    ]},
    { name: 'vendor', label: 'Fornecedor', type: 'text', placeholder: 'Ex: SAP SE' },
    { name: 'description', label: 'Descrição', type: 'textarea', placeholder: 'Descrição do software', fullWidth: true }
  ];

  const initialData = [
    { id: 1, name: 'SAP', category: 'ERP', vendor: 'SAP SE', description: 'Sistema integrado de gestão empresarial' },
    { id: 2, name: 'Oracle EBS', category: 'ERP', vendor: 'Oracle', description: 'Oracle E-Business Suite' },
    { id: 3, name: 'Protheus', category: 'ERP', vendor: 'TOTVS', description: 'ERP da TOTVS' },
    { id: 4, name: 'RM', category: 'ERP', vendor: 'TOTVS', description: 'Sistema de gestão TOTVS RM' },
    { id: 5, name: 'Salesforce', category: 'CRM', vendor: 'Salesforce', description: 'Plataforma de CRM' },
    { id: 6, name: 'Power BI', category: 'BI', vendor: 'Microsoft', description: 'Business Intelligence' },
    { id: 7, name: 'Tableau', category: 'BI', vendor: 'Salesforce', description: 'Visualização de dados' },
    { id: 8, name: 'Dynamics 365', category: 'ERP', vendor: 'Microsoft', description: 'ERP e CRM Microsoft' }
  ];

  return (
    <AdminCRUDPage
      title="Softwares / ERPs"
      subtitle="Gerenciar softwares empresariais e ERPs"
      singularName="Software"
      pluralName="Softwares"
      storageKey="admin_softwares"
      fields={fields}
      icon={Package}
      initialData={initialData}
    />
  );
};

export default AdminSoftwares;

