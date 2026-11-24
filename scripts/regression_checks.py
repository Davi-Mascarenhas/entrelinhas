"""Regressões 2.3 com foco real, ponteiro, gestos e janelas pequenas nos dois SOs."""


def exercise(app, output, wait, passed):
    original = app.editor('return editor.getJSON()')
    preferences = app.ipc('load_library')['preferences']
    rect = app.call('/window/rect')

    def settings(section):
        app.reveal(); app.key(',', ctrl=True)
        wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'configurações da regressão')
        app.click(f'[data-section="{section}"]')

    def close_settings():
        app.click('.modal-header [aria-label="Fechar painel"]')
        app.paint()

    def toggle(name, value):
        if app.js('return document.querySelector(arguments[0]).checked', f'[data-preference="{name}"]') != value:
            app.click(f'[data-preference="{name}"]')

    def zen():
        return app.js('return document.querySelector(".app").classList.contains("immersive")')

    def content(html, position='end'):
        app.editor('editor.commands.setContent(arguments[0]);editor.commands.focus(arguments[1]);return true', html, position)
        app.paint()

    def zoom():
        return app.js('return parseInt(document.querySelector(".status-right button").textContent)')

    settings('behavior'); toggle('autoImmersive', False); close_settings()
    settings('toolbar'); toggle('zenHideFormatting', False); app.click('[data-formatting-position=bottom]'); close_settings()
    app.js('window.regressionKeys=[];window.addEventListener("keydown",e=>{if(e.key==="Escape")window.regressionKeys.push(e.isTrusted)},true)')
    for html in (
        '<p>Parágrafo com texto</p>',
        '<ul><li><p>Item de lista</p></li></ul>',
        '<ul data-type="taskList"><li data-type="taskItem"><label><input type="checkbox"></label><div><p>Tarefa</p></div></li></ul>',
        '<aside data-type="callout"><p>Informação importante</p></aside>',
        '<details open><summary>Título</summary><div data-type="detailsContent"><p>Conteúdo recolhível</p></div></details>',
        '<table><tbody><tr><td><p>Célula</p></td></tr></tbody></table>',
    ):
        content(html)
        app.hover('.editor-scroll:not(.inactive)')
        before = app.editor('return editor.getJSON()')
        for expected in (True, False, True, False):
            app.real_key('Escape')
            wait(lambda: zen() == expected, 'Esc real alterna Zen dentro de bloco')
            app.paint()
        assert app.editor('return editor.getJSON()') == before
    assert all(app.js('return window.regressionKeys'))
    passed('24 Esc reais dentro de parágrafo, listas, tarefa, caixa, recolhível e tabela alternam Zen sem mudar o texto')

    content('<p>Texto para procurar</p>')
    app.real_key('f', ctrl=True)
    wait(lambda: app.js('return !!document.querySelector(".find-bar")'), 'busca pelo teclado real')
    app.real_key('Escape'); wait(lambda: not app.js('return !!document.querySelector(".find-bar")'), 'primeiro Esc fecha busca')
    assert not zen()
    app.real_key('Escape'); wait(zen, 'segundo Esc entra no Zen')
    app.real_key('Escape'); wait(lambda: not zen(), 'terceiro Esc sai do Zen')
    content('<p>/tabela</p>'); wait(lambda: app.js('return !!document.querySelector(".slash-menu")'), 'menu barra')
    app.real_key('Escape'); wait(lambda: not app.js('return !!document.querySelector(".slash-menu")'), 'Esc fecha comandos')
    assert not zen()
    assert app.editor('return editor.getText()') == '/tabela'
    passed('busca e menu de comandos recebem Esc antes do Zen; nenhum comando é executado ao cancelar')

    content('<p>Antes palavra depois</p>')
    if not app.js('return !!document.querySelector(".formatting")'):
        app.click('[aria-label="Ferramentas de formatação"]')
    app.editor('editor.chain().setTextSelection({from:7,to:14}).focus().run();return true'); app.paint()
    app.click('[aria-label="Inserir link"]')
    wait(lambda: app.js('return !!document.querySelector(".modal-body input[type=text]")'), 'editar endereço')
    app.fill('.modal-body input[type=text]', 'docs.example.com/caderno')
    app.click('.modal button[type=submit]')
    wait(lambda: not app.js('return !!document.querySelector(".modal")'), 'aplicar endereço sem protocolo')
    assert app.editor('const a=editor.view.dom.querySelector("a");return a?.textContent==="palavra" && a.getAttribute("href")==="https://docs.example.com/caderno"')
    linked = app.editor('return editor.getJSON()')
    # O comando Tauri é imutável em produção. Interceptamos somente o
    # transporte deste comando para testar Ctrl+clique sem abrir sites reais.
    app.js('window.originalLinkFetch=window.fetch;window.openedLinks=[];window.fetch=(url,options)=>{if(String(url)===window.__TAURI_INTERNALS__.convertFileSrc("open_link","ipc")){window.openedLinks.push(JSON.parse(options.body).href);return Promise.resolve(new Response("null",{headers:{"Tauri-Response":"ok","Content-Type":"application/json"}}))}return window.originalLinkFetch(url,options)}')
    try:
        app.hover('.tiptap a')
        wait(lambda: app.js('return !!document.querySelector(".link-preview")'), 'prévia ao passar mouse')
        assert 'https://docs.example.com/caderno' in app.js('return document.querySelector(".link-preview").innerText')
        assert app.js('return window.openedLinks.length') == 0
        app.screenshot(output/'regression-link-preview.png')
        app.real_key('Escape'); wait(lambda: not app.js('return !!document.querySelector(".link-preview")'), 'Esc fecha apenas prévia')
        assert not zen()
        app.click('.tiptap a'); wait(lambda: app.js('return !!document.querySelector(".link-preview")'), 'clique simples mostra prévia')
        assert app.js('return window.openedLinks.length') == 0
        sent_at = app.js('return Date.now()')
        link_selection = app.editor('return editor.state.selection.toJSON()')
        app.ctrl_click('.tiptap a')
        wait(lambda: app.js('return window.openedLinks') == ['https://docs.example.com/caderno'], 'Ctrl+clique pede navegador padrão')
        assert app.editor('return editor.getJSON()') == linked
        assert app.editor('return editor.state.selection.toJSON()') == link_selection, 'Ctrl+clique não deve selecionar o parágrafo.'
        wait(lambda: app.js('return document.querySelector(".toast")?.textContent.includes("Link enviado")'), 'confirmação de envio ao navegador')
        app.real_key('Escape'); wait(zen, 'Zen antes de repetir link')
        app.ctrl_click('.tiptap a')
        assert app.js('return window.openedLinks.length') == 1
        wait(lambda: app.js('const t=document.querySelector(".toast");return t?.textContent.includes("já foi enviado")&&getComputedStyle(t).visibility==="visible"&&getComputedStyle(t).opacity==="1"'), 'confirmação visível também no Zen')
        app.screenshot(output/'link-feedback-zen.png')
        app.real_key('Escape'); wait(lambda: not zen(), 'voltar do Zen após aviso de link')
        app.click('.tiptap a'); app.click('.link-preview-actions button')
        assert app.js('return window.openedLinks.length') == 1, 'Cliques seguidos não devem abrir o link várias vezes.'
        sent_at = app.js('return Date.now()')
        wait(lambda: app.js('return Date.now()') > sent_at + 2100, 'intervalo para nova abertura intencional')
        app.click('.tiptap a'); app.click('.link-preview-actions button')
        wait(lambda: app.js('return window.openedLinks.length') == 2, 'botão abrir também pede navegador')
    finally:
        app.js('window.fetch=window.originalLinkFetch;delete window.originalLinkFetch')
    try:
        app.ipc('open_link', href='javascript:alert(1)')
    except RuntimeError as error:
        assert 'link' in str(error)
    else:
        raise AssertionError('O backend aceitou um link executável.')
    passed('seleção preservada, domínio sem HTTPS, prévia por mouse/clique e Ctrl+clique real sem navegação acidental')

    content('<p>Texto normal <span style="font-size:24px">Texto com tamanho próprio</span></p>')
    app.real_key('0', ctrl=True); wait(lambda: zoom() == 100, 'resetar zoom')
    control = app.js('return document.querySelector(".document-toolbar").getBoundingClientRect().height')
    for expected in range(110, 201, 10):
        app.click('[aria-label="Alterar zoom"]'); wait(lambda: zoom() == expected, 'botão até 200%')
    assert app.editor('return Math.round(parseFloat(getComputedStyle(editor.view.dom.querySelector("span")).fontSize))') == 48
    assert app.js('return document.querySelector(".document-toolbar").getBoundingClientRect().height') == control
    app.screenshot(output/'regression-zoom-200.png')
    app.click('[aria-label="Alterar zoom"]'); wait(lambda: zoom() == 100, 'ciclo depois de 200%')
    app.hover('.editor-scroll:not(.inactive)')
    app.js('const n=document.querySelector(".editor-scroll:not(.inactive)");window.zoomEvents=[];n.addEventListener("wheel",e=>window.zoomEvents.push({trusted:e.isTrusted,ctrl:e.ctrlKey,prevented:e.defaultPrevented}))')
    app.real_wheel('.editor-scroll:not(.inactive)', -120, ctrl=True)
    wait(lambda: zoom() == 110, 'Ctrl e roda reais ampliam texto')
    assert app.js('return window.zoomEvents.some(e=>e.trusted&&e.prevented)')
    app.real_wheel('.editor-scroll:not(.inactive)', 120, ctrl=True)
    wait(lambda: zoom() == 100, 'Ctrl e roda reais reduzem texto')
    # WheelEvent permite verificar a rota comum de mouse e pinch também nos
    # drivers WebKit que ainda não implementam a fonte W3C "wheel".
    def wheel(delta, ctrl=True, mode=0):
        app.js('const n=document.querySelector(".editor-scroll:not(.inactive)"),r=n.getBoundingClientRect();n.dispatchEvent(new WheelEvent("wheel",{deltaY:arguments[0],ctrlKey:arguments[1],deltaMode:arguments[2],bubbles:true,cancelable:true,clientX:r.left+r.width/2,clientY:r.top+40}))', delta, ctrl, mode)
    wheel(-120, False); assert zoom() == 100
    wheel(-120); wait(lambda: zoom() == 110, 'Ctrl+wheel amplia só o texto')
    for _ in range(15): wheel(-120)
    wait(lambda: zoom() == 200, 'wheel limita em 200')
    for _ in range(20): wheel(120)
    wait(lambda: zoom() == 50, 'wheel limita em 50')
    app.editor('editor.commands.focus("end");return true'); app.real_key('0', ctrl=True)
    for _ in range(10): wheel(-.5)
    wait(lambda: zoom() > 100, 'pinch acumula deltas pequenos')
    app.js('const n=document.querySelector(".editor-scroll:not(.inactive)");for(const [type,scale] of [["gesturestart",1],["gesturechange",1.5],["gestureend",1.5]]){const e=new Event(type,{cancelable:true});Object.assign(e,{scale,clientX:innerWidth/2,clientY:200});n.dispatchEvent(e)}')
    wait(lambda: zoom() > 150, 'pinch WebKit amplia texto')
    app.editor('editor.commands.focus("end");return true'); app.real_key('0', ctrl=True); wait(lambda: zoom() == 100, 'reset de zoom após pinch')
    assert app.js('return document.querySelector(".document-toolbar").getBoundingClientRect().height') == control
    passed('zoom 50–200 por botão, Ctrl+roda reais e eventos de pinch; tamanho explícito acompanha zoom e interface mantém tamanho')

    content('<p>Teste de barra em janela pequena.</p>')
    if not app.js('return !!document.querySelector(".formatting")'):
        app.click('[aria-label="Ferramentas de formatação"]')
    for theme, label in [('light', 'Claro'), ('dark', 'Escuro'), ('sepia', 'Sépia Noturno')]:
        for position in ('bottom', 'side'):
            for width, height, side in [(1180, 780, 'left'), (900, 600, 'right'), (720, 480, 'left')]:
                app.call('/window/rect', {'width': width, 'height': height})
                wait(lambda: app.js('return innerWidth') == width, 'redimensionar para matriz')
                settings('appearance'); app.click(f'[aria-label="{label}"]'); app.choose('Posição da navegação', side)
                app.click('[data-section=toolbar]'); app.click(f'[data-formatting-position={position}]')
                assert app.js('return document.querySelectorAll(".toolbar-choices > button").length') == 2
                if width == 720:
                    app.screenshot(output/f'regression-settings-{theme}-{position}.png')
                close_settings(); app.paint()
                metrics = app.js('const t=document.querySelector(".formatting"),r=t.getBoundingClientRect(),d=document.querySelector(".formatting-dock").getBoundingClientRect(),s=document.querySelector(".sidebar-bottom").getBoundingClientRect();return {r:r.toJSON(),dock:d.toJSON(),w:innerWidth,h:innerHeight,scroll:t.scrollHeight>t.clientHeight,overflow:getComputedStyle(t).overflowY,color:getComputedStyle(t).scrollbarColor,settings:s.toJSON(),centers:[...t.querySelectorAll(".icon-button")].map(n=>{const b=n.getBoundingClientRect();return b.top+b.height/2})}')
                assert app.js('const a=document.querySelector(".sidebar").getBoundingClientRect(),s=document.querySelector(".statusbar").getBoundingClientRect();return a.bottom===innerHeight&&(document.querySelector(".app").classList.contains("sidebar-right")?s.right<=a.left+1:s.left>=a.right-1)'), 'O rodapé pertence ao editor e os projetos chegam ao fim da janela.'
                r = metrics['r']
                assert r['left'] >= 0 and r['right'] <= width and r['top'] >= 0 and r['bottom'] <= height-30, metrics
                assert metrics['settings']['bottom'] <= height, metrics
                if position == 'bottom':
                    assert abs(r['left']+r['width']/2-width/2) < 1, metrics
                    assert max(metrics['centers'])-min(metrics['centers']) < 1, metrics
                    assert r['height'] <= 40, metrics
                    assert app.js('const t=document.querySelector(".formatting"),s=getComputedStyle(t),r=t.getBoundingClientRect(),probe=document.createElement("span");probe.style.color=getComputedStyle(t).getPropertyValue("--surface").trim();document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return s.backgroundColor===color&&s.boxShadow==="none"&&[...t.querySelectorAll(":scope > button, :scope > button .select-label, :scope > button svg")].filter(n=>n.getClientRects().length).every(n=>{const b=n.getBoundingClientRect();return Math.abs(b.top+b.height/2-r.top-r.height/2)<.75})'), 'A barra inferior deve ter fundo opaco no tema atual para cobrir a lateral sem deslocar os controles.'
                    assert app.js('const r=document.querySelector(".formatting").getBoundingClientRect(),label=document.querySelector(".sidebar-bottom .nav-button span").getBoundingClientRect();return r.bottom<=label.top+.5'), 'O fundo da barra não deve encobrir o texto de Configurações.'
                    app.click('[aria-label="Ocultar navegação"]'); app.paint()
                    assert app.js('const r=document.querySelector(".formatting").getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)<1')
                    app.click('[aria-label="Mostrar navegação"]'); app.paint()
                else:
                    assert app.js('return [...document.querySelectorAll(".formatting .select-trigger")].every(b=>{const r=b.getBoundingClientRect();return [...b.querySelectorAll("svg")].every(n=>{const s=n.getBoundingClientRect();return s.left>=r.left&&s.right<=r.right&&s.top>=r.top&&s.bottom<=r.bottom})})'), 'Ícones laterais devem caber inteiros nos seletores.'
                    assert (side == 'left' and metrics['dock']['left'] > width-80) or (side == 'right' and metrics['dock']['right'] < 80), metrics
                    if height == 480:
                        assert metrics['scroll'] and metrics['overflow'] == 'auto', metrics
                        assert app.js('const t=document.querySelector(".formatting"),thumb=getComputedStyle(t,"::-webkit-scrollbar-thumb"),button=getComputedStyle(t,"::-webkit-scrollbar-button");return thumb.backgroundColor===getComputedStyle(t.querySelector(".tool-divider")).backgroundColor&&button.display==="none"'), 'A barra deve usar a cor do app e esconder setas do sistema.'
                app.js('document.querySelector(".formatting").lastElementChild.scrollIntoView({block:"nearest",inline:"nearest"})'); app.paint()
                assert app.js('const t=document.querySelector(".formatting"),r=t.getBoundingClientRect(),b=t.lastElementChild.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1')
                app.js('document.querySelector(".formatting").firstElementChild.scrollIntoView({block:"nearest",inline:"nearest"})'); app.paint()
                if width == 720:
                    app.screenshot(output/f'regression-toolbar-{theme}-{position}.png')
                passed(f'barra {position}, {theme}, {width}×{height}, projetos {side}: alinhamento, acesso às pontas e limites da janela')

    from zen_layout_checks import exercise as check_zen_layout
    check_zen_layout(app, output, wait, passed)

    # Restaura preferências e conteúdo para os testes seguintes, sem escrever
    # o documento original. A persistência é esperada antes de cada nova sessão.
    app.call('/window/rect', rect)
    settings('toolbar'); app.click(f'[data-formatting-position={preferences.get("formattingPosition", "bottom")}]'); toggle('zenHideFormatting', preferences.get('zenHideFormatting', False))
    app.click('[data-section=appearance]'); app.click('[aria-label="'+{'light':'Claro','dark':'Escuro','sepia':'Sépia Noturno'}[preferences.get('theme','sepia')]+'"]'); app.choose('Posição da navegação', preferences.get('sidebarSide','left'))
    app.click('[data-section=behavior]'); toggle('autoImmersive', preferences.get('autoImmersive', True)); close_settings()
    app.editor('editor.commands.setContent(arguments[0]);editor.commands.focus("end");return true', original)
    app.paint()
    wait(lambda: app.ipc('load_library')['preferences'].get('theme') == preferences.get('theme'), 'persistir preferências restauradas')
