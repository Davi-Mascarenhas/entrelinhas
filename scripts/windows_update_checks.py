import hashlib
import json
import os
from pathlib import Path
import stat
import time
from update_checks import Feed, common, search, button, apply_update


def exercise(app, folder, destination, fixtures, install, wait, passed):
    data = json.loads((fixtures / 'fixtures.json').read_text())
    install(fixtures / 'fixture-1.exe', destination)
    document = folder / 'Atualização com ação.md'
    document.write_text('# Atualização\n\nTexto original.', encoding='utf-8')
    original = document.read_bytes()
    with Feed(fixtures / 'fixture-2.exe', data['2']['signature'], data['2']['version'], 'windows-x86_64') as feed:
        os.environ['ENTRELINHAS_UPDATER_TEST_ENDPOINT'] = feed.url + '/manifest.json'
        os.environ['ENTRELINHAS_UPDATER_TEST_PUBKEY'] = (fixtures / 'test.key.pub').read_text().strip()
        app.start(launch_args=[str(document)])
        wait(lambda: app.editor('return editor.getText().startsWith("Atualização")'), 'documento da atualização')
        assert app.ipc('plugin:app|version') == data['1']['version']
        common(app, feed, wait, passed)
        for label, tampered, signature, version in (
            ('pacote adulterado', True, data['2']['signature'], data['2']['version']),
            ('chave desconhecida', False, data['wrongSignature'], data['2']['version']),
            ('versão adulterada no manifesto', False, data['2']['signature'], '1.2.0-rc.2.test.3'),
        ):
            feed.tampered, feed.signature, feed.version = tampered, signature, version
            search(app, wait)
            wait(lambda: app.js('return !!document.querySelector(".update-actions .primary:not(:disabled)")'), label)
            apply_update(app, wait)
            wait(lambda: app.js('return !!document.querySelector(".update-control [role=alert]")'), 'rejeitar ' + label)
            assert app.ipc('plugin:app|version') == data['1']['version']
            assert document.read_bytes() == original
            passed(label + ' rejeitado sem instalar nem fechar o aplicativo')
        feed.tampered = False; feed.signature = data['2']['signature']; feed.version = data['2']['version']
        search(app, wait)
        wait(lambda: app.js('return !!document.querySelector(".update-version")'), 'atualização válida')
        app.click('[aria-label="Fechar painel"]')
        app.editor('editor.commands.insertContent(" ATUALIZACAO SALVA");return true')
        app.reveal()
        app.click('[aria-label="Criar projeto"]')
        app.fill('.modal input[maxlength="120"]', 'Projeto preservado')
        app.click('.modal button[type="submit"]')
        project = wait(lambda: next((item for item in app.ipc('load_library')['projects'] if item['name'] == 'Projeto preservado'), None), 'criar projeto pelo aplicativo')
        wait(lambda: not app.js('return !!document.querySelector("[role=dialog]")'), 'fechar formulário de projeto')
        app.click('[aria-label="Projeto do documento atual"]')
        app.click(f'[role="option"][data-project-id="{project["id"]}"]')
        wait(lambda: any(item['path'].endswith(document.name) and item['projectId'] == project['id'] for item in app.ipc('load_library')['documents']), 'vincular projeto pela interface')
        from update_checks import about
        about(app)
        app.screenshot(app.output / 'update-available.png')
        apply_update(app, wait)
        wait(lambda: app.js('return !!document.querySelector(arguments[0])', '[aria-label="Salvar antes de atualizar?"]'), 'decisão sobre o rascunho')
        button(app, 'Cancelar')
        assert document.read_bytes() == original
        assert app.editor('return editor.getText().includes("ATUALIZACAO SALVA")')
        passed('cancelar atualização preserva rascunho, mesmo com confirmação comum desativada')
        document.chmod(stat.S_IREAD)
        try:
            apply_update(app, wait)
            wait(lambda: app.js('return !!document.querySelector(arguments[0])', '[aria-label="Salvar antes de atualizar?"]'), 'decisão de salvar')
            button(app, 'Salvar e continuar')
            wait(lambda: app.js('return document.body.innerText.includes("somente leitura")'), 'falha de salvamento')
            assert app.ipc('plugin:app|version') == data['1']['version']
            assert document.read_bytes() == original
            passed('falha ao salvar interrompe instalação e preserva texto em memória')
        finally:
            document.chmod(stat.S_IREAD | stat.S_IWRITE)
        before = app.ipc('load_library')
        apply_update(app, wait)
        wait(lambda: app.js('return !!document.querySelector(arguments[0])', '[aria-label="Salvar antes de atualizar?"]'), 'salvar para atualizar')
        button(app, 'Salvar e continuar')
        wait(lambda: app.application_process.poll() is not None, 'instalador assumir atualização', 45)
        app.stop()
        # O instalador reabre o próprio app, herdando a porta de automação de teste.
        app.attach(app.debug_port)
        assert app.ipc('plugin:app|version') == data['2']['version']
        after = app.ipc('load_library')
        assert after['preferences'] == before['preferences']
        assert after['projects'] == before['projects']
        references = lambda library: sorted((item['path'], item['title'], item['projectId']) for item in library['documents'])
        assert references(after) == references(before)
        assert 'ATUALIZACAO SALVA' in document.read_text(encoding='utf-8')
        assert app.editor('return editor.getText()') == ''
        app.screenshot(app.output / 'update-installed.png')
        passed('atualização assinada real reinicia na versão nova e preserva arquivos, projetos, referências e preferências')
        app.reveal(); app.click('[aria-label="Fechar aplicativo"]'); time.sleep(.5); app.stop()
        install(destination / 'uninstall.exe', uninstall=True)
        wait(lambda: not (destination / 'entrelinhas.exe').exists(), 'limpeza da instalação de teste', 30)
