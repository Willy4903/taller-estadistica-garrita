"""Normativa de Perú (Ley 31814, D.S. 115-2025-PCM, Ley 29733, D.S. 016-2024-JUS): comprueba las fuentes oficiales (gob.pe, El Peruano)."""
from regulation_check import run


def fetch():
    return run("PE", "Perú")
