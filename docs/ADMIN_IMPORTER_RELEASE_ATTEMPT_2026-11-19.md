# Importador Admin — tentativa de publicação e recuperação

## Estado final

A prévia do importador não foi publicada. API, Admin e configuração de proxy foram restaurados à versão anterior e auditados. Next permaneceu na versão diagnóstica anterior, com PID, comando, ambiente e árvore preservados. A exceção de upload de 50 MiB não ficou ativa.

Esta release é somente de prévia: leitura, validação, propostas e relatório. Não executa importações, não habilita o agente, não envia e-mails e não realiza migrations.

## Homologação concluída

O staging remoto isolado passou em 191 testes API, 60 testes frontend e no build Vite padrão. Testes e build não usaram rede, ambiente vivo nem base produtiva. A homologação integrada prévia da SPA e Flask usou identidade e banco sintéticos; não equivale a teste autenticado do Admin em produção.

O novo backup privado passou em integridade, schema e restore isolado. A cópia off-server foi verificada independentemente, incluindo todas as tabelas e os arquivos de runtime e uploads.

O ensaio real de Nginx e Gunicorn em namespace somente loopback validou 50 MiB íntegros, método, query, cabeçalhos regionais, autorização e rejeição sem parsing do documento. Manteve 413 nos outros endpoints, barra final e excesso do envelope. Usou WSGI sintético, não a aplicação Flask produtiva. A correção endpoint-only foi `proxy_set_header Connection "";` com HTTP/1.1, sem mudar buffering.

A matriz operacional final passou em 221 testes, incluindo recuperação após SIGKILL e 10 regressões do fingerprint de lançamento. Também passaram 10 testes distintos da ponte restrita de recuperação do state original.

## Tentativas preservadas

A primeira troca foi interrompida por uma divergência do fingerprint bruto de ambiente: somente os timestamps PM2 `created_at` e `pm_uptime` mudaram. Nenhuma configuração, credencial ou comando diferiu. A recuperação usou prova pinada da captura anterior e compatibilidade exclusiva desses timestamps; não modificou ambiente, spec ou state.

O controller final passou a excluir somente esses dois timestamps validados do fingerprint lógico da API. Todas as demais variáveis continuam participando do hash. Next mantém o fingerprint bruto integral. Foram emitidos novo spec, READY e state; a janela original não foi reaprovada.

A segunda troca ativou API, Admin e a exceção de proxy, mas registrou recusas de conexão interna enquanto a API estava parada e respostas 503 a acessos públicos de vagas. A auditoria falhou e a recuperação foi executada. Esses erros não foram tolerados ou reclassificados como sucesso. A assinatura de transporte observada nesta tentativa não prova a causa de ocorrências históricas diferentes.

## Garantias finais verificadas

- Fontes e markers antigos de API e Admin restaurados; proxy antigo restaurado byte a byte.
- Next sem reinício ou mudança de ambiente, comando ou bundles.
- Schema `20261111_12`, integridade e chaves estrangeiras verificados.
- Todas as tabelas e uploads iguais antes/depois de cada troca e recuperação com a API parada; banco atual também igual ao último snapshot parado na auditoria final.
- Nenhuma restauração de banco, migration, importação, conta, candidatura ou envio de e-mail realizado pelo processo.
- Sete rotas públicas e técnicas verificadas com status 200; janela de recuperação aprovada. As janelas de publicação reprovadas continuam preservadas.
- Chave temporária retirada e recusada em conexão independente; identidade local e sockets encerrados.
- Backups e recuperação preservados. Artefatos privados de proxy referenciados pelos contratos imutáveis foram retidos; staging com cópias de teste foi removido e seus logs guardados privadamente.

## Pendência para publicar

Revisar o procedimento de troca da API para que acessos reais não recebam 503 durante a manutenção, ou aprovar explicitamente uma janela de manutenção e sua política de homologação. Não remover a proteção do banco nem ampliar admissões de logs para obter um resultado artificialmente verde. Qualquer mudança exige recuperação atual, nova homologação e novos pins/spec/state.

A funcionalidade de gravação/importação e a ativação do agente permanecem etapas futuras separadas. A release de molduras, contagens e dashboard também não foi incorporada por esta tentativa.
