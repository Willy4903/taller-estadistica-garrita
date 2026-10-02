"""Normativa de la Unión Europea (AI Act y Digital Omnibus): comprueba las fuentes oficiales (EUR-Lex, Comisión Europea)."""
from regulation_check import run


def fetch():
    return run("EU", "UE")
