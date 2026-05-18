# PIPELINE.md

## Fluxo Sequencial

1. Carregar `config.json`.
2. Validar a seleção de arquivos no navegador.
3. Ordenar os PDFs em ordem alfabética pelo nome.
4. Ler o texto de cada PDF com PDF.js.
5. Extrair e normalizar os campos técnicos de cada documento.
6. Validar se há registros processáveis.
7. Montar o relatório PDF com a primeira página de resumo.
8. Adicionar páginas complementares quando houver mais de três registros.
9. Expor o arquivo gerado para download local.

## Caminho Legado

1. O fluxo Python ainda pode ser executado localmente.
2. Ele permanece apenas como alternativa fora do GitHub Pages.
