"""Fluxos reais compartilhados por WebKitGTK e WebView2, em perfis descartáveis."""
import json
from pathlib import Path


def exercise(app, output, wait, passed):
    root = Path(__file__).resolve().parents[1]
    rows = json.loads((root / 'src/i18n/messages.json').read_text(encoding='utf-8'))
    translations = {row[0]: row for row in rows}
    original = app.editor('return editor.getJSON()')
    undo = app.editor('return editor.can().undo()')
    app.reveal()
    app.key(',', ctrl=True)
    wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'atalho de configurações')
    app.click('[data-section="language"]')
    for index, language in enumerate(['pt-BR', 'en', 'ja', 'zh-CN', 'de', 'pt-PT', 'es-419', 'es-ES', 'zh-TW']):
        app.language(language)
        wait(lambda: app.js('return document.documentElement.lang') == language, 'troca imediata de idioma')
        wait(lambda: app.ipc('load_library')['preferences'].get('language') == language, 'persistir idioma')
        assert app.js('return document.querySelector(".settings-nav [data-section=shortcuts]").textContent') == translations['Atalhos'][index]
        assert app.js('return document.querySelector(".settings-content h3").textContent') == translations['Escolha seu idioma.'][index]
        app.screenshot(output / f'language-{language}.png')
        app.click('[data-section="editor"]')
        assert translations['Margens no modo Zen'][index] in app.js('return document.querySelector(".settings-content").innerText')
        assert app.js('return !!document.querySelector(arguments[0])', '[aria-label="'+translations['Margem superior no modo Zen'][index]+'"]')
        if language in ['ja','zh-CN','zh-TW']:
            app.js('document.querySelector("[data-preference=zenTopMargin]").scrollIntoView({block:"center"})')
            app.screenshot(output/f'zen-settings-{language}.png')
        app.click('[data-section="about"]')
        about = app.js('return document.querySelector(".settings-content").innerText')
        assert translations['Por Davi Mascarenhas · Licença MIT'][index] in about
        assert translations['Procurar atualização'][index] in about
        assert 'Bit-Devy' not in about
        app.click('[data-section="language"]')
    assert app.editor('return editor.getJSON()') == original, 'Traduzir a interface não deve reescrever o documento.'
    assert app.editor('return editor.can().undo()') == undo, 'Trocar idioma deve preservar o histórico.'
    app.language('pt-BR')
    wait(lambda: app.ipc('load_library')['preferences'].get('language') == 'pt-BR', 'restaurar idioma de teste')
    passed('nove variantes em seis idiomas trocam imediatamente e persistem, com créditos/atualizações traduzidos e documento/histórico preservados')
    # Confirma que ambas as fontes locais carregam no motor real, sem depender do SO.
    for suffix, text in [('JP', '設定'), ('SC', '设置'), ('TC', '設定')]:
        loaded = app.call('/execute/async', {
            'script': 'const done=arguments[arguments.length-1];document.fonts.load(arguments[0],arguments[1]).then(fonts=>done(fonts.length>0)).catch(()=>done(false));',
            'args': [f'14px "Entrelinhas UI {suffix}"', text],
        })
        assert loaded, f'Fonte {suffix} não carregou.'
    passed('fontes japonesas e chinesas simplificadas/tradicionais carregam localmente no WebView')
    app.click('[data-section="shortcuts"]')
    app.click('[data-action="settings"]')
    wait(lambda: app.js('return !!document.querySelector("[data-shortcut-capture]")'), 'captura de atalho')
    def capture(key, ctrl=False, shift=False):
        return app.js('return document.querySelector(".shortcut-capture").dispatchEvent(new KeyboardEvent("keydown",{key:arguments[0],ctrlKey:arguments[1],shiftKey:arguments[2],bubbles:true,cancelable:true}))', key, ctrl, shift)
    capture('s', ctrl=True)
    assert app.js('return document.querySelector("[data-shortcut-capture] [role=alert]").textContent.includes("Salvar")')
    assert app.js('return document.querySelector("[data-shortcut-capture] button.primary").disabled')
    capture('K', ctrl=True, shift=True)
    assert app.js('return !document.querySelector("[data-shortcut-capture] button.primary").disabled')
    app.screenshot(output / 'shortcut-capture.png')
    app.click('[data-shortcut-capture] button.primary')
    wait(lambda: app.ipc('load_library')['preferences'].get('shortcuts', {}).get('settings') == 'Ctrl+Shift+K', 'salvar atalho personalizado')
    app.click('.modal-header [aria-label="Fechar painel"]')
    app.key('K', ctrl=True, shift=True)
    wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'abrir configurações com atalho personalizado')
    app.click('[data-section="shortcuts"]')
    app.click('[data-action="settings"]')
    capture('M', ctrl=True, shift=True)
    capture('Escape')
    wait(lambda: app.js('return !document.querySelector("[data-shortcut-capture]")'), 'cancelar captura com Esc')
    assert app.js('return !!document.querySelector(".settings-layout")'), 'Esc deve fechar apenas a captura.'
    assert app.ipc('load_library')['preferences']['shortcuts']['settings'] == 'Ctrl+Shift+K'
    app.click('[data-action="settings"]')
    capture(',', ctrl=True)
    app.click('[data-shortcut-capture] button.primary')
    wait(lambda: app.ipc('load_library')['preferences']['shortcuts']['settings'] == 'Ctrl+,', 'restaurar atalho de configurações')
    app.click('[data-section="behavior"]')
    assert 'Modo Zen automático' in app.js('return document.querySelector(".settings-content").innerText')
    app.click('.modal-header [aria-label="Fechar painel"]')
    assert app.editor('return editor.getJSON()') == original
    passed('atalho de configurações, captura temática, conflito, salvar/cancelar, nova combinação e nome Modo Zen no aplicativo real')
