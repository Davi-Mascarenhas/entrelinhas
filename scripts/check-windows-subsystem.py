#!/usr/bin/env python3
"""Confere o subsistema gráfico no executável PE de produção."""
import struct
import sys
from pathlib import Path


def check(executable):
    data = Path(executable).read_bytes()
    assert data[:2] == b'MZ', 'Executável Windows inválido.'
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    assert data[pe:pe + 4] == b'PE\0\0', 'Cabeçalho PE inválido.'
    subsystem = struct.unpack_from('<H', data, pe + 24 + 68)[0]
    assert subsystem == 2, f'O aplicativo precisa do subsistema Windows GUI (2), encontrado {subsystem}.'
    print('OK · executável Windows GUI, sem console de produção')


if __name__ == '__main__':
    check(sys.argv[1])
