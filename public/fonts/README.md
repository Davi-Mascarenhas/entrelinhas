# Fontes da interface

Os subconjuntos locais Entrelinhas UI JP e Entrelinhas UI SC são derivados de
Noto Sans JP e Noto Sans SC, publicados pelo projeto Google Fonts:

- https://github.com/google/fonts/tree/main/ofl/notosansjp
- https://github.com/google/fonts/tree/main/ofl/notosanssc

Origem obtida em 21/11/2026. Licenças SIL Open Font License 1.1 completas em
OFL-NotoSansJP.txt e OFL-NotoSansSC.txt; os avisos de copyright permanecem nas fontes.
Os nomes das derivações não usam o nome reservado Source.

Os arquivos WOFF2 incluem os caracteres dos catálogos da interface e são
empacotados no aplicativo. Não há requisições externas de fontes.
Para regenerar após ampliar traduções, execute `scripts/subset-ui-fonts.py`
com os TTF variáveis originais e fonttools[woff]==4.63.0.

Esses subconjuntos servem à interface. O texto dos documentos usa a fonte
configurada e as fontes completas disponíveis no sistema.
