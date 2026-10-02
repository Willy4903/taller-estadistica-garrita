"""Estándares internacionales (UNESCO, NIST, ISO, OCDE): comprueba que las fuentes sigan disponibles."""
from regulation_check import run


def fetch():
    return run("INT", "estándares")
