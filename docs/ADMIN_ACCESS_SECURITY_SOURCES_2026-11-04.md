# Fontes e correções de segurança — gestão de acessos do Admin

A auditoria de dependências executada em 04/11/2026 encontrou quatro findings altos no SPA e sete altos/críticos no Next. Esses resultados indicam dependências afetadas; não são prova de exploração ou comprometimento do servidor.

O comunicado oficial de 14/10/2026 informa correções para execução remota em otimização de imagens SVG e em `use cache`, além de negação de serviço, a partir do Next 16.4.1. A atualização de 03/11/2026 disponibilizou o Next 16.4.5 e corrigiu outros problemas de cache, respostas e imagem. A release desta correção deve usar o Next 16.4.5, com lockfile reproduzível e novos testes antes de qualquer deploy. [1] [2]

No SPA, o audit registrou versões corrigidas mínimas: DOMPurify 3.4.17, source-map-js 1.2.2 e Vite 6.4.4. O finding de Vite descreve um cenário Windows; o deploy é Linux, mas o pacote será corrigido para eliminar o finding do gate. Zod não possui consumidor encontrado no código `frontend/src`; a dependência direta não utilizada será removida, evitando uma mudança de API de Zod 3 para 4 sem necessidade. Os advisories e os resultados sanitizados de `pnpm audit` deverão ser revalidados após a instalação.

Não haverá mudança de hospedagem. As referências ao fornecedor do framework são fontes de segurança, não instruções para migrar a produção do DigitalOcean.

## Referências

[1]: https://nextjs.org/blog/nextjs-security-update-october-14-2026 "Next.js Security Update for Upstream Vulnerabilities"
[2]: https://nextjs.org/blog/november-2026-security-release "November 2026 Security Release"

## Resultado da aplicação

Os patches foram aplicados e os lockfiles congelados reinstalaram com sucesso. Next 16.4.5 passou em 22 testes, TypeScript e build. O SPA passou em lint focal e build após Vite 6.4.4 e overrides corretivos. O audit passou no nível high: zero altos/críticos, com um moderado remanescente no Next e quatro baixos/moderados no SPA. Esses findings residuais permanecem documentados no relatório da correção.

O `pip-audit` identificou os advisories `PYSEC-2026-4141` e `PYSEC-2026-4183` em PyJWT 2.14.0 e `PYSEC-2026-4312` em Werkzeug 3.1.6. Foram instalados os pins corretivos PyJWT 2.15.0 e Werkzeug 3.1.9. Após isso, `pip-audit` não encontrou vulnerabilidades conhecidas, `pip check` passou e as 110 regressões backend passaram em processos isolados.
