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
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint message, IntPtr w, IntPtr l);
}
'@
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
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
    if (($rect.Right - $rect.Left) -lt 300) { throw 'Tamanho inválido do wizard.' }
    $bitmap = New-Object System.Drawing.Bitmap ($rect.Right - $rect.Left),($rect.Bottom - $rect.Top)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $dc = $graphics.GetHdc()
    try { $printed = [WizardWindow]::PrintWindow($handle, $dc, 2) }
    finally { $graphics.ReleaseHdc($dc) }
    if (-not $printed) { $graphics.CopyFromScreen($rect.Left,$rect.Top,0,0,$bitmap.Size) }
    $bitmap.Save((Join-Path $OutputDirectory $Name),[System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
  }
  Save-Wizard 'wizard-welcome.png'
  $next = [WizardWindow]::GetDlgItem($handle,1)
  if (-not [WizardWindow]::IsWindowEnabled($next)) { throw 'Botão Próximo indisponível.' }
  [WizardWindow]::SendMessage($handle,0x111,[IntPtr]1,$next) | Out-Null
  Save-Wizard 'wizard-folder.png'
  $cancel = [WizardWindow]::GetDlgItem($handle,2)
  [WizardWindow]::SendMessage($handle,0x111,[IntPtr]2,$cancel) | Out-Null
  if (-not $wizard.WaitForExit(10000)) { throw 'Cancelar não encerrou o instalador.' }
  Write-Output 'Wizard aberto, duas páginas capturadas e cancelamento confirmado.'
} finally {
  if (-not $wizard.HasExited) { Stop-Process -Id $wizard.Id -Force }
}
