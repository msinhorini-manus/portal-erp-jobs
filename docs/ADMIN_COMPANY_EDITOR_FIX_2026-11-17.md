# Admin — Editar empresa não deve salvar automaticamente

## Estado

Correção de código e homologação local concluídas. Publicação depende de novo acesso SSH temporário e backup da produção. Não declarar a correção publicada antes do cutover e gates finais. Os PRs anteriores permanecem abertos; esta correção é limitada à SPA/Admin e não altera API, banco, Next, Nginx, DNS, permissões ou empresas reais.

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

Quatro regressões Node adicionais validam as identidades/types, guards, separação da aprovação e ausência de is_member no cadastro público. Testes regionais da SPA e build passaram. Não foram realizados requests em produção, nem alterações em Skyone ou Aliare.

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

## Publicação planejada

Após acesso autorizado: conferir baseline API/Next e SPA realmente servidos, fazer backup consistente privado e cópia fora da origem, homologar o archive exato e publicar somente os arquivos estáticos da SPA com rollback. Preservar assets anteriores para clientes com HTML antigo durante a troca. Não marcar empresas como membros como parte do teste; a decisão permanece do Admin. Validar a abertura do editor com API interceptada, sem PUTs reais, mais hashes, URLs públicas e logs. Não restaurar banco em rollback. Remover a chave temporária após fechamento.
