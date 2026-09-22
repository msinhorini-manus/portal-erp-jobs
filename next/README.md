# Portal ERP Jobs - Next.js (Páginas Públicas)

## Sobre

Migração das páginas públicas do Portal ERP Jobs de React (Vite) para Next.js 14 com App Router, mantendo a API Flask como backend.

## Benefícios da Migração

- **SEO** — Server-side rendering para todas as páginas públicas (vagas, empresas, áreas)
- **Performance** — Streaming, prefetch automático, cache de 60s nas APIs
- **Metadata dinâmica** — Títulos e descrições únicos por vaga/empresa (Open Graph, Twitter Cards)
- **Sitemap automático** — Gerado dinamicamente com todas as vagas
- **Robots.txt** — Bloqueia áreas privadas (candidato, empresa, admin)
- **Deploy Vercel** — Compatível nativamente com Vercel (MCP configurado)

## Stack

- **Framework:** Next.js 14 (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS 3.4
- **Ícones:** Lucide React
- **Animações:** Framer Motion
- **Backend:** API Flask (proxy via next.config.js rewrites)
- **Banco:** PostgreSQL (Digital Ocean)

## Páginas Migradas

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/` | SSR | Homepage com áreas, busca, CTAs |
| `/vagas` | SSR + Client | Busca de vagas com filtros |
| `/vagas/[id]` | SSR | Detalhe da vaga com metadata dinâmica |
| `/areas` | SSR | Listagem de 19 áreas de atuação |
| `/tecnologias` | SSR | Listagem de tecnologias |
| `/salarios` | Estática | Guia de faixas salariais |
| `/empresas` | SSR | Listagem de empresas |
| `/empresas/[id]` | SSR | Perfil da empresa |
| `/conteudo` | Estática | Blog e artigos |
| `/sitemap.xml` | Dinâmico | Sitemap para Google |
| `/robots.txt` | Estático | Regras para crawlers |

## Comandos

```bash
# Instalar dependências
pnpm install

# Desenvolvimento
pnpm dev

# Build
pnpm build

# Produção
pnpm start
```

## Deploy na Vercel

```bash
# Via CLI
vercel --prod

# Ou via Git push (se conectado ao repositório)
git push origin main
```

## Variáveis de Ambiente

```env
NEXT_PUBLIC_API_URL=https://jobs.portalerp.com.br/api
```

## Estrutura

```
src/
├── app/
│   ├── layout.tsx          # Layout raiz com Navbar + Footer
│   ├── page.tsx            # Homepage
│   ├── globals.css         # Tailwind + variáveis CSS
│   ├── sitemap.ts          # Sitemap dinâmico
│   ├── robots.ts           # Robots.txt
│   ├── not-found.tsx       # Página 404
│   ├── vagas/
│   │   ├── page.tsx        # Busca de vagas
│   │   └── [id]/page.tsx   # Detalhe da vaga
│   ├── areas/page.tsx      # Áreas de atuação
│   ├── tecnologias/page.tsx
│   ├── salarios/page.tsx
│   ├── empresas/
│   │   ├── page.tsx        # Lista de empresas
│   │   └── [id]/page.tsx   # Perfil da empresa
│   └── conteudo/page.tsx   # Blog
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── HeroSearch.tsx
│   ├── JobSearchClient.tsx
│   └── ApplyButton.tsx
└── lib/
    ├── api.ts              # Chamadas à API Flask
    └── utils.ts            # Utilitários (cn)
```
