# CHECKLIST.md

## Conclusão Mínima

- [x] `config.json` existe e está preenchido.
- [x] `index.html` é a entrada principal do site.
- [x] `README.md` descreve uso, deploy no GitHub Pages e legado.
- [x] `AGENTS.md` define regras permanentes para o fluxo web.
- [x] `TASK.md` descreve a tarefa atual.
- [x] `SPEC.md` formaliza comportamento e validações.
- [x] `PIPELINE.md` descreve o fluxo sequencial.
- [x] `DATA_SCHEMA.md` documenta a estrutura dos dados.
- [x] `input/`, `output/`, `logs/` e `tests/` existem.
- [x] Existe ao menos um smoke check executável.
- [x] A execução gera um PDF baixável sem erro de sintaxe.
- [x] A validação falha de forma explícita quando não há PDFs.

## Qualidade Operacional

- [x] Caminhos e intervalos vêm de configuração externa.
- [x] Não há lógica monolítica.
- [x] O relatório é gerado localmente no navegador.
- [x] Os PDFs são ordenados alfabeticamente antes do processamento.
- [x] O status de vibração abaixo/acima do limite aparece no PDF e na interface.
- [x] PDFs com mais de três registros geram páginas complementares sem perda de dados.
- [x] O fluxo Python permanece apenas como legado.
