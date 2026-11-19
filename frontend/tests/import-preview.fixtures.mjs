// Synthetic data only. Not imported by the production SPA.
export const capabilitiesFixture = {
  country_code: 'BR', preview_enabled: true, execution_enabled: false,
  agent_preview_configured: false, actor: 'platform_admin',
  max_file_bytes: 52428800, max_rows: 10000, formats: ['json', 'csv', 'zip'],
}

export function previewFixture(count = 67) {
  const actions = ['create', 'update', 'ignore', 'error', 'review']
  const entities = ['company', 'job', 'logo']
  const items = Array.from({ length: count }, (_, index) => ({
    line: index + 1,
    entity: entities[index % entities.length],
    key: `synthetic-${index + 1}`,
    label: index === 0 ? '=HYPERLINK("https://example.test","Synthetic")' : index === 1 ? '<img src=x onerror=alert(1)> Synthetic plain text' : `Item sintético ${index + 1}`,
    action: actions[index % actions.length],
    messages: index % 5 === 3 ? [{ code: 'missing_description', field: 'description', severity: 'error', message: 'Descrição ausente. A futura publicação exige revisão.' }] : index % 5 === 4 ? [{ code: 'external_key_missing', field: 'id_fonte', severity: 'warning', message: 'Chave externa ausente; revisar a proposta antes de qualquer etapa futura.' }] : [],
  }))
  return {
    preview_id: 'synthetic-preview-reference', dry_run: true, status: 'preview_only', country_code: 'BR', execution_enabled: false,
    totals: {
      companies: items.filter(item => item.entity === 'company').length,
      jobs: items.filter(item => item.entity === 'job').length,
      logos: items.filter(item => item.entity === 'logo').length,
      create: items.filter(item => item.action === 'create').length,
      update: items.filter(item => item.action === 'update').length,
      ignore: items.filter(item => item.action === 'ignore').length,
      error: items.filter(item => item.action === 'error').length,
      warnings: items.reduce((total, item) => total + item.messages.filter(message => message.severity === 'warning').length, 0),
    },
    limitations: ['Fixture sintética: sem gravação e sem dados de candidatos.', 'Fonte e ID externo ainda não persistidos no Jobs.'],
    items,
  }
}
