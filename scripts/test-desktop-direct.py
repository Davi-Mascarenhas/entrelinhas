"""Mesmo WebKitWebDriver e aplicativo, sem o proxy HTTP do tauri-driver."""
import copy,importlib.util,json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];sys.path.insert(0,str(root/'scripts'))
spec=importlib.util.spec_from_file_location('desktop_native',root/'scripts/test-desktop.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
popen=subprocess.Popen

def native_popen(command,*args,**kwargs):
    if isinstance(command,list) and str(command[0]).endswith('/tauri-driver'):
        port=command[command.index('--port')+1];binary=command[command.index('--native-driver')+1]
        command=[binary,'--port='+str(port),'--host=local']
        kwargs['env']={**kwargs.get('env',{}),'TAURI_AUTOMATION':'true','TAURI_WEBVIEW_AUTOMATION':'true'}
    return popen(command,*args,**kwargs)

request=m.Desktop.request

def native_request(self,path,value=None,method=None,timeout=35,read_only=False):
    if path=='/session' and value:
        value=copy.deepcopy(value);match=value['capabilities']['alwaysMatch'];options=match.pop('tauri:options')
        match['webkitgtk:browserOptions']={'binary':options['application'],'args':options.get('args',[])}
    return request(self,path,value,method,timeout,read_only)

m.subprocess.Popen=native_popen;m.Desktop.request=native_request
if sys.platform!='linux':raise SystemExit('Este roteiro usa o WebKitGTK do Linux.')
m.main()
screenshots=sys.argv[sys.argv.index('--screenshots')+1] if '--screenshots' in sys.argv else 'artifacts/screenshots'
output=(root/screenshots).resolve().parent/'desktop-results.json'
data=json.loads(output.read_text());data['transport']='WebKitWebDriver direto; capacidades equivalentes ao tauri-driver 2.1.0';output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
