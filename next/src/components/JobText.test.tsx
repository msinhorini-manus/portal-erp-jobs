import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { JobText } from './JobText'
vi.stubGlobal('React', React)

describe('JobText editorial SSR', () => {
  it('renders all explicit list items, including every item after the third', () => {
    const items = ['Primeiro completo', 'Segundo completo', 'Terceiro completo', 'Quarto completo', 'Quinto completo', 'Sexto completo']
    const html = renderToStaticMarkup(<JobText text={items.map(item => `• ${item}`).join('\n')} />)
    expect(html).toContain('<ul')
    expect(html.match(/<li /g)).toHaveLength(items.length)
    for (const item of items) expect(html).toContain(item)
  })
  it('only renders benefits as chips for existing bullets and never adds benefits', () => {
    const html = renderToStaticMarkup(<JobText variant="chips" text={'- Benefício real A\n- Benefício real B\n- Benefício real C\n- Benefício real D\n- Benefício real E'} />)
    expect(html.match(/<li /g)).toHaveLength(5)
    expect(html).toContain('flex flex-wrap')
    expect(html).toContain('Benefício real E')
    expect(html).not.toContain('Wellhub')
    expect(html).not.toContain('Plano de saúde')
  })
  it('renders free text verbatim with whitespace, not artificial chips or sentences', () => {
    const text = 'Plano de saúde, sujeito à carência; seguro opcional.\n\n    Detalhes completos, sem perda.\nÚltimo parágrafo integral.'
    const html = renderToStaticMarkup(<JobText variant="chips" text={text} />)
    expect(html).toContain(text)
    expect(html).toContain('whitespace-pre-wrap')
    expect(html).not.toContain('<ul')
    expect(html).not.toContain('<li')
  })
  it('preserves mixed prose and multiline bullet continuations as a single text block', () => {
    const text = 'Contexto integral:\n• Primeiro item\n  Explicação detalhada.\n• Segundo item'
    expect(renderToStaticMarkup(<JobText text={text} />)).toContain(text)
  })
  it('can keep the description as text even if it starts with bullets', () => {
    const text = '• Descrição completa\n• Outro parágrafo'
    const html = renderToStaticMarkup(<JobText text={text} variant="text" />)
    expect(html).toContain(text)
    expect(html).not.toContain('<ul')
  })
  it('escapes markup instead of interpreting editorial text as HTML', () => {
    const html = renderToStaticMarkup(<JobText text={'<script>alert("texto")</script>\n<img src=x onerror=alert(1)>'} />)
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
  })
  it.each([undefined, null, '', '  \n '])('omits genuinely empty fields: %s', text => {
    expect(renderToStaticMarkup(<JobText text={text} />)).toBe('')
  })
})
