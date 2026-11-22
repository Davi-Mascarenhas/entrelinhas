param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class WizardWindow {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr h, int id);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string cls, string title);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint message, IntPtr w, System.Text.StringBuilder text);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder text, int length);
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc callback, IntPtr p);
  public static string Text(IntPtr h) { var text=new System.Text.StringBuilder(4096); GetWindowText(h,text,text.Capacity); return text.ToString(); }
  public static string ChildrenText(IntPtr h) { var text=new System.Text.StringBuilder(); EnumChildWindows(h,(child,p)=>{text.AppendLine(Text(child));return true;},IntPtr.Zero);return text.ToString(); }
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint message, IntPtr w, IntPtr l);
}
'@
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
foreach ($language in @(
  @{Name='Portugu'; Id=1046; Welcome='Bem-vindo ao Entrelinhas'},
  @{Name='English'; Id=1033; Welcome='Welcome to Entrelinhas'},
  @{Name='日本語'; Id=1041; Welcome='Entrelinhasへようこそ'},
  @{Name='简体中文'; Id=2052; Welcome='欢迎使用 Entrelinhas'},
  @{Name='Deutsch'; Id=1031; Welcome='Willkommen bei Entrelinhas'}
)) {
$wizard = Start-Process -FilePath $Installer -PassThru
try {
  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 200
    $wizard.Refresh()
    if ($wizard.HasExited) { throw "O wizard encerrou antes de mostrar a janela." }
  } until ($wizard.MainWindowHandle -ne [IntPtr]::Zero -or (Get-Date) -gt $deadline)
  $handle = $wizard.MainWindowHandle
  if ($handle -eq [IntPtr]::Zero) { throw 'O wizard não mostrou uma janela.' }
  [WizardWindow]::SetForegroundWindow($handle) | Out-Null
  function Save-Wizard([string]$Name) {
    Start-Sleep -Milliseconds 700
    $rect = New-Object WizardWindow+Rect
    [WizardWindow]::GetWindowRect($handle, [ref]$rect) | Out-Null
    if (($rect.Right - $rect.Left) -lt 200) { throw 'Tamanho inválido do wizard.' }
    $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left),($rect.Bottom - $rect.Top)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $dc = $graphics.GetHdc()
    try { $printed = [WizardWindow]::PrintWindow($handle, $dc, 2) }
    finally { $graphics.ReleaseHdc($dc) }
    if (-not $printed) { $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,$bitmap.Size) }
    $bitmap.Save((Join-Path $OutputDirectory $Name),[System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
  }
  $combo = [WizardWindow]::FindWindowEx($handle,[IntPtr]::Zero,'ComboBox',$null)
  if ($combo -eq [IntPtr]::Zero) { throw 'O seletor de idioma deve ser a primeira janela.' }
  $count = [int][WizardWindow]::SendMessage($combo,0x146,[IntPtr]::Zero,[IntPtr]::Zero)
  if ($count -ne 5) { throw "Esperados cinco idiomas; encontrados $count." }
  Save-Wizard ("wizard-language-{0}.png" -f $language.Id)
  $selected = -1
  for ($index=0; $index -lt $count; $index++) {
    $text = [System.Text.StringBuilder]::new(256)
    [WizardWindow]::SendMessage($combo,0x148,[IntPtr]$index,$text) | Out-Null
    if ($text.ToString().Contains($language.Name)) { $selected=$index }
  }
  if ($selected -lt 0) { throw "Idioma ausente: $($language.Name)" }
  [WizardWindow]::SendMessage($combo,0x14E,[IntPtr]$selected,[IntPtr]::Zero) | Out-Null
  $oldHandle = $handle
  $ok = [WizardWindow]::GetDlgItem($handle,1)
  [WizardWindow]::SendMessage($handle,0x111,[IntPtr]1,$ok) | Out-Null
  $deadline = (Get-Date).AddSeconds(20)
  do {
    Start-Sleep -Milliseconds 200
    $wizard.Refresh(); $handle = $wizard.MainWindowHandle
    $ready = $handle -ne [IntPtr]::Zero -and [WizardWindow]::ChildrenText($handle).Contains($language.Welcome)
  } until ($ready -or (Get-Date) -gt $deadline)
  if (-not $ready) { throw "Boas-vindas não traduzidas para $($language.Name): $([WizardWindow]::ChildrenText($handle))" }
  Save-Wizard ("wizard-welcome-{0}.png" -f $language.Id)
  if ($language.Id -eq 1046) {
    Save-Wizard 'wizard-welcome.png'
    $next = [WizardWindow]::GetDlgItem($handle,1)
    if (-not [WizardWindow]::IsWindowEnabled($next)) { throw 'Botão Próximo indisponível.' }
    [WizardWindow]::SendMessage($handle,0x111,[IntPtr]1,$next) | Out-Null
    Save-Wizard 'wizard-folder.png'
  }
  $cancel = [WizardWindow]::GetDlgItem($handle,2)
  [WizardWindow]::SendMessage($handle,0x111,[IntPtr]2,$cancel) | Out-Null
  if (-not $wizard.WaitForExit(10000)) { throw 'Cancelar não encerrou o instalador.' }
  Write-Output "Wizard: idioma $($language.Id), boas-vindas traduzidas e cancelamento confirmados."
} finally {
  if (-not $wizard.HasExited) { Stop-Process -Id $wizard.Id -Force }
}
}
