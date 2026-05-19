# TASK.md

## Tarefa Atual

Relatório web com suporte a múltiplos modelos de sismograma.

## Resultado Esperado

- O site abre em GitHub Pages sem backend.
- O usuário envia PDFs e recebe um PDF pronto para baixar.
- A extração acontece localmente no navegador.
- O site aceita os modelos Instantel Micromate e GeoSonics da pasta `modelos de sismograma/`.
- Quando o GeoSonics não traz PVS, o maior PPV dos eixos passa a ser usado como PVS daquele sismograma.
- Nos gráficos, GeoSonics passa a ser identificado pelo número de série do equipamento.
- A interface usa os visuais da pasta `VISUAL` para uma apresentação mais forte.
- O limite de vibração continua vindo de `config.json`.
- O resumo usa até três registros na primeira página e mantém os demais em páginas complementares.
- O PDF é montado no navegador por captura HTML/SVG com bibliotecas locais.

## Status

- Em validação com Instantel Micromate e GeoSonics.
- O fluxo web está estático, roda no navegador e mantém o legado Python apenas como alternativa local.

## Critério de Conclusão

- O site carrega e aceita upload de PDFs.
- O PDF gerado aparece como download local.
- A validação falha explicitamente quando não há PDFs válidos.
- A documentação descreve o fluxo web e o legado Python.
- Não restam referências quebradas ao fluxo antigo nas docs principais.
