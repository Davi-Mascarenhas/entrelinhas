"""Reproduz digitação com projetos abertos, sem gravar documentos pessoais."""

def exercise(app, output, wait, passed):
    preferences = app.ipc('load_library')['preferences']
    rect = app.call('/window/rect')
    original = app.editor('return editor.getJSON()')
    measurements = []

    def settings(section):
        app.reveal(); app.key(',', ctrl=True)
        wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'configurações do recuo')
        app.click(f'[data-section="{section}"]')

    def close():
        app.click('[aria-label="Fechar painel"]')
        app.paint()

    def toggle(name, value):
        if app.js('return document.querySelector(arguments[0]).checked', f'[data-preference="{name}"]') != value:
            app.click(f'[data-preference="{name}"]')

    def measure():
        app.stable_element('.editor-scroll:not(.inactive) .writing-paper')
        return app.js('const r=document.querySelector(".editor-scroll:not(.inactive) .writing-paper").getBoundingClientRect();return {left:r.left,width:r.width}')

    def same(actual, expected):
        assert abs(actual['left']-expected['left'])<1 and abs(actual['width']-expected['width'])<1, (actual, expected)

    for width, height in [(720, 480), (920, 640)]:
        app.call('/window/rect', {'width':width, 'height':height})
        for side in ['left', 'right']:
            for position in ['bottom', 'side']:
                settings('behavior'); toggle('autoImmersive', True); close()
                settings('appearance'); app.choose('Posição da navegação',side)
                app.click('[data-section=toolbar]'); app.click(f'[data-formatting-position={position}]'); toggle('zenHideFormatting',False); close()
                if app.js('return document.querySelector(".app").classList.contains("sidebar-hidden")'):
                    app.click('[aria-label="Mostrar navegação"]')
                app.editor('editor.commands.setContent(arguments[0]);editor.commands.focus("end");return true','<p>Um texto que reencontra seu espaço.</p><p>Projetos abertos, escrita tranquila.</p>')
                normal=measure()
                app.click('[aria-label="Ocultar navegação"]'); without_projects=measure()
                app.click('[aria-label="Mostrar navegação"]'); same(measure(),normal)
                app.screenshot(output/f'zen-layout-{width}-{side}-{position}-before.png')
                app.editor('editor.commands.focus("end");return true');app.paint();app.real_key('z')
                wait(lambda:app.js('return document.querySelector(".app").classList.contains("immersive")'),'digitação entra no Zen em janela reduzida')
                zen=measure();same(zen,without_projects)
                assert zen['width']>normal['width'],(normal,zen)
                assert abs(zen['left']+zen['width']/2-width/2)<1
                assert app.js('return document.querySelector(".sidebar").getBoundingClientRect().width')<1
                assert app.ipc('load_library')['preferences']['sidebarVisible'] is True
                document=app.editor('return editor.getJSON()')
                assert app.editor('return editor.getText().endsWith("z")')
                app.screenshot(output/f'zen-layout-{width}-{side}-{position}-zen.png')
                app.real_key('Escape');wait(lambda:not app.js('return document.querySelector(".app").classList.contains("immersive")'),'Esc restaura projetos')
                restored=measure();same(restored,normal)
                measurements.append({'windowWidth':width,'sidebar':side,'formatting':position,'normal':normal,'withoutProjects':without_projects,'zen':zen,'restored':restored})
                assert app.editor('return editor.getJSON()')==document
                app.screenshot(output/f'zen-layout-{width}-{side}-{position}-restored.png')
                app.real_key('Escape');wait(lambda:app.js('return document.querySelector(".app").classList.contains("immersive")'),'Esc também libera a coluna')
                same(measure(),without_projects)
                app.real_key('Escape');wait(lambda:not app.js('return document.querySelector(".app").classList.contains("immersive")'),'restaurar coluna pelo teclado')
                same(measure(),normal)
    settings('behavior');toggle('autoImmersive',preferences.get('autoImmersive',True));close()
    settings('appearance');app.choose('Posição da navegação',preferences.get('sidebarSide','left'))
    app.click('[data-section=toolbar]');app.click(f'[data-formatting-position={preferences.get("formattingPosition","bottom")}]');toggle('zenHideFormatting',preferences.get('zenHideFormatting',False));close()
    if not preferences.get('sidebarVisible',True):app.click('[aria-label="Ocultar navegação"]')
    app.call('/window/rect',rect)
    app.editor('editor.commands.setContent(arguments[0]);editor.commands.focus("end");return true',original);app.paint()
    import json
    (output/'zen-layout-results.json').write_text(json.dumps({'passed':len(measurements),'checks':measurements},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    passed('Zen libera a coluna dos projetos em oito combinações de janela/lado/ferramentas, por digitação e Esc; sair restaura posição, preferências e texto')
