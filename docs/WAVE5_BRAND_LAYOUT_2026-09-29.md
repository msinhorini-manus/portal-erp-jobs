# Onda 5 — identidade Jobs by Portal ERP

**Data:** 29 de setembro de 2026  
**Direção aprovada:** marca endossada, sem símbolo adicional  
**Assinatura:** logo Portal ERP + Jobs + by Portal ERP

## Objetivo

Aplicar à plataforma a identidade escolhida pelo usuário, preservando os fluxos e a arquitetura entregues nas Ondas 0–4.

## Decisões visuais

- **Authority Ink:** `#0F2530`
- **ERP Orange:** `#F7941D`
- **Career Blue:** `#2563EB`
- **Talent Teal:** `#0EA5A8`
- títulos em Manrope;
- interface e leitura contínua em Inter;
- assinatura sem trajetória, sem pontos, sem rede e sem símbolo próprio do Jobs;
- favicon baseado somente no logo oficial Portal ERP;
- mensagem principal: **O mercado de software trabalha aqui.**

## Escopo aplicado

### Next.js

- header e navegação responsiva;
- footer e links do ecossistema;
- homepage com busca, vagas em destaque, áreas e jornadas de conversão;
- login e cadastro de candidato e empresa;
- shell empresarial;
- dashboard candidato;
- metadados, Open Graph e favicon.

### SPA legada

- header e footer compartilhados;
- fontes e tokens globais;
- favicon e metadados básicos;
- cabeçalho responsivo e ação principal do construtor de currículo.

A SPA continua restrita às superfícies legadas definidas no runbook; regras de negócio, API, BFF, autenticação e banco não foram alterados.

## Conversão no ecossistema

- profissionais: Portal ERP Pro — https://portalerp.me/
- empresas: Programa de Membros — https://membro.portalerp.com.br/
- software: SoftHub — https://softhub.portalerp.com/
- conteúdo institucional: Portal ERP — https://portalerp.com.br/

As URLs foram verificadas publicamente antes da implementação.

## Gates locais

- Next Vitest: 18 testes aprovados;
- TypeScript: sem erros;
- Next build de produção: aprovado;
- SPA ESLint focal: aprovado;
- SPA build de produção: aprovado;
- browser Chromium: homepage desktop e mobile aprovadas;
- browser Chromium: menu mobile aprovado;
- browser Chromium: vagas, login empresarial e login candidato aprovados;
- redirect de rota empresarial protegida preservado;
- zero erros HTTP/console nos casos inspecionados.

## Não escopo

- nenhuma alteração no Flask, SQLite, migrations ou regras de negócio;
- nenhuma ativação de novo país;
- nenhuma mudança de autenticação, sessão, quota, CRUD ou autorização;
- nenhuma criação de ícone ou símbolo novo para Jobs.
