#!/usr/bin/env python3
"""Valida a sintaxe dos scripts JS embutidos antes dos testes desktop."""
import ast
import json
from pathlib import Path
import subprocess

scripts = []
for file in sorted(Path(__file__).resolve().parent.glob('*.py')):
    for node in ast.walk(ast.parse(file.read_text(encoding='utf-8'))):
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr in ('js', 'editor') and node.args
                and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str)):
            scripts.append({'file': file.name, 'line': node.lineno, 'script': node.args[0].value})
subprocess.run(['node', '-e', '''
let input=''; process.stdin.on('data', chunk=>input+=chunk); process.stdin.on('end',()=>{
  const scripts=JSON.parse(input);
  for(const entry of scripts) {
    try { new Function(entry.script); }
    catch(error) { console.error(`${entry.file}:${entry.line}: ${error.message}`); process.exitCode=1; }
  }
  if(!process.exitCode) console.log(`${scripts.length} scripts JavaScript desktop com sintaxe válida.`);
});
'''], input=json.dumps(scripts).encode(), check=True)
