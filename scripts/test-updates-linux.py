#!/usr/bin/env python3
"""Valida consulta e download .deb em um perfil Linux descartável."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request
from update_checks import Feed, common, search, button, apply_update

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('desktop', ROOT / 'scripts/test-desktop.py')
desktop = importlib.util.module_from_spec(spec); spec.loader.exec_module(desktop)
wait = desktop.wait


def main():
    output = ROOT / 'artifacts/linux-update-tests'; output.mkdir(parents=True, exist_ok=True)
    package = ROOT / 'src-tauri/target/release/bundle/deb/Entrelinhas_1.2.0-rc.2_amd64.deb'
    cli = ['node', str(ROOT / 'node_modules/@tauri-apps/cli/tauri.js')]
    checks = []
    def passed(label):
        checks.append(label); print('OK · ' + label, flush=True)
    with tempfile.TemporaryDirectory(prefix='updates-', dir=ROOT / 'artifacts') as temporary:
        directory = Path(temporary); downloads = directory / 'Downloads'; downloads.mkdir()
        config = directory / 'config'; config.mkdir()
        (config / 'user-dirs.dirs').write_text(f'XDG_DOCUMENTS_DIR="{downloads}"\nXDG_DOWNLOAD_DIR="{downloads}"\n')
        data_home = directory / 'data'; data_home.mkdir()
        for name in ('test', 'other'):
            subprocess.run([*cli, 'signer', 'generate', '--ci', '-w', str(directory / f'{name}.key'), '-p', ''], check=True, capture_output=True)
        fixture = directory / 'package.deb'; shutil.copy2(package, fixture)
        version = '1.2.0-rc.3.test.1'
        def sign(name):
            subprocess.run([*cli, 'signer', 'sign', '-f', str(directory / f'{name}.key'), '-p', '', '--app-version', version, str(fixture)], check=True, capture_output=True)
            return Path(str(fixture) + '.sig').read_text().strip()
        signature, wrong = sign('test'), sign('other')
        with Feed(fixture, signature, version, 'linux-x86_64') as feed:
            port, native_port = desktop.free_port(), desktop.free_port()
            environment = {**os.environ, 'XDG_DATA_HOME': str(data_home), 'XDG_CONFIG_HOME': str(config),
                'ENTRELINHAS_UPDATER_TEST_ENDPOINT': feed.url + '/manifest.json',
                'ENTRELINHAS_UPDATER_TEST_PUBKEY': (directory / 'test.key.pub').read_text().strip()}
            log = (output / 'driver.log').open('w')
            driver = subprocess.Popen([str(Path.home() / '.cargo/bin/tauri-driver'), '--port', str(port), '--native-port', str(native_port), '--native-driver', os.environ['WEBKIT_WEBDRIVER']], env=environment, stdout=log, stderr=log)
            app = desktop.Desktop(f'http://127.0.0.1:{port}', ROOT / 'src-tauri/target/debug/entrelinhas')
            app.output = output
            try:
                wait(lambda: urllib.request.urlopen(f'http://127.0.0.1:{port}/status', timeout=1).status == 200, 'WebDriver')
                app.start()
                common(app, feed, wait, passed)
                rejected = downloads / 'Rejeitado.deb'
                for label, tampered, sig, announced in (
                    ('pacote adulterado', True, signature, version),
                    ('chave desconhecida', False, wrong, version),
                    ('versão adulterada', False, signature, '1.2.0-rc.3.test.2'),
                ):
                    feed.tampered, feed.signature, feed.version = tampered, sig, announced
                    search(app, wait)
                    wait(lambda: app.js('return !!document.querySelector(".update-version")'), label)
                    try:
                        app.ipc('download_update', path=str(rejected))
                    except RuntimeError:
                        pass
                    else:
                        raise AssertionError('O pacote deveria ter sido rejeitado: ' + label)
                    assert not rejected.exists()
                    passed(label + ' rejeitado sem gravar pacote no disco')
                feed.tampered = False; feed.signature = signature; feed.version = version
                search(app, wait)
                wait(lambda: app.js('return !!document.querySelector(".update-version")'), 'pacote válido')
                assert 'Baixar pacote .deb' in app.js('return document.querySelector(".update-actions .primary").innerText')
                count = len(feed.requests)
                desktop.mark_native_dialog(); apply_update(app, wait)
                desktop.native_chooser(data_home)
                assert len(feed.requests) == count
                wait(lambda: app.js('return !!document.querySelector(".update-actions .primary:not(:disabled)")'), 'cancelamento do seletor')
                desktop.mark_native_dialog(); apply_update(app, wait)
                target = downloads / 'Entrelinhas teste.deb'
                desktop.native_chooser(data_home, target)
                wait(target.exists, 'pacote salvo e verificado', 30)
                assert hashlib.sha256(target.read_bytes()).digest() == hashlib.sha256(fixture.read_bytes()).digest()
                assert app.editor('return editor.getText()') == ''
                passed('cancelar seletor não baixa; confirmar salva .deb verificado sem instalar ou fechar o app')
                from update_checks import about
                for label, theme in (('Claro', 'light'), ('Escuro', 'dark'), ('Sépia Noturno', 'sepia')):
                    button(app, 'Aparência'); app.click(f'[aria-label="{label}"]'); button(app, 'Sobre')
                    app.screenshot(output / f'updates-{theme}.png')
                app.js('document.querySelector(".update-actions button:first-child").scrollIntoView({block:"center"})'); app.paint()
                app.click('.update-actions button:first-child')
                wait(lambda: app.js('return document.querySelectorAll("[role=dialog]").length') == 2, 'modal temático de consentimento')
                app.screenshot(output / 'update-permission.png'); button(app, 'Cancelar')
                passed('painel e consentimento nos temas claro, escuro e sépia')
                app.click('[aria-label="Fechar painel"]'); app.click('[aria-label="Fechar aplicativo"]')
                app.stop()
            except Exception:
                if app.session:
                    try:
                        app.screenshot(output / 'failure.png')
                        (output / 'failure.txt').write_text(app.js('return document.body.innerText'))
                    except Exception:
                        pass
                raise
            finally:
                app.stop(); driver.terminate(); driver.wait(timeout=10); log.close()
    (output / 'results.json').write_text(json.dumps({'passed': len(checks), 'checks': checks, 'platform': 'Ubuntu 26.10 / WebKitGTK', 'version': '1.2.0-rc.2', 'packageSha256': hashlib.sha256(package.read_bytes()).hexdigest()}, ensure_ascii=False, indent=2))
    print(f'{len(checks)} verificações de atualizações Linux passaram.', flush=True)


if __name__ == '__main__':
    main()
