# SPEC.md

## Objetivo

Processar PDFs de sismogramas enviados pelo usuário no navegador, extrair os dados operacionais relevantes e gerar um relatório PDF baixável sem backend.

## Entradas

- PDFs de sismograma selecionados no site, em layouts Instantel Micromate ou GeoSonics.
- Configuração em `config.json`.
- Logo institucional em caminho configurado.

## Processamento

1. Ler configuração externa.
2. Validar seleção de arquivos antes do processamento.
3. Ordenar os PDFs alfabeticamente pelo nome.
4. Extrair texto de cada PDF no navegador.
5. Identificar automaticamente o layout suportado e normalizar os campos técnicos.
6. Gerar um PDF local com resumo e páginas complementares quando necessário.
7. Expor o arquivo para download no navegador.

## Saídas

- Relatório PDF resumido com páginas complementares quando necessário.
- Arquivo baixável gerado localmente no navegador.

## Regras de Negócio

- A ordem dos PDFs segue ordenação alfabética pelo nome do arquivo.
- A entrada é validada antes do processamento.
- Se não houver PDFs válidos, a execução falha com erro explícito.
- Em GeoSonics, quando o PDF não traz `Peak Vector Sum`, o PVS do registro é inferido pelo maior PPV entre os eixos de vibração do mesmo sismograma.
- Os índices de vibração exibem explicitamente o status abaixo/acima do limite configurado em `config.json` no PDF e na interface.
- O resumo exibe até três registros na primeira página e desloca os demais para páginas complementares.
- O processamento ocorre apenas no navegador; nenhum arquivo é enviado para servidor.

## Validações

- Arquivos precisam ser PDFs válidos.
- A leitura deve ocorrer antes de qualquer geração.
- Campos críticos ausentes são representados como `N/D` apenas na apresentação.
- O relatório precisa permanecer gerável sem backend.

## Decisões

- `index.html` é a entrada principal do site.
- O fluxo Python permanece como legado local, sem ser a experiência principal.
- A camada de apresentação não deve alterar o dado bruto extraído.
