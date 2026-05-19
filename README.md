# Report Sismografia Enaex

 Aplicação web estática para GitHub Pages. Envie PDFs de sismogramas, o navegador extrai os dados e monta um PDF pronto para download, sem backend.

## Como usar

1. Abra o site publicado no GitHub Pages.
2. Selecione ou arraste um ou mais PDFs.
3. Aguarde a extração local e baixe o relatório.

## Execução local

1. Rode `node server.js` na raiz do projeto.
2. Acesse `http://localhost:8080`.
3. Envie os PDFs de entrada e baixe o relatório gerado.

## O que a versão web faz

- Lê os PDFs no navegador.
- Detecta automaticamente os layouts Instantel Micromate e GeoSonics.
- Quando um GeoSonics não traz PVS explícito, usa o maior PPV dos eixos como valor de PVS do sismograma.
- Valida a entrada antes de processar.
- Monta o PDF no navegador com páginas HTML/SVG capturadas por `html2canvas` local.
- Gera um PDF final com resumo e páginas complementares quando necessário.
- Usa `config.json` para o limite de vibração e a quantidade de registros no resumo.

## Modelos suportados

- `modelos de sismograma/INSTANTEL MICROMATE.pdf`
- `modelos de sismograma/GEOSONIC.pdf`

## Deploy no GitHub Pages

- Publique a partir da raiz do repositório.
- `.nojekyll` já está habilitado.
- As bibliotecas do navegador ficam versionadas no próprio repositório, sem CDN.
- O capture renderer usa `vendor/html2canvas.min.js` e `vendor/jspdf/jspdf.umd.min.js`.

## Legado local

O fluxo Python continua no repositório para uso offline/antigo, mas a experiência principal agora é a interface web em `index.html`.
