#!/usr/bin/env python3
"""Valida instalador e WebView2 no runner Windows descartável, sem alterar padrões."""
import argparse
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import time
import urllib.request
import winreg
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('desktop_tests', ROOT / 'scripts/test-desktop.py')
desktop_tests = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop_tests)
wait = desktop_tests.wait


class WindowsDesktop(desktop_tests.Desktop):
    def start(self, launch_args=None):
        debug_port = desktop_tests.free_port()
        self.application_log = (self.output / 'application.log').open('a', encoding='utf-8')
        self.application_process = subprocess.Popen([str(self.application), *(launch_args or [])], env={
            **os.environ, 'TAURI_WEBVIEW_AUTOMATION': 'true',
            'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS': f'--remote-debugging-port={debug_port}',
        }, stdout=self.application_log, stderr=self.application_log)
        wait(lambda: urllib.request.urlopen(f'http://127.0.0.1:{debug_port}/json/version', timeout=1).status == 200, 'WebView2 do aplicativo instalado', 60)
        options = {'debuggerAddress': f'127.0.0.1:{debug_port}'}
        result = self.request('/session', {'capabilities': {'alwaysMatch': {
            'browserName': 'webview2', 'ms:edgeChromium': True, 'ms:edgeOptions': options,
        }}}, timeout=120)
        self.session = result['sessionId']
        self.call('/timeouts', {'implicit': 3000})
        wait(lambda: self.js('return !!document.querySelector(".tiptap")?.editor'), 'editor WebView2', 40)
        preferences = self.ipc('load_library')['preferences']
        if not preferences.get('onboardingCompleted', preferences.get('themeChosen', False)):
            wait(lambda: self.js('return !!document.querySelector(".welcome-modal")'), 'boas-vindas')
            self.click('.welcome-actions .primary')
            self.click('[aria-label="Usar tema Sépia Noturno"]')
            self.click('.welcome-actions .primary')
            wait(lambda: self.js('return document.querySelector(".default-app").getAttribute("aria-busy")') == 'false', 'padrões do Windows')
            assert 'Abrir configurações do Windows' in self.js('return document.querySelector(".default-app").innerText')
            self.click('.welcome-actions button:last-child')
            wait(lambda: self.ipc('load_library')['preferences'].get('onboardingCompleted'), 'concluir apresentação')

    def click(self, css):
        self.call('/element/' + self.element(css) + '/click', {})

    def key(self, key, ctrl=False, shift=False):
        self.js('window.dispatchEvent(new KeyboardEvent("keydown",{key:arguments[0],ctrlKey:arguments[1],shiftKey:arguments[2],bubbles:true,cancelable:true}))', key, ctrl, shift)

    def stop(self):
        super().stop()
        process = getattr(self, 'application_process', None)
        if process and process.poll() is None:
            process.terminate()
            process.wait(timeout=10)
        if getattr(self, 'application_log', None):
            self.application_log.close()


def read_registry(path, name=''):
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, path) as key:
            return winreg.QueryValueEx(key, name)[0]
    except FileNotFoundError:
        return None


