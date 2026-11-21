param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [string]$OutputDirectory = (Join-Path $PWD 'artifacts/windows')
)
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Execute apenas no runner descartável do GitHub.' }
New-Item -ItemType Directory $OutputDirectory -Force | Out-Null
# O runner usa um administrador com UAC desativado. Uma conta temporária comum
# permite testar o WebView2 sem alterar políticas de depuração do Windows.
Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
public static class TestDesktopAccess {
  [DllImport("user32.dll")] public static extern IntPtr GetProcessWindowStation();
  [DllImport("user32.dll")] public static extern IntPtr GetThreadDesktop(uint id);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll", SetLastError=true)] static extern bool GetUserObjectSecurity(IntPtr handle,ref uint info,byte[] data,uint size,out uint needed);
  [DllImport("user32.dll", SetLastError=true)] static extern bool SetUserObjectSecurity(IntPtr handle,ref uint info,byte[] data);
  public static byte[] Grant(IntPtr handle, SecurityIdentifier user) {
    uint info=4, needed;
    GetUserObjectSecurity(handle,ref info,null,0,out needed);
    var original=new byte[needed];
    if(!GetUserObjectSecurity(handle,ref info,original,needed,out needed)) throw new Win32Exception(Marshal.GetLastWin32Error());
    var descriptor=new RawSecurityDescriptor(original,0);
    if(descriptor.DiscretionaryAcl!=null) {
      descriptor.DiscretionaryAcl.InsertAce(0,new CommonAce(AceFlags.None,AceQualifier.AccessAllowed,0x10000000,user,false,null));
      var modified=new byte[descriptor.BinaryLength]; descriptor.GetBinaryForm(modified,0);
      if(!SetUserObjectSecurity(handle,ref info,modified)) throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    return original;
  }
  public static void Restore(IntPtr handle,byte[] original) {
    uint info=4;
    if(!SetUserObjectSecurity(handle,ref info,original)) throw new Win32Exception(Marshal.GetLastWin32Error());
  }
}
'@
$testUserName = 'EntreTest' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$temporaryPassword = ConvertTo-SecureString ('Aa1!' + [Guid]::NewGuid().ToString('N')) -AsPlainText -Force
$testUser = New-LocalUser -Name $testUserName -Password $temporaryPassword -Description 'Conta descartável de testes do Entrelinhas'
Add-LocalGroupMember -SID 'S-1-5-32-545' -Member $testUser
$station = [TestDesktopAccess]::GetProcessWindowStation()
$desktop = [TestDesktopAccess]::GetThreadDesktop([TestDesktopAccess]::GetCurrentThreadId())
$originalStation = $null; $originalDesktop = $null
try {
  $originalStation = [TestDesktopAccess]::Grant($station,$testUser.SID)
  $originalDesktop = [TestDesktopAccess]::Grant($desktop,$testUser.SID)
  & icacls $OutputDirectory /grant "${testUserName}:(OI)(CI)F" /T | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar a pasta de evidências.' }
  $profilePath = Join-Path "$env:SystemDrive\Users" $testUserName
  $testEnvironment = @{
    USERNAME=$testUserName; USERDOMAIN=$env:COMPUTERNAME; USERPROFILE=$profilePath
    APPDATA=(Join-Path $profilePath 'AppData\Roaming')
    LOCALAPPDATA=(Join-Path $profilePath 'AppData\Local')
    TEMP=(Join-Path $profilePath 'AppData\Local\Temp')
    TMP=(Join-Path $profilePath 'AppData\Local\Temp')
    HOMEDRIVE=$env:SystemDrive; HOMEPATH="\Users\$testUserName"
    PYTHONIOENCODING='utf-8'; GITHUB_ACTIONS='true'
  }
  $credential = [PSCredential]::new("$env:COMPUTERNAME\$testUserName",$temporaryPassword)
  $python = (Get-Command python).Source
  $script = Join-Path $PWD 'scripts/test-windows.py'
  $consoleLog = Join-Path $OutputDirectory 'test-console.log'
  $errorLog = Join-Path $OutputDirectory 'test-error.log'
  $arguments = '-u "{0}" --installer "{1}" --output "{2}"' -f $script,$Installer,$OutputDirectory
  $testProcess = Start-Process -FilePath $python -ArgumentList $arguments -Credential $credential -LoadUserProfile -Environment $testEnvironment -WorkingDirectory $PWD.ProviderPath -PassThru -RedirectStandardOutput $consoleLog -RedirectStandardError $errorLog
  if (-not $testProcess.WaitForExit(1200000)) { Stop-Process -Id $testProcess.Id -Force; throw 'Tempo excedido nos testes Windows.' }
  Get-Content $consoleLog -Encoding utf8
  Get-Content $errorLog -Encoding utf8
  if ($testProcess.ExitCode -ne 0) { throw "Os testes Windows retornaram $($testProcess.ExitCode)." }
} finally {
  if ($originalDesktop) { [TestDesktopAccess]::Restore($desktop,$originalDesktop) }
  if ($originalStation) { [TestDesktopAccess]::Restore($station,$originalStation) }
  Remove-LocalUser -SID $testUser.SID
}
