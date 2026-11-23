; O Tauri inclui este arquivo antes de criar as páginas do Modern UI 2.
!define MUI_BGCOLOR "F7F6F2"
!define MUI_TEXTCOLOR "2B2F29"
!define MUI_INSTFILESPAGE_COLORS "2B2F29 F7F6F2"
!define MUI_WELCOMEPAGE_TITLE "$(EntreWelcomeTitle)"
!define MUI_WELCOMEPAGE_TEXT "$(EntreWelcomeText)"
!define MUI_FINISHPAGE_TITLE "$(EntreFinishTitle)"
!define MUI_FINISHPAGE_TEXT "$(EntreFinishText)"

; O seletor é a primeira janela de instalações interativas. Atualizações e
; instalações silenciosas não abrem perguntas nem substituem o idioma no app.
!macroundef MUI_LANGDLL_DISPLAY
!macro MUI_LANGDLL_DISPLAY
  ClearErrors
  ReadRegDWORD $R8 HKCU "Software\Entrelinhas" "InstallerLanguage"
  ${IfNot} ${Errors}
    StrCpy $LANGUAGE $R8
  ${EndIf}
  ${If} $UpdateMode != 1
  ${AndIf} $PassiveMode != 1
    ${Unless} ${Silent}
      entre_language_family:
      LangDLL::LangDialog "Entrelinhas" "Português · English · Español · 日本語 · 中文 · Deutsch" A "Português" "1046" "English" "1033" "Español" "1034" "日本語" "1041" "中文" "2052" "Deutsch" "1031" ""
      Pop $LANGUAGE
      ${If} $LANGUAGE == "cancel"
        Abort
      ${EndIf}
      ${If} $LANGUAGE == 1046
        LangDLL::LangDialog "Português" "Escolha a variante de português:" A "Português (Brasil)" "1046" "Português (Portugal)" "2070" ""
        Pop $LANGUAGE
      ${ElseIf} $LANGUAGE == 1034
        LangDLL::LangDialog "Español" "Elige tu variante de español:" A "Español (Latinoamérica)" "3082" "Español (España)" "1034" ""
        Pop $LANGUAGE
      ${ElseIf} $LANGUAGE == 2052
        LangDLL::LangDialog "中文" "请选择中文版本 / 請選擇中文版本：" A "简体中文" "2052" "繁體中文" "1028" ""
        Pop $LANGUAGE
      ${EndIf}
      ${If} $LANGUAGE == "cancel"
        Goto entre_language_family
      ${EndIf}
    ${EndUnless}
  ${EndIf}
!macroend

LangString EntreWelcomeTitle 1046 "Bem-vindo ao Entrelinhas"
LangString EntreWelcomeText 1046 "Um espaço tranquilo para escrever.$\r$\n$\r$\nEste assistente prepara o Entrelinhas neste computador.$\r$\nSeus documentos continuam nos locais que você escolher.$\r$\n$\r$\nClique em Próximo para continuar."
LangString EntreFinishTitle 1046 "Tudo pronto para escrever."
LangString EntreFinishText 1046 "O Entrelinhas foi instalado.$\r$\n$\r$\nAo abrir, escolha o tema que acompanha sua escrita.$\r$\n$\r$\nSeus arquivos são seus. Você decide quando e onde salvar."
LangString EntreWelcomeTitle 1033 "Welcome to Entrelinhas"
LangString EntreWelcomeText 1033 "A quiet space to write.$\r$\n$\r$\nThis wizard sets up Entrelinhas on this computer.$\r$\nYour documents stay in the locations you choose.$\r$\n$\r$\nClick Next to continue."
LangString EntreFinishTitle 1033 "Ready to write."
LangString EntreFinishText 1033 "Entrelinhas has been installed.$\r$\n$\r$\nWhen you open it, choose a theme for your writing.$\r$\n$\r$\nYour files are yours. You choose when and where to save."
LangString EntreWelcomeTitle 1041 "Entrelinhasへようこそ"
LangString EntreWelcomeText 1041 "静かに書ける場所。$\r$\n$\r$\nこのウィザードでEntrelinhasをインストールします。$\r$\n文書は自分で選んだ場所に保存できます。$\r$\n$\r$\n「次へ」をクリックして続けてください。"
LangString EntreFinishTitle 1041 "書く準備ができました。"
LangString EntreFinishText 1041 "Entrelinhasをインストールしました。$\r$\n$\r$\nアプリを開いて、書く時間に合うテーマを選びましょう。$\r$\n$\r$\nファイルはあなたのもの。保存するタイミングと場所は自分で選べます。"
LangString EntreWelcomeTitle 2052 "欢迎使用 Entrelinhas"
LangString EntreWelcomeText 2052 "一处静心写作的空间。$\r$\n$\r$\n此向导将为这台电脑安装 Entrelinhas。$\r$\n文档仍保存在你选择的位置。$\r$\n$\r$\n点击“下一步”继续。"
LangString EntreFinishTitle 2052 "准备好开始写作。"
LangString EntreFinishText 2052 "Entrelinhas 已安装。$\r$\n$\r$\n打开应用后，请选择适合你写作的主题。$\r$\n$\r$\n文件属于你自己，何时保存、保存到哪里，都由你决定。"
LangString EntreWelcomeTitle 1031 "Willkommen bei Entrelinhas"
LangString EntreWelcomeText 1031 "Ein ruhiger Ort zum Schreiben.$\r$\n$\r$\nDieser Assistent richtet Entrelinhas auf diesem Computer ein.$\r$\nDeine Dokumente bleiben an den von dir gewählten Orten.$\r$\n$\r$\nKlicke auf Weiter."
LangString EntreFinishTitle 1031 "Bereit zum Schreiben."
LangString EntreFinishText 1031 "Entrelinhas wurde installiert.$\r$\n$\r$\nWähle beim Öffnen ein Design für dein Schreiben.$\r$\n$\r$\nDeine Dateien gehören dir. Du entscheidest, wann und wo du speicherst."

