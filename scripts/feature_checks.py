"""Verificações reais da edição direta, comandos e modo Zen (perfil descartável)."""

def exercise(app, output, wait, passed):
    original = app.editor('return editor.getJSON()')
    app.reveal()
    before_tabs = app.js('return document.querySelectorAll(".tiptap").length')
    app.double_click('.window-title');wait(lambda: app.js('return !!document.querySelector("[data-inline-rename]")'), 'editar na barra')
    assert not app.js('return !!document.querySelector(".modal-backdrop")')
    app.fill('[aria-label="Título do documento"]','Título não confirmado')
    app.click('[aria-label^="Nova guia"]')
    wait(lambda: app.js('return document.querySelectorAll(".tiptap").length') == before_tabs+1, 'trocar documento durante edição do título')
    assert not app.js('return !!document.querySelector("[data-inline-rename]")')
    app.key(',',ctrl=True);wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'atalhos continuam funcionando depois de trocar documento')
    app.js('document.querySelector(".settings-layout").closest(".modal").querySelector(".modal-header button").click()')
    app.key('w',ctrl=True);wait(lambda: app.js('return document.querySelectorAll(".tiptap").length') == before_tabs, 'voltar ao documento original')
    passed('título editado na barra, sem modal, e troca de documento cancela a edição sem bloquear os atalhos')

    def settings(section):
        app.reveal(); app.key(',', ctrl=True)
        wait(lambda: app.js('return !!document.querySelector(".settings-layout")'), 'configurações')
        app.click(f'[data-section="{section}"]')
    def close_settings():
        app.js('document.querySelector(".settings-layout").closest(".modal").querySelector(".modal-header button").click()')
    def preference(name, value):
        current = app.js('return document.querySelector(arguments[0]).checked', f'[data-preference="{name}"]')
        if current != value: app.click(f'[data-preference="{name}"]')
    def editor_key(key):
        app.editor('editor.commands.focus();return true'); app.paint(); app.real_key(key)
    settings('behavior'); auto = app.js('return document.querySelector("[data-preference=autoImmersive]").checked'); preference('autoImmersive', False); close_settings()
    for language, tasks, table in [('pt-BR','lista','tabela'),('en','list','table'),('ja','リスト','テーブル'),('zh-CN','清单','表格'),('de','liste','tabelle'),('pt-PT','lista','tabela'),('es-419','tareas','tabla'),('es-ES','tareas','tabla'),('zh-TW','清單','表格')]:
        settings('language'); app.language(language); close_settings()
        app.editor('editor.commands.setContent("<p></p>");editor.commands.focus("end");return true');app.paint()
        app.keys('.editor-scroll:not(.inactive) .tiptap', '/'+tasks)
        wait(lambda: app.js('return !!document.querySelector(".slash-menu [data-command=tasks]")'), 'comando de tarefas em '+language)
        assert not app.js('return !!document.querySelector("[role=dialog]")')
        app.click('.slash-menu [data-command="tasks"]')
        wait(lambda: app.editor('return editor.getJSON().content[0].type') == 'taskList', 'criar checklist')
        assert not app.editor('return editor.getText().includes(arguments[0])', '/'+tasks)
        app.editor('editor.commands.setContent("<p>Antes</p><p></p>");editor.commands.focus("end");return true'); app.paint()
        app.keys('.editor-scroll:not(.inactive) .tiptap','/'+table)
        wait(lambda: app.js('return !!document.querySelector(".slash-menu [data-command=table]")'), 'comando de tabela em '+language)
        app.screenshot(output/f'slash-{language}.png')
        editor_key('Enter')
        wait(lambda: app.editor('return editor.getJSON().content.some(n=>n.type==="table")'), 'inserir tabela')
        assert app.editor('return editor.getText().includes("Antes")')
    settings('language');app.language('pt-BR');close_settings()
    app.editor('editor.commands.setContent("<p></p>");editor.commands.focus("end");return true');app.paint();app.key('Escape')
    assert not app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Esc não entra no Zen em nota vazia.'
    app.keys('.editor-scroll:not(.inactive) .tiptap','/')
    wait(lambda: app.js('return !!document.querySelector(".slash-menu")'), 'menu completo de comandos')
    assert app.js('return document.querySelector(".slash-menu [aria-selected=true]").dataset.command') == 'tasks', 'Menu abre na primeira opção, mesmo sob o ponteiro parado.'
    editor_key('ArrowDown');editor_key('Enter')
    wait(lambda: app.editor('return editor.getJSON().content.some(n=>n.type==="table")'), 'setas e Enter em sequência escolhem o segundo comando')

    app.editor('editor.commands.setContent("<p>/nada</p>");editor.commands.focus("end");return true'); app.paint()
    wait(lambda: app.js('return !!document.querySelector(".slash-menu")'), 'comando desconhecido')
    editor_key('Escape');assert app.editor('return editor.getText()') == '/nada'
    assert not app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Esc do menu não deve entrar no Zen.'
    app.editor('editor.commands.setContent("<p>https://example.com/pasta</p>");editor.commands.focus("end");return true');app.paint()
    assert not app.js('return !!document.querySelector(".slash-menu")')
    passed('comandos /lista e /tabela nas nove variantes em seis idiomas, teclado/mouse, texto preservado e Esc fecha apenas o menu')
    app.editor('editor.commands.setContent("<p>Cor e escrita.</p>");editor.commands.focus("end");return true');app.reveal()
    if not app.js('return !!document.querySelector(".formatting")'): app.click('[aria-label="Ferramentas de formatação"]')
    app.editor('editor.chain().focus().selectAll().run();return true')
    app.click('[aria-label="Cor do texto"]')
    wait(lambda: app.js('return !!document.querySelector(".color-palette")'), 'paleta local')
    assert not app.js('return !!document.querySelector(".modal-backdrop")')
    app.click('[aria-label="Usar cor #6f94b5"]')
    wait(lambda: app.editor('return JSON.stringify(editor.getJSON()).includes("#6f94b5")'), 'cor imediata sem aplicar')
    app.screenshot(output/'color-anchored.png')
    app.key('Escape');assert not app.js('return document.querySelector(".app").classList.contains("immersive")')
    passed('paleta junto ao botão aplica cor imediatamente, preserva a seleção e não cria modal')
    app.editor('editor.commands.setContent(Array.from({length:35},(_,i)=>"<p>Linha "+i+" — texto de teste.</p>").join(""));editor.commands.focus("start");return true');app.paint()
    before=app.js('return document.querySelector(".editor-scroll:not(.inactive)").getBoundingClientRect().toJSON()')
    app.key('Escape')
    wait(lambda: app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Esc entra no Zen')
    wait(lambda: 52 <= app.js('return document.querySelector(".editor-scroll:not(.inactive)").getBoundingClientRect().top') <= 60, 'usar altura superior com recuo confortável')
    after=app.js('return document.querySelector(".editor-scroll:not(.inactive)").getBoundingClientRect().toJSON()')
    assert after['height'] > before['height']+70
    assert app.js('return !!document.querySelector(".formatting") && getComputedStyle(document.querySelector(".formatting-dock")).visibility==="visible"')
    assert app.js('const r=document.querySelector(".tiptap").getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)<1')
    wait(lambda: app.editor('const c=editor.view.coordsAtPos(editor.state.selection.head);const b=document.querySelector(".block-caret")?.getBoundingClientRect();return !!b&&Math.abs(b.top-c.top)<2'), 'cursor acompanha a transição do Zen')
    app.screenshot(output/'zen-height.png')
    app.key('Escape');wait(lambda: not app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Esc sai do Zen')
    settings('toolbar'); preference('zenHideFormatting', True);close_settings();app.key('Escape')
    wait(lambda: app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Zen com ferramentas ocultas')
    assert not app.js('return !!document.querySelector(".formatting")')
    app.key('Escape');settings('toolbar');preference('zenHideFormatting',False);app.click('[data-formatting-position=side]');close_settings()
    app.key('Escape');wait(lambda: app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Zen com barra lateral')
    assert app.js('const b=document.querySelector(".formatting-dock").getBoundingClientRect();return b.right>innerWidth-80 && b.top===48 && innerWidth-b.right===24 && innerHeight-b.bottom===24')
    assert app.js('return getComputedStyle(document.querySelector(".formatting")).flexDirection')=='column'
    wait(lambda: app.js('return getComputedStyle(document.querySelector(".titlebar")).visibility') == 'hidden', 'terminar transição Zen')
    app.screenshot(output/'formatting-side-right.png')
    app.key('Escape');settings('appearance');app.choose('Posição da navegação','right');close_settings();app.key('Escape')
    wait(lambda: app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Zen com projetos à direita')
    assert app.js('return document.querySelector(".formatting-dock").getBoundingClientRect().left===24')
    wait(lambda: app.js('return getComputedStyle(document.querySelector(".titlebar")).visibility') == 'hidden', 'terminar transição Zen')
    app.screenshot(output/'formatting-side-left.png')
    app.key('Escape');settings('appearance');app.choose('Posição da navegação','left');close_settings();settings('toolbar');app.click('[data-formatting-position=bottom]');close_settings()

    settings('behavior');preference('autoImmersive',True);close_settings()
    app.editor('editor.commands.setContent("<p></p>");editor.commands.focus("end");return true');app.paint()
    app.keys('.editor-scroll:not(.inactive) .tiptap','/lista')
    wait(lambda: app.js('return document.querySelector(".app").classList.contains("immersive")'), 'comando entra no Zen automático')
    wait(lambda: app.js('return getComputedStyle(document.querySelector(".titlebar")).visibility') == 'hidden', 'animar Zen com menu aberto')
    wait(lambda: app.editor('const c=editor.view.coordsAtPos(editor.state.selection.head);const m=document.querySelector(".slash-menu")?.getBoundingClientRect();return !!m&&m.top-c.bottom>=0&&m.top-c.bottom<=12'), 'menu segue o cursor durante a animação')
    app.screenshot(output/'slash-zen.png')
    editor_key('Escape');assert app.js('return document.querySelector(".app").classList.contains("immersive")'), 'Fechar o menu mantém o Zen.'
    app.paint();app.key('Escape');wait(lambda: not app.js('return document.querySelector(".app").classList.contains("immersive")'), 'segundo Esc sai do Zen')
    passed('Zen usa mais altura, mantém coluna e ferramentas, barra lateral oposta e menu / acompanha o cursor no Zen automático')

    settings('behavior');preference('autoImmersive',False);close_settings()
    check_blocks(app, output, wait, passed, settings, close_settings, editor_key)
    app.editor('editor.commands.setContent(arguments[0]);return true', original)
    settings('behavior');preference('autoImmersive',auto);close_settings()


def check_blocks(app, output, wait, passed, settings, close_settings, editor_key):
    def blank():
        app.editor('editor.commands.setContent("<p></p>");editor.commands.focus("end");return true');app.paint()
    def choose(query, command):
        app.keys('.editor-scroll:not(.inactive) .tiptap','/'+query)
        wait(lambda: app.js('return !!document.querySelector(arguments[0])', f'.slash-menu [data-command="{command}"]'), 'comando /'+query)
        app.click(f'.slash-menu [data-command="{command}"]')
        app.paint()
    blank()
    for language, toggle, callout, warning, date, clock in [
        ('pt-BR','recolhivel','dica','aviso','hoje','hora'),
        ('en','toggle','callout','warning','today','time'),
        ('ja','トグル','コールアウト','警告','日付','時刻'),
        ('zh-CN','折叠','提示','警告','日期','时间'),
        ('de','klappliste','hinweis','warnung','datum','uhrzeit'),
        ('pt-PT','recolhível','informativa','aviso','hoje','hora'),
        ('es-419','desplegable','informativo','aviso','hoy','hora'),
        ('es-ES','desplegable','informativo','aviso','hoy','hora'),
        ('zh-TW','摺疊','提示','警告','日期','時間'),
    ]:
        settings('language');app.language(language);close_settings();blank()
        choose(toggle,'toggle')
        assert app.editor('return editor.state.selection.$from.parent.type.name') == 'detailsSummary'
        app.editor('editor.commands.insertContent("Ideias para guardar");return true');editor_key('Enter')
        assert app.editor('return editor.state.selection.$from.node(-1).type.name') == 'detailsContent'
        app.editor('editor.commands.insertContent("Este conteúdo pode ser recolhido sem ser apagado.");return true')
        editor_key('Enter');editor_key('Enter')
        assert app.editor('return editor.state.selection.$from.depth') == 1
        choose(callout,'callout');app.editor('editor.commands.insertContent("Uma ideia merece espaço para crescer.");return true')
        editor_key('Enter');editor_key('Enter');choose(warning,'warning')
        app.editor('editor.commands.insertContent("Salvar continua sendo uma escolha sua.");return true')
        assert app.editor('return editor.getJSON().content.filter(n=>n.type==="callout").map(n=>n.attrs.kind)') == ['info','warning']
        app.click('.tiptap details > summary')
        wait(lambda: app.editor('return editor.getJSON().content[0].attrs.open') is False, 'recolher bloco pelo mouse')
        assert app.js('return document.querySelector(".tiptap [data-type=detailsContent]").getBoundingClientRect().height') == 0
        assert app.editor('return editor.getText().includes("sem ser apagado")')
        app.screenshot(output/f'blocks-collapsed-{language}.png')
        app.click('.tiptap details > summary');wait(lambda: app.editor('return editor.getJSON().content[0].attrs.open') is True, 'reabrir bloco pelo mouse')
        app.screenshot(output/f'blocks-{language}.png')
        blank();choose(date,'date')
        assert app.editor('return !editor.getText().includes("/") && editor.getText().trim().length>5')
        blank();choose(clock,'time')
        assert app.editor('return !editor.getText().includes("/") && /[0-9]/.test(editor.getText())')
    passed('blocos recolhíveis, caixas, avisos, data e hora nas nove variantes em seis idiomas; mouse e Enter preservam o conteúdo')
    settings('language');app.language('pt-BR');close_settings();blank()
    choose('link','link')
    wait(lambda: app.js('return !!document.querySelector(arguments[0])', '.modal-body input[type=text]'), 'endereço do link')
    app.screenshot(output/'slash-link.png')
    app.key('Escape');assert app.editor('return editor.getText()') == '/link'
    blank();choose('link','link');app.keys('.modal-body input[type=text]','https://example.com/ideias')
    app.click('.modal button[type=submit]');wait(lambda: not app.js('return !!document.querySelector(".modal")'), 'aplicar link')
    assert app.editor('return editor.getHTML().includes("https://example.com/ideias") && !editor.getText().includes("/link")')
    app.editor('editor.commands.setContent("<p>Ideia <strong>importante</strong> </p>");editor.commands.focus("end");editor.commands.insertContent(" ");return true');app.paint()
    choose('duplicar','duplicate')
    assert app.editor('const p=editor.getJSON().content;return p.length===2&&JSON.stringify(p[0])===JSON.stringify(p[1])')
    app.editor('editor.commands.focus("end");editor.commands.insertContent(" ");return true');app.paint();choose('limpar','clear')
    assert app.editor('const p=editor.getJSON().content;return JSON.stringify(p[0]).includes("bold")&&!JSON.stringify(p[1]).includes("bold")')
    passed('link confirmado/cancelado, duplicação com marcas e limpeza apenas do bloco atual no aplicativo real')
    blank();app.keys('.editor-scroll:not(.inactive) .tiptap','/')
    wait(lambda: app.js('return document.querySelectorAll(".slash-menu [role=option]").length') == 20, 'vinte comandos no menu')
    editor_key('ArrowUp');wait(lambda: app.js('return document.querySelector(".slash-menu [aria-selected=true]").dataset.command') == 'clear', 'navegar até o fim do menu')
    wait(lambda: app.js('const m=document.querySelector(".slash-menu");return m.querySelector("[aria-selected=true]").getBoundingClientRect().bottom<=m.querySelector("footer").getBoundingClientRect().top+1'), 'última opção fica inteira acima do rodapé')
    app.screenshot(output/'slash-more.png')
    editor_key('ArrowDown');wait(lambda: app.js('return document.querySelector(".slash-menu [aria-selected=true]").dataset.command') == 'tasks', 'voltar ao início do menu')
    editor_key('Escape')
    passed('vinte comandos com rolagem e navegação circular por teclado, sem mudar o texto ao cancelar')
