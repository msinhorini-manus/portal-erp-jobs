import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/pages/admin/AdminCompaniesContent.jsx', import.meta.url), 'utf8')

test('Editar and Salvar have separate DOM identities and explicit button types', () => {
  assert.match(source, /<button key="edit-company" type="button"/)
  assert.match(source, /<button key="save-company" type="submit"/)
  assert.match(source, /event\.preventDefault\(\); if \(!busy\) setEditMode\(true\)/)
})

test('Save blocks readonly, absent selection, busy and same-tick repeated submissions', () => {
  assert.match(source, /if \(!editMode \|\| !selected\?\.id \|\| busy \|\| saving\.current\) return/)
  assert.match(source, /saving\.current = true/)
  assert.match(source, /finally \{ saving\.current = false; setBusy\(false\) \}/)
})

test('Membership edit remains separate from company approval', () => {
  assert.match(source, /is_member: Boolean\(data\.company\.is_member\)/)
  assert.match(source, /Membro Portal ERP \(não altera aprovação\)/)
  assert.match(source, /Dados da empresa atualizados\. Aprovação não foi alterada\./)
  assert.match(source, /Aprovação administrativa obrigatória/)
})

test('Public registration cannot choose the verified membership flag', async () => {
  const register = await readFile(new URL('../../next/src/components/company/CompanyRegisterForm.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(register, /is_member|name=["'](?:member|membership|is_member)["']/)
})
