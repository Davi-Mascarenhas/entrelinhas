#!/usr/bin/env python3
"""Renderiza as artes vetoriais do instalador (Pillow e CairoSVG 2.8.2)."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

root = Path(__file__).resolve().parents[1]
for name in ('header', 'sidebar'):
    source = root / 'src-tauri/windows/branding' / f'{name}.svg'
    # O SVG usa a mesma logo vetorial do app, sem manter uma segunda cópia.
    rendered = cairosvg.svg2png(url=str(source), unsafe=True)
    Image.open(BytesIO(rendered)).convert('RGB').save(source.with_suffix('.bmp'))
    print(source.relative_to(root).with_suffix('.bmp'))
