#!/usr/bin/env python3
"""Normaliza a versão Debian de prévias para permitir atualizar à futura estável."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile


def main():
    root = Path(__file__).resolve().parents[1]
    version = json.loads((root / 'package.json').read_text())['version']
    package = root / f'src-tauri/target/release/bundle/deb/Entrelinhas_{version}_amd64.deb'
    if '-' not in version:
        print('Versão estável: nenhuma normalização necessária.')
        return
    base, preview = version.split('-', 1)
    expected = f'{base}~{preview}'
    current = subprocess.check_output(['dpkg-deb', '-f', str(package), 'Version'], text=True).strip()
    if current == expected:
        print('Versão Debian já normalizada:', expected)
        return
    assert current == version, f'Versão inesperada: {current}'
    subprocess.run(['dpkg', '--compare-versions', expected, 'lt', base], check=True)
    with tempfile.TemporaryDirectory(prefix='entrelinhas-deb-') as temporary:
        tree = Path(temporary) / 'package'
        subprocess.run(['dpkg-deb', '--raw-extract', str(package), str(tree)], check=True)
        binary = tree / 'usr/bin/entrelinhas'
        digest = hashlib.sha256(binary.read_bytes()).hexdigest()
        control = tree / 'DEBIAN/control'
        text, count = re.subn(r'^Version: .+$', f'Version: {expected}', control.read_text(), flags=re.M)
        assert count == 1
        control.write_text(text)
        result = Path(temporary) / 'preview.deb'
        subprocess.run(['dpkg-deb', '--root-owner-group', '--build', str(tree), str(result)], check=True)
        check = Path(temporary) / 'verify'
        subprocess.run(['dpkg-deb', '--extract', str(result), str(check)], check=True)
        assert hashlib.sha256((check / 'usr/bin/entrelinhas').read_bytes()).hexdigest() == digest
        # O destino fica no mesmo sistema de arquivos para substituição atômica.
        staged = package.with_suffix('.deb.new')
        staged.write_bytes(result.read_bytes())
        staged.replace(package)
    print('Versão Debian:', expected, '· executável preservado; futura estável ordena depois da prévia.')


if __name__ == '__main__':
    main()
