; O Tauri inclui este arquivo antes de criar as páginas do Modern UI 2.
!define MUI_BGCOLOR "F7F6F2"
!define MUI_TEXTCOLOR "2B2F29"
!define MUI_INSTFILESPAGE_COLORS "2B2F29 F7F6F2"
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao Entrelinhas"
!define MUI_WELCOMEPAGE_TEXT "Um espaço tranquilo para escrever.$\r$\n$\r$\nEste assistente prepara o Entrelinhas neste computador.$\r$\nSeus documentos continuam nos locais que você escolher.$\r$\n$\r$\nClique em Próximo para continuar."
!define MUI_FINISHPAGE_TITLE "Tudo pronto para escrever."
!define MUI_FINISHPAGE_TEXT "O Entrelinhas foi instalado.$\r$\n$\r$\nAo abrir, escolha o tema que acompanha sua escrita.$\r$\n$\r$\nSeus arquivos são seus. Você decide quando e onde salvar."
BrandingText "Entrelinhas · Seu texto, seu tempo."

; Registra Abrir com e a página de padrões, sem escrever nos padrões atuais
; das extensões nem na chave protegida UserChoice do Windows.
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationName" "Entrelinhas"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationDescription" "Um espaço tranquilo para escrever"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities" "ApplicationIcon" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".md" "Entrelinhas.Markdown"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".markdown" "Entrelinhas.Markdown"
  WriteRegStr HKCU "Software\Entrelinhas\Capabilities\FileAssociations" ".txt" "Entrelinhas.Text"
  WriteRegStr HKCU "Software\RegisteredApplications" "Entrelinhas" "Software\Entrelinhas\Capabilities"
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown" "" "Documento Markdown"
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Markdown\shell\open\command" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'
  WriteRegStr HKCU "Software\Classes\Entrelinhas.Text" "" "Documento de texto"
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
