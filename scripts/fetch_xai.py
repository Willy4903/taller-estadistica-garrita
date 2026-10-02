"""Anuncios oficiales de xAI: feeds de su blog (fuente de nivel 1)."""
from feeds import fetch_feeds

SOURCES = ['xAI']


def fetch():
    return fetch_feeds(SOURCES)
