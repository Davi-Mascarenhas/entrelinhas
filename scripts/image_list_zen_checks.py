"""Redimensionamento pelas bordas, marcadores alinhados e margens Zen reais."""
import json


def exercise(app, output, wait, passed):
    original = app.editor('return editor.getJSON()')
    preferences = app.ipc('load_library')['preferences']
    rect = app.call('/window/rect')
    toolbar = app.js('return document.querySelector(arguments[0]).getAttribute("aria-pressed")==="true"', '[aria-label="Ferramentas de formatação"]')
    metrics = {'images': [], 'lists': [], 'zen': []}

    def settings(section):
        app.reveal(); app.key(',', ctrl=True)
        wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'configurações de imagem/lista/Zen')
        app.click(f'[data-section={section}]')

    def close():
        app.click('[aria-label="Fechar painel"]'); app.paint()

    def toggle(name, value):
        css = f'[data-preference={name}]'
        if app.js('return document.querySelector(arguments[0]).checked', css) != value:
            app.click(css)

    def slider(name, value):
        css = f'[data-preference={name}]'
        app.js('document.querySelector(arguments[0]).scrollIntoView({block:"center"})', css)
        app.click(css)
        actions = []
        for key in ['\ue011'] + ['\ue014'] * ((value - 16) // 4):
            actions.extend([{'type': 'keyDown', 'value': key}, {'type': 'keyUp', 'value': key}])
        app.call('/actions', {'actions': [{'type': 'key', 'id': 'keyboard', 'actions': actions}]})
        wait(lambda: app.ipc('load_library')['preferences'].get(name) == value, 'salvar '+name)

    settings('behavior'); toggle('autoImmersive', False); close()
    app.call('/window/rect', {'width': 1000, 'height': 780})
    data_url = app.js('const c=document.createElement("canvas");c.width=640;c.height=400;const x=c.getContext("2d");x.fillStyle="#81937b";x.fillRect(0,0,640,400);x.fillStyle="#cad4b5";x.beginPath();x.arc(430,115,52,0,Math.PI*2);x.fill();x.fillStyle="#4e6c5b";x.beginPath();x.moveTo(0,400);x.lineTo(250,130);x.lineTo(490,400);x.fill();return c.toDataURL()')
    for edge, dx, dy, cursor in [('right',64,0,'ew-resize'),('left',-64,0,'ew-resize'),('top',0,-40,'ns-resize'),('bottom',0,40,'ns-resize'),('top-left',-64,-40,'nwse-resize'),('top-right',64,-40,'nesw-resize'),('bottom-left',-64,40,'nesw-resize'),('bottom-right',64,40,'nwse-resize')]:
        app.editor('editor.commands.setContent({type:"doc",content:[{type:"image",attrs:{src:arguments[0],width:320,height:200}},{type:"paragraph"}]});return true', data_url)
        wait(lambda: app.js('const i=document.querySelector(".editor-scroll:not(.inactive) img");return i?.complete&&i.naturalWidth>0'), 'carregar imagem de teste')
        css = f'.editor-scroll:not(.inactive) [data-resize-handle="{edge}"]'
        app.stable_element(css)
        point = app.js('const h=document.querySelector(arguments[0]),r=h.getBoundingClientRect(),s=getComputedStyle(h);return {x:Math.floor(r.left+r.width/2),y:Math.floor(r.top+r.height/2),cursor:s.cursor,background:s.backgroundColor}', css)
        assert point['cursor'] == cursor and point['background'] == 'rgba(0, 0, 0, 0)', point
        assert app.js('return document.elementFromPoint(arguments[0],arguments[1]).dataset.resizeHandle',point['x'],point['y']) == edge
        app.call('/actions', {'actions':[{'type':'pointer','id':'mouse','parameters':{'pointerType':'mouse'},'actions':[
            {'type':'pointerMove','origin':'viewport','x':point['x'],'y':point['y']},
            {'type':'pointerDown','button':0},
            {'type':'pointerMove','origin':'viewport','x':point['x']+dx,'y':point['y']+dy,'duration':180},
            {'type':'pointerUp','button':0}]}]})
        wait(lambda: app.editor('return editor.getJSON().content[0].attrs.width') > 350, 'arrastar borda '+edge)
        attrs = app.editor('return editor.getJSON().content[0].attrs')
        assert abs(attrs['width']/attrs['height']-1.6)<.02, {'edge':edge,'width':attrs['width'],'height':attrs['height']}
        metrics['images'].append({'edge':edge,'width':attrs['width'],'height':attrs['height'],'cursor':point['cursor']})
    app.screenshot(output/'image-edge-resize.png')
    app.editor('editor.commands.undo();return true')
    assert app.editor('return editor.getJSON().content[0].attrs.width') == 320
    assert app.js('return document.querySelector(".editor-scroll:not(.inactive) img").offsetWidth') == 320
    app.editor('editor.commands.redo();return true')
    assert app.editor('return editor.getJSON().content[0].attrs.width') > 350
    for delta, minimum in [(-500, True), (600, False)]:
        point=app.js('const r=document.querySelector(".editor-scroll:not(.inactive) [data-resize-handle=right]").getBoundingClientRect();return {x:Math.floor(r.left+r.width/2),y:Math.floor(r.top+r.height/2)}')
        app.call('/actions', {'actions':[{'type':'pointer','id':'mouse','parameters':{'pointerType':'mouse'},'actions':[
            {'type':'pointerMove','origin':'viewport','x':point['x'],'y':point['y']}, {'type':'pointerDown','button':0},
            {'type':'pointerMove','origin':'viewport','x':point['x']+delta,'y':point['y'],'duration':180}, {'type':'pointerUp','button':0}]}]})
        attrs=app.editor('const {width,height}=editor.getJSON().content[0].attrs;return {width,height}')
        available=app.js('return document.querySelector(".editor-scroll:not(.inactive) .tiptap").clientWidth')
        assert 60<=attrs['width']<=available and attrs['height']>=40 and abs(attrs['width']/attrs['height']-1.6)<.02,attrs
        if minimum:assert attrs['width']<=65,attrs
        else:assert abs(attrs['width']-available)<1,attrs
        metrics['images'].append({'limit':'minimum' if minimum else 'pageWidth',**attrs})
    app.call('/window/rect',{'width':720,'height':640})
    app.stable_element('.editor-scroll:not(.inactive) .writing-paper')
    wait(lambda:app.js('const i=document.querySelector(".editor-scroll:not(.inactive) img");return i.offsetWidth<=i.closest(".tiptap").clientWidth&&Math.abs(i.offsetWidth/i.offsetHeight-1.6)<.02'),'imagem acompanha janela reduzida sem distorcer')
    app.screenshot(output/'image-edge-small-window.png')
    app.call('/window/rect',{'width':1000,'height':780});app.stable_element('.editor-scroll:not(.inactive) .writing-paper')
    passed('imagem redimensiona pelas oito bordas/cantos, preserva proporção e limites da página em janela reduzida, sem quadrados, com desfazer/refazer visual')

    lists = [('ordered','<ol start="4"><li><p>Uma ideia</p></li><li><p>Outra ideia</p></li></ol>'),('bullet','<ul><li><p>Uma ideia</p></li><li><p>Outra ideia</p></li></ul>'),('task','<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>Uma ideia</p></li><li data-type="taskItem" data-checked="true"><p>Outra ideia</p></li></ul>')]
    for kind, html in lists:
        app.editor('editor.commands.setContent(arguments[0]);editor.commands.selectAll();return true',html)
        if not app.js('return document.querySelector(arguments[0]).getAttribute("aria-pressed")==="true"', '[aria-label="Ferramentas de formatação"]'): app.click('[aria-label="Ferramentas de formatação"]')
        previous = None
        for alignment, label in [('center','Centralizar'),('right','Alinhar à direita'),('left','Alinhar à esquerda')]:
            app.editor('editor.commands.selectAll();return true');app.paint()
            wait(lambda:app.js('return !!document.querySelector(arguments[0])','[aria-label="'+label+'"]'),'mostrar alinhamento '+label)
            app.js('document.querySelector(arguments[0]).scrollIntoView({block:"nearest",inline:"center"})', '[aria-label="'+label+'"]')
            app.click('[aria-label="'+label+'"]');app.paint()
            assert app.editor('return editor.getJSON().content[0].content.every(n=>n.attrs.textAlign===arguments[0] && n.content[0].attrs.textAlign===arguments[0])',alignment)
            measurement = app.js('const li=document.querySelector(".editor-scroll:not(.inactive) li"),p=li.querySelector("p"),label=li.querySelector("label"),r=p.getBoundingClientRect(),s=getComputedStyle(li);return {text:r.toJSON(),item:li.getBoundingClientRect().toJSON(),marker:label?.getBoundingClientRect().toJSON(),position:s.listStylePosition,display:getComputedStyle(p).display}')
            if alignment!='left':
                if kind=='task':
                    marker=measurement['marker']; assert 0<=measurement['text']['left']-marker['right']<=16,measurement
                    group_left=marker['left'];group_right=measurement['text']['right'];item=measurement['item']
                    if alignment=='center': assert abs((group_left+group_right)/2-(item['left']+item['right'])/2)<2,measurement
                    else: assert abs(group_right-item['right'])<2,measurement
                else: assert measurement['position']=='inside' and measurement['display']=='inline-block',measurement
            if previous is not None:
                if alignment=='right': assert measurement['text']['left']>previous+20,measurement
                else: assert measurement['text']['left']<previous-20,measurement
            previous=measurement['text']['left'];metrics['lists'].append({'kind':kind,'alignment':alignment,**measurement})
            if alignment!='left':
                app.editor('editor.commands.setTextSelection(4);return true');app.paint()
                app.screenshot(output/f'list-{kind}-{alignment}.png')
        if kind=='task':
            app.click('.editor-scroll:not(.inactive) li label input')
            assert app.editor('return editor.getJSON().content[0].content[0].attrs.checked') is True
    passed('barra alinha listas numeradas, marcadores e tarefas ao centro/direita/esquerda, movendo as caixas junto ao texto e mantendo sua interação')

    # O padrão migra sem modificar preferências anteriores; cada ajuste é persistido no SQLite.
    assert preferences.get('zenTopMargin',56)==preferences.get('zenSideMargin',56)==56
    settings('editor');slider('zenTopMargin',100);slider('zenSideMargin',84)
    app.screenshot(output/'zen-margins-settings.png');close()
    app.call('/window/rect', {'width':720,'height':640})
    app.editor('editor.commands.setContent("<p>Um recuo para respirar.</p><p>As margens acompanham sua escrita.</p>");editor.commands.focus("start");return true')
    app.reveal();app.stable_element('.editor-scroll:not(.inactive) .writing-paper');normal=app.js('return document.querySelector(".writing-paper").getBoundingClientRect().toJSON()')
    app.real_key('Escape');wait(lambda:app.js('return document.querySelector(".app").classList.contains("immersive")'),'entrar no Zen com margens')
    app.stable_element('.editor-scroll:not(.inactive) .writing-paper')
    actual=app.js('return document.querySelector(".editor-scroll:not(.inactive) .writing-paper").getBoundingClientRect().toJSON()')
    p=app.ipc('load_library')['preferences'];dock=72 if p.get('formattingPosition')=='side' and not p.get('zenHideFormatting') else 0
    assert abs(actual['top']-100)<1 and abs(actual['left']-(84+dock))<1,(actual,p)
    metrics['zen'].append(actual);app.screenshot(output/'zen-margins-custom.png')
    app.real_key('Escape');wait(lambda:not app.js('return document.querySelector(".app").classList.contains("immersive")'),'sair do Zen customizado')
    app.stable_element('.editor-scroll:not(.inactive) .writing-paper')
    restored=app.js('return document.querySelector(".editor-scroll:not(.inactive) .writing-paper").getBoundingClientRect().toJSON()')
    assert abs(restored['left']-normal['left'])<1 and abs(restored['width']-normal['width'])<1,(normal,restored)
    settings('editor');assert app.js('return Number(document.querySelector("[data-preference=zenTopMargin]").value)')==100
    assert app.js('return Number(document.querySelector("[data-preference=zenSideMargin]").value)')==84
    slider('zenTopMargin',preferences.get('zenTopMargin',56));slider('zenSideMargin',preferences.get('zenSideMargin',56));close()
    settings('behavior');toggle('autoImmersive',preferences.get('autoImmersive',True));close()
    if not toolbar:app.click('[aria-label="Ferramentas de formatação"]')
    app.call('/window/rect',rect);app.editor('editor.commands.setContent(arguments[0]);return true',original)
    (output/'image-list-zen-results.json').write_text(json.dumps({'passed':3,'checks':metrics},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    passed('margens Zen têm padrão igual, ajustes independentes por teclado, persistência real e retorno à coluna normal')
