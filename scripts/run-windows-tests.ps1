param(
  [Parameter(Mandatory=$true)][string]$Installer,
  [string]$OutputDirectory = (Join-Path $PWD 'artifacts/windows')
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory $OutputDirectory -Force | Out-Null
# O WebView2 ignora os argumentos de depuração de hosts administrativos.
# Usa um token normal do MESMO usuário, sem mudar políticas do sistema.
Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
public static class LimitedTestProcess {
  [StructLayout(LayoutKind.Sequential)] struct SecurityAttributes { public int Length; public IntPtr Descriptor; [MarshalAs(UnmanagedType.Bool)] public bool Inherit; }
  [StructLayout(LayoutKind.Sequential)] struct SidAttributes { public IntPtr Sid; public uint Attributes; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] struct StartupInfo {
    public int cb; public string Reserved, Desktop, Title; public uint X,Y,Width,Height,XChars,YChars,Fill,Flags; public short Show,Reserved2; public IntPtr ReservedPtr,Input,Output,Error;
  }
  [StructLayout(LayoutKind.Sequential)] struct ProcessInfo { public IntPtr Process,Thread; public uint ProcessId,ThreadId; }
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool SaferCreateLevel(uint scope,uint level,uint flags,out IntPtr handle,IntPtr reserved);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool SaferComputeTokenFromLevel(IntPtr level,IntPtr original,out IntPtr token,uint flags,IntPtr reserved);
  [DllImport("advapi32.dll")] static extern bool SaferCloseLevel(IntPtr level);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(IntPtr token,int kind,out int value,int size,out int needed);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool SetTokenInformation(IntPtr token,int kind,IntPtr value,int size);
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcessAsUserW(IntPtr token,string application,StringBuilder command,IntPtr processAttributes,IntPtr threadAttributes,bool inherit,uint flags,IntPtr environment,string directory,ref StartupInfo startup,out ProcessInfo process);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFileW(string name,uint access,uint share,ref SecurityAttributes attributes,uint creation,uint flags,IntPtr template);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static void Check(bool result) { if(!result) throw new Win32Exception(Marshal.GetLastWin32Error()); }
  public static int Run(string executable,string arguments,string directory,string logfile) {
    IntPtr level=IntPtr.Zero, token=IntPtr.Zero, file=IntPtr.Zero;
    ProcessInfo process=new ProcessInfo();
    try {
      Check(SaferCreateLevel(1,0x20000,1,out level,IntPtr.Zero));
      Check(SaferComputeTokenFromLevel(level,IntPtr.Zero,out token,0,IntPtr.Zero));
      // Reduz a integridade para o nível normal usado por aplicativos do usuário.
      var sid=new SecurityIdentifier("S-1-16-8192"); var bytes=new byte[sid.BinaryLength]; sid.GetBinaryForm(bytes,0);
      int labelSize=Marshal.SizeOf<SidAttributes>(); IntPtr label=Marshal.AllocHGlobal(labelSize+bytes.Length);
      try {
        IntPtr sidPtr=IntPtr.Add(label,labelSize); Marshal.Copy(bytes,0,sidPtr,bytes.Length);
        Marshal.StructureToPtr(new SidAttributes { Sid=sidPtr, Attributes=0x20 },label,false);
        Check(SetTokenInformation(token,25,label,labelSize+bytes.Length));
      } finally { Marshal.FreeHGlobal(label); }
      int elevated,needed; Check(GetTokenInformation(token,20,out elevated,4,out needed));
      if(elevated!=0) throw new InvalidOperationException("O token de teste ainda está elevado.");
      var security=new SecurityAttributes { Length=Marshal.SizeOf<SecurityAttributes>(), Inherit=true };
      file=CreateFileW(logfile,0x40000000,3,ref security,2,0x80,IntPtr.Zero);
      if(file==new IntPtr(-1)) throw new Win32Exception(Marshal.GetLastWin32Error());
      var startup=new StartupInfo { cb=Marshal.SizeOf<StartupInfo>(), Desktop="winsta0\\default", Flags=0x100, Output=file, Error=file };
      Check(CreateProcessAsUserW(token,executable,new StringBuilder("\""+executable+"\" "+arguments),IntPtr.Zero,IntPtr.Zero,true,0,IntPtr.Zero,directory,ref startup,out process));
      if(WaitForSingleObject(process.Process,20*60*1000)!=0) { TerminateProcess(process.Process,1); throw new TimeoutException("Testes Windows excederam 20 minutos."); }
      uint code; Check(GetExitCodeProcess(process.Process,out code)); return (int)code;
    } finally {
      if(process.Thread!=IntPtr.Zero) CloseHandle(process.Thread);
      if(process.Process!=IntPtr.Zero) CloseHandle(process.Process);
      if(file!=IntPtr.Zero && file!=new IntPtr(-1)) CloseHandle(file);
      if(token!=IntPtr.Zero) CloseHandle(token);
      if(level!=IntPtr.Zero) SaferCloseLevel(level);
    }
  }
}
'@
$python = (Get-Command python).Source
$script = Join-Path $PWD 'scripts/test-windows.py'
$consoleLog = Join-Path $OutputDirectory 'test-console.log'
$env:PYTHONIOENCODING = 'utf-8'
$arguments = '-u "{0}" --installer "{1}" --output "{2}"' -f $script,$Installer,$OutputDirectory
try {
  $testCode = [LimitedTestProcess]::Run($python,$arguments,$PWD.ProviderPath,$consoleLog)
} finally {
  if (Test-Path $consoleLog) { Get-Content $consoleLog -Encoding utf8 }
}
if ($testCode -ne 0) { throw "Os testes Windows retornaram $testCode." }
