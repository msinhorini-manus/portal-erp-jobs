# Onda 7 — testeira Ecossistema Portal ERP

**Data:** 29 de setembro de 2026

## Objetivo

Adicionar ao topo do Portal ERP Jobs uma testeira institucional inspirada na arquitetura visual do ecossistema Portal ERP, sem alterar a marca Jobs by Portal ERP nem os fluxos existentes.

## Composição

- chamada principal: **ECOSSISTEMA PORTAL ERP**;
- links institucionais: **Inteligência**, **Programa de Membros** e **Portal ERP Pro**;
- contexto visível: **Brasil · PT**;
- fundo claro e tipografia compacta acima da navegação principal escura;
- versão responsiva: links institucionais são ocultados em telas menores, preservando a chamada e o contexto regional.

## Superfícies

- cabeçalho global do Next.js;
- cabeçalho da SPA legada ainda usada pelo currículo e Admin.

## Destinos

- Portal ERP: `https://portalerp.com/br`;
- Programa de Membros: `https://membro.portalerp.com.br/`;
- Portal ERP Pro: `https://portalerp.me/`.

## Garantias

- links externos abrem em nova aba com `rel="noreferrer"`;
- nenhuma lógica de autenticação, regionalização, busca ou CRUD foi alterada;
- a testeira permanece dentro do cabeçalho sticky existente.
