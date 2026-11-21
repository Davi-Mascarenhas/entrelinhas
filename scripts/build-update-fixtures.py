#!/usr/bin/env python3
"""Cria dois instaladores de teste; nenhum deles pode ser publicado."""
import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'artifacts/update-fixtures'


def main():
    assert os.environ.get('GITHUB_ACTIONS') == 'true' and os.name == 'nt'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    cli = ['node', str(ROOT / 'node_modules/@tauri-apps/cli/tauri.js')]
    for name in ('test', 'other'):
        subprocess.run([*cli, 'signer', 'generate', '--ci', '-w', str(OUTPUT / f'{name}.key'), '-p', ''], check=True, capture_output=True)
    environment = {**os.environ, 'TAURI_SIGNING_PRIVATE_KEY': (OUTPUT / 'test.key').read_text(), 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD': ''}
    data = {}
    for index in (1, 2):
        version = f'1.2.0-rc.2.test.{index}'
        config = OUTPUT / f'config-{index}.json'
        config.write_text(json.dumps({'version': version, 'plugins': {'updater': {
            'pubkey': (OUTPUT / 'test.key.pub').read_text().strip(),
            'dangerousInsecureTransportProtocol': True,
        }}}), encoding='utf-8')
        with (OUTPUT / f'build-{index}.log').open('w', encoding='utf-8') as log:
            subprocess.run([*cli, 'build', '--bundles', 'nsis', '--features', 'updater-test', '--config', str(config)], cwd=ROOT, env=environment, stdout=log, stderr=subprocess.STDOUT, check=True)
        installer = ROOT / f'src-tauri/target/release/bundle/nsis/Entrelinhas_{version}_x64-setup.exe'
        target = OUTPUT / f'fixture-{index}.exe'
        shutil.copy2(installer, target)
        shutil.copy2(str(installer) + '.sig', str(target) + '.sig')
        data[str(index)] = {'version': version, 'file': target.name, 'signature': Path(str(target) + '.sig').read_text().strip()}
    bad_key_file = OUTPUT / 'wrong-key.exe'
    shutil.copy2(OUTPUT / 'fixture-2.exe', bad_key_file)
    subprocess.run([*cli, 'signer', 'sign', '-f', str(OUTPUT / 'other.key'), '-p', '', '--app-version', data['2']['version'], str(bad_key_file)], check=True, capture_output=True)
    data['wrongSignature'] = Path(str(bad_key_file) + '.sig').read_text().strip()
    (OUTPUT / 'fixtures.json').write_text(json.dumps(data, indent=2), encoding='utf-8')
    print('Dois instaladores de teste e assinaturas de rejeição preparados.', flush=True)


if __name__ == '__main__':
    main()
