#!/usr/bin/env python3
"""Ctrl+clique até o navegador do SO, com navegador falso e XDG descartável."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('desktop', ROOT / 'scripts/test-desktop.py')
desktop = importlib.util.module_from_spec(spec); spec.loader.exec_module(desktop)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--binary', required=True)
    args = parser.parse_args()
    output = ROOT / 'artifacts/linux-link-tests'; output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='entrelinhas-links-') as temporary:
        folder = Path(temporary)
        data, config = folder/'data', folder/'config'
        applications = data/'applications'; applications.mkdir(parents=True); config.mkdir()
        received = folder/'browser-requests.jsonl'
        browser = folder/'browser.py'
        browser.write_text('import json,sys\nfrom pathlib import Path\nwith Path('+repr(str(received))+').open("a") as output: output.write(json.dumps(sys.argv[1])+"\\n")\n')
        (applications/'entrelinhas-test-browser.desktop').write_text(f'[Desktop Entry]\nType=Application\nName=Entrelinhas test browser\nExec=/usr/bin/python3 "{browser}" %u\nTerminal=false\nNoDisplay=true\nMimeType=x-scheme-handler/http;x-scheme-handler/https;\n')
        (config/'mimeapps.list').write_text('[Default Applications]\nx-scheme-handler/http=entrelinhas-test-browser.desktop\nx-scheme-handler/https=entrelinhas-test-browser.desktop\n')
        port, native_port = desktop.free_port(), desktop.free_port()
        environment = {**os.environ, 'XDG_DATA_HOME':str(data), 'XDG_CONFIG_HOME':str(config)}
        log = (output/'driver.log').open('w')
        driver = subprocess.Popen([str(Path.home()/'.cargo/bin/tauri-driver'),'--port',str(port),'--native-port',str(native_port),'--native-driver',os.environ['WEBKIT_WEBDRIVER']], env=environment, stdout=log, stderr=log)
        app = desktop.Desktop(f'http://127.0.0.1:{port}', Path(args.binary).resolve())
        try:
            desktop.wait(lambda: urllib.request.urlopen(f'http://127.0.0.1:{port}/status').status == 200, 'WebDriver de links')
            app.start()
            url = 'https://example.invalid/caderno?q=1#parte'
            app.editor('editor.commands.setContent(arguments[0]);editor.commands.focus("end");return true', '<p>Leia o <a href="'+url+'">caderno</a>.</p>')
            app.paint(); before = app.editor('return editor.getJSON()')
            app.click('.tiptap a')
            desktop.wait(lambda: app.js('return !!document.querySelector(".link-preview")'), 'prévia local')
            assert not received.exists(), 'Clique simples não deve abrir o navegador.'
            opened_at = app.js('return Date.now()')
            app.ctrl_click('.tiptap a')
            desktop.wait(received.exists, 'navegador padrão recebe URL pelo Gio')
            assert json.loads(received.read_text().splitlines()[0]) == url
            assert app.editor('return editor.getJSON()') == before
            opened_at = app.js('return Date.now()')
            desktop.wait(lambda: app.js('return Date.now()') > opened_at + 2100, 'intervalo da proteção contra cliques repetidos')
            app.click('.tiptap a'); app.click('.link-preview-actions button')
            desktop.wait(lambda: len(received.read_text().splitlines()) == 2, 'botão abrir usa a mesma integração do SO')
            app.screenshot(output/'link-native.png')
            result = {'passed':3,'version':app.ipc('plugin:app|version'),'binary':str(app.application),'checks':['clique simples mostra prévia sem iniciar navegador','Ctrl+clique real passa URL ao navegador padrão via Gio sem alterar documento','botão Abrir link também usa navegador padrão'],'networkAccess':False}
            (output/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
            print('3 verificações reais da abertura de links pelo SO passaram.', flush=True)
        except Exception:
            if app.session:
                app.screenshot(output/'failure.png')
            raise
        finally:
            app.stop(); driver.terminate(); driver.wait(timeout=10); log.close()


if __name__ == '__main__':
    main()
