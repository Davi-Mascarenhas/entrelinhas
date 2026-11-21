#!/usr/bin/env python3
"""Publica metadados somente para bytes já disponíveis na release oficial."""
import argparse
import base64
from datetime import datetime
import hashlib
import json
from pathlib import Path
import subprocess
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'Davi-Mascarenhas/entrelinhas'


def verify(package, signature, public, version):
    # Decodifica o envelope Minisign do Tauri. Ed25519 é verificado pela
    # biblioteca cryptography; inclui a assinatura do comentário com a versão.
    key = base64.b64decode(base64.b64decode(public.strip(), validate=True).decode().splitlines()[1], validate=True)
    lines = base64.b64decode(signature.strip(), validate=True).decode().splitlines()
    assert len(key) == 42 and key[:2] == b'Ed'
    assert len(lines) == 4 and lines[2].startswith('trusted comment: ')
    signed = base64.b64decode(lines[1], validate=True)
    assert len(signed) == 74 and signed[:2] == b'ED' and signed[2:10] == key[2:10]
    comment = lines[2][17:]
    versions = [field[8:] for field in comment.split('\t') if field.startswith('version:')]
    assert versions == [version], 'A assinatura não corresponde à versão anunciada.'
    verifier = Ed25519PublicKey.from_public_bytes(key[10:])
    verifier.verify(signed[10:], hashlib.blake2b(package.read_bytes()).digest())
    verifier.verify(base64.b64decode(lines[3], validate=True), signed[10:] + comment.encode())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    parser.add_argument('--assets', required=True, type=Path)
    parser.add_argument('--channel', choices=['preview', 'stable'], required=True)
    parser.add_argument('--notes', required=True)
    parser.add_argument('--bootstrap-linux-stable', action='store_true')
    args = parser.parse_args()
    assert args.version and all(c.isalnum() or c in '.-' for c in args.version)
    assert ('-' in args.version) == (args.channel == 'preview')
    assert not args.bootstrap_linux_stable or args.channel == 'stable'
    config = json.loads((ROOT / 'src-tauri/tauri.conf.json').read_text())['plugins']['updater']
    assert not config.get('dangerousInsecureTransportProtocol', False)
    public = (ROOT / 'updates/public.key').read_text().strip()
    assert public == config['pubkey'] and config['requireSignedVersion']
    release = json.loads(subprocess.check_output(['gh', 'api', f'repos/{REPOSITORY}/releases/tags/v{args.version}']))
    assert not release['draft'] and release['prerelease'] == (args.channel == 'preview')
    remote = {asset['name']: asset for asset in release['assets']}
    names = {'linux-x86_64': f'Entrelinhas_{args.version}_amd64.deb'}
    if not args.bootstrap_linux_stable:
        names['windows-x86_64'] = f'Entrelinhas_{args.version}_x64-setup.exe'
    platforms = {}
    for target, name in names.items():
        file = args.assets / name
        signature_file = args.assets / (name + '.sig')
        signature = signature_file.read_text().strip()
        verify(file, signature, public, args.version)
        for local in [file] + ([] if args.bootstrap_linux_stable else [signature_file]):
            digest = 'sha256:' + hashlib.sha256(local.read_bytes()).hexdigest()
            assert remote[local.name]['digest'] == digest, 'Os bytes publicados diferem do arquivo validado: ' + local.name
        url = remote[name]['browser_download_url']
        assert url.startswith(f'https://github.com/{REPOSITORY}/releases/download/v{args.version}/')
        platforms[target] = {'url': url, 'signature': signature}
    manifest = {'version': args.version, 'notes': args.notes, 'pub_date': release['published_at'], 'platforms': platforms}
    channels = ['stable', 'preview'] if args.channel == 'stable' and not args.bootstrap_linux_stable else [args.channel]
    for channel in channels:
        path = ROOT / f'updates/{channel}.json'
        path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
        print('Manifesto validado:', path)


if __name__ == '__main__':
    main()
