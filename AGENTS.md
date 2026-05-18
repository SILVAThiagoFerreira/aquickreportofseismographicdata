# AGENTS.md

## Papel do Sistema

Aplicação web estática em JavaScript para leitura de sismogramas em PDF, extração de dados técnicos no navegador e geração de um relatório PDF baixável via GitHub Pages. O fluxo Python permanece como legado local.

## Regras Permanentes

- Não mover lógica crítica para um único arquivo.
- Não processar entrada sem validação anterior.
- Não introduzir valores fixos novos sem atualizar `config.json` e a documentação correspondente.
- Não apagar artefatos legados sem registrar a decisão em `SPEC.md`.
- Não gerar saídas sem registrar identificador temporal no nome do arquivo baixável.

## Contratos Técnicos

- `index.html` é o ponto de entrada do site.
- `app.js` orquestra a interação e o fluxo de arquivos.
- `parser.js` lê e interpreta PDFs.
- `report.js` gera o PDF baixável.
- `utils.js` concentra formatação e regras compartilhadas.
- `main.py` e `src/sismo_report/` permanecem como legado local.

## Diretórios

- `input/`: PDFs canônicos de entrada e amostras.
- `output/`: artefatos legados do fluxo Python.
- `logs/`: trilhas de execução e diagnóstico do fluxo legado.
- `tests/`: validações mínimas e verificáveis.

## Critério de Evolução

- Toda alteração de regra operacional deve atualizar `SPEC.md`, `PIPELINE.md` e `CHECKLIST.md`.
- Toda mudança de formato deve atualizar `DATA_SCHEMA.md`.
- Toda mudança de execução deve atualizar `README.md` e `TASK.md`.

## Qualidade

- Preferir mudanças pequenas e auditáveis.
- Preservar compatibilidade legada apenas quando necessário para a migração.
- Documentar qualquer decisão implícita diretamente no projeto.
