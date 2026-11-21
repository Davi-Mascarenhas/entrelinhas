"""Servidor local e verificações de rede explícita para testes desktop isolados."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import threading


class Feed:
    def __init__(self, package, signature, version, target):
        self.package, self.signature, self.version, self.target = package, signature, version, target
        self.requests = []
        self.body = None
        self.status = 200
        self.tampered = False
        feed = self
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                feed.requests.append(self.path)
                if self.path == '/manifest.json':
                    payload = feed.body if feed.body is not None else json.dumps(feed.manifest()).encode()
                    self.send_response(feed.status)
                    self.send_header('Content-Type', 'application/json')
                elif self.path == '/package':
                    payload = b'Pacote adulterado' if feed.tampered else feed.package.read_bytes()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/octet-stream')
                else:
                    self.send_error(404); return
                self.send_header('Content-Length', str(len(payload))); self.end_headers()
                self.wfile.write(payload)
            def log_message(self, *args):
                pass
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def manifest(self):
        return {'version': self.version, 'notes': 'Atualização controlada de integração.', 'platforms': {
            self.target: {'url': self.url + '/package', 'signature': self.signature},
        }}

    def __enter__(self):
        self.thread.start(); return self

    def __exit__(self, *args):
        self.server.shutdown(); self.thread.join(); self.server.server_close()


def button(app, label):
    app.js('const dialogs=[...document.querySelectorAll("[role=dialog]")];const root=dialogs.at(-1)||document;const b=[...root.querySelectorAll("button")].find(b=>b.textContent.trim()===arguments[0]);if(!b)throw Error("Botão ausente: "+arguments[0]);b.click()', label)


def about(app):
    app.reveal()
    app.click('[aria-label="Configurações"]')
    button(app, 'Sobre')


def search(app, wait, allow=True):
    wait(lambda: app.js('return !!document.querySelector(".update-actions button:first-child:not(:disabled)")'), 'habilitar nova consulta')
    app.js('document.querySelector(".update-actions button:first-child").scrollIntoView({block:"center"})')
    app.paint()
    app.click('.update-actions button:first-child')
    wait(lambda: app.js('return [...document.querySelectorAll("[role=dialog]")].some(n=>n.getAttribute("aria-label")==="Permitir acesso à internet para procurar atualizações?")'), 'consentimento de rede')
    button(app, 'Permitir consulta' if allow else 'Cancelar')


def apply_update(app, wait):
    wait(lambda: app.js('return !!document.querySelector(".update-actions .primary:not(:disabled)")'), 'habilitar download/instalação')
    app.js('document.querySelector(".update-actions .primary").scrollIntoView({block:"center"})')
    app.paint()
    app.click('.update-actions .primary')


def common(app, feed, wait, passed):
    about(app)
    assert feed.requests == [], 'A abertura do painel não pode consultar a internet.'
    if hasattr(app, 'output'):
        app.screenshot(app.output / 'updates-idle.png')
    search(app, wait, False)
    assert feed.requests == [], 'Recusar precisa preservar ausência de tráfego.'
    passed('nenhuma consulta ao abrir o app/painel nem após recusar acesso à internet')
    newest = feed.version
    feed.version = app.ipc('plugin:app|version')
    search(app, wait)
    wait(lambda: app.js('return document.querySelector(".update-control").innerText.includes("mais recente")'), 'versão igual')
    feed.version = '0.1.0'
    search(app, wait)
    wait(lambda: app.js('return document.querySelector(".update-control").innerText.includes("mais recente")'), 'sem downgrade')
    feed.body = b'JSON invalido'
    search(app, wait)
    wait(lambda: app.js('return !!document.querySelector(".update-control [role=alert]")'), 'erro de manifesto')
    feed.body = None; feed.status = 503
    search(app, wait)
    wait(lambda: app.js('return !!document.querySelector(".update-control [role=alert]")'), 'erro de servidor')
    feed.status = 200; feed.version = newest
    passed('versão igual/antiga não atualiza; manifesto e servidor inválidos mostram erro')
    search(app, wait)
    wait(lambda: app.js('return document.querySelector(".update-version")?.innerText.includes(arguments[0])', newest), 'versão nova')
    count = len(feed.requests)
    app.click('[aria-label="Fechar painel"]')
    about(app)
    assert len(feed.requests) == count
    assert newest in app.js('return document.querySelector(".update-version").innerText')
    passed('resultado permanece ao reabrir configurações, sem consulta automática')
