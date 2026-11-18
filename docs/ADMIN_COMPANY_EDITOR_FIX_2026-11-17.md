# Admin — Editar empresa não deve salvar automaticamente

## Estado

Correção publicada e validada em produção em 17/11/2026. Somente a SPA/Admin foi trocada atomicamente; não houve restart de API/Next, migration, restore de banco ou alteração de Nginx/DNS/permissões/empresas reais. Os PRs encadeados #26, #27 e #28 permanecem abertos para revisão. A chave temporária foi removida e uma nova conexão com ela foi recusada; chave privada/socket e staging/ops temporários foram retirados. Backups e SPA anterior de rollback permanecem preservados.

Runtime servido: SPA `6ac36b31955b51d02a078c6c635ef6ef8fd525a9`; API e Next `d211a37f210a072f049b2955653363d95f4e5483`; schema `20261111_12`. O commit documental posterior não foi implantado como nova versão da aplicação.

## Reprodução confirmada

O usuário relatou que abrir **Gestão de Empresas → Ver / editar → Editar** fechava imediatamente o modal e mostrava `Dados da empresa atualizados. Aprovação não foi alterada.`. Isso impedia acessar o checkbox de membro nas empresas Skyone e Aliare.

O código anterior foi reproduzido no Chromium com o componente real e uma API completamente interceptada, usando empresa sintética. Um único click em Editar resultou em um PUT, fechamento do diálogo e o mesmo toast, mesmo no cenário simulado de Admin completo. O submitter observado já tinha texto `Salvar` e type `submit`.

Causa: o modal é um form em ambos os modos; no mesmo ramo/posição React alternava um botão Editar com type button por um botão Salvar de type submit implícito. A reconciliação reutilizava o DOM do botão durante o click, mudando seu type antes da ação padrão do navegador. O handler de submit então enviava editData já preenchido.

O relato não é explicado por falta de permissão: uma negativa de escrita mostraria erro, não o toast de sucesso após PUT. As permissões reais do usuário não foram consultadas ou alteradas.

## Correção limitada

- Identidades React distintas: `key="edit-company"` e `key="save-company"`.
- Types explícitos: Editar = button; Salvar = submit.
- Editar cancela a ação padrão do click antes de ativar o modo de edição.
- Handler de save bloqueia modo de visualização, seleção ausente e operação já em curso.
- Ref síncrono evita duas gravações reentrantes no mesmo tick e é liberado no finally.
- Aprovação permanece separada; payload, rotas regionais e permissões não mudaram.
- Checkbox de membro segue exclusivo do Admin; não há autodeclaração no cadastro público.

## Homologação

A reprodução anterior permanece registrada fora do repo. O código corrigido passou por **63 verificações em dez cenários** no Chromium: mouse, Enter, Espaço, touch, Admin regional, erro 403, limite de vagas inválido, submit fora da edição, PUT pendente com tentativas duplicadas e Enter no campo para salvar legitimamente. Foram testados entrada/saída da edição sem PUT, checkbox, gravação explícita única, marcação/desmarcação, aprovação preservada e ausência de erros JS.

Quatro regressões Node adicionais validam as identidades/types, guards, separação da aprovação e ausência de is_member no cadastro público. Os 27 testes da SPA e build passaram localmente e no staging remoto. Não houve requests em produção durante essa homologação local, nem alterações em Skyone ou Aliare.

O problema também foi reproduzido antes do deploy no bundle efetivamente servido pelo domínio, com toda API interceptada e sessão sintética. Depois da publicação, o bundle real passou 18 verificações em desktop, teclado e celular: Editar/Cancelar não gravam, checkbox aparece, uma ação de Salvar gera uma única chamada simulada e fecha após sucesso. Não houve credenciais reais ou PUTs na API real. Outros 19 smokes públicos de rotas, idioma, canonical, sitemap, noindex Admin e países inativos passaram.

## Executar testes

Contrato de fonte e testes existentes:

```bash
cd frontend
node --test tests/admin-company-editor.test.mjs
pnpm run test:regional
pnpm build
```

Regressão do componente real no browser — requer Python com Playwright e Chromium instalados. Em um terminal, iniciar apenas em loopback:

```bash
cd frontend
pnpm exec vite --host 127.0.0.1 --port 5179 --strictPort
```

Em outro terminal:

```bash
cd frontend
python3 tests/admin-company-editor.browser.py \
  --base http://127.0.0.1:5179 \
  --chromium /usr/bin/chromium
```

O harness é uma entrada de teste separada, não faz parte do build index.html de produção. Todos os endpoints administrativos são interceptados e o script rejeita base URL não local. Os resultados ficam por padrão no diretório temporário do sistema. `--expect-bug` serve apenas para comprovar a versão anterior; não deve passar sobre o código corrigido.

## Publicação comprovada e recuperação

Backup privado consistente em `/var/backups/portal-erp-jobs/admin-company-edit-prechange-20261118T003013Z`, com extração/restauração isolada e cópia privada off-server verificadas por SHA256. Não foi criado link público para o backup. A troca usou renameat2(RENAME_EXCHANGE) e manteve todos os assets anteriores com hashes iguais para abas com HTML antigo. Os dois HTMLs e a fonte alterada correspondem ao staging pinado. Vinte testes sintéticos do helper atômico passaram. Os processos, configuração, fontes/bundles API/Next e schema/reservas/prefixos históricos empresariais e de auditoria permaneceram íntegros.

O rollback executável e seus pins ficam dentro do backup, independentes dos diretórios temporários removidos. A SPA antiga foi retida em um diretório irmão protegido por identidades/hashes. Não houve rollback nem restore de DB nesta publicação.

A auditoria dos seis logs abrange a janela finita iniciada antes do cutover e encerrada depois dos testes públicos e da conferência de runtime: zero erros de aplicação e zero 5xx, sem manutenção. O classificador original foi preservado. Um sibling testado em dez regressões reconheceu apenas quatro assinaturas exatas de acessos benignos ao IP da origem: robots 200, favicon 404, rejeição 404 de dotfile e POST da raiz com 307; além das navegações de origem já homologadas. Não há liberação genérica de hosts/rotas/4xx/5xx, nem ocultação de eventos. As tentativas bloqueadas de auditoria também foram preservadas na evidência privada.

Para testar: atualizar completamente o Admin, abrir Gestão de Empresas → Ver / editar → Editar, marcar Membro Portal ERP e clicar Salvar. A aprovação não é alterada por esse checkbox. A marcação real de Skyone/Aliare permanece uma decisão/ação do Admin, não foi executada como fixture.
