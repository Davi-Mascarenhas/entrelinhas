#!/usr/bin/env python3
"""Gera fontes locais para os glifos da interface (fonttools[woff]==4.63.0).

Uso: python scripts/subset-ui-fonts.py /pasta/com/jp.ttf /pasta/com/sc.ttf /pasta/com/tc.ttf
Fontes de origem e licenças: public/fonts/README.md.
Não restringe os glifos do texto do usuário: aplica-se apenas à interface.
"""
import json
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
rows = json.loads((root / 'src/i18n/messages.json').read_text())
for source, column, suffix in [(sys.argv[1], 2, 'JP'), (sys.argv[2], 3, 'SC'), (sys.argv[3], 8, 'TC')]:
    text = ''.join(row[column] for row in rows) + '日本語中文简体中文繁體中文' + ''.join(map(chr, range(32, 127)))
    font = TTFont(source)
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    # O nome reservado Source não é usado nesta derivação.
    for record in font['name'].names:
        if record.nameID in (1, 3, 4, 6, 16):
            name = f'Entrelinhas UI {suffix}'
            if record.nameID == 6:
                name = name.replace(' ', '')
            record.string = name.encode(record.getEncoding(), errors='replace')
    font.flavor = 'woff2'
    target = root / f'public/fonts/entrelinhas-ui-{suffix.lower()}.woff2'
    font.save(target)
    print(target.name, target.stat().st_size, 'bytes')
