"""Anuncios oficiales de Anthropic: feeds de su blog (fuente de nivel 1)."""
from feeds import fetch_feeds

SOURCES = ['Anthropic']


def fetch():
    return fetch_feeds(SOURCES)