LangString EntreAppDescription 1046 "Um espaço tranquilo para escrever"
LangString EntreMarkdownDescription 1046 "Documento Markdown"
LangString EntreTextDescription 1046 "Documento de texto"
LangString EntreAppDescription 1033 "A quiet space to write"
LangString EntreMarkdownDescription 1033 "Markdown document"
LangString EntreTextDescription 1033 "Text document"
LangString EntreAppDescription 1041 "静かに書ける場所"
LangString EntreMarkdownDescription 1041 "Markdown文書"
LangString EntreTextDescription 1041 "テキスト文書"
LangString EntreAppDescription 2052 "一处静心写作的空间"
LangString EntreMarkdownDescription 2052 "Markdown 文档"
LangString EntreTextDescription 2052 "文本文档"
LangString EntreAppDescription 1031 "Ein ruhiger Ort zum Schreiben"
LangString EntreMarkdownDescription 1031 "Markdown-Dokument"
LangString EntreTextDescription 1031 "Textdokument"


; Variantes regionais e escrita tradicional.
LangString EntreWelcomeTitle 2070 "Bem-vindo ao Entrelinhas"
LangString EntreWelcomeText 2070 "Um espaço tranquilo para escrever.$\r$\n$\r$\nEste assistente instala o Entrelinhas neste computador.$\r$\nOs seus documentos ficam nas localizações que escolher.$\r$\n$\r$\nClique em Seguinte para continuar."
LangString EntreFinishTitle 2070 "Pronto para escrever."
LangString EntreFinishText 2070 "O Entrelinhas foi instalado.$\r$\n$\r$\nAo abrir a aplicação, escolha um tema para a sua escrita.$\r$\n$\r$\nOs ficheiros são seus. Escolha quando e onde guardar."
LangString EntreAppDescription 2070 "Um espaço tranquilo para escrever"
LangString EntreMarkdownDescription 2070 "Documento Markdown"
LangString EntreTextDescription 2070 "Documento de texto"
LangString EntreWelcomeTitle 1034 "Te damos la bienvenida a Entrelinhas"
LangString EntreWelcomeText 1034 "Un espacio tranquilo para escribir.$\r$\n$\r$\nEste asistente instalará Entrelinhas en tu ordenador.$\r$\nTus documentos permanecen donde tú elijas.$\r$\n$\r$\nHaz clic en Siguiente para continuar."
LangString EntreFinishTitle 1034 "Todo listo para escribir."
LangString EntreFinishText 1034 "Entrelinhas se ha instalado.$\r$\n$\r$\nAl abrir la aplicación, elige un tema para tu escritura.$\r$\n$\r$\nTus archivos son tuyos. Tú eliges cuándo y dónde guardar."
LangString EntreAppDescription 1034 "Un espacio tranquilo para escribir"
LangString EntreMarkdownDescription 1034 "Documento Markdown"
LangString EntreTextDescription 1034 "Documento de texto"
LangString EntreWelcomeTitle 1028 "歡迎使用 Entrelinhas"
LangString EntreWelcomeText 1028 "一處靜心寫作的空間。$\r$\n$\r$\n此精靈將在這台電腦安裝 Entrelinhas。$\r$\n文件仍保存在你選擇的位置。$\r$\n$\r$\n按一下「下一步」繼續。"
LangString EntreFinishTitle 1028 "準備好開始寫作。"
LangString EntreFinishText 1028 "Entrelinhas 已安裝。$\r$\n$\r$\n開啟應用程式後，請選擇適合寫作的主題。$\r$\n$\r$\n檔案屬於你自己，何時儲存、儲存到哪裡，都由你決定。"
LangString EntreAppDescription 1028 "一處靜心寫作的空間"
LangString EntreMarkdownDescription 1028 "Markdown 文件"
LangString EntreTextDescription 1028 "純文字文件"
LangString EntreWelcomeTitle 3082 "Te damos la bienvenida a Entrelinhas"
LangString EntreWelcomeText 3082 "Un espacio tranquilo para escribir.$\r$\n$\r$\nEste asistente instalará Entrelinhas en tu computadora.$\r$\nTus documentos permanecen donde tú elijas.$\r$\n$\r$\nHaz clic en Siguiente para continuar."
LangString EntreFinishTitle 3082 "Todo listo para escribir."
LangString EntreFinishText 3082 "Entrelinhas se instaló.$\r$\n$\r$\nAl abrir la aplicación, elige un tema para tu escritura.$\r$\n$\r$\nTus archivos son tuyos. Tú eliges cuándo y dónde guardar."
LangString EntreAppDescription 3082 "Un espacio tranquilo para escribir"
LangString EntreMarkdownDescription 3082 "Documento Markdown"
LangString EntreTextDescription 3082 "Documento de texto"

