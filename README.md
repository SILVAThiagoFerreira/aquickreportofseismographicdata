# Report Sismografia Enaex

Aplicação web estática para GitHub Pages. Envie PDFs de sismogramas, o navegador extrai os dados e gera um PDF pronto para download, sem backend.

## Como usar

1. Abra o site publicado no GitHub Pages.
2. Selecione ou arraste um ou mais PDFs.
3. Aguarde a extração local e baixe o relatório.

## O que a versão web faz

- Lê os PDFs no navegador.
- Valida a entrada antes de processar.
- Gera um PDF final com resumo e páginas complementares quando necessário.
- Usa `config.json` para o limite de vibração e a quantidade de registros no resumo.

## Deploy no GitHub Pages

- Publique a partir da raiz do repositório.
- `.nojekyll` já está habilitado.
- Os scripts externos são carregados via CDN.

## Legado local

O fluxo Python continua no repositório para uso offline/antigo, mas a experiência principal agora é a interface web em `index.html`.