def defaults_snapshot():
    return {ext: {
        'extension': read_registry('Software\\Classes\\' + ext),
        'choice': read_registry('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\' + ext + '\\UserChoice', 'ProgId'),
    } for ext in ('.md', '.markdown', '.txt')}


def installer_run(executable, directory=None, uninstall=False):
    # NSIS exige /D como último argumento, sem aspas, mesmo com espaços.
    command = f'"{executable}" /S'
    if directory is not None:
        command += f' /D={directory}'
    result = subprocess.run(command, timeout=240, check=False)
    if result.returncode not in (0, 3010):
        raise AssertionError(f'Instalador retornou {result.returncode}')


def webview_driver(output):
    versions = []
    for root in (Path(os.environ['ProgramFiles(x86)']) / 'Microsoft/EdgeWebView/Application',
                 Path(os.environ['LOCALAPPDATA']) / 'Microsoft/EdgeWebView/Application'):
        if root.exists():
            versions += [path.name for path in root.iterdir() if (path / 'msedgewebview2.exe').exists()]
    assert versions, 'WebView2 não foi instalado/encontrado.'
    version = max(versions, key=lambda value: tuple(map(int, value.split('.'))))
    archive = output / 'edgedriver.zip'
    urllib.request.urlretrieve(f'https://msedgedriver.microsoft.com/{version}/edgedriver_win64.zip', archive)
    with zipfile.ZipFile(archive) as bundle:
        bundle.extractall(output / 'driver')
    return output / 'driver/msedgedriver.exe', version


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--installer', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/windows')
    args = parser.parse_args()
    assert platform.system() == 'Windows'
    assert not ctypes.windll.shell32.IsUserAnAdmin(), 'A validação precisa executar como usuário comum.'
    Path(os.environ['TEMP']).mkdir(parents=True, exist_ok=True)
    assert os.environ.get('GITHUB_ACTIONS') == 'true', 'Este roteiro só pode rodar no runner descartável do GitHub Actions.'
    assert read_registry('Software\\RegisteredApplications', 'Entrelinhas') is None, 'Não execute sobre uma instalação existente.'
    assert not (Path(os.environ['APPDATA']) / 'io.github.bitdevy.entrelinhas/library.sqlite3').exists(), 'O perfil de teste precisa estar vazio.'
    output = args.output.resolve(); output.mkdir(parents=True, exist_ok=True)
    installer = args.installer.resolve()
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    baseline = defaults_snapshot()
    results = []
    def passed(label):
        results.append(label); print('OK · ' + label, flush=True)
    subprocess.run(['pwsh', '-NoProfile', '-File', str(ROOT / 'scripts/test-windows-wizard.ps1'),
                    '-Installer', str(installer), '-OutputDirectory', str(output)], check=True, timeout=60)
    assert read_registry('Software\\RegisteredApplications', 'Entrelinhas') is None
    passed('wizard em português com identidade visual, páginas de boas-vindas/pasta e cancelamento')
    destination = Path(os.environ['LOCALAPPDATA']) / 'Entrelinhas teste ação'
    installer_run(installer, destination)
    executable = destination / 'entrelinhas.exe'
    assert executable.exists()
    personal_in_install = destination / 'Meu texto pessoal.txt'
    personal_in_install.write_text('Documento preservado.', encoding='utf-8')
    assert read_registry('Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Entrelinhas', 'InstallLocation').strip('"').rstrip('\\') == str(destination)
    assert read_registry('Software\\RegisteredApplications', 'Entrelinhas') == 'Software\\Entrelinhas\\Capabilities'
    for ext in ('.md', '.markdown', '.txt'):
        progid = 'Entrelinhas.Text' if ext == '.txt' else 'Entrelinhas.Markdown'
        assert read_registry('Software\\Classes\\' + ext + '\\OpenWithProgids', progid) == ''
        assert read_registry('Software\\Classes\\' + progid + '\\shell\\open\\command') == f'"{executable}" "%1"'
    assert defaults_snapshot() == baseline
    shortcut = Path(os.environ['APPDATA']) / 'Microsoft/Windows/Start Menu/Programs/Entrelinhas.lnk'
    assert shortcut.exists(), shortcut
    passed('instalação por usuário, atalho e Abrir com sem modificar aplicativos padrão')
    driver, runtime_version = webview_driver(output)
    port = desktop_tests.free_port()
    environment = {**os.environ, 'TAURI_WEBVIEW_AUTOMATION': 'true'}
    log = (output / 'webdriver.log').open('w', encoding='utf-8')
    process = subprocess.Popen([str(driver), f'--port={port}', '--allowed-ips=127.0.0.1', '--verbose'], env=environment, stdout=log, stderr=log)
    app = WindowsDesktop(f'http://127.0.0.1:{port}', executable)
    app.output = output
    with tempfile.TemporaryDirectory(prefix='Entrelinhas ação ') as temporary:
        folder = Path(temporary)
        md = folder / 'Ideias 日本語.md'; txt = folder / "Texto com 'aspas'.txt"
        md.write_text('# Olá Windows\n\nDocumento de teste.', encoding='utf-8')
        txt.write_text('**Texto literal** 日本語', encoding='utf-8')
        try:
            wait(lambda: urllib.request.urlopen(f'http://127.0.0.1:{port}/status', timeout=1).status == 200, 'Edge WebDriver')
            app.start(launch_args=[str(md)])
            assert app.ipc('plugin:app|version') == version
            assert not app.js('return location.origin.includes("1420")')
            wait(lambda: app.editor('return editor.getText().startsWith("Olá Windows")'), 'abrir Markdown recebido ao iniciar')
            assert app.editor('return editor.getHTML().includes("<h1")')
            status = app.ipc('default_app_status')
            assert status['registered'] and status['requiresSettings']
            assert defaults_snapshot() == baseline
            app.editor('editor.commands.insertContent(" SALVO MANUALMENTE");return true')
            app.key('s', ctrl=True)
            wait(lambda: 'SALVO MANUALMENTE' in md.read_text(encoding='utf-8'), 'salvamento manual no Windows')
            saved = md.read_bytes()
            passed('WebView2 de produção, primeira abertura, leitura Markdown e salvamento manual UTF-8')
            app.editor('editor.commands.insertContent(" RASCUNHO_EM_MEMÓRIA");return true')
            subprocess.run([str(executable), str(txt)], check=True, timeout=20)
            wait(lambda: app.editor('return editor.getText()') == txt.read_text(encoding='utf-8'), 'TXT na mesma janela')
            assert app.js('return document.querySelectorAll(".tiptap").length') == 2
            assert app.js('return [...document.querySelectorAll(".tiptap")].some(node=>node.editor.getText().includes("RASCUNHO_EM_MEMÓRIA"))')
            assert md.read_bytes() == saved
            subprocess.run([str(executable), str(md)], check=True, timeout=20)
            wait(lambda: app.editor('return editor.getText().includes("RASCUNHO_EM_MEMÓRIA")'), 'ativar Markdown sem duplicar')
            assert app.js('return document.querySelectorAll(".tiptap").length') == 2
            passed('instância única, abertura de TXT, rascunho preservado e nenhuma guia duplicada')
            app.reveal()
            app.double_click('.window-title')
            app.fill('[aria-label="Título do documento"]', 'Título ação 日本語')
            app.click('[role=dialog] button[type=submit]')
            renamed = md.with_name('Título ação 日本語.md')
            wait(renamed.exists, 'renomear arquivo com Unicode')
            wait(lambda: not app.js('return !!document.querySelector(arguments[0])', '[aria-label="Título do documento"]'), 'fechar título')
            assert renamed.read_bytes() == saved and not md.exists()
            assert app.editor('return editor.getText().includes("RASCUNHO_EM_MEMÓRIA")')
            passed('renomeação nativa preserva conteúdo no disco e alterações em memória')
            app.double_click('.titlebar', x=app.js('return -Math.round(innerWidth*.3)'))
            wait(lambda: app.ipc('plugin:window|is_maximized', label='main'), 'maximizar pela barra')
            app.double_click('.titlebar', x=app.js('return Math.round(innerWidth*.3)'))
            wait(lambda: not app.ipc('plugin:window|is_maximized', label='main'), 'restaurar pela barra')
            app.click('[aria-label="Configurações"]')
            for theme in ('Claro', 'Escuro', 'Sépia Noturno'):
                app.click(f'[aria-label="{theme}"]')
                app.screenshot(output / ('theme-' + {'Claro':'light','Escuro':'dark','Sépia Noturno':'sepia'}[theme] + '.png'))
            app.js('return [...document.querySelectorAll(".settings-nav button")].find(button=>button.innerText==="Arquivos").click()')
            wait(lambda: app.js('return document.querySelector(".default-app button").innerText') == 'Abrir configurações do Windows', 'opção de padrões nas configurações')
            app.screenshot(output / 'windows-defaults.png')
            app.click('[aria-label="Fechar painel"]')
            passed('maximização pelo duplo clique, três temas e menu permanente de padrões do Windows')
            app.click('[aria-label="Fechar aplicativo"]'); time.sleep(.5); app.stop()
            app.start()
            assert app.editor('return editor.getText()') == ''
            assert app.js('return document.documentElement.dataset.theme') == 'sepia'
            passed('preferências persistem; rascunhos não são recuperados ao reabrir')
            app.click('[aria-label="Fechar aplicativo"]'); time.sleep(.5); app.stop()
            database = Path(os.environ['APPDATA']) / 'io.github.bitdevy.entrelinhas/library.sqlite3'
            assert database.exists(), database
            library_hash = hashlib.sha256(database.read_bytes()).hexdigest()
            installer_run(installer, destination)
            assert hashlib.sha256(database.read_bytes()).hexdigest() == library_hash
            assert renamed.read_bytes() == saved and txt.exists() and personal_in_install.read_text(encoding='utf-8') == 'Documento preservado.'
            assert defaults_snapshot() == baseline
            passed('reinstalação/atualização preserva biblioteca, preferências, documentos e padrões')
            installer_run(destination / 'uninstall.exe', uninstall=True)
            wait(lambda: not executable.exists(), 'desinstalar executável', 30)
            wait(lambda: read_registry('Software\\RegisteredApplications', 'Entrelinhas') is None and not shortcut.exists(), 'remover registro e atalhos', 30)
            assert read_registry('Software\\RegisteredApplications', 'Entrelinhas') is None
            assert shortcut.exists() is False
            assert database.exists() and hashlib.sha256(database.read_bytes()).hexdigest() == library_hash
            assert renamed.read_bytes() == saved and txt.exists() and personal_in_install.read_text(encoding='utf-8') == 'Documento preservado.'
            assert defaults_snapshot() == baseline
            passed('desinstalação remove integração e atalhos e preserva biblioteca e arquivos pessoais')
        except Exception:
            if app.session:
                try:
                    app.screenshot(output / 'failure.png')
                    (output / 'failure.json').write_text(json.dumps({
                        'interface': app.js('return document.body.innerText'),
                        'markdown': {p.name: p.read_text(encoding='utf-8') for p in folder.glob('*.md')},
                    }, ensure_ascii=False, indent=2), encoding='utf-8')
                except Exception:
                    pass
            raise
        finally:
            app.stop(); process.terminate(); process.wait(timeout=10); log.close()
    (output / 'results.json').write_text(json.dumps({
        'version': version, 'platform': platform.platform(), 'webview2': runtime_version,
        'passed': len(results), 'checks': results,
        'installerSha256': hashlib.sha256(installer.read_bytes()).hexdigest(),
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(results)} verificações Windows passaram.', flush=True)


if __name__ == '__main__':
    main()
