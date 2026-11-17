'use client'

import { useEffect, useId, useState } from 'react'
import { EmployerLogo } from '@/components/EmployerLogo'
import { COMPANY_LOGO_ACCEPT, companyLogoFileError } from '@/lib/company-logo'

type Props = {
  name?: string
  currentUrl?: string | null
  file: File | null
  onChange: (file: File | null) => void
  canManage?: boolean
  disabled?: boolean
  optional?: boolean
  onValidation?: (error: string) => void
  onUpload?: () => void
  onRemove?: () => void
}

export function CompanyLogoUpload({ name, currentUrl, file, onChange, canManage = true, disabled = false, optional = false, onValidation, onUpload, onRemove }: Props) {
  const id = useId()
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState('')
  const [inputKey, setInputKey] = useState(0)
  useEffect(() => {
    if (!file) { setPreview(null); setInputKey(value => value + 1); return }
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])

  function clearSelection() {
    onChange(null)
    setError('')
    onValidation?.('')
    setInputKey(value => value + 1)
  }

  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-slate-700" aria-labelledby={`${id}-label`}>
    <h3 id={`${id}-label`} className="font-semibold">Logo da empresa{optional ? ' (opcional)' : ''}</h3>
    <div className="flex items-center gap-4">
      {preview && preview.file === file ? <span className="inline-flex h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Local preview only; media is never downloaded by the server. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview.url} alt="Prévia do novo logo" className="h-full w-full object-contain p-1" />
      </span> : <EmployerLogo name={name} src={currentUrl} size="hero" />}
      <p id={`${id}-help`} className="text-sm text-slate-600">PNG, JPEG ou WebP, até 2 MB. {optional ? 'A seleção não envia o arquivo; o logo será enviado após a criação da conta.' : 'O logo é salvo separadamente das informações empresariais.'}</p>
    </div>
    {canManage ? <>
      <label htmlFor={`${id}-input`} className="block text-sm font-medium">{currentUrl ? 'Selecionar outro logo' : 'Selecionar logo'}</label>
      <input key={inputKey} id={`${id}-input`} type="file" accept={COMPANY_LOGO_ACCEPT} disabled={disabled} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} aria-invalid={Boolean(error)} className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold disabled:opacity-60" onChange={event => {
        const selected = event.currentTarget.files?.[0] || null
        const validationError = selected ? companyLogoFileError(selected) || '' : ''
        setError(validationError)
        onValidation?.(validationError)
        onChange(validationError ? null : selected)
        if (validationError) event.currentTarget.value = ''
      }} />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {file && onUpload && <button type="button" onClick={onUpload} disabled={disabled} className="rounded-lg bg-[#003570] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{disabled ? 'Aguarde...' : 'Enviar logo'}</button>}
        {file && <button type="button" onClick={clearSelection} disabled={disabled} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">Cancelar seleção</button>}
        {currentUrl && onRemove && <button type="button" onClick={onRemove} disabled={disabled} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-60">Remover logo atual</button>}
      </div>
    </> : <p className="text-sm text-slate-600">Somente owners e administradores autorizados podem alterar o logo.</p>}
  </section>
}