; Registra Abrir com e a página de padrões, sem escrever nos padrões atuais
; das extensões nem na chave protegida UserChoice do Windows.
!macro NSIS_HOOK_POSTINSTALL
  ${If} $UpdateMode != 1
    ; /LANG= é útil em instalações assistidas e testes silenciosos.
    ${GetOptions} $CMDLINE "/LANG=" $R8
    ${IfNot} ${Errors}
      StrCpy $LANGUAGE $R8
    ${EndIf}
    WriteRegDWORD HKCU "Software\Entrelinhas" "InstallerLanguage" $LANGUAGE
  ${EndIf}
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationName" "Entrelinhas"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationDescription" "$(EntreAppDescription)"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationIcon" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".md" "Entrelinhas.Markdown"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".markdown" "Entrelinhas.Markdown"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".txt" "Entrelinhas.Text"
  WriteRegStr HKCU "Software\RegisteredApplications" "Entrelinhas" "Software\Entrelinhas\Capabilities"
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown" "" "$(EntreMarkdownDescription)"
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Text" "" "$(EntreTextDescription)"
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Text\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Text\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe" "FriendlyAppName" "Entrelinhas"
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".markdown" ""
  WriteRegStr HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe\SupportedTypes" ".txt" ""
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "Entrelinhas.Markdown" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithProgids" "Entrelinhas.Markdown" ""
  WriteRegStr HKCU "Software\Classes\.txt\OpenWithProgids" "Entrelinhas.Text" ""
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode != 1
    DeleteRegValue HKCU "Software\Entrelinhas" "InstallerLanguage"
  ${EndIf}
  DeleteRegValue HKCU "Software\RegisteredApplications" "Entrelinhas"
  DeleteRegKey HKCU "Software\Entrelinhas\Capabilities"
  DeleteRegKey /ifempty HKCU "Software\Entrelinhas"
  DeleteRegKey HKCU "Software\Classes\Entrelinhas.Markdown"
  DeleteRegKey HKCU "Software\Classes\Entrelinhas.Text"
  DeleteRegKey HKCU "Software\Classes\Applications\${MAINBINARYNAME}.exe"
  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Entrelinhas.Markdown"
  DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "Entrelinhas.Markdown"
  DeleteRegValue HKCU "Software\Classes\.txt\OpenWithProgids" "Entrelinhas.Text"
  DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"
  DeleteRegKey /ifempty HKCU "Software\Classes\.markdown\OpenWithProgids"
  DeleteRegKey /ifempty HKCU "Software\Classes\.txt\OpenWithProgids"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend
